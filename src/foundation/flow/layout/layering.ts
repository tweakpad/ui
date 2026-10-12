import { layoutTopologicalOrder, type LayoutGraph } from './graph.js';

export interface Layering {
  /** Layer per node. */
  layer: Int32Array;
  count: number;
}

/**
 * Longest-path layering from the sources, then a promotion pass that moves every node with
 * more out-edges than in-edges as close to its successors as possible (shorter edges, no
 * stranded sources at layer 0). Deterministic: topological order, index ties.
 */
export function assignLayers(graph: LayoutGraph): Layering {
  const layer = new Int32Array(graph.count);
  const order = layoutTopologicalOrder(graph);
  for (const node of order) {
    let best = 0;
    for (const edgeIndex of graph.in[node]!) {
      const source = graph.edges[edgeIndex]!.source;
      best = Math.max(best, layer[source]! + 1);
    }
    layer[node] = best;
  }
  promote(graph, layer, order);
  let count = 0;
  for (let node = 0; node < graph.count; node += 1) count = Math.max(count, layer[node]! + 1);
  return { layer, count: graph.count === 0 ? 0 : count };
}

function promote(graph: LayoutGraph, layer: Int32Array, order: Int32Array): void {
  for (let pass = 0; pass < graph.count; pass += 1) {
    let changed = false;
    for (let at = order.length - 1; at >= 0; at -= 1) {
      const node = order[at]!;
      const outgoing = graph.out[node]!;
      if (outgoing.length === 0) continue;
      let outWeight = 0;
      let inWeight = 0;
      let candidate = Infinity;
      for (const edgeIndex of outgoing) {
        const edge = graph.edges[edgeIndex]!;
        outWeight += edge.weight;
        candidate = Math.min(candidate, layer[edge.target]! - 1);
      }
      for (const edgeIndex of graph.in[node]!) inWeight += graph.edges[edgeIndex]!.weight;
      if (outWeight > inWeight && candidate > layer[node]!) {
        layer[node] = candidate;
        changed = true;
      }
    }
    if (!changed) break;
  }
}

/** Nodes grouped per layer, in index order. */
export function layerMembers(layering: Layering): number[][] {
  const layers: number[][] = Array.from({ length: layering.count }, () => []);
  for (let node = 0; node < layering.layer.length; node += 1)
    layers[layering.layer[node]!]!.push(node);
  return layers;
}
