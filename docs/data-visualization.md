# Data visualization

`tp-data-visualization` connects a chart renderer to shared responsive measurement,
series metadata, inspection, legend, and theme. It does not implement a chart engine.
The example supplies an SVG adapter, a textual interpretation, and the complete
dataset through `tp-table`. Mobile bars also use stripes so color is not the only encoding.

## Root API

| Property / attribute        | Type                                | Default                                        |
| --------------------------- | ----------------------------------- | ---------------------------------------------- |
| `data` (property)           | readonly ordered records            | `[]`; supply your dataset                      |
| `series` (property)         | keyed `VisualizationSeries` records | `{}`; supply stable keys                       |
| `renderer` (property)       | `VisualizationRenderer`             | required                                       |
| `description`               | meaningful text                     | `''`; text or equivalent `table` slot required |
| `label`                     | accessible figure name              | `Data visualization`                           |
| `interaction`               | `none`, `focus`, `pointer`, `both`  | `none`                                         |
| `tooltipOptions` (property) | `VisualizationTooltipOptions`       | `{}`                                           |
| `legendOptions` (property)  | `VisualizationLegendOptions`        | `{}`                                           |

Series records accept `label`, an actual `IconDefinition` in `icon`, opaque
`appearance`, and optional `color` or `theme: { light, dark }` colors. The default
palette uses `--tp-chart-1` through `--tp-chart-5`. Renderers receive the original
series and data objects plus the current resolved colors. `appearance` is passed
through unchanged. Stable keys, accessible labels, and a non-color encoding remain
the renderer author's responsibility.

`renderer.mount(plot, { inspect, legend })` returns `{ update(snapshot), destroy() }`.
`snapshot` contains `id`, `width`, `height`, `data`, `series`, `interaction`, and
`colors`. The initial dimensions are 320 × 200; ResizeObserver replaces them when
the plot becomes measurable. Zero-sized parents retain the last nonzero dimensions.
Resizing, data, and theme updates call `update` without remounting. `destroy` must
remove engine-owned nodes, pointer/keyboard listeners, and subscriptions. Adapter
replacement and disconnect destroy the old instance; reconnect mounts a new one.
Late callbacks from a destroyed instance are ignored.

Report `inspect({ active, payload, label, anchor, source })`, where `source` is
`pointer` or `focus` and `anchor` is the existing Tooltip anchor API (element or
virtual bounding rectangle with `contextElement`). Both paths must report the
same datum information. Pointer and keyboard availability follow `interaction`.
Report `legend(payload)` in engine order. Payload entries accept `dataKey`, `name`,
`value`, `color`, `type`, original `payload`, and engine-specific keys. `type: 'none'`
entries are omitted. Unknown series use engine labels and values.

The equivalent public methods are `setInspection(state)` and `setLegend(payload)`.
Read-only getters: `dimensions`, `scopeIdentifier`, `inspection`, `legendPayload`,
`metadataProvider`. `tp-resize` is a noncancelable notification with `{ width, height }`.
`tp-diagnostic` reports a missing accessible description/table.

## Tooltip and legend constituents

The Root composes the existing `tp-tooltip`, retaining its positioning, lifecycle,
Escape dismissal, and tooltip role. Inactive and empty payloads produce no content.
Its default noninteractive content supports:

| Tooltip option                                                        | Default / meaning                    |
| --------------------------------------------------------------------- | ------------------------------------ |
| `hideLabel`, `hideIndicator`                                          | `false`, independent visibility      |
| `indicator`                                                           | `dot`; also `line`, `dashed`         |
| `color`                                                               | optional indicator override          |
| `nameKey`                                                             | optional declared series-key field   |
| `labelKey`                                                            | optional field for the header label  |
| `labelFormatter(label, originalPayload)`                              | optional replacement header          |
| `formatter(value, resolvedLabel, originalItem, index, originalDatum)` | optional complete entry presentation |

Legend options: `hideIcon` (false), `placement` (`bottom` or `top`), `nameKey`,
`formatter(resolvedLabel, originalItem, index)`. Formatters replace presentation,
not series identity, payload ordering, or active state. Return text, Lit content,
or existing library components; tooltip content must remain noninteractive.

Foundation composition exports `VisualizationResponsiveViewport`,
`visualizationTooltipContent(provider, inspection, options)`,
`visualizationLegendContent(provider, payload, options)`, and
`resolveVisualizationSeries(series, item, nameKey)`. Pass Root's `metadataProvider`
to the content functions; missing/outside-Root providers throw an actionable error.
These are constituents of the same control, not additional catalog entries.

## Content and appearance

The default slot is supplementary content; `table` receives an actual `tp-table`.
Canonical parts are `data-visualization`, `data-visualization-plot-region`,
`data-visualization-series`, `data-visualization-legend`,
`data-visualization-inspection-surface`, and `data-visualization-style-scope`.
Use the common `partContracts`, `partPresentation`, and presentation dictionary.
The inspection part is registered on the real Tooltip popup; it does not create a
second overlay. Theme spacing, typography, radius, borders, and palette govern paint.
Plot aspect ratio can be changed through the plot part's style hook.

Each Root publishes `data-chart` as its stable scope. Explicit host `id` seeds the
scope; generated identifiers use the shared ID sequence and are encoded before
selector use. Preserve server-emitted `data-chart` during hydration. The style scope
publishes `--color-${visualizationIdentifier(seriesKey)}`; use the exported encoder
when a renderer needs those variables. Theme changes preserve payload objects and
active inspection, and only update renderer appearance.
