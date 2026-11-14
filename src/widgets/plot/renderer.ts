import type { PlotPoint, PlotSeries, PlotDomain, PlotPaint } from './types.js';

/** The default top opacity of a gradient area, which fades to nothing at its baseline. */
export const PLOT_GRADIENT_OPACITY = 0.4;

/**
 * Vertical area gradients, one per series and side of the baseline. A gradient runs from the
 * y-domain's edge to the baseline, so it depends on the vertical mapping alone: pixels shifted
 * horizontally by an incremental paint stay identical to a full repaint. Entries are rebuilt only
 * when that mapping or the color changes; solid fills never reach this cache.
 */
export class PlotGradientCache {
  readonly #entries = new Map<string, { key: string; gradient: CanvasGradient }>();

  get(
    context: CanvasRenderingContext2D,
    id: string,
    below: boolean,
    color: string,
    from: number,
    to: number,
  ): CanvasGradient {
    const slot = `${below ? '-' : '+'}${id}`;
    const key = `${color}|${from}|${to}`;
    const cached = this.#entries.get(slot);
    if (cached?.key === key) return cached.gradient;
    // The fade keeps the color and drops its alpha, so the middle of the ramp never darkens.
    context.fillStyle = color;
    const solid = context.fillStyle;
    const clear = transparentOf(solid);
    const gradient = context.createLinearGradient(0, from, 0, to);
    gradient.addColorStop(0, solid);
    gradient.addColorStop(1, clear);
    this.#entries.set(slot, { key, gradient });
    return gradient;
  }

  clear(): void {
    this.#entries.clear();
  }
}

