// Adapted from xyflow packages/react/src/utils/changes.ts at 3d35b5731 (MIT; see LICENSE.xyflow).
// Adapted from xyflow packages/system/src/utils/graph.ts at 3d35b5731 (MIT; see LICENSE.xyflow).
import { shallowEqual } from '../../store.js';
import { clampPointToExtent } from '../geometry.js';
import type {
  FlowChange,
  FlowDocument,
  FlowEdge,
  FlowEdgePatch,
  FlowLayoutSettings,
  FlowNode,
  FlowNodePatch,
  FlowPoint,
  FlowSize,
  FlowViewport,
} from '../types.js';
import { buildLookup, type FlowLookup } from './indices.js';

/**
 * The change reducer and its helpers. Documents are persistent: a reduced document is a new
 * object whose untouched nodes and edges keep their identity; a changed node is cloned once per
 * batch and mutated by the batch's later changes. Changes are applied sequentially, so inverses
 * computed against the intermediate state replay exactly in reverse.
 */

export type FlowDocumentChange = Exclude<FlowChange, { type: 'node-measure' }>;

function pointsEqual(a: FlowPoint, b: FlowPoint): boolean {
  return a.x === b.x && a.y === b.y;
}

function sizesEqual(a: FlowSize | undefined, b: FlowSize | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.width === b.width && a.height === b.height;
}

function waypointsEqual(
  a: readonly FlowPoint[] | undefined,
  b: readonly FlowPoint[] | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1)
    if (!pointsEqual(a[index]!, b[index]!)) return false;
  return true;
}

function layoutsEqual(
  a: FlowLayoutSettings | undefined,
  b: FlowLayoutSettings | undefined,
): boolean {
  if (!a || !b) return a === b;
  return (
    a.direction === b.direction &&
    a.nodeSpacing === b.nodeSpacing &&
    a.rankSpacing === b.rankSpacing &&
    a.componentSpacing === b.componentSpacing &&
    a.pack === b.pack
  );
}

function viewportsEqual(a: FlowViewport | undefined, b: FlowViewport): boolean {
  return a !== undefined && a.x === b.x && a.y === b.y && a.zoom === b.zoom;
}

function patchIsNoop<T extends object>(item: T, patch: Partial<Record<keyof T, unknown>>): boolean {
  for (const key of Object.keys(patch) as Array<keyof T>) {
    const next = patch[key];
    const current = item[key];
    if (next === undefined) {
      if (current !== undefined) return false;
      continue;
    }
    if (!Object.is(current, next)) return false;
  }
  return true;
}

function previousOfPatch<T extends object>(
  item: T,
  patch: Partial<Record<keyof T, unknown>>,
): Partial<Record<keyof T, unknown>> {
  const previous: Partial<Record<keyof T, unknown>> = {};
  for (const key of Object.keys(patch) as Array<keyof T>) previous[key] = item[key];
  return previous;
}

function applyPatch<T extends object>(item: T, patch: Partial<Record<keyof T, unknown>>): void {
  for (const key of Object.keys(patch) as Array<keyof T>) {
    const value = patch[key];
    if (value === undefined) delete item[key];
    else item[key] = value as T[keyof T];
  }
}

/**
 * Sequential working state over a document. Reads fall through to the original lookup until an
 * item changes; arrays are copied lazily on the first structural change.
 */
export class DocumentCursor<N extends FlowNode = FlowNode, E extends FlowEdge = FlowEdge> {
  readonly #doc: FlowDocument<N, E>;
  readonly #lookup: FlowLookup;
  #nodes: FlowNode[] | undefined;
  #edges: FlowEdge[] | undefined;
  #nodeOrder: Map<string, number> | undefined;
  #edgeOrder: Map<string, number> | undefined;
  readonly #nodeOverlay = new Map<string, FlowNode | null>();
  readonly #edgeOverlay = new Map<string, FlowEdge | null>();
  readonly #clonedNodes = new Set<string>();
  readonly #clonedEdges = new Set<string>();
  #viewport: FlowViewport | undefined;
  #viewportChanged = false;
  #layout: FlowLayoutSettings | undefined;
  #layoutChanged = false;
  #touched = false;

