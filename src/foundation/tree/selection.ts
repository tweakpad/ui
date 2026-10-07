import { checkboxParentSelection } from '../checkbox-group.js';
import type { TreeModel } from './model.js';

export type TreeSelectionMode = 'none' | 'single' | 'multiple';
export type TreeCheckedState = boolean | 'mixed';

/** Unique string identifiers in their first-seen order. */
export function normalizeIds(value: unknown): string[] {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : typeof value === 'string' ? parseIdList(value) : [];
  return [...new Set(list.filter((id): id is string => typeof id === 'string' && id !== ''))];
}

/** Attribute form: a JSON array, or whitespace-separated identifiers. */
export function parseIdList(value: string): string[] {
  const text = value.trim();
  if (text.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }
  return text ? text.split(/\s+/) : [];
}

/** Narrows a proposal to the selection mode. */
export function constrainSelection(ids: readonly string[], mode: TreeSelectionMode): string[] {
  if (mode === 'none') return [];
  return mode === 'single' ? ids.slice(0, 1) : [...ids];
}

export function toggleId(
  current: readonly string[],
  id: string,
  selected = !current.includes(id),
): string[] {
  if (selected) return current.includes(id) ? [...current] : [...current, id];
  return current.filter((value) => value !== id);
}

/** Selectable visible rows from `from` to `to`, inclusive, in visible order. */
export function rangeIds(
  rows: readonly string[],
  from: number,
  to: number,
  selectable: (id: string) => boolean,
): string[] {
  if (from < 0 || to < 0) return [];
  const [start, end] = from <= to ? [from, to] : [to, from];
  const result: string[] = [];
  for (let index = start; index <= end; index++) {
    const id = rows[index];
    if (id !== undefined && selectable(id)) result.push(id);
  }
  return result;
}

/** Union that keeps the existing order and appends new identifiers. */
export function unionIds(current: readonly string[], added: readonly string[]): string[] {
  const seen = new Set(current);
  return [...current, ...added.filter((id) => !seen.has(id) && seen.add(id))];
}

/**
 * Selection propagation: set an item and its enabled loaded descendants, then derive every
 * ancestor from its enabled loaded descendants. Disabled items keep their state.
 */
export function propagateSelection(
  model: TreeModel<unknown>,
  current: readonly string[],
  id: string,
  selected: boolean,
): string[] {
  const disabled = new Set<string>();
  const scope = [id, ...model.descendants(id)];
  for (const value of scope) if (model.get(value)?.disabled) disabled.add(value);
  const next = checkboxParentSelection(current, scope, disabled, selected);
  return deriveAncestors(model, next, model.ancestors(id));
}

/** Re-derives the given ancestors (nearest first) from their enabled loaded descendants. */
export function deriveAncestors(
  model: TreeModel<unknown>,
  current: readonly string[],
  ancestors: readonly string[],
): string[] {
  const selected = new Set(current);
  for (const ancestor of ancestors) {
    const node = model.get(ancestor);
    if (!node || node.disabled) continue;
    const state = derivedState(model, selected, ancestor);
    if (state === true) selected.add(ancestor);
    else selected.delete(ancestor);
  }
  return [
    ...current.filter((value) => selected.has(value)),
    ...ancestors.filter((value) => selected.has(value) && !current.includes(value)).reverse(),
  ];
}

/** Children loaded under a selected item inherit its selection (enabled ones only). */
export function inheritSelection(
  model: TreeModel<unknown>,
  current: readonly string[],
  parent: string,
): string[] {
  if (!current.includes(parent)) return [...current];
  const added: string[] = [];
  for (const id of model.descendants(parent)) if (!model.get(id)?.disabled) added.push(id);
  return unionIds(current, added);
}

function derivedState(
  model: TreeModel<unknown>,
  selected: ReadonlySet<string>,
  id: string,
): TreeCheckedState {
  let total = 0;
  let checked = 0;
  for (const value of model.descendants(id)) {
    if (model.get(value)?.disabled) continue;
    total += 1;
    if (selected.has(value)) checked += 1;
  }
  if (!total) return selected.has(id);
  return checked === 0 ? false : checked === total ? true : 'mixed';
}

/**
 * Checked state of every item in one post-order pass. Without propagation an item is checked
 * exactly when selected; with it, expandable items derive from their enabled loaded descendants.
 */
export function checkedStates(
  model: TreeModel<unknown>,
  selected: ReadonlySet<string>,
  propagation: boolean,
): Map<string, TreeCheckedState> {
  const states = new Map<string, TreeCheckedState>();
  if (!propagation) {
    for (const id of model.ids()) states.set(id, selected.has(id));
    return states;
  }
  // Counts of enabled loaded descendants and of those selected.
  const totals = new Map<string, [number, number]>();
  const order: string[] = [];
  const stack = [...model.roots];
  while (stack.length) {
    const id = stack.pop()!;
    order.push(id);
    for (const child of model.get(id)?.children ?? []) stack.push(child);
  }
  for (let index = order.length - 1; index >= 0; index--) {
    const id = order[index]!;
    const node = model.get(id)!;
    let total = 0;
    let checked = 0;
    for (const child of node.children) {
      const [childTotal, childChecked] = totals.get(child)!;
      total += childTotal;
      checked += childChecked;
      if (!model.get(child)!.disabled) {
        total += 1;
        if (selected.has(child)) checked += 1;
      }
    }
    totals.set(id, [total, checked]);
    states.set(
      id,
      !total ? selected.has(id) : checked === 0 ? false : checked === total ? true : 'mixed',
    );
  }
  return states;
}
