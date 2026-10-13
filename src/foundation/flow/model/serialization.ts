import { FLOW_DOCUMENT_VERSION } from '../defaults.js';
import type {
  FlowDocument,
  FlowEdge,
  FlowEdgeKind,
  FlowIssue,
  FlowLayoutSettings,
  FlowMarker,
  FlowMarkerDefinition,
  FlowNode,
} from '../types.js';

/**
 * Document serialization: `toJSON` strips `selected` and never writes runtime fields;
 * parsing migrates older shapes (0 → 1 maps unversioned documents) and validates structure, strict
 * (throws) or lenient (drops invalid items with issues); nodes are normalized parents first.
 */
export interface FlowMigration {
  from: number;
  to: number;
  migrate(input: Record<string, unknown>): Record<string, unknown>;
}

export interface FlowSerializeOptions {
  /** Keep `selected` flags (default false). */
  selection?: boolean;
  /** Keep the stored viewport (default true). */
  viewport?: boolean;
}

export interface FlowParseOptions {
  migrations?: readonly FlowMigration[];
  /** Throw a `FlowParseError` on the first issue instead of dropping the item. */
  strict?: boolean;
}

export interface FlowParseResult<N extends FlowNode = FlowNode, E extends FlowEdge = FlowEdge> {
  document: FlowDocument<N, E>;
  issues: FlowIssue[];
}

export class FlowParseError extends Error {
  readonly issues: readonly FlowIssue[];

  constructor(issues: readonly FlowIssue[]) {
    super(issues[0]?.message ?? 'Invalid flow document.');
    this.name = 'FlowParseError';
    this.issues = issues;
  }
}

type Rec = Record<string, unknown>;

