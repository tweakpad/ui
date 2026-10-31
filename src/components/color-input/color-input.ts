import { css, html, nothing } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { PropertyValues } from 'lit';
import { TpFormElement } from '../../foundation/form-element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import { TpValueCommitEvent } from '../../foundation/events.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import { stateMarkers } from '../../foundation/state-markers.js';
import { preventComponentHandling } from '../../foundation/part.js';
import { containNestedEvents } from '../../foundation/nested-events.js';
import { defaultTrue } from '../../foundation/converters.js';
import { parseColor } from '../../foundation/color/parse.js';
import {
  flatGradient,
  normalizeColorText,
  serializeColor,
} from '../../foundation/color/serialize.js';
import { color, isColorFormat } from '../../foundation/color/types.js';
import type { ColorFormat, ColorValue } from '../../foundation/color/types.js';
import { fillLayerStyles } from '../../presentation/motion.js';
import { colorInputPresentation } from '../../presentation/families/color-input.js';
import { TpInput } from '../input/input.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import type {
  ColorInputPicker,
  ColorInputSize,
  ColorInputState,
  ColorInputVariant,
} from './types.js';

/** Called with each committed value when an interaction settles. */
export type ColorInputValueCommitCallback = (event: TpValueCommitEvent<string>) => void;

/** One picking session of the browser's picker, from its first color to its close. */
interface PickSession {
  readonly start: string;
  last: string | undefined;
}

/**
 * A color chosen with the browser's own color picker, shown as a color chip, that joins the Field
 * around it and submits with its form. The inline variant is one compact row with the label at the
 * start and, at the end, the color as editable text and the chip.
 *
 * @fires tp-value-change - Cancelable proposal of a new color while the picker reports one, or when
 * typed text commits; `detail.value`, `detail.previousValue` and `detail.reason`.
 * @fires tp-value-commit - When an interaction settles: the picker closes, or typed text commits.
 * @fires tp-field-value - After a value commits; an enclosing Field tracks its dirty state from it.
 */
