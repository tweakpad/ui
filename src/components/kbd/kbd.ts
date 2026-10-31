import { css, html, nothing } from 'lit';
import { KbdElement } from './base.js';
import { kbdNotation } from '../../foundation/key-notation.js';
import { kbdPresentation } from '../../presentation/families/kbd.js';

/**
 * One keycap of a keyboard shortcut, in the notation of the reader's platform. It describes a
 * shortcut and never registers one; the application implements it.
 *
 * @slot - Text or an Icon that replaces the generated notation; give an icon a `label`.
 */
export class TpKbd extends KbdElement {
  static tagName = 'tp-kbd';
  static override presentation = kbdPresentation;
  static override properties = { ...KbdElement.properties, value: { type: String } };
  static override styles = [
    KbdElement.styles,
    css`
      :host {
        pointer-events: none;
        user-select: none;
      }

      kbd {
        justify-content: center;
        white-space: nowrap;
        flex: none;
      }
    `,
  ];
  /** The key to draw, such as `mod`, `shift`, `enter` or `K`; `mod` is Command on macOS and Ctrl elsewhere. */
  value = '';
  protected override render() {
    const notation = kbdNotation(this.value, this.resolvedPlatform, this.resolvedLabels);
    const label = this.label || (this.value ? notation.label : '');
    return html`${this.renderPrefix()}${this.renderPart(
      'kbd',
      { value: this.value, platform: this.resolvedPlatform },
      {
        tag: 'kbd',
        content: html`<span class="content" aria-hidden=${label ? 'true' : nothing}
            ><slot>${notation.text}</slot></span
          >${label ? html`<span class="visually-hidden">${label}</span>` : nothing}`,
      },
    )}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-kbd': TpKbd;
  }
}
