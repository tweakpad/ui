import { bindPart } from '../../foundation/part.js';
import { html, nothing } from 'lit';
import type { TpElement } from '../../foundation/element.js';
import { resolveVisualizationSeries } from './payload.js';
import type {
  VisualizationInspection,
  VisualizationLegendOptions,
  VisualizationPayload,
  VisualizationSeriesMap,
  VisualizationTooltipOptions,
} from './types.js';

export interface VisualizationMetadataProvider {
  owner: TpElement;
  series: VisualizationSeriesMap;
  colors: Readonly<Record<string, string>>;
}
function requireProvider(
  provider: VisualizationMetadataProvider | undefined,
): VisualizationMetadataProvider {
  if (!provider || provider.owner.localName !== 'tp-data-visualization')
    throw new Error(
      'Data Visualization content requires a Root metadata provider. Use visualization.metadataProvider inside tp-data-visualization.',
    );
  return provider;
}
function indicator(
  provider: VisualizationMetadataProvider,
  item: VisualizationPayload,
  nameKey: string | undefined,
  options: VisualizationTooltipOptions,
  legend = false,
  hideIcon = false,
) {
  const resolved = resolveVisualizationSeries(provider.series, item, nameKey);
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
/** Foundation TooltipContent constituent. Returns no content when inactive/empty. */
export function visualizationTooltipContent(
  context: VisualizationMetadataProvider | undefined,
  inspection: VisualizationInspection,
  options: VisualizationTooltipOptions = {},
): unknown {
  const provider = requireProvider(context);
  const payload = inspection.payload.filter((item) => item.type !== 'none');
  if (!inspection.active || !payload.length) return nothing;
  const first = payload[0]!;
  const labelKey = options.labelKey;
  const rawLabel = labelKey
    ? resolveVisualizationSeries(provider.series, first, labelKey).label
    : (inspection.label ?? resolveVisualizationSeries(provider.series, first).metadata?.label);
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
      const resolved = resolveVisualizationSeries(provider.series, item, options.nameKey);
      return html`<div class="series-entry" data-series=${resolved.key}>
        ${
          options.formatter
            ? options.formatter(item.value, resolved.label, item, index, item.payload)
            : html`${indicator(provider, item, options.nameKey, options)}
                <div>
                  ${nestLabel ? header : nothing}<span class="series-name">${resolved.label}</span>
                </div>
                <span class="series-value"
                  >${typeof item.value === 'number' ? item.value.toLocaleString(provider.owner.lang || undefined) : String(item.value ?? '')}</span
                >`
        }
      </div>`;
    })}
  </div>`;
}
/** Foundation LegendContent constituent, sharing the exact tooltip metadata lookup. */
export function visualizationLegendContent(
  context: VisualizationMetadataProvider | undefined,
  payload: readonly VisualizationPayload[],
  options: VisualizationLegendOptions = {},
): unknown {
  const provider = requireProvider(context);
  const visible = payload.filter((item) => item.type !== 'none');
  if (!visible.length) return nothing;
  return provider.owner.renderPart(
    'data-visualization-legend',
    Object.freeze({ placement: options.placement ?? 'bottom' }),
    {
      tag: 'ul',
      properties: { part: 'data-visualization-legend', class: 'legend', 'aria-label': 'Series' },
      content: visible.map((item, index) => {
        const resolved = resolveVisualizationSeries(provider.series, item, options.nameKey);
        return provider.owner.renderPart(
          'data-visualization-series',
          Object.freeze({ key: resolved.key }),
          {
            tag: 'li',
            properties: {
              part: 'data-visualization-series',
              class: 'series-entry',
              'data-series': resolved.key,
            },
            content: html`${indicator(provider, item, options.nameKey, {}, true, options.hideIcon)}<span
                >${options.formatter ? options.formatter(resolved.label, item, index) : resolved.label}</span
              >`,
          },
        );
      }),
    },
  );
}
