import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement, TpFormElement } from '../../foundation/element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import { setPartComposition } from '../../presentation/controller.js';
import { CollectionRegistry } from '../../foundation/collection.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import type { ChangeReason } from '../../foundation/types.js';
import { TpRadioGroupItem, type RadioSelectionOwner } from './radio-group-item.js';

type Member = TpRadioGroupItem | HTMLButtonElement | HTMLInputElement;
const valueOf = (member: Member): unknown => member.value;
export class TpRadioGroup extends TpFormElement<unknown> implements RadioSelectionOwner {
  static tagName = 'tp-radio-group';
  static override properties = {
    ...TpFormElement.properties,
    value: { type: String, noAccessor: true },
    defaultValue: { type: String, attribute: 'default-value' },
    onValueChange: { attribute: false },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      .group {
        display: flex;
        flex-direction: column;
        min-inline-size: 0;
      }

      :host([orientation='horizontal']) .group {
        flex-flow: row wrap;
      }
    `,
  ];
  #provided: unknown;
  defaultValue: unknown;
  onValueChange: ((event: TpValueChangeEvent<unknown>) => void) | undefined;
  label = '';
  override orientation: 'horizontal' | 'vertical' = 'vertical';
  #members: Member[] = [];
  #excluded = new Set<Member>();
  #registry = new CollectionRegistry();
  #observer: MutationObserver | undefined;
  #scheduled = false;
  #diagnostics = new Set<string>();
  #registered = new Map<Member, Array<() => void>>();
  #nativeState = new Map<Member, Map<string, string | null>>();
  #state = new ControllableState<unknown>({
    host: this,
    initialValue: undefined,
    readControlledValue: () => this.#provided,
    readDefaultValue: () => this.defaultValue,
    hasDefaultValue: () => this.defaultValue !== undefined,
    onChange: (event) => this.onValueChange?.(event),
    onCommit: (value, previous, reason) => {
      this.emit('tp-field-value', { value, previousValue: previous, reason });
      this.requestUpdate('value', previous);
      this.#syncMembers();
      this.#syncForm();
    },
    diagnostic: (message) => this.#diagnose('state', message),
  });
  override get value(): unknown {
    return this.#state.value;
  }
  override set value(value: unknown) {
    const previous = this.value;
    this.#provided = value;
    if (this.hasUpdated) this.#state.sync();
    this.requestUpdate('value', previous);
  }
  override get inputElement(): HTMLElement | null {
    const selected = this.#members.find(
      (member) => this.isChecked(member) && !this.isDisabled(member),
    );
    if (!selected) return null;
    return selected instanceof TpRadioGroupItem
      ? selected.inputElement
      : selected instanceof HTMLInputElement
        ? selected
        : null;
  }
  protected override associationTarget(): HTMLElement | null {
    return this.renderRoot.querySelector('.group');
  }
  protected override focusTarget(): HTMLElement | null {
    return this.#members.find((member) => this.tabStop(member) === 0) ?? null;
  }
  isChecked(element: HTMLElement): boolean {
    const member = element as Member;
    return !this.#excluded.has(member) && Object.is(valueOf(member), this.value);
  }
  isDisabled(element: HTMLElement): boolean {
    const member = element as Member;
    return (
      this.effectiveDisabled ||
      this.#excluded.has(member) ||
      (member instanceof TpRadioGroupItem ? member.effectiveDisabled : member.disabled)
    );
  }
  tabStop(member: HTMLElement): number {
    if (this.isDisabled(member)) return -1;
    const enabled = this.#members.filter((item) => !this.isDisabled(item));
    return member === (enabled.find((item) => this.isChecked(item)) ?? enabled[0]) ? 0 : -1;
  }
  requestSelection(element: HTMLElement, event: Event, reason: 'item-press' = 'item-press'): void {
    const member = element as Member;
    if (
      !this.#members.includes(member) ||
      this.isDisabled(member) ||
      this.readOnly ||
      (member instanceof TpRadioGroupItem && member.readOnly)
    )
      return;
    this.#state.set(valueOf(member), reason, event);
    this.#syncMembers();
    this.#syncForm();
  }
  setValue(value: unknown, reason: ChangeReason = 'programmatic', source?: Event): void {
    this.#state.set(value, reason, source);
  }
  protected override render() {
    const state = {
      value: this.value,
      disabled: this.effectiveDisabled,
      readOnly: this.readOnly,
      required: this.required,
      invalid: this.effectiveInvalid,
      orientation: this.orientation,
    };
    return this.renderPart('radio-group', state, {
      tag: 'div',
      properties: {
        class: 'group',
        role: 'radiogroup',
        'aria-label': this.label || this.getAttribute('aria-label') || undefined,
        'aria-required': this.required ? 'true' : undefined,
        'aria-disabled': this.effectiveDisabled ? 'true' : undefined,
        'aria-readonly': this.readOnly ? 'true' : undefined,
        'aria-invalid': this.effectiveInvalid ? 'true' : undefined,
        'aria-orientation': this.orientation,
        'data-orientation': this.orientation,
        '@keydown': this.#key,
        '@click': this.#nativeClick,
      },
      content: html`<slot @slotchange=${this.memberChanged}></slot>`,
    });
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new this.ownerDocument.defaultView!.MutationObserver(this.memberChanged);
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'disabled', 'readonly'],
    });
    this.memberChanged();
  }
  memberChanged = (): void => {
    if (this.#scheduled || !this.isConnected) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      if (this.isConnected) {
        this.#syncMembers();
        this.requestUpdate();
      }
    });
  };
  #syncMembers(): void {
    const members = [
      ...this.querySelectorAll<Member>(
        'tp-radio-group-item,button[value],input[type="radio"][value]',
      ),
    ].filter(
      (member) =>
        member.closest('tp-radio-group') === this &&
        !member.parentElement?.closest('tp-radio-group-item'),
    );
    for (const previous of this.#members) if (!members.includes(previous)) this.#release(previous);
    this.#members = members;
    this.#excluded.clear();
    this.#registry = new CollectionRegistry();
    const values: unknown[] = [];
    for (const member of members) {
      const value = valueOf(member);
      if (
        value === undefined ||
        value === null ||
        values.some((previous) => Object.is(previous, value))
      ) {
        this.#excluded.add(member);
        this.#diagnose(
          'member:' + String(value),
          'Radio items require unique comparable values; missing values and later duplicates are excluded.',
        );
      } else values.push(value);
    }
    for (const member of members) {
      if (member instanceof TpRadioGroupItem) {
        member.radioGroup = this;
        member.requestUpdate();
        setPartComposition(member, this, this.partPresentation);
      } else {
        if (!this.#nativeState.has(member))
          this.#nativeState.set(
            member,
            new Map(
              ['role', 'tabindex', 'aria-checked', 'aria-disabled', 'part', 'type', 'name'].map(
                (name) => [name, member.getAttribute(name)],
              ),
            ),
          );
        member.setAttribute('role', 'radio');
        member.tabIndex = this.tabStop(member);
        member.setAttribute('aria-checked', String(this.isChecked(member)));
        member.setAttribute('aria-disabled', String(this.isDisabled(member)));
        if (member instanceof HTMLButtonElement) member.type = 'button';
        if (member instanceof HTMLInputElement) {
          member.checked = this.isChecked(member);
          member.removeAttribute('name');
        }
        if (!this.#registered.has(member))
          this.#registered.set(member, [
            this.presentationController.registerPart('radio-group-item', member),
          ]);
      }
      this.#registry.register({ element: member, disabled: this.isDisabled(member) });
    }
    this.#syncForm();
  }
  #release(member: Member): void {
    if (member instanceof TpRadioGroupItem) {
      member.radioGroup = null;
      setPartComposition(member, this);
    }
    for (const cleanup of this.#registered.get(member) ?? []) cleanup();
    this.#registered.delete(member);
    for (const [name, value] of this.#nativeState.get(member) ?? []) {
      if (value === null) member.removeAttribute(name);
      else member.setAttribute(name, value);
    }
    this.#nativeState.delete(member);
  }
  #nativeClick = (event: Event): void => {
    const member = event
      .composedPath()
      .find(
        (node): node is Member =>
          node instanceof HTMLElement && this.#members.includes(node as Member),
      );
    if (!member || member instanceof TpRadioGroupItem) return;
    queueMicrotask(() => {
      if (!componentHandlingPrevented(event)) this.requestSelection(member, event);
    });
  };
  #key = (event: KeyboardEvent): void => {
    if (componentHandlingPrevented(event) || event.isComposing || this.effectiveDisabled) return;
    const member = event
      .composedPath()
      .find(
        (node): node is Member =>
          node instanceof HTMLElement && this.#members.includes(node as Member),
      );
    if (!member) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      return;
    }
    const next = this.#registry.handleArrowKey(event, member, this.orientation, this.direction, {
      loop: true,
    });
    if (next) this.requestSelection(next, event, 'item-press');
  };
  #syncForm(): void {
    const selected = this.#members.find(
      (member) => this.isChecked(member) && !this.isDisabled(member),
    );
    const value = selected ? valueOf(selected) : undefined;
    const serialized =
      value === null || value === undefined
        ? null
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);
    this.setFormValue(this.effectiveDisabled ? null : serialized);
    const missing = !this.effectiveDisabled && this.required && !selected;
    this.setValidity(
      missing ? { valueMissing: true } : {},
      missing ? 'Please select an option.' : '',
      this.renderRoot.querySelector<HTMLElement>('.group') ?? undefined,
    );
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncMembers();
  }
  override formStateRestoreCallback(state: string | File | FormData | null): void {
    if (this.#state.controlled || typeof state !== 'string') return;
    const match = this.#members.find((member) => {
      const value = valueOf(member);
      return (typeof value === 'object' ? JSON.stringify(value) : String(value)) === state;
    });
    this.#state.set(match ? valueOf(match) : state, 'programmatic');
  }
  protected resetFormValue(): void {
    this.#state.reset();
    this.#syncMembers();
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    for (const member of this.#members) this.#release(member);
    this.#members = [];
    super.disconnectedCallback();
  }
  #diagnose(code: string, message: string): void {
    if (!this.#diagnostics.has(code)) {
      this.#diagnostics.add(code);
      this.emit('tp-diagnostic', { code: 'radio-group-' + code, message });
    }
  }
}
