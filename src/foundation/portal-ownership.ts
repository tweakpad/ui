import { composedParent } from './focus.js';

const owners = new WeakMap<Node, HTMLElement>();

/** Registers the existing portal's logical ancestry without changing its DOM. */
export function setLogicalPortalOwner(node: Node, owner: HTMLElement | null): void {
  if (owner) owners.set(node, owner);
  else owners.delete(node);
}

export function directPortalOwner(node: Node): HTMLElement | undefined {
  return owners.get(node);
}

/** The logical owner of a physically relocated composed subtree. */
export function logicalPortalOwner(node: Node | null): HTMLElement | null {
  for (let current = node; current; current = composedParent(current)) {
    const owner = owners.get(current);
    if (owner) return owner;
  }
  return null;
}
