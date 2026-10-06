import { css, nothing } from 'lit';
import { autofillProperties } from '../../foundation/autofill.js';
import { TpTextControl } from '../field/text-control.js';
import { textAreaPresentation } from '../../presentation/families/text-area.js';

export class TpTextArea extends TpTextControl {
  static tagName = 'tp-text-area';
  static override presentation = textAreaPresentation;
  static override properties = {
    ...TpTextControl.properties,
    rows: { type: Number },
    resize: { type: String, reflect: true },
  };
  static override styles = [
    TpTextControl.styles,
    css`
      textarea {
        resize: block;
      }

      :host([resize='none']) textarea {
        resize: none;
      }

      :host([resize='inline']) textarea {
        resize: inline;
      }

      :host([resize='both']) textarea {
        resize: both;
      }
    `,
  ];
  rows = 2;
  resize: 'none' | 'block' | 'inline' | 'both' = 'block';
  protected override render() {
    return this.renderControl('text-area', 'textarea', {
      class: 'control',
      part: 'text-area text-area-resize-affordance focusable',
      '.name': this.effectiveName,
      '.value': this.editingValue,
      '.placeholder': this.placeholder,
      ...autofillProperties(this.effectiveNoAutofill, this.autocomplete, '.autocomplete'),
      '.rows': Math.max(1, Math.trunc(this.rows) || 2),
      minlength: this.minLength >= 0 ? this.minLength : nothing,
      maxlength: this.maxLength >= 0 ? this.maxLength : nothing,
      '.disabled': this.effectiveDisabled,
      '.readOnly': this.readOnly,
      '.required': this.required,
      ...(this.label ? { 'aria-label': this.label } : {}),
      'aria-invalid': this.effectiveInvalid ? 'true' : nothing,
      '@input': this.inputChanged,
      '@paste': this.pasted,
      '@compositionstart': this.compositionStarted,
      '@compositionend': this.compositionEnded,
      '@focus': this.inputFocused,
      '@blur': this.inputBlurred,
      '@keydown': this.inputKeyDown,
    });
  }
}
