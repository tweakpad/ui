import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { buttonGroupPresentation } from '../../presentation/families/button-group.js';

/**
 * A read-only segment of a Button group, such as a fixed prefix, a unit or a count.
 *
 * @slot - The segment content: text, an Icon or a Label for the neighboring editor.
 */
export class TpButtonGroupText extends TpElement {
  static tagName = 'tp-button-group-text';
  static override presentation = buttonGroupPresentation;
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
        min-inline-size: 0;
      }

      [part~='button-group-text-segment'] {
        display: flex;
        align-items: center;
        flex: 1;
      }
    `,
  ];
  protected override render() {
    return this.renderPart(
      'button-group-text-segment',
      {},
      {
        tag: 'span',
        content: html`<slot></slot>`,
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-button-group-text': TpButtonGroupText;
  }
}
