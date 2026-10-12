import type { LayeredGraph } from './dummies.js';

/**
 * Crossing minimization: weighted median sweeps (down, then up) over the layered graph with
 * port-order fractions, a transpose pass per sweep, best-of-N orderings with an early stop.
 * Every tie breaks on the current position, then on the node index.
 */
export interface OrderingOptions {
  iterations?: number;
  transpose?: boolean;
}

export interface Ordering {
  /** Members per layer in their final order. */
  layers: number[][];
  /** Position of every node within its layer. */
  position: Int32Array;
  crossings: number;
}

export function minimizeCrossings(layered: LayeredGraph, options: OrderingOptions = {}): Ordering {
  const iterations = Math.max(1, options.iterations ?? 8);
  const transpose = options.transpose ?? true;
  const layers = initialOrder(layered);
  const position = new Int32Array(layered.count);
  const writePositions = (): void => {
    for (const members of layers) members.forEach((node, at) => (position[node] = at));
  };
  writePositions();
  let best = layers.map((members) => members.slice());
  let bestCrossings = countCrossings(layered, layers, position);
  let stale = 0;
  // The first sweep always runs: port order alone is worth a pass even without crossings.
  for (
    let iteration = 0;
    iteration < iterations && (iteration === 0 || bestCrossings > 0);
    iteration += 1
  ) {
    const down = iteration % 2 === 0;
    if (down)
      for (let index = 1; index < layers.length; index += 1)
        medianSort(layered, layers, position, index, true);
    else
      for (let index = layers.length - 2; index >= 0; index -= 1)
        medianSort(layered, layers, position, index, false);
    writePositions();
    if (transpose) transposeLayers(layered, layers, position);
    const crossings = countCrossings(layered, layers, position);
    if (crossings < bestCrossings) {
      bestCrossings = crossings;
      best = layers.map((members) => members.slice());
      stale = 0;
    } else {
      stale += 1;
      if (stale >= 2) break;
    }
  }
  for (const members of best) members.forEach((node, at) => (position[node] = at));
  return { layers: best, position, crossings: bestCrossings };
}

/** First layer in index order, later layers by the mean position of their predecessors. */
function initialOrder(layered: LayeredGraph): number[][] {
  const layers = layered.layers.map((members) => members.slice());
  const position = new Float64Array(layered.count);
  layers[0]?.forEach((node, at) => (position[node] = at));
  for (let index = 1; index < layers.length; index += 1) {
    const members = layers[index]!;
    const key = new Map<number, number>();
    for (const node of members) {
      const incoming = layered.in[node]!;
      if (incoming.length === 0) {
        key.set(node, Number.MAX_SAFE_INTEGER);
        continue;
      }
      let sum = 0;
      for (const edge of incoming) sum += position[layered.edgeSource[edge]!]!;
      key.set(node, sum / incoming.length);
    }
    members.sort((a, b) => key.get(a)! - key.get(b)! || a - b);
    members.forEach((node, at) => (position[node] = at));
  }
  return layers;
}

/** Weighted median of the neighbour positions (plus port fractions) in the fixed layer. */
function medianSort(
  layered: LayeredGraph,
  layers: number[][],
  position: Int32Array,
  index: number,
  down: boolean,
): void {
  const members = layers[index]!;
  const keys = new Map<number, number | undefined>();
  for (const node of members) {
    const edges = down ? layered.in[node]! : layered.out[node]!;
    if (edges.length === 0) {
      keys.set(node, undefined);
      continue;
    }
    const samples: Array<[number, number]> = [];
    let total = 0;
    for (const edge of edges) {
      const neighbour = down ? layered.edgeSource[edge]! : layered.edgeTarget[edge]!;
      const fraction = down ? layered.sourceFraction[edge]! : layered.targetFraction[edge]!;
      const weight = layered.edgeWeight[edge]!;
      samples.push([position[neighbour]! + fraction, weight]);
      total += weight;
    }
    samples.sort((a, b) => a[0] - b[0]);
    keys.set(node, weightedMedian(samples, total));
  }
  // Nodes without neighbours keep their relative position (they inherit a key from the order).
  const fallback = new Map<number, number>();
  let last = -Infinity;
  for (const node of members) {
    const key = keys.get(node);
    if (key !== undefined) last = key;
    fallback.set(node, key ?? (Number.isFinite(last) ? last + 0.5 : -Infinity));
  }
  members.sort(
    (a, b) => fallback.get(a)! - fallback.get(b)! || position[a]! - position[b]! || a - b,
  );
}

