/**
 * Cumulative item extents (a Fenwick tree): updating one extent and locating the item at an
 * offset are logarithmic in the item count.
 */
export class ExtentIndex {
  #tree: Float64Array;
  #extents: Float64Array;
  #count: number;

  constructor(extents: ArrayLike<number> = []) {
    this.#count = extents.length;
    this.#extents = Float64Array.from(extents);
    this.#tree = new Float64Array(this.#count + 1);
    for (let index = 0; index < this.#count; index++) {
      const position = index + 1;
      this.#tree[position]! += this.#extents[index]!;
      const parent = position + (position & -position);
      if (parent <= this.#count) this.#tree[parent]! += this.#tree[position]!;
    }
  }

  get count(): number {
    return this.#count;
  }

  get total(): number {
    return this.offset(this.#count);
  }

  extent(index: number): number {
    return this.#extents[index] ?? 0;
  }

  set(index: number, extent: number): number {
    if (index < 0 || index >= this.#count) return 0;
    const delta = extent - this.#extents[index]!;
    if (!delta) return 0;
    this.#extents[index] = extent;
    for (let position = index + 1; position <= this.#count; position += position & -position)
      this.#tree[position]! += delta;
    return delta;
  }

  /** Sum of the extents before `index`. */
  offset(index: number): number {
    let sum = 0;
    for (
      let position = Math.min(index, this.#count);
      position > 0;
      position -= position & -position
    )
      sum += this.#tree[position]!;
    return sum;
  }

  /** The item covering `offset` (clamped to the list). */
  indexAt(offset: number): number {
    if (this.#count === 0) return -1;
    if (offset <= 0) return 0;
    let position = 0;
    let remaining = offset;
    for (let step = 1 << Math.floor(Math.log2(this.#count)); step > 0; step >>= 1) {
      const next = position + step;
      if (next <= this.#count && this.#tree[next]! <= remaining) {
        position = next;
        remaining -= this.#tree[next]!;
      }
    }
    return Math.min(position, this.#count - 1);
  }
}

export interface VirtualRange {
  /** First mounted index (inclusive). */
  from: number;
  /** Last mounted index (exclusive). */
  to: number;
  /** Space before the first mounted item. */
  before: number;
  /** Space after the last mounted item. */
  after: number;
}

/** Items intersecting `[start, end)` plus `overscan` on each side. */
export function virtualRange(
  index: ExtentIndex,
  start: number,
  end: number,
  overscan: number,
): VirtualRange {
  if (!index.count || end <= start) return { from: 0, to: 0, before: 0, after: index.total };
  const first = index.indexAt(start);
  const last = index.indexAt(Math.max(start, end - 0.5));
  const from = Math.max(0, first - overscan);
  const to = Math.min(index.count, last + 1 + overscan);
  const total = index.total;
  return { from, to, before: index.offset(from), after: Math.max(0, total - index.offset(to)) };
}
