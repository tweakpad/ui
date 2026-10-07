import type { ImageLoadStatus } from '../image-load.js';

/** Load state of an item's children, sharing Avatar's status vocabulary. */
export type TreeLoadStatus = ImageLoadStatus;

export interface TreeNode<T = unknown> {
  readonly id: string;
  readonly parentId: string | null;
  /** Zero-based; the accessible level is `depth + 1`. */
  readonly depth: number;
  /** Position among the parent's loaded children. */
  readonly index: number;
  readonly children: readonly string[];
  /** Has children, or declares unloaded children. */
  readonly expandable: boolean;
  /** Whether the children list is known. */
  readonly loaded: boolean;
  readonly disabled: boolean;
  readonly label: string;
  readonly item: T;
}

/** Maps consumer items (records or elements) onto the model. */
export interface TreeAccessors<T> {
  id(item: T): string;
  label(item: T): string;
  /** `undefined` or `null` means the children are not known yet. */
  children(item: T): readonly T[] | null | undefined;
  disabled(item: T): boolean;
  /** Declares unloaded children for an item whose children are not known. */
  hasChildren(item: T): boolean;
}

export interface TreeModelInput<T> {
  items: readonly T[];
  accessors: TreeAccessors<T>;
  /** Children loaded after the items were supplied, keyed by parent id. */
  loaded?: ReadonlyMap<string, readonly T[]>;
}

interface MutableNode<T> {
  id: string;
  parentId: string | null;
  depth: number;
  index: number;
  children: string[];
  expandable: boolean;
  loaded: boolean;
  disabled: boolean;
  label: string;
  item: T;
}

/**
 * Immutable item hierarchy. Identifiers are type-sensitive strings; the first item in
 * logical order owns an identifier and later duplicates do not participate.
 */
export class TreeModel<T = unknown> {
  readonly #nodes = new Map<string, TreeNode<T>>();
  readonly roots: readonly string[];
  /** Identifiers that appeared more than once; reported once each. */
  readonly duplicates: readonly string[];
  /** Items with an empty or non-string identifier. */
  readonly invalid: number;

  static empty<T>(): TreeModel<T> {
    return new TreeModel<T>({
      items: [],
      accessors: {
        id: () => '',
        label: () => '',
        children: () => [],
        disabled: () => false,
        hasChildren: () => false,
      },
    });
  }

  constructor({ items, accessors, loaded }: TreeModelInput<T>) {
    const roots: string[] = [];
    const duplicates = new Set<string>();
    let invalid = 0;
    // Iterative depth-first walk: deep trees must not overflow the call stack.
    const stack: { items: readonly T[]; parent: MutableNode<T> | null; next: number }[] = [
      { items, parent: null, next: 0 },
    ];
    while (stack.length) {
      const frame = stack[stack.length - 1]!;
      if (frame.next >= frame.items.length) {
        stack.pop();
        continue;
      }
      const item = frame.items[frame.next++]!;
      const id = accessors.id(item);
      if (typeof id !== 'string' || !id) {
        invalid += 1;
        continue;
      }
      if (this.#nodes.has(id)) {
        duplicates.add(id);
        continue;
      }
      const siblings = frame.parent ? frame.parent.children : roots;
      const own = accessors.children(item);
      const children = own ?? loaded?.get(id);
      const node: MutableNode<T> = {
        id,
        parentId: frame.parent?.id ?? null,
        depth: frame.parent ? frame.parent.depth + 1 : 0,
        index: siblings.length,
        children: [],
        expandable: (children ? children.length > 0 : false) || accessors.hasChildren(item),
        loaded: children != null,
        disabled: Boolean(accessors.disabled(item)),
        label: String(accessors.label(item) ?? ''),
        item,
      };
      siblings.push(id);
      this.#nodes.set(id, node);
      if (children?.length) stack.push({ items: children, parent: node, next: 0 });
    }
    this.roots = roots;
    this.duplicates = [...duplicates];
    this.invalid = invalid;
  }

  get size(): number {
    return this.#nodes.size;
  }

  get(id: string): TreeNode<T> | undefined {
    return this.#nodes.get(id);
  }

  has(id: string): boolean {
    return this.#nodes.has(id);
  }

  ids(): IterableIterator<string> {
    return this.#nodes.keys();
  }

  nodes(): IterableIterator<TreeNode<T>> {
    return this.#nodes.values();
  }

  /** Parent, grandparent, … up to a top-level item. */
  ancestors(id: string): string[] {
    const result: string[] = [];
    for (let node = this.get(id); node?.parentId; node = this.get(node.parentId))
      result.push(node.parentId);
    return result;
  }

