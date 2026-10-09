import type { TpInput } from '../../components/input/input.js';
import type { TpButton } from '../../components/button/button.js';
import { bindTextEditingModel, type TextEditingModel } from '../text-editing.js';
import { NumberFieldState, type NumberFieldStateOptions } from './state.js';
import { OwnedAttributes } from '../owned-attributes.js';
import { compositeControl } from '../composite-control.js';
import { PressAndHold } from '../press-and-hold.js';
import { CleanupScope } from '../services.js';
import { composedContains, composedElements, deepActiveElement } from '../focus.js';
import { componentHandlingPrevented, type ElementReference } from '../part.js';
import { createId } from '../id.js';
import type { ChangeReason } from '../types.js';
import {
  NumberFieldScrub,
  type NumberFieldScrubOptions,
  type NumberFieldCursorOptions,
} from './scrub.js';

export interface NumberFieldOptions extends NumberFieldStateOptions {
  name?: string;
  formOwner?: string | HTMLFormElement | null;
  allowWheelScrub?: boolean;
  identifier?: string;
  inputElement?: ElementReference;
  roleDescription?: string;
}
export interface NumberFieldRegistration {
  dispose(): void;
}
export interface NumberFieldScrubRegistration extends NumberFieldRegistration {
  update(options: Partial<NumberFieldScrubOptions>): void;
  registerCursor(element: HTMLElement, options?: NumberFieldCursorOptions): NumberFieldRegistration;
}
type Action = {
  element: TpButton;
  direction: 1 | -1;
  hold: PressAndHold;
  attributes: OwnedAttributes;
};
const roots = new WeakMap<HTMLElement, NumberFieldController>();

/** Foundation numeric semantics composed with the existing Input, Field and Button owners. */
export class NumberFieldController {
  readonly #state: NumberFieldState;
  readonly #scope = new CleanupScope();
  readonly #attributes: OwnedAttributes;
  readonly #parts = new Map<HTMLElement, OwnedAttributes>();
  readonly #actions = new Map<1 | -1, Action>();
  readonly #releaseEditor: () => void;
  readonly #propertyRestores: Array<() => void> = [];
  #options: NumberFieldOptions;
  #disposed = false;
  #inputTarget: HTMLInputElement | null = null;
  #wheelScope: CleanupScope | undefined;
  #hovered = false;
  #scrub: NumberFieldScrub | undefined;
  readonly #observer: MutationObserver;
  readonly #identifier = createId('tp-number');

