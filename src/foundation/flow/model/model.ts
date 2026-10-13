import { Emitter } from '../../store.js';
import { DEFAULT_EDGE_KIND, DEFAULT_NODE_SIZE_BY_SHAPE, edgeKindOptions } from '../defaults.js';
import {
  defaultPortGeometry,
  defaultSide,
  pickPort,
  resolveEndpoint,
  type FlowPortDirection,
} from '../edges/endpoints.js';
import { expandRect, rectContainsPoint, unionRects } from '../geometry.js';
import { SpatialIndex } from '../spatial-index.js';
import type {
  ChangeReason,
  FlowChange,
  FlowChangeOrigin,
  FlowConnection,
  FlowDocument,
  FlowEdge,
  FlowEdgeKind,
  FlowEdgeKindOptions,
  FlowEndpoint,
  FlowIssue,
  FlowLayoutMode,
  FlowModelLike,
  FlowNode,
  FlowNodeDefinition,
  FlowPoint,
  FlowPortDefinition,
  FlowPortGeometry,
  FlowRect,
  FlowResolvedPort,
  FlowSchema,
  FlowSelection,
  FlowSide,
  FlowSize,
  FlowViewport,
} from '../types.js';
import {
  clampChanges,
  expandRemoveCascade,
  pruneNoopChanges,
  reduceFlowChanges,
  squashFlowChanges,
  invertFlowChanges,
} from './changes.js';
import {
  FlowHistory,
  type FlowHistoryEntry,
  type FlowHistoryOptions,
  type FlowHistoryState,
} from './history.js';
import {
  runAfterHooks,
  runBeforeHooks,
  type FlowChangeEvent,
  type FlowMiddleware,
} from './hooks.js';
import {
  ancestorsOf,
  applyMeasure,
  buildIndices,
  connectionKey,
  createRuntime,
  descendantsOf,
  incidentEdges,
  pruneRuntime,
  type FlowIndices,
  type FlowRuntime,
} from './indices.js';
import {
  buildAdjacency,
  connectedComponents,
  hasCycle,
  nodeZ,
  reachable,
  topologicalOrder,
  wouldCreateCycle,
} from './queries.js';
import {
  migrateFlowDocument,
  normalizeNodeOrder,
  parseFlowDocument,
  serializeFlowDocument,
  type FlowMigration,
  type FlowParseOptions,
  type FlowSerializeOptions,
} from './serialization.js';
import {
  validateConnection,
  validateDocument,
  type FlowConnectionPredicate,
  type FlowConnectionResult,
  type FlowConnectionValidationOptions,
} from './validation.js';

/**
 * The engine facade: a persistent document, lookup indices, runtime measurements, a spatial
 * index, history and middleware. Every mutation runs the apply pipeline: prune no-ops → expand
 * cascades → clamp → before hooks → inverses → reduce → indices → history → `change` → after
 * hooks → `history`. Applies started from inside a listener are queued until the current one
 * finishes. `node-measure` only touches the runtime and is never recorded or serialized.
 */
export interface FlowModelOptions<N extends FlowNode = FlowNode, E extends FlowEdge = FlowEdge> {
  document?: FlowDocument<N, E>;
  schema?: FlowSchema;
  middleware?: readonly FlowMiddleware[];
  /** `false` disables history. */
  history?: FlowHistoryOptions | false;
  isValidConnection?: FlowConnectionPredicate;
  idFactory?: (kind: 'node' | 'edge') => string;
  now?: () => number;
}

export interface FlowApplyOptions {
  /** Input source (default `programmatic`). */
  reason?: ChangeReason;
  /** Provenance (default `user`). */
  origin?: FlowChangeOrigin;
  /** Transaction id to tag the event with (open transactions tag automatically). */
  transaction?: string;
  /** Entries with the same key merge inside the history's `coalesceWindow`. */
  coalesce?: string;
  /** `false` keeps the batch out of history. */
  history?: boolean;
  /** Expand removals to descendants and connected edges (default true). */
  cascade?: boolean;
  /** Clamp positions to extents (default true). */
  clamp?: boolean;
  label?: string;
  /** Extra middleware for this apply, after the model's. */
  middleware?: readonly FlowMiddleware[];
}

export interface FlowApplyResult {
  applied: boolean;
  changes: FlowChange[];
  inverse: FlowChange[];
  vetoedBy?: string;
  /** The apply ran inside a listener and was queued. */
  queued?: boolean;
}

export interface FlowTransactionOptions extends FlowApplyOptions {
  id?: string;
}

export interface FlowTransaction {
  readonly id: string;
  readonly open: boolean;
  apply(changes: readonly FlowChange[], options?: FlowApplyOptions): FlowApplyResult;
  /** Records one squashed history entry (none when nothing changed). */
  commit(): FlowHistoryEntry | undefined;
  /** Applies the squashed inverse with origin `rollback`; records nothing. */
  rollback(reason?: ChangeReason): FlowApplyResult;
}

export interface FlowConnectOptions extends FlowApplyOptions {
  /** Edge being reconnected: replaced by the new connection instead of adding an edge. */
  reconnect?: string;
}

export interface FlowConnectResult extends FlowApplyResult {
  validation: FlowConnectionResult;
  edge?: FlowEdge;
}

export interface FlowPortHit {
  nodeId: string;
  port: FlowResolvedPort;
  /** Absolute port center. */
  point: FlowPoint;
  distance: number;
}

export interface FlowAddNodeResult<N extends FlowNode> extends FlowApplyResult {
  node: N;
}

export type FlowSelectMode = 'replace' | 'add' | 'toggle';

export type FlowNodeInput<N extends FlowNode> = Omit<N, 'id'> & { id?: string };
export type FlowEdgeInput<E extends FlowEdge> = Omit<E, 'id'> & { id?: string };

type ModelEvents = {
  change: [FlowChangeEvent];
  history: [FlowHistoryState];
  schema: [FlowSchema | undefined];
};

interface OpenTransaction {
  id: string;
  depth: number;
  forward: FlowChange[];
  inverse: FlowChange[];
  options: FlowTransactionOptions;
  open: boolean;
}

const NON_RECORDING_ORIGINS: ReadonlySet<FlowChangeOrigin> = new Set([
  'undo',
  'redo',
  'rollback',
  'external',
  'measure',
]);

