import type { FlowLayoutEdge, FlowLayoutNode } from './types.js';

/**
 * Dense-int graph for the layered pipeline: nodes map to indices, multi-edges merge into one
 * weighted edge (ids kept), self-loops are dropped. Port order travels as a fraction in
 * `[-0.5, 0.5)` per edge end so the median ordering keeps edges in port order.
 */
export interface LayoutGraphEdge {
  index: number;
  source: number;
  target: number;
  weight: number;
  /** Original edge ids merged into this edge. */
  ids: string[];
  sourceFraction: number;
  targetFraction: number;
  /** Set by cycle removal; `source`/`target` are then the reversed direction. */
  reversed: boolean;
}

export interface LayoutGraph {
  count: number;
  ids: string[];
  index: Map<string, number>;
  width: Float64Array;
  height: Float64Array;
  edges: LayoutGraphEdge[];
  /** Edge indices leaving / entering each node. */
  out: number[][];
  in: number[][];
}

export function portFraction(
  ports: readonly FlowLayoutNode['ports'][number][],
  portId: string | undefined,
  direction: 'input' | 'output',
): number {
  if (portId === undefined) return 0;
  const same = ports.filter((port) => port.direction === direction);
  const port = same.find((candidate) => candidate.id === portId);
  if (!port || same.length < 2) return 0;
  const sorted = [...same].sort((a, b) => a.index - b.index);
  const at = sorted.indexOf(port);
  return (at + 0.5) / sorted.length - 0.5;
}

export function buildLayoutGraph(
  nodes: readonly FlowLayoutNode[],
  edges: readonly FlowLayoutEdge[],
): LayoutGraph {
  const ids = nodes.map((node) => node.id);
  const index = new Map(ids.map((id, at) => [id, at]));
  const width = new Float64Array(nodes.length);
  const height = new Float64Array(nodes.length);
  nodes.forEach((node, at) => {
    width[at] = node.size.width;
    height[at] = node.size.height;
  });
  const merged = new Map<number, LayoutGraphEdge>();
  const list: LayoutGraphEdge[] = [];
  for (const edge of edges) {
    const source = index.get(edge.source);
    const target = index.get(edge.target);
    if (source === undefined || target === undefined || source === target) continue;
    const key = source * nodes.length + target;
    const sourceFraction = portFraction(nodes[source]!.ports, edge.sourcePort, 'output');
    const targetFraction = portFraction(nodes[target]!.ports, edge.targetPort, 'input');
    const existing = merged.get(key);
    if (existing) {
      existing.sourceFraction =
        (existing.sourceFraction * existing.weight + sourceFraction) / (existing.weight + 1);
      existing.targetFraction =
        (existing.targetFraction * existing.weight + targetFraction) / (existing.weight + 1);
      existing.weight += 1;
      existing.ids.push(edge.id);
      continue;
    }
    const record: LayoutGraphEdge = {
      index: list.length,
      source,
      target,
      weight: 1,
      ids: [edge.id],
      sourceFraction,
      targetFraction,
      reversed: false,
    };
    merged.set(key, record);
    list.push(record);
  }
  const graph: LayoutGraph = {
    count: nodes.length,
    ids,
    index,
    width,
    height,
    edges: list,
    out: [],
    in: [],
  };
  rebuildAdjacency(graph);
  return graph;
}

export function rebuildAdjacency(graph: LayoutGraph): void {
  graph.out = Array.from({ length: graph.count }, () => []);
  graph.in = Array.from({ length: graph.count }, () => []);
  for (const edge of graph.edges) {
    graph.out[edge.source]!.push(edge.index);
    graph.in[edge.target]!.push(edge.index);
  }
}

/** The induced subgraph over `members` (in the given order), with re-indexed nodes and edges. */
export function subgraph(graph: LayoutGraph, members: readonly number[]): LayoutGraph {
  const remap = new Map<number, number>();
  members.forEach((node, at) => remap.set(node, at));
  const width = new Float64Array(members.length);
  const height = new Float64Array(members.length);
  members.forEach((node, at) => {
    width[at] = graph.width[node]!;
    height[at] = graph.height[node]!;
  });
  const edges: LayoutGraphEdge[] = [];
  for (const edge of graph.edges) {
    const source = remap.get(edge.source);
    const target = remap.get(edge.target);
    if (source === undefined || target === undefined) continue;
    edges.push({ ...edge, index: edges.length, source, target, ids: [...edge.ids] });
  }
  const ids = members.map((node) => graph.ids[node]!);
  const result: LayoutGraph = {
    count: members.length,
    ids,
    index: new Map(ids.map((id, at) => [id, at])),
    width,
    height,
    edges,
    out: [],
    in: [],
  };
  rebuildAdjacency(result);
  return result;
}

/** Kahn topological order (index order among ready nodes); throws on a cycle. */
export function layoutTopologicalOrder(graph: LayoutGraph): Int32Array {
  const indegree = new Int32Array(graph.count);
  for (const edge of graph.edges) indegree[edge.target] = indegree[edge.target]! + 1;
  const ready: number[] = [];
  for (let node = graph.count - 1; node >= 0; node -= 1) if (indegree[node] === 0) ready.push(node);
  const order = new Int32Array(graph.count);
  let count = 0;
  while (ready.length > 0) {
    const node = ready.pop()!;
    order[count] = node;
    count += 1;
    const next: number[] = [];
    for (const edgeIndex of graph.out[node]!) {
      const target = graph.edges[edgeIndex]!.target;
      indegree[target] = indegree[target]! - 1;
      if (indegree[target] === 0) next.push(target);
    }
    // Keep index order among newly ready nodes (stack pops the smallest last).
    next.sort((a, b) => b - a);
    for (const target of next) ready.push(target);
  }
  if (count !== graph.count) throw new Error('layoutTopologicalOrder: graph has a cycle');
  return order;
}
