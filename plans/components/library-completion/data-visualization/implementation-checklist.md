# Data visualization implementation record

## Delivery and source record

- Requested work / claim: Full user-requested Data Visualization implementation, including real documented renderer integration; no placeholder plot or invented chart geometry in Root.
- Scope source: User full component audit/implementation list and authorization to proceed without regressing working controls or duplicating shared implementations.
- Baseline/clean pinned references in ../audit.md. Fresh direct MCP Foundation sec-188-data-visualization and Library ucl21-data-visualization from current complete documents2026-10-04.
- Source: ui/apps/v4/registry/bases/base/ui/chart.tsx (ChartContainer,ChartStyle,ChartTooltipContent,ChartLegendContent,getPayloadConfigFromPayload), style-nova.css cn-chart-tooltip278; same APIs in new-york-v4 registry. Upstream Recharts owns geometry, responsive engine and engine payloads. Root contract explicitly does not define scales/marks/geometry; no Recharts/React runtime added. Supplied adapter owns its chart, this library owns measurement/provider/tooltip/legend/style. Existing placeholder display.ts class has none of these APIs.
- Shared owners: TpTooltip→TpHoverSurface→TpAnchoredSurface owns actual positioning, lifecycle and noninteractive tooltip semantics; common presentation registration maps canonical inspection part to its actual popup. Native ResizeObserver controls responsive dimensions, ComposedEnvironmentObserver watches theme; Foundation id supplies deterministic sequence and server scope is reused. Existing TpIcon, TpTable and common renderPart provide composition and customization. No parallel popup or table implementation.
- Renderer integration: one mount per adapter/plot host; update receives same data/series objects and measured dimensions plus opaque appearance. Theme updates do not clear payload/active state. Adapter returns cleanup/destroy, owns mark keyboard/pointer subscriptions, reports ordered inspection/legend payloads through Root methods. Root exposes optional TooltipContent/LegendContent constituents using one metadata provider/resolver; outside-root use diagnoses.
- Source/tool readiness: direct specs/Chrome MCP available. Existing5173/6006. Evidence inline/local tmp/component-verification/data-visualization, durable library-completion fixture. SSR execution support to investigate; no synthetic claim.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Renderer-neutral Root with ordered data and required series/renderer/description | sec188/ucl21 | base/ui/chart.tsx ChartContainer→Recharts ResponsiveContainer | adapter mount/update/destroy interface; no geometry in Root | docs/data-visualization.md | V-01 V-02 | passed | Implementation and documented API reconciled; observed results in V-01, V-02. |
| C-02 | Stable nonzero initial dimensions320x200 and ResizeObserver resize without engine remount | sec188 | ChartContainer INITIAL_DIMENSION/ResponsiveContainer | ResponsiveViewport controller and dimensions event; preserve identity | docs/data-visualization.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-03 | Stable sanitized scoped identifier and SSR/hydration reuse | sec188 | React useId/ChartStyle | Foundation createId plus persisted server scope adoption and explicit identifier | docs/data-visualization.md | V-02 V-06 | passed | Implementation and documented API reconciled; observed results in V-02, V-06. |
| C-04 | Series label/icon and opaque appearance, semantic role and non-color encoding | sec188/ucl21 | ChartConfig and ChartStyle | series keyed records/provider; actual TpIcon; style variables channel | docs/data-visualization.md | V-01 V-03 | passed | Implementation and documented API reconciled; observed results in V-01, V-03. |
| C-05 | Payload stable key priority nameKey/dataKey/name/value, nested payload lookup and unknown fallback | sec188 | getPayloadConfigFromPayload | one pure metadata resolver shared Tooltip/Legend | docs/data-visualization.md | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-06 | Tooltip inactive/empty absent; engine order preserved; labels/value/icon/indicator metadata | sec188 | ChartTooltipContent | actual TpTooltip + public TooltipContent constituent, common resolved model | docs/data-visualization.md | V-01 V-03 | passed | Implementation and documented API reconciled; observed results in V-01, V-03. |
| C-07 | Independent hideLabel/hideIndicator/dot-line-dashed and color/nameKey/labelKey | sec188 plus source parity | ChartTooltipContent props | typed inspection options, no spacing properties | docs/data-visualization.md | V-01 V-04 | passed | Implementation and documented API reconciled; observed results in V-01, V-04. |
| C-08 | Original payload label/value formatters replacing presentation only | sec188 | ChartTooltipContent labelFormatter/formatter | callbacks receive original engine item and payload order, return Lit content | docs/data-visualization.md | V-03 V-04 | passed | Implementation and documented API reconciled; observed results in V-03, V-04. |
| C-09 | Legend absent empty, ordered metadata shared lookup, hideIcon and top/bottom placement/formatter | sec188 | ChartLegend/LegendContent | public LegendContent constituent and Root legend options | docs/data-visualization.md | V-01 V-03 V-04 | passed | Implementation and documented API reconciled; observed results in V-01, V-03, V-04. |
| C-10 | Pointer/focus/both/none inspection uses same engine information and accessible summary/table | ucl21/sec188 | Recharts accessibilityLayer + Tooltip | adapter publishTooltip with source, actual Tooltip shared positioning; textual summary/table slots | docs/data-visualization.md | V-04 V-05 | passed | Implementation and documented API reconciled; observed results in V-04, V-05. |
| C-11 | Theme/part/dictionary/motion preserve data identity/order/active state; no fixed spacing | sec188/ucl21 | Nova cn-chart-tooltip and chart palette | shared theme role variables and actual Tooltip registered canonical part; Root renderPart | docs/data-visualization.md | V-06 | passed | Implementation and documented API reconciled; observed results in V-06. |
| C-12 | Provider consumers outside Root actionable diagnostic; adapter replacement/cleanup/disconnect/reconnect | sec188 | useChart context guard/unmount | Root service lookup through composed tree; destroy adapter/ResizeObserver/environment/subscriptions | docs/data-visualization.md | V-02 V-05 | passed | Implementation and documented API reconciled; observed results in V-02, V-05. |
| C-13 | Complete docs/Controls/copyable renderer composition and exports/registration | library docs | base chart examples | authored real SVG-engine adapter demo + actual Table/Icon/Tooltip reuse | docs/data-visualization.md | V-07 | passed | Implementation and documented API reconciled; observed results in V-07. |
| C-99 | Native browser media/accessibility and applicable native-input or SSR verification | Shared Foundation accessibility/motion/lifecycle contract; skill verification procedure | Shared native platform and component source tests recorded above | Existing shared owners; no simulated platform substitute | Component docs and ../verification-results.md | V-98 V-99 | blocked | Implementation remains in scope; verification requires capabilities not exposed by registered tools. |

