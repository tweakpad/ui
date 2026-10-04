/** Restore only declarations still owned by this scope; consumer writes win. */
export class OwnedStyles {
  readonly #values = new Map<
    string,
    { original: string; priority: string; applied: string; appliedPriority: string }
  >();
  constructor(readonly element: HTMLElement | SVGElement) {}
  set(property: string, value: string, priority = ''): void {
    const style = this.element.style,
      previous = this.#values.get(property);
    const retained =
      previous &&
      style.getPropertyValue(property) === previous.applied &&
      style.getPropertyPriority(property) === previous.appliedPriority;
    this.#values.set(property, {
      original: retained ? previous.original : style.getPropertyValue(property),
      priority: retained ? previous.priority : style.getPropertyPriority(property),
      applied: value,
      appliedPriority: priority,
    });
    style.setProperty(property, value, priority);
    const written = this.#values.get(property)!;
    written.applied = style.getPropertyValue(property);
    written.appliedPriority = style.getPropertyPriority(property);
  }
  dispose(): void {
    for (const [property, value] of this.#values) {
      const style = this.element.style;
      if (
        style.getPropertyValue(property) !== value.applied ||
        style.getPropertyPriority(property) !== value.appliedPriority
      )
        continue;
      if (value.original) style.setProperty(property, value.original, value.priority);
      else style.removeProperty(property);
    }
    this.#values.clear();
  }
}

const leases = new WeakMap<
  HTMLElement,
  Map<string, { owners: Set<object>; styles: OwnedStyles; value: string }>
>();
/** Shared identical gesture declarations remain until the last owner releases. */
export function leaseStyle(element: HTMLElement, property: string, value: string): () => void {
  let properties = leases.get(element);
  if (!properties) leases.set(element, (properties = new Map()));
  let lease = properties.get(property);
  if (lease && lease.value !== value) throw new Error('Conflicting style lease values.');
  if (!lease) {
    const styles = new OwnedStyles(element);
    styles.set(property, value);
    properties.set(property, (lease = { styles, owners: new Set(), value }));
  }
  const token = {};
  lease.owners.add(token);
  return () => {
    if (!lease.owners.delete(token) || lease.owners.size) return;
    lease.styles.dispose();
    properties.delete(property);
  };
}