  /** Loaded descendants in depth-first order. */
  *descendants(id: string): Generator<string> {
    const stack = [...(this.get(id)?.children ?? [])].reverse();
    while (stack.length) {
      const next = stack.pop()!;
      yield next;
      const children = this.get(next)?.children;
      if (children)
        for (let index = children.length - 1; index >= 0; index--) stack.push(children[index]!);
    }
  }

  isDescendant(id: string, ancestor: string): boolean {
    for (let node = this.get(id); node?.parentId; node = this.get(node.parentId))
      if (node.parentId === ancestor) return true;
    return false;
  }

  siblings(id: string): readonly string[] {
    const node = this.get(id);
    if (!node) return [];
    return node.parentId === null ? this.roots : (this.get(node.parentId)?.children ?? []);
  }

  /** Accessible level (1-based). */
  level(id: string): number {
    return (this.get(id)?.depth ?? 0) + 1;
  }

  setSize(id: string): number {
    return this.siblings(id).length;
  }

  posInSet(id: string): number {
    return (this.get(id)?.index ?? 0) + 1;
  }
}

/**
 * The items whose every ancestor is expanded, in depth-first order. Expanding or collapsing one
 * item changes only that item's descendants, so the list is spliced instead of rebuilt.
 */
export class VisibleRows {
  #ids: string[] = [];
  #index: Map<string, number> | null = null;

  get ids(): readonly string[] {
    return this.#ids;
  }

  get length(): number {
    return this.#ids.length;
  }

  at(index: number): string | undefined {
    return this.#ids[index];
  }

  indexOf(id: string): number {
    if (!this.#index) {
      this.#index = new Map();
      for (let index = 0; index < this.#ids.length; index++)
        this.#index.set(this.#ids[index]!, index);
    }
    return this.#index.get(id) ?? -1;
  }

  has(id: string): boolean {
    return this.indexOf(id) >= 0;
  }

  /** One lookup without building the index (splices invalidate it anyway). */
  #find(id: string): number {
    return this.#index ? (this.#index.get(id) ?? -1) : this.#ids.indexOf(id);
  }

  rebuild(model: TreeModel<unknown>, expanded: ReadonlySet<string>): void {
    const ids: string[] = [];
    const stack = [...model.roots].reverse();
    while (stack.length) {
      const id = stack.pop()!;
      ids.push(id);
      if (!expanded.has(id)) continue;
      const children = model.get(id)?.children;
      if (children)
        for (let index = children.length - 1; index >= 0; index--) stack.push(children[index]!);
    }
    this.#ids = ids;
    this.#index = null;
  }

  /** Insert the visible subtree of a newly expanded, visible item. Returns the inserted ids. */
  expand(model: TreeModel<unknown>, expanded: ReadonlySet<string>, id: string): readonly string[] {
    const at = this.#find(id);
    if (at < 0 || this.#subtreeEnd(model, at) !== at + 1) return [];
    const inserted: string[] = [];
    const stack = [...(model.get(id)?.children ?? [])].reverse();
    while (stack.length) {
      const next = stack.pop()!;
      inserted.push(next);
      if (!expanded.has(next)) continue;
      const children = model.get(next)?.children;
      if (children)
        for (let index = children.length - 1; index >= 0; index--) stack.push(children[index]!);
    }
    if (inserted.length) {
      // A new array: holders of the previous list (a virtual window) see the change.
      this.#ids = [...this.#ids.slice(0, at + 1), ...inserted, ...this.#ids.slice(at + 1)];
      this.#index = null;
    }
    return inserted;
  }

  /** Remove the visible descendants of a collapsed item. Returns the removed ids. */
  collapse(model: TreeModel<unknown>, id: string): readonly string[] {
    const at = this.#find(id);
    if (at < 0) return [];
    const end = this.#subtreeEnd(model, at);
    if (end === at + 1) return [];
    const removed = this.#ids.slice(at + 1, end);
    this.#ids = [...this.#ids.slice(0, at + 1), ...this.#ids.slice(end)];
    this.#index = null;
    return removed;
  }

  /** Exclusive end of the visible block that descends from the row at `index`. */
  #subtreeEnd(model: TreeModel<unknown>, index: number): number {
    const depth = model.get(this.#ids[index]!)?.depth ?? 0;
    let end = index + 1;
    while (end < this.#ids.length && (model.get(this.#ids[end]!)?.depth ?? 0) > depth) end++;
    return end;
  }
}
