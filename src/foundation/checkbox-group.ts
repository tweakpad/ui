import type { ReactiveControllerHost } from 'lit';
import { ControllableState, orderedValuesEqual } from './controllable-state.js';
import { TpValueChangeEvent } from './events.js';
import type { ChangeReason } from './types.js';

export interface CheckboxGroupMember extends HTMLElement {
  value: string;
  parent: boolean;
  effectiveDisabled: boolean;
  readOnly: boolean;
  checkboxGroup: CheckboxGroupController | null;
  controlElement: HTMLElement | null;
  requestUpdate(): void;
  onCheckedChange?: ((event: TpValueChangeEvent<boolean>) => void) | undefined;
}
export interface CheckboxGroupOptions {
  value?: readonly string[] | undefined;
  defaultValue?: readonly string[] | undefined;
  allValues?: readonly string[] | undefined;
  disabled?: boolean;
  onValueChange?: ((event: TpValueChangeEvent<readonly string[]>) => void) | undefined;
}
const owners = new WeakMap<HTMLElement, CheckboxGroupController>();
export function nearestCheckboxGroup(member: Element): CheckboxGroupController | null {
  for (let node = member.parentElement; node; node = node.parentElement) {
    const owner = owners.get(node);
    if (owner) return owner;
  }
  return null;
}
const unique = (values: readonly string[]): string[] => [
  ...new Set(values.filter((value) => typeof value === 'string')),
];

/** Preserve disabled selections and retained values outside the logical parent universe. */
export function checkboxParentSelection(
  current: readonly string[],
  allValues: readonly string[],
  disabled: ReadonlySet<string>,
  checked: boolean,
): string[] {
  const selected = new Set(current);
  for (const value of allValues)
    if (!disabled.has(value)) {
      if (checked) selected.add(value);
      else selected.delete(value);
    }
  return [
    ...current.filter((value) => selected.has(value)),
    ...allValues.filter((value) => selected.has(value) && !current.includes(value)),
  ];
}

