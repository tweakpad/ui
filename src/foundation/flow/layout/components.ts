import type { FlowLayoutDirection, FlowPoint, FlowRect } from '../types.js';
import type { LayoutGraph } from './graph.js';

/** Connected components as node index lists, ordered by their smallest member. */
export function splitComponents(graph: LayoutGraph): number[][] {
  const parent = new Int32Array(graph.count);
  for (let node = 0; node < graph.count; node += 1) parent[node] = node;
  const find = (node: number): number => {
    let root = node;
    while (parent[root] !== root) root = parent[root]!;
    while (parent[node] !== root) {
      const next = parent[node]!;
      parent[node] = root;
      node = next;
    }
    return root;
  };
  for (const edge of graph.edges) {
    const a = find(edge.source);
    const b = find(edge.target);
    if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
  }
  const groups = new Map<number, number[]>();
  for (let node = 0; node < graph.count; node += 1) {
    const root = find(node);
    const list = groups.get(root);
    if (list) list.push(node);
    else groups.set(root, [node]);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, members]) => members);
}

export interface PackOptions {
  mode: 'grid' | 'rows' | 'none';
  spacing: number;
  direction: FlowLayoutDirection;
  /** Target width/height ratio of the packed result (`grid`). */
  aspect: number;
}

/**
 * Offsets that place component boxes (each normalized to its own origin) without overlap:
 * `grid` packs shelves toward the aspect ratio, `rows` stacks components along the cross axis
 * (one flow row each), `none` returns zero offsets (callers keep previous origins).
 */
export function packComponents(boxes: readonly FlowRect[], options: PackOptions): FlowPoint[] {
  const offsets: FlowPoint[] = boxes.map(() => ({ x: 0, y: 0 }));
  if (boxes.length <= 1 || options.mode === 'none') return offsets;
  const { spacing, direction } = options;
  const horizontal = direction === 'horizontal';
  if (options.mode === 'rows') {
    // Stack along the cross axis: rows for a horizontal flow, columns for a vertical one.
    let cursor = 0;
    boxes.forEach((box, index) => {
      offsets[index] = horizontal ? { x: 0, y: cursor } : { x: cursor, y: 0 };
      cursor += (horizontal ? box.height : box.width) + spacing;
    });
    return offsets;
  }
  let area = 0;
  let widest = 0;
  for (const box of boxes) {
    area += (box.width + spacing) * (box.height + spacing);
    widest = Math.max(widest, box.width);
  }
  const shelfWidth = Math.max(widest, Math.sqrt(area * options.aspect));
  let x = 0;
  let y = 0;
  let shelfHeight = 0;
  boxes.forEach((box, index) => {
    if (x > 0 && x + box.width > shelfWidth) {
      x = 0;
      y += shelfHeight + spacing;
      shelfHeight = 0;
    }
    offsets[index] = { x, y };
    x += box.width + spacing;
    shelfHeight = Math.max(shelfHeight, box.height);
  });
  return offsets;
}
