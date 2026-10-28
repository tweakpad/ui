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
/**
 * A group of Menu Radio Items that keeps exactly one choice, such as a density or a sort order.
 *
 * @slot - The Menu Radio Items, with an optional first child marked `data-menu-label` that names
 *   the group.
 * @fires tp-value-change - Cancelable proposal of the chosen item's value; `detail.value`.
 */
export class TpMenuRadioGroup extends TpElement {
  static tagName = 'tp-menu-radio-group';
  static override properties = {
    ...TpElement.properties,
    value: { attribute: false, noAccessor: true },
    defaultValue: { attribute: 'default-value' },
    label: { type: String },
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
  /** Initial choice when `value` is not set. */
  defaultValue: unknown;
  /**
   * The group's accessible name. Without it, a child carrying `data-menu-label` names the group.
   * The name goes to the semantic group, so the host carries no ARIA of its own.
   */
  label = '';
  /** Called with each choice proposal before `tp-value-change` is dispatched. */
  onValueChange: ((event: TpValueChangeEvent<unknown>) => void) | undefined;
  #provided: unknown;
  #owner: MenuItemOwner | null = null;
  #control: HTMLElement | null = null;
  #reference = (element: HTMLElement | null): void => {
    if (element === this.#control) return;
    this.#control = element;
    this.#owner?.itemChanged();
  };
  /** @internal The rendered group element. */
  get controlElement(): HTMLElement | null {
    return this.#control;
  }
  /** @internal The owning menu. */
  get menuOwner(): MenuItemOwner | null {
    return this.#owner;
  }
  /** @internal The owning menu. */
  set menuOwner(owner: MenuItemOwner | null) {
    if (this.#owner === owner) return;
    this.#owner = owner;
    this.requestUpdate();
  }
  /** @internal Presentation family of the group. */
  get presentationTagName(): string {
    return `tp-${this.#owner?.itemPartPrefix ?? 'menu'}`;
  }
  /** @internal Presentation owner of the group. */
  get presentationOwner(): HTMLElement | null {
    return this.#owner;
  }
  /** @internal Presentation families the group takes part in. */
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
    diagnostic: (message) => this.diagnose('menu-radio-state', message),
  });
  /** The value of the chosen item; set it from the start to own the choice, writing back each accepted proposal. */
  get value(): unknown {
    return this.#state.value;
  }
  set value(value: unknown) {
    const previous = this.#provided;
    this.#provided = value;
    this.requestUpdate('value', previous);
    if (this.hasUpdated) this.#state.sync();
  }
  /** @internal Adds a radio item. */
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
  /** @internal Whether an item has a unique value. */
  isSelectable(member: MenuRadioMember): boolean {
    return this.#members.has(member) && !this.#excluded.has(member);
  }
  /** @internal Rereads the items' values. */
  memberChanged(): void {
    const excluded = new Set(this.#excluded);
    this.#excluded.clear();
    const values: unknown[] = [];
    for (const member of [...this.#members].sort((a, b) =>
      a === b ? 0 : a.compareDocumentPosition(b) & 4 ? -1 : 1,
    )) {
      if (member.value === undefined || values.some((value) => Object.is(value, member.value))) {
        this.#excluded.add(member);
        if (!this.#reported.has(member)) {
          this.#reported.add(member);
          this.diagnose(
            'menu-radio-value',
            'Radio items require a value unique within their nearest RadioGroup; missing and later duplicate values are excluded.',
          );
        }
      } else values.push(member.value);
      // Only a member whose selectability flipped renders differently.
      if (excluded.has(member) !== this.#excluded.has(member)) member.requestUpdate();
    }
  }
  /** @internal Chooses an item. */
  select(member: MenuRadioMember, event: Event, reason: ChangeReason): boolean {
    if (this.disabled || !this.isSelectable(member)) return false;
    // Activating the selected radio remains an activation; it cannot clear the selection.
    return Object.is(this.value, member.value) || this.#state.set(member.value, reason, event);
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('disabled')) this.#members.forEach((member) => member.requestUpdate());
    this.#syncLabel();
  }
  /** Names the semantic group by its `data-menu-label` child while `label` is empty. */
  readonly #syncLabel = (): void => {
    const control = this.#control;
    if (!control) return;
    const label = menuGroupLabel(this.label, this.children);
    if ((control.ariaLabelledByElements?.[0] ?? null) !== label)
      control.ariaLabelledByElements = label ? [label] : null;
  };
  protected override render() {
    return this.renderPart(
      `${this.#owner?.itemPartPrefix ?? 'menu'}-radio-group`,
      { value: this.value, disabled: this.disabled },
      {
        reference: this.#reference,
        properties: {
          role: 'group',
          'aria-label': this.label || undefined,
          'aria-disabled': this.disabled ? 'true' : undefined,
        },
        content: html`<slot @slotchange=${this.#syncLabel}></slot>`,
      },
    );
  }
}

/**
 * The label element that names a group without its own `label`: the first child carrying
 * `data-menu-label`, or `null` while `label` is set or no such child exists.
 */
export function menuGroupLabel(
  label: string,
  children: ArrayLike<Element> & Iterable<Element>,
): HTMLElement | null {
  if (label) return null;
  for (const child of children)
    if (child.hasAttribute('data-menu-label')) return child as HTMLElement;
  return null;
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-menu-radio-group': TpMenuRadioGroup;
  }
}
