// Buffer/permutation arithmetic adapted from Swiper loopFix (MIT; see LICENSE).
import type { CarouselConfiguration } from './configuration.js';
import type { CarouselLayout } from './layout.js';
import { carouselModulo } from './virtual.js';

export interface CarouselLoopPlan {
  readonly mode: 'finite' | 'continuous' | 'rewind';
  readonly buffer: number;
  readonly group: number;
  readonly bothDirections: boolean;
  readonly visible: number;
  readonly fillers: number;
  readonly reason: string | null;
}
export function carouselLoopPlan(
  layout: CarouselLayout,
  config: CarouselConfiguration,
  viewport: number,
  activeOrdinal = 0,
): CarouselLoopPlan {
  const count = layout.indices.length;
  if (!config.loop || !layout.measured || layout.snaps.length <= 1)
    return Object.freeze({
      mode: 'finite',
      buffer: 0,
      group: 1,
      bothDirections: false,
      visible: 0,
      fillers: 0,
      reason: null,
    });
  let visible =
    typeof config.layout.itemsPerView === 'number' ? Math.ceil(config.layout.itemsPerView) : 1;
  if (config.layout.itemsPerView === 'auto') {
    let size = layout.sizes[activeOrdinal] ?? 0;
    for (let next = activeOrdinal + 1; next < count && size < viewport; next++) {
      size += layout.sizes[next]! + layout.gap;
      visible++;
    }
    if (config.layout.centered)
      for (let previous = activeOrdinal - 1; previous >= 0 && size < viewport; previous--) {
        size += layout.sizes[previous]! + layout.gap;
        visible++;
      }
  }
  const both = config.layout.centered || layout.before > 0 || layout.after > 0;
  if (both && typeof config.layout.itemsPerView === 'number' && visible % 2 === 0) visible++;
  const group = config.layout.groupAuto ? visible : config.itemsPerMovement;
  const step =
    count > 1 ? (layout.positions.at(-1)! - layout.positions[0]!) / (count - 1) : viewport;
  let buffer = both
    ? Math.max(
        group,
        (config.layout.centered ? Math.ceil(visible / 2) : 0) +
          Math.ceil(step > 0 ? Math.max(layout.before, layout.after) / step : 0),
      )
    : group;
  buffer = Math.ceil(buffer / group) * group + config.loopOptions.additionalItems;
  const remainder = count % group;
  const fillers = remainder && config.loopOptions.fillGroups ? group - remainder : 0;
  const reason =
    count < visible + buffer
      ? 'insufficient-distinct-items'
      : remainder && !config.loopOptions.fillGroups
        ? 'incomplete-group'
        : null;
  return Object.freeze({
    mode: config.loopMode === 'rewind' || reason ? 'rewind' : 'continuous',
    buffer,
    group,
    bothDirections: both,
    visible,
    fillers,
    reason: config.loopMode === 'rewind' ? null : reason,
  });
}

/** Permutes owned shell keys only; source membership and consumer DOM order never change. */
export function carouselLoopPermutation<T>(
  order: readonly T[],
  active: number,
  plan: CarouselLoopPlan,
  direction: 'previous' | 'next' | undefined,
  centered: boolean,
  offsetBefore = 0,
  gridStep = 1,
  initial = false,
): readonly T[] {
  if (plan.mode !== 'continuous' || !order.length) return order;
  const both = plan.bothDirections;
  const shifted =
    active +
    (both
      ? (centered ? -plan.visible / 2 + 0.5 : 0) - (gridStep > 0 ? offsetBefore / gridStep : 0)
      : 0);
  let rotation = 0;
  if (shifted < plan.buffer && direction !== 'next') rotation = -Math.ceil(plan.buffer - shifted);
  else if (shifted + plan.visible > order.length - plan.buffer && direction !== 'previous') {
    rotation = Math.ceil(Math.max(shifted - (order.length - plan.buffer * 2), plan.group));
    if (initial && !both) rotation = Math.max(rotation, plan.visible - order.length + active + 1);
  }
  if (!rotation) return order;
  const start = carouselModulo(rotation, order.length);
  return Object.freeze([...order.slice(start), ...order.slice(0, start)]);
}