/** Foundation behavior binding for an authored native grouping host; no new visual component. */
export class CheckboxGroupController {
  readonly host: HTMLElement;
  #options: CheckboxGroupOptions;
  #state: ControllableState<readonly string[]>;
  #members: CheckboxGroupMember[] = [];
  #excluded = new Set<CheckboxGroupMember>();
  #observer: MutationObserver;
  #scheduled = false;
  #disposed = false;
  #originalRole: string | null;
  #originalDisabled: string | null;
  #diagnostics = new Set<string>();
  constructor(host: HTMLElement, options: CheckboxGroupOptions = {}) {
    if (owners.has(host)) throw new Error('This host already has a CheckboxGroupController.');
    this.host = host;
    this.#originalRole = host.getAttribute('role');
    this.#originalDisabled = host.getAttribute('aria-disabled');
    this.#options = { ...options };
    const adapter = {
      addController: () => {},
      removeController: () => {},
      requestUpdate: () => this.refresh(),
      updateComplete: Promise.resolve(true),
      dispatchEvent: (event: Event) => host.dispatchEvent(event),
      addEventListener: host.addEventListener.bind(host),
      removeEventListener: host.removeEventListener.bind(host),
    } as ReactiveControllerHost & EventTarget;
    this.#state = new ControllableState({
      host: adapter,
      initialValue: [],
      readControlledValue: () => this.#options.value,
      readDefaultValue: () => this.#options.defaultValue,
      hasDefaultValue: () => this.#options.defaultValue !== undefined,
      equals: orderedValuesEqual,
      onChange: (event) => this.#options.onValueChange?.(event),
      diagnostic: (message) => this.#diagnose('state', message),
    });
    owners.set(host, this);
    if (!host.hasAttribute('role') && host.localName !== 'fieldset')
      host.setAttribute('role', 'group');
    this.#observer = new host.ownerDocument.defaultView!.MutationObserver(() => this.refresh());
    this.#observer.observe(host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'disabled', 'parent', 'id'],
    });
    host.ownerDocument.addEventListener('reset', this.#reset, true);
    this.#state.initialize();
    this.refresh();
  }
  get value(): readonly string[] {
    return this.#state.value;
  }
  set value(value: readonly string[] | undefined) {
    this.#options.value = value === undefined ? undefined : unique(value);
    this.#state.sync();
    this.refresh();
  }
  get defaultValue(): readonly string[] | undefined {
    return this.#options.defaultValue;
  }
  set defaultValue(value: readonly string[] | undefined) {
    this.#options.defaultValue = value;
  }
  get allValues(): readonly string[] {
    return (
      this.#options.allValues ??
      this.#members
        .filter((member) => !member.parent && !this.#excluded.has(member))
        .map((member) => member.value)
    );
  }
  get hasParentAggregation(): boolean {
    return this.#options.allValues !== undefined;
  }
  set allValues(value: readonly string[] | undefined) {
    this.#options.allValues = value === undefined ? undefined : unique(value);
    this.refresh();
  }
  get disabled(): boolean {
    return this.#options.disabled ?? false;
  }
  set disabled(value: boolean) {
    this.#options.disabled = value;
    this.refresh();
  }
  get onValueChange(): CheckboxGroupOptions['onValueChange'] {
    return this.#options.onValueChange;
  }
  set onValueChange(value: CheckboxGroupOptions['onValueChange']) {
    this.#options.onValueChange = value;
  }
  isDisabled(member: CheckboxGroupMember): boolean {
    return this.disabled || this.#excluded.has(member);
  }
  isChecked(member: CheckboxGroupMember): boolean {
    if (!member.parent) return !this.#excluded.has(member) && this.value.includes(member.value);
    const all = this.hasParentAggregation ? this.allValues : undefined;
    return !!all?.length && all.every((value) => this.value.includes(value));
  }
  isIndeterminate(member: CheckboxGroupMember): boolean {
    const all = this.hasParentAggregation ? this.allValues : undefined;
    return (
      member.parent && !!all?.some((value) => this.value.includes(value)) && !this.isChecked(member)
    );
  }
  controlledElements(): HTMLElement[] {
    return this.#members.filter(
      (member) =>
        !member.parent && !this.#excluded.has(member) && this.allValues.includes(member.value),
    );
  }

  request(member: CheckboxGroupMember, checked: boolean, source?: Event): void {
    if (
      !this.#members.includes(member) ||
      this.isDisabled(member) ||
      member.effectiveDisabled ||
      member.readOnly
    )
      return;
    const proposal = new TpValueChangeEvent(
      checked,
      this.isChecked(member),
      'trigger-press',
      source,
    );
    member.onCheckedChange?.(proposal);
    if (proposal.defaultPrevented || proposal.detail.cancelled) return;
    let next: readonly string[];
    if (member.parent) {
      if (!this.hasParentAggregation) {
        this.#diagnose(
          'parent-values',
          'A parent Checkbox requires explicit allValues on its CheckboxGroupController.',
        );
        return;
      }
      const disabled = new Set(
        this.#members
          .filter((item) => !item.parent && (item.effectiveDisabled || item.readOnly))
          .map((item) => item.value),
      );
      next = checkboxParentSelection(this.value, this.allValues, disabled, checked);
    } else
      next = checked
        ? unique([...this.value, member.value])
        : this.value.filter((value) => value !== member.value);
    this.#state.set(next, 'trigger-press', source);
    this.refresh();
  }
  setValue(value: readonly string[], reason: ChangeReason = 'programmatic', source?: Event): void {
    this.#state.set(unique(value), reason, source);
  }
  reset(source?: Event): void {
    this.#state.reset(source);
    this.refresh();
  }
  #reset = (event: Event): void => {
    if (!(event.target instanceof this.host.ownerDocument.defaultView!.HTMLFormElement)) return;
    const form = event.target;
    if (
      this.#members.some(
        (member) =>
          (member as CheckboxGroupMember & { form?: HTMLFormElement | null }).form === form,
      )
    )
      queueMicrotask(() => {
        if (!event.defaultPrevented) this.reset(event);
      });
  };
  refresh(): void {
    if (this.#scheduled || this.#disposed) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      if (this.#disposed) return;
      const members = [...this.host.querySelectorAll<CheckboxGroupMember>('tp-checkbox')].filter(
        (member) => nearestCheckboxGroup(member) === this,
      );
      for (const member of this.#members)
        if (!members.includes(member) && member.checkboxGroup === this) member.checkboxGroup = null;
      this.host.setAttribute('aria-disabled', String(this.disabled));
      this.#members = members;
      this.#excluded.clear();
      const values = new Set<string>();
      for (const member of members) {
        if (!member.parent && values.has(member.value)) {
          this.#excluded.add(member);
          this.#diagnose(
            'duplicate:' + member.value,
            'Later duplicate Checkbox values are excluded from group participation.',
          );
        }
        if (!member.parent) values.add(member.value);
        member.checkboxGroup = this;
        member.requestUpdate();
      }
    });
  }
  disconnect(): void {
    this.#disposed = true;
    this.#observer.disconnect();
    owners.delete(this.host);
    this.host.ownerDocument.removeEventListener('reset', this.#reset, true);
    for (const member of this.#members)
      if (member.checkboxGroup === this) member.checkboxGroup = null;
    this.#members = [];
    if (this.#originalRole === null) this.host.removeAttribute('role');
    else this.host.setAttribute('role', this.#originalRole);
    if (this.#originalDisabled === null) this.host.removeAttribute('aria-disabled');
    else this.host.setAttribute('aria-disabled', this.#originalDisabled);
  }
  #diagnose(code: string, message: string): void {
    if (this.#diagnostics.has(code)) return;
    this.#diagnostics.add(code);
    this.host.dispatchEvent(
      new CustomEvent('tp-diagnostic', {
        bubbles: true,
        composed: true,
        detail: { code: 'checkbox-group-' + code, message },
      }),
    );
  }
}
