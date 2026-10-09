type Attribute = { original: string | null; applied: string | null };
type Style = { original: string; priority: string; applied: string };

/**
 * Attributes and inline styles a binding sets on an element it does not own. Restoring puts
 * back only what is still ours, so consumer edits made in the meantime survive.
 */
export class OwnedAttributes {
  #values = new Map<string, Attribute>();
  #styles = new Map<string, Style>();
  constructor(readonly element: HTMLElement) {}
  /** The consumer's value: what was there before we applied ours, or their later edit. */
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
  style(name: string, value: string): void {
    const current = this.element.style.getPropertyValue(name);
    const owned = this.#styles.get(name);
    this.#styles.set(name, {
      original: owned && current === owned.applied ? owned.original : current,
      priority: owned?.priority ?? this.element.style.getPropertyPriority(name),
      applied: value,
    });
    if (current !== value) this.element.style.setProperty(name, value);
  }
  dispose(): void {
    for (const [name, { original, priority, applied }] of this.#styles)
      if (this.element.style.getPropertyValue(name) === applied) {
        if (original) this.element.style.setProperty(name, original, priority);
        else this.element.style.removeProperty(name);
      }
    this.#styles.clear();
    for (const [name, { original, applied }] of this.#values)
      if (this.element.getAttribute(name) === applied) {
        if (original === null) this.element.removeAttribute(name);
        else this.element.setAttribute(name, original);
      }
    this.#values.clear();
  }
}
