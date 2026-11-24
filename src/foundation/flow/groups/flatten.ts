import type { FlowDocument, FlowEdge, FlowNode, FlowNodeDefinition, FlowSchema } from '../types.js';
import { FLOW_GROUP_DEFINITION, FLOW_GROUP_TYPE } from './relations.js';

/**
 * Group flattening (Widgets §6.3 Definition): group ports only relay, so every chain of edges
 * through group ports resolves to direct leaf-to-leaf edges. Cycle detection, topological order
 * and run ordering read the flattened graph, where a group and its members never form a cycle.
 * Results are cached per document identity (and schema).
 */

/** Options of `flattenFlowGroups`: the schema that tells groups apart. */
export interface FlowFlattenOptions {
  /** Node definitions; a `group` node without a schema type is a group too. */
  schema?: FlowSchema | undefined;
}

/** The flattened document and, per flat edge id, the original edge ids it resolves, in order. */
export interface FlowFlattenResult<N extends FlowNode = FlowNode, E extends FlowEdge = FlowEdge> {
  /** The document without group nodes; the input itself when it has no groups. */
  document: FlowDocument<N, E>;
  /** Flat edge id → original edge ids from source to target; a kept edge maps to itself. */
  chains: ReadonlyMap<string, readonly string[]>;
}

/** One end of an edge: a node and the port the edge uses there. */
export interface FlowLeafEnd {
  nodeId: string;
  portId?: string | undefined;
}

/** A leaf end reached from an edge end, with the original edges walked on the way. */
export interface FlowLeafPath extends FlowLeafEnd {
  /** Original edge ids in source-to-target order; empty for a leaf end itself. */
  chain: readonly string[];
}

/** A leaf-to-leaf connection of the flattened graph and the original edges it resolves. */
export interface FlowLeafPair {
  /** The flat edge id. */
  id: string;
  source: FlowLeafEnd;
  target: FlowLeafEnd;
  chain: readonly string[];
}

interface GroupIndex {
  schema: FlowSchema | undefined;
  groups: ReadonlySet<string>;
  /** Edges by the end they leave from, keyed `node\0port`. */
  bySource: ReadonlyMap<string, readonly FlowEdge[]>;
  /** Edges by the end they arrive at, keyed `node\0port`. */
  byTarget: ReadonlyMap<string, readonly FlowEdge[]>;
  flat?: FlowFlattenResult;
  pairs?: ReadonlyMap<string, readonly FlowLeafPair[]>;
}

const cache = new WeakMap<FlowDocument, GroupIndex>();

function endKey(nodeId: string, portId: string | undefined): string {
  return `${nodeId}\u0000${portId ?? ''}`;
}

function push(map: Map<string, FlowEdge[]>, key: string, edge: FlowEdge): void {
  const list = map.get(key);
  if (list) list.push(edge);
  else map.set(key, [edge]);
}

function indexOf(doc: FlowDocument, schema: FlowSchema | undefined): GroupIndex {
  const cached = cache.get(doc);
  if (cached && cached.schema === schema) return cached;
  const definitions = new Map<string, FlowNodeDefinition>(
    schema?.nodes.map((definition) => [definition.type, definition]) ?? [],
  );
  const groups = new Set<string>();
  for (const node of doc.nodes) {
    const definition =
      definitions.get(node.type) ??
      (node.type === FLOW_GROUP_TYPE ? FLOW_GROUP_DEFINITION : undefined);
    if (definition?.shape === 'group') groups.add(node.id);
  }
  const bySource = new Map<string, FlowEdge[]>();
  const byTarget = new Map<string, FlowEdge[]>();
  if (groups.size > 0)
    for (const edge of doc.edges) {
      push(bySource, endKey(edge.source, edge.sourcePort), edge);
      push(byTarget, endKey(edge.target, edge.targetPort), edge);
    }
  const index: GroupIndex = { schema, groups, bySource, byTarget };
  cache.set(doc, index);
  return index;
}

/** Walks from a group end along the port chains; `on` marks the ends of the current path. */
function walk(
  index: GroupIndex,
  end: FlowLeafEnd,
  role: 'source' | 'target',
  chain: readonly string[],
  on: Set<string>,
  out: FlowLeafPath[],
): void {
  if (!index.groups.has(end.nodeId)) {
    out.push({ nodeId: end.nodeId, portId: end.portId, chain });
    return;
  }
  const key = endKey(end.nodeId, end.portId);
  const mark = `${role}\u0000${key}`;
  if (on.has(mark)) return;
  on.add(mark);
  // Leaving a group port downstream follows the edges that start there, upstream those that end.
  const next = (role === 'target' ? index.bySource : index.byTarget).get(key) ?? [];
  for (const edge of next) {
    if (role === 'target')
      walk(
        index,
        { nodeId: edge.target, portId: edge.targetPort },
        role,
        [...chain, edge.id],
        on,
        out,
      );
    else
      walk(
        index,
        { nodeId: edge.source, portId: edge.sourcePort },
        role,
        [edge.id, ...chain],
        on,
        out,
      );
  }
  on.delete(mark);
}

