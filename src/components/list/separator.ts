import { css } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { listPresentation } from '../../presentation/families/list.js';
import { TpSeparator } from '../separator/separator.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

/** A decorative line between two rows of a List. */
export class TpListSeparator extends TpElement {
  static tagName = 'tp-list-separator';
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpSeparator];
  }
  static override presentation = listPresentation;
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
      'list-separator',
      {},
      {
        tag: 'tp-separator',
        properties: { class: 'separator', '.decorative': true, '.orientation': 'horizontal' },
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-list-separator': TpListSeparator;
  }
}
