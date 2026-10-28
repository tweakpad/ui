import { convertEasingCurve, hasBezierFit } from '../../../foundation/easing/convert.js';
import { easingFunction, progressionRange } from '../../../foundation/easing/evaluate.js';
import { sampleEasing } from '../../../foundation/easing/sample.js';
import type {
  BezierCurve,
  EasingCurve,
  EasingFunction,
  EasingPoint,
  ProgressionRange,
} from '../../../foundation/easing/types.js';

const CENTER = 0.5;
/**
 * The shown range around the unit box: centered on 0.5 and shared by both axes, so an overshoot
 * zooms the whole plot out uniformly and the unit box stays square in the middle. Extents inside
 * the unit box keep it; others fit it exactly, so the furthest value sits on the plot frame.
 */
export function fitRange(range: ProgressionRange): ProgressionRange {
  const half = Math.max(CENTER, range.max - CENTER, CENTER - range.min);
  return { min: CENTER - half, max: CENTER + half };
}

const FITS = new WeakMap<EasingCurve, BezierCurve | null>();

/**
 * The record whose handles the graph shows: the Bézier fit of a sine, power, expo, circ or back
 * ease (cached per record), or the record itself.
 */
export function shownCurve(curve: EasingCurve): EasingCurve {
  if (curve.kind !== 'parametric' || !hasBezierFit(curve)) return curve;
  let fit = FITS.get(curve);
  if (fit === undefined) {
    const converted = convertEasingCurve(curve, 'bezier');
    fit = converted.kind === 'bezier' ? converted : null;
    FITS.set(curve, fit);
  }
  return fit ?? curve;
}

/**
 * The range the graph shows for a record: the curve's own progression plus every handle or
 * point it shows, fitted around the center (Widgets 6.2 `uwg-ee-req-pres-1`). Time and
 * progression share it.
 */
export function curveRange(curve: EasingCurve | null): ProgressionRange {
  if (!curve) return { min: 0, max: 1 };
  const range = progressionRange(easingFunction(curve));
  let min = range.min;
  let max = range.max;
  const shown = shownCurve(curve);
  if (shown.kind === 'bezier') {
    min = Math.min(min, shown.y1, shown.y2);
    max = Math.max(max, shown.y1, shown.y2);
  } else if (shown.kind === 'custom')
    for (const point of shown.points) {
      min = Math.min(min, point.output);
      max = Math.max(max, point.output);
    }
  return fitRange({ min, max });
}

/** Fraction of the plot extent (0 at the left or bottom, 1 at the right or top) of a value. */
export function axisFraction(value: number, range: ProgressionRange): number {
  const span = range.max - range.min || 1;
  return (value - range.min) / span;
}

/** Value at a fraction of the plot extent (0 at the left or bottom, 1 at the right or top). */
export function axisAt(fraction: number, range: ProgressionRange): number {
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
        `${(axisFraction(point.input, range) * width).toFixed(2)},${((1 - axisFraction(point.output, range)) * height).toFixed(2)}`,
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
    x: axisFraction(point.input, range) * width,
    y: (1 - axisFraction(point.output, range)) * height,
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
      const y = margin + (1 - axisFraction(point.output, range)) * inner;
      return `${x.toFixed(1)},${Math.min(size, Math.max(0, y)).toFixed(1)}`;
    })
    .join(' ');
}

/** Tick positions of the frames bar: the eased position of each frame as a fraction 0–1. */
export function frameTicks(fn: EasingFunction, count: number, range: ProgressionRange): number[] {
  const n = Math.max(2, Math.round(count));
  const ticks: number[] = [];
  for (let index = 0; index < n; index++) ticks.push(axisFraction(fn(index / (n - 1)), range));
  return ticks;
}

/** Ticks of the frames bar: a fixed sampling of the motion, independent of the duration. */
export const FRAME_TICKS = 40;
