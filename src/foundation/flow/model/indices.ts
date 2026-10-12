// Adapted from xyflow packages/system/src/utils/store.ts at 3d35b5731 (MIT; see LICENSE.xyflow).
import type {
  FlowChange,
  FlowDocument,
  FlowEdge,
  FlowNode,
  FlowPoint,
  FlowPortGeometry,
  FlowSize,
} from '../types.js';

/**
 * Lookup maps over a document: id → node/edge, array positions, children, incident edges, a
 * connection lookup keyed by node and port (port of xyflow's `updateConnectionLookup`) and
 * absolute positions resolved through parent chains. Rebuilt per applied batch (O(n)); the
 * spatial index is updated incrementally by the model.
 */
export interface FlowConnectionRecord {
  edgeId: string;
  source: string;
  sourcePort: string | undefined;
  target: string;
  targetPort: string | undefined;
}

export interface FlowLookup {
  readonly nodes: ReadonlyMap<string, FlowNode>;
  readonly edges: ReadonlyMap<string, FlowEdge>;
  readonly nodeIndex: ReadonlyMap<string, number>;
  readonly edgeIndex: ReadonlyMap<string, number>;
}

export interface FlowIndices extends FlowLookup {
  /** Child ids per parent, in document order. */
  readonly children: ReadonlyMap<string, readonly string[]>;
  /** Edge ids whose `target` is the node. */
  readonly incoming: ReadonlyMap<string, readonly string[]>;
  /** Edge ids whose `source` is the node. */
  readonly outgoing: ReadonlyMap<string, readonly string[]>;
  /** Connections by `connectionKey(...)`: node-level and port-level buckets per direction. */
  readonly connections: ReadonlyMap<string, readonly FlowConnectionRecord[]>;
  /** Absolute positions (parent chains resolved). */
  readonly absolute: ReadonlyMap<string, FlowPoint>;
  /** Nesting depth (0 for roots). */
  readonly depth: ReadonlyMap<string, number>;
}

export type FlowConnectionEnd = 'source' | 'target';

/** `source:a` holds every connection leaving `a`; `source:a:p` those leaving port `p` (`''` for none). */
export function connectionKey(end: FlowConnectionEnd, nodeId: string, portId?: string): string {
  return portId === undefined ? `${end}:${nodeId}` : `${end}:${nodeId}:${portId}`;
}

const EMPTY: readonly never[] = Object.freeze([]);

export function buildLookup(doc: FlowDocument): FlowLookup {
  const nodes = new Map<string, FlowNode>();
  const edges = new Map<string, FlowEdge>();
  const nodeIndex = new Map<string, number>();
  const edgeIndex = new Map<string, number>();
  doc.nodes.forEach((node, index) => {
    if (nodes.has(node.id)) return;
    nodes.set(node.id, node);
    nodeIndex.set(node.id, index);
  });
  doc.edges.forEach((edge, index) => {
    if (edges.has(edge.id)) return;
    edges.set(edge.id, edge);
    edgeIndex.set(edge.id, index);
  });
  return { nodes, edges, nodeIndex, edgeIndex };
}

function push(map: Map<string, string[]>, key: string, value: string): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function pushConnection(
  map: Map<string, FlowConnectionRecord[]>,
  key: string,
  record: FlowConnectionRecord,
): void {
  const list = map.get(key);
  if (list) list.push(record);
  else map.set(key, [record]);
}

export function buildIndices(doc: FlowDocument): FlowIndices {
  const lookup = buildLookup(doc);
  const children = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  const connections = new Map<string, FlowConnectionRecord[]>();
  const absolute = new Map<string, FlowPoint>();
  const depth = new Map<string, number>();

  for (const node of lookup.nodes.values()) {
    if (node.parentId !== undefined && lookup.nodes.has(node.parentId))
      push(children, node.parentId, node.id);
  }

  const resolving = new Set<string>();
  const resolve = (node: FlowNode): FlowPoint => {
    const cached = absolute.get(node.id);
    if (cached) return cached;
    let position: FlowPoint = { x: node.position.x, y: node.position.y };
    let level = 0;
    const parent = node.parentId === undefined ? undefined : lookup.nodes.get(node.parentId);
    if (parent && !resolving.has(node.id)) {
      resolving.add(node.id);
      const parentPosition = resolve(parent);
      resolving.delete(node.id);
      position = { x: parentPosition.x + node.position.x, y: parentPosition.y + node.position.y };
      level = (depth.get(parent.id) ?? 0) + 1;
    }
    absolute.set(node.id, position);
    depth.set(node.id, level);
    return position;
  };
  for (const node of lookup.nodes.values()) resolve(node);

  for (const edge of lookup.edges.values()) {
    push(outgoing, edge.source, edge.id);
    push(incoming, edge.target, edge.id);
    const record: FlowConnectionRecord = {
      edgeId: edge.id,
      source: edge.source,
      sourcePort: edge.sourcePort,
      target: edge.target,
      targetPort: edge.targetPort,
    };
    pushConnection(connections, connectionKey('source', edge.source), record);
    pushConnection(
      connections,
      connectionKey('source', edge.source, edge.sourcePort ?? ''),
      record,
    );
    pushConnection(connections, connectionKey('target', edge.target), record);
    pushConnection(
      connections,
      connectionKey('target', edge.target, edge.targetPort ?? ''),
      record,
    );
  }

  return { ...lookup, children, incoming, outgoing, connections, absolute, depth };
}

