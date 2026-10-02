export interface TypeaheadItem {
  value: string;
  label: string | null;
  disabled?: boolean;
}

/** Shared lower-case prefix owner; input filtering and focus remain component policy. */
export class TypeaheadController {
  #buffer = '';
  #startIndex = -1;
  #matchIndex = -1;
  #timer: ReturnType<typeof setTimeout> | undefined;
  constructor(
    readonly timeout = 750,
    private readonly locale?: () => string | undefined,
  ) {}

  get typing(): boolean {
    return this.#buffer.length > 0;
  }

  search(items: readonly TypeaheadItem[], key: string, startIndex = -1): number {
    if (key.length !== 1) return -1;
    let locale = this.locale?.();
    try {
      if (locale) Intl.getCanonicalLocales(locale);
    } catch {
      locale = undefined;
    }
    const lower = (value: string): string => value.toLocaleLowerCase(locale);
    if (!this.#buffer) this.#startIndex = startIndex;
    const canCycle = items.every(
      ({ label }) => !label || lower(label[0]!) !== lower(label[1] ?? ''),
    );
    if (canCycle && this.#buffer === key) {
      this.#buffer = '';
      this.#startIndex = this.#matchIndex;
    }
    this.#buffer += key;
    if (this.#timer !== undefined) globalThis.clearTimeout(this.#timer);
    this.#timer = globalThis.setTimeout(() => this.reset(), this.timeout);
    const prefix = lower(this.#buffer);
    for (let offset = 1; offset <= items.length; offset++) {
      const index = (this.#startIndex + offset + items.length) % items.length;
      const item = items[index];
      if (item && !item.disabled && item.label !== null && lower(item.label).startsWith(prefix)) {
        this.#matchIndex = index;
        return index;
      }
    }
    if (key !== ' ') this.reset();
    return -1;
  }

  reset(): void {
    if (this.#timer !== undefined) globalThis.clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#buffer = '';
    this.#startIndex = -1;
    this.#matchIndex = -1;
  }
}
