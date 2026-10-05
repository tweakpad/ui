// Geometry adapted from Swiper updateSlides / updateSlidesProgress (MIT; see LICENSE).
import type { CarouselConfiguration } from './configuration.js';
import type { CarouselMeasurement } from './types.js';

export interface CarouselMeasuredItem {
  readonly index: number;
  readonly size: number;
  readonly disabled?: boolean;
}
export interface CarouselSnap {
  readonly position: number;
  readonly index: number;
  readonly members: readonly number[];
}
export interface CarouselLayout {
  readonly measured: boolean;
  readonly positions: readonly number[];
  readonly starts: readonly number[];
  readonly sizes: readonly number[];
  readonly indices: readonly number[];
  readonly snaps: readonly CarouselSnap[];
  readonly extent: number;
  readonly gap: number;
  readonly before: number;
  readonly after: number;
}
const empty = (): CarouselLayout =>
  Object.freeze({
    measured: false,
    positions: Object.freeze([]),
    starts: Object.freeze([]),
    sizes: Object.freeze([]),
    indices: Object.freeze([]),
    snaps: Object.freeze([]),
    extent: 0,
    gap: 0,
    before: 0,
    after: 0,
  });
const normalize = (value: number) => (Math.abs(value) < 0.001 ? 0 : value);

/** Logical source grid, independent of DOM order, input previews and the committed lane. */
export function carouselLayout(
  items: readonly CarouselMeasuredItem[],
  viewport: number,
  config: CarouselConfiguration,
  measurement: CarouselMeasurement = { width: viewport, height: viewport },
): CarouselLayout {
  if (!Number.isFinite(viewport) || viewport <= 0) return empty();
  const options = config.layout;
  const before =
    typeof options.offsetBefore === 'function'
      ? options.offsetBefore(measurement)
      : options.offsetBefore;
  const after =
    typeof options.offsetAfter === 'function'
      ? options.offsetAfter(measurement)
      : options.offsetAfter;
  if (![before, after].every((v) => Number.isFinite(v) && v >= 0))
    throw new RangeError('Carousel offsets must resolve to finite nonnegative numbers.');
  const usable = viewport - before - after;
  if (usable <= 0) return empty();
  const gap =
    typeof options.gap === 'string' ? (parseFloat(options.gap) * usable) / 100 : options.gap;
  const positions: number[] = [],
    starts: number[] = [],
    sizes: number[] = [],
    indices: number[] = [];
  const raw: Array<{ position: number; index: number; members: number[]; ordinal: number }> = [];
  let position = -before,
    previousSize = 0,
    extent = -gap - before - after;
  let nextAutoGroup = 0;
  for (const [ordinal, item] of items.entries()) {
    let size =
      options.itemsPerView === 'auto'
        ? item.size
        : (usable - (options.itemsPerView - 1) * gap) / options.itemsPerView;
    if (!Number.isFinite(size) || size < 0) return empty();
    if (options.roundLengths) size = Math.floor(size);
    if (options.centered) {
      position += size / 2 + previousSize / 2 + gap;
      if (previousSize === 0 && ordinal !== 0) position -= usable / 2 + gap;
      if (ordinal === 0) position -= usable / 2 + gap;
      position = normalize(position);
    }
    if (options.roundLengths) position = Math.floor(position);
    const groupStart = options.groupAuto
      ? ordinal >= nextAutoGroup
      : options.centered
        ? ordinal % config.itemsPerMovement === 0
        : (ordinal - Math.min(options.groupSkip, ordinal)) % config.itemsPerMovement === 0;
    if (groupStart) {
      raw.push({ position, index: item.index, members: [], ordinal });
      if (options.groupAuto) {
        let used = 0,
          visible = 0;
        for (let cursor = ordinal; cursor < items.length; cursor++) {
          const candidate = items[cursor]!;
          if (visible && used + gap + candidate.size > usable) break;
          used += candidate.size + (visible ? gap : 0);
          visible++;
        }
        nextAutoGroup = ordinal + Math.max(1, visible);
      }
    }
    raw.at(-1)?.members.push(item.index);
    starts.push(ordinal === 0 ? 0 : starts[ordinal - 1]! + sizes[ordinal - 1]! + gap);
    positions.push(position);
    sizes.push(size);
    indices.push(item.index);
    if (!options.centered) position += size + gap;
    previousSize = size;
    extent += size + gap;
  }
  extent = Math.max(extent, usable) + after;
  let snaps = raw;
  if (
    !options.centered &&
    (!config.loop || sizes.reduce((sum, size) => sum + size + gap, -gap) <= usable)
  ) {
    const edge =
      options.snapToItemEdge &&
      !config.loop &&
      (options.itemsPerView === 'auto' || options.itemsPerView % 1 !== 0);
    let lastOrdinal = items.length;
    if (edge) {
      let count = options.itemsPerView === 'auto' ? 1 : Math.floor(options.itemsPerView);
      if (options.itemsPerView === 'auto') {
        let accumulated = 0;
        for (let i = sizes.length - 1; i >= 0; i--) {
          accumulated += sizes[i]! + (i < sizes.length - 1 ? gap : 0);
          if (accumulated > usable) break;
          count = sizes.length - i;
        }
      }
      lastOrdinal = Math.max(items.length - count, 0);
    }
    // Unlike upstream's snap-array index, ordinal remains correct with grouped slides.
    snaps = raw.filter((snap) =>
      edge ? snap.ordinal <= lastOrdinal : snap.position <= extent - usable,
    );
    if (
      !edge &&
      snaps.length &&
      Math.floor(extent - usable) - Math.floor(snaps.at(-1)!.position) > 1
    ) {
      const terminalPosition = extent - usable;
      // The terminal snap keeps the next logical group's identity. A partially
      // visible member of the preceding group cannot give two snaps one value.
      const nextGroup = raw.find((snap) => snap.position > snaps.at(-1)!.position);
      const ordinal = nextGroup?.ordinal ?? Math.max(0, items.length - 1);
      snaps.push({
        position: terminalPosition,
        index: indices[ordinal]!,
        members: nextGroup?.members ?? indices.slice(ordinal),
        ordinal,
      });
    }
  }
  if (options.centered && options.centeredBounds) {
    const total = sizes.reduce((sum, size) => sum + size + gap, -gap);
    const maximum = Math.max(0, total - usable);
    snaps = snaps.map((snap) => ({
      ...snap,
      position:
        snap.position <= 0 ? -before : snap.position > maximum ? maximum + after : snap.position,
    }));
  }
  if (options.centerInsufficient) {
    const total = sizes.reduce((sum, size) => sum + size + gap, -gap);
    if (total < usable) {
      const offset = (usable - total) / 2;
      snaps = snaps.map((snap) => ({ ...snap, position: snap.position - offset }));
      positions.forEach((value, index) => (positions[index] = value + offset));
    }
  }
  const enabled = new Set(items.filter((item) => !item.disabled).map((item) => item.index));
  const distinct: Array<{ position: number; index: number; members: number[] }> = [];
  for (const snap of snaps) {
    const prior = distinct.at(-1);
    if (prior && Math.abs(prior.position - snap.position) < 0.001) {
      for (const index of snap.members)
        if (!prior.members.includes(index)) prior.members.push(index);
      if (!enabled.has(prior.index))
        prior.index = prior.members.find((index) => enabled.has(index)) ?? prior.index;
      continue;
    }
    distinct.push({
      position: normalize(snap.position),
      index: snap.members.find((index) => enabled.has(index)) ?? snap.index,
      members: [...snap.members],
    });
  }
  return Object.freeze({
    measured: true,
    positions: Object.freeze(positions),
    starts: Object.freeze(starts),
    sizes: Object.freeze(sizes),
    indices: Object.freeze(indices),
    snaps: Object.freeze(
      distinct
        .filter((snap) => enabled.has(snap.index))
        .map((snap) => Object.freeze({ ...snap, members: Object.freeze(snap.members) })),
    ),
    extent,
    gap,
    before,
    after,
  });
}

