import { nothing } from 'lit';
import { autofillProperties } from '../../foundation/autofill.js';
import { TpTextControl } from '../field/text-control.js';
import { inputPresentation } from '../../presentation/families/input.js';

/**
 * One line of text for a form value: a native input in the page's own tree, so browsers and
 * password managers fill it and it submits with its form, that joins the Field around it for its
 * label, help text, errors and validation.
 *
 * @slot - Holds the native input the element renders; leave it empty.
 */
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
  /**
   * The native input type, such as `email`, `password`, `search`, `url` or `tel`; it sets the
   * keyboard, autofill and built-in validation.
   */
  type = 'text';
  /** The lowest value a numeric or date type accepts. */
  min = '';
  /** The highest value a numeric or date type accepts. */
  max = '';
  /** The granularity a numeric or date type accepts. */
  step = '';
  /** A regular expression the whole value must match to be valid. */
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
