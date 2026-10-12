import type { FlowPoint, FlowRect } from './types.js';
import { distanceToRect, rectContains, rectContainsPoint, rectsIntersect } from './geometry.js';

/**
 * Uniform grid hash over rects keyed by string id. Items map to dense ints with parallel typed
 * arrays; queries stamp visited ints with a generation counter instead of allocating sets.
 * Items that span more than `oversizedThreshold` cells (group containers) live in a linear
 * list that every query scans. Cell size follows the median item extent on `rebuild()`.
 */
export interface SpatialIndexOptions {
  cellSize?: number;
  oversizedThreshold?: number;
  minCellSize?: number;
  maxCellSize?: number;
}

const CELL_OFFSET = 2 ** 19;
const CELL_STRIDE = 2 ** 20;

function cellKey(cx: number, cy: number): number {
  return (cx + CELL_OFFSET) * CELL_STRIDE + (cy + CELL_OFFSET);
}

function nextPowerOfTwo(value: number): number {
  return 2 ** Math.ceil(Math.log2(Math.max(value, 1)));
}

export class SpatialIndex {
  readonly #ids: string[] = [];
  readonly #index = new Map<string, number>();
  readonly #free: number[] = [];
  #x1: Float64Array = new Float64Array(64);
  #y1: Float64Array = new Float64Array(64);
  #x2: Float64Array = new Float64Array(64);
  #y2: Float64Array = new Float64Array(64);
  #cx1: Int32Array = new Int32Array(64);
  #cy1: Int32Array = new Int32Array(64);
  #cx2: Int32Array = new Int32Array(64);
  #cy2: Int32Array = new Int32Array(64);
  #stamp: Int32Array = new Int32Array(64);
  readonly #oversized = new Set<number>();
  readonly #cells = new Map<number, number[]>();
  #generation = 0;
  #cellSize: number;
  #explicitCellSize: boolean;
  readonly #oversizedThreshold: number;
  readonly #minCellSize: number;
  readonly #maxCellSize: number;
  #count = 0;
  #countAtBuild = 0;

  constructor(options: SpatialIndexOptions = {}) {
    this.#cellSize = options.cellSize ?? 256;
    this.#explicitCellSize = options.cellSize !== undefined;
    this.#oversizedThreshold = options.oversizedThreshold ?? 256;
    this.#minCellSize = options.minCellSize ?? 128;
    this.#maxCellSize = options.maxCellSize ?? 1024;
  }

  get size(): number {
    return this.#count;
  }

  get cellSize(): number {
    return this.#cellSize;
  }

  has(id: string): boolean {
    return this.#index.has(id);
  }

  rectOf(id: string): FlowRect | undefined {
    const int = this.#index.get(id);
    if (int === undefined) return undefined;
    return this.#rect(int);
  }

