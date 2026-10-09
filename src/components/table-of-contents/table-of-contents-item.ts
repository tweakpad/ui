import { css, html, nothing } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { createId } from '../../foundation/id.js';
import { tableOfContentsPresentation } from '../../presentation/families/table-of-contents.js';

/** Id-less targets keep one generated key, so rebuilt items keep naming the same target. */
const generatedKeys = new WeakMap<Element, string>();
function generatedTargetKey(target: Element): string {
  let key = generatedKeys.get(target);
  if (!key) generatedKeys.set(target, (key = createId('tp-toc-target')));
  return key;
}

/**
 * One entry of a table of contents (`ucl20-table-of-contents` Item). It names one target by
 * `href` (a fragment) or by the `target` element reference, which wins; `depth` only indents.
 *
 * @slot - The link label.
 * @csspart link - The native link; `data-active`, `data-current`.
 */
export class TpTableOfContentsItem extends TpElement {
  static tagName = 'tp-table-of-contents-item';
  static override presentation = tableOfContentsPresentation;
  static override properties = {
    ...TpElement.properties,
    href: { type: String, reflect: true },
    target: { attribute: false },
    depth: { type: Number, reflect: true },
    active: { type: Boolean, attribute: false },
    current: { type: Boolean, attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      a {
        display: block;
      }
    `,
  ];

  href: string | null = null;
  target: Element | null = null;
  depth = 1;
  /** Set by the table of contents: the target's region contains the reading line. */
  active = false;
  /** Set by the table of contents: the innermost active target. */
  current = false;

  readonly #fallbackKey = createId('tp-toc-target');

  /** The target element, resolved in this item's tree scope first, then its document. */
  get resolvedTarget(): Element | null {
    if (this.target) return this.target;
    const id = this.fragment;
    if (!id) return null;
    const root = this.getRootNode() as Document | ShadowRoot;
    return root.getElementById?.(id) ?? this.ownerDocument.getElementById(id);
  }

  /** The decoded fragment of `href`, or null when it names no fragment. */
  get fragment(): string | null {
    const href = this.href ?? '';
    const hash = href.indexOf('#');
    if (hash < 0 || hash === href.length - 1) return null;
    try {
      return decodeURIComponent(href.slice(hash + 1));
    } catch {
      return href.slice(hash + 1);
    }
  }

  /** The value this item publishes: the target's identifier, or a stable generated one. */
  get key(): string {
    return this.target
      ? this.target.id || generatedTargetKey(this.target)
      : (this.fragment ?? this.#fallbackKey);
  }

  /** The rendered link, once rendered. */
  get linkElement(): HTMLAnchorElement | null {
    return this.renderRoot.querySelector('a');
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'listitem');
  }

  protected override updated(): void {
    this.toggleAttribute('data-active', this.active);
    this.toggleAttribute('data-current', this.current);
  }

  /** The link's href: the reference's id fragment, else `href`; null for an id-less reference. */
  #linkHref(): string | null {
    if (this.target) return this.target.id ? `#${this.target.id}` : null;
    return this.href;
  }

  /** Links without an href do not activate on Enter natively. */
  #keydown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && !this.#linkHref()) (event.currentTarget as HTMLElement).click();
  };

  protected override render() {
    const href = this.#linkHref();
    return html`<a
      part="link focusable"
      class="link"
      href=${href ?? nothing}
      role=${href ? nothing : 'link'}
      tabindex=${href ? nothing : '0'}
      aria-current=${this.current ? 'location' : nothing}
      data-active=${this.active ? '' : nothing}
      data-current=${this.current ? '' : nothing}
      style=${`--_tp-toc-depth: ${Math.max(1, Math.floor(this.depth) || 1)}`}
      @keydown=${this.#keydown}
      ><slot></slot
    ></a>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-table-of-contents-item': TpTableOfContentsItem;
  }
}
