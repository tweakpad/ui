import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { elevatedProperty } from '../shared/elevation.js';
import { cardPresentation } from '../../presentation/families/card.js';

/**
 * A surface that groups related content under one header, with an optional footer for actions or
 * metadata. Empty sections take no space.
 *
 * @slot header - The title, ideally a heading element so the card joins the document outline.
 * @slot description - Supporting text under the title.
 * @slot action - A control at the end of the header, such as a Button that manages the card's subject.
 * @slot - The content.
 * @slot footer - Actions or metadata after the content, in reading order from the start.
 */
export class TpCard extends TpElement {
  static tagName = 'tp-card';
  static override presentation = cardPresentation;
  static override properties = {
    ...TpElement.properties,
    elevated: elevatedProperty,
    borders: { type: String, reflect: true },
    sectionColors: { type: String, attribute: 'section-colors', reflect: true },
    size: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      .card {
        display: grid;
        overflow: clip;
      }

      .card > header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
      }

      [part='card-title'],
      [part='card-description'] {
        grid-column: 1;
        min-inline-size: 0;
      }

      [part='card-description'] {
        grid-row: 2;
      }

      [part='card-action'] {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        grid-column: 2;
        grid-row: 1;
        justify-self: end;
      }

      .card [hidden] {
        display: none;
      }

      .card > .content {
        display: grid;
      }

      /* Footer: a centered flex row, content from the logical start. */
      .card > footer {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
      }

      .card > [hidden] {
        display: none;
      }

      slot {
        display: contents;
      }

      slot::slotted(p),
      slot::slotted(h2) {
        margin: 0;
      }
    `,
  ];
  /** Adds a shadow, and changes nothing else, for a card that floats above the page. */
  elevated = false;
  /** Shows or removes the outline and the section dividers together. */
  borders: 'on' | 'off' = 'on';
  /** Gives the header, content and footer their own fills, or one shared fill when `off`. */
  sectionColors: 'on' | 'off' = 'on';
  /** The section padding; `sm` suits sidebars, dashboards and nested cards. */
  size: 'sm' | 'default' = 'default';
  #syncSection = (event: Event): void => {
    const slot = event.currentTarget as HTMLSlotElement;
    const wrapper = slot.parentElement;
    if (
      wrapper &&
      wrapper.matches(
        '[part="card-title"], [part="card-description"], [part="card-action"], [part="card-content"]',
      )
    )
      wrapper.hidden = !slot
        .assignedNodes({ flatten: true })
        .some((node) => node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim()));
    const section = (event.currentTarget as HTMLSlotElement).parentElement?.closest(
      'header, footer',
    );
    if (!section) return;
    (section as HTMLElement).hidden = ![...section.querySelectorAll('slot')].some((slot) =>
      slot
        .assignedNodes({ flatten: true })
        .some((node) => node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim())),
    );
  };
  protected override render() {
    return html`<article class="card" part="card">
      <header part="card-header" hidden>
        <div part="card-title" hidden>
          <slot name="header" @slotchange=${this.#syncSection}></slot>
        </div>
        <div part="card-description" hidden>
          <slot name="description" @slotchange=${this.#syncSection}></slot>
        </div>
        <div part="card-action" hidden>
          <slot name="action" @slotchange=${this.#syncSection}></slot>
        </div>
      </header>
      <div class="content" part="card-content" hidden>
        <slot @slotchange=${this.#syncSection}></slot>
      </div>
      <footer part="card-footer" hidden>
        <slot name="footer" @slotchange=${this.#syncSection}></slot>
      </footer>
    </article>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-card': TpCard;
  }
}
