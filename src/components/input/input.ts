import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { autofillProperties } from '../../foundation/autofill.js';
import { componentHandlingPrevented, renderPart } from '../../foundation/part.js';
import { PressAndHold } from '../../foundation/press-and-hold.js';
import { compositeControl } from '../../foundation/composite-control.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { normalizeNumberFieldValue } from '../../foundation/number-field/numeric.js';
import { chevronLeftIcon } from '../../icons/chevron-left.js';
import { chevronRightIcon } from '../../icons/chevron-right.js';
import { TpTextControl } from '../field/text-control.js';
import { TpButton } from '../button/button.js';
import { TpIcon } from '../icon/icon.js';
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
 * @csspart input-stepper - The decrement and increment Buttons around the value at the end of an
 * inline number Input's row.
 * @csspart input-decrement - The Button before the value that steps an inline number Input down.
 * @csspart input-increment - The Button after the value that steps an inline number Input up.
 */
export class TpInput extends TpTextControl {
  static tagName = 'tp-input';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpButton, TpIcon];
  }
  static override presentation = inputPresentation;
  static override properties = {
    ...TpTextControl.properties,
    type: { type: String },
    min: { type: String },
    max: { type: String },
    step: { type: String },
    pattern: { type: String },
    precision: { type: Number },
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

      /* An inline number value sits between its decrement and increment Buttons. */
      .stepper {
        display: inline-flex;
        flex: none;
        align-items: center;
        margin-inline-start: auto;
        cursor: default;
      }

      /* The arrows point away from the value in either writing direction. */
      :host(:dir(rtl)) .step {
        scale: -1 1;
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
   * Decimal places of a number value: stepped and typed values are rounded to it, and the value
   * shows that many decimals. Defaults to the decimals of `step`.
   */
  precision: number | undefined;
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
      }${this.type === 'number' ? this.#stepper(state, editor) : editor}`,
    });
  }

  #steppers = new Map<TpButton, PressAndHold>();

  /**
   * An inline number Input's own decrement and increment Buttons around the value, in place of the
   * browser's spin buttons. They stay out of the tab order and the accessibility tree: the focused
   * editor steps with the Arrow keys and keeps its spin button semantics.
   */
  #stepper(state: { disabled: boolean; readOnly: boolean }, editor: unknown) {
    const disabled = state.disabled || state.readOnly;
    const button = (direction: -1 | 1) =>
      html`<tp-button
        part=${direction < 0 ? 'input-decrement' : 'input-increment'}
        variant="ghost"
        size="icon-xs"
        tabindex="-1"
        data-step=${direction}
        .icon=${direction < 0 ? chevronLeftIcon : chevronRightIcon}
        .ariaLabel=${direction < 0 ? 'Decrease' : 'Increase'}
        ?disabled=${disabled}
      ></tp-button>`;
    // The value keeps the width of its longest bound, so the Buttons hold still while stepping.
    const chars = Math.max(
      1,
      ...[this.editingValue, this.#format(this.min), this.#format(this.max)].map(
        (text) => text.length,
      ),
    );
    return renderPart('input-stepper', state, this.partContracts['input-stepper'], {
      tag: 'span',
      properties: {
        class: 'stepper',
        part: 'input-stepper',
        style: { '--_tp-input-chars': String(chars) },
      },
      content: html`<span aria-hidden="true" class="step">${button(-1)}</span>${editor}<span
          aria-hidden="true"
          class="step"
          >${button(1)}</span
        >`,
    });
  }

  /** Decimal places a number value rounds to: `precision`, else the decimals of `step`. */
  get #precision(): number | undefined {
    if (this.type !== 'number') return undefined;
    if (Number.isInteger(this.precision) && this.precision! >= 0)
      return Math.min(this.precision!, 20);
    const step = this.step.trim().toLowerCase();
    if (!step || step === 'any' || !Number.isFinite(Number(step))) return undefined;
    const [mantissa = '', exponent = '0'] = step.split('e');
    const decimals = (mantissa.split('.')[1]?.length ?? 0) - Number(exponent);
    return decimals > 0 ? decimals : undefined;
  }

  /** A number value in its precision; other text as it is. */
  #format(text: string): string {
    const precision = this.#precision;
    const number = Number(text);
    if (precision === undefined || text.trim() === '' || !Number.isFinite(number)) return text;
    const rounded = normalizeNumberFieldValue(number, {
      allowOutOfRange: true,
      format: { minimumFractionDigits: precision, maximumFractionDigits: precision },
    });
    return rounded === null ? text : rounded.toFixed(precision);
  }

  /** Typed text shows as it is typed; at rest a number value shows in its precision. */
  #typing = false;
  protected override get editingValue(): string {
    const value = super.editingValue;
    return this.#typing ? value : this.#format(value);
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#bindSteppers();
  }

  override disconnectedCallback(): void {
    for (const [button, hold] of this.#steppers) {
      hold.dispose();
      compositeControl(button)?.release(this);
    }
    this.#steppers.clear();
    super.disconnectedCallback();
  }

  #bindSteppers(): void {
    const buttons = new Set(
      this.renderRoot.querySelectorAll<TpButton>('[part~="input-stepper"] tp-button'),
    );
    for (const [button, hold] of this.#steppers)
      if (!buttons.has(button)) {
        hold.dispose();
        compositeControl(button)?.release(this);
        this.#steppers.delete(button);
      }
    const disabled = this.effectiveDisabled || this.effectiveReadOnly;
    for (const button of buttons) {
      // The Input owns the Buttons' focus policy: never in the tab order.
      compositeControl(button)?.apply(
        this,
        { disabled, focusableWhenDisabled: false, tabIndex: -1 },
        () => {},
      );
      if (this.#steppers.has(button)) continue;
      const direction = Number(button.dataset.step) < 0 ? -1 : 1;
      const hold = new PressAndHold(button, {
        disabled: () => button.disabled,
        tick: () => this.#step(direction),
        release: () => this.#stepped(),
        focus: () => this.inputElement?.focus({ preventScroll: true }),
      });
      // Touch and assistive activation arrive as a click; a held mouse press already stepped.
      button.addEventListener('click', (event) => {
        if (
          componentHandlingPrevented(event) ||
          hold.shouldSkipClick(event) ||
          button.disabled ||
          !this.#step(direction)
        )
          return;
        this.#stepped();
      });
      this.#steppers.set(button, hold);
    }
  }

  /**
   * Steps the value by `step` (times `multiplier`) onto the step grid from `min`, within `min` and
   * `max`, in its precision, as the spin buttons do; returns whether the value changed.
   */
  #step(direction: -1 | 1, multiplier = 1): boolean {
    const input = this.inputElement;
    if (!(input instanceof this.ownerDocument.defaultView!.HTMLInputElement)) return false;
    const bound = (text: string) =>
      text.trim() !== '' && Number.isFinite(Number(text)) ? Number(text) : undefined;
    const step = bound(this.step);
    const amount = (step !== undefined && step > 0 ? step : 1) * multiplier;
    const precision = this.#precision;
    const text = input.value.trim();
    const current = text !== '' && Number.isFinite(Number(text)) ? Number(text) : 0;
    const minimum = bound(this.min);
    const maximum = bound(this.max);
    const next = normalizeNumberFieldValue(
      current + direction * amount,
      {
        ...(minimum === undefined ? {} : { minimum }),
        ...(maximum === undefined ? {} : { maximum }),
        // `step="any"` moves by one from the current value, as the spin buttons do.
        snapOnStep: step !== undefined && step > 0,
        ...(precision === undefined
          ? {}
          : { format: { minimumFractionDigits: precision, maximumFractionDigits: precision } }),
      },
      { amount, direction },
    );
    if (next === null) return false;
    const value = precision === undefined ? String(next) : next.toFixed(precision);
    if (value === input.value) return false;
    this.#typing = false;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    return true;
  }

  /** The spin buttons end a stepping gesture with a change event. */
  #stepped(): void {
    this.inputElement?.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** The Arrow keys step an inline number value through the same path, ten steps with Shift. */
  readonly #numberKeyDown = (event: KeyboardEvent): void => {
    if (
      this.variant === 'inline' &&
      this.type === 'number' &&
      (event.key === 'ArrowUp' || event.key === 'ArrowDown') &&
      !event.defaultPrevented &&
      !event.isComposing &&
      !this.effectiveDisabled &&
      !this.effectiveReadOnly
    ) {
      event.preventDefault();
      if (this.#step(event.key === 'ArrowUp' ? 1 : -1, event.shiftKey ? 10 : 1)) this.#stepped();
    }
    // Enter commits typed text before the form it submits reads the value.
    if (event.key === 'Enter' && !event.isComposing)
      this.#commitNumber(event.currentTarget as HTMLInputElement);
    this.inputKeyDown(event);
  };

  /** Typing marks the value as being edited, so it shows as typed until it is committed. */
  readonly #numberInput = (event: Event): void => {
    if (event.isTrusted && this.type === 'number') this.#typing = true;
    this.inputChanged(event);
  };

  /** A committed number value (blur or Enter) rounds to its precision. */
  readonly #numberCommit = (event: Event): void => {
    this.#commitNumber(event.currentTarget as HTMLInputElement);
  };

  #commitNumber(input: HTMLInputElement): void {
    if (this.type !== 'number' || !this.#typing) return;
    this.#typing = false;
    const formatted = this.#format(input.value);
    if (formatted !== input.value) {
      input.value = formatted;
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }
    this.requestUpdate();
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
      '@input': this.#numberInput,
      '@change': this.#numberCommit,
      '@paste': this.pasted,
      '@compositionstart': this.compositionStarted,
      '@compositionend': this.compositionEnded,
      '@focus': this.inputFocused,
      '@blur': this.inputBlurred,
      '@keydown': this.#numberKeyDown,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-input': TpInput;
  }
}
