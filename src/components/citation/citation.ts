import { css, html, nothing, type PropertyValues } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpElement } from '../../foundation/element.js';
import { focusManaged } from '../../foundation/focus.js';
import { ImageLoadController } from '../../foundation/image-load.js';
import { numberFormatter } from '../../foundation/intl.js';
import type { PartRenderContext } from '../../foundation/part.js';
import { resolveLocale } from '../../foundation/services.js';
import { externalLinkIcon } from '../../icons/external-link.js';
import { globeIcon } from '../../icons/globe.js';
import { setPartComposition } from '../../presentation/controller.js';
import { citationPresentation } from '../../presentation/families/citation.js';
import { TpBadge } from '../badge/badge.js';
import { TpIcon } from '../icon/icon.js';
import { TpPreviewCard } from '../preview-card/preview-card.js';
import { observeSlots, slotOccupied } from '../shared/slots.js';
import {
  acceptedAddress,
  addressHost,
  listPosition,
  notifyReferrers,
  trackCitation,
  untrackCitation,
} from './source.js';

export type CitationVariant =
  'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline' | 'ghost' | 'link';

export interface CitationMessages {
  /** Accessible-name text before the number and the source, `Citation` by default. */
  citation?: string;
  /** Accessible-name ending for a link that opens in a new tab, `opens in a new tab` by default. */
  newTab?: string;
}

/** The values a citation presents: its own, with unset ones taken from its `source`. */
export interface CitationSourceValues {
  readonly href: string | null;
  readonly target: string | null;
  readonly rel: string | null;
  readonly number: number | null;
  readonly src: string;
  readonly sourceTitle: string;
  readonly description: string;
}

/** What one render presents, resolved before it. */
interface CitationView {
  readonly values: CitationSourceValues;
  readonly linked: boolean;
  /** The link target after the new-tab default for site addresses. */
  readonly target: string | null;
  /** A labelled site link: the external-link mark overlays the end of its label. */
  readonly external: boolean;
  readonly label: string;
  readonly host: string;
  /** The host the preview names: this address's, else the host of the `source` citation's. */
  readonly previewHost: string;
  readonly number: string;
  readonly iconSlotted: boolean;
  readonly preview: boolean;
  readonly name: string;
}

// A lone number is a compact chip at least as wide as it is tall (CL Citation q6).
const compactBadge = {
  badge: {
    styleHook: {
      'padding-inline': 'var(--tp-space-1)',
      'min-inline-size': 'var(--tp-space-5)',
    },
  },
};

/**
 * Citation: an inline, badge-styled reference to a source. An accepted `href`
 * renders a link; a number, a source mark and a label are optional; a description or `preview`
 * content adds a Preview card with the source details.
 *
 * @slot - Visible label, such as the source site or title.
 * @slot icon - Source mark used when `src` is unset or fails, such as a `tp-icon`.
 * @slot preview - Extra preview content.
 * @csspart citation-badge - The composed Badge.
 * @csspart citation-index - The number.
 * @csspart citation-icon - The source mark.
 * @csspart citation-label - The label.
 * @csspart citation-external - The external-link mark over the end of a site link's label.
 * @csspart citation-preview - The composed Preview card.
 * @csspart citation-preview-source - Preview row with the source mark and host.
 * @csspart citation-preview-title - Preview title.
 * @csspart citation-preview-description - Preview description.
 */
