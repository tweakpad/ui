import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import type { MenuItemOwner } from './menu-item.js';

export interface MenuRadioMember extends HTMLElement {
  value: unknown;
  requestUpdate(): void;
}
export class TpMenuRadioGroup extends TpElement {
  static tagName = 'tp-menu-radio-group';
  static override properties = {
    ...TpElement.properties,
    value: { attribute: false, noAccessor: true },
    defaultValue: { attribute: 'default-value' },
    onValueChange: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: contents;
      }
    `,
  ];
  defaultValue: unknown;
  onValueChange: ((event: TpValueChangeEvent<unknown>) => void) | undefined;
  #provided: unknown;
  #owner: MenuItemOwner | null = null;
  #control: HTMLElement | null = null;
  #reference = (element: HTMLElement | null): void => {
    if (element === this.#control) return;
    this.#control = element;
    this.#owner?.itemChanged();
  };
  get controlElement(): HTMLElement | null {
    return this.#control;
  }
  get menuOwner(): MenuItemOwner | null {
    return this.#owner;
  }
  set menuOwner(owner: MenuItemOwner | null) {
    if (this.#owner === owner) return;
    this.#owner = owner;
    this.requestUpdate();
  }
  get presentationTagName(): string {
    return `tp-${this.#owner?.itemPartPrefix ?? 'menu'}`;
  }
  get presentationOwner(): HTMLElement | null {
    return this.#owner;
  }
  get presentationFamilyTagNames(): readonly string[] {
    return this.#owner?.presentationFamilyTagNames ?? [];
  }
  #members = new Set<MenuRadioMember>();
  #excluded = new Set<MenuRadioMember>();
  #reported = new Set<MenuRadioMember>();
  #state = new ControllableState<unknown>({
    host: this,
    initialValue: undefined,
    readControlledValue: () => this.#provided,
    readDefaultValue: () => this.defaultValue,
    hasDefaultValue: () => this.defaultValue !== undefined,
    onChange: (event) => this.onValueChange?.(event),
    onCommit: () => this.#members.forEach((member) => member.requestUpdate()),
    diagnostic: (message) => this.emit('tp-diagnostic', { code: 'menu-radio-state', message }),
  });
  get value(): unknown {
    return this.#state.value;
  }
  set value(value: unknown) {
    const previous = this.#provided;
    this.#provided = value;
    this.requestUpdate('value', previous);
    if (this.hasUpdated) this.#state.sync();
  }
  register(member: MenuRadioMember): () => void {
    this.#members.add(member);
    this.memberChanged();
    return () => {
      this.#members.delete(member);
      this.#excluded.delete(member);
      this.#reported.delete(member);
      this.memberChanged();
    };
  }
  isSelectable(member: MenuRadioMember): boolean {
    return this.#members.has(member) && !this.#excluded.has(member);
  }
  memberChanged(): void {
    this.#excluded.clear();
    const values: unknown[] = [];
    for (const member of [...this.#members].sort((a, b) =>
      a === b ? 0 : a.compareDocumentPosition(b) & 4 ? -1 : 1,
    )) {
      if (member.value === undefined || values.some((value) => Object.is(value, member.value))) {
        this.#excluded.add(member);
        if (!this.#reported.has(member)) {
          this.#reported.add(member);
          this.emit('tp-diagnostic', {
            code: 'menu-radio-value',
            message:
              'Radio items require a value unique within their nearest RadioGroup; missing and later duplicate values are excluded.',
          });
        }
      } else values.push(member.value);
      member.requestUpdate();
    }
  }
  select(member: MenuRadioMember, event: Event, reason: ChangeReason): boolean {
    if (this.disabled || !this.isSelectable(member)) return false;
    // Activating the selected radio remains an activation; it cannot clear the selection.
    return Object.is(this.value, member.value) || this.#state.set(member.value, reason, event);
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('disabled')) this.#members.forEach((member) => member.requestUpdate());
  }
  protected override render() {
    return this.renderPart(
      `${this.#owner?.itemPartPrefix ?? 'menu'}-radio-group`,
      { value: this.value, disabled: this.disabled },
      {
        reference: this.#reference,
        properties: {
          role: 'group',
          'aria-label': this.getAttribute('aria-label') ?? undefined,
          'aria-disabled': this.disabled ? 'true' : undefined,
        },
        content: html`<slot></slot>`,
      },
    );
  }
}
