// Range arithmetic adapted from Swiper Virtual (MIT; see LICENSE).
import type { CarouselConfiguration } from './configuration.js';
import type { CarouselId, CarouselItem, CarouselVirtualRange } from './types.js';
import type { CarouselLayout } from './layout.js';

export function carouselModulo(index: number, count: number): number {
  return count > 0 ? ((index % count) + count) % count : 0;
}
export function carouselVirtualRange(
  items: readonly CarouselItem[],
  active: number,
  viewport: number,
  layout: CarouselLayout,
  config: CarouselConfiguration,
  loop: boolean,
  visibleIds: readonly CarouselId[] = [],
  pinnedId: CarouselId | null = null,
): CarouselVirtualRange {
  const count = items.length;
  if (!count || !config.virtual)
    return Object.freeze({
      from: 0,
      to: -1,
      offset: 0,
      visibleIds: Object.freeze([]),
      mountedIds: Object.freeze([]),
      pinnedId: null,
    });
  const view =
    config.layout.itemsPerView === 'auto'
      ? Math.max(1, Math.ceil(viewport / config.virtual.itemSize))
      : Math.ceil(config.layout.itemsPerView);
  const group = config.itemsPerMovement;
  const before =
    (config.layout.centered ? Math.floor(view / 2) + group : loop ? view : group) +
    config.virtual.before;
  const after =
    (config.layout.centered ? Math.floor(view / 2) + group : view + group - 1) +
    config.virtual.after;
  let from = Math.floor(active - before),
    to = Math.ceil(active + after);
  if (!loop) {
    from = Math.max(0, from);
    to = Math.min(count - 1, to);
  }
  // At most one projection owns each interactive ID, even for multi-cycle overscan.
  if (to - from + 1 > count) {
    from = Math.max(from, active - Math.min(before, count - 1));
    to = from + count - 1;
  }
  const mounted: CarouselId[] = [];
  for (let position = from; position <= to; position++) {
    const item = items[loop ? carouselModulo(position, count) : position];
    if (item && !mounted.includes(item.id)) mounted.push(item.id);
  }
  const pin =
    pinnedId !== null && items.some((item) => item.id === pinnedId) && !mounted.includes(pinnedId)
      ? pinnedId
      : null;
  if (pin !== null) mounted.push(pin);
  const normalized = carouselModulo(from, count);
  const cycleSize = layout.sizes.reduce((sum, size) => sum + size + layout.gap, 0);
  const offset =
    (layout.positions[normalized] ?? 0) -
    (layout.positions[0] ?? 0) +
    (loop ? Math.floor(from / count) * cycleSize : 0);
  return Object.freeze({
    from,
    to,
    offset,
    visibleIds: Object.freeze([...visibleIds]),
    mountedIds: Object.freeze(mounted),
    pinnedId: pin,
  });
}

/** Renderer/content generation is explicit; false-valued content is a valid cache entry. */
export class CarouselVirtualCache<T> {
  readonly #cache = new Map<CarouselId, { value: unknown; rendered: T }>();
  #generation: unknown;
  reset(generation: unknown): void {
    if (generation !== this.#generation) {
      this.#cache.clear();
      this.#generation = generation;
    }
  }
  retain(ids: ReadonlySet<CarouselId>): void {
    for (const id of this.#cache.keys()) if (!ids.has(id)) this.#cache.delete(id);
  }
  render(id: CarouselId, value: unknown, renderer: () => T, cache: boolean): T {
    const entry = this.#cache.get(id);
    if (cache && entry && Object.is(entry.value, value)) return entry.rendered;
    const rendered = renderer();
    if (cache) this.#cache.set(id, { value, rendered });
    else this.#cache.delete(id);
    return rendered;
  }
  clear(): void {
    this.#cache.clear();
  }
}