  constructor(doc: FlowDocument<N, E>, lookup: FlowLookup = buildLookup(doc)) {
    this.#doc = doc;
    this.#lookup = lookup;
    this.#viewport = doc.viewport;
    this.#layout = doc.layout;
  }

  get touched(): boolean {
    return this.#touched;
  }

  get viewport(): FlowViewport | undefined {
    return this.#viewport;
  }

  getNode(id: string): FlowNode | undefined {
    const overlay = this.#nodeOverlay.get(id);
    if (overlay !== undefined) return overlay ?? undefined;
    return this.#lookup.nodes.get(id);
  }

  getEdge(id: string): FlowEdge | undefined {
    const overlay = this.#edgeOverlay.get(id);
    if (overlay !== undefined) return overlay ?? undefined;
    return this.#lookup.edges.get(id);
  }

  nodeIndexOf(id: string): number | undefined {
    if (this.#nodes) return this.#nodeOrder!.get(id);
    return this.#lookup.nodeIndex.get(id);
  }

  edgeIndexOf(id: string): number | undefined {
    if (this.#edges) return this.#edgeOrder!.get(id);
    return this.#lookup.edgeIndex.get(id);
  }

  /** Whether `change` would leave the working state as it is. */
  isNoop(change: FlowDocumentChange): boolean {
    switch (change.type) {
      case 'node-add':
        return this.getNode(change.node.id) !== undefined;
      case 'node-remove':
        return this.getNode(change.id) === undefined;
      case 'node-replace': {
        const node = this.getNode(change.id);
        return node === undefined || node === change.node;
      }
      case 'node-update': {
        const node = this.getNode(change.id);
        return (
          node === undefined ||
          patchIsNoop(node, change.patch as Partial<Record<keyof FlowNode, unknown>>)
        );
      }
      case 'node-position': {
        const node = this.getNode(change.id);
        return node === undefined || pointsEqual(node.position, change.position);
      }
      case 'node-size': {
        const node = this.getNode(change.id);
        return node === undefined || sizesEqual(node.size, change.size);
      }
      case 'node-select': {
        const node = this.getNode(change.id);
        return node === undefined || Boolean(node.selected) === change.selected;
      }
      case 'node-data': {
        const node = this.getNode(change.id);
        return node === undefined || shallowEqual(node.data, change.data);
      }
      case 'edge-add':
        return this.getEdge(change.edge.id) !== undefined;
      case 'edge-remove':
        return this.getEdge(change.id) === undefined;
      case 'edge-replace': {
        const edge = this.getEdge(change.id);
        return edge === undefined || edge === change.edge;
      }
      case 'edge-update': {
        const edge = this.getEdge(change.id);
        return (
          edge === undefined ||
          patchIsNoop(edge, change.patch as Partial<Record<keyof FlowEdge, unknown>>)
        );
      }
      case 'edge-select': {
        const edge = this.getEdge(change.id);
        return edge === undefined || Boolean(edge.selected) === change.selected;
      }
      case 'edge-waypoints': {
        const edge = this.getEdge(change.id);
        return edge === undefined || waypointsEqual(edge.waypoints, change.waypoints);
      }
      case 'viewport':
        return viewportsEqual(this.#viewport, change.viewport);
      case 'layout-settings':
        return layoutsEqual(this.#layout, change.layout);
    }
  }

  /** The change that undoes `change` against the working state (call before `apply`). */
  inverseOf(change: FlowDocumentChange): FlowDocumentChange | undefined {
    switch (change.type) {
      case 'node-add':
        return { type: 'node-remove', id: change.node.id };
      case 'node-remove': {
        const node = this.getNode(change.id);
        if (!node) return undefined;
        return { type: 'node-add', node, index: this.nodeIndexOf(change.id) ?? 0 };
      }
      case 'node-replace': {
        const node = this.getNode(change.id);
        return node ? { type: 'node-replace', id: change.id, node } : undefined;
      }
      case 'node-update': {
        const node = this.getNode(change.id);
        if (!node) return undefined;
        return {
          type: 'node-update',
          id: change.id,
          patch: previousOfPatch(
            node,
            change.patch as Partial<Record<keyof FlowNode, unknown>>,
          ) as FlowNodePatch,
        };
      }
      case 'node-position': {
        const node = this.getNode(change.id);
        return node ? { type: 'node-position', id: change.id, position: node.position } : undefined;
      }
      case 'node-size': {
        const node = this.getNode(change.id);
        return node ? { type: 'node-size', id: change.id, size: node.size } : undefined;
      }
      case 'node-select': {
        const node = this.getNode(change.id);
        return node
          ? { type: 'node-select', id: change.id, selected: Boolean(node.selected) }
          : undefined;
      }
      case 'node-data': {
        const node = this.getNode(change.id);
        return node ? { type: 'node-data', id: change.id, data: node.data } : undefined;
      }
      case 'edge-add':
        return { type: 'edge-remove', id: change.edge.id };
      case 'edge-remove': {
        const edge = this.getEdge(change.id);
        if (!edge) return undefined;
        return { type: 'edge-add', edge, index: this.edgeIndexOf(change.id) ?? 0 };
      }
      case 'edge-replace': {
        const edge = this.getEdge(change.id);
        return edge ? { type: 'edge-replace', id: change.id, edge } : undefined;
      }
      case 'edge-update': {
        const edge = this.getEdge(change.id);
        if (!edge) return undefined;
        return {
          type: 'edge-update',
          id: change.id,
          patch: previousOfPatch(
            edge,
            change.patch as Partial<Record<keyof FlowEdge, unknown>>,
          ) as FlowEdgePatch,
        };
      }
      case 'edge-select': {
        const edge = this.getEdge(change.id);
        return edge
          ? { type: 'edge-select', id: change.id, selected: Boolean(edge.selected) }
          : undefined;
      }
      case 'edge-waypoints': {
        const edge = this.getEdge(change.id);
        return edge
          ? { type: 'edge-waypoints', id: change.id, waypoints: edge.waypoints }
          : undefined;
      }
      case 'viewport':
        return { type: 'viewport', viewport: this.#viewport ?? { x: 0, y: 0, zoom: 1 } };
      case 'layout-settings':
        return { type: 'layout-settings', layout: this.#layout ? { ...this.#layout } : undefined };
    }
  }

  apply(change: FlowDocumentChange): void {
    this.#touched = true;
    switch (change.type) {
      case 'node-add':
        this.#insertNode(change.node, change.index);
        return;
      case 'node-remove':
        this.#removeNode(change.id);
        return;
      case 'node-replace':
        this.#replaceNode(change.id, change.node);
        return;
      case 'node-update':
        this.#mutateNode(change.id, (node) =>
          applyPatch(node, change.patch as Partial<Record<keyof FlowNode, unknown>>),
        );
        return;
      case 'node-position':
        this.#mutateNode(change.id, (node) => {
          node.position = { x: change.position.x, y: change.position.y };
        });
        return;
      case 'node-size':
        this.#mutateNode(change.id, (node) => {
          if (change.size) node.size = { width: change.size.width, height: change.size.height };
          else delete node.size;
        });
        return;
      case 'node-select':
        this.#mutateNode(change.id, (node) => {
          if (change.selected) node.selected = true;
          else delete node.selected;
        });
        return;
      case 'node-data':
        this.#mutateNode(change.id, (node) => {
          node.data = change.data;
        });
        return;
      case 'edge-add':
        this.#insertEdge(change.edge, change.index);
        return;
      case 'edge-remove':
        this.#removeEdge(change.id);
        return;
      case 'edge-replace':
        this.#replaceEdge(change.id, change.edge);
        return;
      case 'edge-update':
        this.#mutateEdge(change.id, (edge) =>
          applyPatch(edge, change.patch as Partial<Record<keyof FlowEdge, unknown>>),
        );
        return;
      case 'edge-select':
        this.#mutateEdge(change.id, (edge) => {
          if (change.selected) edge.selected = true;
          else delete edge.selected;
        });
        return;
      case 'edge-waypoints':
        this.#mutateEdge(change.id, (edge) => {
          if (change.waypoints)
            edge.waypoints = change.waypoints.map((point) => ({ x: point.x, y: point.y }));
          else delete edge.waypoints;
        });
        return;
      case 'viewport':
        this.#viewport = { x: change.viewport.x, y: change.viewport.y, zoom: change.viewport.zoom };
        this.#viewportChanged = true;
        return;
      case 'layout-settings':
        this.#layout = change.layout ? { ...change.layout } : undefined;
        this.#layoutChanged = true;
        return;
    }
  }

  /** The reduced document (`doc` itself when nothing changed). */
  document(): FlowDocument<N, E> {
    if (!this.#touched) return this.#doc;
    const nodes =
      this.#nodes ??
      (this.#nodeOverlay.size
        ? this.#doc.nodes.map(
            (node) => (this.#nodeOverlay.get(node.id) as FlowNode | undefined) ?? node,
          )
        : this.#doc.nodes);
    const edges =
      this.#edges ??
      (this.#edgeOverlay.size
        ? this.#doc.edges.map(
            (edge) => (this.#edgeOverlay.get(edge.id) as FlowEdge | undefined) ?? edge,
          )
        : this.#doc.edges);
    const next: FlowDocument<N, E> = { ...this.#doc, nodes: nodes as N[], edges: edges as E[] };
    if (this.#viewportChanged) {
      if (this.#viewport) next.viewport = this.#viewport;
      else delete next.viewport;
    }
    if (this.#layoutChanged) {
      if (this.#layout) next.layout = this.#layout;
      else delete next.layout;
    }
    return next;
  }

  #ensureNodes(): FlowNode[] {
    if (!this.#nodes) {
      this.#nodes = this.#doc.nodes.map(
        (node) => (this.#nodeOverlay.get(node.id) as FlowNode | undefined) ?? node,
      );
      this.#reindexNodes();
    }
    return this.#nodes;
  }

  #ensureEdges(): FlowEdge[] {
    if (!this.#edges) {
      this.#edges = this.#doc.edges.map(
        (edge) => (this.#edgeOverlay.get(edge.id) as FlowEdge | undefined) ?? edge,
      );
      this.#reindexEdges();
    }
    return this.#edges;
  }

  #reindexNodes(): void {
    const order = (this.#nodeOrder ??= new Map());
    order.clear();
    this.#nodes!.forEach((node, index) => order.set(node.id, index));
  }

  #reindexEdges(): void {
    const order = (this.#edgeOrder ??= new Map());
    order.clear();
    this.#edges!.forEach((edge, index) => order.set(edge.id, index));
  }

  #insertNode(node: FlowNode, index: number | undefined): void {
    if (this.getNode(node.id)) return;
    const nodes = this.#ensureNodes();
    if (index === undefined || index >= nodes.length) nodes.push(node);
    else nodes.splice(Math.max(index, 0), 0, node);
    this.#nodeOverlay.set(node.id, node);
    this.#clonedNodes.delete(node.id);
    this.#reindexNodes();
  }

  #removeNode(id: string): void {
    const nodes = this.#ensureNodes();
    const index = this.#nodeOrder!.get(id);
    if (index === undefined) return;
    nodes.splice(index, 1);
    this.#nodeOverlay.set(id, null);
    this.#clonedNodes.delete(id);
    this.#reindexNodes();
  }

  #replaceNode(id: string, node: FlowNode): void {
    if (!this.getNode(id)) return;
    this.#nodeOverlay.set(id, node);
    this.#clonedNodes.delete(id);
    if (this.#nodes) {
      const index = this.#nodeOrder!.get(id);
      if (index !== undefined) this.#nodes[index] = node;
    }
  }

  #mutateNode(id: string, mutate: (node: FlowNode) => void): void {
    const current = this.getNode(id);
    if (!current) return;
    let node = current;
    if (!this.#clonedNodes.has(id)) {
      node = { ...current };
      this.#clonedNodes.add(id);
      this.#nodeOverlay.set(id, node);
      if (this.#nodes) {
        const index = this.#nodeOrder!.get(id);
        if (index !== undefined) this.#nodes[index] = node;
      }
    }
    mutate(node);
  }

  #insertEdge(edge: FlowEdge, index: number | undefined): void {
    if (this.getEdge(edge.id)) return;
    const edges = this.#ensureEdges();
    if (index === undefined || index >= edges.length) edges.push(edge);
    else edges.splice(Math.max(index, 0), 0, edge);
    this.#edgeOverlay.set(edge.id, edge);
    this.#clonedEdges.delete(edge.id);
    this.#reindexEdges();
  }

  #removeEdge(id: string): void {
    const edges = this.#ensureEdges();
    const index = this.#edgeOrder!.get(id);
    if (index === undefined) return;
    edges.splice(index, 1);
    this.#edgeOverlay.set(id, null);
    this.#clonedEdges.delete(id);
    this.#reindexEdges();
  }

  #replaceEdge(id: string, edge: FlowEdge): void {
    if (!this.getEdge(id)) return;
    this.#edgeOverlay.set(id, edge);
    this.#clonedEdges.delete(id);
    if (this.#edges) {
      const index = this.#edgeOrder!.get(id);
      if (index !== undefined) this.#edges[index] = edge;
    }
  }

  #mutateEdge(id: string, mutate: (edge: FlowEdge) => void): void {
    const current = this.getEdge(id);
    if (!current) return;
    let edge = current;
    if (!this.#clonedEdges.has(id)) {
      edge = { ...current };
      this.#clonedEdges.add(id);
      this.#edgeOverlay.set(id, edge);
      if (this.#edges) {
        const index = this.#edgeOrder!.get(id);
        if (index !== undefined) this.#edges[index] = edge;
      }
    }
    mutate(edge);
  }
}

