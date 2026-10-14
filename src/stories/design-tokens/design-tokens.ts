import { LitElement, html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import { cssTimeMs } from '../../foundation/motion.js';
import { checkIcon } from '../../icons/check.js';
import {
  REQUIRED_TOKEN_ROLES,
  TOKEN_FAMILIES,
  type RequiredTokenRole,
  type TokenFamily,
} from '../../presentation/tokens.js';
import stylesheet from '../../styles.css?raw';
import {
  DESCRIPTIONS,
  FAMILIES,
  MINIMUM_CONTRAST,
  PAIRED_SURFACE,
  SYNTAX_SAMPLES,
  authoredTokens,
  bezierPoints,
  contrastRatio,
  hex,
  previewKind,
  valueKind,
  type Rgba,
} from './token-catalog.js';
import './design-tokens.css';

interface Measured {
  /** The resolved value as shown. */
  readonly text: string;
  /** The stylesheet definition, when it is what produces the value here and reads differently. */
  readonly definition?: string;
  readonly color?: Rgba;
  readonly ms?: number;
}

const families = Object.entries(TOKEN_FAMILIES) as [TokenFamily, readonly RequiredTokenRole[]][];
const authored = authoredTokens(stylesheet);
const durations = TOKEN_FAMILIES.motion.filter((role) => role.startsWith('duration-'));

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');

/** `16px` from `16.0000px`; other values as computed. */
const length = (value: string) => {
  const number = Number.parseFloat(value);
  return value.endsWith('px') && Number.isFinite(number)
    ? `${Math.round(number * 100) / 100}px`
    : value;
};

/**
 * Every role of the token set with a preview, the value it resolves to in this page and what it
 * is for. Values are read from the rendered page, so the chosen theme, density and scoped
 * overrides show up. The page's own theme switcher themes only this view.
 */
export class DesignTokensView extends LitElement {
  static override properties = {
    query: { state: true },
    values: { state: true },
    motionAtEnd: { state: true },
  };

  query = '';
  values = new Map<RequiredTokenRole, Measured>();
  motionAtEnd = false;
  #observer?: MutationObserver;
  #systemScheme?: MediaQueryList;
  #context?: CanvasRenderingContext2D | null;
  readonly #remeasure = () => this.#measure();

  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    // The Density toolbar writes the document element; the theme switcher writes this host.
    this.#observer = new MutationObserver(this.#remeasure);
    this.#observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-tp-density', 'style', 'class'],
    });
    this.#observer.observe(this, { attributes: true, attributeFilter: ['style', 'data-theme'] });
    // The System theme follows the device without writing an attribute.
    this.#systemScheme = matchMedia('(prefers-color-scheme: dark)');
    this.#systemScheme.addEventListener('change', this.#remeasure);
    if (this.hasUpdated) this.#measure();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#systemScheme?.removeEventListener('change', this.#remeasure);
  }

  // The first measurement lands in the first render instead of scheduling a second one.
  protected override willUpdate() {
    if (!this.hasUpdated) this.#measure();
  }

  /**
   * Reads every role through a temporary probe inside this subtree, so scoped overrides apply;
   * writes only when a value changed.
   */
  #measure() {
    const probe = document.createElement('div');
    probe.className = 'design-tokens-probe';
    const element = probe.appendChild(document.createElement('span'));
    this.append(probe);
    const own = getComputedStyle(this);
    const values = new Map<RequiredTokenRole, Measured>();
    for (const [family, roles] of families) {
      for (const role of roles) {
        const name = `--tp-${role}`;
        const raw = own.getPropertyValue(name).trim();
        if (!raw) {
          values.set(role, { text: 'Not set' });
          continue;
        }
        const read = (declarations: string, property: string) => {
          element.style.cssText = declarations;
          return getComputedStyle(element).getPropertyValue(property).trim();
        };
        // The stylesheet definition is in force here when it substitutes to the live value.
        const definition = authored.get(role);
        const inForce =
          definition !== undefined &&
          normalize(read(`--_definition: ${definition}`, '--_definition')) === normalize(raw);
        const shown = (text: string) =>
          inForce && definition !== text && definition !== '0' ? { text, definition } : { text };
        switch (valueKind(role, family)) {
          case 'color': {
            const color = this.#rgba(read(`color: var(${name})`, 'color'));
            values.set(role, { ...shown(hex(color)), color });
            break;
          }
          case 'length':
            values.set(
              role,
              shown(length(read(`padding-inline-start: var(${name})`, 'padding-inline-start'))),
            );
            break;
          case 'shadow':
            values.set(role, shown(read(`box-shadow: var(${name})`, 'box-shadow')));
            break;
          case 'time': {
            const ms = cssTimeMs(raw);
            values.set(role, { ...shown(`${Math.round(ms)}ms`), ms });
            break;
          }
          case 'raw':
            values.set(role, shown(raw));
        }
      }
    }
    probe.remove();
    const changed =
      values.size !== this.values.size ||
      [...values].some(([role, value]) => {
        const current = this.values.get(role);
        return current?.text !== value.text || current.definition !== value.definition;
      });
    if (changed) this.values = values;
  }

  /** Any computed color as sRGB bytes, through a one-pixel canvas. */
  #rgba(color: string): Rgba {
    if (this.#context === undefined) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      this.#context = canvas.getContext('2d', { willReadFrequently: true });
    }
    const context = this.#context;
    if (!context) return [0, 0, 0, 0];
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
    return [red!, green!, blue!, alpha!];
  }

  #matches(role: RequiredTokenRole, query: string) {
    return (
      !query ||
      `--tp-${role} ${DESCRIPTIONS[role]} ${this.values.get(role)?.text ?? ''} ${authored.get(role) ?? ''}`
        .toLowerCase()
        .includes(query)
    );
  }

  protected override render() {
    const query = this.query.trim().toLowerCase();
    const visible = families
      .map(
        ([family, roles]) => [family, roles.filter((role) => this.#matches(role, query))] as const,
      )
      .filter(([, roles]) => roles.length);
    const shown = visible.reduce((total, [, roles]) => total + roles.length, 0);
    return html`<div class="design-tokens">
      <header class="design-tokens-header">
        <div>
          <h1>Design tokens</h1>
          <p>
            Every role of the default token set, with what it is for and the value it resolves to in
            this page. Values follow the theme chosen here, scoped overrides and the Density
            toolbar.
          </p>
        </div>
        <div class="design-tokens-status">
          <tp-badge variant="outline">${REQUIRED_TOKEN_ROLES.length} roles</tp-badge>
          <tp-badge variant="outline">${families.length} families</tp-badge>
        </div>
      </header>

      <div class="design-tokens-toolbar">
        <tp-input
          type="search"
          label="Filter tokens"
          placeholder="Filter by name, value or description"
          no-autofill
          @tp-value-change=${(event: TpValueChangeEvent<string>) => {
            this.query = event.detail.value;
          }}
        ></tp-input>
        <p class="design-tokens-muted" role="status">
          ${query ? `${shown} of ${REQUIRED_TOKEN_ROLES.length} roles` : ''}
        </p>
        <tp-theme-switcher
          class="design-tokens-theme"
          variant="group"
          storage-key="tp-design-tokens-theme"
          .target=${this}
        ></tp-theme-switcher>
      </div>

      <div class="design-tokens-body">
        <div class="design-tokens-sections">
          ${
            visible.length
              ? repeat(
                  visible,
                  ([family]) => family,
                  ([family, roles]) => this.#section(family, roles),
                )
              : html`<tp-empty-state title="No tokens match “${this.query.trim()}”">
                  <span slot="description">Search by role name, value or description.</span>
                </tp-empty-state>`
          }
        </div>
        ${visible.length ? this.#toc(visible.map(([family]) => family)) : nothing}
      </div>
    </div>`;
  }

  #toc(shown: readonly TokenFamily[]) {
    return html`<aside class="design-tokens-toc">
      <tp-table-of-contents navigation="scroll" label="Token families">
        ${repeat(
          shown,
          (family) => family,
          (family) =>
            html`<tp-table-of-contents-item href="#tokens-${family}"
              >${FAMILIES[family].title}</tp-table-of-contents-item
            >`,
        )}
      </tp-table-of-contents>
    </aside>`;
  }

  #section(family: TokenFamily, roles: readonly RequiredTokenRole[]) {
    const { title, description } = FAMILIES[family];
    return html`<section
      id="tokens-${family}"
      class="design-tokens-section"
      ?data-at-end=${family === 'motion' && this.motionAtEnd}
    >
      <header class="design-tokens-section-header">
        <div>
          <h2 id="tokens-${family}-title">${title}</h2>
          <p>${description}</p>
        </div>
        ${
          family === 'motion'
            ? html`<tp-button
                variant="outline"
                size="sm"
                @click=${() => {
                  this.motionAtEnd = !this.motionAtEnd;
                }}
                >Play motion</tp-button
              >`
            : nothing
        }
      </header>
      <tp-table label="${title} tokens" layout="fixed">
        <table aria-labelledby="tokens-${family}-title">
          <colgroup>
            <col class="design-tokens-col-preview" />
            <col class="design-tokens-col-token" />
            <col class="design-tokens-col-value" />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Preview</th>
              <th scope="col">Token</th>
              <th scope="col">Value</th>
              <th scope="col">Description</th>
            </tr>
          </thead>
          <tbody>
            ${repeat(
              roles,
              (role) => role,
              (role) => this.#row(role, family),
            )}
          </tbody>
        </table>
      </tp-table>
    </section>`;
  }

  #row(role: RequiredTokenRole, family: TokenFamily) {
    return html`<tr>
      <td class="design-tokens-preview">${this.#preview(role, family)}</td>
      <th scope="row"><code>--tp-${role}</code></th>
      <td><div class="design-tokens-value">${this.#value(role)}</div></td>
      <td class="design-tokens-description">${DESCRIPTIONS[role]}</td>
    </tr>`;
  }

  #value(role: RequiredTokenRole) {
    const measured = this.values.get(role);
    if (!measured) return nothing;
    const { definition, color } = measured;
    if (!color) {
      return html`<code>${measured.text}</code>${
          definition ? this.#definition(definition) : nothing
        }`;
    }
    const surface = PAIRED_SURFACE[role];
    const base = surface && this.values.get(surface)?.color;
    const ratio = base ? contrastRatio(color, base) : null;
    // A literal color repeats the hex value; aliases and mixes are worth showing.
    return html`<span class="design-tokens-color">
        <code>${measured.text}</code>
        ${
          ratio === null
            ? nothing
            : html`<tp-badge variant=${ratio < MINIMUM_CONTRAST ? 'destructive' : 'outline'}
                >${ratio.toFixed(2)}:1</tp-badge
              >`
        }
      </span>
      ${definition?.includes('var(') ? this.#definition(definition) : nothing}`;
  }

  #definition(definition: string) {
    return html`<code class="design-tokens-definition">${definition}</code>`;
  }

  #preview(role: RequiredTokenRole, family: TokenFamily) {
    const token = `--_token: var(--tp-${role})`;
    const kind = previewKind(role, family);
    switch (kind) {
      case 'fill':
      case 'line':
      case 'ring':
        return html`<span class="design-tokens-specimen" aria-hidden="true"
          ><span class="design-tokens-tile" data-preview=${kind} style=${token}></span
        ></span>`;
      case 'foreground':
        return html`<span class="design-tokens-specimen" aria-hidden="true"
          ><span
            class="design-tokens-tile"
            data-preview="foreground"
            style="${token}; --_surface: var(--tp-${PAIRED_SURFACE[role]})"
            ><span class="design-tokens-pair-text">Aa</span></span
          ></span
        >`;
      case 'syntax':
        return html`<span class="design-tokens-specimen" aria-hidden="true"
          ><span class="design-tokens-tile" data-preview="syntax" style=${token}
            ><span class="design-tokens-pair-text">${SYNTAX_SAMPLES[role]}</span></span
          ></span
        >`;
      case 'icon':
        return html`<span class="design-tokens-specimen" aria-hidden="true"
          ><tp-icon class="design-tokens-icon" .icon=${checkIcon} size="var(--tp-${role})"></tp-icon
        ></span>`;
      case 'font-family':
      case 'font-size':
      case 'font-weight':
      case 'tracking':
        return html`<span
          class="design-tokens-specimen"
          data-preview=${kind}
          style=${token}
          aria-hidden="true"
          >${kind === 'font-family' ? 'Harbors 018' : 'Harbors'}</span
        >`;
      case 'leading':
        return html`<span
          class="design-tokens-specimen"
          data-preview="leading"
          style=${token}
          aria-hidden="true"
          >Lines stack at<br />this height</span
        >`;
      case 'duration': {
        const longest = Math.max(...durations.map((name) => this.values.get(name)?.ms ?? 0));
        const share = longest ? (this.values.get(role)?.ms ?? 0) / longest : 1;
        return html`<span
          class="design-tokens-specimen design-tokens-track"
          style="${token}; --_duration: var(--tp-${role}); --_easing: var(--tp-easing-standard); inline-size: ${Math.max(share, 0.1) * 100}%"
          aria-hidden="true"
          ><span class="design-tokens-dot"></span
        ></span>`;
      }
      case 'easing':
        return html`<span class="design-tokens-specimen design-tokens-easing" aria-hidden="true">
          ${this.#curve(this.values.get(role)?.text ?? '')}
          <span
            class="design-tokens-track"
            style="--_duration: var(--tp-duration-normal); --_easing: var(--tp-${role})"
            ><span class="design-tokens-dot"></span
          ></span>
        </span>`;
      default:
        return html`<span
          class="design-tokens-specimen"
          data-preview=${kind}
          style=${token}
          aria-hidden="true"
          ><span></span
        ></span>`;
    }
  }

  #curve(easing: string) {
    const points = bezierPoints(easing);
    if (!points) return nothing;
    const [x1, y1, x2, y2] = points;
    return html`<svg class="design-tokens-curve" viewBox="-0.05 -0.05 1.1 1.1">
      <rect width="1" height="1"></rect>
      <path d="M0 1 C${x1} ${1 - y1} ${x2} ${1 - y2} 1 0"></path>
    </svg>`;
  }
}

if (!customElements.get('design-tokens-view'))
  customElements.define('design-tokens-view', DesignTokensView);
