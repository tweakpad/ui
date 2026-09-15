export interface TypeaheadItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export class TypeaheadController {
  #buffer = '';
  #timer: ReturnType<typeof setTimeout> | undefined;
  constructor(readonly timeout = 700) {}

  search(items: readonly TypeaheadItem[], key: string, startIndex = -1): number {
    if (key.length !== 1 || key.trim() === '') return -1;
    if (this.#timer !== undefined) globalThis.clearTimeout(this.#timer);
    this.#buffer += key.toLocaleLowerCase();
    if (this.#buffer.length > 1 && new Set(this.#buffer).size === 1)
      this.#buffer = key.toLocaleLowerCase();
    this.#timer = globalThis.setTimeout(() => {
      this.#buffer = '';
    }, this.timeout);
    const enabled = items
      .map((item, index) => ({ item, index }))
      .filter((entry) => !entry.item.disabled);
    for (let offset = 1; offset <= enabled.length; offset += 1) {
      const candidate =
        enabled[
          (enabled.findIndex((entry) => entry.index === startIndex) + offset + enabled.length) %
            enabled.length
        ];
      if (candidate?.item.label.toLocaleLowerCase().startsWith(this.#buffer))
        return candidate.index;
    }
    return -1;
  }

  reset(): void {
    if (this.#timer !== undefined) globalThis.clearTimeout(this.#timer);
    this.#buffer = '';
  }
}