export function isDocumentChange(change: FlowChange): change is FlowDocumentChange {
  return change.type !== 'node-measure';
}

/** Applies `changes` and returns the new document (the same object when nothing changed). */
export function applyFlowChanges<N extends FlowNode, E extends FlowEdge>(
  doc: FlowDocument<N, E>,
  changes: readonly FlowChange[],
  lookup?: FlowLookup,
): FlowDocument<N, E> {
  const cursor = new DocumentCursor(doc, lookup);
  for (const change of changes)
    if (isDocumentChange(change) && !cursor.isNoop(change)) cursor.apply(change);
  return cursor.document();
}

/** Drops changes that would not alter the document (sequentially, so later duplicates go too). */
export function pruneNoopChanges<N extends FlowNode, E extends FlowEdge>(
  doc: FlowDocument<N, E>,
  changes: readonly FlowChange[],
  lookup?: FlowLookup,
): FlowChange[] {
  const cursor = new DocumentCursor(doc, lookup);
  const kept: FlowChange[] = [];
  for (const change of changes) {
    if (!isDocumentChange(change)) {
      kept.push(change);
      continue;
    }
    if (cursor.isNoop(change)) continue;
    kept.push(change);
    cursor.apply(change);
  }
  return kept;
}

/** The changes that undo `changes`, in the order they must be applied. */
export function invertFlowChanges<N extends FlowNode, E extends FlowEdge>(
  doc: FlowDocument<N, E>,
  changes: readonly FlowChange[],
  lookup?: FlowLookup,
): FlowChange[] {
  const cursor = new DocumentCursor(doc, lookup);
  const inverse: FlowChange[] = [];
  for (const change of changes) {
    if (!isDocumentChange(change)) continue;
    const undo = cursor.inverseOf(change);
    if (undo) inverse.push(undo);
    cursor.apply(change);
  }
  return inverse.reverse();
}