function weightedMedian(samples: ReadonlyArray<[number, number]>, total: number): number {
  if (samples.length === 1) return samples[0]![0];
  const half = total / 2;
  let accumulated = 0;
  for (let at = 0; at < samples.length; at += 1) {
    const [value, weight] = samples[at]!;
    const next = accumulated + weight;
    if (next > half) return value;
    if (next === half) {
      const following = samples[at + 1];
      return following ? (value + following[0]) / 2 : value;
    }
    accumulated = next;
  }
  return samples[samples.length - 1]![0];
}

/** Swaps adjacent pairs while that lowers the crossings with both neighbouring layers. */
function transposeLayers(layered: LayeredGraph, layers: number[][], position: Int32Array): void {
  let improved = true;
  let guard = 0;
  while (improved && guard < 8) {
    improved = false;
    guard += 1;
    for (const members of layers) {
      for (let at = 0; at < members.length - 1; at += 1) {
        const v = members[at]!;
        const w = members[at + 1]!;
        const before = pairCrossings(layered, position, v, w);
        const after = pairCrossings(layered, position, w, v);
        if (after < before) {
          members[at] = w;
          members[at + 1] = v;
          position[w] = at;
          position[v] = at + 1;
          improved = true;
        }
      }
    }
  }
}

/** Crossings among the edges of `v` and `w` when `v` sits left of `w`. */
function pairCrossings(layered: LayeredGraph, position: Int32Array, v: number, w: number): number {
  let count = 0;
  for (const edges of [layered.in, layered.out]) {
    const source = edges === layered.in;
    for (const ev of edges[v]!) {
      const nv = source ? layered.edgeSource[ev]! : layered.edgeTarget[ev]!;
      for (const ew of edges[w]!) {
        const nw = source ? layered.edgeSource[ew]! : layered.edgeTarget[ew]!;
        if (position[nv]! > position[nw]!)
          count += layered.edgeWeight[ev]! * layered.edgeWeight[ew]!;
      }
    }
  }
  return count;
}

/**
 * Weighted crossings over every pair of adjacent layers (Barth–Jünger–Mutzel accumulation).
 * Port fractions refine both ends, so edges leaving one node through different ports cross
 * when their targets are in the wrong order.
 */
export function countCrossings(
  layered: LayeredGraph,
  layers: number[][],
  position: Int32Array,
): number {
  let total = 0;
  for (let index = 0; index < layers.length - 1; index += 1) {
    const edges: Array<[number, number, number]> = [];
    for (const node of layers[index]!)
      for (const edge of layered.out[node]!)
        edges.push([
          position[node]! + layered.sourceFraction[edge]!,
          position[layered.edgeTarget[edge]!]! + layered.targetFraction[edge]!,
          layered.edgeWeight[edge]!,
        ]);
    if (edges.length < 2) continue;
    edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    // Compress the target keys to ranks for the accumulation tree.
    const keys = [...new Set(edges.map((edge) => edge[1]))].sort((a, b) => a - b);
    const rank = new Map(keys.map((key, at) => [key, at]));
    for (const edge of edges) edge[1] = rank.get(edge[1])!;
    const size = keys.length;
    let firstIndex = 1;
    while (firstIndex < size) firstIndex *= 2;
    const tree = new Float64Array(2 * firstIndex - 1);
    const offset = firstIndex - 1;
    for (const [, target, weight] of edges) {
      let at = target + offset;
      tree[at] = tree[at]! + weight;
      while (at > 0) {
        if (at % 2 === 1) total += tree[at + 1]! * weight;
        at = (at - 1) >> 1;
        tree[at] = tree[at]! + weight;
      }
    }
  }
  return total;
}
