import type { ElementReference } from './part.js';

const owners = new WeakMap<ElementReference, { owner: object; element: HTMLElement }>();

function write(ref: ElementReference, element: HTMLElement | null): void {
  if (typeof ref === 'function') ref(element);
  else ref.current = element;
}

/** A late disconnect of a replaced Lit template must not clear its successor's ref. */
export function attachPartReference(
  owner: object,
  ref: ElementReference | undefined,
  element: HTMLElement,
): void {
  if (!ref) return;
  const previous = owners.get(ref);
  if (previous?.owner === owner && previous.element === element) return;
  if (previous) write(ref, null);
  owners.set(ref, { owner, element });
  write(ref, element);
}

export function detachPartReference(owner: object, ref: ElementReference | undefined): void {
  if (!ref || owners.get(ref)?.owner !== owner) return;
  owners.delete(ref);
  write(ref, null);
}