export interface FlowReduceResult<N extends FlowNode, E extends FlowEdge> {
  document: FlowDocument<N, E>;
  /** The changes that took effect (no-ops dropped). */
  changes: FlowChange[];
  inverse: FlowChange[];
}

/** Prunes, inverts and applies in one pass. */
export function reduceFlowChanges<N extends FlowNode, E extends FlowEdge>(
  doc: FlowDocument<N, E>,
  changes: readonly FlowChange[],
  lookup?: FlowLookup,
): FlowReduceResult<N, E> {
  const cursor = new DocumentCursor(doc, lookup);
  const applied: FlowChange[] = [];
  const inverse: FlowChange[] = [];
  for (const change of changes) {
    if (!isDocumentChange(change) || cursor.isNoop(change)) continue;
    const undo = cursor.inverseOf(change);
    if (undo) inverse.push(undo);
    cursor.apply(change);
    applied.push(change);
  }
  return { document: cursor.document(), changes: applied, inverse: inverse.reverse() };
}

type Keyed = Extract<FlowChange, { id: string }>;

function changeKey(change: FlowChange): string {
  switch (change.type) {
    case 'node-add':
      return `n:${change.node.id}`;
    case 'edge-add':
      return `e:${change.edge.id}`;
    case 'viewport':
      return 'viewport';
    case 'layout-settings':
      return 'layout-settings';
    default:
      return `${change.type.startsWith('node') ? 'n' : 'e'}:${(change as Keyed).id}`;
  }
}

