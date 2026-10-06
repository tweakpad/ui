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

/**
 * The nearest strict ancestor that satisfies `predicate`, walking composed parents (assigned slots
 * and shadow hosts) and continuing from a registered portal host to its logical owner. Every node
 * inside a relocated subtree is considered before the walk leaves it, so an owner placed inside a
 * portal still wins over one outside it. Cycles in logical ownership terminate the walk.
 */
export function nearestOwner<T extends Node>(
  host: Node,
  predicate: (node: Node) => node is T,
): T | null;
export function nearestOwner(host: Node, predicate: (node: Node) => boolean): Node | null;
export function nearestOwner(host: Node, predicate: (node: Node) => boolean): Node | null {
  const seen = new Set<Node>([host]);
  for (let node = composedParent(host); node && !seen.has(node);) {
    seen.add(node);
    if (predicate(node)) return node;
    const logical = owners.get(node);
    node = logical && !seen.has(logical) ? logical : composedParent(node);
  }
  return null;
}

/**
 * A compound owner for a constituent (for example a media player or map): with `ownerId`, the
 * element with that id in the host's tree scope (then its document) when it satisfies
 * `predicate`; otherwise the portal-aware `nearestOwner`. `null` when none is found.
 */
export function resolveOwner<T extends Node>(
  host: Node,
  predicate: (node: Node) => node is T,
  ownerId?: string | null,
): T | null {
  if (ownerId) {
    const root = host.getRootNode?.() as
      (Node & { getElementById?(id: string): Element | null }) | undefined;
    const element =
      root?.getElementById?.(ownerId) ?? host.ownerDocument?.getElementById(ownerId) ?? null;
    return element && predicate(element) ? element : null;
  }
  return nearestOwner(host, predicate);
}
