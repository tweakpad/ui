import type { PlotAxis, PlotConfiguration, PlotDomain, PlotPaint } from './types.js';
import { dateTimeFormatter } from '../../foundation/date-locale.js';
import { numberFormatter } from '../../foundation/intl.js';
export interface PlotRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
/** Axes reserve only the space their independent visible constituents require. */
export function plotRect(c: PlotConfiguration, w: number, h: number, r: number): PlotRect {
  const size = (axis: false | PlotAxis) =>
    !axis
      ? 0
      : ((axis.labels === false ? 0 : 24) +
          (axis.ticks === false ? 0 : 5) +
          (axis.title ? 16 : 0)) *
        r;
  const y = size(c.yAxis) + (c.yAxis && c.yAxis.labels !== false ? 20 * r : 0),
    x = size(c.xAxis);
  return {
    left: c.yAxis && c.yAxis.position !== 'end' ? Math.min(y, w * 0.4) : 0,
    top: c.xAxis && c.xAxis.position === 'start' ? Math.min(x, h * 0.4) : 0,
    width: Math.max(1, Math.floor(w - Math.min(y, w * 0.4))),
    height: Math.max(1, Math.floor(h - Math.min(x, h * 0.4))),
  };
}
/** Nice bounded numeric tick positions. Formatting never affects their scale. */
export function plotTicks(domain: PlotDomain, axis: PlotAxis): number[] {
  if (axis.values)
    return axis.values
      .filter((v) => Number.isFinite(v) && v >= domain[0] && v <= domain[1])
      .slice(0, 128);
  const count = Math.max(2, Math.min(64, Math.floor(axis.tickCount ?? 5))),
    raw = (domain[1] - domain[0]) / (count - 1),
    power = 10 ** Math.floor(Math.log10(raw));
  if (axis.type === 'time' && raw >= 28 * 86400000) {
    const months = Math.max(1, Math.ceil(raw / (30 * 86400000))),
      start = new Date(domain[0]);
    const index = start.getUTCFullYear() * 12 + start.getUTCMonth(),
      aligned = Math.ceil(index / months) * months;
    start.setUTCFullYear(Math.floor(aligned / 12), ((aligned % 12) + 12) % 12, 1);
    start.setUTCHours(0, 0, 0, 0);
    if (start.getTime() < domain[0]) start.setUTCMonth(start.getUTCMonth() + months);
    const result: number[] = [];
    while (result.length < 128 && start.getTime() <= domain[1]) {
      result.push(start.getTime());
      start.setUTCMonth(start.getUTCMonth() + months);
    }
    return result;
  }
  const base = raw / power,
    numericStep = (base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10) * power;
  const timeSteps = [
    1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000,
    300000, 600000, 900000, 1800000, 3600000, 7200000, 10800000, 21600000, 43200000, 86400000,
    172800000, 604800000, 1209600000,
  ];
  const step =
    axis.type === 'time' ? (timeSteps.find((value) => value >= raw) ?? numericStep) : numericStep;
  const values: number[] = [];
  for (let i = Math.ceil(domain[0] / step), n = 0; n < 128; n++, i++) {
    const value = i * step;
    if (value > domain[1] + step * 1e-9) break;
    values.push(value === 0 ? 0 : value);
  }
  return values;
}
export function axisFormat(c: PlotConfiguration, axis: PlotAxis, value: number, span = 0): string {
  if (axis.format) return axis.format(value);
  const locale = c.locale || undefined;
  return axis.type === 'time'
    ? dateTimeFormatter(locale, {
        ...(span >= 86400000
          ? {
              year: span >= 31536000000 ? ('numeric' as const) : undefined,
              month: 'short' as const,
              day: 'numeric' as const,
            }
          : {
              hour: '2-digit' as const,
              minute: '2-digit' as const,
              ...(span < 60000 ? { second: '2-digit' as const } : {}),
              ...(span < 1000 ? { fractionalSecondDigits: 3 as const } : {}),
            }),
        ...(c.timeZone ? { timeZone: c.timeZone } : {}),
      }).format(value)
    : numberFormatter(locale, { maximumFractionDigits: 5 }).format(value);
}
/** An inspected x in full: date and time on time axes, the number otherwise. */
export function crosshairFormat(c: PlotConfiguration, axis: PlotAxis, value: number): string {
  const locale = c.locale || undefined;
  return axis.type === 'time'
    ? dateTimeFormatter(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
        ...(c.timeZone ? { timeZone: c.timeZone } : {}),
      }).format(value)
    : axisFormat(c, axis, value);
}
/** Separate fixed patterns from domain-dependent guides/ticks; neither is baked into history. */
export class PlotDecorations {
  readonly #back: HTMLCanvasElement;
  readonly #front: HTMLCanvasElement;
  readonly #pattern: HTMLCanvasElement;
  #patternKey = '';
  #key = '';
  constructor(owner: Document) {
    this.#back = owner.createElement('canvas');
    this.#front = owner.createElement('canvas');
    this.#pattern = owner.createElement('canvas');
  }
  dispose(): void {
    this.#back.width = this.#front.width = 0;
    this.#back.height = this.#front.height = 0;
    this.#key = '';
    this.#patternKey = '';
    this.#pattern.width = 0;
    this.#pattern.height = 0;
  }
  paint(
    ctx: CanvasRenderingContext2D,
    c: PlotConfiguration,
    x: PlotDomain,
    y: PlotDomain,
    rect: PlotRect,
    w: number,
    h: number,
    r: number,
    paint: PlotPaint,
    generation: number,
    layer: 'back' | 'front',
  ): void {
    if (layer === 'front' && !c.xAxis && !c.yAxis && !c.guides.some((g) => g.layer === 'front'))
      return;
    if (layer === 'back' && c.background === 'none' && !c.guides.some((g) => g.layer !== 'front'))
      return;
    // A flat surface has no domain-dependent geometry to cache or composite.
    if (
      layer === 'back' &&
      c.background === 'solid' &&
      !c.guides.some((g) => g.layer !== 'front')
    ) {
      ctx.fillStyle = paint.surface;
      ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
      return;
    }
    const movingX = !!c.xAxis || c.grid.units === 'data' || c.guides.some((g) => g.axis === 'x');
    const key = JSON.stringify([generation, movingX ? x : null, y, rect, w, h, r]);
    if (key !== this.#key) {
      for (const canvas of [this.#back, this.#front]) {
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        canvas.getContext('2d')!.clearRect(0, 0, w, h);
      }
      const back = this.#back.getContext('2d')!,
        front = this.#front.getContext('2d')!;
      this.#draw(back, front, c, x, y, rect, r, paint, generation);
      this.#key = key;
    }
    ctx.drawImage(layer === 'back' ? this.#back : this.#front, 0, 0);
  }
  #draw(
    back: CanvasRenderingContext2D,
    front: CanvasRenderingContext2D,
    c: PlotConfiguration,
    x: PlotDomain,
    y: PlotDomain,
    rect: PlotRect,
    r: number,
    paint: PlotPaint,
    generation: number,
  ): void {
    const { left: l, top: t, width: w, height: h } = rect;
    const font = paint.font.replace(/([\d.]+)px/u, (_, size: string) => `${Number(size) * r}px`);
    const px = (v: number) => l + ((v - x[0]) / (x[1] - x[0])) * w,
      py = (v: number) => t + h - ((v - y[0]) / (y[1] - y[0])) * h;
    const patternKey = JSON.stringify([generation, c.grid.units === 'data' ? x : null, y, rect, r]);
    if (this.#patternKey !== patternKey) {
      if (this.#pattern.width !== back.canvas.width) this.#pattern.width = back.canvas.width;
      if (this.#pattern.height !== back.canvas.height) this.#pattern.height = back.canvas.height;
      const pattern = this.#pattern.getContext('2d')!;
      pattern.clearRect(0, 0, pattern.canvas.width, pattern.canvas.height);
      pattern.save();
      pattern.beginPath();
      pattern.rect(l, t, w, h);
      pattern.clip();
      if (c.background !== 'none') {
        pattern.fillStyle = paint.surface;
        pattern.fillRect(l, t, w, h);
      }
      if (c.background === 'grid' || c.background === 'dots') {
        const [sx, sy] = c.grid.spacing ?? [16, 16],
          [ox, oy] = c.grid.origin ?? [0, 0];
        const data = c.grid.units === 'data';
        const positions = (
          start: number,
          end: number,
          spacing: number,
          origin: number,
          convert: (n: number) => number,
        ): { p: number; i: number }[] => {
          const result: { p: number; i: number }[] = [];
          const first = Math.ceil((start - origin) / spacing),
            last = Math.floor((end - origin) / spacing);
          const stride = Math.max(1, Math.ceil((last - first + 1) / 256));
          for (let i = first; i <= last; i += stride)
            result.push({ p: convert(origin + i * spacing), i });
          return result;
        };
        const xs =
          c.grid.x === false
            ? []
            : data
              ? positions(x[0], x[1], sx, ox, px)
              : positions(0, w, sx * r, ox * r, (n) => l + n);
        const ys =
          c.grid.y === false
            ? []
            : data
              ? positions(y[0], y[1], sy, oy, py)
              : positions(0, h, sy * r, oy * r, (n) => t + n);
        pattern.strokeStyle = pattern.fillStyle = paint.grid;
        if (c.background === 'dots') {
          // Bound intersections independently from the dataset size.
          const stride = Math.max(1, Math.ceil(Math.sqrt((xs.length * ys.length) / 4096)));
          for (let i = 0; i < xs.length; i += stride)
            for (let j = 0; j < ys.length; j += stride) {
              pattern.beginPath();
              pattern.arc(xs[i]!.p, ys[j]!.p, Math.max(0.5, r * 0.6), 0, Math.PI * 2);
              pattern.fill();
            }
        } else
          for (const [axis, values] of [
            ['x', xs],
            ['y', ys],
          ] as const)
            for (const v of values) {
              pattern.globalAlpha = v.i % (c.grid.majorEvery ?? 4) === 0 ? 1 : 0.5;
              pattern.lineWidth = r;
              pattern.beginPath();
              if (axis === 'x') {
                pattern.moveTo(v.p, t);
                pattern.lineTo(v.p, t + h);
              } else {
                pattern.moveTo(l, v.p);
                pattern.lineTo(l + w, v.p);
              }
              pattern.stroke();
            }
        pattern.globalAlpha = 1;
      }
      pattern.restore();
      this.#patternKey = patternKey;
    }
    back.drawImage(this.#pattern, 0, 0);
    for (const guide of c.guides) {
      const domain = guide.axis === 'x' ? x : y;
      if (guide.value < domain[0] || guide.value > domain[1]) continue;
      const ctx = guide.layer === 'front' ? front : back,
        pos = guide.axis === 'x' ? px(guide.value) : py(guide.value);
      ctx.save();
      ctx.beginPath();
      ctx.rect(l, t, w, h);
      ctx.clip();
      ctx.strokeStyle = ctx.fillStyle = paint.guideColors?.[guide.id] ?? paint.guide;
      ctx.lineWidth = (guide.width ?? 1) * r;
      ctx.setLineDash((guide.dash ?? []).map((n) => n * r));
      ctx.beginPath();
      if (guide.axis === 'x') {
        ctx.moveTo(pos, t);
        ctx.lineTo(pos, t + h);
      } else {
        ctx.moveTo(l, pos);
        ctx.lineTo(l + w, pos);
      }
      if ((guide.width ?? 1) > 0) ctx.stroke();
      if (guide.label) {
        ctx.font = font;
        const above = guide.axis === 'y' && guide.labelSide === 'above';
        ctx.textBaseline = above ? 'bottom' : 'top';
        const textWidth = ctx.measureText(guide.label).width;
        // `end` places the label at the guide's inline end (the right, or the left in RTL).
        const end = (guide.labelAlign === 'end') !== (paint.direction === 'rtl');
        const along =
          guide.axis === 'x' ? pos + 4 * r : end ? l + w - textWidth - 4 * r : l + 4 * r;
        const across =
          guide.axis === 'y'
            ? above
              ? Math.max(t + 14 * r, pos - 4 * r)
              : Math.min(t + h - 14 * r, pos + 4 * r)
            : guide.labelAlign === 'end'
              ? t + h - 18 * r
              : t + 4 * r;
        ctx.fillText(
          guide.label,
          Math.max(l, Math.min(l + w - textWidth, along)),
          Math.max(t, across),
        );
      }
      ctx.restore();
    }
    const drawAxis = (axis: false | PlotAxis, kind: 'x' | 'y') => {
      if (!axis) return;
      const horizontal = kind === 'x',
        domain = horizontal ? x : y,
        ticks = plotTicks(domain, axis),
        edge = horizontal
          ? axis.position === 'start'
            ? t
            : t + h
          : axis.position === 'end'
            ? l + w
            : l,
        sign = axis.position === 'end' ? 1 : -1;
      front.save();
      front.strokeStyle = paint.grid;
      front.fillStyle = paint.muted;
      front.lineWidth = r;
      front.font = font;
      if (axis.line !== false) {
        front.beginPath();
        if (horizontal) {
          front.moveTo(l, edge);
          front.lineTo(l + w, edge);
        } else {
          front.moveTo(edge, t);
          front.lineTo(edge, t + h);
        }
        front.stroke();
      }
      const occupied: [number, number][] = [];
      for (const value of ticks) {
        const p = horizontal ? px(value) : py(value);
        if (axis.ticks !== false) {
          front.beginPath();
          if (horizontal) {
            front.moveTo(p, edge);
            front.lineTo(p, edge + (axis.position === 'start' ? -1 : 1) * 4 * r);
          } else {
            front.moveTo(edge, p);
            front.lineTo(edge + sign * 4 * r, p);
          }
          front.stroke();
        }
        if (axis.labels === false) continue;
        const text = axisFormat(c, axis, value, domain[1] - domain[0]),
          width = front.measureText(text).width;
        if (horizontal) {
          if (width > w) continue;
          const start = Math.max(l, Math.min(l + w - width, p - width / 2));
          if (occupied.some(([a, b]) => start < b + 6 * r && start + width > a - 6 * r)) continue;
          occupied.push([start, start + width]);
          front.textAlign = 'left';
          front.textBaseline = axis.position === 'start' ? 'bottom' : 'top';
          front.fillText(text, start, edge + (axis.position === 'start' ? -1 : 1) * 7 * r);
        } else {
          const center = Math.max(t + 10 * r, Math.min(t + h - 10 * r, p));
          if (occupied.some(([a]) => Math.abs(center - a) < 18 * r)) continue;
          occupied.push([center, center]);
          front.textAlign = axis.position === 'end' ? 'left' : 'right';
          front.textBaseline = 'middle';
          front.fillText(
            text,
            edge + sign * 7 * r,
            center,
            Math.max(1, (axis.position === 'end' ? front.canvas.width - (l + w) : l) - 9 * r),
          );
        }
      }
      if (axis.title) {
        front.textAlign = 'center';
        front.textBaseline = 'middle';
        if (horizontal)
          front.fillText(
            axis.title,
            l + w / 2,
            edge + (axis.position === 'start' ? -1 : 1) * 34 * r,
          );
        else {
          front.translate(edge + sign * 39 * r, t + h / 2);
          front.rotate(-Math.PI / 2);
          front.fillText(axis.title, 0, 0);
        }
      }
      front.restore();
    };
    drawAxis(c.xAxis, 'x');
    drawAxis(c.yAxis, 'y');
  }
}