function mergeInto(previous: FlowChange, next: FlowChange): FlowChange | null | undefined {
  // Returns the merged change, `null` when both cancel out, `undefined` when they cannot merge.
  if (next.type === 'viewport' && previous.type === 'viewport') return next;
  if (next.type === 'layout-settings' && previous.type === 'layout-settings') return next;
  if (next.type === 'node-remove') {
    if (previous.type === 'node-add') return null;
    return next;
  }
  if (next.type === 'edge-remove') {
    if (previous.type === 'edge-add') return null;
    return next;
  }
  if (previous.type === 'node-remove' || previous.type === 'edge-remove') return undefined;
  if (previous.type === 'node-add' && next.type !== 'node-add' && next.type.startsWith('node')) {
    const folded = applyFlowChanges({ version: 1, nodes: [previous.node], edges: [] }, [next])
      .nodes[0]!;
    return { ...previous, node: folded };
  }
  if (previous.type === 'edge-add' && next.type !== 'edge-add' && next.type.startsWith('edge')) {
    const folded = applyFlowChanges({ version: 1, nodes: [], edges: [previous.edge] }, [next])
      .edges[0]!;
    return { ...previous, edge: folded };
  }
  if (previous.type === next.type) {
    if (next.type === 'node-update' && previous.type === 'node-update')
      return { ...next, patch: { ...previous.patch, ...next.patch } };
    if (next.type === 'edge-update' && previous.type === 'edge-update')
      return { ...next, patch: { ...previous.patch, ...next.patch } };
    return next;
  }
  if (next.type === 'node-replace' || next.type === 'edge-replace') return next;
  return undefined;
}

