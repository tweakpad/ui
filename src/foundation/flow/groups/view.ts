import { DEFAULT_LAYOUT_OPTIONS, DEFAULT_NODE_SIZE_BY_SHAPE } from '../defaults.js';
import { defaultPortGeometry, defaultSide, resolveEndpoint } from '../edges/endpoints.js';
import {
  expandRect,
  rectContains,
  rectContainsPoint,
  rectsEqual,
  rectsIntersect,
  unionRects,
} from '../geometry.js';
import type { FlowChangeEvent } from '../model/hooks.js';
import type { FlowApplyResult, FlowModel, FlowPortHit } from '../model/model.js';
import type {
  FlowChange,
  FlowConnection,
  FlowDocument,
  FlowEdge,
  FlowEdgeKind,
  FlowEdgeKindOptions,
  FlowEdgeRelation,
  FlowEndpoint,
  FlowGroupTerminal,
  FlowGroupTerminals,
  FlowLayoutDirection,
  FlowLayoutMode,
  FlowNode,
  FlowNodeDefinition,
  FlowPoint,
  FlowPortGeometry,
  FlowRect,
  FlowResolvedPort,
  FlowSchema,
  FlowSize,
} from '../types.js';
import {
  FLOW_TERMINAL_TYPES,
  flowEdgeLevel,
  flowEdgeRelation,
  flowTerminalId,
  inwardEnds,
  parseFlowTerminalId,
} from './relations.js';

/**
 * The read surface the canvas layers and interaction sessions use (Widgets §6.3 Properties,
 * `path`). `FlowModel` satisfies it for the whole document; `FlowScopeView` for the inside of a
 * group. Coordinates are document-absolute in every scope.
 */
export interface FlowGraphView {
  /** The schema of the model. */
  readonly schema: FlowSchema | undefined;
  /** The document layout direction. */
  readonly layoutDirection: FlowLayoutMode | undefined;
  /** The nodes of the view, in document order. */
  readonly nodes: readonly FlowNode[];
  /** The edges of the view, in document order. */
  readonly edges: readonly FlowEdge[];
  /** A node of the view (`undefined` outside it). */
  getNode(id: string): FlowNode | undefined;
  /** An edge of the view (`undefined` outside it). */
  getEdge(id: string): FlowEdge | undefined;
  /** The definition a node is drawn from. */
  definitionOf(node: FlowNode | string): FlowNodeDefinition | undefined;
  /** Whether a node is a group. */
  isGroup(node: FlowNode | string): boolean;
  /** Effective size: declared, measured, definition or shape default. */
  nodeSize(node: FlowNode): FlowSize;
  /** The size a node's host is given (none for a collapsed group). */
  declaredSize(node: FlowNode): FlowSize | undefined;
  /** Absolute rect of a node of the view. */
  nodeRect(id: string): FlowRect | undefined;
  /** Absolute position of a node of the view. */
  absolutePosition(id: string): FlowPoint | undefined;
  /** Stacking value with selection and child elevation. */
  nodeZ(id: string): number;
  /** Direct members of a node, in document order. */
  children(id: string): readonly string[];
  /** Every member of a node at any depth. */
  descendants(id: string): string[];
  /** The parent chain of a node, nearest first. */
  ancestors(id: string): string[];
  /** Resolved ports of a node of the view. */
  ports(id: string): readonly FlowResolvedPort[];
  /** Edge ids at a node, a direction (edge end) or a port. */
  portConnections(
    nodeId: string,
    direction?: 'input' | 'output',
    portId?: string,
  ): readonly string[];
  /** The path kind an edge is drawn with. */
  edgeKind(edge: FlowEdge): FlowEdgeKind;
  /** The resolved path options of an edge. */
  edgeOptions(edge: FlowEdge): Required<FlowEdgeKindOptions>;
  /** How an edge relates to the group tree. */
  edgeRelation(edge: FlowConnection): FlowEdgeRelation;
  /** Where an edge end attaches. */
  endpoint(edge: FlowEdge | string, end: 'source' | 'target'): FlowEndpoint | undefined;
  /** Both ends of an edge. */
  endpoints(edge: FlowEdge | string): { source: FlowEndpoint; target: FlowEndpoint } | undefined;
  /** Node ids intersecting (or, with `partially` false, inside) a rect. */
  nodesInRect(rect: FlowRect, partially?: boolean): string[];
  /** The topmost node under a point. */
  nodeAt(point: FlowPoint): FlowNode | undefined;
  /** The nearest accepted port within `radius` of a point. */
  portNear(
    point: FlowPoint,
    radius: number,
    filter?: (port: FlowResolvedPort, node: FlowNode) => boolean,
  ): FlowPortHit | undefined;
  /** Absolute center of a port. */
  portCenter(nodeId: string, portId: string): FlowPoint | undefined;
  /** Bounds of the given nodes (default: every node of the view). */
  bounds(ids?: readonly string[]): FlowRect;
  /** Records a node's measured size and port boxes (runtime only). */
  measure(
    id: string,
    measured: FlowSize | undefined,
    ports?: readonly FlowPortGeometry[],
  ): FlowApplyResult;
}

