import type { LayeredGraph } from './dummies.js';
import type { Ordering } from './ordering.js';

/**
 * Brandes–Köpf horizontal coordinate assignment (cross axis), adapted to measured sizes:
 * four alignments (top/bottom × left/right), each a vertical alignment to medians that
 * respects type-1 conflicts, compacted into blocks with size-aware separation; the result is
 * the median of the four (or the left-/right-most pair for `start` / `end`).
 */
export interface CoordinateOptions {
  /** Cross-axis extent per node. */
  extent: (node: number) => number;
  spacing: number;
  align?: 'start' | 'center' | 'end';
}

export function assignCoordinates(
  layered: LayeredGraph,
  ordering: Ordering,
  options: CoordinateOptions,
): Float64Array {
  const conflicts = findType1Conflicts(layered, ordering);
  const results: Array<{ xs: Float64Array; vertical: 'u' | 'd'; horizontal: 'l' | 'r' }> = [];
  for (const vertical of ['u', 'd'] as const) {
    const layers = vertical === 'u' ? ordering.layers : ordering.layers.slice().reverse();
    for (const horizontal of ['l', 'r'] as const) {
      const oriented =
        horizontal === 'l' ? layers : layers.map((members) => members.slice().reverse());
      const position = new Int32Array(layered.count);
      for (const members of oriented) members.forEach((node, at) => (position[node] = at));
      const { root, align } = verticalAlignment(
        layered,
        oriented,
        position,
        conflicts,
        vertical === 'u',
      );
      const xs = horizontalCompaction(layered, oriented, position, root, align, options);
      if (horizontal === 'r') for (let node = 0; node < xs.length; node += 1) xs[node] = -xs[node]!;
      results.push({ xs, vertical, horizontal });
    }
  }
  const smallest = findSmallestWidthAlignment(
    layered,
    results.map((result) => result.xs),
    options,
  );
  alignCoordinates(layered, results, smallest, options);
  const align = options.align ?? 'center';
  const x = new Float64Array(layered.count);
  if (align === 'start') {
    const left = results.filter((result) => result.horizontal === 'l').map((result) => result.xs);
    for (let node = 0; node < layered.count; node += 1)
      x[node] = Math.min(left[0]![node]!, left[1]![node]!);
  } else if (align === 'end') {
    const right = results.filter((result) => result.horizontal === 'r').map((result) => result.xs);
    for (let node = 0; node < layered.count; node += 1)
      x[node] = Math.max(right[0]![node]!, right[1]![node]!);
  } else {
    for (let node = 0; node < layered.count; node += 1) {
      const values = results.map((result) => result.xs[node]!).sort((a, b) => a - b);
      x[node] = (values[1]! + values[2]!) / 2;
    }
  }
  // Normalize so the leftmost extent starts at 0.
  let min = Infinity;
  for (let node = 0; node < layered.count; node += 1)
    min = Math.min(min, x[node]! - options.extent(node) / 2);
  if (Number.isFinite(min))
    for (let node = 0; node < layered.count; node += 1) x[node] = x[node]! - min;
  return x;
}

/** Type-1 conflicts: non-inner segments crossing inner (dummy–dummy) segments. */
function findType1Conflicts(layered: LayeredGraph, ordering: Ordering): Set<number> {
  const conflicts = new Set<number>();
  const key = (edge: number): number => edge;
  const layers = ordering.layers;
  const position = ordering.position;
  for (let index = 1; index < layers.length; index += 1) {
    const members = layers[index]!;
    let k0 = 0;
    let scanStart = 0;
    const previousSize = layers[index - 1]!.length;
    for (let at = 0; at < members.length; at += 1) {
      const node = members[at]!;
      const inner = innerSegmentSource(layered, node);
      if (inner !== undefined || at === members.length - 1) {
        const k1 = inner !== undefined ? position[inner]! : previousSize - 1;
        for (let scan = scanStart; scan <= at; scan += 1) {
          const candidate = members[scan]!;
          for (const edge of layered.in[candidate]!) {
            const source = layered.edgeSource[edge]!;
            const sourcePosition = position[source]!;
            const isInner = layered.isDummy[source] && layered.isDummy[candidate];
            if ((sourcePosition < k0 || sourcePosition > k1) && !isInner) conflicts.add(key(edge));
          }
        }
        scanStart = at + 1;
        k0 = k1;
      }
    }
  }
  return conflicts;
}

function innerSegmentSource(layered: LayeredGraph, node: number): number | undefined {
  if (!layered.isDummy[node]) return undefined;
  for (const edge of layered.in[node]!) {
    const source = layered.edgeSource[edge]!;
    if (layered.isDummy[source]) return source;
  }
  return undefined;
}