/**
 * Collapses sequential changes per element: repeated positions keep the last, add + remove
 * cancel, updates fold into a preceding add, patches merge. Order of first appearance is kept.
 */
export function squashFlowChanges(changes: readonly FlowChange[]): FlowChange[] {
  const result: FlowChange[] = [];
  const last = new Map<string, number>();
  for (const change of changes) {
    if (change.type === 'node-measure') continue;
    const key = changeKey(change);
    const at = last.get(key);
    if (at !== undefined) {
      const merged = mergeInto(result[at]!, change);
      if (merged === null) {
        result[at] = undefined as unknown as FlowChange;
        last.delete(key);
        continue;
      }
      if (merged !== undefined) {
        result[at] = merged;
        continue;
      }
    }
    last.set(key, result.length);
    result.push(change);
  }
  return result.filter((change): change is FlowChange => change !== undefined);
}

/**
 * Expands removals (xyflow `getElementsToRemove`): a removed node takes its descendants and the
 * edges connected to any removed node; `deletable: false` nodes and edges stay. The result is
 * independent of the order of the input removals and lists nodes in document order.
 */
export function expandRemoveCascade<N extends FlowNode, E extends FlowEdge>(
  doc: FlowDocument<N, E>,
  changes: readonly FlowChange[],
  lookup: FlowLookup = buildLookup(doc),
): FlowChange[] {
  const requestedNodes = new Set<string>();
  const requestedEdges = new Set<string>();
  for (const change of changes) {
    if (change.type === 'node-remove') requestedNodes.add(change.id);
    else if (change.type === 'edge-remove') requestedEdges.add(change.id);
  }
  if (requestedNodes.size === 0 && requestedEdges.size === 0) return [...changes];

  const removedNodes = new Set<string>();
  const childrenOf = new Map<string, string[]>();
  for (const node of lookup.nodes.values())
    if (node.parentId !== undefined) {
      const list = childrenOf.get(node.parentId);
      if (list) list.push(node.id);
      else childrenOf.set(node.parentId, [node.id]);
    }
  const visit = (id: string): void => {
    const node = lookup.nodes.get(id);
    if (!node || node.deletable === false || removedNodes.has(id)) return;
    removedNodes.add(id);
    for (const child of childrenOf.get(id) ?? []) visit(child);
  };
  for (const id of requestedNodes) visit(id);

  const removedEdges = new Set<string>();
  for (const edge of lookup.edges.values()) {
    if (edge.deletable === false) continue;
    if (
      removedNodes.has(edge.source) ||
      removedNodes.has(edge.target) ||
      requestedEdges.has(edge.id)
    )
      removedEdges.add(edge.id);
  }

  const result: FlowChange[] = [];
  let emitted = false;
  for (const change of changes) {
    if (change.type === 'node-remove' || change.type === 'edge-remove') {
      if (emitted) continue;
      emitted = true;
      for (const edge of doc.edges)
        if (removedEdges.has(edge.id)) result.push({ type: 'edge-remove', id: edge.id });
      for (const node of doc.nodes)
        if (removedNodes.has(node.id)) result.push({ type: 'node-remove', id: node.id });
      continue;
    }
    result.push(change);
  }
  return result;
}