  insert(id: string, rect: FlowRect): void {
    const existing = this.#index.get(id);
    if (existing !== undefined) {
      this.update(id, rect);
      return;
    }
    const int = this.#allocate(id);
    this.#write(int, rect);
    this.#place(int);
    this.#count += 1;
    if (!this.#explicitCellSize && this.#count >= Math.max(64, this.#countAtBuild * 2))
      this.rebuild();
  }

  update(id: string, rect: FlowRect): void {
    const int = this.#index.get(id);
    if (int === undefined) {
      this.insert(id, rect);
      return;
    }
    const range = this.#range(rect);
    if (
      range.cx1 === this.#cx1[int] &&
      range.cy1 === this.#cy1[int] &&
      range.cx2 === this.#cx2[int] &&
      range.cy2 === this.#cy2[int]
    ) {
      this.#x1[int] = rect.x;
      this.#y1[int] = rect.y;
      this.#x2[int] = rect.x + rect.width;
      this.#y2[int] = rect.y + rect.height;
      return;
    }
    this.#unplace(int);
    this.#write(int, rect);
    this.#place(int);
  }

  remove(id: string): void {
    const int = this.#index.get(id);
    if (int === undefined) return;
    this.#unplace(int);
    this.#index.delete(id);
    this.#ids[int] = '';
    this.#free.push(int);
    this.#count -= 1;
  }

  clear(): void {
    this.#ids.length = 0;
    this.#index.clear();
    this.#free.length = 0;
    this.#oversized.clear();
    this.#cells.clear();
    this.#count = 0;
    this.#countAtBuild = 0;
  }

  /** Recomputes the cell size from the median item extent and re-places every item. */
  rebuild(): void {
    this.#countAtBuild = this.#count;
    if (!this.#explicitCellSize && this.#count > 0) {
      const extents: number[] = [];
      for (const int of this.#index.values())
        extents.push(Math.max(this.#x2[int]! - this.#x1[int]!, this.#y2[int]! - this.#y1[int]!));
      extents.sort((a, b) => a - b);
      const median = extents[Math.floor(extents.length / 2)] ?? 0;
      this.#cellSize = Math.min(
        this.#maxCellSize,
        Math.max(this.#minCellSize, nextPowerOfTwo(2 * median)),
      );
    }
    this.#cells.clear();
    this.#oversized.clear();
    for (const int of this.#index.values()) {
      const range = this.#range(this.#rect(int));
      this.#cx1[int] = range.cx1;
      this.#cy1[int] = range.cy1;
      this.#cx2[int] = range.cx2;
      this.#cy2[int] = range.cy2;
      this.#place(int);
    }
  }

  /** Ids whose rect overlaps `rect` (or lies fully inside it when `partially` is false). */
  queryRect(rect: FlowRect, partially = true, out: string[] = []): string[] {
    const generation = this.#nextGeneration();
    const range = this.#range(rect);
    const test = (int: number): void => {
      if (this.#stamp[int] === generation) return;
      this.#stamp[int] = generation;
      const candidate = this.#rect(int);
      if (partially ? rectsIntersect(rect, candidate) : rectContains(rect, candidate))
        out.push(this.#ids[int]!);
    };
    for (let cx = range.cx1; cx <= range.cx2; cx += 1)
      for (let cy = range.cy1; cy <= range.cy2; cy += 1) {
        const bucket = this.#cells.get(cellKey(cx, cy));
        if (!bucket) continue;
        for (const int of bucket) test(int);
      }
    for (const int of this.#oversized) test(int);
    return out;
  }

  /** Ids whose rect contains `point`. */
  queryPoint(point: FlowPoint, out: string[] = []): string[] {
    const generation = this.#nextGeneration();
    const test = (int: number): void => {
      if (this.#stamp[int] === generation) return;
      this.#stamp[int] = generation;
      if (rectContainsPoint(this.#rect(int), point)) out.push(this.#ids[int]!);
    };
    const cx = Math.floor(point.x / this.#cellSize);
    const cy = Math.floor(point.y / this.#cellSize);
    const bucket = this.#cells.get(cellKey(cx, cy));
    if (bucket) for (const int of bucket) test(int);
    for (const int of this.#oversized) test(int);
    return out;
  }

  /** The accepted item closest to `point` within `radius`; ties keep the lower int. */
  nearest(
    point: FlowPoint,
    radius: number,
    accept?: (id: string, rect: FlowRect) => boolean,
  ): { id: string; distance: number } | undefined {
    const candidates = this.queryRect({
      x: point.x - radius,
      y: point.y - radius,
      width: radius * 2,
      height: radius * 2,
    });
    let best: { id: string; distance: number; int: number } | undefined;
    for (const id of candidates) {
      const int = this.#index.get(id)!;
      const rect = this.#rect(int);
      if (accept && !accept(id, rect)) continue;
      const d = distanceToRect(point, rect);
      if (d > radius) continue;
      if (!best || d < best.distance || (d === best.distance && int < best.int))
        best = { id, distance: d, int };
    }
    return best ? { id: best.id, distance: best.distance } : undefined;
  }

  #nextGeneration(): number {
    this.#generation += 1;
    if (this.#generation === 0x7fffffff) {
      this.#generation = 1;
      this.#stamp.fill(0);
    }
    return this.#generation;
  }

  #rect(int: number): FlowRect {
    return {
      x: this.#x1[int]!,
      y: this.#y1[int]!,
      width: this.#x2[int]! - this.#x1[int]!,
      height: this.#y2[int]! - this.#y1[int]!,
    };
  }

  #range(rect: FlowRect): { cx1: number; cy1: number; cx2: number; cy2: number } {
    const size = this.#cellSize;
    return {
      cx1: Math.floor(rect.x / size),
      cy1: Math.floor(rect.y / size),
      cx2: Math.floor((rect.x + rect.width) / size),
      cy2: Math.floor((rect.y + rect.height) / size),
    };
  }

  #allocate(id: string): number {
    let int = this.#free.pop();
    if (int === undefined) {
      int = this.#ids.length;
      if (int >= this.#x1.length) this.#grow();
    }
    this.#ids[int] = id;
    this.#index.set(id, int);
    return int;
  }

  #grow(): void {
    const next = this.#x1.length * 2;
    const f64 = (array: Float64Array): Float64Array => {
      const bigger = new Float64Array(next);
      bigger.set(array);
      return bigger;
    };
    const i32 = (array: Int32Array): Int32Array => {
      const bigger = new Int32Array(next);
      bigger.set(array);
      return bigger;
    };
    this.#x1 = f64(this.#x1);
    this.#y1 = f64(this.#y1);
    this.#x2 = f64(this.#x2);
    this.#y2 = f64(this.#y2);
    this.#cx1 = i32(this.#cx1);
    this.#cy1 = i32(this.#cy1);
    this.#cx2 = i32(this.#cx2);
    this.#cy2 = i32(this.#cy2);
    this.#stamp = i32(this.#stamp);
  }

  #write(int: number, rect: FlowRect): void {
    this.#x1[int] = rect.x;
    this.#y1[int] = rect.y;
    this.#x2[int] = rect.x + rect.width;
    this.#y2[int] = rect.y + rect.height;
    const range = this.#range(rect);
    this.#cx1[int] = range.cx1;
    this.#cy1[int] = range.cy1;
    this.#cx2[int] = range.cx2;
    this.#cy2[int] = range.cy2;
  }

  #place(int: number): void {
    const cells = (this.#cx2[int]! - this.#cx1[int]! + 1) * (this.#cy2[int]! - this.#cy1[int]! + 1);
    if (cells > this.#oversizedThreshold) {
      this.#oversized.add(int);
      return;
    }
    for (let cx = this.#cx1[int]!; cx <= this.#cx2[int]!; cx += 1)
      for (let cy = this.#cy1[int]!; cy <= this.#cy2[int]!; cy += 1) {
        const key = cellKey(cx, cy);
        const bucket = this.#cells.get(key);
        if (bucket) bucket.push(int);
        else this.#cells.set(key, [int]);
      }
  }

  #unplace(int: number): void {
    if (this.#oversized.delete(int)) return;
    for (let cx = this.#cx1[int]!; cx <= this.#cx2[int]!; cx += 1)
      for (let cy = this.#cy1[int]!; cy <= this.#cy2[int]!; cy += 1) {
        const key = cellKey(cx, cy);
        const bucket = this.#cells.get(key);
        if (!bucket) continue;
        const at = bucket.indexOf(int);
        if (at >= 0) {
          bucket[at] = bucket[bucket.length - 1]!;
          bucket.pop();
        }
        if (bucket.length === 0) this.#cells.delete(key);
      }
  }
}
