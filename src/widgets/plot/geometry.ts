import type { PlotConfiguration, PlotData, PlotDomain, PlotSamples, PlotSeries } from './types.js';
import { validPoint } from './stream.js';
export { domainConverter, jsonAxisOption, jsonOption } from '../../foundation/chart-axis.js';
import { jsonOption } from '../../foundation/chart-axis.js';
/** The crosshair in its attribute: a Boolean attribute, or JSON options. */
export const crosshairOption = {
  fromAttribute: (text: string | null): unknown => {
    if (text === null || text.trim() === 'false') return false;
    if (text.trim() === '' || text.trim() === 'true') return true;
    return jsonOption(false).fromAttribute(text);
  },
  toAttribute: (value: unknown) =>
    value === false ? null : value === true ? '' : JSON.stringify(value),
};
const isRecord = (v: unknown): boolean => typeof v === 'object' && v !== null && !Array.isArray(v);
export function validDomain(v: unknown): v is PlotDomain {
  return Array.isArray(v) && v.length === 2 && v.every(Number.isFinite) && v[0] < v[1];
}
export function arrayView(data: PlotData, id: string): PlotSamples {
  const points = Object.hasOwn(data, id) ? data[id]! : [];
  let monotonic = true,
    last = -Infinity;
  for (const point of points) {
    if (!validPoint(point)) throw new TypeError(`Plot ${id}: invalid point.`);
    if (point[0] < last) monotonic = false;
    last = point[0];
  }
  return { length: points.length, monotonic, at: (i) => points[i]!, key: (i) => i };
}
/** First index whose x is not less than x. */
export function lowerBound(s: PlotSamples, x: number): number {
  let a = 0,
    b = s.length;
  while (a < b) {
    const m = (a + b) >>> 1;
    if (s.at(m)[0] < x) a = m + 1;
    else b = m;
  }
  return a;
}
/** Logical position of a retained identity, independent of x duplicates or ring wrap. */
export function plotKeyIndex(view: PlotSamples, key: number): number {
  let a = 0,
    b = view.length;
  while (a < b) {
    const m = (a + b) >>> 1;
    if ((view.key?.(m) ?? m) < key) a = m + 1;
    else b = m;
  }
  return a;
}
export function extent(min: number, max: number, padding = 0): PlotDomain {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) {
    const d = Math.abs(min) * 0.05 || 1;
    return [min - d, max + d];
  }
  const d = (max - min) * padding;
  return [min - d, max + d];
}
export function plotDomains(
  config: PlotConfiguration,
  views: ReadonlyMap<string, PlotSamples>,
  previousEnd?: number,
): { x: PlotDomain; y: PlotDomain } {
  let min = Infinity,
    max = -Infinity;
  for (const s of views.values()) {
    if (!s.length) continue;
    if (s.monotonic) {
      min = Math.min(min, s.at(0)[0]);
      max = Math.max(max, s.at(s.length - 1)[0]);
    } else
      for (let i = 0; i < s.length; i++) {
        const p = s.at(i);
        min = Math.min(min, p[0]);
        max = Math.max(max, p[0]);
      }
  }
  let x: PlotDomain = config.xDomain === 'auto' ? extent(min, max) : config.xDomain;
  if (config.mode !== 'static') {
    const end =
      config.follow === 'clock'
        ? Math.max(previousEnd ?? -Infinity, config.clock!())
        : Number.isFinite(max)
          ? max
          : 0;
    x = [end - config.window, end];
  }
  if (config.yDomain !== 'auto') return { x, y: config.yDomain };
  let low = Infinity,
    high = -Infinity;
  for (const series of config.series) {
    if (series.visible === false) continue;
    const s = views.get(series.id);
    if (!s) continue;
    const start = s.monotonic ? Math.max(0, lowerBound(s, x[0]) - 1) : 0;
    for (let i = start; i < s.length; i++) {
      const p = s.at(i);
      if (s.monotonic && p[0] > x[1]) break;
      if (p[0] < x[0] || p[0] > x[1] || p[1] === null) continue;
      low = Math.min(low, p[1]);
      high = Math.max(high, p[1]);
    }
    if (series.fill && Number.isFinite(low)) {
      low = Math.min(low, series.fill.baseline);
      high = Math.max(high, series.fill.baseline);
    }
  }
  if (config.autoRange.includeZero && Number.isFinite(low)) {
    low = Math.min(0, low);
    high = Math.max(0, high);
  }
  const y: PlotDomain =
    config.yDomain === 'auto'
      ? extent(low, high, config.autoRange.padding ?? 0.05)
      : config.yDomain;
  return { x, y };
}
export function validatePlot(c: PlotConfiguration): void {
  // Options set through their attributes arrive as text when it is not JSON.
  if (!isRecord(c.data))
    throw new TypeError('Plot data must be an object of point arrays; check its attribute JSON.');
  for (const [name, value] of [
    ['series', c.series],
    ['guides', c.guides],
  ] as const)
    if (!Array.isArray(value))
      throw new TypeError(`Plot ${name} must be an array; check its attribute JSON.`);
  for (const [name, value] of [
    ['grid', c.grid],
    ['auto-range', c.autoRange],
  ] as const)
    if (!isRecord(value))
      throw new TypeError(`Plot ${name} must be an object; check its attribute JSON.`);
  for (const [name, value] of [
    ['x-axis', c.xAxis],
    ['y-axis', c.yAxis],
  ] as const)
    if (value !== false && !isRecord(value))
      throw new TypeError(`Plot ${name} must be false or an object; check its attribute JSON.`);
  if (
    !['static', 'scroll', 'push'].includes(c.mode) ||
    !['auto', 'incremental', 'full'].includes(c.renderStrategy) ||
    !['latest', 'clock'].includes(c.follow) ||
    !['none', 'solid', 'dots', 'grid'].includes(c.background) ||
    !['auto', 'none'].includes(c.decimation)
  )
    throw new TypeError('Unknown Plot mode or rendering option.');
  if (
    (c.xDomain !== 'auto' && !validDomain(c.xDomain)) ||
    (c.yDomain !== 'auto' && !validDomain(c.yDomain))
  )
    throw new RangeError('Plot domains must be finite increasing pairs or auto.');
  if (
    !Number.isFinite(c.window) ||
    c.window <= 0 ||
    !Number.isFinite(c.maxFrameRate) ||
    c.maxFrameRate < 0 ||
    !Number.isFinite(c.maxPixelRatio) ||
    c.maxPixelRatio <= 0
  )
    throw new RangeError('Plot window and DPR must be positive; frame rate must be nonnegative.');
  if (c.mode !== 'static' && c.xDomain !== 'auto')
    throw new Error('Scrolling Plot requires an automatic x domain.');
  if (c.follow === 'clock' && !c.clock) throw new Error('Plot clock-follow requires a clock.');
  if (
    c.mode === 'push' &&
    (c.stream?.xMode !== 'index' ||
      c.yDomain === 'auto' ||
      c.follow !== 'latest' ||
      !Number.isSafeInteger(c.window))
  )
    throw new Error(
      'Push Plot requires an index stream, fixed y domain, integer window and latest-follow.',
    );
  if (c.stream && Object.values(c.data).some((a) => a.length))
    throw new Error('Choose Plot data or stream, not both.');
  if (new Set(c.series.map((s) => s.id)).size !== c.series.length)
    throw new Error('Plot series IDs must be unique.');
  for (const s of c.series) {
    if (!s.id || !s.label) throw new Error('Plot series require id and label.');
    if (s.lineWidth !== undefined && (!Number.isFinite(s.lineWidth) || s.lineWidth < 0))
      throw new Error('Plot line width must be nonnegative.');
    if (s.interpolation && !['linear', 'step-before', 'step-after'].includes(s.interpolation))
      throw new Error('Invalid Plot interpolation.');
    if (
      s.fill &&
      (!Number.isFinite(s.fill.baseline) ||
        !opacity(s.fill.opacity) ||
        (s.fill.gradient !== undefined && typeof s.fill.gradient !== 'boolean'))
    )
      throw new Error('Invalid Plot fill.');
    if (s.marker !== undefined && s.marker !== 'latest') throw new Error('Invalid Plot marker.');
    if (s.negativeFill && !opacity(s.negativeFill.opacity))
      throw new Error('Invalid negative Plot fill.');
    validateDash(s.lineDash);
  }
  for (const g of c.guides) {
    if (!g.id || !['x', 'y'].includes(g.axis) || !Number.isFinite(g.value))
      throw new Error('Invalid Plot guide.');
    validateDash(g.dash);
    if (
      (g.width !== undefined && (!Number.isFinite(g.width) || g.width < 0)) ||
      (g.layer !== undefined && !['back', 'front'].includes(g.layer)) ||
      (g.labelAlign !== undefined && !['start', 'end'].includes(g.labelAlign)) ||
      (g.labelSide !== undefined && !['below', 'above'].includes(g.labelSide))
    )
      throw new Error('Plot guide width, layer or label placement is invalid.');
  }
  if (new Set(c.guides.map((g) => g.id)).size !== c.guides.length)
    throw new Error('Plot guide IDs must be unique.');
  if (c.guides.length > 256) throw new Error('Plot supports at most 256 guides.');
  if (c.grid.units !== undefined && !['css-px', 'data'].includes(c.grid.units))
    throw new Error('Invalid Plot grid units.');
  if (
    c.grid.origin &&
    (c.grid.origin.length !== 2 || c.grid.origin.some((v) => !Number.isFinite(v)))
  )
    throw new Error('Plot grid origin must be finite.');
  if (
    c.grid.majorEvery !== undefined &&
    (!Number.isSafeInteger(c.grid.majorEvery) || c.grid.majorEvery < 1)
  )
    throw new Error('Plot major grid frequency must be positive.');
  for (const axis of [c.xAxis, c.yAxis]) {
    if (!axis) continue;
    if (
      (axis.type !== undefined && !['number', 'time'].includes(axis.type)) ||
      (axis.position !== undefined && !['start', 'end'].includes(axis.position))
    )
      throw new Error('Invalid Plot axis type or position.');
    if (axis.tickCount !== undefined && (!Number.isFinite(axis.tickCount) || axis.tickCount < 2))
      throw new Error('Plot tick count must be at least two.');
    if (axis.values?.some((v) => !Number.isFinite(v)))
      throw new Error('Plot ticks must be finite.');
  }
  new Intl.NumberFormat(c.locale || undefined);
  if (c.timeZone) new Intl.DateTimeFormat(c.locale || undefined, { timeZone: c.timeZone });
  if (!Number.isFinite(c.autoRange.padding ?? 0.05) || (c.autoRange.padding ?? 0.05) < 0)
    throw new Error('Plot range padding must be nonnegative.');
  for (const v of c.grid.spacing ?? [16, 16])
    if (!Number.isFinite(v) || v <= 0) throw new Error('Plot grid spacing must be positive.');
}
function opacity(v: number | undefined): boolean {
  return v === undefined || (Number.isFinite(v) && v >= 0 && v <= 1);
}
function validateDash(v: readonly number[] | undefined): void {
  if (v?.some((n) => !Number.isFinite(n) || n < 0))
    throw new Error('Plot dash lengths must be nonnegative.');
}
export function visibleSeries(series: readonly PlotSeries[]): readonly PlotSeries[] {
  return series.filter((s) => s.visible !== false);
}
