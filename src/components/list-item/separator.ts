import { css } from 'lit';
import { TpElement } from '../../foundation/element.js';

/** List Item presentation binding around the shared decorative Separator. */
export class TpListItemSeparator extends TpElement {
  static tagName = 'tp-list-item-separator';
  static presentationTagName = 'tp-list-item';
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }
    `,
  ];
  protected override render() {
    return this.renderPart(
      'list-item-separator',
      {},
      {
        tag: 'tp-separator',
        properties: { class: 'separator', '.decorative': true, '.orientation': 'horizontal' },
      },
    );
  }
}