export class TpCitation extends TpElement {
  static tagName = 'tp-citation';
  static override presentation = citationPresentation;
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpBadge, TpIcon, TpPreviewCard];
  }
  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'id'];
  }
  static override properties = {
    ...TpElement.properties,
    href: { type: String, reflect: true },
    target: { type: String, reflect: true },
    rel: { type: String, reflect: true },
    index: { type: Number, reflect: true },
    src: { type: String, reflect: true },
    sourceTitle: { type: String, attribute: 'source-title' },
    description: { type: String },
    source: { type: String, reflect: true },
    superscript: { type: Boolean, reflect: true },
    variant: { type: String, reflect: true },
    messages: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
        max-inline-size: 100%;
        vertical-align: baseline;
      }

      /* Raised like a footnote marker without growing the line box. */
      :host([superscript]) {
        position: relative;
        inset-block-start: -0.4em;
      }

      [part~='citation-index'],
      [part~='citation-icon'],
      [part~='citation-external'] {
        display: inline-flex;
        flex: none;
        align-items: center;
        justify-content: center;
      }

      [part~='citation-icon'] img {
        display: block;
        inline-size: 100%;
        block-size: 100%;
        object-fit: contain;
      }

      [part~='citation-label'] {
        min-inline-size: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* The external-link mark overlays the label's end, so showing it never widens the chip. */
      .text {
        position: relative;
        display: inline-flex;
        min-inline-size: 0;
      }

      .text[hidden] {
        display: none;
      }

      [part~='citation-external'] {
        position: absolute;
        inset-block: 0;
        inset-inline-end: 0;
        pointer-events: none;
      }

      .preview {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-1);
        min-inline-size: 0;
      }

      [part~='citation-preview-source'] {
        display: flex;
        align-items: center;
        min-inline-size: 0;
      }
    `,
  ];
  href: string | null = null;
  target: string | null = null;
  rel: string | null = null;
  index: number | null = null;
  src = '';
  sourceTitle = '';
  description = '';
  source = '';
  superscript = false;
  variant: CitationVariant = 'outline';
  messages: CitationMessages = {};
  readonly #image = new ImageLoadController(this);
  #requestedSource = '';
  #view: CitationView | undefined;
  #badge: TpBadge | undefined;
  #preview: TpPreviewCard | undefined;
  #previewTarget: TpBadge | undefined;
  #releaseTrigger: (() => void) | undefined;
  #releaseSlots: (() => void) | undefined;
  #snapshot = '';
  #root: Node | undefined;

  /** The values this citation presents, after taking unset ones from its `source`. */
  get resolvedSource(): CitationSourceValues {
    const own = this.#ownValues();
    const from = this.#referenced();
    if (!from) return own;
    const other = from.#ownValues();
    return {
      href: own.href ?? other.href,
      target: own.target ?? other.target,
      rel: own.rel ?? other.rel,
      number: own.number ?? other.number,
      src: own.src || other.src,
      sourceTitle: own.sourceTitle || other.sourceTitle || from.#labelText(),
      description: own.description || other.description,
    };
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#root = this.getRootNode();
    trackCitation(this);
    this.#releaseSlots = observeSlots(this, () => this.requestUpdate(), { characterData: true });
    notifyReferrers(this);
  }

  override disconnectedCallback(): void {
    untrackCitation(this);
    this.#releaseSlots?.();
    this.#releaseSlots = undefined;
    this.#releaseTrigger?.();
    this.#releaseTrigger = undefined;
    this.#previewTarget = undefined;
    if (this.#badge) setPartComposition(this.#badge, this);
    super.disconnectedCallback();
    this.#snapshot = '';
    // Referrers in the root this citation left fall back to their own values.
    notifyReferrers(this, this.id, this.#root);
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback(name, old, value);
    if (name !== 'id' || old === value) return;
    if (old) notifyReferrers(this, old);
    if (value) notifyReferrers(this, value);
  }

  #ownValues(): CitationSourceValues {
    return {
      href: this.href,
      target: this.target,
      rel: this.rel,
      number: this.index ?? listPosition(this) ?? null,
      src: this.src,
      sourceTitle: this.sourceTitle,
      description: this.description,
    };
  }

  #referenced(): TpCitation | null {
    if (!this.source) return null;
    const root = this.getRootNode() as Document | ShadowRoot;
    const element = root.getElementById?.(this.source);
    return element instanceof TpCitation && element !== this ? element : null;
  }

  /** Text of the default-slot label. */
  #labelText(): string {
    let text = '';
    for (const node of this.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? '';
      else if (node.nodeType === Node.ELEMENT_NODE && !(node as Element).hasAttribute('slot'))
        text += (node as Element).textContent ?? '';
    }
    return text.replace(/\s+/g, ' ').trim();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    const values = this.resolvedSource;
    if (values.src !== this.#requestedSource) {
      this.#requestedSource = values.src;
      this.#image.load(values.src ? { src: values.src } : null);
    }
    const label = this.#labelText();
    const host = addressHost(values.href, this.ownerDocument.baseURI);
    const referenced = this.#referenced();
    const previewHost =
      host || (referenced ? addressHost(referenced.href, this.ownerDocument.baseURI) : '');
    const number =
      values.number === null || !Number.isFinite(values.number)
        ? ''
        : numberFormatter(resolveLocale(this)).format(values.number);
    const iconSlotted = slotOccupied(this, 'icon');
    const messages = { citation: 'Citation', newTab: 'opens in a new tab', ...this.messages };
    const prefix = [messages.citation, number].filter(Boolean).join(' ');
    const subject = label || values.sourceTitle || host;
    const linked = acceptedAddress(values.href);
    // A site address opens in a new tab unless the citation names a target.
    const target = values.target ?? (linked && host ? '_blank' : null);
    // The visible mark is the citation's own; a source's image appears in the preview.
    const hasMark = Boolean(this.src) || iconSlotted;
    const numberOnly = Boolean(number) && !label && !hasMark;
    const name = subject ? `${prefix}: ${subject}` : prefix;
    this.#view = {
      values,
      linked,
      target,
      external: linked && Boolean(host) && Boolean(label),
      label,
      host,
      previewHost,
      number,
      iconSlotted,
      preview: Boolean(values.description) || slotOccupied(this, 'preview'),
      name: target === '_blank' ? `${name} (${messages.newTab})` : name,
    };
    this.toggleAttribute('data-number-only', numberOnly);
    this.toggleAttribute('data-linked', this.#view.linked);
    this.toggleAttribute('data-external', this.#view.external);
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#bindPreview();
    if (this.#badge)
      setPartComposition(
        this.#badge,
        this,
        this.hasAttribute('data-number-only') ? compactBadge : undefined,
      );
    // Referrers re-resolve only when a value they read changed, so mutual references settle.
    const snapshot = JSON.stringify([this.#ownValues(), this.#labelText(), this.#view?.values]);
    if (snapshot !== this.#snapshot) {
      this.#snapshot = snapshot;
      notifyReferrers(this);
    }
  }

  #bindPreview(): void {
    const target = this.#preview ? this.#badge : undefined;
    if (target === this.#previewTarget) return;
    this.#releaseTrigger?.();
    this.#releaseTrigger = undefined;
    this.#previewTarget = target;
    if (target && this.#preview) this.#releaseTrigger = this.#preview.registerTrigger(target);
  }

  override focus(options?: FocusOptions): void {
    this.#badge?.shadowRoot?.querySelector<HTMLElement>('[part~="badge"]')?.focus(options);
  }

  /** A fragment link to another citation, such as a list entry, moves focus to it. */
  readonly #onLinkClick = (event: MouseEvent): void => {
    const href = this.#view?.values.href ?? '';
    if (!href.startsWith('#') || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    let id: string;
    try {
      id = decodeURIComponent(href.slice(1));
    } catch {
      return;
    }
    const target = (this.getRootNode() as Document | ShadowRoot).getElementById?.(id);
    if (!(target instanceof TpCitation) || target === this) return;
    // After the fragment navigation, which leaves focus on this link. The user reached the
    // entry through this citation, so its focus-opened preview stays closed.
    setTimeout(() => {
      if (target.isConnected) focusManaged(target, {});
    });
  };

  readonly #badgeReference = (element: Element | undefined): void => {
    this.#badge = element as TpBadge | undefined;
  };

  readonly #previewReference = (element: Element | undefined): void => {
    this.#preview = element as TpPreviewCard | undefined;
  };

  /**
   * The source mark: the image (its extent is kept while it loads), else slotted Icon content,
   * else the default mark when an image was requested and failed.
   */
  #mark(src: string, iconSlotted: boolean): unknown {
    if (src && this.#image.status !== 'error')
      return html`<span part="citation-icon" aria-hidden="true"
        >${this.#image.status === 'loaded' ? html`<img src=${src} alt="" />` : nothing}</span
      >`;
    if (iconSlotted) return html`<span part="citation-icon"><slot name="icon"></slot></span>`;
    return src ? this.#defaultMark() : nothing;
  }

  #defaultMark(): unknown {
    return html`<span part="citation-icon" aria-hidden="true"
      ><tp-icon .icon=${globeIcon}></tp-icon
    ></span>`;
  }

  #renderPreview(view: CitationView): unknown {
    const { values, previewHost: host, label } = view;
    const title = values.sourceTitle || label;
    return html`<tp-preview-card
      ${ref(this.#previewReference)}
      part="citation-preview"
      side="block-end"
      align="center"
      ><div class="preview">
        ${
          host
            ? html`<div part="citation-preview-source">
                ${
                  values.src && this.#image.status !== 'error'
                    ? this.#mark(values.src, false)
                    : this.#defaultMark()
                }<span>${host}</span>
              </div>`
            : nothing
        }
        ${title ? html`<div part="citation-preview-title">${title}</div>` : nothing}
        ${
          values.description
            ? html`<p part="citation-preview-description">${values.description}</p>`
            : nothing
        }
        <slot name="preview"></slot></div
    ></tp-preview-card>`;
  }

  protected override render() {
    const view = this.#view!;
    const { values, linked, target, name, number, preview } = view;
    const delegate = ({ bind, content }: PartRenderContext) =>
      linked
        ? html`<a
            ${bind}
            href=${values.href!}
            target=${target ?? nothing}
            rel=${values.rel ?? nothing}
            aria-label=${name}
            @click=${this.#onLinkClick}
            >${content}</a
          >`
        : html`<span ${bind} role="note" aria-label=${name} tabindex=${preview ? '0' : nothing}
            >${content}</span
          >`;
    return html`<tp-badge
        ${ref(this.#badgeReference)}
        part="citation-badge"
        .variant=${this.variant}
        ?interactive=${linked}
        .partContracts=${{ badge: { renderDelegate: delegate } }}
        >${number ? html`<span part="citation-index">${number}</span>` : nothing}${this.#mark(
          this.src,
          view.iconSlotted,
        )}<span class="text" ?hidden=${!view.label}
          ><span part="citation-label"><slot></slot></span>${
            view.external
              ? html`<span part="citation-external" aria-hidden="true"
                  ><tp-icon .icon=${externalLinkIcon}></tp-icon
                ></span>`
              : nothing
          }</span
        ></tp-badge
      >
      ${preview ? this.#renderPreview(view) : nothing}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-citation': TpCitation;
  }
}
