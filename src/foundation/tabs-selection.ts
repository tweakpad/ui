export interface TabSelectionItem {
  value: unknown;
  disabled: boolean;
}

export type TabsFallbackReason = 'initial' | 'missing' | 'disabled';

/** Tabs' ordered, singular selection policy. DOM, focus and presentation belong to the binding. */
export class TabsSelection {
  readonly controlled: boolean;
  value: unknown;
  #initial: boolean;
  #honorDisabled: boolean;
  #items: readonly TabSelectionItem[] = [];
  #publishing = false;
  #external: { value: unknown } | undefined;
  #queued: Array<() => void> = [];

  constructor(
    value: unknown,
    defaultValue: unknown,
    private fallback: (value: unknown, previous: unknown, reason: TabsFallbackReason) => void,
  ) {
    this.controlled = value !== undefined;
    this.value = this.controlled ? value : defaultValue === undefined ? 0 : defaultValue;
    this.#initial = !this.controlled && defaultValue === undefined;
    this.#honorDisabled = defaultValue !== undefined;
  }

  external(value: unknown): void {
    if (!this.controlled || value === undefined) return;
    if (this.#publishing) this.#external = { value };
    else this.value = value;
  }

  request(value: unknown, notify: () => boolean): boolean {
    if (this.#publishing) {
      this.#queued.push(() => this.request(value, notify));
      return false;
    }
    if (Object.is(value, this.value)) return false;
    this.#publishing = true;
    let accepted: boolean;
    try {
      accepted = notify();
      if (accepted) {
        if (!this.controlled) this.value = value;
        else if (this.#external) this.value = this.#external.value;
        this.#honorDisabled = true;
      }
    } finally {
      this.#external = undefined;
      this.#publishing = false;
    }
    for (const run of this.#queued.splice(0)) run();
    return accepted;
  }

  reconcile(items: readonly TabSelectionItem[]): void {
    const previousItems = this.#items;
    this.#items = items;
    if (this.controlled) return;
    // Wait for first registration, but treat removal of a populated registry as missing.
    if (!items.length && !previousItems.length) return;
    const selected = items.findIndex((item) => Object.is(item.value, this.value));
    const current = items[selected];
    if (current && !current.disabled) {
      this.#honorDisabled = false;
      this.#initial = false;
    }
    if (current?.disabled && this.#honorDisabled && !this.#initial) return;
    if (this.value === null && !this.#initial) return;

    if (this.#initial || !current || current.disabled) {
      const reason: TabsFallbackReason = this.#initial
        ? 'initial'
        : current
          ? 'disabled'
          : 'missing';
      const oldIndex = previousItems.findIndex((item) => Object.is(item.value, this.value));
      const start = current ? selected + 1 : Math.max(0, oldIndex);
      const next = this.#initial
        ? current && !current.disabled
          ? current
          : items.find((item) => !item.disabled)
        : (items.slice(start).find((item) => !item.disabled) ??
          items
            .slice(0, start)
            .reverse()
            .find((item) => !item.disabled));
      const previous = this.value;
      this.value = next?.value ?? null;
      const initial = this.#initial;
      this.#initial = false;
      this.#honorDisabled = false;
      if (initial || !Object.is(previous, this.value)) this.fallback(this.value, previous, reason);
    }
  }
}
