import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { elevatedProperty } from '../shared/elevation.js';
import { cardPresentation } from '../../presentation/families/card.js';

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

      /* Nova cn-card-footer: flex items-center, content from the logical start. */
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
  elevated = false;
  borders: 'on' | 'off' = 'on';
  sectionColors: 'on' | 'off' = 'on';
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