/**
 * The leaf ends an edge end stands for: the end itself on a leaf; for a group port, the leaves
 * upstream of it (`source`, where its data comes from) or downstream of it (`target`, where its
 * data goes), through any depth. A port without a chain yields nothing.
 */
export function flowLeafEnds(
  document: FlowDocument,
  end: FlowLeafEnd,
  role: 'source' | 'target',
  options: FlowFlattenOptions = {},
): FlowLeafPath[] {
  const index = indexOf(document, options.schema);
  const out: FlowLeafPath[] = [];
  walk(index, end, role, [], new Set(), out);
  return out;
}

/**
 * Resolves every chain of group-port edges into direct leaf-to-leaf edges, through any depth,
 * pass-throughs, fan-out and fan-in included, and removes the group nodes; chains that end at a
 * port without a counterpart produce nothing. A flat edge made of several original edges is
 * identified by their ids joined with `>`; an edge between two leaves keeps its object and id.
 */
export function flattenFlowGroups<N extends FlowNode, E extends FlowEdge>(
  doc: FlowDocument<N, E>,
  options: FlowFlattenOptions = {},
): FlowFlattenResult<N, E> {
  const index = indexOf(doc, options.schema);
  if (index.flat) return index.flat as unknown as FlowFlattenResult<N, E>;
  const chains = new Map<string, readonly string[]>();
  if (index.groups.size === 0) {
    for (const edge of doc.edges) chains.set(edge.id, [edge.id]);
    index.flat = { document: doc, chains };
    return index.flat as unknown as FlowFlattenResult<N, E>;
  }
  const edges: E[] = [];
  for (const edge of doc.edges) {
    if (index.groups.has(edge.source)) continue;
    if (!index.groups.has(edge.target)) {
      edges.push(edge);
      chains.set(edge.id, [edge.id]);
      continue;
    }
    const reached: FlowLeafPath[] = [];
    walk(
      index,
      { nodeId: edge.target, portId: edge.targetPort },
      'target',
      [edge.id],
      new Set(),
      reached,
    );
    for (const leaf of reached) {
      let id = leaf.chain.join('>');
      for (let suffix = 2; chains.has(id); suffix += 1) id = `${leaf.chain.join('>')}~${suffix}`;
      const flat = { ...edge, id, target: leaf.nodeId } as E;
      if (leaf.portId !== undefined) flat.targetPort = leaf.portId;
      else delete flat.targetPort;
      delete flat.waypoints;
      edges.push(flat);
      chains.set(id, leaf.chain);
    }
  }
  index.flat = {
    document: {
      ...doc,
      nodes: doc.nodes.filter((node) => !index.groups.has(node.id)),
      edges,
    },
    chains,
  };
  return index.flat as unknown as FlowFlattenResult<N, E>;
}

/** The leaf-to-leaf connections an original edge takes part in (empty for a dangling chain). */
export function flowEdgeLeafPairs(
  document: FlowDocument,
  edgeId: string,
  options: FlowFlattenOptions = {},
): readonly FlowLeafPair[] {
  const index = indexOf(document, options.schema);
  if (!index.pairs) {
    const flat = flattenFlowGroups(document, options);
    const byEdge = new Map(flat.document.edges.map((edge) => [edge.id, edge]));
    const pairs = new Map<string, FlowLeafPair[]>();
    for (const [id, chain] of flat.chains) {
      const edge = byEdge.get(id);
      if (!edge) continue;
      const pair: FlowLeafPair = {
        id,
        source: { nodeId: edge.source, portId: edge.sourcePort },
        target: { nodeId: edge.target, portId: edge.targetPort },
        chain,
      };
      for (const original of chain) {
        const list = pairs.get(original);
        if (list) list.push(pair);
        else pairs.set(original, [pair]);
      }
    }
    index.pairs = pairs;
  }
  return index.pairs.get(edgeId) ?? [];
}

/** The group node ids of a document, by the same rule flattening uses. */
export function flowGroupIds(
  document: FlowDocument,
  options: FlowFlattenOptions = {},
): ReadonlySet<string> {
  return indexOf(document, options.schema).groups;
}
