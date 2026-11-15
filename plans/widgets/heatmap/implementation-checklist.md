# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Heatmap, `tp-heatmap` (widget); shared date-grid services extracted from Calendar (`tp-calendar`)
- Requested work / claim: complete widget (user 2026-11-13: "Implement it" after approving the API plan)
- Scope source: approved plan `/Users/vanrez/.claude/plans/lets-get-prepared-to-jaunty-parnas.md`; user decisions 2026-11-13: one generic surface without layout enums ("We want a clean single unifying surface to present all layouts"), optional selection reusing Calendar's model, dataset hints in the hover tooltip, scroll mode that opens at the latest data with edge shadows only in scroll mode; plan approval grants the Calendar extraction ("make sure we share all the foundation properly")
- In-scope changes and existing gaps: `src/widgets/heatmap/`, its family, recipe, docs, stories, fixture, unit tests, framework lane row; Foundation `calendar.ts` additions, new `label-fit.ts` and `grid-navigation.ts`; Calendar adopting them
- Repository baseline / unrelated changes: `6aec3e39` on `development`, clean tree at start
- Live project / document IDs and revisions: UI Library project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`; Widgets §6.9 Heatmap `uwg-hm-sec`, §2 data grid paragraph `uwg-hm-par-scope-1`, Foundation §14.9 shared services `p-f-calendar-shared-services`, committed at 0.65.50 (`2bd8bbafea9f5c663631c7aff86a95ccfb18b956`), accessibility patch at 0.65.51 (`ce62dae6c534b90365208e88fcb333890520cc88`), validation 0 issues
- Owning contracts / dependencies / vocabulary: Foundation §14.9 Calendar and date grid; Component Library Calendar, Tooltip, Scroll area, Skeleton; Foundation lane protocol (`ControllableState`, `TpValueChangeEvent`)
- Local reference evidence: none: no heatmap, activity calendar or contribution graph exists under `../specification/external/` (searched every reference folder; only map density layers); the design is library-original, recorded in the spec's Upstream reference
- Tool readiness: Spec Blocks MCP available (section written and committed by a spec agent); Chrome DevTools MCP available
- Browser / server / build under test: Chrome via DevTools MCP; Storybook dev `http://localhost:6006` (`widgets-heatmap--*`); Vite `http://localhost:5173/tests/fixtures/widgets/heatmap/` and the React/Vue framework fixtures; source modules
- Evidence directory: `tmp/component-verification/heatmap/run1/`
- Durable verification fixtures / served URLs: `tests/fixtures/widgets/heatmap/index.html`
- Evidence availability to the next agent: local only

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------ | -------------- |
| C-01 | Data `{ key, value, level?, label?, hint? }`, `unit` (default `day`), `start`/`end` (default the year ending `today`), `aggregate` (default `sum`) | Widgets §6.9 `uwg-hm-sec` (0.65.50) | none (library-original) | `data`, `unit`, `start`, `end`, `aggregate`; `model.ts` `buildHeatmapModel`, `projection.ts` `normalizeKey`, `enumerateRange`, `defaultRange` | Usage | V-01, V-02 | passed | Unit tests and fixture `#year` |
| C-02 | Projections: `columns`/`rows` take a built-in absolute or cyclic name, a wrap count or a `HeatmapAxis`; a cell exists only where a key lands; fixed cycles show all ticks | Widgets §6.9 | none | `projection.ts` `project`, `fullCycle`, `cycleProbe`; `projectionConverter` | Arrangements, Wrapped sequences, Custom axes | V-02, V-03 | passed | Unit tests: default year, vertical, months by day (Feb 29 absent), punch card, wrap, custom |
| C-03 | Levels: `levels` (5), `scale` (`linear`), `thresholds`, `domain`, explicit datum `level` | Widgets §6.9 | none | `scale.ts` `heatmapLevelScale` | Levels and colors | V-02 | passed | Unit tests |
| C-04 | Color: `color` theme role or CSS color (default `primary`), `colors` explicit ramp, OKLab mix from the empty color | Widgets §6.9 | none | `#levelColor`, `--tp-heatmap-level-color`, recipe `--_color`, `--_empty` | Levels and colors | V-05, V-06 | passed | Screenshots dark and light, `chart-*`, `destructive`, custom ramp |
| C-05 | `size` (`xs`…`lg`, default `default`) and `shape` (`square`, `rounded`, `circle`, default `rounded`) | Widgets §6.9 | none | family axes, recipe size and shape keys | Size and shape | V-05 | passed | Sizes story screenshot |
| C-06 | `fit`: `stretch` (default; cells ≥ size, scrolling as `fit="scroll"` once they would shrink below it; user 2026-11-14: "No edge shadow on the first usage demo when resized"), `trim` (latest columns that fit) | Widgets §6.9 | none | `styles.ts` grid tracks, `#measureTrim`, `#measureStretch` (probe of the minimum cell), `data-scroll` | Fit | V-04, V-13 | passed | Fixture `#trim` ends 2026-11-13 with Mon/Wed/Fri intact; V-13 |
| C-07 | `fit="scroll"`: either direction, opens at the latest data (`scroll-anchor`, default `end`), stays pinned on data changes unless the user scrolled away, edge shadows through the Scroll area's `scroll-edge-fade`; none of this in other modes | Widgets §6.9 | Scroll area `scroll-edge-fade` | `tp-scroll-area` `axis="both"`, `#anchorScroll`, `#userScroll`, label strips translated | Fit | V-04 | passed | Fixture `heatmapAPI.scroll`/`append` results |
| C-08 | Labels: `column-labels`/`row-labels` (`auto`, `all`, `alternate`, `none`); change-point month labels for week axes, clipped when narrower than their text; short→narrow fit; locale and `week-starts-on` | Widgets §6.9; Foundation §14.9 | Calendar weekday fit | `#renderColumnLabels`, `#renderRowLabel`, `LabelFit` | Labels | V-03, V-05 | passed | J F M narrow labels at 18rem; Mon/Wed/Fri; month change points |
| C-09 | Tooltip: one `tp-tooltip` for the inspected cell; `renderTooltip`, dataset hints (up to `max-hints`, then "+n more"), `messages.cell` | Widgets §6.9 | Data visualization tooltip pattern | `#renderTooltipContent`, `#inspect` | Tooltips and hints | V-07 | passed | Hover and focus open it; string hints also join the cell's name |
| C-10 | Keyboard: one tab stop, arrows (mirrored in RTL, skipping gaps), Home/End, Control+Home/End, PageUp/PageDown month (Shift year), Enter/Space activate, Escape clears | Widgets §6.9; Foundation §14.9 | Calendar `#dayKeyDown` | `#keyDown`, `gridKeyMove`, `stepGridCell`, `rowEdgeCell`, `#pageTarget` | Keyboard | V-08 | passed | Real keys: Nov 23 → Nov 30 → Dec 1 → Jan 1 |
| C-11 | Selection: `selection-mode` (`none`), `value`/`default-value`, `required`, `minimum-selection-count`, `maximum-selection-count`, `range-exclusion`, `disabledCells`, `setValue`; range needs one key per cell | Widgets §6.9, §2 `uwg-hm-par-scope-1` | Calendar `calendarSelectionProposal` | `#selection` ControllableState, `#order`, `#activate` | Selection | V-09, V-12 | passed | Range Oct 5–14 by two presses; React/Vue lane |
| C-12 | Events `tp-inspection-change`, `tp-cell-activate`; methods `cellAt`, `focusCell`; getter `summary` | Widgets §6.9 | Plot `tp-inspection-change` | `#inspect`, `#activate` | API Reference | V-07, V-09 | passed | Fixture event log |
| C-13 | Loading: `loading` pulses level-0 cells with the ambient placeholder motion, `aria-busy` | Widgets §6.9 | Skeleton pulse | `styles.ts` `ambientCss('pulse', 'placeholder')` | API Reference | V-06 | passed | Fixture `#loading` |
| C-14 | Accessibility: cells form a grid named by `label`; each row a hidden row header; cells named by `messages.cell` plus string hints; `aria-selected`/`aria-multiselectable` when selectable; visible label strips decorative | Widgets §6.9 | Calendar grid | render, `#cellName` | Keyboard | V-10 | passed | axe clean on the fixture (only the page's missing h1) |
| C-15 | Presentation: family parts, recipe, `--tp-heatmap-*` hooks; legend, footer slot | Widgets §6.9 | none | `families/heatmap.ts`, `recipes/heatmap.ts` | API Reference | V-05 | passed | Screenshots |
| C-17 | Outside press clears the selection (reason `outside-press`) unless `required` (user 2026-11-14: "click outside shoud de-select") | Widgets §6.9 (patch requested) | Foundation reason registry `outside-press` | `#outsidePress` document capture listener | Selection | V-17 | passed | Real click on the story's output after a range |
| C-18 | Legend filter: `legend-filter` (false) makes each level a Toggle of a Toggle group; lane `levelFilter`/`defaultLevelFilter`, `tp-level-filter-change`, `onLevelFilterChange`; other levels' cells `data-filtered`, receding; whole-number legend bounds for integer data (user 2026-11-14: "On the legend with an optional flag default to false. Make it each level selectable and filter the grid on each selected level") | Widgets §6.9 (patch requested) | Toggle group (`multiple`, `size="icon-xs"`, `spacing="0"`) | `#levelFilter` ControllableState, `#legendChange`, `containNestedEvents`, recipe `&[data-filtered]` | Legend filter | V-17 | passed | Real clicks on levels 3 and 4: 48 cells kept |
| C-16 | Shared Foundation: `resolveWeekStart`, `localeWeekInfo`, `todayCalendarDate`, `calendarMonthLabel`/`CalendarAdapter.monthLabel`, `startOfWeek`, `calendarWeeks`, `CalendarDateMatcher`/`matchesCalendarDate`, `CalendarSelectionOrder`, `LabelFit`, `gridKeyMove`/`stepGridCell`/`rowEdgeCell` | Foundation §14.9 `p-f-calendar-shared-services` | Calendar private members | `foundation/calendar.ts`, `foundation/label-fit.ts`, `foundation/grid-navigation.ts`; Calendar delegates | — | V-11 | passed | Calendar unit tests unchanged and passing; new `date-grid-services.test.ts` |
| C-19 | Separated groups: `groups` (`joined` default, `separated`): each group of an axis (the month of week or day ticks, the day of hour ticks, `HeatmapAxis.group` for custom axes) becomes a block of tracks with `--tp-heatmap-group-gap` (default one cell) between blocks; a tick whose keys fall in two groups splits into one tick per group (later parts take their first key's date as id); fit and trim count the spacers; a row step past a split tick continues with the next key (user 2026-11-15: "add the capability for spacing between groups", unreleased so no compatibility) | Widgets §6.9 `uwg-hm-req-grp-1..6`, `uwg-hm-tfg-r0` (0.65.63, `b87b0dfe`) | none | `model.ts` `place` parts, `groupStarts`; `heatmap.ts` `#axisLayout`, `#columnSpacers`, `#groupSpace`, `--_column-tracks`/`--_row-tracks`; recipe `--_group-gap` | API Reference | V-18 | passed | Unit tests (split week Jan 26/Feb 1, day/hour unsplit, custom groups); fixture `#separated`, `#separated-trim` (cells end inside the plot), `#separated-scroll`, `#separated-vertical`; keys Jan 27 → Feb 3, Jan 31 ↓ Feb 1; dark and light |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| G-01 | No heatmap contract and no local reference | Gate 0, all C rows | Spec agent wrote §6.9, §2 and §14.9 from the approved plan | 0.65.50 `2bd8bbaf`, validation 0 issues | passed |
| G-02 | Spec §6.9 said string hints reach the accessible description through the tooltip; axe rejects `aria-description` on gridcells, so hints join the cell's accessible name; the grid role moved to the cells with hidden row headers | C-09, C-14 | Amend §6.9 accessibility and anatomy | Patched at 0.65.51 (`ce62dae6c534b90365208e88fcb333890520cc88`), `uwg-hm-req-a11y-1`, `uwg-hm-req-a11y-2`; `heatmap-grid` part moved to the cells container to match | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/widgets/heatmap/`: `heatmap.ts` (element, lanes, interaction, rendering), `model.ts` (cells, aggregation, ids), `projection.ts` (units, projections, labels), `scale.ts` (levels), `types.ts`, `strings.ts`, `styles.ts` (structure), `index.ts`
- Supported exports / registration / constituent API impact: widget catalog tuple, `src/widgets/index.ts`, `src/register/widgets.ts`, `widgetPresentationFamilies`; Foundation calendar exports added; `CalendarAdapter.monthLabel` optional; `CalendarSelectionRequest.adapter` and the value functions take `CalendarSelectionOrder` (a `CalendarAdapter` satisfies it)
- Framework bindings: regenerated with `npm run cem` (React/Vue `heatmap` bindings, tag types); lane row in `tests/fixtures/frameworks/lanes.ts`; React and Vue lane and smoke passed; ledger row `tp-heatmap` passed
- Public vocabulary / tokens / parts / presentation review: parts `heatmap*`; markers `data-level`, `data-empty`, `data-today`, `data-selected`, `data-range-*`, `data-disabled`, `data-focused`; lanes `tp-value-change`/`tp-value-commit`; `tp-inspection-change` as Plot; policy names as Calendar

### Family dependency map

| Responsibility | Reference dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ---------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Date model and arithmetic | none (library-original) | `src/foundation/calendar.ts` `CalendarAdapter`, `gregorianCalendarAdapter` | Reused unchanged; `monthLabel` added | Calendar, Heatmap / V-11 |
| Week start and minimal days | none | Calendar `#resolvedWeekStart`, `#minimalWeekDays` | Extracted to `resolveWeekStart`, `localeWeekInfo`; Calendar delegates | Calendar, Heatmap / V-11 |
| Month and weekday labels, label fit | none | Calendar `#monthLabel`, weekday ResizeObserver | Extracted to `calendarMonthLabel`, `LabelFit`; Calendar delegates | Calendar, Heatmap / V-03, V-11 |
| Week bounds, week enumeration | none | Calendar Home/End offsets, `calendarGridDates` | `startOfWeek`, `calendarWeeks`; `calendarGridDates` built on it | Calendar, Heatmap / V-11 |
| Grid key commands | none | Calendar `#dayKeyDown` | `gridKeyMove` shared; spatial walks `stepGridCell`, `rowEdgeCell` | Calendar, Heatmap / V-08, V-11 |
| Selection policy | none | `calendarSelectionProposal` | Generalized over `CalendarSelectionOrder` | Calendar, Heatmap / V-09 |
| Tooltip for many targets | none | Data visualization state-driven `tp-tooltip` | Same pattern: `.anchor`/`.open` | Heatmap / V-07 |
| Scrolling and edge shadows | none | `tp-scroll-area` `scroll-edge-fade` | Reused | Heatmap / V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | ------------------------------- | ------------ |
| Cells, legend swatches | library theme | user reference images (layout only) | `recipes/heatmap.ts`, `--tp-muted` empty, theme roles | OKLab mix ramp; no literal colors | V-05, V-06 |
| Focus and selection rings | library theme | — | `recipes/shared/focus.ts` `focusRing` | Selected cells outlined in the foreground | V-08, V-09 |
| Labels and legend text | library theme | — | muted foreground, `--tp-text-xs`/`sm` | Size axis scales text | V-05 |
| Scroll edges | library theme | — | Scroll area edge fade | Reused | V-04 |
| Loading | library theme | — | Skeleton pulse cadence (`ambientCss`) | Cells pulse at level 0 | V-06 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Widget internals | tooltip | `tp-tooltip` | V-07 | none |
| Widget internals | scroll region | `tp-scroll-area` | V-04 | none |
| Widget internals | cells, labels, legend swatches | native spans in the shadow root | V-01, V-10 | Hundreds of passive cells; a host per cell (Button) would cost a component each; cells are the grid's own gridcells with one roving tab stop |
| Docs, stories, fixture | readout | native `output` | V-09 | native live readout, as other pages use |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| ---- | ---------------------------------- | --------------- | --------------- | ------------- | ------------------------- | ------ | ------------------- |
| V-01 | C-01, C-02; visual | Story Default and fixture `#year` | 53 week columns, 7 weekday rows, partial last week, month labels | as expected | screenshots `run1/fixture-dark.png` | passed | Observed in Chrome 2026-11-13 |
| V-02 | C-01, C-02, C-03; unit | `tests/unit/widgets/heatmap/model.test.ts` | projections, gaps, aggregation, wrap, custom, levels | 12 tests pass | vitest | passed | Observed: 12 tests pass |
| V-03 | C-02, C-08; visual | Story Vertical, fixture `#vertical` at 18rem | months by day; no Feb 29–31; narrow J F M labels | as expected | screenshots, evaluate `data-narrow` | passed | Observed in Chrome 2026-11-13 |
| V-04 | C-06, C-07; API + visual | Fixture `#scroll`, `#scroll-vertical`, `#trim`; `heatmapAPI.scroll`, `append`, user scroll then data change | opens at `maxLeft`/`maxTop`; stays pinned after append; keeps a user position; trim ends at today | `left` 568 of 568, `top` 643 of 643; pinned after append; left 0 kept; trim last `2026-11-13` | DevTools evaluate, screenshots | passed | Observed in Chrome 2026-11-13 |
| V-05 | C-04, C-05, C-08, C-15; visual | Stories Sizes, Shapes and colors, Weekdays by hour, Custom axes | sizes xs…lg, circles and squares, theme colors, labels | as expected | screenshots | passed | Observed in Chrome 2026-11-13 |
| V-06 | C-04, C-13; visual | Light scheme on Vertical; fixture `#loading` | readable ramp in light; pulsing level-0 cells | as expected | screenshots | passed | Observed in Chrome 2026-11-13 |
| V-07 | C-09, C-12; real input | Hover a cell in the Default story | tooltip with value and full date | "4 on Sunday, November 23, 2025" | DevTools hover, screenshot | passed | Observed in Chrome 2026-11-13 |
| V-08 | C-10; real keys | Click Nov 23, ArrowRight, ArrowDown, PageDown | Nov 30, Dec 1, Jan 1; one tab stop | active `2026-01-01`, single `tabindex=0` | DevTools press_key + evaluate | passed | Observed in Chrome 2026-11-13 |
| V-09 | C-11, C-12; real input | Story Selection: click Oct 5 then Oct 14 | range committed, middle cells marked | `{"from":"2026-10-05","to":"2026-10-14"}` | DevTools click, screenshot | passed | Observed in Chrome 2026-11-13 |
| V-10 | C-14; accessibility | Fixture snapshot; injected axe | grid, row headers, named cells; no violations | 0 component violations (page lacks an h1) | DevTools snapshot `run1/snapshot.txt`, axe | passed | screen readers not tested |
| V-11 | C-16; unit + regression | Calendar unit tests; `date-grid-services.test.ts`; full vitest | unchanged Calendar behavior; services correct | all pass (6399 tests) | vitest | passed | Observed |
| V-13 | C-06, C-07; resize | Default story at 640, 1200 and 800 px wide | narrow: scroll layout at the latest data with the start edge shaded; wide: stretched cells filling the width, no Scroll area | 640: `data-scroll`, viewport 216 of 216, fade; 1200: no Scroll area, cells 18 px to the host edge; 800: scroll at 56 of 56 | DevTools resize_page + evaluate, screenshot | passed | Observed in Chrome 2026-11-14 |
| V-14 | C-09; real input + rAF sampling | Default story: hover a cell, leave the grid, sample the tooltip popup each frame (user 2026-11-14: "white squares after tooltip hides") | the closing tooltip keeps the last cell's text and size | before: an empty 24×12 popup faded out; after: 208 px with "1 on Saturday, November 22, …" until hidden | DevTools hover + evaluate | passed | `#tooltipId` keeps the last cell while closing |
| V-15 | C-09, C-10; performance | Default story, 371 cells: 30 pointerover inspections timed to `updateComplete`; a data replacement | inspection does not render the cells | median 6.40 → 1.00 ms (max 14.2 ms, the tooltip's first mount); data rebuild 6.2 ms | DevTools evaluate | passed | cells guarded by their inputs; hover marker, tab stop and focus moved on the existing elements; layout reads skipped on inspection-only updates |
| V-16 | C-08, C-11, C-15; visual | Story Selection: range Feb 7–27; row labels in LTR and with `dir="rtl"` (user 2026-11-14: "make the border inner to each cell", "y axis text aligned to the right (when in the left) and the opposite for the other edge") | an inner ring per selected cell keeping the gaps; row labels flush against the cells on either side | inset ring, gaps intact; LTR labels end 4 px (the padding) from the cells, RTL labels start against the cells | DevTools evaluate + screenshot | passed | Selection is an inset `box-shadow`, so the focus outline stays independent |
| V-17 | C-17, C-18; real input | Default story with `legend-filter` and multiple selection: press levels 3 and 4, select a cell; Selection story: select a range, click the output below | grid filtered to levels 3–4, legend toggles pressed; outside click clears the selection | filter [3, 4], 48 cells kept; `tp-value-change` undefined with `outside-press`, 0 selected | DevTools click + evaluate, screenshot | passed | Observed in Chrome 2026-11-14; layout inside the docs' flex wrapper fixed by `contain: inline-size` on the plot |
| V-12 | C-11; frameworks | React and Vue `lane('tp-heatmap')`, `smoke(0, 300)` | lane round-trips; every binding mounts | lane passed in both; smoke 211/211, no Heatmap diagnostic (rerun 2026-11-14 after the level filter lane) | framework fixtures | passed | Ledger row `tp-heatmap` passed |

## Early integration checkpoint

| ID   | Check | Status | Evidence / unresolved finding |
| ---- | ----- | ------ | ----------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Calendar imports `resolveWeekStart`, `localeWeekInfo`, `todayCalendarDate`, `calendarMonthLabel`, `startOfWeek`, `matchesCalendarDate`, `LabelFit`, `gridKeyMove`; its private copies (`localCalendarDate`, `moduloCalendar`, week info, weekday observer) are gone |
| I-02 | Default visual regions match traced source and shared library recipes | passed | Default story compared with the GitHub-style reference image; cells, labels, legend, tooltip from library recipes |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | `fit`, `size`, `shape`, `color`/`colors`, label modes, `legend`, `tooltip`, `selection-mode` exercised independently (V-03..V-09) |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| ---- | ------ | --------------------------------------- |
| 0. Sources and scope | passed | Widgets §6.9, §2 and Foundation §14.9 committed at 0.65.50 and patched at 0.65.51; scope from the approved plan and the user decisions of 2026-11-13 |
| 1. Capability mapping | passed | C-01..C-16 mapped to the spec, implementation, docs and scenarios; G-02 records the hint wording difference |
| 2. Architecture and composition reuse | passed | Calendar date logic extracted to Foundation and consumed by both; Tooltip and Scroll area reused |
| 3. Behavior | passed | V-02, V-04, V-07, V-08, V-09, V-11 |
| 4. Presentation and customization | passed | Size and shape axes, `--tp-heatmap-*` hooks set on the host win over private defaults |
| 5. Accessibility | passed | V-10 (snapshot, keyboard, axe); no screen reader run |
| 6. Visual and interaction inspection | passed | V-01, V-03..V-06 |
| 7. Documentation and demo reuse | pending | `check-docs.mjs widgets/heatmap` passes; the Storybook docs page and the website rendering were not read |
| 8. Regression and reconciliation | passed | Full vitest, typecheck, lint, ledger check; React and Vue lane and smoke (V-12) |

## Documentation synchronization

- [x] `docs/widgets/heatmap.mdx` follows the tweakpad-docs skill; `check-docs.mjs widgets/heatmap` passes; the story renders it with `libraryDocs()`.
- [x] JSDoc covers the element summary, every public field and method, slots, events and CSS properties; parts carry a description in the family.
- [x] `elementDependencies` lists Tooltip and Scroll area.
- [x] Verification fixtures are separate from the page (fixture and `!autodocs` stories).
- [x] Rendered and copyable previews reuse existing components.
- [x] Preview code works outside Storybook: scripts set `data` and `messages` only.

## Completion / handoff

- Change summary: new `tp-heatmap` widget on a projection model (any unit, any arrangement), with levels, colors, sizes, shapes, fit modes, labels, tooltip with dataset hints, keyboard, optional selection; Calendar date logic moved to shared Foundation services
- Actual delivery claim: the widget as verified above; docs rendering not yet read
- Record checker: see the run after this record
- Non-browser checks: `npm run typecheck` (with every framework), `npm run lint`, full vitest (6399 passed), `npm run build`, `npm run size:report`, `check-docs.mjs widgets/heatmap`, `check-ledger.mjs`
- Behavior: V-02, V-04, V-07..V-09
- Accessibility: V-10
- Visual/customization/motion inspection: V-01, V-03..V-06
- Documentation and demo composition reuse: docs checker passes; rendering not read
- Shared-consumer regressions / package boundaries: Calendar unit tests pass; Calendar story keyboard checked in Chrome (June 17 → ArrowDown 24 → End 27 → ArrowLeft 26 → PageUp May 26) and weekday labels unchanged; Calendar fixtures not rerun in full
- Required failures or blocked checks: gate 7 needs the website rendering read and the Storybook API Reference read on a static build (the running dev Storybook predates the manifest)
- Older out-of-scope gaps: none known
- Changed source revisions / reopened gates: none
