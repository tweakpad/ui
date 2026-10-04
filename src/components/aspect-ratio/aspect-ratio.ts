import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';

/** A ratio owns its geometry; intrinsic child dimensions cannot enlarge it. */
export class TpAspectRatio extends TpElement {
  static tagName = 'tp-aspect-ratio';
  static override properties = {
    ...TpElement.properties,
    ratio: { type: Number, noAccessor: true },
    fit: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      .box {
        position: relative;
        inline-size: 100%;
        overflow: hidden;
        border-radius: inherit;
      }

      .content {
        position: absolute;
        inset: 0;
        min-inline-size: 0;
        min-block-size: 0;
      }

      ::slotted(*) {
        inline-size: 100%;
        block-size: 100%;
        object-fit: fill;
      }

      :host([fit='contain']) ::slotted(*) {
        object-fit: contain;
      }

      :host([fit='cover']) ::slotted(*) {
        object-fit: cover;
      }

      :host([fit='none']) ::slotted(*) {
        object-fit: none;
      }
    `,
  ];
  #ratio = 16 / 9;
  fit: 'fill' | 'contain' | 'cover' | 'none' = 'fill';
  get ratio(): number {
    return this.#ratio;
  }
  set ratio(value: number) {
    if (!Number.isFinite(value) || value <= 0)
      throw new RangeError('Aspect Ratio requires a finite ratio greater than zero.');
    const previous = this.#ratio;
    this.#ratio = value;
    this.requestUpdate('ratio', previous);
  }
  protected override render() {
    const state = Object.freeze({ ratio: this.ratio, fit: this.fit });
    return this.renderPart('aspect-ratio-box', state, {
      properties: {
        class: 'box',
        part: 'root aspect-ratio-box',
        style: { 'aspect-ratio': String(this.ratio) },
      },
      content: this.renderPart('aspect-ratio-box-content', state, {
        properties: { class: 'content', part: 'aspect-ratio-box-content' },
        content: html`<slot></slot>`,
      }),
    });
  }
}
