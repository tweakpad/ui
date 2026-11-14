import type { TpTooltip } from '../tooltip/tooltip.js';
import type { IconDefinition } from '../../icons/types.js';

/** How one series of a Data visualization is presented, set per data key in its `series`. */
export interface VisualizationSeries {
  label?: string;
  icon?: IconDefinition;
  /** Passed through to the renderer without interpreting it as behavior. */
  appearance?: unknown;
  color?: string;
  theme?: Partial<Record<'light' | 'dark', string>>;
}
/** The series of a Data visualization by data key, as its `series` property takes them. */
export type VisualizationSeriesMap = Readonly<Record<string, VisualizationSeries>>;
/** Original engine objects are retained, including engine-specific fields. */
export interface VisualizationPayload {
  dataKey?: string | number;
  name?: string | number;
  value?: unknown;
  color?: string;
  type?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}
/**
 * How people inspect the values of a Data visualization, as its `interaction` property takes it.
 */
export type VisualizationInteraction = 'none' | 'focus' | 'pointer' | 'both';
/**
 * The datum a renderer reports as inspected by pointer or focus, which the tooltip of a Data
 * visualization shows and its `inspection` returns.
 */
export interface VisualizationInspection {
  active: boolean;
  payload: readonly VisualizationPayload[];
  label?: unknown;
  anchor?: TpTooltip['anchor'];
  source: 'focus' | 'pointer';
}
/**
 * How the tooltip of a Data visualization presents an inspected datum, set through its
 * `tooltipOptions`.
 */
export interface VisualizationTooltipOptions {
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: 'dot' | 'line' | 'dashed';
  color?: string;
  nameKey?: string;
  labelKey?: string;
  labelFormatter?: (label: unknown, payload: readonly VisualizationPayload[]) => unknown;
  formatter?: (
    value: unknown,
    name: string,
    item: VisualizationPayload,
    index: number,
    datum: Record<string, unknown> | undefined,
  ) => unknown;
}
/** How the legend of a Data visualization presents the series, set through its `legendOptions`. */
export interface VisualizationLegendOptions {
  hideIcon?: boolean;
  placement?: 'top' | 'bottom';
  nameKey?: string;
  formatter?: (label: string, item: VisualizationPayload, index: number) => unknown;
}
/** The plot's width and height in pixels, as a Data visualization measures them. */
export interface VisualizationDimensions {
  width: number;
  height: number;
}
/**
 * Everything a renderer needs to draw a Data visualization, passed to its `update` whenever the
 * data, series, size or interaction change.
 */
export interface VisualizationSnapshot extends VisualizationDimensions {
  id: string;
  data: readonly Record<string, unknown>[];
  series: VisualizationSeriesMap;
  interaction: VisualizationInteraction;
  /** Values are resolved for the current theme; original series are unchanged. */
  colors: Readonly<Record<string, string>>;
}
/**
 * The callbacks a Data visualization passes to a renderer's `mount`, through which the renderer
 * reports the inspected datum and the legend entries.
 */
export interface VisualizationRendererContext {
  inspect: (state: VisualizationInspection) => void;
  legend: (payload: readonly VisualizationPayload[]) => void;
}
/**
 * What a renderer's `mount` returns: the handle a Data visualization updates with each snapshot and
 * destroys when the renderer or plot changes.
 */
export interface VisualizationRendererInstance {
  update: (snapshot: VisualizationSnapshot) => void;
  /** Remove all engine nodes and input/subscription listeners. */
  destroy: () => void;
}
/**
 * A chart engine of your own, set as a Data visualization's `renderer`, which mounts into the plot
 * element.
 */
export interface VisualizationRenderer {
  mount: (
    plot: HTMLElement,
    context: VisualizationRendererContext,
  ) => VisualizationRendererInstance;
}