  constructor(
    readonly root: HTMLElement,
    readonly input: TpInput,
    options: NumberFieldOptions = {},
  ) {
    if (roots.has(root)) throw new Error('NumberField Root already has an owner.');
    if (input.localName !== 'tp-input' || !composedContains(root, input))
      throw new Error('NumberField requires an actual Input inside its Root.');
    if (composedElements(root).filter((element) => element.localName === 'tp-input').length !== 1)
      throw new Error('NumberField Root requires exactly one Input.');
    this.#options = { ...options };
    this.#attributes = new OwnedAttributes(root);
    this.#state = new NumberFieldState(
      {
        host: input,
        onPublish: (value, previousValue, reason) => {
          input.dispatchEvent(
            new CustomEvent('tp-field-value', {
              detail: { value, previousValue, reason },
              bubbles: true,
              composed: true,
            }),
          );
        },
      },
      this.#stateOptions(options),
    );
    // Accessor getters run with the model as their receiver; retain the controller explicitly.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const owner = this;
    const model: TextEditingModel = {
      get text() {
        return owner.#state.text;
      },
      get fieldValue() {
        return owner.value;
      },
      get controlled() {
        return owner.#state.controlled;
      },
      get disabled() {
        return !!owner.#options.disabled;
      },
      get readOnly() {
        return !!owner.#options.readOnly;
      },
      get required() {
        return !!owner.#options.required;
      },
      get formValue() {
        return owner.value === null ? '' : String(owner.value);
      },
      get validity() {
        return owner.#state.validity;
      },
      get validationMessage() {
        return owner.#validationMessage();
      },
      get properties() {
        return {
          '.type': 'text',
          inputmode: 'decimal',
          role: 'spinbutton',
          id: owner.#options.identifier ?? owner.#identifier,
          'aria-roledescription': owner.#options.roleDescription ?? 'Number field',
          'aria-valuenow': owner.value,
          'aria-valuemin': owner.#options.minimum ?? null,
          'aria-valuemax': owner.#options.maximum ?? null,
          'aria-valuetext': owner.#state.formattedValue,
        };
      },
      input: (text, reason, event) => {
        owner.#syncContext();
        return owner.#state.input(text, reason, event);
      },
      blur: (event) => {
        owner.#syncContext();
        owner.#state.blur(event);
      },
      keyDown: (event) => {
        owner.#syncContext();
        owner.#state.keyDown(event);
      },
      reset: () => owner.#state.reset(),
      restore: (text) => owner.#state.setValue(text === '' ? null : Number(text)),
      updated: () => owner.#refresh(),
      disconnected: () => owner.#disconnect(),
    };
    this.#releaseEditor = bindTextEditingModel(input, model);
    this.#observer = new root.ownerDocument.defaultView!.MutationObserver(this.#refresh);
    this.#observer.observe(root, { childList: true, subtree: true });
    roots.set(root, this);
    this.#applyProperties(options);
    this.#scope.listen(input, 'focusin', () => this.#refresh());
    this.#scope.listen(input, 'focusout', () => this.#refresh());
    this.#refresh();
  }
  get value(): number | null {
    return this.#state.value;
  }
  get text(): string {
    return this.#state.text;
  }
  get disabled(): boolean {
    return this.input.inheritedDisabled || !!this.#options.disabled;
  }
  get readOnly(): boolean {
    return this.input.readOnly || !!this.#options.readOnly;
  }
  update(options: Partial<NumberFieldOptions>): void {
    if (this.#disposed) return;
    const next = { ...this.#options, ...options };
    const context = this.#stateOptions(next);
    this.#state.update({
      ...options,
      locale: context.locale!,
      disabled: context.disabled!,
      readOnly: context.readOnly!,
      required: context.required!,
    });
    this.#options = next;
    this.#applyProperties(options);
    this.#refresh();
  }
  setValue(value: number | null): boolean {
    return this.#state.setValue(value);
  }
  registerGroup(element: HTMLElement): NumberFieldRegistration {
    if (this.#disposed) throw new Error('NumberField is disposed.');
    if (this.#parts.size) throw new Error('NumberField supports one Group.');
    if (!composedContains(this.root, element))
      throw new Error('Group must belong to NumberField Root.');
    const attributes = new OwnedAttributes(element);
    attributes.set('role', 'group');
    this.#parts.set(element, attributes);
    this.#refresh();
    return {
      dispose: () => {
        attributes.dispose();
        this.#parts.delete(element);
      },
    };
  }
  registerIncrement(element: TpButton): NumberFieldRegistration {
    return this.#registerAction(element, 1);
  }
  registerDecrement(element: TpButton): NumberFieldRegistration {
    return this.#registerAction(element, -1);
  }
  registerScrubArea(
    element: HTMLElement,
    options: NumberFieldScrubOptions = {},
  ): NumberFieldScrubRegistration {
    if (this.#disposed || this.#scrub) throw new Error('NumberField supports one ScrubArea.');
    if (!composedContains(this.root, element))
      throw new Error('ScrubArea must belong to NumberField Root.');
    const scrub = (this.#scrub = new NumberFieldScrub(
      element,
      {
        state: this.#state,
        disabled: () => this.disabled || this.readOnly || !this.input.isConnected,
        focus: () => this.input.focus({ preventScroll: true }),
        changed: this.#refresh,
      },
      options,
    ));
    return {
      update: (next) => scrub.update(next),
      registerCursor: (cursor, cursorOptions) => ({
        dispose: scrub.registerCursor(cursor, cursorOptions),
      }),
      dispose: () => {
        if (this.#scrub === scrub) {
          scrub.dispose();
          this.#scrub = undefined;
          this.#refresh();
        }
      },
    };
  }
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#observer.disconnect();
    this.#scrub?.dispose();
    this.#scrub = undefined;
    this.#disconnect();
    this.#scope.dispose();
    for (const action of this.#actions.values()) this.#releaseAction(action);
    this.#actions.clear();
    for (const attrs of this.#parts.values()) attrs.dispose();
    this.#parts.clear();
    this.#releaseEditor();
    this.#state.dispose();
    for (const restore of this.#propertyRestores.reverse()) restore();
    this.#attributes.dispose();
    roots.delete(this.root);
  }
  #stateOptions(options: NumberFieldOptions): NumberFieldStateOptions {
    return {
      ...options,
      locale:
        options.locale ??
        (this.root.closest('[lang]')?.getAttribute('lang') ||
          this.root.ownerDocument.documentElement.lang ||
          this.root.ownerDocument.defaultView!.navigator.language),
      disabled: this.input.inheritedDisabled || !!options.disabled,
      readOnly: this.input.readOnly || !!options.readOnly,
      required: this.input.required || !!options.required,
    };
  }
  #syncContext(): void {
    const next = {
      disabled: this.disabled,
      readOnly: this.readOnly,
      required: this.input.required || !!this.#options.required,
    };
    if (
      Object.entries(next).some(
        ([key, value]) => this.#state.options[key as keyof typeof next] !== value,
      )
    )
      this.#state.update(next);
  }
  #applyProperties(options: Partial<NumberFieldOptions>): void {
    for (const [source, key] of [
      ['name', 'name'],
      ['formOwner', 'formOwner'],
      ['inputElement', 'inputElementReference'],
    ] as const) {
      if (!(source in options)) continue;
      const previous = this.input[key];
      const next = options[source];
      (this.input as unknown as Record<string, unknown>)[key] = next;
      this.#propertyRestores.push(() => {
        if (this.input[key] === next)
          (this.input as unknown as Record<string, unknown>)[key] = previous;
      });
    }
  }
  #validationMessage(): string {
    const flags = this.#state.validity;
    if (flags.badInput) return 'Enter a number.';
    if (flags.valueMissing) return 'Enter a value.';
    if (flags.rangeUnderflow) return `Value must be at least ${this.#options.minimum}.`;
    if (flags.rangeOverflow) return `Value must be at most ${this.#options.maximum}.`;
    if (flags.stepMismatch) return 'Enter a value that matches the step.';
    return '';
  }
  #refresh = (): void => {
    if (this.#disposed) return;
    this.#syncContext();
    const focused = composedContains(this.input, deepActiveElement(this.root.ownerDocument));
    const markers = {
      disabled: this.disabled,
      readonly: this.readOnly,
      required: this.input.required || !!this.#options.required,
      invalid: Object.values(this.#state.validity).some(Boolean),
      valid: !Object.values(this.#state.validity).some(Boolean),
      filled: this.value !== null,
      dirty: this.#state.dirty,
      touched: this.#state.touched,
      focused,
      scrubbing: !!this.#scrub?.active,
    };
    for (const attributes of [this.#attributes, ...this.#parts.values()])
      for (const [key, value] of Object.entries(markers))
        attributes.set(`data-${key}`, value ? '' : null);
    for (const action of this.#actions.values()) {
      if (!action.element.isConnected || !composedContains(this.root, action.element)) {
        action.hold.cancel();
        compositeControl(action.element)?.release(this);
        continue;
      }
      const disabled = this.#actionDisabled(action.direction) || !action.element.isConnected;
      compositeControl(action.element)?.apply(
        this,
        { disabled, focusableWhenDisabled: true, tabIndex: -1 },
        this.#refresh,
      );
      action.attributes.set('data-readonly', this.readOnly ? '' : null);
      if (this.disabled || this.readOnly || !action.element.isConnected) action.hold.cancel();
    }
    if (this.#scrub && (this.disabled || this.readOnly || !this.#scrub.element.isConnected))
      this.#scrub.cancel();
    const target = this.input.inputElement as HTMLInputElement | null;
    if (target !== this.#inputTarget || (!this.#wheelScope && this.input.isConnected)) {
      this.#wheelScope?.dispose();
      this.#inputTarget = target;
      this.#hovered = false;
      if (target && this.input.isConnected) {
        const scope = (this.#wheelScope = new CleanupScope());
        scope.listen(target, 'pointerenter', () => {
          this.#hovered = true;
        });
        scope.listen(target, 'pointerleave', () => {
          this.#hovered = false;
        });
        scope.listen(target, 'wheel', this.#wheel, { passive: false });
      }
    }
  };
  #wheel = (event: WheelEvent): void => {
    if (
      !this.#options.allowWheelScrub ||
      !this.#hovered ||
      this.disabled ||
      this.readOnly ||
      event.ctrlKey ||
      event.metaKey ||
      event.deltaY === 0 ||
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
      event.defaultPrevented ||
      componentHandlingPrevented(event) ||
      deepActiveElement(this.root.ownerDocument) !== this.#inputTarget
    )
      return;
    event.preventDefault();
    if (this.#state.step(event.deltaY < 0 ? 1 : -1, 'wheel', event))
      this.#state.commit('wheel', event);
  };
  #actionDisabled(direction: 1 | -1): boolean {
    return (
      !this.root.isConnected ||
      this.disabled ||
      this.readOnly ||
      (this.value !== null &&
        (direction > 0
          ? this.value >= (this.#options.maximum ?? Number.MAX_SAFE_INTEGER)
          : this.value <= (this.#options.minimum ?? Number.MIN_SAFE_INTEGER)))
    );
  }
  #registerAction(element: TpButton, direction: 1 | -1): NumberFieldRegistration {
    if (this.#disposed || this.#actions.has(direction))
      throw new Error('NumberField action already registered or disposed.');
    if (
      element.localName !== 'tp-button' ||
      !composedContains(this.root, element) ||
      !compositeControl(element)
    )
      throw new Error('NumberField actions must be actual Buttons inside Root.');
    const reason: ChangeReason = direction > 0 ? 'increment' : 'decrement';
    const attributes = new OwnedAttributes(element);
    let changedDuringHold = false;
    if (!element.hasAttribute('aria-label'))
      attributes.set('aria-label', direction > 0 ? 'Increase' : 'Decrease');
    const hold = new PressAndHold(element, {
      start: () => {
        changedDuringHold = false;
      },
      disabled: () =>
        this.#actionDisabled(direction) ||
        element.disabled ||
        !composedContains(this.root, element),
      tick: (event) => {
        const changed = this.#state.step(direction, reason, event);
        changedDuringHold ||= changed;
        return changed;
      },
      release: (event) => {
        if (changedDuringHold) this.#state.commit(reason, event);
      },
      focus: () => this.input.focus({ preventScroll: true }),
    });
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        componentHandlingPrevented(event) ||
        hold.shouldSkipClick(event) ||
        this.#actionDisabled(direction) ||
        !composedContains(this.root, element) ||
        element.disabled
      )
        return;
      if (this.#state.step(direction, reason, event)) this.#state.commit(reason, event);
    };
    const releaseClick = this.#scope.listen(element, 'click', click);
    const action = { element, direction, attributes, hold };
    this.#actions.set(direction, action);
    this.#refresh();
    return {
      dispose: () => {
        if (this.#actions.get(direction) !== action) return;
        releaseClick();
        this.#releaseAction(action);
        this.#actions.delete(direction);
      },
    };
  }
  #releaseAction(action: Action): void {
    action.hold.dispose();
    action.attributes.dispose();
    compositeControl(action.element)?.release(this);
  }
  #disconnect(): void {
    this.#scrub?.cancel();
    this.#wheelScope?.dispose();
    this.#wheelScope = undefined;
    this.#hovered = false;
    for (const action of this.#actions.values()) action.hold.cancel();
  }
}
