import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';
export class TpAttachmentGroup extends TpElement {
  static tagName = 'tp-attachment-group';
  static presentationTagName = 'tp-attachment';
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      .group {
        display: flex;
        min-inline-size: 0;
        overflow-x: auto;
        overscroll-behavior-inline: contain;
        scroll-snap-type: x mandatory;
      }

      ::slotted(tp-attachment) {
        flex: none;
        scroll-snap-align: start;
      }
    `,
  ];
  protected override render() {
    return this.renderPart(
      'attachment',
      {},
      {
        properties: {
          class: 'group',
          role: 'group',
          'aria-label': this.getAttribute('aria-label') ?? undefined,
          tabindex: 0,
        },
        content: html`<slot></slot>`,
      },
    );
  }
}
