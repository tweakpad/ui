import { rebuildAdjacency, type LayoutGraph } from './graph.js';

/**
 * Makes the graph acyclic by reversing DFS back edges (nodes visited in index order, edges in
 * adjacency order, so the result is deterministic). Reversed edges keep their ids and are
 * flagged `reversed`; `restoreCycles` swaps them back.
 */
export function removeCycles(graph: LayoutGraph): { reversed: number[] } {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Uint8Array(graph.count);
  const reversed: number[] = [];
  const stack: Array<{ node: number; cursor: number }> = [];
  for (let start = 0; start < graph.count; start += 1) {
    if (color[start] !== WHITE) continue;
    color[start] = GRAY;
    stack.push({ node: start, cursor: 0 });
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const outgoing = graph.out[frame.node]!;
      if (frame.cursor >= outgoing.length) {
        color[frame.node] = BLACK;
        stack.pop();
        continue;
      }
      const edge = graph.edges[outgoing[frame.cursor]!]!;
      frame.cursor += 1;
      const target = edge.target;
      if (color[target] === GRAY) {
        reversed.push(edge.index);
        continue;
      }
      if (color[target] === WHITE) {
        color[target] = GRAY;
        stack.push({ node: target, cursor: 0 });
      }
    }
  }
  for (const index of reversed) flip(graph, index);
  if (reversed.length > 0) rebuildAdjacency(graph);
  return { reversed };
}

export function restoreCycles(graph: LayoutGraph, reversed: readonly number[]): void {
  for (const index of reversed) flip(graph, index);
  if (reversed.length > 0) rebuildAdjacency(graph);
}

function flip(graph: LayoutGraph, index: number): void {
  const edge = graph.edges[index]!;
  const source = edge.source;
  edge.source = edge.target;
  edge.target = source;
  const fraction = edge.sourceFraction;
  edge.sourceFraction = edge.targetFraction;
  edge.targetFraction = fraction;
  edge.reversed = !edge.reversed;
}

/** Whether the acyclic graph still has a cycle (guard for tests). */
export function layoutHasCycle(graph: LayoutGraph): boolean {
  const indegree = new Int32Array(graph.count);
  for (const edge of graph.edges) indegree[edge.target] = indegree[edge.target]! + 1;
  const ready: number[] = [];
  for (let node = 0; node < graph.count; node += 1) if (indegree[node] === 0) ready.push(node);
  let seen = 0;
  while (ready.length > 0) {
    const node = ready.pop()!;
    seen += 1;
    for (const edgeIndex of graph.out[node]!) {
      const target = graph.edges[edgeIndex]!.target;
      indegree[target] = indegree[target]! - 1;
      if (indegree[target] === 0) ready.push(target);
    }
  }
  return seen !== graph.count;
}
