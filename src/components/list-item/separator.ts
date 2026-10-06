import { css } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { listItemPresentation } from '../../presentation/families/list-item.js';
import { TpSeparator } from '../separator/separator.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

/** List Item presentation binding around the shared decorative Separator. */
export class TpListItemSeparator extends TpElement {
  static tagName = 'tp-list-item-separator';
  static presentationTagName = 'tp-list-item';
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpSeparator];
  }
  static override presentation = listItemPresentation;
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
