/** Restore only attributes still owned by this binding, preserving intervening consumer edits. */
export class OwnedAttributes {
  #values = new Map<string, { before: string | null; applied: string | null }>();
  #styles = new Map<string, { before: string; priority: string; applied: string }>();
  constructor(readonly element: HTMLElement) {}
  authored(name: string): string | null {
    const current = this.element.getAttribute(name);
    const owned = this.#values.get(name);
    return owned && current === owned.applied ? owned.before : current;
  }
  set(name: string, value: string | null): void {
    const current = this.element.getAttribute(name);
    const owned = this.#values.get(name);
    const before = owned && current === owned.applied ? owned.before : current;
    this.#values.set(name, { before, applied: value });
    if (current === value) return;
    if (value === null) this.element.removeAttribute(name);
    else this.element.setAttribute(name, value);
  }
  restore(): void {
    for (const [name, value] of this.#styles) {
      if (this.element.style.getPropertyValue(name) !== value.applied) continue;
      if (value.before) this.element.style.setProperty(name, value.before, value.priority);
      else this.element.style.removeProperty(name);
    }
    this.#styles.clear();
    for (const [name, { before, applied }] of this.#values) {
      if (this.element.getAttribute(name) !== applied) continue;
      if (before === null) this.element.removeAttribute(name);
      else this.element.setAttribute(name, before);
    }
    this.#values.clear();
  }
  style(name: string, value: string): void {
    const current = this.element.style.getPropertyValue(name);
    const old = this.#styles.get(name);
    this.#styles.set(name, {
      before: old && current === old.applied ? old.before : current,
      priority: old?.priority ?? this.element.style.getPropertyPriority(name),
      applied: value,
    });
    if (current !== value) this.element.style.setProperty(name, value);
  }
}
