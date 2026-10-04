import type { TpTooltip } from '../tooltip/tooltip.js';
import type { IconDefinition } from '../../icons/types.js';

export interface VisualizationSeries {
  label?: string;
  icon?: IconDefinition;
  /** Passed through to the renderer without interpreting it as behavior. */
  appearance?: unknown;
  color?: string;
  theme?: Partial<Record<'light' | 'dark', string>>;
}
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
export type VisualizationInteraction = 'none' | 'focus' | 'pointer' | 'both';
export interface VisualizationInspection {
  active: boolean;
  payload: readonly VisualizationPayload[];
  label?: unknown;
  anchor?: TpTooltip['anchor'];
  source: 'focus' | 'pointer';
}
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
export interface VisualizationLegendOptions {
  hideIcon?: boolean;
  placement?: 'top' | 'bottom';
  nameKey?: string;
  formatter?: (label: string, item: VisualizationPayload, index: number) => unknown;
}
export interface VisualizationDimensions {
  width: number;
  height: number;
}
export interface VisualizationSnapshot extends VisualizationDimensions {
  id: string;
  data: readonly Record<string, unknown>[];
  series: VisualizationSeriesMap;
  interaction: VisualizationInteraction;
  /** Values are resolved for the current theme; original series are unchanged. */
  colors: Readonly<Record<string, string>>;
}
export interface VisualizationRendererContext {
  inspect: (state: VisualizationInspection) => void;
  legend: (payload: readonly VisualizationPayload[]) => void;
}
export interface VisualizationRendererInstance {
  update: (snapshot: VisualizationSnapshot) => void;
  /** Remove all engine nodes and input/subscription listeners. */
  destroy: () => void;
}
export interface VisualizationRenderer {
  mount: (
    plot: HTMLElement,
    context: VisualizationRendererContext,
  ) => VisualizationRendererInstance;
}
