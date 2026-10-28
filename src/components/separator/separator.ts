import { css, nothing } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { separatorPresentation } from '../../presentation/families/separator.js';

/**
 * A thin rule that divides content horizontally or vertically. It fills its container along its
 * axis, reserves no spacing of its own, and is hidden from assistive technology unless it marks a
 * real boundary.
 *
 * @csspart root - The rule's inner element, which carries the separator role when it is not decorative.
 */
export class TpSeparator extends TpElement {
  static tagName = 'tp-separator';
  static override presentation = separatorPresentation;
  static override properties = {
    ...TpElement.properties,
    decorative: { type: Boolean, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        height: var(--tp-border-width);
        width: 100%;
      }

      :host([orientation='vertical']) {
        height: 100%;
        width: var(--tp-border-width);
      }
    `,
  ];
  /** Set to `false` when the rule marks a boundary between groups, so assistive technology announces it as a separator. */
  decorative = true;
  protected override render() {
    return this.renderPart(
      'root',
      Object.freeze({ decorative: this.decorative, orientation: this.orientation }),
      {
        tag: 'div',
        properties: {
          part: 'root',
          role: this.decorative ? 'none' : 'separator',
          'aria-orientation': this.decorative ? nothing : this.orientation,
        },
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-separator': TpSeparator;
  }
}
