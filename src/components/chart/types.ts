import type { TpTooltip } from '../tooltip/tooltip.js';
import type { IconDefinition } from '../../icons/types.js';
import type { AxisDomain, AxisOptions } from '../../foundation/chart-axis.js';

/** The marks a Chart draws itself, when no `renderer` is set. */
export type ChartType = 'line' | 'bar' | 'lollipop' | 'pie' | 'radar' | 'radial';
/**
 * Options of a Chart's x or y axis: the axis options Plot shares, a `category` scale for named
 * positions, and on the x axis `key`, the data field that names each row's position.
 */
export interface ChartAxis extends Omit<AxisOptions, 'type'> {
  type?: AxisOptions['type'] | 'category';
  key?: string;
}
/** An axis range: an increasing `[minimum, maximum]`, or `auto` to fit the data. */
export type ChartDomain = 'auto' | AxisDomain;

/** How one series of a Chart is presented, set per data key in its `series`. */
export interface ChartSeries {
  label?: string;
  icon?: IconDefinition;
  /** Passed through to the renderer without interpreting it as behavior. */
  appearance?: unknown;
  color?: string;
  theme?: Partial<Record<'light' | 'dark', string>>;
  /** The color of this series' values below zero, as on sign-colored lollipops. */
  negativeColor?: string;
  /** How this series' values read in the tooltip and the legend, such as with a unit. */
  format?: (value: number) => string;
}
/** The series of a Chart by data key, as its `series` property takes them. */
export type ChartSeriesMap = Readonly<Record<string, ChartSeries>>;
/** Original engine objects are retained, including engine-specific fields. */
export interface ChartPayload {
  dataKey?: string | number;
  name?: string | number;
  value?: unknown;
  color?: string;
  type?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}
/**
 * How people inspect the values of a Chart, as its `interaction` property takes it.
 */
export type ChartInteraction = 'none' | 'focus' | 'pointer' | 'both';
/**
 * The datum a renderer reports as inspected by pointer or focus, which the tooltip of a Chart
 * shows and its `inspection` returns.
 */
export interface ChartInspection {
  active: boolean;
  payload: readonly ChartPayload[];
  label?: unknown;
  anchor?: TpTooltip['anchor'];
  source: 'focus' | 'pointer';
}
/**
 * How the tooltip of a Chart presents an inspected datum, set through its
 * `tooltipOptions`.
 */
export interface ChartTooltipOptions {
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: 'dot' | 'line' | 'dashed';
  color?: string;
  nameKey?: string;
  labelKey?: string;
  labelFormatter?: (label: unknown, payload: readonly ChartPayload[]) => unknown;
  formatter?: (
    value: unknown,
    name: string,
    item: ChartPayload,
    index: number,
    datum: Record<string, unknown> | undefined,
  ) => unknown;
}
/** How the legend of a Chart presents the series, set through its `legendOptions`. */
export interface ChartLegendOptions {
  hideIcon?: boolean;
  /**
   * Where the legend stands: above or below the plot, in a column at its inline start or end, or
   * `inline`, labeling the radial rings and the line ends themselves.
   */
  placement?: 'top' | 'bottom' | 'start' | 'end' | 'inline';
  /** A heading above the legend entries, which also names the legend. */
  title?: string;
  /** The number beside each series: its last value, or its total over the rows. */
  value?: 'latest' | 'sum';
  nameKey?: string;
  formatter?: (label: string, item: ChartPayload, index: number) => unknown;
}
/** The plot's width and height in pixels, as a Chart measures them. */
export interface ChartDimensions {
  width: number;
  height: number;
}
/**
 * Everything a renderer needs to draw a Chart, passed to its `update` whenever the
 * data, series, size or interaction change.
 */
export interface ChartSnapshot extends ChartDimensions {
  id: string;
  data: readonly Record<string, unknown>[];
  series: ChartSeriesMap;
  interaction: ChartInteraction;
  /** Values are resolved for the current theme; original series are unchanged. */
  colors: Readonly<Record<string, string>>;
}
/**
 * The callbacks a Chart passes to a renderer's `mount`, through which the renderer
 * reports the inspected datum and the legend entries.
 */
export interface ChartRendererContext {
  inspect: (state: ChartInspection) => void;
  legend: (payload: readonly ChartPayload[]) => void;
}
/**
 * What a renderer's `mount` returns: the handle a Chart updates with each snapshot and
 * destroys when the renderer or plot changes.
 */
export interface ChartRendererInstance {
  update: (snapshot: ChartSnapshot) => void;
  /** Remove all engine nodes and input/subscription listeners. */
  destroy: () => void;
}
/**
 * A chart engine of your own, set as a Chart's `renderer`, which mounts into the plot
 * element.
 */
export interface ChartRenderer {
  mount: (plot: HTMLElement, context: ChartRendererContext) => ChartRendererInstance;
}
