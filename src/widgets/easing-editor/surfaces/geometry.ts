import { easingFunction, progressionRange } from '../../../foundation/easing/evaluate.js';
import { sampleEasing } from '../../../foundation/easing/sample.js';
import type {
  EasingCurve,
  EasingFunction,
  EasingPoint,
  ProgressionRange,
} from '../../../foundation/easing/types.js';

/** The plot's coordinate box: the unit square plus the overshoot band, in a 0–1 frame. */
export interface PlotBox {
  readonly range: ProgressionRange;
}

const QUARTER = 0.25;
/** Flat curves stay within the unit box; others extend the range in quarter steps. */
export function quantizeRange(range: ProgressionRange): ProgressionRange {
  const min = range.min < 0 ? Math.floor((range.min - 0.02) / QUARTER) * QUARTER : 0;
  const max = range.max > 1 ? Math.ceil((range.max + 0.02) / QUARTER) * QUARTER : 1;
  return { min, max };
}

/**
 * The progression range the graph shows for a record: the curve's own range plus every handle
 * or point, widened to quarter steps (Widgets 6.2 `uwg-ee-req-pres-1`).
 */
export function curveRange(curve: EasingCurve | null): ProgressionRange {
  if (!curve) return { min: 0, max: 1 };
  const range = progressionRange(easingFunction(curve));
  let min = range.min;
  let max = range.max;
  if (curve.kind === 'bezier') {
    min = Math.min(min, curve.y1, curve.y2);
    max = Math.max(max, curve.y1, curve.y2);
  } else if (curve.kind === 'custom')
    for (const point of curve.points) {
      min = Math.min(min, point.output);
      max = Math.max(max, point.output);
    }
  return quantizeRange({ min, max });
}

/** Fraction of the plot height (0 at the bottom, 1 at the top) of a progression value. */
export function progressionFraction(value: number, range: ProgressionRange): number {
  const span = range.max - range.min || 1;
  return (value - range.min) / span;
}

/** Progression value at a fraction of the plot height (0 at the bottom, 1 at the top). */
export function progressionAt(fraction: number, range: ProgressionRange): number {
  return range.min + fraction * (range.max - range.min);
}

/** An SVG polyline point list in a `width × height` frame, y down. */
export function curvePolyline(
  fn: EasingFunction,
  range: ProgressionRange,
  width: number,
  height: number,
  samples = 200,
): string {
  return sampleEasing(fn, samples + 1)
    .map(
      (point) =>
        `${(point.input * width).toFixed(2)},${((1 - progressionFraction(point.output, range)) * height).toFixed(2)}`,
    )
    .join(' ');
}

/** Points of a custom curve in the same frame. */
export function pointPositions(
  points: readonly EasingPoint[],
  range: ProgressionRange,
  width: number,
  height: number,
): ReadonlyArray<{ x: number; y: number }> {
  return points.map((point) => ({
    x: point.input * width,
    y: (1 - progressionFraction(point.output, range)) * height,
  }));
}

/** A preset thumbnail: the curve in a square frame with a margin for overshoot. */
export function thumbnailPolyline(curve: EasingCurve, size = 32, margin = 6): string {
  const fn = easingFunction(curve);
  const range = { min: 0, max: 1 };
  const inner = size - 2 * margin;
  return sampleEasing(fn, 33)
    .map((point) => {
      const x = margin + point.input * inner;
      const y = margin + (1 - progressionFraction(point.output, range)) * inner;
      return `${x.toFixed(1)},${Math.min(size, Math.max(0, y)).toFixed(1)}`;
    })
    .join(' ');
}

/** Tick positions of the frames bar: the eased position of each frame as a fraction 0–1. */
export function frameTicks(fn: EasingFunction, count: number, range: ProgressionRange): number[] {
  const n = Math.max(2, Math.round(count));
  const ticks: number[] = [];
  for (let index = 0; index < n; index++)
    ticks.push(progressionFraction(fn(index / (n - 1)), range));
  return ticks;
}

/** Ticks of the frames bar: a fixed sampling of the motion, independent of the duration. */
export const FRAME_TICKS = 40;