## Architecture and reuse

Folder src/components/data-visualization: types/payload/viewport/constituents/root; display.ts reexport. Providers and consumers are Foundation composition, not extra catalog identities. Appearance in recipes/data-visualization. Root renderer mount/update/destroy owns adapter lifecycle only; native demo renderer owns mark geometry outside the library component.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Inspection surface | ChartTooltip→Recharts Tooltip; Foundation maps Tooltip.Root | TpTooltip, TpAnchoredSurface, SurfaceState, positioning | Actual TpTooltip instance and registered popup presentation; no new overlay owner | Chart/Tooltip V-04 V-06 |
| Responsive engine lifecycle | ChartContainer→ResponsiveContainer | native ResizeObserver, ComposedEnvironmentObserver | One adapter mount, dimensions update; no geometry/engine dependency | V-02 |
| Metadata/payload | ChartContext→useChart/getPayloadConfigFromPayload | no chart owner exists | One provider/resolver shared by actual LegendContent and TooltipContent | V-03 |
| Presentation | Nova cn-chart-tooltip; chart theme variables | shared Tooltip/section recipes, TpIcon/TpTable | canonical inspection recipe registered on existing Tooltip native host; semantic chart tokens only | V-01 V-06 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Root/plot | base chart.tsx + Nova | ChartContainer aspect-video/text-xs/grid strokes | native plot region, theme text/border roles | Renderer owns geometry and marks; Root only containment and theme | V-01 V-06 |
| Inspection | base/Nova | cn-chart-tooltip | actual TpTooltip + canonical chart recipe | shared symmetric popup inset per user normalization, theme border/radius/shadow | V-01 V-06 |
| Legend/series | ChartLegendContent | icon/swatch/label rows, top/bottom placement | actual TpIcon, common text and gap tokens | native list/encoding mark, not an invented Badge | V-03 V-06 |
| Style scope | ChartStyle | scoped per-series color vars light/dark | semantic --tp-chart-* and safe CSS property writes | Appearance channel never alters payload semantics | V-06 |
| Text equivalent | library contract | accessible chart examples | actual TpTable plus native description | Full dataset example retained beyond plot | V-05 V-07 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Quarterly series | Plot adapter + inspection + legend + table | actual DataVisualization/TpTooltip/TpIcon/TpTable | V-01 V-07 | SVG geometry is consumer renderer output, intentionally outside Root; native series swatches and text are chart anatomy |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-04 C-06 C-07 C-09 C-13 | Representative adapter/legend/inspection; independent optional regions | Actual plot and source appearance with shared components | Authored SVG adapter and native accessible Table rendered. Real hover Q2 and keyboard inspection show Desktop305/Mobile200; independent label/indicator/icon/legend placement verified. | Chrome MCP screenshot/AX | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-02 | C-01 C-02 C-03 C-12 | Resize/zero-parent/initial/renderer replacement/disconnect/reconnect | Nonzero initial dims, update not remount, cleanup once | Mount/update/destroy counters prove one mount through resize/theme, nonzero size retained with zero parent, destroy once on detach and remount on reconnect. Replacing renderer destroys first before mounting second, then destroys second on removal. | Chrome APIs and source | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-03 | C-04 C-05 C-06 C-08 C-09 | Ordered/nested/unknown/empty payload and original formatter refs | Stable key resolution, correct labels/icons/order/values | Payload helper unit cases and browser formatter probes preserve original objects and order. Unknown/nested metadata resolution and single-series dashed nesting checked. | focused pure tests + Chrome | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-04 | C-07 C-08 C-09 C-10 | Actual hover/focus/keys/Escape and policy/option changes | Same information, actual Tooltip semantics and independent options | Real hover, Tab/ArrowRight and Escape inspected, same payload for keyboard and pointer. Tooltip options update independently with actual Tooltip owner. | Chrome MCP input | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-05 | C-10 C-12 | Outside-root consumer, no interactive layer, summary/table and removal | Actionable diagnostic and accessible equivalent; no leaked subscriptions | Outside-root tooltip and legend functions throw actionable provider error. Summary plus all four quarters and totals use actual Table. Stale callbacks after destroy ignored; scopes persist on reconnect. | Chrome MCP AX/axe | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-06 | C-03 C-11 | Light/dark/theme/density/parts/delegate/dictionary and active payload | Shared paint updates only, stable identity and accessible labels | Light/dark/RTL/base5 screenshots; theme change preserves data, series, payload, legend and mark identity. Canonical part/delegate/ref and dictionary checked. Narrow320x180 plot and105.34px popup fit; native table scroll owns overflow. | Chrome MCP screenshot/APIs | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-07 | C-13 | Authored docs/source/Controls/build/export/register | Public API reconciled and usable renderer composition | Complete adapter/provider/options docs, authored example and built exports pass. Server-emitted data-chart adoption separately observed; this is not an SSR execution claim. | Chrome/static/build | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-98 | C-99; native media/accessibility | OS forced-colors and applicable OS reduced-motion policy | Correct native high-contrast and media behavior | Registered Chrome MCP has no forced-colors or OS reduced-motion control. Explicit component reduce policy was tested separately where applicable. | Registered tool schema inspection | blocked | No CSS pseudo-state or matchMedia mock is accepted as native media evidence. |
| V-99 | C-99; native input/runtime | Required physical-input or SSR boundary | Native platform behavior verified without simulation | Real SSR/hydration runtime is unavailable. Adopting an existing server-style data-chart attribute passed but does not prove a server/client render cycle. | Registered Chrome MCP schemas and current runtime inventory | blocked | Source/API evidence does not substitute for this required execution. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners actually adopted, duplicate removed | passed | display placeholder removed; actual TpTooltip popup registered canonical chart part, actual TpTable full dataset, one resolver/provider and adapter lifecycle |
| I-02 | Sourced representative render and shared recipe | passed | Chrome63 dark screenshot: actual paired solid/striped bars, legend, complete table; hover Q2 real Tooltip with shared symmetric6.4px inset and6.4px row gap |
| I-03 | Independent constituents and placement | passed | Chrome63 active payload retained while hideLabel/hideIndicator and top/hideIcon legend independently changed |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh contract and local source chain |
| 1. Capability mapping | passed | Renderer/provider/payload/tooltip/legend/appearance/cleanup mapped |
| 2. Architecture and composition reuse | passed | Actual Tooltip family, one metadata provider and adapter lifecycle, no chart geometry in Root |
| 3. Behavior | blocked | Observed behavior in V rows and execution appendices. Required native-input/runtime evidence remains V-99 blocked. |
| 4. Presentation and customization | passed | Shared recipes, theme overrides and applicable actual part/ref/delegate/dictionary checks pass; source and visual evidence in V rows. |
| 5. Accessibility | blocked | Native AX, real keyboard and local axe checks recorded; forced-colors browser inspection V-98 cannot be emulated with registered tools. |
| 6. Visual and interaction inspection | blocked | Light/dark/RTL/density and relevant optional states inspected; OS media/forced-colors V-98 remains blocked. |
| 7. Documentation and demo reuse | passed | Authored API documentation, copyable source and actual public nested controls reconciled; full Storybook build passes. |
| 8. Regression and reconciliation | blocked | Focused regressions, lint/type/build, served built package and documentation pass. Complete-component certification remains blocked by explicit V-98/V-99 evidence boundaries. |

