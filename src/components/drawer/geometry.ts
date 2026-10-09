import type { DrawerDimensions, DrawerSnapPoint, ResolvedSnapPoint } from './types.js';
import { clamp } from '../../foundation/converters.js';
/** Fractions are Drawer-specific; these are measured lengths, never presentation spacing. */
export function snapExtent(value: DrawerSnapPoint | null, d: DrawerDimensions): number | undefined {
  if (typeof value === 'number')
    return Number.isFinite(value)
      ? value >= 0 && value <= 1
        ? value * d.viewport
        : value
      : undefined;
  if (typeof value !== 'string') return undefined;
  const match = value
    .trim()
    .match(/^([+-]?(?:\d+\.?\d*|\.\d+))(px|%|rem|em|vh|vw|dvh|dvw|vmin|vmax)$/);
  if (!match) return d.resolveLength?.(value);
  const units: Record<string, number> = {
    px: 1,
    '%': d.viewport / 100,
    rem: d.rootFont,
    em: d.font,
    vh: d.height / 100,
    dvh: d.height / 100,
    vw: d.width / 100,
    dvw: d.width / 100,
    vmin: Math.min(d.width, d.height) / 100,
    vmax: Math.max(d.width, d.height) / 100,
  };
  return Number(match[1]) * units[match[2]!]!;
}
export function resolveSnapPoints(
  points: readonly DrawerSnapPoint[],
  d: DrawerDimensions,
): ResolvedSnapPoint[] {
  if (d.extent <= 0 || d.viewport <= 0) return [];
  const resolved: ResolvedSnapPoint[] = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const value = points[i]!;
    const raw = snapExtent(value, d);
    if (raw === undefined || !Number.isFinite(raw)) continue;
    const extent = clamp(raw, 0, Math.min(d.extent, d.viewport));
    if (!resolved.some((p) => Math.abs(p.extent - extent) <= 1))
      resolved.unshift({ value, extent, offset: d.extent - extent });
  }
  return resolved;
}
export function nearestPoint(
  points: readonly ResolvedSnapPoint[],
  extent: number,
): ResolvedSnapPoint | undefined {
  return points.reduce<ResolvedSnapPoint | undefined>(
    (nearest, point) =>
      !nearest || Math.abs(point.extent - extent) < Math.abs(nearest.extent - extent)
        ? point
        : nearest,
    undefined,
  );
}
export function settleSnap(
  points: readonly ResolvedSnapPoint[],
  current: number,
  movement: number,
  velocity: number,
  extent: number,
  sequential: boolean,
  dismissible: boolean,
): ResolvedSnapPoint | null {
  const ordered = [...points].sort((a, b) => a.extent - b.extent);
  if (!ordered.length) return null;
  const target = clamp(
    current -
      movement -
      (sequential || Math.abs(velocity) < 0.5 ? 0 : clamp(velocity, -4, 4) * 300),
    0,
    extent,
  );
  let point = nearestPoint(ordered, target)!;
  if (sequential) {
    const origin = ordered.indexOf(nearestPoint(ordered, current)!);
    let next = ordered.indexOf(point);
    if (Math.abs(velocity) >= 0.5 && Math.sign(velocity) === Math.sign(movement))
      next = origin - Math.sign(movement);
    next = clamp(next, Math.max(0, origin - 1), Math.min(ordered.length - 1, origin + 1));
    point = ordered[next]!;
    if (
      dismissible &&
      origin === 0 &&
      movement > 0 &&
      (target < ordered[0]!.extent / 2 || velocity >= 0.5)
    )
      return null;
  } else if (dismissible && movement > 0 && (target < ordered[0]!.extent / 2 || velocity >= 0.5))
    return null;
  return point;
}
