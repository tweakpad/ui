import { css, html, nothing } from 'lit';
import { KeyHintElement } from './base.js';
import { keyHintNotation } from '../../foundation/key-notation.js';
import { keyHintPresentation } from '../../presentation/families/key-hint.js';

/**
 * One keycap of a keyboard shortcut, in the notation of the reader's platform. It describes a
 * shortcut and never registers one; the application implements it.
 *
 * @slot - Text or an Icon that replaces the generated notation; give an icon a `label`.
 */
export class TpKeyHint extends KeyHintElement {
  static tagName = 'tp-key-hint';
  static override presentation = keyHintPresentation;
  static override properties = { ...KeyHintElement.properties, key: { type: String } };
  static override styles = [
    KeyHintElement.styles,
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
  key = '';
  protected override render() {
    const notation = keyHintNotation(this.key, this.resolvedPlatform, this.resolvedLabels);
    const label = this.label || (this.key ? notation.label : '');
    return html`${this.renderPrefix()}${this.renderPart(
      'key-hint',
      { key: this.key, platform: this.resolvedPlatform },
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
    'tp-key-hint': TpKeyHint;
  }
}