const DIRTY_PADDING = 8;
const EMPTY_PORTS: readonly FlowResolvedPort[] = Object.freeze([]);
const EMPTY_IDS: readonly string[] = Object.freeze([]);

function definedOnly<T extends object>(value: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(value) as Array<keyof T>)
    if (value[key] !== undefined) result[key] = value[key];
  return result;
}

export class FlowModel<
  N extends FlowNode = FlowNode,
  E extends FlowEdge = FlowEdge,
> implements FlowModelLike {
  #doc: FlowDocument<N, E>;
  #indices: FlowIndices;
  readonly #runtime: FlowRuntime = createRuntime();
  readonly #spatial = new SpatialIndex();
  #schema: FlowSchema | undefined;
  #definitions = new Map<string, FlowNodeDefinition>();
  readonly #middleware: FlowMiddleware[];
  readonly #history: FlowHistory | undefined;
  readonly #emitter = new Emitter<ModelEvents>();
  readonly #isValidConnection: FlowConnectionPredicate | undefined;
  readonly #idFactory: ((kind: 'node' | 'edge') => string) | undefined;
  readonly #now: () => number;
  #applying = false;
  readonly #queue: Array<() => void> = [];
  #transaction: OpenTransaction | undefined;
  #transactionCounter = 0;
  #idCounter = 0;
  #stamp = 0;
  readonly #portCache = new Map<
    string,
    { node: FlowNode; stamp: number; ports: FlowResolvedPort[] }
  >();
  #selectionCache: { doc: FlowDocument<N, E>; selection: FlowSelection } | undefined;
  #zCache: { doc: FlowDocument<N, E>; z: Map<string, number> } | undefined;

  constructor(options: FlowModelOptions<N, E> = {}) {
    const initial = options.document ?? { version: 1, nodes: [], edges: [] };
    this.#doc = { ...initial, nodes: normalizeNodeOrder(initial.nodes), edges: [...initial.edges] };
    this.#indices = buildIndices(this.#doc);
    this.#middleware = [...(options.middleware ?? [])];
    this.#now = options.now ?? (() => Date.now());
    this.#history =
      options.history === false ? undefined : new FlowHistory(options.history ?? {}, this.#now);
    this.#isValidConnection = options.isValidConnection;
    this.#idFactory = options.idFactory;
    this.#setSchema(options.schema);
    this.#rebuildSpatial();
  }

  // Document ---------------------------------------------------------------------------------

  get document(): FlowDocument<N, E> {
    return this.#doc;
  }

  get nodes(): readonly N[] {
    return this.#doc.nodes;
  }

  get edges(): readonly E[] {
    return this.#doc.edges;
  }

  get viewport(): FlowViewport {
    return this.#doc.viewport ?? { x: 0, y: 0, zoom: 1 };
  }

  get schema(): FlowSchema | undefined {
    return this.#schema;
  }

  set schema(schema: FlowSchema | undefined) {
    if (schema === this.#schema) return;
    this.#setSchema(schema);
    this.#emitter.emit('schema', schema);
  }

  get middleware(): readonly FlowMiddleware[] {
    return this.#middleware;
  }

  use(middleware: FlowMiddleware): () => void {
    this.#middleware.push(middleware);
    return () => {
      const index = this.#middleware.indexOf(middleware);
      if (index >= 0) this.#middleware.splice(index, 1);
    };
  }

  get spatialIndex(): SpatialIndex {
    return this.#spatial;
  }

  get selection(): FlowSelection {
    if (this.#selectionCache?.doc === this.#doc) return this.#selectionCache.selection;
    const selection: FlowSelection = {
      nodes: this.#doc.nodes.filter((node) => node.selected).map((node) => node.id),
      edges: this.#doc.edges.filter((edge) => edge.selected).map((edge) => edge.id),
    };
    this.#selectionCache = { doc: this.#doc, selection };
    return selection;
  }

  // Events -----------------------------------------------------------------------------------

  subscribe(listener: (event: FlowChangeEvent) => void): () => void {
    return this.#emitter.on('change', listener);
  }

  on<K extends keyof ModelEvents>(
    name: K,
    listener: (...args: ModelEvents[K]) => void,
  ): () => void {
    return this.#emitter.on(name, listener);
  }

  // Apply pipeline ---------------------------------------------------------------------------

  apply(changes: readonly FlowChange[], options: FlowApplyOptions = {}): FlowApplyResult {
    if (this.#applying) {
      this.#queue.push(() => {
        this.apply(changes, options);
      });
      return { applied: false, changes: [], inverse: [], queued: true };
    }
    this.#applying = true;
    try {
      return this.#run(changes, options, false);
    } finally {
      this.#applying = false;
      this.#drain();
    }
  }

  #drain(): void {
    while (this.#queue.length && !this.#applying) this.#queue.shift()!();
  }

  #run(
    input: readonly FlowChange[],
    options: FlowApplyOptions,
    bypassHooks: boolean,
  ): FlowApplyResult {
    const reason = options.reason ?? 'programmatic';
    const origin = options.origin ?? 'user';
    const transaction = options.transaction ?? this.#transaction?.id;
    const previous = this.#doc;
    const previousIndices = this.#indices;

    // Runtime measurements are applied directly; they never enter the document pipeline.
    const measured = new Set<string>();
    const docChanges: FlowChange[] = [];
    for (const change of input) {
      if (change.type === 'node-measure') {
        if (this.#indices.nodes.has(change.id) && applyMeasure(this.#runtime, change))
          measured.add(change.id);
      } else docChanges.push(change);
    }
    if (measured.size) this.#stamp += 1;

    let changes = pruneNoopChanges(previous, docChanges, previousIndices);
    if (changes.length && options.cascade !== false)
      changes = expandRemoveCascade(previous, changes, previousIndices);
    if (changes.length && options.clamp !== false)
      changes = clampChanges(changes, this.#clampContext());

    let vetoedBy: string | undefined;
    let previewed: ReturnType<typeof reduceFlowChanges<N, E>> | undefined;
    if (changes.length && !bypassHooks) {
      const middleware = options.middleware
        ? [...this.#middleware, ...options.middleware]
        : this.#middleware;
      if (middleware.length) {
        const hooks = runBeforeHooks(middleware, changes, {
          reason,
          origin,
          transaction,
          model: this,
          // The preview is the document the model adopts when no hook transforms the
          // changes, so a lane that published the preview holds the adopted object.
          preview: () =>
            (previewed ??= reduceFlowChanges(previous, changes, previousIndices)).document,
        });
        if (hooks.vetoedBy !== undefined) vetoedBy = hooks.vetoedBy;
        else if (hooks.changes !== changes) {
          changes = pruneNoopChanges(previous, hooks.changes, previousIndices);
          previewed = undefined;
        }
      }
    }

    if (vetoedBy !== undefined) {
      if (measured.size) this.#emitMeasure(measured, reason, origin, transaction);
      return { applied: false, changes: [], inverse: [], vetoedBy };
    }
    if (changes.length === 0) {
      if (measured.size) this.#emitMeasure(measured, reason, origin, transaction);
      return { applied: false, changes: [], inverse: [] };
    }

    const reduced = previewed ?? reduceFlowChanges(previous, changes, previousIndices);
    if (reduced.changes.length === 0) {
      if (measured.size) this.#emitMeasure(measured, reason, origin, transaction);
      return { applied: false, changes: [], inverse: [] };
    }
    const oldRects = this.#collectRects(reduced.changes, previousIndices);
    this.#adopt(reduced.document);
    const affected = this.#affected(reduced.changes, previousIndices, this.#indices);
    for (const id of measured) affected.nodes.add(id);
    this.#syncSpatial(affected.nodes);
    const dirtyRects = this.#dirtyRects(affected.nodes, oldRects);

    let historyChanged = false;
    if (this.#history && options.history !== false && !NON_RECORDING_ORIGINS.has(origin)) {
      if (this.#transaction?.open) {
        this.#transaction.forward.push(...reduced.changes);
        this.#transaction.inverse.unshift(...reduced.inverse);
      } else {
        const record: Parameters<FlowHistory['record']>[0] = {
          changes: reduced.changes,
          inverse: reduced.inverse,
          reason,
          origin,
        };
        if (options.label !== undefined) record.label = options.label;
        if (options.coalesce !== undefined) record.coalesceKey = options.coalesce;
        historyChanged = this.#history.record(record);
      }
    }

    const event: FlowChangeEvent = {
      changes: reduced.changes,
      inverse: reduced.inverse,
      reason,
      origin,
      transaction,
      document: this.#doc,
      previousDocument: previous,
      affectedNodes: affected.nodes,
      affectedEdges: affected.edges,
      dirtyRects,
    };
    if (options.label !== undefined) event.label = options.label;
    this.#emitter.emit('change', event);
    runAfterHooks(this.#middleware, event);
    if (historyChanged) this.#emitHistory();
    return { applied: true, changes: reduced.changes, inverse: reduced.inverse };
  }

  #emitMeasure(
    ids: ReadonlySet<string>,
    reason: ChangeReason,
    origin: FlowChangeOrigin,
    transaction: string | undefined,
  ): void {
    this.#syncSpatial(ids);
    const edges = new Set<string>();
    for (const id of ids) for (const edge of incidentEdges(this.#indices, id)) edges.add(edge);
    const changes: FlowChange[] = [...ids].map((id) => {
      const change: FlowChange = { type: 'node-measure', id };
      const measured = this.#runtime.measured.get(id);
      if (measured) change.measured = measured;
      const ports = this.#runtime.ports.get(id);
      if (ports) change.ports = ports;
      return change;
    });
    const event: FlowChangeEvent = {
      changes,
      inverse: [],
      reason,
      origin: origin === 'user' ? 'measure' : origin,
      transaction,
      document: this.#doc,
      previousDocument: this.#doc,
      affectedNodes: ids,
      affectedEdges: edges,
      dirtyRects: [...ids]
        .map((id) => this.nodeRect(id))
        .filter((rect): rect is FlowRect => rect !== undefined)
        .map((rect) => expandRect(rect, DIRTY_PADDING)),
    };
    this.#emitter.emit('change', event);
    runAfterHooks(this.#middleware, event);
  }

  #emitHistory(): void {
    if (this.#history) this.#emitter.emit('history', this.#history.state);
  }

  #adopt(doc: FlowDocument<N, E>): void {
    // Measured port geometry carries the sides of the old direction; drop it so the defaults
    // of the new direction apply until the hosts re-measure.
    if (doc.layout?.direction !== this.#doc.layout?.direction) this.#runtime.ports.clear();
    this.#doc = doc;
    this.#indices = buildIndices(doc);
    this.#stamp += 1;
    pruneRuntime(this.#runtime, this.#indices.nodes);
  }

  #affected(
    changes: readonly FlowChange[],
    before: FlowIndices,
    after: FlowIndices,
  ): { nodes: Set<string>; edges: Set<string> } {
    const nodes = new Set<string>();
    const edges = new Set<string>();
    for (const change of changes) {
      switch (change.type) {
        case 'node-add':
          nodes.add(change.node.id);
          break;
        case 'edge-add':
          edges.add(change.edge.id);
          break;
        case 'viewport':
          break;
        case 'layout-settings':
          // The direction moves every default port side: every node and edge is affected.
          for (const id of after.nodes.keys()) nodes.add(id);
          break;
        default:
          if (change.type.startsWith('node')) nodes.add(change.id);
          else edges.add(change.id);
      }
    }
    for (const id of [...nodes]) {
      for (const child of descendantsOf(before, id)) nodes.add(child);
      for (const child of descendantsOf(after, id)) nodes.add(child);
    }
    for (const id of nodes) {
      for (const edge of incidentEdges(before, id)) edges.add(edge);
      for (const edge of incidentEdges(after, id)) edges.add(edge);
    }
    return { nodes, edges };
  }

  #collectRects(changes: readonly FlowChange[], indices: FlowIndices): Map<string, FlowRect> {
    const rects = new Map<string, FlowRect>();
    const visit = (id: string): void => {
      if (rects.has(id)) return;
      const rect = this.#rectIn(id, indices);
      if (rect) rects.set(id, rect);
      for (const child of descendantsOf(indices, id)) visit(child);
    };
    for (const change of changes) {
      if (
        change.type === 'viewport' ||
        change.type === 'layout-settings' ||
        change.type === 'edge-add' ||
        change.type === 'node-add'
      )
        continue;
      if (change.type.startsWith('node')) visit((change as { id: string }).id);
    }
    return rects;
  }

  #dirtyRects(nodes: ReadonlySet<string>, oldRects: ReadonlyMap<string, FlowRect>): FlowRect[] {
    const result: FlowRect[] = [];
    for (const id of nodes) {
      const parts: FlowRect[] = [];
      const old = oldRects.get(id);
      const current = this.nodeRect(id);
      if (old) parts.push(old);
      if (current) parts.push(current);
      if (parts.length) result.push(expandRect(unionRects(parts), DIRTY_PADDING));
    }
    return result;
  }

  #syncSpatial(nodes: Iterable<string>): void {
    for (const id of nodes) {
      const node = this.#indices.nodes.get(id);
      const rect = node && !node.hidden ? this.nodeRect(id) : undefined;
      if (rect) this.#spatial.update(id, rect);
      else this.#spatial.remove(id);
    }
  }

  #rebuildSpatial(): void {
    this.#spatial.clear();
    for (const node of this.#doc.nodes) {
      if (node.hidden) continue;
      const rect = this.nodeRect(node.id);
      if (rect) this.#spatial.insert(node.id, rect);
    }
  }

  #clampContext(): { getNode(id: string): FlowNode | undefined; sizeOf(node: FlowNode): FlowSize } {
    return {
      getNode: (id) => this.#indices.nodes.get(id),
      sizeOf: (node) => this.nodeSize(node),
    };
  }

  #setSchema(schema: FlowSchema | undefined): void {
    this.#schema = schema;
    this.#definitions = new Map(
      schema?.nodes.map((definition) => [definition.type, definition]) ?? [],
    );
    this.#stamp += 1;
    this.#rebuildSpatial();
  }

  // Transactions -----------------------------------------------------------------------------

  transaction(options: FlowTransactionOptions = {}): FlowTransaction {
    if (this.#transaction?.open) {
      this.#transaction.depth += 1;
      return this.#transactionHandle(this.#transaction);
    }
    this.#transactionCounter += 1;
    const state: OpenTransaction = {
      id: options.id ?? `tx-${this.#transactionCounter}`,
      depth: 1,
      forward: [],
      inverse: [],
      options,
      open: true,
    };
    this.#transaction = state;
    return this.#transactionHandle(state);
  }

  #transactionHandle(state: OpenTransaction): FlowTransaction {
    return {
      get id() {
        return state.id;
      },
      get open() {
        return state.open;
      },
      apply: (changes, options = {}) => {
        if (!state.open) return { applied: false, changes: [], inverse: [] };
        return this.apply(changes, { ...state.options, ...options, transaction: state.id });
      },
      commit: () => {
        if (!state.open) return undefined;
        state.depth -= 1;
        if (state.depth > 0) return undefined;
        state.open = false;
        this.#transaction = undefined;
        const changes = squashFlowChanges(state.forward);
        const inverse = squashFlowChanges(state.inverse);
        if (!this.#history || changes.length === 0) return undefined;
        const record: Parameters<FlowHistory['record']>[0] = {
          changes,
          inverse,
          reason: state.options.reason ?? 'programmatic',
          origin: state.options.origin ?? 'user',
        };
        if (state.options.label !== undefined) record.label = state.options.label;
        if (state.options.coalesce !== undefined) record.coalesceKey = state.options.coalesce;
        if (this.#history.record(record)) this.#emitHistory();
        return this.#history.peekUndo();
      },
      rollback: (reason) => {
        if (!state.open) return { applied: false, changes: [], inverse: [] };
        state.open = false;
        state.depth = 0;
        this.#transaction = undefined;
        const inverse = squashFlowChanges(state.inverse);
        if (inverse.length === 0) return { applied: false, changes: [], inverse: [] };
        return this.apply(inverse, {
          reason: reason ?? state.options.reason ?? 'programmatic',
          origin: 'rollback',
          history: false,
          cascade: false,
          clamp: false,
          transaction: state.id,
        });
      },
    };
  }

  // History ----------------------------------------------------------------------------------

  get history(): FlowHistoryState {
    return this.#history?.state ?? { canUndo: false, canRedo: false, depth: 0 };
  }

  undo(reason: ChangeReason = 'programmatic'): boolean {
    const entry = this.#history?.peekUndo();
    if (!entry || !this.#history) return false;
    const result = this.apply(entry.inverse, {
      reason,
      origin: 'undo',
      history: false,
      cascade: false,
      clamp: false,
    });
    if (result.vetoedBy !== undefined || result.queued) return false;
    this.#history.undo();
    this.#emitHistory();
    return result.applied;
  }

  redo(reason: ChangeReason = 'programmatic'): boolean {
    const entry = this.#history?.peekRedo();
    if (!entry || !this.#history) return false;
    const result = this.apply(entry.changes, {
      reason,
      origin: 'redo',
      history: false,
      cascade: false,
      clamp: false,
    });
    if (result.vetoedBy !== undefined || result.queued) return false;
    this.#history.redo();
    this.#emitHistory();
    return result.applied;
  }

  clearHistory(): void {
    if (!this.#history) return;
    this.#history.clear();
    this.#emitHistory();
  }

  /**
   * Forgets the newest undo entries down to `depth` (a change its owner never published and
   * that was reconciled away); redo entries stay.
   */
  discardHistory(depth: number): void {
    if (!this.#history) return;
    const extra = this.#history.depth - Math.max(0, depth);
    if (extra > 0 && this.#history.discardNewest(extra) > 0) this.#emitHistory();
  }

  // Loading ----------------------------------------------------------------------------------

  /** Replaces the document wholesale; clears history unless `keepHistory`. */
  load(
    doc: FlowDocument<N, E>,
    options: { keepHistory?: boolean; reason?: ChangeReason } = {},
  ): FlowApplyResult {
    const result = this.#reconcile(doc, options.reason ?? 'programmatic');
    if (!options.keepHistory && this.#history) {
      this.#history.clear();
      this.#emitHistory();
    }
    return result;
  }

  /** Adopts an owner's document by identity diff (origin `external`, no history, hooks skipped). */
  reconcile(doc: FlowDocument<N, E>, reason: ChangeReason = 'programmatic'): FlowApplyResult {
    return this.#reconcile(doc, reason);
  }

  #reconcile(doc: FlowDocument<N, E>, reason: ChangeReason): FlowApplyResult {
    if (this.#applying) {
      this.#queue.push(() => {
        this.#reconcile(doc, reason);
      });
      return { applied: false, changes: [], inverse: [], queued: true };
    }
    const changes: FlowChange[] = [];
    const previous = this.#doc;
    const previousIndices = this.#indices;
    const nextNodes = normalizeNodeOrder(doc.nodes);
    const nextNodeIds = new Set<string>();
    nextNodes.forEach((node, index) => {
      nextNodeIds.add(node.id);
      const current = previousIndices.nodes.get(node.id);
      if (current === undefined) changes.push({ type: 'node-add', node, index });
      else if (current !== node) changes.push({ type: 'node-replace', id: node.id, node });
    });
    for (const id of previousIndices.nodes.keys())
      if (!nextNodeIds.has(id)) changes.push({ type: 'node-remove', id });
    const nextEdgeIds = new Set<string>();
    doc.edges.forEach((edge, index) => {
      nextEdgeIds.add(edge.id);
      const current = previousIndices.edges.get(edge.id);
      if (current === undefined) changes.push({ type: 'edge-add', edge, index });
      else if (current !== edge) changes.push({ type: 'edge-replace', id: edge.id, edge });
    });
    for (const id of previousIndices.edges.keys())
      if (!nextEdgeIds.has(id)) changes.push({ type: 'edge-remove', id });
    if (
      doc.viewport &&
      (!previous.viewport ||
        previous.viewport.x !== doc.viewport.x ||
        previous.viewport.y !== doc.viewport.y ||
        previous.viewport.zoom !== doc.viewport.zoom)
    )
      changes.push({ type: 'viewport', viewport: doc.viewport });
    if (JSON.stringify(doc.layout) !== JSON.stringify(previous.layout))
      changes.push({ type: 'layout-settings', layout: doc.layout });

    const sameOrder =
      nextNodes.length === previous.nodes.length &&
      doc.edges.length === previous.edges.length &&
      nextNodes.every((node, index) => previous.nodes[index]?.id === node.id) &&
      doc.edges.every((edge, index) => previous.edges[index]?.id === edge.id);
    const metaChanged =
      doc.layout !== previous.layout ||
      doc.metadata !== previous.metadata ||
      (!doc.viewport && previous.viewport);
    if (changes.length === 0 && sameOrder && !metaChanged) {
      if (this.#doc !== doc && nextNodes === doc.nodes) this.#doc = doc;
      return { applied: false, changes: [], inverse: [] };
    }

    this.#applying = true;
    try {
      const inverse = invertFlowChanges(previous, changes, previousIndices);
      const oldRects = this.#collectRects(changes, previousIndices);
      const adopted: FlowDocument<N, E> =
        nextNodes === doc.nodes ? doc : { ...doc, nodes: nextNodes };
      this.#adopt(adopted);
      this.#rebuildSpatial();
      const affected = this.#affected(changes, previousIndices, this.#indices);
      const event: FlowChangeEvent = {
        changes,
        inverse,
        reason,
        origin: 'external',
        transaction: undefined,
        document: this.#doc,
        previousDocument: previous,
        affectedNodes: affected.nodes,
        affectedEdges: affected.edges,
        dirtyRects: this.#dirtyRects(affected.nodes, oldRects),
      };
      this.#emitter.emit('change', event);
      runAfterHooks(this.#middleware, event);
      return { applied: true, changes, inverse };
    } finally {
      this.#applying = false;
      this.#drain();
    }
  }

  // Convenience mutations --------------------------------------------------------------------

  #nextId(kind: 'node' | 'edge'): string {
    const taken = kind === 'node' ? this.#indices.nodes : this.#indices.edges;
    for (let attempt = 0; attempt < 1000; attempt += 1) {
      this.#idCounter += 1;
      const id = this.#idFactory ? this.#idFactory(kind) : `${kind}-${this.#idCounter}`;
      if (!taken.has(id)) return id;
    }
    return `${kind}-${this.#idCounter}-${this.#now()}`;
  }

  addNode(
    input: FlowNodeInput<N>,
    options: FlowApplyOptions & { index?: number } = {},
  ): FlowAddNodeResult<N> {
    const node = { ...input, id: input.id ?? this.#nextId('node') } as unknown as N;
    const { index, ...rest } = options;
    const change: FlowChange =
      index === undefined ? { type: 'node-add', node } : { type: 'node-add', node, index };
    return { ...this.apply([change], rest), node };
  }

  addEdge(
    input: FlowEdgeInput<E>,
    options: FlowApplyOptions & { index?: number } = {},
  ): FlowApplyResult & { edge: E } {
    const edge = { ...input, id: input.id ?? this.#nextId('edge') } as unknown as E;
    const { index, ...rest } = options;
    const change: FlowChange =
      index === undefined ? { type: 'edge-add', edge } : { type: 'edge-add', edge, index };
    return { ...this.apply([change], rest), edge };
  }

  removeNodes(ids: readonly string[], options: FlowApplyOptions = {}): FlowApplyResult {
    return this.apply(
      ids.map((id): FlowChange => ({ type: 'node-remove', id })),
      options,
    );
  }

  removeEdges(ids: readonly string[], options: FlowApplyOptions = {}): FlowApplyResult {
    return this.apply(
      ids.map((id): FlowChange => ({ type: 'edge-remove', id })),
      options,
    );
  }

  /** Moves every node by `delta` (parent-relative positions), optionally snapping. */
  moveNodes(
    ids: readonly string[],
    delta: FlowPoint,
    options: FlowApplyOptions & { dragging?: boolean; snap?: readonly [number, number] } = {},
  ): FlowApplyResult {
    const { dragging, snap, ...rest } = options;
    const changes: FlowChange[] = [];
    for (const id of ids) {
      const node = this.#indices.nodes.get(id);
      if (!node) continue;
      let position = { x: node.position.x + delta.x, y: node.position.y + delta.y };
      if (snap) {
        position = {
          x: snap[0] > 0 ? Math.round(position.x / snap[0]) * snap[0] : position.x,
          y: snap[1] > 0 ? Math.round(position.y / snap[1]) * snap[1] : position.y,
        };
      }
      const change: FlowChange =
        dragging === undefined
          ? { type: 'node-position', id, position }
          : { type: 'node-position', id, position, dragging };
      changes.push(change);
    }
    return this.apply(changes, rest);
  }

  updateNode(
    id: string,
    patch: Extract<FlowChange, { type: 'node-update' }>['patch'],
    options: FlowApplyOptions = {},
  ): FlowApplyResult {
    return this.apply([{ type: 'node-update', id, patch }], options);
  }

  updateNodeData(
    id: string,
    data: Record<string, unknown>,
    options: FlowApplyOptions = {},
  ): FlowApplyResult {
    const node = this.#indices.nodes.get(id);
    if (!node) return { applied: false, changes: [], inverse: [] };
    return this.apply([{ type: 'node-data', id, data: { ...node.data, ...data } }], options);
  }

  updateEdge(
    id: string,
    patch: Extract<FlowChange, { type: 'edge-update' }>['patch'],
    options: FlowApplyOptions = {},
  ): FlowApplyResult {
    return this.apply([{ type: 'edge-update', id, patch }], options);
  }

  /** Validates and adds (or reconnects) an edge; rejected connections apply nothing. */
  connect(
    connection: FlowConnection,
    edge: Partial<E> = {},
    options: FlowConnectOptions = {},
  ): FlowConnectResult {
    const { reconnect, ...rest } = options;
    const validationOptions: FlowConnectionValidationOptions = {};
    if (reconnect !== undefined) validationOptions.ignoreEdge = reconnect;
    const validation = this.validateConnection(connection, validationOptions);
    if (!validation.valid) return { applied: false, changes: [], inverse: [], validation };
    const oriented = validation.connection;
    if (reconnect !== undefined) {
      const existing = this.#indices.edges.get(reconnect);
      if (!existing) return { applied: false, changes: [], inverse: [], validation };
      const patch: Extract<FlowChange, { type: 'edge-update' }>['patch'] = {
        ...definedOnly(edge as Partial<FlowEdge>),
        source: oriented.source,
        sourcePort: oriented.sourcePort,
        target: oriented.target,
        targetPort: oriented.targetPort,
      };
      const result = this.apply([{ type: 'edge-update', id: reconnect, patch }], rest);
      const updated = this.#indices.edges.get(reconnect);
      return updated ? { ...result, validation, edge: updated } : { ...result, validation };
    }
    const created = {
      ...definedOnly(edge as Partial<FlowEdge>),
      id: edge.id ?? this.#nextId('edge'),
      source: oriented.source,
      target: oriented.target,
    } as FlowEdge;
    if (oriented.sourcePort !== undefined) created.sourcePort = oriented.sourcePort;
    else delete created.sourcePort;
    if (oriented.targetPort !== undefined) created.targetPort = oriented.targetPort;
    else delete created.targetPort;
    const result = this.apply([{ type: 'edge-add', edge: created }], rest);
    return { ...result, validation, edge: created };
  }

  /** Selects node and edge ids: `replace` clears the rest, `add` extends, `toggle` flips. */
  select(
    ids: readonly string[],
    mode: FlowSelectMode = 'replace',
    options: FlowApplyOptions = {},
  ): FlowApplyResult {
    const wanted = new Set(ids);
    const changes: FlowChange[] = [];
    if (mode === 'replace') {
      for (const node of this.#doc.nodes) {
        const selected = wanted.has(node.id) && node.selectable !== false;
        if (Boolean(node.selected) !== selected)
          changes.push({ type: 'node-select', id: node.id, selected });
      }
      for (const edge of this.#doc.edges) {
        const selected = wanted.has(edge.id) && edge.selectable !== false;
        if (Boolean(edge.selected) !== selected)
          changes.push({ type: 'edge-select', id: edge.id, selected });
      }
    } else {
      for (const id of wanted) {
        const node = this.#indices.nodes.get(id);
        const edge = node ? undefined : this.#indices.edges.get(id);
        const item = node ?? edge;
        if (!item || item.selectable === false) continue;
        const selected = mode === 'add' ? true : !item.selected;
        changes.push(
          node ? { type: 'node-select', id, selected } : { type: 'edge-select', id, selected },
        );
      }
    }
    return this.apply(changes, { cascade: false, clamp: false, ...options });
  }

  clearSelection(options: FlowApplyOptions = {}): FlowApplyResult {
    return this.select([], 'replace', options);
  }

  /** Records a node's measured size and port boxes (runtime only). */
  measure(
    id: string,
    measured: FlowSize | undefined,
    ports?: readonly FlowPortGeometry[],
  ): FlowApplyResult {
    const change: FlowChange = { type: 'node-measure', id, measured };
    if (ports !== undefined) change.ports = ports;
    return this.apply([change], { origin: 'measure', history: false });
  }

  // Lookups ----------------------------------------------------------------------------------

  getNode(id: string): N | undefined {
    return this.#indices.nodes.get(id) as N | undefined;
  }

  getEdge(id: string): E | undefined {
    return this.#indices.edges.get(id) as E | undefined;
  }

  definitionOf(node: FlowNode | string): FlowNodeDefinition | undefined {
    const item = typeof node === 'string' ? this.#indices.nodes.get(node) : node;
    return item ? this.#definitions.get(item.type) : undefined;
  }

  /** Effective size: measured → persisted → definition → shape default. */
  nodeSize(node: FlowNode): FlowSize {
    // A declared size is the box the host is given (resized nodes); measurements describe
    // auto-sized hosts.
    if (node.size) return node.size;
    const measured = this.#runtime.measured.get(node.id);
    if (measured) return measured;
    const definition = this.#definitions.get(node.type);
    return definition?.size ?? DEFAULT_NODE_SIZE_BY_SHAPE[definition?.shape ?? 'card'];
  }

  /** Absolute rect of a node. */
  nodeRect(id: string): FlowRect | undefined {
    return this.#rectIn(id, this.#indices);
  }

  #rectIn(id: string, indices: FlowIndices): FlowRect | undefined {
    const node = indices.nodes.get(id);
    const position = indices.absolute.get(id);
    if (!node || !position) return undefined;
    const size = this.nodeSize(node);
    return { x: position.x, y: position.y, width: size.width, height: size.height };
  }

  measuredSize(id: string): FlowSize | undefined {
    return this.#runtime.measured.get(id);
  }

  absolutePosition(id: string): FlowPoint | undefined {
    return this.#indices.absolute.get(id);
  }

  /** Converts an absolute point to the coordinate space of `parentId` (identity without a parent). */
  toRelativePosition(absolute: FlowPoint, parentId?: string): FlowPoint {
    const parent = parentId === undefined ? undefined : this.#indices.absolute.get(parentId);
    return parent
      ? { x: absolute.x - parent.x, y: absolute.y - parent.y }
      : { x: absolute.x, y: absolute.y };
  }

  children(id: string): readonly string[] {
    return this.#indices.children.get(id) ?? EMPTY_IDS;
  }

  descendants(id: string): string[] {
    return descendantsOf(this.#indices, id);
  }

  ancestors(id: string): string[] {
    return ancestorsOf(this.#indices, id);
  }

  get layoutDirection(): FlowLayoutMode | undefined {
    return this.#doc.layout?.direction;
  }

  /** Definition ports merged with instance overrides, with measured or default geometry. */
  ports(id: string): readonly FlowResolvedPort[] {
    const node = this.#indices.nodes.get(id);
    if (!node) return EMPTY_PORTS;
    const cached = this.#portCache.get(id);
    if (cached && cached.node === node && cached.stamp === this.#stamp) return cached.ports;
    const definition = this.#definitions.get(node.type);
    const base = definition?.ports ?? [];
    const merged: FlowPortDefinition[] = base.map((port) => {
      const instance = node.ports?.find((item) => item.id === port.id);
      return instance ? { ...port, ...definedOnly(instance) } : port;
    });
    for (const instance of node.ports ?? [])
      if (!base.some((port) => port.id === instance.id))
        merged.push({ direction: 'input', ...definedOnly(instance), id: instance.id });
    const size = this.nodeSize(node);
    const measured = this.#runtime.ports.get(id);
    const layout = this.#doc.layout?.direction;
    const sideOf = (port: FlowPortDefinition): FlowSide =>
      port.side ??
      measured?.find((item) => item.id === port.id)?.side ??
      defaultSide(port.direction, layout);
    const perSide = new Map<FlowSide, FlowPortDefinition[]>();
    for (const port of merged) {
      if (port.hidden) continue;
      const side = sideOf(port);
      const list = perSide.get(side);
      if (list) list.push(port);
      else perSide.set(side, [port]);
    }
    const ports: FlowResolvedPort[] = merged.map((port) => {
      const side = sideOf(port);
      const siblings = perSide.get(side) ?? [];
      const index = Math.max(siblings.indexOf(port), 0);
      const count = siblings.length || 1;
      const box = measured?.find((item) => item.id === port.id);
      const resolved: FlowResolvedPort = {
        ...port,
        nodeId: id,
        geometry: box
          ? { ...box }
          : { id: port.id, ...defaultPortGeometry(size, side, index, count) },
        index,
        count,
      };
      if (box) resolved.measured = true;
      return resolved;
    });
    this.#portCache.set(id, { node, stamp: this.#stamp, ports });
    return ports;
  }

  portGeometry(nodeId: string, portId: string): FlowPortGeometry | undefined {
    return this.ports(nodeId).find((port) => port.id === portId)?.geometry;
  }

  edgeKind(edge: FlowEdge): FlowEdgeKind {
    return edge.kind ?? this.#schema?.rules?.defaultEdgeKind ?? DEFAULT_EDGE_KIND;
  }

  edgeOptions(edge: FlowEdge): Required<FlowEdgeKindOptions> {
    const kind = this.edgeKind(edge);
    return edgeKindOptions(kind, this.#schema?.edgeKinds?.[kind], edge.options);
  }

  /** Where an edge end attaches: measured or default port geometry on the resolved side. */
  endpoint(edge: FlowEdge | string, end: 'source' | 'target'): FlowEndpoint | undefined {
    const item = typeof edge === 'string' ? this.#indices.edges.get(edge) : edge;
    if (!item) return undefined;
    const kind = this.edgeKind(item);
    const layout = this.#doc.layout?.direction;
    const resolve = (
      which: 'source' | 'target',
      other: FlowPoint | undefined,
    ): FlowEndpoint | undefined => {
      const nodeId = which === 'source' ? item.source : item.target;
      const rect = this.nodeRect(nodeId);
      if (!rect) return undefined;
      const direction: FlowPortDirection = which === 'source' ? 'output' : 'input';
      return resolveEndpoint({
        nodeId,
        rect,
        ports: this.ports(nodeId),
        portId: which === 'source' ? item.sourcePort : item.targetPort,
        direction,
        layout,
        kind,
        other,
        loose: true,
      });
    };
    const otherEnd = resolve(end === 'source' ? 'target' : 'source', undefined);
    return resolve(end, otherEnd?.point);
  }

  endpoints(edge: FlowEdge | string): { source: FlowEndpoint; target: FlowEndpoint } | undefined {
    const source = this.endpoint(edge, 'source');
    const target = this.endpoint(edge, 'target');
    return source && target ? { source, target } : undefined;
  }

  // Graph queries ----------------------------------------------------------------------------

  incomers(id: string): N[] {
    const result: N[] = [];
    for (const edgeId of this.#indices.incoming.get(id) ?? []) {
      const edge = this.#indices.edges.get(edgeId);
      const node = edge ? this.#indices.nodes.get(edge.source) : undefined;
      if (node && !result.includes(node as N)) result.push(node as N);
    }
    return result;
  }

  outgoers(id: string): N[] {
    const result: N[] = [];
    for (const edgeId of this.#indices.outgoing.get(id) ?? []) {
      const edge = this.#indices.edges.get(edgeId);
      const node = edge ? this.#indices.nodes.get(edge.target) : undefined;
      if (node && !result.includes(node as N)) result.push(node as N);
    }
    return result;
  }

  /** Edges touching any of the nodes, in document order. */
  connectedEdges(ids: readonly string[]): E[] {
    const wanted = new Set(ids);
    return this.#doc.edges.filter((edge) => wanted.has(edge.source) || wanted.has(edge.target));
  }

  /** Edge ids attached to a node, a direction or a specific port (unported edges count for the default port). */
  portConnections(
    nodeId: string,
    direction?: 'input' | 'output',
    portId?: string,
  ): readonly string[] {
    const ends: Array<'source' | 'target'> =
      direction === 'output'
        ? ['source']
        : direction === 'input'
          ? ['target']
          : ['source', 'target'];
    const result: string[] = [];
    for (const end of ends) {
      if (portId === undefined) {
        for (const record of this.#indices.connections.get(connectionKey(end, nodeId)) ?? [])
          result.push(record.edgeId);
        continue;
      }
      for (const record of this.#indices.connections.get(connectionKey(end, nodeId, portId)) ?? [])
        result.push(record.edgeId);
      const natural: FlowPortDirection = end === 'source' ? 'output' : 'input';
      const fallback = pickPort(this.ports(nodeId), undefined, natural);
      if (fallback?.id === portId)
        for (const record of this.#indices.connections.get(connectionKey(end, nodeId, '')) ?? [])
          result.push(record.edgeId);
    }
    return result;
  }

  topologicalOrder(): string[] {
    return topologicalOrder(this.#doc);
  }

  hasCycle(): boolean {
    return hasCycle(this.#doc);
  }

  wouldCreateCycle(source: string, target: string, ignoreEdge?: string): boolean {
    return wouldCreateCycle(buildAdjacency(this.#doc, ignoreEdge), source, target);
  }

  reachable(
    from: string | readonly string[],
    direction: 'downstream' | 'upstream' | 'both' = 'downstream',
  ): Set<string> {
    return reachable(this.#doc, from, direction);
  }

  connectedComponents(): string[][] {
    return connectedComponents(this.#doc);
  }

  /** Bounds of the given nodes (default: every visible node). */
  bounds(ids?: readonly string[]): FlowRect {
    const rects: FlowRect[] = [];
    const list = ids ?? this.#doc.nodes.filter((node) => !node.hidden).map((node) => node.id);
    for (const id of list) {
      const rect = this.nodeRect(id);
      if (rect) rects.push(rect);
    }
    return unionRects(rects);
  }

  // Spatial queries --------------------------------------------------------------------------

  nodesInRect(rect: FlowRect, partially = true): string[] {
    const ids = this.#spatial.queryRect(rect, partially);
    const order = this.#indices.nodeIndex;
    return ids.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  }

  /** Node z values with selection and child elevation. */
  nodeZ(id: string): number {
    if (this.#zCache?.doc !== this.#doc) this.#zCache = { doc: this.#doc, z: new Map() };
    const cache = this.#zCache.z;
    const cached = cache.get(id);
    if (cached !== undefined) return cached;
    const node = this.#indices.nodes.get(id);
    if (!node) return 0;
    const parentZ =
      node.parentId !== undefined && this.#indices.nodes.has(node.parentId) && node.parentId !== id
        ? this.nodeZ(node.parentId)
        : undefined;
    const z = nodeZ(node, parentZ);
    cache.set(id, z);
    return z;
  }

  /** The topmost node under `point` (highest z, then latest in document order). */
  nodeAt(point: FlowPoint): N | undefined {
    const candidates = this.#spatial.queryPoint(point);
    let best: N | undefined;
    let bestZ = -Infinity;
    let bestIndex = -1;
    for (const id of candidates) {
      const node = this.#indices.nodes.get(id) as N | undefined;
      if (!node) continue;
      const z = this.nodeZ(id);
      const index = this.#indices.nodeIndex.get(id) ?? 0;
      if (z > bestZ || (z === bestZ && index > bestIndex)) {
        best = node;
        bestZ = z;
        bestIndex = index;
      }
    }
    return best;
  }

  /** Absolute center of a port. */
  portCenter(nodeId: string, portId: string): FlowPoint | undefined {
    const rect = this.nodeRect(nodeId);
    const port = this.ports(nodeId).find((item) => item.id === portId);
    if (!rect || !port) return undefined;
    return {
      x: rect.x + port.geometry.x + port.geometry.width / 2,
      y: rect.y + port.geometry.y + port.geometry.height / 2,
    };
  }

  /** The nearest accepted port within `radius` of `point`; ties keep document order. */
  portNear(
    point: FlowPoint,
    radius: number,
    filter?: (port: FlowResolvedPort, node: N) => boolean,
  ): FlowPortHit | undefined {
    const candidates = this.#spatial.queryRect({
      x: point.x - radius,
      y: point.y - radius,
      width: radius * 2,
      height: radius * 2,
    });
    const order = this.#indices.nodeIndex;
    candidates.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
    let best: FlowPortHit | undefined;
    for (const id of candidates) {
      const node = this.#indices.nodes.get(id) as N | undefined;
      const rect = this.nodeRect(id);
      if (!node || !rect) continue;
      for (const port of this.ports(id)) {
        if (port.hidden) continue;
        if (filter && !filter(port, node)) continue;
        const center = {
          x: rect.x + port.geometry.x + port.geometry.width / 2,
          y: rect.y + port.geometry.y + port.geometry.height / 2,
        };
        const box = {
          x: rect.x + port.geometry.x,
          y: rect.y + port.geometry.y,
          width: port.geometry.width,
          height: port.geometry.height,
        };
        const distance = rectContainsPoint(box, point)
          ? 0
          : Math.hypot(center.x - point.x, center.y - point.y);
        if (distance > radius) continue;
        if (!best || distance < best.distance) best = { nodeId: id, port, point: center, distance };
      }
    }
    return best;
  }

  // Validation -------------------------------------------------------------------------------

  validateConnection(
    connection: FlowConnection,
    options: FlowConnectionValidationOptions = {},
  ): FlowConnectionResult {
    const merged: FlowConnectionValidationOptions = { ...options };
    if (merged.isValidConnection === undefined && this.#isValidConnection)
      merged.isValidConnection = this.#isValidConnection;
    return validateConnection(connection, this, merged);
  }

  validate(): FlowIssue[] {
    return validateDocument(this.#doc, this.#schema, this);
  }

  // Serialization ----------------------------------------------------------------------------

  toJSON(options: FlowSerializeOptions = {}): FlowDocument<N, E> {
    return serializeFlowDocument(this.#doc, options);
  }

  static fromJSON<N extends FlowNode = FlowNode, E extends FlowEdge = FlowEdge>(
    input: unknown,
    options: FlowParseOptions & Omit<FlowModelOptions<N, E>, 'document'> = {},
  ): FlowModel<N, E> {
    const { migrations, strict, ...modelOptions } = options;
    const parseOptions: FlowParseOptions = {};
    if (migrations !== undefined) parseOptions.migrations = migrations;
    if (strict !== undefined) parseOptions.strict = strict;
    const { document } = parseFlowDocument<N, E>(input, parseOptions);
    return new FlowModel<N, E>({ ...modelOptions, document });
  }

  static migrate(input: unknown, migrations?: readonly FlowMigration[]): unknown {
    return migrateFlowDocument(input, migrations);
  }
}