/** A canvas-normalized color (`#rrggbb`, `rgba()` or `color()`) with its alpha set to 0. */
function transparentOf(color: string): string {
  if (color.startsWith('#') && color.length === 7) {
    const value = Number.parseInt(color.slice(1), 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, 0)`;
  }
  const rgba = /^rgba?\(([^,]+),([^,]+),([^,)]+)/u.exec(color);
  if (rgba) return `rgba(${rgba[1]},${rgba[2]},${rgba[3]}, 0)`;
  // A wide-gamut color: replace or add its alpha.
  const open = color.lastIndexOf(')');
  if (open > 0) return `${color.slice(0, open).replace(/\s*\/\s*[^)]*$/u, '')} / 0)`;
  return 'transparent';
}

/** Draw a clipped set of ordered paths; signed paint is clipped at the exact baseline. */
export function paintPlotSeries(
  context: CanvasRenderingContext2D,
  points: readonly PlotPoint[],
  series: PlotSeries,
  x: PlotDomain,
  y: PlotDomain,
  width: number,
  height: number,
  paint: PlotPaint,
  ratio: number,
  dashOffset: (point: PlotPoint) => number = () => 0,
  segmentDashes = false,
  pixelOffset = 0,
  gradients?: PlotGradientCache,
): void {
  const px = (n: number) => ((n - x[0]) / (x[1] - x[0])) * width + pixelOffset;
  const py = (n: number) => height - ((n - y[0]) / (y[1] - y[0])) * height;
  const baseline = series.fill ? series.fill.baseline : 0;
  const positive = paint.colors[series.id] ?? paint.foreground,
    negative = paint.negativeColors[series.id] ?? positive;
  const runs: PlotPoint[][] = [];
  let run: PlotPoint[] = [];
  for (const p of points) {
    if (p[1] === null) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push(p);
  }
  if (run.length) runs.push(run);
  const path = (r: readonly PlotPoint[]) => {
    context.beginPath();
    const first = r[0]!;
    context.moveTo(px(first[0]), py(first[1]!));
    for (let i = 1; i < r.length; i++) {
      const a = r[i - 1]!,
        b = r[i]!;
      if (series.interpolation === 'step-before') context.lineTo(px(a[0]), py(b[1]!));
      if (series.interpolation === 'step-after') context.lineTo(px(b[0]), py(a[1]!));
      context.lineTo(px(b[0]), py(b[1]!));
    }
  };
  const signed = (below: boolean, draw: () => void, clip: boolean) => {
    context.save();
    if (clip) {
      const zero = Math.max(0, Math.min(height, py(baseline)));
      context.beginPath();
      context.rect(0, below ? zero : 0, context.canvas.width, below ? height - zero : zero);
      context.clip();
    }
    draw();
    context.restore();
  };
  for (const r of runs) {
    let low = Infinity,
      high = -Infinity;
    for (const point of r) {
      low = Math.min(low, point[1]!);
      high = Math.max(high, point[1]!);
    }
    const signs = low >= baseline ? [false] : high <= baseline ? [true] : [false, true];
    if (series.fill) {
      const fill = series.fill;
      for (const below of signs)
        signed(
          below,
          () => {
            path(r);
            context.lineTo(px(r.at(-1)![0]), py(fill.baseline));
            context.lineTo(px(r[0]![0]), py(fill.baseline));
            context.closePath();
            if (fill.gradient && gradients) {
              // From the domain's edge (full color) to the baseline (none), in device space.
              context.globalAlpha = below
                ? (series.negativeFill?.opacity ?? fill.opacity ?? PLOT_GRADIENT_OPACITY)
                : (fill.opacity ?? PLOT_GRADIENT_OPACITY);
              context.fillStyle = gradients.get(
                context,
                series.id,
                below,
                below ? (paint.negativeFills[series.id] ?? negative) : positive,
                below ? height : 0,
                py(fill.baseline),
              );
              context.fill();
              return;
            }
            context.globalAlpha = below
              ? (series.negativeFill?.opacity ?? fill.opacity ?? 0.2)
              : (fill.opacity ?? 0.2);
            context.fillStyle = below ? (paint.negativeFills[series.id] ?? negative) : positive;
            context.fill();
          },
          signs.length > 1,
        );
    }
    if (series.line !== false && (series.lineWidth ?? 1.5) > 0) {
      context.lineWidth = (series.lineWidth ?? 1.5) * ratio;
      context.lineJoin = 'round';
      context.lineCap = 'butt';
      context.lineDashOffset = dashOffset(r[0]!);
      const pattern = (series.lineDash ?? []).map((v) => v * ratio);
      if (pattern.length % 2) pattern.push(...pattern);
      const period = pattern.reduce((a, b) => a + b, 0);
      const on = (offset: number) => {
        if (!period) return true;
        let phase = ((offset % period) + period) % period;
        for (let i = 0; i < pattern.length; i++) {
          if (phase < pattern[i]!) return i % 2 === 0;
          phase -= pattern[i]!;
        }
        return true;
      };
      context.setLineDash(pattern);
      for (const below of signs)
        signed(
          below,
          () => {
            context.strokeStyle = below ? negative : positive;
            if (!segmentDashes) {
              path(r);
              context.stroke();
              return;
            }
            // Retained vertices keep their raw path-length phase, even when a column
            // drops intermediate points. Local segment anchors make dirty/full paints agree.
            for (let i = 1; i < r.length; i++) {
              const a = r[i - 1]!,
                b = r[i]!,
                offset = dashOffset(a);
              context.lineDashOffset = offset;
              path([a, b]);
              context.stroke();
              const dx = px(b[0]) - px(a[0]),
                dy = py(b[1]!) - py(a[1]!);
              const length =
                series.interpolation && series.interpolation !== 'linear'
                  ? Math.abs(dx) + Math.abs(dy)
                  : Math.hypot(dx, dy);
              if (i < r.length - 1 && on(offset + length - 1e-7) && on(dashOffset(b) + 1e-7)) {
                context.beginPath();
                context.arc(px(b[0]), py(b[1]!), context.lineWidth / 2, 0, Math.PI * 2);
                context.fillStyle = context.strokeStyle;
                context.fill();
              }
            }
          },
          signs.length > 1,
        );
      context.setLineDash([]);
    }
  }
}
