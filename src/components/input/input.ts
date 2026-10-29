import { css, html, nothing } from 'lit';
import { autofillProperties } from '../../foundation/autofill.js';
import { renderPart } from '../../foundation/part.js';
import { TpTextControl } from '../field/text-control.js';
import { inputPresentation } from '../../presentation/families/input.js';

/** `inline`: one compact row with the label at the start and the value at the end. */
export type InputVariant = 'default' | 'inline';

/**
 * One line of text for a form value: a native input in the page's own tree, so browsers and
 * password managers fill it and it submits with its form, that joins the Field around it for its
 * label, help text, errors and validation.
 *
 * @slot - Holds the native input the element renders; leave it empty.
 * @csspart input-row - The row of an inline Input around its label and editor.
 * @csspart input-label - The label at the start of an inline Input's row.
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
    variant: { type: String, reflect: true },
  };
  static override styles = [
    ...TpTextControl.styles,
    css`
      /* Inline: one row across its container, the label at the start and the value at the end. */
      :host([variant='inline']) {
        display: block;
      }

      .row {
        display: flex;
        align-items: center;
        min-inline-size: 0;
        cursor: text;
      }

      .label {
        flex: 0 1 auto;
        min-inline-size: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .row ::slotted([data-tp-editor]) {
        flex: 1 1 0;
        text-align: end;
      }
    `,
  ];
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
  /**
   * `inline` shows the label and the value in one compact control-height row, for stacked
   * controls; an enclosing Field's label moves into the row.
   */
  variant: InputVariant = 'default';
  /** An inline Input shows its Field's label inside its row. */
  override get rendersFieldLabel(): boolean {
    return this.variant === 'inline';
  }
  protected override render() {
    const editor = this.#editor();
    if (this.variant !== 'inline') return editor;
    const label = this.fieldLabel || this.label;
    const state = {
      disabled: this.effectiveDisabled,
      readOnly: this.effectiveReadOnly,
      invalid: this.effectiveInvalid,
    };
    return renderPart('input-row', state, this.partContracts['input-row'], {
      tag: 'div',
      properties: {
        class: 'row',
        part: 'input-row',
        'data-disabled': state.disabled,
        'data-readonly': state.readOnly,
        'data-invalid': state.invalid,
        // A press on the label edits the value, as a press on a label does.
        '@click': (event: MouseEvent) => {
          if (event.target !== this.inputElement) this.inputElement?.focus();
        },
      },
      content: html`${
        label
          ? renderPart('input-label', state, this.partContracts['input-label'], {
              tag: 'span',
              // The editor is named by the Field or by `label`; this copy is visual.
              properties: { class: 'label', part: 'input-label', 'aria-hidden': 'true' },
              content: label,
            })
          : nothing
      }${editor}`,
    });
  }
  #editor() {
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