export class TpColorInput extends TpFormElement<string> {
  static tagName = 'tp-color-input';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpInput];
  }
  static override presentation = colorInputPresentation;
  static override properties = {
    ...TpFormElement.properties,
    value: { type: String, noAccessor: true },
    defaultValue: { type: String, attribute: 'default-value' },
    format: { type: String, reflect: true },
    alpha: { type: Boolean, reflect: true },
    picker: { type: String, reflect: true },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    showSwatch: { type: Boolean, attribute: 'show-swatch', converter: defaultTrue },
    showValue: { type: Boolean, attribute: 'show-value', converter: defaultTrue },
    label: { type: String },
    onValueChange: { attribute: false },
    onValueCommitted: { attribute: false },
  };
  static override styles = [
    TpFormElement.styles,
    css`
      :host {
        display: inline-block;
        min-inline-size: 0;
        vertical-align: middle;
      }

      :host([variant='inline']) {
        display: block;
      }

      .root {
        display: flex;
        min-inline-size: 0;
      }

      .row {
        display: flex;
        flex: 1 1 auto;
        align-items: center;
        min-inline-size: 0;
        cursor: pointer;
      }

      .label {
        flex: 0 1 auto;
        min-inline-size: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* The chip and the value text end the row together. */
      .end {
        display: flex;
        flex: 0 1 auto;
        align-items: center;
        gap: var(--tp-space-1);
        min-inline-size: 0;
        margin-inline-start: auto;
      }

      /* The value text is monospaced, so its width follows its length in ch. */
      .value {
        flex: 0 1 auto;
        inline-size: calc(var(--_tp-color-input-chars, 7) * 1ch + 2px);
        min-inline-size: 0;
        font-family: var(--tp-font-mono);
        font-size: var(--tp-text-sm);
        cursor: text;
      }

      /* Without the chip the value text keeps the row's end inset. */
      .end:has(> .value:last-child) {
        padding-inline-end: var(--tp-space-2-5);
      }

      .swatch {
        display: inline-flex;
        flex: none;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
      }

      .chip {
        display: block;
        flex: none;
        pointer-events: none;
      }

      /* The native control covers the swatch, so a press anywhere on it reaches the control and
         the browser anchors its picker to the swatch; the chip paints under it. */
      .swatch-control {
        position: absolute;
        inset: 0;
        inline-size: 100%;
        block-size: 100%;
        margin: 0;
        padding: 0;
        border: 0;
        opacity: 0;
        cursor: pointer;
      }

      .swatch-control:disabled {
        cursor: not-allowed;
      }
    `,
    fillLayerStyles('.swatch'),
  ];
  /** The starting color of an uncontrolled input, in any CSS notation; form reset returns to it. */
  defaultValue: string | undefined;
  /** The notation the value and the value text use; any CSS color goes in. */
  format: ColorFormat = 'hex';
  /** Keeps the alpha channel; without it every value is opaque. */
  alpha = false;
  /**
   * `native` opens the browser's color picker from the swatch. `none` makes the swatch a button
   * that never opens it, so another picker, such as a Color picker popup, can own the color.
   */
  picker: ColorInputPicker = 'native';
  /** `inline` shows the label, the value text and the chip in one compact row. */
  variant: ColorInputVariant = 'default';
  /** Height of the swatch and the row, matching Input's sizes. */
  size: ColorInputSize = 'default';
  /** Shows the chip in an inline row; the chip stays while the value text is hidden. */
  showSwatch = true;
  /** Shows the editable value text in an inline row. */
  showValue = true;
  /** Accessible name when no Field labels the input, and the label an inline input shows. */
  label = '';
  /**
   * Called with each proposed value before `tp-value-change`; a controlled owner accepts it by
   * setting `value`.
   */
  onValueChange: ((event: TpValueChangeEvent<string>) => void) | undefined;
  /** Called with each committed value when an interaction settles, before `tp-value-commit`. */
  onValueCommitted: ColorInputValueCommitCallback | undefined;
  #provided: string | undefined;
  #control: HTMLInputElement | HTMLButtonElement | null = null;
  #valueEditor: TpInput | null = null;
  #registeredEditor: HTMLElement | null = null;
  #releaseEditor: (() => void) | undefined;
  #session: PickSession | undefined;
  /** A proposal a controlled owner accepted but has not written back yet, shown meanwhile. */
  #overlay: string | undefined;
  #text = '';
  #editing = false;
  readonly #state = new ControllableState<string>({
    host: this,
    initialValue: '',
    readControlledValue: () =>
      this.#provided === undefined ? undefined : this.#normalize(this.#provided),
    readDefaultValue: () =>
      this.defaultValue === undefined ? undefined : this.#normalize(this.defaultValue),
    hasDefaultValue: () => this.defaultValue !== undefined,
    onChange: (event) => this.onValueChange?.(event),
    onCommit: (value, previousValue, reason) => {
      // The Field reads validity when the value reaches it.
      this.#syncForm();
      this.emit('tp-field-value', { value, previousValue, reason });
    },
    diagnostic: (message) => this.diagnose('color-input-value', message),
  });
  constructor() {
    super();
    // The value editor's own lane stays inside; this element proposes the color.
    containNestedEvents(this, {
      types: ['tp-value-change', 'tp-value-commit', 'tp-field-value'],
      on: 'root',
    });
  }
  readonly #controlReference = (element: HTMLElement | null): void => {
    this.#control = element as HTMLInputElement | HTMLButtonElement | null;
  };
  readonly #editorReference = (element: Element | undefined): void => {
    this.#valueEditor = (element as TpInput | undefined) ?? null;
  };

  /** The color, serialized in `format`; empty for no color. Setting it makes the input controlled. */
  override get value(): string {
    return this.#state.value;
  }
  override set value(value: string) {
    const previous = this.value;
    this.#provided = value === null || value === undefined ? undefined : String(value);
    if (this.hasUpdated) this.#state.sync();
    this.requestUpdate('value', previous);
  }
  /** Whether the application controls `value`. */
  get controlled(): boolean {
    return this.#state.controlled;
  }
  /** The swatch control: the native color input, or the button with `picker="none"`. */
  override get inputElement(): HTMLElement | null {
    return this.#control;
  }
  /** Proposes a color in any CSS notation and commits it; returns whether it was accepted. */
  setValue(value: string, reason: ChangeReason = 'programmatic', sourceEvent?: Event): boolean {
    const next = this.#normalize(value);
    const previous = this.value;
    if (next === previous) return true;
    const accepted = this.#state.set(next, reason, sourceEvent);
    if (accepted) this.#emitCommit(next, previous, reason, sourceEvent);
    return accepted;
  }

  override disconnectedCallback(): void {
    this.#releaseEditor?.();
    this.#releaseEditor = undefined;
    this.#registeredEditor = null;
    this.#session = undefined;
    this.#overlay = undefined;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#state.initialize();
    // A new format or alpha policy re-serializes the color it holds.
    if (this.hasUpdated && (changed.has('format') || changed.has('alpha'))) {
      if (this.controlled) this.#state.sync();
      else {
        const next = this.#normalize(this.value);
        if (next !== this.value) this.#state.reconcile(next);
      }
    }
    if (this.#overlay !== undefined && this.#overlay === this.value) this.#overlay = undefined;
    if (!this.#editing) this.#text = this.#shown();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    // The picker owns the native color while a session runs.
    if (!this.#session) this.#syncNative();
    this.toggleAttribute('data-filled', this.value !== '');
    this.#syncForm();
    void this.#registerEditor();
  }

  #syncForm(): void {
    this.setFormValue(this.value || null, this.value);
    this.setRequiredValidity(
      this.required && !this.value,
      'Please choose a color.',
      this.#control ?? undefined,
    );
  }

  protected override resetFormValue(): void {
    this.#state.reset();
  }

  override formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state !== 'string' || this.controlled) return;
    this.#state.set(this.#normalize(state), 'programmatic', undefined, { cancelable: false });
  }

  protected override focusTarget(): HTMLElement | null {
    if (this.effectiveDisabled) return null;
    return this.#control ?? this.#valueEditor?.inputElement ?? null;
  }

  protected override associationTarget(): HTMLElement | null {
    return this.#control ?? this.#valueEditor?.inputElement ?? null;
  }

  /** An inline input shows its Field's label inside its row. */
  override get rendersFieldLabel(): boolean {
    return this.variant === 'inline';
  }

  // ---- model ---------------------------------------------------------------------------------

  get #format(): ColorFormat {
    return isColorFormat(this.format) ? this.format : 'hex';
  }

  #normalize(text: string): string {
    return normalizeColorText(text, this.#format, this.alpha);
  }

  #serialize(value: ColorValue): string {
    return serializeColor(this.alpha ? value : color(value.space, value.coords, 1), this.#format);
  }

  /** The color shown: an accepted proposal the owner has not written back yet, or the value. */
  #shown(): string {
    return this.#overlay ?? this.value;
  }

  /** Whether the browser's picker edits alpha itself (an `alpha` color input). */
  #nativeAlpha(): boolean {
    const Input = this.ownerDocument.defaultView?.HTMLInputElement;
    return this.alpha && !!Input && 'alpha' in Input.prototype;
  }

  #syncNative(): void {
    const control = this.#control;
    if (
      !(control instanceof (this.ownerDocument.defaultView?.HTMLInputElement ?? HTMLInputElement))
    )
      return;
    const parsed = parseColor(this.#shown());
    // The native input holds an sRGB color: opaque unless the picker edits alpha.
    const native = parsed
      ? serializeColor(this.#nativeAlpha() ? parsed : color(parsed.space, parsed.coords, 1), 'hex')
      : '#000000';
    if (control.value !== native) control.value = native;
  }

  #emitCommit(value: string, previous: string, reason: ChangeReason, source?: Event): void {
    if (value === previous) return;
    const event = new TpValueCommitEvent(value, previous, reason, source);
    this.onValueCommitted?.(event);
    this.dispatchEvent(event);
  }

  #name(): string {
    return this.label || this.fieldLabel;
  }

  // ---- the browser's picker -------------------------------------------------------------------

  readonly #nativeInput = (event: Event): void => {
    const control = event.currentTarget as HTMLInputElement;
    if (this.effectiveDisabled || this.readOnly) {
      this.#syncNative();
      return;
    }
    const picked = parseColor(control.value);
    if (!picked) return;
    const session = (this.#session ??= { start: this.value, last: undefined });
    const current = parseColor(this.#shown());
    // A picker without alpha reports opaque colors; the current alpha stays.
    const next =
      this.alpha && current && !this.#nativeAlpha()
        ? color(picked.space, picked.coords, current.alpha)
        : picked;
    const text = this.#serialize(next);
    if (text === this.#shown()) return;
    const accepted = this.#state.set(text, 'input', event);
    if (!accepted) {
      // A rejected proposal returns the picker to the current color.
      this.#overlay = undefined;
      this.#syncNative();
    } else {
      session.last = text;
      this.#overlay = this.value === text ? undefined : text;
    }
    this.requestUpdate();
  };

  readonly #nativeChange = (event: Event): void => {
    if (!this.#session) this.#nativeInput(event);
    const session = this.#session;
    this.#session = undefined;
    this.#overlay = undefined;
    if (session?.last !== undefined) this.#emitCommit(session.last, session.start, 'input', event);
    this.#syncNative();
    this.requestUpdate();
  };

  /** Read-only keeps the swatch focusable and named but never opens the picker. */
  readonly #guard = (event: Event): void => {
    if (!this.readOnly) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes((event as KeyboardEvent).key)) return;
    event.preventDefault();
  };

  // ---- the value text ----------------------------------------------------------------------------

  readonly #textInput = (event: TpValueChangeEvent<string>): void => {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    // The editor is controlled; accept the typed text so editing continues.
    this.#text = event.detail.value;
    this.#editing = true;
    (event.currentTarget as TpInput).value = event.detail.value;
    this.requestUpdate();
    if (event.detail.reason === 'input-paste') this.#commitText('input-paste', event);
  };

  readonly #textKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.#commitText('keyboard', event);
    } else if (event.key === 'Escape' && this.#editing) {
      event.preventDefault();
      this.#editing = false;
      this.#showValueText();
    }
  };

  readonly #textBlur = (event: FocusEvent): void => {
    if (this.#editing) this.#commitText('input-blur', event);
  };

  #commitText(reason: ChangeReason, sourceEvent: Event): void {
    this.#editing = false;
    if (this.effectiveDisabled || this.readOnly) {
      this.#showValueText();
      return;
    }
    // Text in any notation is serialized in the format; text that is no color reverts.
    const next = this.#normalize(this.#text);
    if (next) this.setValue(next, reason, sourceEvent);
    this.#showValueText();
  }

  /** Shows the color as text again; the editor holds typed text its binding has not seen. */
  #showValueText(): void {
    this.#text = this.#shown();
    if (this.#valueEditor) this.#valueEditor.value = this.#text;
    this.requestUpdate();
  }

  /** The value editor's native input joins the row like an editor in an Input group. */
  async #registerEditor(): Promise<void> {
    const editor = this.#valueEditor;
    if (editor) await editor.updateComplete;
    const native = (this.#valueEditor === editor && editor?.inputElement) || null;
    if (native === this.#registeredEditor) return;
    this.#releaseEditor?.();
    this.#registeredEditor = native;
    this.#releaseEditor = native
      ? this.presentationController.registerPart('color-input-value', native)
      : undefined;
  }

  // ---- rendering --------------------------------------------------------------------------------

  #stateObject(): ColorInputState {
    return Object.freeze({
      value: this.value,
      format: this.#format,
      alpha: this.alpha,
      picker: this.picker === 'none' ? 'none' : 'native',
      variant: this.variant === 'inline' ? 'inline' : 'default',
      size: this.size === 'sm' ? 'sm' : 'default',
      disabled: this.effectiveDisabled,
      readOnly: this.readOnly,
      required: this.required,
      invalid: this.effectiveInvalid,
      filled: this.value !== '',
    });
  }

  #markers(state: ColorInputState): Record<string, unknown> {
    return stateMarkers(
      state,
      ['disabled', 'readOnly', 'required', 'invalid', 'filled'],
      ['variant', 'size', 'picker'],
    );
  }

  #renderSwatch(state: ColorInputState, markers: Record<string, unknown>): unknown {
    const parsed = parseColor(this.#shown());
    const name = this.#name();
    const common = {
      ...markers,
      class: 'swatch-control',
      '.disabled': state.disabled,
      'aria-label': name || nothing,
      'aria-invalid': state.invalid ? 'true' : nothing,
      '@click': this.#guard,
      '@keydown': this.#guard,
    };
    const control =
      state.picker === 'none'
        ? this.renderPart('color-input-control', state, {
            tag: 'button',
            reference: this.#controlReference,
            properties: { ...common, type: 'button' },
          })
        : this.renderPart('color-input-control', state, {
            tag: 'input',
            reference: this.#controlReference,
            properties: {
              ...common,
              type: 'color',
              alpha: this.#nativeAlpha() ? '' : nothing,
              '@input': this.#nativeInput,
              '@change': this.#nativeChange,
            },
          });
    const chip = this.renderPart('color-input-chip', state, {
      tag: 'span',
      properties: {
        ...markers,
        class: 'chip',
        'aria-hidden': 'true',
        style: { '--_tp-color-input-paint': parsed ? flatGradient(parsed) : 'none' },
      },
    });
    return this.renderPart('color-input-swatch', state, {
      tag: 'span',
      properties: { ...markers, class: 'swatch' },
      content: html`${chip}${control}`,
    });
  }

  #renderRow(
    state: ColorInputState,
    markers: Record<string, unknown>,
    swatch: unknown,
    showValue: boolean,
  ): unknown {
    const label = this.fieldLabel || this.label;
    const name = this.#name();
    const format = this.#format.toUpperCase();
    const editor = showValue
      ? html`<tp-input
          class="value"
          part="color-input-value"
          mono
          style=${`--_tp-color-input-chars: ${Math.max(this.#text.length, 1)}`}
          ${ref(this.#editorReference)}
          label=${name ? `${name} ${format}` : format}
          .value=${this.#text}
          .hostProperties=${{ spellcheck: 'false', autocomplete: 'off' }}
          ?disabled=${state.disabled}
          ?readonly=${state.readOnly}
          @tp-value-change=${this.#textInput}
          @keydown=${this.#textKeyDown}
          @focusout=${this.#textBlur}
          @click=${preventComponentHandling}
        ></tp-input>`
      : nothing;
    return this.renderPart('color-input-row', state, {
      tag: 'div',
      properties: {
        ...markers,
        class: 'row',
        '@click': this.#rowPress,
      },
      content: html`${
          label
            ? this.renderPart('color-input-label', state, {
                tag: 'span',
                // The swatch is named by the Field or by `label`; this copy is visual.
                properties: { ...markers, class: 'label', 'aria-hidden': 'true' },
                content: label,
              })
            : nothing
        }<span class="end">${swatch}${editor}</span>`,
    });
  }

  /**
   * A press on the label or the row activates the swatch, as a press on a label does. The swatch's
   * own click stands for this press, so an owner of the input (a Popover trigger) ignores it.
   */
  readonly #rowPress = (event: MouseEvent): void => {
    const control = this.#control;
    const path = event.composedPath();
    if (
      !control ||
      path.includes(control) ||
      (this.#valueEditor && path.includes(this.#valueEditor))
    )
      return;
    preventComponentHandling(event);
    control.click();
  };

  protected override render(): unknown {
    const state = this.#stateObject();
    const markers = this.#markers(state);
    const inline = state.variant === 'inline';
    const showValue = inline && this.showValue;
    const showSwatch = !inline || this.showSwatch || !showValue;
    if (!showSwatch) this.#control = null;
    if (!showValue) this.#valueEditor = null;
    const swatch = showSwatch ? this.#renderSwatch(state, markers) : nothing;
    return this.renderPart('color-input', state, {
      tag: 'div',
      properties: { ...markers, class: 'root' },
      content: inline ? this.#renderRow(state, markers, swatch, showValue) : swatch,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-color-input': TpColorInput;
  }
}
