import { css, html, type PropertyValues } from 'lit';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpElement } from '../../foundation/element.js';
import { OwnedAttributes } from '../../foundation/owned-attributes.js';
import { citationPresentation } from '../../presentation/families/citation.js';
import { TpCitation } from './citation.js';
import { setListPosition } from './source.js';

export interface CitationListMessages {
  /** Default list name, `Sources` by default. */
  sources?: string;
}

/**
 * The numbered sources that in-text citations refer to. Child Citations become list items
 * numbered from `start` in document order, unless they set their own `index`.
 *
 * @slot - The Citation entries.
 * @csspart citation-list - The list.
 */
export class TpCitationList extends TpElement {
  static tagName = 'tp-citation-list';
  static override presentation = citationPresentation;
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpCitation];
  }
  static override properties = {
    ...TpElement.properties,
    label: { type: String },
    start: { type: Number, reflect: true },
    messages: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      [part~='citation-list'] {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }

      :host([orientation='horizontal']) [part~='citation-list'] {
        flex-flow: row wrap;
        align-items: center;
      }
    `,
  ];
  override orientation: 'horizontal' | 'vertical' = 'vertical';
  /** The list's accessible name, "Sources" by default. */
  label = '';
  /** The number of the first entry. */
  start = 1;
  /** Replacements for the built-in text; missing entries keep the defaults. */
  messages: CitationListMessages = {};
  #entries = new Map<TpCitation, OwnedAttributes>();

  override disconnectedCallback(): void {
    for (const [entry, attributes] of this.#entries) {
      attributes.dispose();
      setListPosition(entry, undefined);
    }
    this.#entries.clear();
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('start')) this.#renumber();
  }

  readonly #renumber = (): void => {
    const slot = this.renderRoot.querySelector('slot');
    const entries = (slot?.assignedElements() ?? []).filter(
      (element): element is TpCitation => element instanceof TpCitation,
    );
    const first = Number.isFinite(this.start) ? Math.trunc(this.start) : 1;
    for (const [entry, attributes] of this.#entries)
      if (!entries.includes(entry)) {
        attributes.dispose();
        setListPosition(entry, undefined);
        this.#entries.delete(entry);
      }
    entries.forEach((entry, position) => {
      if (!this.#entries.has(entry)) {
        const attributes = new OwnedAttributes(entry);
        if (!entry.hasAttribute('role')) attributes.set('role', 'listitem');
        this.#entries.set(entry, attributes);
      }
      setListPosition(entry, first + position);
    });
  };

  protected override render() {
    const name = this.label || { sources: 'Sources', ...this.messages }.sources;
    return html`<div part="citation-list" role="list" aria-label=${name}>
      <slot @slotchange=${this.#renumber}></slot>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-citation-list': TpCitationList;
  }
}