/** Options of a `FlowScopeView`: the entered path and the terminal placement inputs. */
export interface FlowScopeViewOptions {
  /** Group ids from the root, outermost first; empty (default) is the root. */
  path?: readonly string[];
  /** Axis of the automatic terminal placement (default: the document layout direction). */
  direction?: FlowLayoutDirection;
  /** Gap between the terminals and the members of the group (default 80). */
  rankSpacing?: number;
}

const TERMINAL_KINDS: readonly FlowGroupTerminal[] = ['inputs', 'outputs'];

const TERMINAL_DEFINITIONS: Readonly<Record<FlowGroupTerminal, FlowNodeDefinition>> = {
  inputs: Object.freeze({
    type: FLOW_TERMINAL_TYPES.inputs,
    label: 'Inputs',
    shape: 'panel' as const,
    ports: [],
  }),
  outputs: Object.freeze({
    type: FLOW_TERMINAL_TYPES.outputs,
    label: 'Outputs',
    shape: 'panel' as const,
    ports: [],
  }),
};

const EMPTY_PORTS: readonly FlowResolvedPort[] = Object.freeze([]);
const EMPTY_IDS: readonly string[] = Object.freeze([]);
const NOTHING: FlowApplyResult = Object.freeze({
  applied: false,
  changes: [],
  inverse: [],
}) as FlowApplyResult;

/** Which ends of an edge attach to the scope group's terminals. */
interface MappedEnds {
  source: boolean;
  target: boolean;
}

interface Membership {
  doc: FlowDocument;
  schema: FlowSchema | undefined;
  pathKey: string;
  /** The effective path: the longest valid prefix of the requested one. */
  path: readonly string[];
  scope: string | undefined;
  /** Document nodes in scope. */
  inScope: ReadonlySet<string>;
  /** In-scope nodes whose members show (expanded groups, other parents), and the scope. */
  opens: ReadonlySet<string>;
  /** Document order of every node. */
  order: ReadonlyMap<string, number>;
  nodes: readonly FlowNode[];
  edges: readonly FlowEdge[];
  edgeIds: ReadonlySet<string>;
  mapped: ReadonlyMap<string, MappedEnds>;
  /** Terminal kinds available in this scope (no document node takes their id). */
  terminals: readonly FlowGroupTerminal[];
}

interface Terminal {
  id: string;
  kind: FlowGroupTerminal;
  node: FlowNode;
  rect: FlowRect;
}

interface TerminalState {
  membership: Membership;
  revision: number;
  byKind: Map<FlowGroupTerminal, Terminal>;
  nodes: readonly FlowNode[];
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => b[index] === id);
}

/**
 * A `FlowGraphView` of the inside of a group (Widgets §6.3 Properties, `path`): the descendants of
 * the last group on the path, through expanded nested groups and without the members of collapsed
 * ones, the edges of those levels, and the group's two boundary terminals, synthetic nodes whose
 * ports are the group's ports with the direction flipped. At the root of a document without
 * nesting every read is the model's own. Membership is cached per document identity and path.
 */
export class FlowScopeView implements FlowGraphView {
  readonly #model: FlowModel;
  #path: readonly string[];
  #direction: FlowLayoutDirection | undefined;
  #rankSpacing: number;
  #membership: Membership | undefined;
  #terminals: TerminalState | undefined;
  /** Bumped on every model event and terminal measurement; terminal placement keys on it. */
  #revision = 0;
  readonly #terminalSizes = new Map<FlowGroupTerminal, FlowSize>();
  readonly #terminalPorts = new Map<FlowGroupTerminal, readonly FlowPortGeometry[]>();
  readonly #portCache = new Map<
    FlowGroupTerminal,
    { key: unknown[]; ports: readonly FlowResolvedPort[] }
  >();
  readonly #listeners = new Set<(event: FlowChangeEvent) => void>();
  #unsubscribe: (() => void) | undefined;
  #lastRects = new Map<string, FlowRect>();