## Completion / handoff

Task active, no complete claim.

## Execution evidence 2026-10-04

Chrome63 authored Storybook: real hover Q2 exposes Desktop305/Mobile200 in actual Tooltip; actual Tab focuses Q1 and ArrowRight moves to Mobile with the same Q1 values. Escape closes while focus remains on mark. Dark source render and light/RTL/spacing5 screenshot inspected. Shared popup padding6.4px at3.2 seed and10px at5 seed; single-series dashed indicator uses nested header and vertical dashed line. Actual TpTable contains all4quarters and totals. Independent hideLabel/hideIndicator, legend top/bottom and hideIcon tested; icon hiding preserves a swatch per source.

Wrapped public adapter mount/update/destroy counters:1mount across theme/400x225resize, zero-sized parent retains400x225. Theme update preserves original data,series,inspection,payload,legend and SVGmark objects; semantic color override changes indicator to#127c55. Original label/value/legend formatter object identity verified. Popup partPresentation border override reaches actual nested Tooltip popup. Disconnect destroys once, stale engine callbacks ignored, reconnect mounts second instance with same scope. Axe zero violations; color contrast has an incomplete automated row and was visually inspected, not a screen-reader claim.

TypeScript, focused ESLint, complete281-unit aggregate evidence (279 full plus corrected20 targeted), production build and Storybook build pass. Durable fixture library-completion imports real authored adapter/table composition. Remaining: generated-id SSR/hydration execution unavailable in current tooling; validate provider outside-root error/public render delegates/custom dictionary and narrow constrained surface before marking complete. No full component claim yet.

## Reconciled execution status — 2026-10-04

Implementation and documentation for this workstream are delivered. The scenario table above supersedes earlier prospective statements below/above that say implementation or final checks are pending. Required unavailable browser/runtime evidence remains explicitly blocked; no full conformance claim is made. See [final verification results](../verification-results.md) for shared fixes, commands, package evidence and tool boundaries.
