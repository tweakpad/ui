# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Chart, `tp-chart` (`TpChart`), renamed from Data visualization (`tp-data-visualization`).
- Requested work / claim: the full chart plan: rename, built-in Cartesian marks (`line`, `bar`, `stacked`, below-zero bars, `lollipop`), polar marks (`pie`, `radar`, `radial`), axes and domains, `angleRange`, `innerRadius`, the `center` slot, legend values, placements (`top`, `bottom`, `start`, `end`, `inline`) and title, sign colors, series value format, hidden legend, loading state. Delivered in two phases, each shown to the user.
- Scope source: user instructions of 2026-11-25/26 (rename to `tp-chart`, compositions #25–#34, loading as a skeleton shimmer, keep the API small; approved API table and phasing; "continue" for Phase 2).
- In-scope changes and existing gaps: chart element, its types, content, styles, presentation family and recipe, shared axis module (`src/foundation/chart-axis.ts`) with Plot delegating to it, docs page, stories, fixture, generated bindings. Gap: CL §12.7 `req-cl-127-no-boolean` wording versus `loading` (Issue X-01).
- Repository baseline / unrelated changes: `development` at `d039c8d6` plus the uncommitted Plot edge-stroke fix (issue #53); both preserved.
- Live project / document IDs and revisions: UI Library `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, amended to 0.77.0 (content commit `eb12f8e5`, bump `412da881`), 0.77.1 (`5101ecee`) and 0.78.0 (content `0bb2262c`, bump `747c9907`) through direct Spec Blocks MCP tools; Foundation §18.8 `sec-188-data-visualization`, CL §21.3 `ucl21-data-visualization`.
- Owning contracts / dependencies / vocabulary: Foundation §18.8 Chart (marks, stacked, axes, domains, formats, sign, inspection, legend value, loading requirements `req-f-chart-*`); CL §21.3 props rows r0–r11, parts `chart`, `chart-plot-region`, `chart-series`, `chart-legend`, `chart-inspection-surface`, `chart-style-scope`, `chart-axis`, `chart-grid`, `chart-cursor`, `chart-skeleton`; Widgets Plot (shared axis options).
- Local reference evidence: the chart frame's existing tooltip and legend constituents; Plot's axis ticks and labels (`src/widgets/plot/decorations.ts` before the move).
- Tool readiness: direct Spec Blocks MCP and Chrome DevTools MCP available.
- Browser / server / build under test: Chrome via DevTools MCP; Vite dev server `http://127.0.0.1:5190`; Storybook `http://192.168.1.155:6006`; `npm run build` output for docs checks.
- Evidence directory: `tmp/component-verification/chart/`
- Durable verification fixtures / served URLs: `tests/fixtures/components/chart/index.html`
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | Identity: `tp-chart`, `TpChart`, `Chart…` types, `chart-…` parts; no alias | CL §21.3 heading, parts rows | former `TpDataVisualization` | `src/components/chart/chart.ts`, family `src/presentation/families/chart.ts` | frontmatter, API Reference | V-01, V-13 | passed | rename across source, docs, stories, bindings; `npm test`, `npm run build` |
| C-02 | `type` (`line` \| `bar` \| `lollipop`, default none) draws built-in marks; a set `renderer` wins | `req-f-chart-marks`, CL props r5 | frame renderer contract | `#activeRenderer`, `cartesianRenderer()` in `cartesian.ts` | ### Bars and lines | V-02, V-03, V-05 | passed | fixture lines, bars, lollipops; docs renderer previews unchanged |
| C-03 | `stacked` (default false) stacks bars per x, positive up, negative down; only the outermost segment rounds | `req-f-chart-stacked`, CL props r6 | — | `model()` cells `from`/`to`, `barPath()` | ### Bars and lines | V-03 | passed | stacked card composition |
| C-04 | `xAxis`/`yAxis` (JSON, default `{}`; `false` hides): `type` category \| number \| time, `key`, ticks, labels, `tickCount`, `values`, `format`, `title`, `line` | `req-f-chart-axes`, CL props r7–r8 | Plot axis options | `ChartAxis` extends shared `AxisOptions`; `jsonAxisOption` | ### Bars and lines | V-02, V-03, V-05 | passed | time ticks by tick spacing; "ms" title; hidden y axis |
| C-05 | `xDomain`/`yDomain` (`auto` default): auto y fits whole ticks and includes zero for bars and lollipops | `req-f-chart-domains`, CL props r9–r10 | Plot `xDomain`/`yDomain` | `niceDomain()`, `domainConverter` | Properties | V-04 | passed | negative bars and lollipops span zero |
| C-06 | Grid and zero line: dashed lines at y ticks, solid line at zero | CL §21.3 `-q4`, `-q5` | — | `.grid-line`, `.zero-line` in recipe | ### Values below zero | V-04 | passed | screenshots |
| C-07 | Negative values: bars hang below zero; `negativeColor` colors values below zero (lollipops, bars, line segments split at zero) | `req-f-chart-sign` | Plot `negativeFill` | `negativeColors`, clip paths for lines | ### Values below zero | V-04 | passed | signed lollipops red/green |
| C-08 | Inspection: band behind bars and lollipops, crosshair with dots over lines; tooltip lists every series at x beside the inspected column | `req-f-chart-inspection`, CL `-q6` | frame tooltip | `drawCursor()`, `report()`, tooltip `side` | ### Bars and lines | V-06, V-07 | passed | hover on latency and stacked charts |
| C-09 | Keyboard: plot is one focusable stop with `interaction` focus/both; Arrow keys, Home, End, Escape; live announcement | `req-f-chart-inspection` | — | `key()`, `.live` region | Properties (`interaction`) | V-08 | passed | Tab, End, ArrowLeft; focus ring; announcement with units |
| C-10 | Series `format(value)`: tooltip, legend value and announcement | Plot series `format` | Plot `PlotSeries.format` | `valueText()` in `content.ts` | Properties (series) | V-06, V-09 | passed | "0 ms" in tooltip and legend; spec 0.77.1 (X-02) |
| C-11 | `legendOptions.value` `latest` \| `sum`; `legendOptions = false` hides the legend; top legend starts at the inline start | `req-f-chart-legend-value` | Plot `legend: false` | `#legendValues()`, `data-placement` | ### Bars and lines, ### Values below zero | V-09 | passed | sums 1,059/565/619; hidden single-series legends; `false` spec 0.77.1 (X-02) |
| C-12 | `loading` (default false, reflected): Skeleton placeholders shaped like the type (bars, wave, block), values and tooltip hidden, `aria-busy` | `req-f-chart-loading`, CL props r11, `-q7` | Data view `loading` | `#placeholder()` with `tp-skeleton` | ### Loading | V-10 | passed | bar and line placeholders; §12.7 wording X-01 |
| C-13 | Shared axes: Plot and Chart read one axis type, tick and label code | Widgets Plot | `plotTicks`, `axisFormat`, `crosshairFormat` | `src/foundation/chart-axis.ts`; Plot delegates | — | V-12 | passed | Plot unit tests 32/32 |
| C-15 | `type` `pie`: one slice per series sized by its total over the records; non-positive totals draw nothing; slice gaps | `req-f-chart-polar`, CL props r5 | — | `polarRenderer()` in `polar.ts`, `sector()` | ### Pies, rings and radar | V-16, V-19 | passed | sales pie, half donut |
| C-16 | `type` `radial`: one ring per series over a track, first innermost; auto `yDomain` 0 to the total's whole tick | `req-f-chart-polar` | — | `stroke()`, track and ring paths | ### Pies, rings and radar | V-17, V-19, V-20 | passed | campaigns, activity |
| C-17 | `type` `radar`: one spoke per record named by `xAxis.key`, rings at the y ticks with labels on the first spoke, a filled shape with dots per series | `req-f-chart-polar` | — | radar branch in `polar.ts` | ### Pies, rings and radar | V-16, V-18 | passed | team skills |
| C-18 | `angleRange` (`angle-range`, two numbers or a JSON pair, default `0 360`) and `innerRadius` (`inner-radius`, clamped 0–1, default 0, radial 0.35); the marks fit the box their arc covers | `req-f-chart-angle`, CL props r13–r14 | — | `angleRangeConverter`, `arcBounds()` | ### Pies, rings and radar | V-16, V-17 | passed | half donut fills the plot; 270° rings |
| C-19 | Slot `center`: content at the center of polar marks, above the center over a top half circle, no pointer input, hidden while loading | `req-f-chart-center`, CL anatomy r10 | — | `.center` placed from `PolarOptions.center` | ### Pies, rings and radar | V-16, V-17 | passed | "512 GB", "12,847" |
| C-20 | Polar inspection: pie and radial inspect one series (others dim; tooltip value and share), radar one spoke (highlight, dot per series, every series in the tooltip beside the spoke name); arrows, Home, End, Escape; announcement | `req-f-chart-polar-inspection` | cartesian harness | `hit()`, `stepKey()`, `report()` | ### Pies, rings and radar | V-18, V-19 | passed | pointer on three types; ArrowRight on activity |
| C-21 | Legend placements `start`/`end` (column beside the plot, wraps below when narrow), `inline` (ring labels at each ring's start, line labels at line ends, else `bottom`), `legendOptions.title` naming the list; `formatter` composes meters | `req-f-chart-legend-placement`, CL anatomy r11, part `chart-legend-title` | — | `#placement`, `.body`, `chartLegendContent()` title, `lineLabels()` | ### Pies, rings and radar | V-17, V-20, V-21 | passed | campaigns legend, activity, error rate |
| C-22 | Loading placeholders for polar types: disc (pie, radar), ring (radial) | CL `-q7` | C-12 | `#placeholder()` | ### Loading | V-22 | passed | fixture loading pie and radial |
| C-14 | Custom `renderer` frame behavior unchanged | Foundation §18.8 frame | existing renderer docs | `#syncEngine` | ### Inspection, ### Accessible data | V-11 | passed | docs renderer previews render in Storybook |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| X-01 | CL §12.7 `req-cl-127-no-boolean` forbids a Boolean loading presentation property; Chart `loading` (like Data view's) conflicts | `tp-chart`, `tp-data-view` | an exception in §12.7 for data-loading state, or another name | awaiting user decision | blocked |
| X-03 | Phase 2 (polar types, angles, center slot, legend placements and title) was not in the contract | `tp-chart` | spec amendment through Spec Blocks | committed in 0.78.0: `req-f-chart-polar`, `req-f-chart-angle`, `req-f-chart-center`, `req-f-chart-polar-inspection`, `req-f-chart-legend-placement`, CL props r13–r14, anatomy r10–r11, `-q8`, part `chart-legend-title` | passed |
| X-02 | Series `format` and `legendOptions = false` were added after the 0.77.0 amendment | `tp-chart` | spec amendment through Spec Blocks | committed in 0.77.1 (`5101ecee`): `req-f-chart-sign`, `req-f-chart-formats`, `req-f-chart-legend-value`, CL props r1 and r12, `-q5`, `-q6` | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/components/chart/` — `chart.ts` (frame, properties, loading, legend values), `cartesian.ts` (built-in renderer), `content.ts` (tooltip and legend content), `types.ts`, `styles.ts`, `payload.ts`, `viewport.ts`.
- Supported exports / registration / constituent API impact: tag and class renamed; `AxisDomain`, `AxisEnvironment`, `AxisOptions` exported from the foundation entry; Plot's axis type is the shared `AxisOptions`.
- Framework bindings: regenerated with `npm run cem` (`Chart` in React and Vue); `npm test` and `npm run typecheck` pass; React and Vue fixture scenarios and smoke runs pass; `plans/frameworks/ledger.md` row `tp-chart`.
- Public vocabulary / tokens / parts / presentation review: parts `chart-axis`, `chart-grid`, `chart-cursor`, `chart-skeleton` added to the family; recipe uses `divider` edge, `--tp-muted-foreground`, `--tp-foreground` tint, `focusRing`.

### Family dependency map

| Responsibility | Reference dependency path / symbol         | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Axis ticks, labels, converters | Plot `decorations.ts`, `geometry.ts` | `src/widgets/plot/` | moved to `src/foundation/chart-axis.ts`; Plot delegates with its own names | Plot, Chart / V-12, V-02 |
| Tooltip and legend content | frame `content.ts` | `chartTooltipContent`, `chartLegendContent` | reused; legend gains values and `data-placement` | Chart, Plot / V-06, V-09 |
| Loading placeholder | Skeleton | `src/components/skeleton/` | composed `tp-skeleton animated` | Chart / V-10 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| `chart-grid`, `chart-axis` | library theme | user references #25–#30 | `divider` edge, muted foreground text | dashed grid, solid zero line | V-02, V-04 |
| `chart-cursor` | library theme | user references #25–#27 | foreground tint band, muted crosshair | band visible on page and Card surfaces | V-07 |
| `chart-skeleton` | library theme | user request (skeleton shimmer) | `tp-skeleton` | bars, wave or block by type | V-10 |
| `chart-inspection-surface` | library theme | existing tooltip treatment | popover surface recipe | opens beside the column | V-06 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| fixture, docs "Stacked bars over time" | titled panel | `tp-card` header slot | V-03, V-13 | none |
| docs "Loading" | reload control | `tp-button`, `tp-stack` | V-10, V-13 | none |
| internal | tooltip, placeholders | `tp-tooltip`, `tp-skeleton` | V-06, V-10 | marks are SVG drawn by the built-in renderer (contract anatomy) |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01; build and API | `npm run cem`, `npm test`, `npm run build` | no references to the old name; bindings and docs build | all pass | commands | passed | — |
| V-02 | C-02, C-04; visual | fixture latency chart, dark | four lines, time ticks, "ms" title, dashed grid | as expected | `tmp/component-verification/chart/p1-top.png` | passed | — |
| V-03 | C-03, C-04; visual | fixture stacked card | stacked hours with legend sums | as expected | `hover-stacked-crop.png` | passed | — |
| V-04 | C-05, C-06, C-07; visual | signed lollipops, negative bars | zero line, stems, red below zero | as expected | `p1-bottom.png`, `light-crop.png` | passed | — |
| V-05 | C-02, C-04; visual | single-series lollipops | category labels, hidden y axis | as expected | `light-crop.png` | passed | — |
| V-06 | C-08, C-10; real pointer | hover latency chart | crosshair, dots, tooltip with "0 ms" rows | as expected | `hover-line-crop.png` | passed | — |
| V-07 | C-08; pointer in a Card | pointer over stacked chart | band visible, tooltip beside the column | as expected | `hover-stacked-crop.png` | passed | — |
| V-08 | C-09; real keyboard | Tab, End, ArrowLeft | focus ring, crosshair moves, announcement with units | as expected | `keyboard-line-crop.png`; live text | passed | — |
| V-09 | C-10, C-11; visual | legends | latest values with units, sums, hidden single-series legends, start-aligned | as expected | `hover-line-crop.png`, `light-crop.png` | passed | — |
| V-10 | C-12; visual | `loading` bar and line | Skeleton bars and wave, values hidden | as expected | `p1-end.png` | passed | — |
| V-11 | C-14; docs | Storybook docs page | renderer previews render | 3 renderer charts and 3 built-in charts render | Storybook `components-chart--docs` | passed | — |
| V-12 | C-13; unit | Plot tests | unchanged behavior | 32/32 pass | `npx vitest run tests/unit/widgets/plot` | passed | — |
| V-13 | C-01; docs | `check-docs.mjs components/chart` | page passes | 1 page pass | command | passed | — |
| V-14 | C-01–C-12; accessibility automation | axe on the fixture | no component violations | none (fixture heading added) | axe in Chrome | passed | screen-reader testing not done |
| V-16 | C-15, C-17, C-18, C-19; visual | pie with end legend, radar, half donut with center, dark | slices with gaps, radar rings unfilled, center above the arc base | as expected after fixing filled radar rings, a tick label under the spoke name and the half-donut center | `p2-a.png`, `p2-c.png` | passed | — |
| V-17 | C-16, C-18, C-19, C-21; visual | 270° radial rings with center total and titled end legend with series-colored meters | rings innermost first over tracks; meters in series colors | as expected after coloring meters through a scoped `--tp-primary` | `p2-b.png`, `p2-c.png` | passed | — |
| V-18 | C-17, C-20; pointer | move over the Design spoke | spoke highlight, two dots, tooltip beside the spoke name | as expected after anchoring the tooltip to the name | `p2-hover.png` | passed | — |
| V-19 | C-15, C-16, C-20; pointer | move over a slice and a ring | others dim; tooltip share and formatted value ("128 GB") | as expected | `p2-hover.png` | passed | — |
| V-20 | C-16, C-20, C-21; real keyboard | focus activity, ArrowRight | next ring, others dim, focus ring, announcement "Exercise 62%" | as expected after removing a repeated share | `p2-keyboard.png` | passed | — |
| V-21 | C-21; layout and theme | light scheme; campaigns at 420px | end legend wraps below the plot; light colors | as expected after raising the plot basis to 18rem | `p2-light.png`, `p2-narrow.png` | passed | — |
| V-22 | C-22; visual | loading pie and radial | disc and ring shimmer | as expected | `p2-keyboard.png` | passed | — |
| V-23 | C-15–C-21; docs | Storybook docs "Rings with a total" | renders with center and titled legend | as expected | `docs-radial.png` | passed | — |
| V-15 | C-01; framework bindings | React and Vue fixtures, scenarios and smoke | pass | pass | fixtures in Chrome | passed | — |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Plot `plotTicks`, `axisFormat`, `crosshairFormat` and its converters delegate to `src/foundation/chart-axis.ts` |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | fixture compared with the user references #25–#30 |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | axes hidden independently, legend placement, value and `false`, `stacked`, `negativeColor`, `format` (V-02–V-10) |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed | Spec amended to 0.78.0; both phases from the user's approved plan. |
| 1. Capability mapping                 | passed | C-01–C-22 mapped; X-01 recorded for a user decision; X-02 committed in 0.77.1. |
| 2. Architecture and composition reuse | passed | Shared axis owner, frame content reuse, Skeleton and Card composition. |
| 3. Behavior                           | passed | V-02–V-10 with real pointer and keyboard. |
| 4. Presentation and customization     | passed | Recipe parts and tokens; light and dark. |
| 5. Accessibility                      | passed | Focus stop and ring, live announcement, axe clean; no screen-reader run. |
| 6. Visual and interaction inspection  | passed | Screenshots in `tmp/component-verification/chart/`. |
| 7. Documentation and demo reuse       | passed | Docs page sections, ledger forced edits, Storybook rendering. |
| 8. Regression and reconciliation      | passed | `npm test`, `npm run build`, typecheck, React and Vue fixtures. |

## Documentation synchronization

- [x] `docs/components/chart.mdx` follows the tweakpad-docs skill (structure, style, merge ledger); `check-docs.mjs components/chart` passes; the story renders it with `libraryDocs()`; the tag is off `scripts/docs/pending.json`.
- [x] JSDoc covers the element summary, every public field and method, slots, events and CSS properties; parts carry a description in the family; `npm run build` reports no undescribed row.
- [x] `elementDependencies` is complete (`TpTooltip`, `TpIcon`, `TpSkeleton`).
- [x] Verification fixtures are separate from the page (`tests/fixtures/components/chart/`).
- [x] Rendered and copyable previews reuse existing components (`tp-card`, `tp-stack`, `tp-button`).
- [x] Preview code works outside Storybook: no imports beyond the page's registration.

## Completion / handoff

- Change summary: Data visualization renamed to Chart and given built-in Cartesian marks, axes, sign colors, value formats, legend values and a loading state; Plot shares its axis code.
- Actual delivery claim: Phases 1 and 2 as mapped above (C-01–C-22).
- Record checker: `check-gates.mjs plans/components/chart/implementation-checklist.md --stage complete`.
- Non-browser checks: `npm test`, `npm run typecheck`, `npm run build`, `check-docs.mjs components/chart`, `check-ledger.mjs` pass.
- Behavior: V-02–V-10 passed.
- Accessibility: focus and announcement verified; axe clean; no screen-reader test.
- Visual/customization/motion inspection: dark and light; Skeleton motion follows the Skeleton's policy.
- Documentation and demo composition reuse: verified in Storybook.
- Shared-consumer regressions / package boundaries: Plot unit tests; React and Vue fixtures.
- Required failures or blocked checks: X-01 needs a user decision.
- Older out-of-scope gaps: none recorded.
- Changed source revisions / reopened gates: none after the last checks.
