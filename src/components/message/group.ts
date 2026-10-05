import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';

/** Consecutive messages share a density owner without introducing conversation state. */
export class TpMessageGroup extends TpElement {
  static tagName = 'tp-message-group';
  static presentationTagName = 'tp-message';
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      .group {
        display: flex;
        flex-direction: column;
        min-inline-size: 0;
      }
    `,
  ];
  protected override render() {
    return this.renderPart('message', Object.freeze({}), {
      properties: { class: 'group', part: 'message' },
      content: html`<slot></slot>`,
    });
  }
}
