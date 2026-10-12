/**
 * Binary min-heap over dense integer keys with a primary and a secondary priority and the key
 * itself as the last tie-break, so equal priorities pop in a deterministic order. Positions are
 * stamped per generation, which makes `clear()` O(1) and lets one heap serve every A* run.
 */
export class IndexHeap {
  #heap: Int32Array;
  #primary: Float64Array;
  #secondary: Float64Array;
  #position: Int32Array;
  #stamp: Int32Array;
  #generation = 1;
  #size = 0;

  constructor(capacity = 1024) {
    const size = Math.max(1, capacity);
    this.#heap = new Int32Array(size);
    this.#primary = new Float64Array(size);
    this.#secondary = new Float64Array(size);
    this.#position = new Int32Array(size);
    this.#stamp = new Int32Array(size);
  }

  get size(): number {
    return this.#size;
  }

  get capacity(): number {
    return this.#position.length;
  }

  /** Grows the key space; existing entries are kept. */
  ensureCapacity(capacity: number): void {
    if (capacity <= this.#position.length) return;
    let next = this.#position.length;
    while (next < capacity) next *= 2;
    const heap = new Int32Array(next);
    heap.set(this.#heap);
    this.#heap = heap;
    const primary = new Float64Array(next);
    primary.set(this.#primary);
    this.#primary = primary;
    const secondary = new Float64Array(next);
    secondary.set(this.#secondary);
    this.#secondary = secondary;
    const position = new Int32Array(next);
    position.set(this.#position);
    this.#position = position;
    const stamp = new Int32Array(next);
    stamp.set(this.#stamp);
    this.#stamp = stamp;
  }

  clear(): void {
    this.#size = 0;
    this.#generation += 1;
    if (this.#generation === 0x7fffffff) {
      this.#generation = 1;
      this.#stamp.fill(0);
    }
  }

  has(key: number): boolean {
    return this.#stamp[key] === this.#generation && this.#position[key]! >= 0;
  }

  /** Inserts `key` or re-prioritizes it (both directions). */
  push(key: number, primary: number, secondary = 0): void {
    if (key >= this.#position.length) this.ensureCapacity(key + 1);
    if (this.has(key)) {
      const at = this.#position[key]!;
      const wasPrimary = this.#primary[key]!;
      const wasSecondary = this.#secondary[key]!;
      this.#primary[key] = primary;
      this.#secondary[key] = secondary;
      if (primary < wasPrimary || (primary === wasPrimary && secondary < wasSecondary))
        this.#siftUp(at);
      else this.#siftDown(at);
      return;
    }
    const at = this.#size;
    this.#size += 1;
    if (at >= this.#heap.length) this.ensureCapacity(at + 1);
    this.#heap[at] = key;
    this.#primary[key] = primary;
    this.#secondary[key] = secondary;
    this.#stamp[key] = this.#generation;
    this.#position[key] = at;
    this.#siftUp(at);
  }

  peek(): number {
    return this.#size === 0 ? -1 : this.#heap[0]!;
  }

  /** The key with the smallest (primary, secondary, key); `-1` when empty. */
  pop(): number {
    if (this.#size === 0) return -1;
    const top = this.#heap[0]!;
    this.#size -= 1;
    this.#position[top] = -1;
    if (this.#size > 0) {
      const last = this.#heap[this.#size]!;
      this.#heap[0] = last;
      this.#position[last] = 0;
      this.#siftDown(0);
    }
    return top;
  }

  priorityOf(key: number): number {
    return this.#primary[key]!;
  }

  #less(a: number, b: number): boolean {
    const pa = this.#primary[a]!;
    const pb = this.#primary[b]!;
    if (pa !== pb) return pa < pb;
    const sa = this.#secondary[a]!;
    const sb = this.#secondary[b]!;
    if (sa !== sb) return sa < sb;
    return a < b;
  }

  #siftUp(at: number): void {
    const heap = this.#heap;
    const key = heap[at]!;
    while (at > 0) {
      const parentAt = (at - 1) >> 1;
      const parent = heap[parentAt]!;
      if (!this.#less(key, parent)) break;
      heap[at] = parent;
      this.#position[parent] = at;
      at = parentAt;
    }
    heap[at] = key;
    this.#position[key] = at;
  }

  #siftDown(at: number): void {
    const heap = this.#heap;
    const size = this.#size;
    const key = heap[at]!;
    for (;;) {
      const left = at * 2 + 1;
      if (left >= size) break;
      const right = left + 1;
      let child = left;
      if (right < size && this.#less(heap[right]!, heap[left]!)) child = right;
      const childKey = heap[child]!;
      if (!this.#less(childKey, key)) break;
      heap[at] = childKey;
      this.#position[childKey] = at;
      at = child;
    }
    heap[at] = key;
    this.#position[key] = at;
  }
}