export interface FlowClampContext {
  getNode(id: string): FlowNode | undefined;
  /** Effective size of a node (measured, persisted, definition or shape default). */
  sizeOf(node: FlowNode): FlowSize;
}

function clampToExtent(node: FlowNode, position: FlowPoint, context: FlowClampContext): FlowPoint {
  if (!node.extent) return position;
  const size = context.sizeOf(node);
  if (node.extent === 'parent') {
    const parent = node.parentId === undefined ? undefined : context.getNode(node.parentId);
    if (!parent) return position;
    const parentSize = context.sizeOf(parent);
    return clampPointToExtent(
      position,
      [
        [0, 0],
        [parentSize.width, parentSize.height],
      ],
      size,
    );
  }
  return clampPointToExtent(position, node.extent, size);
}

/** Clamps `node-position` and `node-add` positions to the node's extent (`'parent'` uses the parent rect). */
export function clampChanges(
  changes: readonly FlowChange[],
  context: FlowClampContext,
): FlowChange[] {
  let result: FlowChange[] | undefined;
  changes.forEach((change, index) => {
    let replacement: FlowChange | undefined;
    if (change.type === 'node-position') {
      const node = context.getNode(change.id);
      if (node?.extent) {
        const clamped = clampToExtent(node, change.position, context);
        if (!pointsEqual(clamped, change.position)) replacement = { ...change, position: clamped };
      }
    } else if (change.type === 'node-add' && change.node.extent) {
      const clamped = clampToExtent(change.node, change.node.position, context);
      if (!pointsEqual(clamped, change.node.position))
        replacement = { ...change, node: { ...change.node, position: clamped } };
    }
    if (replacement) {
      result ??= [...changes];
      result[index] = replacement;
    }
  });
  return result ?? [...changes];
}
