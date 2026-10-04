import type { PanelBounds, PanelExtent } from './types.js';
const epsilon = 0.00001;
export const equalSizes = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((v, i) => Math.abs(v - b[i]!) < epsilon);
export function extentInPixels(
  value: PanelExtent | undefined,
  group: number,
  font: number,
  rootFont: number,
  viewport: { width: number; height: number },
): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : undefined;
  const match = value?.trim().match(/^([+]?(?:\d+\.?\d*|\.\d+))(px|%|em|rem|vh|vw)?$/);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unit = match[2] ?? '%';
  const scale = {
    px: 1,
    '%': group / 100,
    em: font,
    rem: rootFont,
    vh: viewport.height / 100,
    vw: viewport.width / 100,
  }[unit];
  return scale === undefined ? undefined : amount * scale;
}
const sizeWithin = (size: number, bound: PanelBounds) =>
  bound.collapsible && size < bound.min
    ? bound.collapsed
    : Math.max(bound.min, Math.min(bound.max, size));
/** Redistribution visits neighbors in logical order; disabled sizes are immutable. */
function distribute(
  sizes: number[],
  bounds: readonly PanelBounds[],
  order: readonly number[],
  amount: number,
): number {
  let remaining = amount;
  for (const index of order) {
    const bound = bounds[index]!;
    if (bound.disabled || Math.abs(remaining) < epsilon) continue;
    const previous = sizes[index]!;
    const next = sizeWithin(previous + remaining, bound);
    sizes[index] = next;
    remaining -= next - previous;
    // Crossing a collapsed gap can consume more than the requested movement.
    if (Math.sign(remaining) !== Math.sign(amount)) break;
  }
  return amount - remaining;
}
export function normalizeLayout(
  requested: readonly number[],
  bounds: readonly PanelBounds[],
  extent: number,
  previous: readonly number[] = [],
  order = bounds.map((_, i) => i),
): { sizes: number[]; feasible: boolean } {
  const sizes = bounds.map((bound, i) =>
    bound.disabled && previous[i] !== undefined
      ? previous[i]!
      : sizeWithin(Number.isFinite(requested[i]) ? requested[i]! : bound.min, bound),
  );
  // Prefer expanded panels before expanding a collapsed one merely to fill space.
  const prioritized = [
    ...order.filter((i) => !bounds[i]!.collapsible || sizes[i] !== bounds[i]!.collapsed),
    ...order.filter((i) => bounds[i]!.collapsible && sizes[i] === bounds[i]!.collapsed),
  ];
  for (let pass = 0; pass <= bounds.length; pass++) {
    const remaining = extent - sizes.reduce((sum, value) => sum + value, 0);
    if (Math.abs(remaining) < epsilon) break;
    const before = [...sizes];
    distribute(sizes, bounds, prioritized, remaining);
    if (equalSizes(before, sizes)) break;
  }
  return {
    sizes,
    feasible:
      Math.abs(extent - sizes.reduce((sum, value) => sum + value, 0)) < epsilon &&
      sizes.every((size, i) => {
        const bound = bounds[i]!;
        return (
          (bound.collapsible && Math.abs(size - bound.collapsed) < epsilon) ||
          (size >= bound.min && size <= bound.max)
        );
      }),
  };
}
/** Transfer space between two ordered sets while preserving the total exactly. */
function transfer(
  current: readonly number[],
  bounds: readonly PanelBounds[],
  grow: readonly number[],
  shrink: readonly number[],
  amount: number,
): number[] {
  if (!Number.isFinite(amount) || amount <= 0) return [...current];
  const next = [...current];
  const released = -distribute(next, bounds, shrink, -amount);
  const accepted = distribute(next, bounds, grow, released);
  if (Math.abs(accepted - released) < epsilon) return next;
  // Capacity may be smaller than the request; repeat against that capacity.
  const constrained = [...current];
  const releasedAgain = -distribute(constrained, bounds, shrink, -accepted);
  const acceptedAgain = distribute(constrained, bounds, grow, releasedAgain);
  return Math.abs(acceptedAgain - releasedAgain) < epsilon ? constrained : [...current];
}
export function resizeBoundary(
  current: readonly number[],
  bounds: readonly PanelBounds[],
  boundary: number,
  delta: number,
): number[] {
  const left = Array.from({ length: boundary + 1 }, (_, i) => boundary - i);
  const right = Array.from({ length: current.length - boundary - 1 }, (_, i) => boundary + 1 + i);
  return delta >= 0
    ? transfer(current, bounds, left, right, delta)
    : transfer(current, bounds, right, left, -delta);
}
export function resizePanel(
  current: readonly number[],
  bounds: readonly PanelBounds[],
  index: number,
  requested: number,
): number[] {
  if (!bounds[index] || bounds[index]!.disabled) return [...current];
  const target = sizeWithin(requested, bounds[index]!);
  const others = [
    ...Array.from({ length: current.length - index - 1 }, (_, i) => index + i + 1),
    ...Array.from({ length: index }, (_, i) => index - i - 1),
  ];
  return target >= current[index]!
    ? transfer(current, bounds, [index], others, target - current[index]!)
    : transfer(current, bounds, others, [index], current[index]! - target);
}
