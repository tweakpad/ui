import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { descriptionListPresentation } from '../../presentation/families/description-list.js';

/**
 * One label and value pair of a Description list: `label` is the term and the content is its
 * value.
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

  /** The name of the value, presented as the term. */
  label = '';
  /** Puts the label above the value (`stacked`), as for a long value, or beside it (`inline`); unset follows the list. */
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
