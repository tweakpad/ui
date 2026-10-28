import { nothing } from 'lit';
import { autofillProperties } from '../../foundation/autofill.js';
import { TpTextControl } from '../field/text-control.js';
import { inputPresentation } from '../../presentation/families/input.js';

export class TpInput extends TpTextControl {
  static tagName = 'tp-input';
  static override presentation = inputPresentation;
  static override properties = {
    ...TpTextControl.properties,
    type: { type: String },
    min: { type: String },
    max: { type: String },
    step: { type: String },
    pattern: { type: String },
  };
  type = 'text';
  min = '';
  max = '';
  step = '';
  pattern = '';
  protected override render() {
    return this.renderControl('input', 'input', {
      class: 'control',
      part: 'input focusable',
      '.type': this.type,
      '.name': this.effectiveName,
      ...(this.type === 'file' ? {} : { '.value': this.editingValue }),
      '.placeholder': this.placeholder,
      ...autofillProperties(this.effectiveNoAutofill, this.autocomplete, '.autocomplete'),
      '.min': this.min,
      '.max': this.max,
      '.step': this.step,
      pattern: this.pattern || nothing,
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

declare global {
  interface HTMLElementTagNameMap {
    'tp-input': TpInput;
  }
}
