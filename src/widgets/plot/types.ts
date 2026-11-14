import type { PlotStream } from './stream.js';
import type { PlotRenderScheduler } from './scheduler.js';

export type PlotPoint = readonly [x: number, y: number | null];
export type PlotData = Readonly<Record<string, readonly PlotPoint[]>>;
export type PlotDomain = readonly [minimum: number, maximum: number];
export type PlotDomainInput = 'auto' | PlotDomain;
export type PlotMode = 'static' | 'scroll' | 'push';
export type PlotStrategy = 'auto' | 'incremental' | 'full';
export interface PlotSeries {
  id: string;
  label: string;
  color?: string;
  negativeColor?: string;
  line?: boolean;
  lineWidth?: number;
  lineDash?: readonly number[];
  interpolation?: 'linear' | 'step-before' | 'step-after';
  /**
   * The area between the line and `baseline`: a solid color at `opacity` (0.2), or with `gradient`
   * the series color at `opacity` (0.4) at the domain's edge fading to nothing at the baseline.
   */
  fill?: false | { baseline: number; opacity?: number; gradient?: boolean };
  negativeFill?: { color?: string; opacity?: number };
  visible?: boolean;
  /** Formats this series' values in the inspection hint and the legend. */
  format?: (value: number | null, x: number) => string;
  /** `latest` marks the series' last sample with a dot that follows it as data arrives. */
  marker?: 'latest';
}
export interface PlotAxis {
  type?: 'number' | 'time';
  position?: 'start' | 'end';
  line?: boolean;
  ticks?: boolean;
  labels?: boolean;
  tickCount?: number;
  values?: readonly number[];
  format?: (value: number) => string;
  title?: string;
}
export interface PlotGrid {
  x?: boolean;
  y?: boolean;
  units?: 'css-px' | 'data';
  spacing?: readonly [number, number];
  origin?: readonly [number, number];
  majorEvery?: number;
}
export interface PlotGuide {
  id: string;
  axis: 'x' | 'y';
  value: number;
  label?: string;
  color?: string;
  width?: number;
  dash?: readonly number[];
  layer?: 'back' | 'front';
  /** Where the label sits along the guide: its start (default) or its end. */
  labelAlign?: 'start' | 'end';
  /** The side of a horizontal guide the label sits on: below (default) or above. */
  labelSide?: 'below' | 'above';
}
/** The pointer's crosshair while inspecting: a guide line, sample dots, an x chip and the hint. */
export interface PlotCrosshair {
  /** A vertical line at the inspected x (default true). */
  line?: boolean;
  /** The line's dash pattern in CSS pixels (default [3, 3]); an empty list draws it solid. */
  dash?: readonly number[];
  /** A dot on each inspected sample (default true). */
  marker?: boolean;
  /** A chip on the x axis with the inspected x, when the x axis shows (default true). */
  label?: boolean;
  /** The chip's text; defaults to the full date and time on time axes, the number otherwise. */
  format?: (x: number) => string;
  /** The edge of the plot the hint follows the crosshair along (default top). */
  hint?: 'top' | 'bottom';
}
export interface PlotLegend {
  placement?: 'top' | 'bottom';
  format?: (value: number | null, series: PlotSeries) => string;
}
export interface PlotInspection {
  seriesId: string;
  x: number;
  y: number | null;
  source: 'pointer' | 'keyboard';
}
export interface PlotRenderStats {
  strategy: 'full' | 'incremental';
  fullRedraws: number;
  incrementalPaints: number;
  shiftedDevicePixels: number;
  redrawnColumns: number;
  fallbackReason: string | null;
}
export interface PlotSummary {
  xDomain: PlotDomain;
  yDomain: PlotDomain;
  series: Readonly<
    Record<
      string,
      { count: number; latest: PlotPoint | null; minimum: number | null; maximum: number | null }
    >
  >;
}
export interface PlotConfiguration {
  series: readonly PlotSeries[];
  data: PlotData;
  stream: PlotStream | undefined;
  mode: PlotMode;
  xDomain: PlotDomainInput;
  yDomain: PlotDomainInput;
  window: number;
  follow: 'latest' | 'clock';
  clock: (() => number) | undefined;
  autoRange: { padding?: number; includeZero?: boolean };
  xAxis: false | PlotAxis;
  yAxis: false | PlotAxis;
  background: 'none' | 'solid' | 'dots' | 'grid';
  grid: PlotGrid;
  guides: readonly PlotGuide[];
  maxFrameRate: number;
  maxPixelRatio: number;
  renderStrategy: PlotStrategy;
  decimation: 'auto' | 'none';
  locale: string;
  timeZone: string;
  scheduler: PlotRenderScheduler | undefined;
}
/** A random-access view, valid until its source's next write. Never retain it across async work. */
export interface PlotSamples {
  readonly length: number;
  readonly monotonic: boolean;
  at(index: number): PlotPoint;
  /** Stable monotonic identity when retention changes logical indices. */
  key?(index: number): number;
}
export interface PlotRevision {
  revision: number;
  reset: boolean;
  firstX: number;
}
export interface PlotPaint {
  direction?: 'ltr' | 'rtl';
  surface: string;
  foreground: string;
  muted: string;
  grid: string;
  guide: string;
  guideColors?: Readonly<Record<string, string>>;
  colors: Readonly<Record<string, string>>;
  negativeColors: Readonly<Record<string, string>>;
  negativeFills: Readonly<Record<string, string>>;
  font: string;
}
