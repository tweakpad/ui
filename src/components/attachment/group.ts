import { Scrollable } from '../../foundation/scrollable.js';
import { NativeScrollEdges } from '../shared/scroll-edges.js';
import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { attachmentPresentation } from '../../presentation/families/attachment.js';
/**
 * A horizontally scrolling row of Attachments with snap points, such as a composer's tray. It can
 * take focus so keyboard users can scroll it; name it with `aria-label`.
 *
 * @slot - The Attachments.
 */
export class TpAttachmentGroup extends Scrollable(TpElement) {
  constructor() {
    super();
    new NativeScrollEdges(this, {
      viewports: () => [...this.renderRoot.querySelectorAll<HTMLElement>('.group')],
    });
  }

  static tagName = 'tp-attachment-group';
  static override presentation = attachmentPresentation;
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      /* The row scrolls without a native scrollbar: an overlay thumb would cover the cards. The
         edge fades show the overflow; trackpads, Shift with the wheel and the keyboard (the row
         takes focus) scroll it. */
      .group {
        display: flex;
        min-inline-size: 0;
        overflow-x: auto;
        scrollbar-width: none;
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

declare global {
  interface HTMLElementTagNameMap {
    'tp-attachment-group': TpAttachmentGroup;
  }
}
