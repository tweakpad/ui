import { bindPart } from '../../foundation/part.js';
import { html, nothing } from 'lit';
import type { TpElement } from '../../foundation/element.js';
import { resolveChartSeries } from './payload.js';
import type {
  ChartInspection,
  ChartLegendOptions,
  ChartPayload,
  ChartSeriesMap,
  ChartTooltipOptions,
} from './types.js';

/**
 * The series and resolved colors a Chart hands to tooltip or legend content you build
 * yourself, read from its `metadataProvider`.
 */
export interface ChartMetadataProvider {
  owner: TpElement;
  legendPart?: string;
  seriesPart?: string;
  series: ChartSeriesMap;
  colors: Readonly<Record<string, string>>;
  /** The number the legend shows beside each series, by key. */
  values?: Readonly<Record<string, number | null>>;
}
function requireProvider(provider: ChartMetadataProvider | undefined): ChartMetadataProvider {
  if (!provider)
    throw new Error(
      'Chart content requires a Root metadata provider. Use chart.metadataProvider inside tp-chart.',
    );
  return provider;
}
function indicator(
  provider: ChartMetadataProvider,
  item: ChartPayload,
  nameKey: string | undefined,
  options: ChartTooltipOptions,
  legend = false,
  hideIcon = false,
) {
  const resolved = resolveChartSeries(provider.series, item, nameKey);
  const color =
    options.color ??
    provider.colors[resolved.key] ??
    (typeof item.payload?.fill === 'string' ? item.payload.fill : item.color) ??
    'var(--tp-foreground)';
  if (resolved.metadata?.icon && !hideIcon)
    return html`<tp-icon .icon=${resolved.metadata.icon} aria-hidden="true"></tp-icon>`;
  if (options.hideIndicator) return nothing;
  return html`<span
    class="encoding"
    aria-hidden="true"
    data-indicator=${legend ? 'dot' : (options.indicator ?? 'dot')}
    ${bindPart({ style: { '--_tp-series-color': color } })}
  ></span>`;
}
/** A series value as the tooltip and the legend show it: the series' own format, or the locale's. */
function valueText(provider: ChartMetadataProvider, key: string, value: unknown): string {
  if (typeof value !== 'number') return value === null ? '—' : String(value ?? '');
  const format = provider.series[key]?.format;
  return format ? format(value) : value.toLocaleString(provider.owner.lang || undefined);
}
/** Foundation TooltipContent constituent. Returns no content when inactive/empty. */
export function chartTooltipContent(
  context: ChartMetadataProvider | undefined,
  inspection: ChartInspection,
  options: ChartTooltipOptions = {},
): unknown {
  const provider = requireProvider(context);
  const payload = inspection.payload.filter((item) => item.type !== 'none');
  if (!inspection.active || !payload.length) return nothing;
  const first = payload[0]!;
  const labelKey = options.labelKey;
  const rawLabel = labelKey
    ? resolveChartSeries(provider.series, first, labelKey).label
    : (inspection.label ?? resolveChartSeries(provider.series, first).metadata?.label);
  const label =
    typeof rawLabel === 'string' ? (provider.series[rawLabel]?.label ?? rawLabel) : rawLabel;
  const formattedLabel =
    !options.hideLabel && options.labelFormatter
      ? options.labelFormatter(label, inspection.payload)
      : label;
  const header =
    !options.hideLabel && formattedLabel != null
      ? html`<div class="inspection-label">${formattedLabel}</div>`
      : nothing;
  const nestLabel = payload.length === 1 && options.indicator && options.indicator !== 'dot';
  return html`<div class="inspection-content">
    ${nestLabel ? nothing : header}
    ${payload.map((item, index) => {
      const resolved = resolveChartSeries(provider.series, item, options.nameKey);
      return html`<div class="series-entry" data-series=${resolved.key}>
        ${
          options.formatter
            ? options.formatter(item.value, resolved.label, item, index, item.payload)
            : html`${indicator(provider, item, options.nameKey, options)}
                <div>
                  ${nestLabel ? header : nothing}<span class="series-name">${resolved.label}</span>
                </div>
                <span class="series-value">${valueText(provider, resolved.key, item.value)}</span>`
        }
      </div>`;
    })}
  </div>`;
}
/** Foundation LegendContent constituent, sharing the exact tooltip metadata lookup. */
export function chartLegendContent(
  context: ChartMetadataProvider | undefined,
  payload: readonly ChartPayload[],
  options: ChartLegendOptions = {},
): unknown {
  const provider = requireProvider(context);
  const visible = payload.filter((item) => item.type !== 'none');
  if (!visible.length) return nothing;
  const placement = options.placement ?? 'bottom';
  const titleId = options.title
    ? `${provider.owner.getAttribute('data-chart') ?? 'chart'}-legend-title`
    : '';
  const list = provider.owner.renderPart(
    provider.legendPart ?? 'chart-legend',
    Object.freeze({ placement }),
    {
      tag: 'ul',
      properties: {
        part: provider.legendPart ?? 'chart-legend',
        class: 'legend',
        'data-placement': placement,
        'aria-label': options.title ? nothing : 'Series',
        'aria-labelledby': options.title ? titleId : nothing,
      },
      content: visible.map((item, index) => {
        const resolved = resolveChartSeries(provider.series, item, options.nameKey);
        return provider.owner.renderPart(
          provider.seriesPart ?? 'chart-series',
          Object.freeze({ key: resolved.key }),
          {
            tag: 'li',
            properties: {
              part: provider.seriesPart ?? 'chart-series',
              class: 'series-entry',
              'data-series': resolved.key,
            },
            content: (() => {
              const value = provider.values?.[resolved.key];
              const shown = value === undefined ? item : { ...item, value };
              return html`${indicator(provider, item, options.nameKey, {}, true, options.hideIcon)}${
                options.formatter
                  ? html`<span>${options.formatter(resolved.label, shown, index)}</span>`
                  : html`<span class="series-name">${resolved.label}</span>${
                        value === undefined
                          ? nothing
                          : html`<span class="series-value"
                              >${valueText(provider, resolved.key, value)}</span
                            >`
                      }`
              }`;
            })(),
          },
        );
      }),
    },
  );
  if (!options.title) return list;
  return html`<div class="legend-block" data-placement=${placement}>
    ${provider.owner.renderPart('chart-legend-title', Object.freeze({}), {
      tag: 'div',
      properties: { part: 'chart-legend-title', class: 'legend-title', id: titleId },
      content: options.title,
    })}${list}
  </div>`;
}
