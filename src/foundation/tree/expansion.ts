import type { TreeModel } from './model.js';

/** Every known expandable item, in depth-first order. */
export function expandableIds(model: TreeModel<unknown>): string[] {
  const result: string[] = [];
  const stack = [...model.roots].reverse();
  while (stack.length) {
    const id = stack.pop()!;
    const node = model.get(id);
    if (!node) continue;
    if (node.expandable) result.push(id);
    for (let index = node.children.length - 1; index >= 0; index--)
      stack.push(node.children[index]!);
  }
  return result;
}

/** Adds identifiers while keeping the existing order; unknown identifiers stay retained. */
export function withExpanded(current: readonly string[], ids: readonly string[]): string[] {
  const seen = new Set(current);
  const next = [...current];
  for (const id of ids) {
    if (seen.has(id)) continue;
    next.push(id);
    seen.add(id);
  }
  return next;
}

export function withoutExpanded(current: readonly string[], ids: Iterable<string>): string[] {
  const removed = new Set(ids);
  return current.filter((id) => !removed.has(id));
}

/** Expandable siblings of an item, for the `*` key. */
export function expandableSiblings(model: TreeModel<unknown>, id: string): string[] {
  return model.siblings(id).filter((sibling) => model.get(sibling)?.expandable);
}

/** Collapsed ancestors that must expand to make an item visible, outermost first. */
export function collapsedAncestors(
  model: TreeModel<unknown>,
  expanded: ReadonlySet<string>,
  id: string,
): string[] {
  return model
    .ancestors(id)
    .filter((ancestor) => !expanded.has(ancestor))
    .reverse();
}