export function closestCarouselSnap(layout: CarouselLayout, position: number): number | null {
  if (!layout.snaps.length || !Number.isFinite(position)) return null;
  let closest = 0;
  for (let index = 1; index < layout.snaps.length; index++) {
    if (
      Math.abs(layout.snaps[index]!.position - position) <
      Math.abs(layout.snaps[closest]!.position - position)
    )
      closest = index;
  }
  return closest;
}
export function carouselVisible(
  layout: CarouselLayout,
  position: number,
  viewport: number,
  fully = false,
  loop = false,
): number[] {
  const cycle = layout.sizes.reduce((sum, size) => sum + size + layout.gap, 0);
  return layout.indices.filter((_, ordinal) => {
    const origin = layout.starts[ordinal]!;
    const cycleIndex = loop && cycle > 0 ? Math.floor((position - origin) / cycle) : 0;
    return (loop ? [cycleIndex, cycleIndex + 1] : [0]).some((index) => {
      const start = origin + index * cycle,
        end = start + layout.sizes[ordinal]!;
      return fully
        ? start >= position - 0.001 && end <= position + viewport + 0.001
        : end > position && start < position + viewport;
    });
  });
}
export function carouselSnapForIndex(layout: CarouselLayout, index: number): number | null {
  if (!layout.snaps.length) return null;
  const exact = layout.snaps.findIndex((snap) => snap.index === index);
  if (exact >= 0) return exact;
  const member = layout.snaps.findIndex((snap) => snap.members.includes(index));
  if (member >= 0) return member;
  let best = 0;
  for (let candidate = 1; candidate < layout.snaps.length; candidate++) {
    if (
      Math.abs(layout.snaps[candidate]!.index - index) < Math.abs(layout.snaps[best]!.index - index)
    )
      best = candidate;
  }
  return best;
}
