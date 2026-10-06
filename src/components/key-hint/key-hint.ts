import { css, html, nothing } from 'lit';
import { KeyHintElement } from './base.js';
import { keyHintNotation } from './notation.js';
import { keyHintPresentation } from '../../presentation/families/key-hint.js';

/** One informative key; authored content can replace the generated notation. */
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
