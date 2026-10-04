type Attribute = { original: string | null; applied: string | null };
export class OwnedAttributes {
  #values = new Map<string, Attribute>();
  constructor(readonly element: HTMLElement) {}
  original(name: string): string | null {
    const owned = this.#values.get(name);
    const current = this.element.getAttribute(name);
    if (owned && current !== owned.applied) owned.original = current;
    return owned ? owned.original : current;
  }
  set(name: string, value: string | null): void {
    const original = this.original(name);
    this.#values.set(name, { original, applied: value });
    if (this.element.getAttribute(name) === value) return;
    if (value === null) this.element.removeAttribute(name);
    else this.element.setAttribute(name, value);
  }
  dispose(): void {
    for (const [name, { original, applied }] of this.#values)
      if (this.element.getAttribute(name) === applied) {
        if (original === null) this.element.removeAttribute(name);
        else this.element.setAttribute(name, original);
      }
    this.#values.clear();
  }
}
