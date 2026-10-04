/**
 * Adapted from dnd-kit packages/helpers/src/move.ts at
 * e522d9c6a3cbe39e6e980ee3b6fd7a78f238ab94 (MIT; LICENSE.dnd-kit).
 * Branch ordering and optimistic reconciliation are preserved. A06 adds finite
 * integer/range validation before every indexing branch; A20 retains vertical
 * midpoint semantics here. Horizontal insertion belongs to the list adapter.
 */
import { DiagnosticChannel } from '../services.js';

export type UniqueIdentifier = string | number;
export const dragDropDiagnostics = new DiagnosticChannel();

export function reportDragDropDiagnostic(code: string, message: string, context?: unknown): void {
  dragDropDiagnostics.report({ code: `drag-drop:${code}`, message, severity: 'warning', context });
}

export function validIndex(index: number, length: number, insertion = false): boolean {
  return Number.isInteger(index) && index >= 0 && index < length + (insertion ? 1 : 0);
}

export function arrayMove<T extends readonly unknown[]>(array: T, from: number, to: number): T {
  if (!validIndex(from, array.length) || !validIndex(to, array.length)) {
    reportDragDropDiagnostic('index', 'arrayMove requires existing finite integer indices.', {
      from,
      to,
    });
    return array;
  }
  if (from === to) return array;
  const result = array.slice();
  result.splice(to, 0, result.splice(from, 1)[0]);
  return result as unknown as T;
}

export function arraySwap<T extends readonly unknown[]>(array: T, from: number, to: number): T {
  if (!validIndex(from, array.length) || !validIndex(to, array.length)) {
    reportDragDropDiagnostic('index', 'arraySwap requires existing finite integer indices.', {
      from,
      to,
    });
    return array;
  }
  if (from === to) return array;
  const result = array.slice();
  const item = result[from];
  result[from] = result[to];
  result[to] = item;
  return result as unknown as T;
}

export interface SortingIdentity {
  readonly id: UniqueIdentifier;
  readonly index?: number;
  readonly initialIndex?: number;
  readonly group?: UniqueIdentifier | undefined;
  readonly initialGroup?: UniqueIdentifier | undefined;
  readonly shape?: { readonly center: { readonly x: number; readonly y: number } } | undefined;
  readonly manager?:
    | {
        readonly dragOperation: {
          readonly shape?: {
            readonly current: { readonly center: { readonly x: number; readonly y: number } };
          } | null;
          readonly position: { readonly current: { readonly x: number; readonly y: number } };
        };
      }
    | null
    | undefined;
}

export interface SortingEvent {
  readonly operation: {
    readonly source: SortingIdentity | null;
    readonly target: SortingIdentity | null;
    readonly canceled?: boolean;
  };
  preventDefault?(): void;
}

type Items = readonly unknown[];
type Groups = Readonly<Record<string, Items>>;
type SortingInput = Items | Groups;

function getRecordKey(items: Groups, id: UniqueIdentifier): string | undefined {
  const key = String(id);
  return Object.prototype.hasOwnProperty.call(items, key) && Array.isArray(items[key])
    ? key
    : undefined;
}

function hasSortableIndices(
  source: SortingIdentity,
): source is SortingIdentity & { initialIndex: number; index: number } {
  return typeof source.initialIndex === 'number' && typeof source.index === 'number';
}