function verticalAlignment(
  layered: LayeredGraph,
  layers: number[][],
  position: Int32Array,
  conflicts: Set<number>,
  up: boolean,
): { root: Int32Array; align: Int32Array } {
  const root = new Int32Array(layered.count);
  const align = new Int32Array(layered.count);
  for (let node = 0; node < layered.count; node += 1) {
    root[node] = node;
    align[node] = node;
  }
  for (const members of layers) {
    let previous = -1;
    for (const node of members) {
      const edges = up ? layered.in[node]! : layered.out[node]!;
      if (edges.length === 0) continue;
      const neighbours = edges
        .map((edge) => ({ edge, node: up ? layered.edgeSource[edge]! : layered.edgeTarget[edge]! }))
        .sort((a, b) => position[a.node]! - position[b.node]!);
      const middle = (neighbours.length - 1) / 2;
      for (let m = Math.floor(middle); m <= Math.ceil(middle); m += 1) {
        if (align[node] !== node) continue;
        const { edge, node: neighbour } = neighbours[m]!;
        if (align[neighbour] !== neighbour) continue;
        if (previous >= position[neighbour]!) continue;
        if (conflicts.has(edge)) continue;
        align[neighbour] = node;
        root[node] = root[neighbour]!;
        align[node] = root[node]!;
        previous = position[neighbour]!;
      }
    }
  }
  return { root, align };
}

function horizontalCompaction(
  layered: LayeredGraph,
  layers: number[][],
  position: Int32Array,
  root: Int32Array,
  align: Int32Array,
  options: CoordinateOptions,
): Float64Array {
  const separation = (left: number, right: number): number => {
    const gap =
      layered.isDummy[left] || layered.isDummy[right] ? options.spacing / 2 : options.spacing;
    return options.extent(left) / 2 + options.extent(right) / 2 + gap;
  };
  // Block graph: for every node with a left neighbour, an edge root(left) → root(node).
  const blockEdges = new Map<number, Array<[number, number]>>();
  const inDegree = new Map<number, number>();
  const roots = new Set<number>();
  for (const members of layers)
    for (let at = 0; at < members.length; at += 1) {
      const node = members[at]!;
      roots.add(root[node]!);
      if (at === 0) continue;
      const left = members[at - 1]!;
      const from = root[left]!;
      const to = root[node]!;
      if (from === to) continue;
      const list = blockEdges.get(from) ?? [];
      list.push([to, separation(left, node)]);
      blockEdges.set(from, list);
      inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
    }
  void position;
  void align;
  const xs = new Map<number, number>();
  // Longest path from the sources of the block graph (minimum feasible positions).
  const ready = [...roots].filter((block) => !inDegree.has(block)).sort((a, b) => a - b);
  const remaining = new Map(inDegree);
  const order: number[] = [];
  while (ready.length > 0) {
    const block = ready.shift()!;
    order.push(block);
    const x = xs.get(block) ?? 0;
    xs.set(block, x);
    for (const [to, gap] of blockEdges.get(block) ?? []) {
      xs.set(to, Math.max(xs.get(to) ?? 0, x + gap));
      const left = remaining.get(to)! - 1;
      remaining.set(to, left);
      if (left === 0) {
        ready.push(to);
        ready.sort((a, b) => a - b);
      }
    }
  }
  // Pull blocks without successors right no further than their successors allow (compaction).
  for (let at = order.length - 1; at >= 0; at -= 1) {
    const block = order[at]!;
    const successors = blockEdges.get(block);
    if (!successors || successors.length === 0) continue;
    let min = Infinity;
    for (const [to, gap] of successors) min = Math.min(min, xs.get(to)! - gap);
    if (min > xs.get(block)!) xs.set(block, min);
  }
  const result = new Float64Array(layered.count);
  for (let node = 0; node < layered.count; node += 1) result[node] = xs.get(root[node]!) ?? 0;
  return result;
}

function findSmallestWidthAlignment(
  layered: LayeredGraph,
  alignments: Float64Array[],
  options: CoordinateOptions,
): number {
  let best = 0;
  let bestWidth = Infinity;
  alignments.forEach((xs, index) => {
    let min = Infinity;
    let max = -Infinity;
    for (let node = 0; node < layered.count; node += 1) {
      const half = options.extent(node) / 2;
      min = Math.min(min, xs[node]! - half);
      max = Math.max(max, xs[node]! + half);
    }
    const width = max - min;
    if (width < bestWidth - 1e-9) {
      bestWidth = width;
      best = index;
    }
  });
  return best;
}

function alignCoordinates(
  layered: LayeredGraph,
  results: Array<{ xs: Float64Array; horizontal: 'l' | 'r' }>,
  smallest: number,
  options: CoordinateOptions,
): void {
  const bounds = (xs: Float64Array): [number, number] => {
    let min = Infinity;
    let max = -Infinity;
    for (let node = 0; node < layered.count; node += 1) {
      const half = options.extent(node) / 2;
      min = Math.min(min, xs[node]! - half);
      max = Math.max(max, xs[node]! + half);
    }
    return [min, max];
  };
  const [targetMin, targetMax] = bounds(results[smallest]!.xs);
  results.forEach((result) => {
    const [min, max] = bounds(result.xs);
    const delta = result.horizontal === 'l' ? targetMin - min : targetMax - max;
    if (delta !== 0)
      for (let node = 0; node < layered.count; node += 1)
        result.xs[node] = result.xs[node]! + delta;
  });
}
