// Adapted from xyflow packages/system/src/utils/graph.ts at 3d35b5731 (MIT; see LICENSE.xyflow).
// Adapted from xyflow packages/system/src/utils/store.ts at 3d35b5731 (MIT; see LICENSE.xyflow).
// Adapted from xyflow packages/system/src/utils/edges/general.ts at 3d35b5731 (MIT; see LICENSE.xyflow).
import { unionRects } from '../geometry.js';
import type { FlowEdge, FlowNode, FlowRect } from '../types.js';

/** Graph queries over plain node and edge arrays; deterministic (document order breaks ties). */
export interface FlowGraphLike {
  nodes: readonly FlowNode[];
  edges: readonly FlowEdge[];
}

export interface FlowAdjacency {
  order: string[];
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
}

export function buildAdjacency(graph: FlowGraphLike, ignoreEdge?: string): FlowAdjacency {
  const order: string[] = [];
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const node of graph.nodes) {
    if (outgoing.has(node.id)) continue;
    order.push(node.id);
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }
  for (const edge of graph.edges) {
    if (edge.id === ignoreEdge) continue;
    const out = outgoing.get(edge.source);
    const inc = incoming.get(edge.target);
    if (!out || !inc) continue;
    out.push(edge.target);
    inc.push(edge.source);
  }
  return { order, outgoing, incoming };
}

function kahn(adjacency: FlowAdjacency): { order: string[]; complete: boolean } {
  const indegree = new Map<string, number>();
  for (const id of adjacency.order) indegree.set(id, adjacency.incoming.get(id)!.length);
  const ready: string[] = adjacency.order.filter((id) => indegree.get(id) === 0);
  const result: string[] = [];
  const position = new Map(adjacency.order.map((id, index) => [id, index]));
  while (ready.length) {
    ready.sort((a, b) => position.get(a)! - position.get(b)!);
    const id = ready.shift()!;
    result.push(id);
    for (const target of adjacency.outgoing.get(id)!) {
      const remaining = indegree.get(target)! - 1;
      indegree.set(target, remaining);
      if (remaining === 0) ready.push(target);
    }
  }
  return { order: result, complete: result.length === adjacency.order.length };
}

/** Kahn order over an adjacency, its order breaking ties; nodes on cycles are appended in it. */
export function adjacencyOrder(adjacency: FlowAdjacency): string[] {
  const { order, complete } = kahn(adjacency);
  if (complete) return order;
  const placed = new Set(order);
  for (const id of adjacency.order) if (!placed.has(id)) order.push(id);
  return order;
}

/** Kahn order with document-order ties; nodes on cycles are appended in document order. */
export function topologicalOrder(graph: FlowGraphLike): string[] {
  return adjacencyOrder(buildAdjacency(graph));
}

export function hasCycle(graph: FlowGraphLike): boolean {
  return !kahn(buildAdjacency(graph)).complete;
}

/** Nodes reachable from `from` along edge direction (`downstream`), against it (`upstream`) or both. */
export function reachable(
  graph: FlowGraphLike | FlowAdjacency,
  from: string | readonly string[],
  direction: 'downstream' | 'upstream' | 'both' = 'downstream',
): Set<string> {
  const adjacency = 'outgoing' in graph ? graph : buildAdjacency(graph);
  const stack = typeof from === 'string' ? [from] : [...from];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    if (direction !== 'upstream')
      for (const next of adjacency.outgoing.get(id) ?? []) stack.push(next);
    if (direction !== 'downstream')
      for (const next of adjacency.incoming.get(id) ?? []) stack.push(next);
  }
  for (const start of typeof from === 'string' ? [from] : from) seen.delete(start);
  return seen;
}

/** Whether adding `source → target` closes a cycle (self-connections count). */
export function wouldCreateCycle(
  graph: FlowGraphLike | FlowAdjacency,
  source: string,
  target: string,
  ignoreEdge?: string,
): boolean {
  if (source === target) return true;
  const adjacency = 'outgoing' in graph ? graph : buildAdjacency(graph, ignoreEdge);
  return reachable(adjacency, target, 'downstream').has(source);
}

/** Weakly connected components in document order of their first node. */
export function connectedComponents(graph: FlowGraphLike): string[][] {
  const adjacency = buildAdjacency(graph);
  const seen = new Set<string>();
  const components: string[][] = [];
  for (const id of adjacency.order) {
    if (seen.has(id)) continue;
    const component: string[] = [];
    const stack = [id];
    while (stack.length) {
      const current = stack.pop()!;
      if (seen.has(current)) continue;
      seen.add(current);
      component.push(current);
      for (const next of adjacency.outgoing.get(current) ?? []) stack.push(next);
      for (const next of adjacency.incoming.get(current) ?? []) stack.push(next);
    }
    const position = new Map(adjacency.order.map((node, index) => [node, index]));
    component.sort((a, b) => position.get(a)! - position.get(b)!);
    components.push(component);
  }
  return components;
}

export function nodesBounds(rects: Iterable<FlowRect>): FlowRect {
  return unionRects([...rects]);
}

/** Node z (xyflow `calculateZ` + child elevation): own `zIndex`, selected nodes raised, children above parents. */
export function nodeZ(
  node: Pick<FlowNode, 'zIndex' | 'selected'>,
  parentZ: number | undefined,
  selectedZ = 1000,
): number {
  const own = (Number.isFinite(node.zIndex) ? node.zIndex! : 0) + (node.selected ? selectedZ : 0);
  if (parentZ === undefined) return own;
  return parentZ >= own ? parentZ + 1 : own;
}

export interface FlowEdgeZParams {
  zIndex?: number | undefined;
  selected?: boolean | undefined;
  elevateOnSelect?: boolean | undefined;
  sourceZ: number;
  targetZ: number;
  /** The node has a parent or is selected while `elevateOnSelect` is on. */
  sourceElevated: boolean;
  targetElevated: boolean;
}

/** Edge z (xyflow `getElevatedEdgeZIndex`): edges sit below nodes unless a node they touch is elevated. */
export function edgeZ(params: FlowEdgeZParams): number {
  const zIndex = params.zIndex ?? 0;
  const edge = params.elevateOnSelect && params.selected ? zIndex + 1000 : zIndex;
  const node = Math.max(
    params.sourceElevated ? params.sourceZ : 0,
    params.targetElevated ? params.targetZ : 0,
  );
  return edge + node;
}
