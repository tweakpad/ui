import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { descriptionListPresentation } from '../../presentation/families/description-list.js';

/**
 * Description list item: one label–value pair inside a `tp-description-list`. The list presents
 * `label` as the term and the item's content as its description.
 *
 * @slot - The value.
 */
export class TpDescriptionListItem extends TpElement {
  static tagName = 'tp-description-list-item';
  static override presentation = descriptionListPresentation;
  static override properties = {
    ...TpElement.properties,
    label: { type: String, reflect: true },
    layout: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      /* The list's description element lays out and colors the value. */
      :host {
        display: contents;
        color: inherit;
      }
    `,
  ];

  /** Label text, presented as the term. */
  label = '';
  /** Layout of this pair (`inline` or `stacked`); unset follows the list. */
  layout: 'inline' | 'stacked' | null = null;

  protected override render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-description-list-item': TpDescriptionListItem;
  }
}