  constructor(model: FlowModel, options: FlowScopeViewOptions = {}) {
    this.#model = model;
    this.#path = [...(options.path ?? [])];
    this.#direction = options.direction;
    this.#rankSpacing = options.rankSpacing ?? DEFAULT_LAYOUT_OPTIONS.rankSpacing;
    this.#unsubscribe = model.subscribe((event) => this.#forward(event));
  }

  /** The model this view reads; writes go to it. */
  get model(): FlowModel {
    return this.#model;
  }

  /** The requested path (group ids from the root); setting it re-scopes the view. */
  get path(): readonly string[] {
    return this.#path;
  }

  set path(path: readonly string[]) {
    if (sameIds(path, this.#path)) return;
    this.#path = [...path];
    this.#revision += 1;
  }

  /** The effective path: the requested one truncated at the first id that is not a nested group. */
  get effectivePath(): readonly string[] {
    return this.#state().path;
  }

  /** The group the view shows the inside of, `undefined` at the root. */
  get scope(): string | undefined {
    return this.#state().scope;
  }

  /** Axis of the automatic terminal placement; `undefined` follows the document layout. */
  get direction(): FlowLayoutDirection | undefined {
    return this.#direction;
  }

  set direction(direction: FlowLayoutDirection | undefined) {
    if (direction === this.#direction) return;
    this.#direction = direction;
    this.#revision += 1;
  }

  /** Stops following the model; the view keeps answering from the model's current state. */
  dispose(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#listeners.clear();
  }

  /**
   * Model change events, widened by the terminals that moved with them, plus the measurement of
   * a terminal (a `node-measure` change on its id).
   */
  subscribe(listener: (event: FlowChangeEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  // Membership --------------------------------------------------------------------------------

  /** The root of a document without nesting: every read is the model's. */
  get #direct(): boolean {
    return this.#path.length === 0 && !this.#model.nested;
  }

  #state(): Membership {
    const model = this.#model;
    const doc = model.document;
    const pathKey = this.#path.join('\u0000');
    const cached = this.#membership;
    if (
      cached &&
      cached.doc === doc &&
      cached.schema === model.schema &&
      cached.pathKey === pathKey
    )
      return cached;
    const membership = this.#build(doc, pathKey);
    this.#membership = membership;
    return membership;
  }

  #build(doc: FlowDocument, pathKey: string): Membership {
    const model = this.#model;
    const path: string[] = [];
    for (const id of this.#path) {
      const node = model.getNode(id);
      const previous = path[path.length - 1];
      if (!node || !model.isGroup(node)) break;
      if (previous !== undefined && !model.ancestors(id).includes(previous)) break;
      path.push(id);
    }
    const scope = path[path.length - 1];
    const inScope = new Set<string>();
    const opens = new Set<string>();
    if (scope !== undefined) opens.add(scope);
    const order = new Map<string, number>();
    const nodes: FlowNode[] = [];
    // Parents precede their children, so one pass decides every node from its parent.
    doc.nodes.forEach((node, index) => {
      order.set(node.id, index);
      const parent =
        node.parentId !== undefined && model.getNode(node.parentId) ? node.parentId : undefined;
      const visible = parent === undefined ? scope === undefined : opens.has(parent);
      if (!visible || node.hidden || node.id === scope) return;
      inScope.add(node.id);
      nodes.push(node);
      if (!(node.collapsed && model.isGroup(node))) opens.add(node.id);
    });
    const terminals =
      scope === undefined
        ? []
        : TERMINAL_KINDS.filter((kind) => !model.getNode(flowTerminalId(scope, kind)));
    const present = (id: string): boolean => inScope.has(id) || id === scope;
    const edges: FlowEdge[] = [];
    const edgeIds = new Set<string>();
    const mapped = new Map<string, MappedEnds>();
    for (const edge of doc.edges) {
      if (!present(edge.source) || !present(edge.target)) continue;
      const level = flowEdgeLevel(model, edge);
      let shown: boolean;
      if (level === null) shown = inScope.has(edge.source) && inScope.has(edge.target);
      else if (level === scope) shown = true;
      else shown = level !== undefined && inScope.has(level) && opens.has(level);
      if (!shown) continue;
      if (scope !== undefined && (edge.source === scope || edge.target === scope)) {
        // An end on the scope group is drawn at its terminal: inputs feed, outputs collect.
        const ends: MappedEnds = { source: edge.source === scope, target: edge.target === scope };
        if (ends.source && !terminals.includes('inputs')) continue;
        if (ends.target && !terminals.includes('outputs')) continue;
        mapped.set(edge.id, ends);
      }
      edges.push(edge);
      edgeIds.add(edge.id);
    }
    return {
      doc,
      schema: model.schema,
      pathKey,
      path,
      scope,
      inScope,
      opens,
      order,
      nodes,
      edges,
      edgeIds,
      mapped,
      terminals,
    };
  }

  // Terminals ---------------------------------------------------------------------------------

  #terminalState(): TerminalState {
    const membership = this.#state();
    const cached = this.#terminals;
    if (cached && cached.membership === membership && cached.revision === this.#revision)
      return cached;
    const byKind = new Map<FlowGroupTerminal, Terminal>();
    const scope = membership.scope;
    if (scope !== undefined)
      for (const kind of membership.terminals) {
        const rect = this.#placeTerminal(scope, kind, membership);
        if (!rect) continue;
        const id = flowTerminalId(scope, kind);
        const previous = cached?.byKind.get(kind);
        const node =
          previous &&
          previous.id === id &&
          previous.node.position.x === rect.x &&
          previous.node.position.y === rect.y
            ? previous.node
            : {
                id,
                type: FLOW_TERMINAL_TYPES[kind],
                position: { x: rect.x, y: rect.y },
                data: {},
                selectable: false,
                deletable: false,
              };
        byKind.set(kind, { id, kind, node, rect });
      }
    const extra = [...byKind.values()].map((terminal) => terminal.node);
    const sameNodes =
      cached &&
      cached.membership === membership &&
      cached.nodes.length === membership.nodes.length + extra.length &&
      extra.every((node, index) => cached.nodes[membership.nodes.length + index] === node);
    const nodes = sameNodes
      ? cached.nodes
      : extra.length
        ? [...membership.nodes, ...extra]
        : membership.nodes;
    const state: TerminalState = { membership, revision: this.#revision, byKind, nodes };
    this.#terminals = state;
    return state;
  }

  #axis(): FlowLayoutDirection {
    return (
      this.#direction ?? (this.#model.layoutDirection === 'vertical' ? 'vertical' : 'horizontal')
    );
  }

  #terminalSize(kind: FlowGroupTerminal): FlowSize {
    return this.#terminalSizes.get(kind) ?? DEFAULT_NODE_SIZE_BY_SHAPE.panel;
  }

  #placeTerminal(
    scope: string,
    kind: FlowGroupTerminal,
    membership: Membership,
  ): FlowRect | undefined {
    const model = this.#model;
    const group = model.getNode(scope);
    const origin = model.absolutePosition(scope);
    if (!group || !origin) return undefined;
    const size = this.#terminalSize(kind);
    const persisted = group.terminals?.[kind];
    if (persisted) return { x: origin.x + persisted.x, y: origin.y + persisted.y, ...size };
    const rects: FlowRect[] = [];
    for (const child of model.children(scope)) {
      if (!membership.inScope.has(child)) continue;
      const rect = model.nodeRect(child);
      if (rect) rects.push(rect);
    }
    const frame = group.size ?? model.nodeSize(group);
    const members = rects.length ? unionRects(rects) : { ...origin, ...frame };
    const spacing = this.#rankSpacing;
    if (this.#axis() === 'vertical') {
      const x = members.x + members.width / 2 - size.width / 2;
      const y =
        kind === 'inputs'
          ? members.y - spacing - size.height
          : members.y + members.height + spacing;
      return { x, y, ...size };
    }
    const y = members.y + members.height / 2 - size.height / 2;
    const x =
      kind === 'inputs' ? members.x - spacing - size.width : members.x + members.width + spacing;
    return { x, y, ...size };
  }

