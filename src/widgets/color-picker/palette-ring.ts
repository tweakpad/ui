/**
 * Geometry of the harmony palette ring around the wheel: the ring box is a square whose
 * center holds the disc; every handle owns one arc segment of the same thickness in wheel
 * order, the base segment centered at the top, the scheme's principal hues covering twice the
 * span of a calculated variant. Coordinates are percentages of the ring box, so the clip
 * polygons and mark positions scale with it.
 */
export interface RingLayout {
  /** Inner radius of every segment, as a fraction of the box side. */
  readonly inner: number;
  /** Outer radius of every segment, as a fraction of the box side. */
  readonly outer: number;
  /** Angular gap on each side of a segment, in degrees. */
  readonly gapDegrees: number;
  /** Span of a principal segment relative to a variant's. */
  readonly principalWeight: number;
}

export interface RingSegment {
  /** `polygon()` points in percentages of the box (`x% y%, …`). */
  readonly polygon: string;
  /** Angular span of the segment including its gaps, in degrees. */
  readonly span: number;
  /** Centroid of the segment, in percentages of the box, for the copy mark. */
  readonly markX: number;
  readonly markY: number;
}

/** Disc diameter is 72 % of the box; a 2 % gap, then a 10 % band for every segment. */
export const PALETTE_RING: RingLayout = {
  inner: 0.38,
  outer: 0.48,
  gapDegrees: 2,
  principalWeight: 2,
};

/** Fraction of the ring box the disc occupies (its inset on each side is half the rest). */
export const PALETTE_DISC = 0.72;

const round = (value: number): number => Math.round(value * 100) / 100;

/** A point on a circle of radius `r` (box fraction) at `degrees` clockwise from the top. */
function point(degrees: number, r: number): readonly [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [round(50 + 100 * r * Math.sin(radians)), round(50 - 100 * r * Math.cos(radians))];
}

/**
 * One segment per handle in wheel order; `base` is the base handle's index (centered at the
 * top) and `principals` marks the handles that cover the wider span (the base always does).
 */
export function ringSegments(
  count: number,
  base: number,
  principals: readonly boolean[] = [],
  layout: RingLayout = PALETTE_RING,
): readonly RingSegment[] {
  if (count < 1) return [];
  const weights = Array.from({ length: count }, (_, index) =>
    index === base || principals[index] ? layout.principalWeight : 1,
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const spans = weights.map((weight) => (360 * weight) / total);
  const before = spans.slice(0, Math.max(0, Math.min(base, count))).reduce((sum, s) => sum + s, 0);
  const start = -(spans[base] ?? spans[0]!) / 2 - before;
  let cursor = start;
  return spans.map((span) => {
    const gap = count > 1 ? Math.min(layout.gapDegrees, span / 4) : 0;
    const a0 = cursor + gap;
    const a1 = cursor + span - gap;
    cursor += span;
    const steps = Math.max(2, Math.ceil((a1 - a0) / 6));
    const points: string[] = [];
    for (let step = 0; step <= steps; step++) {
      const [x, y] = point(a0 + ((a1 - a0) * step) / steps, layout.outer);
      points.push(`${x}% ${y}%`);
    }
    for (let step = steps; step >= 0; step--) {
      const [x, y] = point(a0 + ((a1 - a0) * step) / steps, layout.inner);
      points.push(`${x}% ${y}%`);
    }
    const [markX, markY] = point((a0 + a1) / 2, (layout.inner + layout.outer) / 2);
    return { polygon: points.join(', '), span: round(span), markX, markY };
  });
}