function isRecord(value: unknown): value is Rec {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPoint(value: unknown): value is { x: number; y: number } {
  return isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number';
}

function isSize(value: unknown): value is { width: number; height: number } {
  return isRecord(value) && typeof value.width === 'number' && typeof value.height === 'number';
}

/** Parents before children, depth-first in document order; returns the input when already ordered. */
export function normalizeNodeOrder<N extends FlowNode>(nodes: readonly N[]): N[] {
  const byId = new Map<string, N>();
  for (const node of nodes) if (!byId.has(node.id)) byId.set(node.id, node);
  const children = new Map<string, N[]>();
  const roots: N[] = [];
  for (const node of nodes) {
    const parent = node.parentId === undefined ? undefined : byId.get(node.parentId);
    if (!parent || parent === node) {
      roots.push(node);
      continue;
    }
    const list = children.get(parent.id);
    if (list) list.push(node);
    else children.set(parent.id, [node]);
  }
  const ordered: N[] = [];
  const placed = new Set<string>();
  const visit = (node: N): void => {
    if (placed.has(node.id)) return;
    placed.add(node.id);
    ordered.push(node);
    for (const child of children.get(node.id) ?? []) visit(child);
  };
  for (const root of roots) visit(root);
  for (const node of nodes) if (!placed.has(node.id)) visit(node);
  let same = ordered.length === nodes.length;
  for (let index = 0; same && index < nodes.length; index += 1)
    same = ordered[index] === nodes[index];
  return same ? (nodes as N[]) : ordered;
}

function cloneNode<N extends FlowNode>(node: N, keepSelection: boolean): N {
  const copy: FlowNode = { ...node, position: { x: node.position.x, y: node.position.y } };
  if (!keepSelection) delete copy.selected;
  else if (!node.selected) delete copy.selected;
  if (node.size) copy.size = { ...node.size };
  if (node.ports) copy.ports = node.ports.map((port) => ({ ...port }));
  if (Array.isArray(node.extent))
    copy.extent = [
      [node.extent[0][0], node.extent[0][1]],
      [node.extent[1][0], node.extent[1][1]],
    ];
  return copy as N;
}

function cloneEdge<E extends FlowEdge>(edge: E, keepSelection: boolean): E {
  const copy: FlowEdge = { ...edge };
  if (!keepSelection) delete copy.selected;
  else if (!edge.selected) delete copy.selected;
  if (edge.waypoints) copy.waypoints = edge.waypoints.map((point) => ({ x: point.x, y: point.y }));
  if (edge.labels) copy.labels = edge.labels.map((label) => ({ ...label }));
  if (edge.options) copy.options = { ...edge.options };
  if (typeof edge.markerStart === 'object') copy.markerStart = { ...edge.markerStart };
  if (typeof edge.markerEnd === 'object') copy.markerEnd = { ...edge.markerEnd };
  return copy as E;
}

/** A plain, JSON-ready copy without runtime fields. */
export function serializeFlowDocument<N extends FlowNode, E extends FlowEdge>(
  doc: FlowDocument<N, E>,
  options: FlowSerializeOptions = {},
): FlowDocument<N, E> {
  const keepSelection = options.selection ?? false;
  const result: FlowDocument<N, E> = {
    version: FLOW_DOCUMENT_VERSION,
    nodes: normalizeNodeOrder(doc.nodes).map((node) => cloneNode(node, keepSelection)),
    edges: doc.edges.map((edge) => cloneEdge(edge, keepSelection)),
  };
  if ((options.viewport ?? true) && doc.viewport) result.viewport = { ...doc.viewport };
  if (doc.layout) result.layout = { ...doc.layout };
  if (doc.metadata) result.metadata = { ...doc.metadata };
  return result;
}

const UNVERSIONED_EDGE_KINDS: Record<string, FlowEdgeKind> = {
  default: 'bezier',
  bezier: 'bezier',
  simplebezier: 'bezier',
  straight: 'straight',
  step: 'step',
  smoothstep: 'smoothstep',
  orthogonal: 'orthogonal',
};

function migrateMarker(value: unknown): FlowMarker | undefined {
  if (typeof value === 'string') {
    const type = value.toLowerCase();
    return type === 'arrow' || type === 'arrowclosed' || type === 'circle' || type === 'diamond'
      ? type
      : undefined;
  }
  if (!isRecord(value) || typeof value.type !== 'string') return undefined;
  const type = value.type.toLowerCase();
  if (type !== 'arrow' && type !== 'arrowclosed' && type !== 'circle' && type !== 'diamond')
    return undefined;
  const marker: FlowMarkerDefinition = { type };
  if (typeof value.width === 'number') marker.width = value.width;
  if (typeof value.height === 'number') marker.height = value.height;
  if (typeof value.color === 'string') marker.color = value.color;
  if (typeof value.strokeWidth === 'number') marker.strokeWidth = value.strokeWidth;
  if (
    value.orient === 'auto' ||
    value.orient === 'auto-start-reverse' ||
    typeof value.orient === 'number'
  )
    marker.orient = value.orient;
  const units = value.units ?? value.markerUnits;
  if (units === 'strokeWidth' || units === 'userSpaceOnUse') marker.units = units;
  return marker;
}

function migrateNodeV0(input: Rec): Rec {
  const {
    parentNode,
    width,
    height,
    measured,
    initialWidth,
    initialHeight,
    sourcePosition,
    targetPosition,
    style,
    className,
    origin,
    ...rest
  } = input;
  void sourcePosition;
  void targetPosition;
  void style;
  void className;
  void origin;
  const node: Rec = { ...rest };
  if (node.parentId === undefined && typeof parentNode === 'string') node.parentId = parentNode;
  if (node.type === undefined) node.type = 'default';
  if (node.data === undefined) node.data = {};
  if (node.size === undefined) {
    const w =
      typeof width === 'number'
        ? width
        : isRecord(measured) && typeof measured.width === 'number'
          ? measured.width
          : initialWidth;
    const h =
      typeof height === 'number'
        ? height
        : isRecord(measured) && typeof measured.height === 'number'
          ? measured.height
          : initialHeight;
    if (typeof w === 'number' && typeof h === 'number') node.size = { width: w, height: h };
  }
  return node;
}

function migrateEdgeV0(input: Rec): Rec {
  const {
    sourceHandle,
    targetHandle,
    type,
    label,
    markerStart,
    markerEnd,
    style,
    className,
    ...rest
  } = input;
  void style;
  void className;
  const edge: Rec = { ...rest };
  if (edge.sourcePort === undefined && typeof sourceHandle === 'string')
    edge.sourcePort = sourceHandle;
  if (edge.targetPort === undefined && typeof targetHandle === 'string')
    edge.targetPort = targetHandle;
  if (edge.kind === undefined && typeof type === 'string') {
    const kind = UNVERSIONED_EDGE_KINDS[type];
    if (kind) edge.kind = kind;
  }
  if (typeof label === 'string') edge.label = label;
  else if (typeof label === 'number') edge.label = String(label);
  const start = migrateMarker(markerStart);
  const end = migrateMarker(markerEnd);
  if (start) edge.markerStart = start;
  if (end) edge.markerEnd = end;
  return edge;
}

/** Built-in 0 → 1: unversioned documents (`sourceHandle`, `type`, `parentNode`, `width`/`height`/`measured`). */
export const UNVERSIONED_MIGRATION: FlowMigration = {
  from: 0,
  to: 1,
  migrate(input) {
    const nodes = Array.isArray(input.nodes) ? input.nodes.filter(isRecord).map(migrateNodeV0) : [];
    const edges = Array.isArray(input.edges) ? input.edges.filter(isRecord).map(migrateEdgeV0) : [];
    const result: Rec = { ...input, version: 1, nodes, edges };
    return result;
  },
};

export const BUILT_IN_MIGRATIONS: readonly FlowMigration[] = [UNVERSIONED_MIGRATION];

function versionOf(input: Rec): number {
  return typeof input.version === 'number' && Number.isFinite(input.version) ? input.version : 0;
}

/** Runs migrations from the input's version up to `FLOW_DOCUMENT_VERSION`. */
export function migrateFlowDocument(
  input: unknown,
  migrations: readonly FlowMigration[] = [],
): unknown {
  if (!isRecord(input)) return input;
  let current = input;
  let version = versionOf(current);
  const all = [...BUILT_IN_MIGRATIONS, ...migrations];
  const guard = new Set<number>();
  while (version < FLOW_DOCUMENT_VERSION && !guard.has(version)) {
    guard.add(version);
    const candidates = all.filter((migration) => migration.from === version);
    const step = candidates[candidates.length - 1];
    if (!step) break;
    current = step.migrate(current);
    current.version = step.to;
    version = step.to;
  }
  return current;
}

function parseNode(raw: unknown, index: number, issues: FlowIssue[]): FlowNode | undefined {
  if (!isRecord(raw) || typeof raw.id !== 'string') {
    issues.push({
      code: 'invalid-node',
      severity: 'error',
      message: `Node at index ${index} has no string id.`,
      path: `nodes[${index}]`,
    });
    return undefined;
  }
  if (typeof raw.type !== 'string') {
    issues.push({
      code: 'invalid-node',
      severity: 'error',
      message: `Node "${raw.id}" has no type.`,
      nodeId: raw.id,
      path: `nodes[${index}].type`,
    });
    return undefined;
  }
  if (!isPoint(raw.position)) {
    issues.push({
      code: 'invalid-node',
      severity: 'error',
      message: `Node "${raw.id}" has no position.`,
      nodeId: raw.id,
      path: `nodes[${index}].position`,
    });
    return undefined;
  }
  const node: FlowNode = {
    ...(raw as unknown as FlowNode),
    position: { x: raw.position.x, y: raw.position.y },
  };
  if (!isRecord(raw.data)) node.data = {};
  if (raw.size !== undefined && !isSize(raw.size)) {
    issues.push({
      code: 'invalid-node',
      severity: 'warning',
      message: `Node "${raw.id}" has an invalid size; dropped.`,
      nodeId: raw.id,
      path: `nodes[${index}].size`,
    });
    delete node.size;
  }
  return node;
}

function parseEdge(raw: unknown, index: number, issues: FlowIssue[]): FlowEdge | undefined {
  if (!isRecord(raw) || typeof raw.id !== 'string') {
    issues.push({
      code: 'invalid-edge',
      severity: 'error',
      message: `Edge at index ${index} has no string id.`,
      path: `edges[${index}]`,
    });
    return undefined;
  }
  if (typeof raw.source !== 'string' || typeof raw.target !== 'string') {
    issues.push({
      code: 'invalid-edge',
      severity: 'error',
      message: `Edge "${raw.id}" needs string source and target.`,
      edgeId: raw.id,
      path: `edges[${index}]`,
    });
    return undefined;
  }
  const edge = { ...(raw as unknown as FlowEdge) };
  if (
    edge.waypoints !== undefined &&
    !(Array.isArray(edge.waypoints) && edge.waypoints.every(isPoint))
  ) {
    issues.push({
      code: 'invalid-edge',
      severity: 'warning',
      message: `Edge "${raw.id}" has invalid waypoints; dropped.`,
      edgeId: raw.id,
      path: `edges[${index}].waypoints`,
    });
    delete edge.waypoints;
  }
  return edge;
}

/** Parses, migrates and validates an unknown value into a document. */
export function parseFlowDocument<N extends FlowNode = FlowNode, E extends FlowEdge = FlowEdge>(
  input: unknown,
  options: FlowParseOptions = {},
): FlowParseResult<N, E> {
  const issues: FlowIssue[] = [];
  const fail = (): never => {
    throw new FlowParseError(issues);
  };
  const migrated = migrateFlowDocument(input, options.migrations);
  if (!isRecord(migrated)) {
    issues.push({
      code: 'invalid-document',
      severity: 'error',
      message: 'A flow document must be an object.',
    });
    if (options.strict) fail();
    return { document: { version: FLOW_DOCUMENT_VERSION, nodes: [], edges: [] }, issues };
  }
  if (versionOf(migrated) !== FLOW_DOCUMENT_VERSION)
    issues.push({
      code: 'unsupported-version',
      severity: 'error',
      message: `Unsupported document version ${String(migrated.version)}.`,
      path: 'version',
    });
  const rawNodes = Array.isArray(migrated.nodes) ? migrated.nodes : [];
  const rawEdges = Array.isArray(migrated.edges) ? migrated.edges : [];
  if (!Array.isArray(migrated.nodes))
    issues.push({
      code: 'invalid-document',
      severity: 'error',
      message: '`nodes` must be an array.',
      path: 'nodes',
    });
  if (!Array.isArray(migrated.edges))
    issues.push({
      code: 'invalid-document',
      severity: 'error',
      message: '`edges` must be an array.',
      path: 'edges',
    });

  const nodes: FlowNode[] = [];
  const nodeIds = new Set<string>();
  rawNodes.forEach((raw, index) => {
    const node = parseNode(raw, index, issues);
    if (!node) return;
    if (nodeIds.has(node.id)) {
      issues.push({
        code: 'duplicate-node-id',
        severity: 'error',
        message: `Duplicate node id "${node.id}".`,
        nodeId: node.id,
        path: `nodes[${index}]`,
      });
      return;
    }
    nodeIds.add(node.id);
    nodes.push(node);
  });
  for (const node of nodes) {
    if (node.parentId !== undefined && !nodeIds.has(node.parentId)) {
      issues.push({
        code: 'missing-parent',
        severity: 'error',
        message: `Node "${node.id}" references missing parent "${node.parentId}".`,
        nodeId: node.id,
      });
      delete node.parentId;
    }
  }

  const edges: FlowEdge[] = [];
  const edgeIds = new Set<string>();
  rawEdges.forEach((raw, index) => {
    const edge = parseEdge(raw, index, issues);
    if (!edge) return;
    if (edgeIds.has(edge.id)) {
      issues.push({
        code: 'duplicate-edge-id',
        severity: 'error',
        message: `Duplicate edge id "${edge.id}".`,
        edgeId: edge.id,
        path: `edges[${index}]`,
      });
      return;
    }
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push({
        code: 'missing-endpoint',
        severity: 'error',
        message: `Edge "${edge.id}" connects a missing node.`,
        edgeId: edge.id,
        path: `edges[${index}]`,
      });
      return;
    }
    edgeIds.add(edge.id);
    edges.push(edge);
  });

  if (options.strict && issues.some((item) => item.severity === 'error')) fail();

  const parsed: FlowDocument<N, E> = {
    version: FLOW_DOCUMENT_VERSION,
    nodes: normalizeNodeOrder(nodes) as N[],
    edges: edges as E[],
  };
  if (
    isRecord(migrated.viewport) &&
    typeof migrated.viewport.x === 'number' &&
    typeof migrated.viewport.y === 'number' &&
    typeof migrated.viewport.zoom === 'number'
  )
    parsed.viewport = {
      x: migrated.viewport.x,
      y: migrated.viewport.y,
      zoom: migrated.viewport.zoom,
    };
  if (isRecord(migrated.layout) && typeof migrated.layout.direction === 'string')
    parsed.layout = migrated.layout as unknown as FlowLayoutSettings;
  if (isRecord(migrated.metadata)) parsed.metadata = migrated.metadata;
  return { document: parsed, issues };
}