function mutate<T extends SortingInput>(
  items: T,
  event: SortingEvent,
  mutation: typeof arrayMove,
): T {
  const { source, target, canceled } = event.operation;
  const unchanged = (diagnostic?: string): T => {
    event.preventDefault?.();
    if (diagnostic) reportDragDropDiagnostic('helper-input', diagnostic);
    return items;
  };
  if (!source || !target || canceled) return unchanged();
  const matches = (item: unknown, id: UniqueIdentifier) =>
    item === id || (item !== null && typeof item === 'object' && 'id' in item && item.id === id);

  if (Array.isArray(items)) {
    const sourceIndex = items.findIndex((item) => matches(item, source.id));
    const targetIndex = items.findIndex((item) => matches(item, target.id));
    const reorder = (from: number, to: number): T => {
      if (!validIndex(from, items.length) || !validIndex(to, items.length))
        return unchanged('A flat helper projection must name existing finite integer indices.');
      return mutation(items, from, to) as T;
    };
    if (sourceIndex === -1 || targetIndex === -1) {
      if (hasSortableIndices(source)) {
        const from = source.initialIndex;
        const to = source.index;
        if (from === to) return unchanged();
        return reorder(from, to);
      }
      return items;
    }
    if (typeof source.index === 'number' && source.index !== sourceIndex)
      return reorder(sourceIndex, source.index);
    return reorder(sourceIndex, targetIndex);
  }

  const groups = items as Groups;
  const entries = Object.entries(groups);
  if (entries.some(([, children]) => !Array.isArray(children)))
    return unchanged('Grouped helper data must contain own array-valued groups.');
  let sourceIndex = -1;
  let sourceParent: string | undefined;
  let targetIndex = -1;
  let targetParent: string | undefined;
  for (const [id, children] of entries) {
    if (sourceIndex === -1) {
      sourceIndex = children.findIndex((item) => matches(item, source.id));
      if (sourceIndex !== -1) sourceParent = id;
    }
    if (targetIndex === -1) {
      targetIndex = children.findIndex((item) => matches(item, target.id));
      if (targetIndex !== -1) targetParent = id;
    }
    if (sourceIndex !== -1 && targetIndex !== -1) break;
  }
  // Shared validation for all three source transfer/reconciliation branches.
  const project = (fromGroup: string, from: number, toGroup: string, to: number): T => {
    const sourceItems = groups[fromGroup];
    const targetItems = groups[toGroup];
    if (
      !sourceItems ||
      !targetItems ||
      !validIndex(from, sourceItems.length) ||
      !validIndex(to, targetItems.length, fromGroup !== toGroup)
    )
      return unchanged('A grouped helper projection has an invalid group or index.');
    if (fromGroup === toGroup) {
      if (from === to) return items;
      return { ...groups, [fromGroup]: mutation(sourceItems, from, to) } as T;
    }
    const sourceItem = sourceItems[from];
    return {
      ...groups,
      [fromGroup]: [...sourceItems.slice(0, from), ...sourceItems.slice(from + 1)],
      [toGroup]: [...targetItems.slice(0, to), sourceItem, ...targetItems.slice(to)],
    } as T;
  };

  if (sourceIndex === -1 && hasSortableIndices(source)) {
    const fromGroup =
      source.initialGroup == null ? undefined : getRecordKey(groups, source.initialGroup);
    const toGroup = source.group == null ? undefined : getRecordKey(groups, source.group);
    if (fromGroup == null || toGroup == null)
      return unchanged('Computed helper IDs require valid own groups.');
    if (fromGroup === toGroup && source.initialIndex === source.index) return unchanged();
    return project(fromGroup, source.initialIndex, toGroup, source.index);
  }

  if (!source.manager) return items;
  const operation = source.manager.dragOperation;
  const position = operation.shape?.current.center ?? operation.position.current;
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y))
    return unchanged('Grouped helper insertion requires finite operation geometry.');
  let containerTarget = false;
  if (targetParent == null) {
    const targetKey = getRecordKey(groups, target.id);
    if (targetKey != null) {
      targetParent = targetKey;
      targetIndex =
        target.shape && position.y > target.shape.center.y ? groups[targetKey]!.length : 0;
      containerTarget = true;
    }
  }

  if (
    sourceParent == null ||
    targetParent == null ||
    (sourceParent === targetParent && sourceIndex === targetIndex)
  ) {
    if (
      sourceParent != null &&
      sourceParent === targetParent &&
      sourceIndex === targetIndex &&
      hasSortableIndices(source)
    ) {
      const projectedGroup = source.group == null ? undefined : getRecordKey(groups, source.group);
      const groupChanged = source.group != null && projectedGroup !== sourceParent;
      const indexChanged = source.index !== sourceIndex;
      if (groupChanged || indexChanged) {
        const destination = source.group == null ? sourceParent : projectedGroup;
        if (destination != null)
          return project(sourceParent, sourceIndex, destination, source.index);
      }
    }
    return unchanged();
  }
  if (sourceParent === targetParent) {
    // A container's end boundary is an insertion boundary, not an item index.
    const index =
      containerTarget && targetIndex === groups[targetParent]!.length
        ? targetIndex - 1
        : targetIndex;
    return project(sourceParent, sourceIndex, targetParent, index);
  }
  const below =
    !containerTarget && target.shape && Math.round(position.y) > Math.round(target.shape.center.y);
  return project(sourceParent, sourceIndex, targetParent, targetIndex + (below ? 1 : 0));
}

export function move<T extends SortingInput>(items: T, event: SortingEvent): T {
  return mutate(items, event, arrayMove);
}

export function swap<T extends SortingInput>(items: T, event: SortingEvent): T {
  return mutate(items, event, arraySwap);
}