  /** The terminal an id names in the current scope, if any. */
  #terminal(id: string): Terminal | undefined {
    if (this.#direct) return undefined;
    const parsed = parseFlowTerminalId(id);
    if (!parsed || parsed.groupId !== this.#state().scope) return undefined;
    return this.#terminalState().byKind.get(parsed.kind);
  }

  /** Whether `id` is a terminal of the current scope. */
  isTerminal(id: string): boolean {
    return this.#terminal(id) !== undefined;
  }

  /** The ids of the current scope's terminals (inputs first). */
  get terminalIds(): readonly string[] {
    if (this.#direct) return EMPTY_IDS;
    return [...this.#terminalState().byKind.values()].map((terminal) => terminal.id);
  }

  /** Whether a document node is shown by this view. */
  has(id: string): boolean {
    if (this.#direct) return this.#model.getNode(id) !== undefined;
    return this.#state().inScope.has(id) || this.#terminal(id) !== undefined;
  }

  #terminalPortsOf(terminal: Terminal): readonly FlowResolvedPort[] {
    const model = this.#model;
    const scope = this.#state().scope!;
    const groupPorts = model.ports(scope);
    const measured = this.#terminalPorts.get(terminal.kind);
    const size = terminal.rect;
    const layout = model.layoutDirection;
    const key = [groupPorts, measured, size.width, size.height, layout, terminal.id];
    const cached = this.#portCache.get(terminal.kind);
    if (cached && cached.key.every((value, index) => key[index] === value)) return cached.ports;
    const declared = terminal.kind === 'inputs' ? 'input' : 'output';
    const direction = terminal.kind === 'inputs' ? 'output' : 'input';
    const list = groupPorts.filter((port) => port.direction === declared);
    const visible = list.filter((port) => !port.hidden);
    const ports = list.map((port): FlowResolvedPort => {
      // The frame side of the group port does not apply: terminal ports face the inside.
      const { side, geometry, index, count, measured: wasMeasured, ...rest } = port;
      void side;
      void geometry;
      void index;
      void count;
      void wasMeasured;
      const box = measured?.find((item) => item.id === port.id);
      const portSide = box?.side ?? defaultSide(direction, layout);
      const at = Math.max(visible.indexOf(port), 0);
      const total = visible.length || 1;
      const resolved: FlowResolvedPort = {
        ...rest,
        direction,
        nodeId: terminal.id,
        geometry: box
          ? { ...box }
          : { id: port.id, ...defaultPortGeometry(size, portSide, at, total) },
        index: at,
        count: total,
      };
      if (box) resolved.measured = true;
      return resolved;
    });
    this.#portCache.set(terminal.kind, { key, ports });
    return ports;
  }

  /** Terminal rects by id, to tell which ones a model change moved. */
  #rects(): Map<string, FlowRect> {
    const rects = new Map<string, FlowRect>();
    if (this.#direct) return rects;
    for (const terminal of this.#terminalState().byKind.values())
      rects.set(terminal.id, terminal.rect);
    return rects;
  }

  #forward(event: FlowChangeEvent): void {
    this.#revision += 1;
    if (this.#listeners.size === 0) {
      this.#lastRects.clear();
      return;
    }
    const before = this.#lastRects;
    const after = this.#rects();
    this.#lastRects = after;
    const moved: string[] = [];
    const dirty: FlowRect[] = [];
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      const old = before.get(id);
      const current = after.get(id);
      if (old && current && rectsEqual(old, current)) continue;
      moved.push(id);
      const parts = [old, current].filter((rect): rect is FlowRect => rect !== undefined);
      dirty.push(expandRect(unionRects(parts), 8));
    }
    let forwarded = event;
    if (moved.length) {
      const nodes = new Set(event.affectedNodes);
      const edges = new Set(event.affectedEdges);
      for (const id of moved) nodes.add(id);
      for (const id of this.#state().mapped.keys()) edges.add(id);
      forwarded = {
        ...event,
        affectedNodes: nodes,
        affectedEdges: edges,
        dirtyRects: [...event.dirtyRects, ...dirty],
      };
    }
    for (const listener of [...this.#listeners]) listener(forwarded);
  }

  // Reads -------------------------------------------------------------------------------------

  /** The schema of the model. */
  get schema(): FlowSchema | undefined {
    return this.#model.schema;
  }

  /** The document layout direction. */
  get layoutDirection(): FlowLayoutMode | undefined {
    return this.#model.layoutDirection;
  }

  /** The nodes in scope in document order, then the terminals. */
  get nodes(): readonly FlowNode[] {
    if (this.#direct) return this.#model.nodes;
    return this.#terminalState().nodes;
  }

  /** The edges in scope, in document order. */
  get edges(): readonly FlowEdge[] {
    if (this.#direct) return this.#model.edges;
    return this.#state().edges;
  }

  getNode(id: string): FlowNode | undefined {
    if (this.#direct) return this.#model.getNode(id);
    if (this.#state().inScope.has(id)) return this.#model.getNode(id);
    return this.#terminal(id)?.node;
  }

  getEdge(id: string): FlowEdge | undefined {
    if (this.#direct || this.#state().edgeIds.has(id)) return this.#model.getEdge(id);
    return undefined;
  }

  definitionOf(node: FlowNode | string): FlowNodeDefinition | undefined {
    const id = typeof node === 'string' ? node : node.id;
    const terminal = this.#terminal(id);
    if (terminal) return TERMINAL_DEFINITIONS[terminal.kind];
    return this.#model.definitionOf(node);
  }

  isGroup(node: FlowNode | string): boolean {
    const id = typeof node === 'string' ? node : node.id;
    if (this.#terminal(id)) return false;
    return this.#model.isGroup(node);
  }

  nodeSize(node: FlowNode): FlowSize {
    const terminal = this.#terminal(node.id);
    if (terminal) return { width: terminal.rect.width, height: terminal.rect.height };
    return this.#model.nodeSize(node);
  }

  declaredSize(node: FlowNode): FlowSize | undefined {
    if (this.#terminal(node.id)) return undefined;
    return this.#model.declaredSize(node);
  }

  nodeRect(id: string): FlowRect | undefined {
    if (this.#direct) return this.#model.nodeRect(id);
    if (this.#state().inScope.has(id)) return this.#model.nodeRect(id);
    const terminal = this.#terminal(id);
    return terminal ? { ...terminal.rect } : undefined;
  }

  absolutePosition(id: string): FlowPoint | undefined {
    if (this.#direct) return this.#model.absolutePosition(id);
    if (this.#state().inScope.has(id)) return this.#model.absolutePosition(id);
    const terminal = this.#terminal(id);
    return terminal ? { x: terminal.rect.x, y: terminal.rect.y } : undefined;
  }

  nodeZ(id: string): number {
    if (this.#terminal(id)) {
      const scope = this.#state().scope;
      return scope === undefined ? 0 : this.#model.nodeZ(scope) + 1;
    }
    return this.#model.nodeZ(id);
  }

  children(id: string): readonly string[] {
    return this.#model.children(id);
  }

  descendants(id: string): string[] {
    return this.#model.descendants(id);
  }

  ancestors(id: string): string[] {
    return this.#model.ancestors(id);
  }

  ports(id: string): readonly FlowResolvedPort[] {
    if (this.#direct || this.#state().inScope.has(id)) return this.#model.ports(id);
    const terminal = this.#terminal(id);
    return terminal ? this.#terminalPortsOf(terminal) : EMPTY_PORTS;
  }

  /**
   * Edge ids at a node, a direction or a port, among the edges in scope. A terminal port answers
   * for the inner side of the group port: its flipped direction already names the edge end
   * (inputs feed edges, outputs collect them).
   */
  portConnections(
    nodeId: string,
    direction?: 'input' | 'output',
    portId?: string,
  ): readonly string[] {
    const model = this.#model;
    if (this.#direct) return model.portConnections(nodeId, direction, portId);
    const state = this.#state();
    const terminal = this.#terminal(nodeId);
    if (terminal) {
      const own = terminal.kind === 'inputs' ? 'output' : 'input';
      if (direction !== undefined && direction !== own) return EMPTY_IDS;
      const end = own === 'output' ? 'source' : 'target';
      return model
        .portConnections(state.scope!, own, portId)
        .filter((id) => state.mapped.get(id)?.[end] === true);
    }
    return model.portConnections(nodeId, direction, portId).filter((id) => state.edgeIds.has(id));
  }

  edgeKind(edge: FlowEdge): FlowEdgeKind {
    return this.#model.edgeKind(edge);
  }

  edgeOptions(edge: FlowEdge): Required<FlowEdgeKindOptions> {
    return this.#model.edgeOptions(edge);
  }

  /** The relation of an edge or connection, terminal ends read as their group. */
  edgeRelation(edge: FlowConnection): FlowEdgeRelation {
    return flowEdgeRelation(this.#model, this.resolve(edge));
  }

  /** Where an edge end attaches; an end on the scope group attaches to its terminal. */
  endpoint(edge: FlowEdge | string, end: 'source' | 'target'): FlowEndpoint | undefined {
    const model = this.#model;
    if (this.#direct) return model.endpoint(edge, end);
    const item = typeof edge === 'string' ? this.getEdge(edge) : edge;
    if (!item) return undefined;
    const mapped = this.#state().mapped.get(item.id);
    if (!mapped) return model.endpoint(item, end);
    const kind = model.edgeKind(item);
    const layout = model.layoutDirection;
    const inward = inwardEnds(model.edgeRelation(item));
    const resolve = (
      which: 'source' | 'target',
      other: FlowPoint | undefined,
    ): FlowEndpoint | undefined => {
      const portId = which === 'source' ? item.sourcePort : item.targetPort;
      const direction = which === 'source' ? 'output' : 'input';
      if (mapped[which]) {
        const terminal = this.#terminal(
          flowTerminalId(this.#state().scope!, which === 'source' ? 'inputs' : 'outputs'),
        );
        if (!terminal) return undefined;
        return resolveEndpoint({
          nodeId: terminal.id,
          rect: terminal.rect,
          ports: this.#terminalPortsOf(terminal),
          portId,
          direction,
          layout,
          kind,
          other,
          loose: true,
        });
      }
      const nodeId = which === 'source' ? item.source : item.target;
      const rect = model.nodeRect(nodeId);
      if (!rect) return undefined;
      return resolveEndpoint({
        nodeId,
        rect,
        ports: model.ports(nodeId),
        portId,
        direction,
        layout,
        kind,
        other,
        loose: true,
        inward: inward[which],
      });
    };
    const otherEnd = resolve(end === 'source' ? 'target' : 'source', undefined);
    return resolve(end, otherEnd?.point);
  }

  endpoints(edge: FlowEdge | string): { source: FlowEndpoint; target: FlowEndpoint } | undefined {
    if (this.#direct) return this.#model.endpoints(edge);
    const source = this.endpoint(edge, 'source');
    const target = this.endpoint(edge, 'target');
    return source && target ? { source, target } : undefined;
  }

  /** In-scope node ids and terminals intersecting (or, with `partially` false, inside) `rect`. */
  nodesInRect(rect: FlowRect, partially = true): string[] {
    const model = this.#model;
    if (this.#direct) return model.nodesInRect(rect, partially);
    const state = this.#state();
    const ids = model.nodesInRect(rect, partially).filter((id) => state.inScope.has(id));
    for (const terminal of this.#terminalState().byKind.values())
      if (partially ? rectsIntersect(rect, terminal.rect) : rectContains(rect, terminal.rect))
        ids.push(terminal.id);
    return ids;
  }

  /** The topmost in-scope node or terminal under `point`. */
  nodeAt(point: FlowPoint): FlowNode | undefined {
    const model = this.#model;
    if (this.#direct) return model.nodeAt(point);
    const state = this.#state();
    let best: FlowNode | undefined;
    let bestZ = -Infinity;
    let bestIndex = -1;
    const consider = (node: FlowNode, z: number, index: number): void => {
      if (z > bestZ || (z === bestZ && index > bestIndex)) {
        best = node;
        bestZ = z;
        bestIndex = index;
      }
    };
    for (const id of model.spatialIndex.queryPoint(point)) {
      if (!state.inScope.has(id)) continue;
      const node = model.getNode(id);
      if (node) consider(node, model.nodeZ(id), state.order.get(id) ?? 0);
    }
    for (const terminal of this.#terminalState().byKind.values())
      if (rectContainsPoint(terminal.rect, point))
        consider(terminal.node, this.nodeZ(terminal.id), Number.MAX_SAFE_INTEGER);
    return best;
  }

  /** The nearest accepted port of an in-scope node or terminal within `radius` of `point`. */
  portNear(
    point: FlowPoint,
    radius: number,
    filter?: (port: FlowResolvedPort, node: FlowNode) => boolean,
  ): FlowPortHit | undefined {
    const model = this.#model;
    if (this.#direct) return model.portNear(point, radius, filter);
    const state = this.#state();
    const area = {
      x: point.x - radius,
      y: point.y - radius,
      width: radius * 2,
      height: radius * 2,
    };
    const candidates = model.spatialIndex.queryRect(area).filter((id) => state.inScope.has(id));
    candidates.sort((a, b) => (state.order.get(a) ?? 0) - (state.order.get(b) ?? 0));
    for (const terminal of this.#terminalState().byKind.values())
      if (rectsIntersect(expandRect(terminal.rect, radius), area)) candidates.push(terminal.id);
    let best: FlowPortHit | undefined;
    for (const id of candidates) {
      const node = this.getNode(id);
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

  portCenter(nodeId: string, portId: string): FlowPoint | undefined {
    if (this.#direct) return this.#model.portCenter(nodeId, portId);
    const rect = this.nodeRect(nodeId);
    const port = this.ports(nodeId).find((item) => item.id === portId);
    if (!rect || !port) return undefined;
    return {
      x: rect.x + port.geometry.x + port.geometry.width / 2,
      y: rect.y + port.geometry.y + port.geometry.height / 2,
    };
  }

  /** Bounds of the given nodes (default: every node and terminal of the view). */
  bounds(ids?: readonly string[]): FlowRect {
    if (this.#direct) return this.#model.bounds(ids);
    const rects: FlowRect[] = [];
    for (const id of ids ?? this.nodes.map((node) => node.id)) {
      const rect = this.nodeRect(id);
      if (rect) rects.push(rect);
    }
    return unionRects(rects);
  }

  /** Records a measurement: terminals in the view, every other node in the model. */
  measure(
    id: string,
    measured: FlowSize | undefined,
    ports?: readonly FlowPortGeometry[],
  ): FlowApplyResult {
    const terminal = this.#terminal(id);
    if (!terminal) return this.#model.measure(id, measured, ports);
    const before = terminal.rect;
    let changed = false;
    const size = this.#terminalSizes.get(terminal.kind);
    if (measured && (!size || size.width !== measured.width || size.height !== measured.height)) {
      this.#terminalSizes.set(terminal.kind, { width: measured.width, height: measured.height });
      changed = true;
    } else if (!measured && size) {
      this.#terminalSizes.delete(terminal.kind);
      changed = true;
    }
    if (ports !== undefined) {
      const previous = this.#terminalPorts.get(terminal.kind);
      const same =
        previous?.length === ports.length &&
        ports.every((port, index) => {
          const other = previous[index]!;
          return (
            other.id === port.id &&
            other.x === port.x &&
            other.y === port.y &&
            other.width === port.width &&
            other.height === port.height &&
            other.side === port.side
          );
        });
      if (!same) {
        if (ports.length)
          this.#terminalPorts.set(
            terminal.kind,
            ports.map((port) => ({ ...port })),
          );
        else this.#terminalPorts.delete(terminal.kind);
        changed = true;
      }
    }
    if (!changed) return NOTHING;
    this.#revision += 1;
    const change: FlowChange = { type: 'node-measure', id, measured };
    if (ports !== undefined) change.ports = ports;
    const after = this.#terminal(id)?.rect ?? before;
    this.#lastRects = this.#rects();
    const state = this.#state();
    const end = terminal.kind === 'inputs' ? 'source' : 'target';
    const edges = new Set<string>();
    for (const [edgeId, ends] of state.mapped) if (ends[end]) edges.add(edgeId);
    const event: FlowChangeEvent = {
      changes: [change],
      inverse: [],
      reason: 'programmatic',
      origin: 'measure',
      transaction: undefined,
      document: this.#model.document,
      previousDocument: this.#model.document,
      affectedNodes: new Set([id]),
      affectedEdges: edges,
      dirtyRects: [expandRect(unionRects([before, after]), 8)],
    };
    for (const listener of [...this.#listeners]) listener(event);
    return { applied: true, changes: [change], inverse: [] };
  }

  // Scope helpers -----------------------------------------------------------------------------

  /** A connection with terminal ends read as the scope group (call before validating). */
  resolve<C extends FlowConnection>(connection: C): C {
    const source = this.#terminal(connection.source);
    const target = this.#terminal(connection.target);
    if (!source && !target) return connection;
    const scope = this.#state().scope!;
    return {
      ...connection,
      ...(source ? { source: scope } : {}),
      ...(target ? { target: scope } : {}),
    };
  }

  /**
   * Changes with terminal writes turned into group writes: a terminal move becomes a `terminals`
   * patch of the group (group-relative); other terminal changes are dropped.
   */
  rewrite(changes: readonly FlowChange[]): FlowChange[] {
    if (this.#direct) return [...changes];
    const scope = this.#state().scope;
    const result: FlowChange[] = [];
    let patch: { at: number; terminals: FlowGroupTerminals } | undefined;
    for (const change of changes) {
      const id =
        change.type === 'node-add'
          ? change.node.id
          : change.type.startsWith('node')
            ? (change as { id: string }).id
            : undefined;
      const terminal = id === undefined ? undefined : this.#terminal(id);
      if (!terminal || scope === undefined) {
        result.push(change);
        continue;
      }
      if (change.type === 'node-measure') {
        this.measure(terminal.id, change.measured, change.ports);
        continue;
      }
      if (change.type !== 'node-position') continue;
      const origin = this.#model.absolutePosition(scope);
      if (!origin) continue;
      if (!patch) {
        patch = {
          at: result.length,
          terminals: { ...this.#model.getNode(scope)?.terminals },
        };
        result.push({ type: 'node-update', id: scope, patch: {} });
      }
      patch.terminals[terminal.kind] = {
        x: change.position.x - origin.x,
        y: change.position.y - origin.y,
      };
    }
    if (patch)
      result[patch.at] = { type: 'node-update', id: scope!, patch: { terminals: patch.terminals } };
    return result;
  }

  /** The deepest in-scope expanded group containing `point`. */
  groupAt(point: FlowPoint): string | undefined {
    const model = this.#model;
    const state = this.#state();
    let best: string | undefined;
    let bestDepth = -1;
    let bestIndex = -1;
    for (const id of model.spatialIndex.queryPoint(point)) {
      if (!state.inScope.has(id) || !state.opens.has(id) || !model.isGroup(id)) continue;
      const rect = model.nodeRect(id);
      if (!rect || !rectContainsPoint(rect, point)) continue;
      const depth = model.ancestors(id).length;
      const index = state.order.get(id) ?? 0;
      if (depth > bestDepth || (depth === bestDepth && index > bestIndex)) {
        best = id;
        bestDepth = depth;
        bestIndex = index;
      }
    }
    return best;
  }
}