export const EMPTY_INDICES: FlowIndices = buildIndices({ version: 1, nodes: [], edges: [] });

export function childrenOf(indices: FlowIndices, id: string): readonly string[] {
  return indices.children.get(id) ?? EMPTY;
}

/** Every descendant of `id` in depth-first document order. */
export function descendantsOf(indices: FlowIndices, id: string, out: string[] = []): string[] {
  for (const child of childrenOf(indices, id)) {
    out.push(child);
    descendantsOf(indices, child, out);
  }
  return out;
}

/** Parent chain from the nearest parent outwards; stops on a missing parent or a cycle. */
export function ancestorsOf(indices: FlowIndices, id: string): string[] {
  const result: string[] = [];
  const seen = new Set<string>([id]);
  let current = indices.nodes.get(id);
  while (current?.parentId !== undefined && !seen.has(current.parentId)) {
    const parent = indices.nodes.get(current.parentId);
    if (!parent) break;
    result.push(parent.id);
    seen.add(parent.id);
    current = parent;
  }
  return result;
}

export function incidentEdges(indices: FlowIndices, id: string): string[] {
  const out = indices.outgoing.get(id) ?? EMPTY;
  const inc = indices.incoming.get(id) ?? EMPTY;
  if (out.length === 0) return [...inc];
  if (inc.length === 0) return [...out];
  const result = [...out];
  for (const edge of inc) if (!result.includes(edge)) result.push(edge);
  return result;
}

/** Runtime measurements, never part of the document. */
export interface FlowRuntime {
  readonly measured: Map<string, FlowSize>;
  readonly ports: Map<string, readonly FlowPortGeometry[]>;
  /** Bumped on every accepted measurement, for memoization keys. */
  version: number;
}

export function createRuntime(): FlowRuntime {
  return { measured: new Map(), ports: new Map(), version: 0 };
}

function sizesEqual(a: FlowSize | undefined, b: FlowSize | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.width === b.width && a.height === b.height;
}

function portsEqual(
  a: readonly FlowPortGeometry[] | undefined,
  b: readonly FlowPortGeometry[] | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index]!;
    const right = b[index]!;
    if (
      left.id !== right.id ||
      left.x !== right.x ||
      left.y !== right.y ||
      left.width !== right.width ||
      left.height !== right.height ||
      left.side !== right.side
    )
      return false;
  }
  return true;
}

/** Whether a `node-measure` change would alter the runtime. */
export function measureChanges(
  runtime: FlowRuntime,
  change: Extract<FlowChange, { type: 'node-measure' }>,
): boolean {
  if ('measured' in change && !sizesEqual(runtime.measured.get(change.id), change.measured))
    return true;
  if (change.ports !== undefined && !portsEqual(runtime.ports.get(change.id), change.ports))
    return true;
  return false;
}

/** Applies a `node-measure` change; returns whether anything changed. */
export function applyMeasure(
  runtime: FlowRuntime,
  change: Extract<FlowChange, { type: 'node-measure' }>,
): boolean {
  if (!measureChanges(runtime, change)) return false;
  if ('measured' in change) {
    if (change.measured) runtime.measured.set(change.id, { ...change.measured });
    else runtime.measured.delete(change.id);
  }
  if (change.ports !== undefined) {
    if (change.ports.length)
      runtime.ports.set(
        change.id,
        change.ports.map((port) => ({ ...port })),
      );
    else runtime.ports.delete(change.id);
  }
  runtime.version += 1;
  return true;
}

/** Drops measurements of nodes that left the document. */
export function pruneRuntime(runtime: FlowRuntime, nodes: ReadonlyMap<string, FlowNode>): boolean {
  let changed = false;
  for (const id of [...runtime.measured.keys()])
    if (!nodes.has(id)) {
      runtime.measured.delete(id);
      changed = true;
    }
  for (const id of [...runtime.ports.keys()])
    if (!nodes.has(id)) {
      runtime.ports.delete(id);
      changed = true;
    }
  if (changed) runtime.version += 1;
  return changed;
}
