import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';

/** Noninteractive content; Label and Icon remain their existing public controls. */
export class TpButtonGroupText extends TpElement {
  static tagName = 'tp-button-group-text';
  static presentationTagName = 'tp-button-group';
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
