/** Evaluate CSS easing values in JavaScript for frame-driven motion. */
export type EasingFunction = (progress: number) => number;

const keywords: Record<string, readonly [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

/** A cubic Bézier timing function with fixed end points (0,0) and (1,1). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const solve = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < 1e-6) return t;
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= error / slope;
    }
    // Bisection fallback for flat slopes.
    let low = 0,
      high = 1;
    t = x;
    for (let i = 0; i < 30; i++) {
      const value = sampleX(t);
      if (Math.abs(value - x) < 1e-6) break;
      if (value < x) low = t;
      else high = t;
      t = (low + high) / 2;
    }
    return t;
  };
  return (progress) => (progress <= 0 ? 0 : progress >= 1 ? 1 : sampleY(solve(progress)));
}

/** Parse `linear`, keyword and `cubic-bezier()` easings; unknown values fall back to `ease`. */
export function parseEasing(value: string | undefined): EasingFunction {
  const text = value?.trim().toLowerCase() ?? '';
  if (text === 'linear') return (progress) => Math.min(1, Math.max(0, progress));
  const keyword = keywords[text];
  if (keyword) return cubicBezier(...keyword);
  const match = /^cubic-bezier\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)$/.exec(text);
  if (match) {
    const values = match.slice(1).map(Number) as [number, number, number, number];
    if (
      values.every(Number.isFinite) &&
      values[0] >= 0 &&
      values[0] <= 1 &&
      values[2] >= 0 &&
      values[2] <= 1
    )
      return cubicBezier(...values);
  }
  return cubicBezier(...keywords.ease!);
}
