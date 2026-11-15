# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Data view, `tp-data-view` (`TpDataView`), catalog kind `flattening-compound`, exported from `@tweakpad/ui` with `sortDataViewRows`, `compareCellValues`, `nextSort` and its types.
- Requested work / claim: complete new base component: compact, read-only, flat data with stable identities, configurable columns, a bounded scrolling viewport, fixed-height row virtualization, accessible navigation, single-column sorting, optional single-row selection, loading/empty/error states, a small renderer contract and styling hooks.
- Scope source: user request of 2026-11-15 and the approved plan `/Users/vanrez/.claude/plans/pasted-content-id-8ac7-we-want-lazy-neumann.md` (local sorting by default with `sorting="manual"`; configurable `navigation` cell/row). Filters, search, pagination, persistence, actions, row-source protocols, editing, multi-range selection, trees, grouping, pivoting and remote caches are out of scope by the request.
- In-scope changes and existing gaps: new component folder, presentation family and recipe, shared `recipes/shared/table-surface.ts` adopted by Table (generated CSS unchanged), docs page, stories, sample module, fixture, workspace audit log, framework lane row, ledger row, changeset.
- Repository baseline / unrelated changes: `bf328c59` plus the uncommitted image editor work of this session.
- Live project / document IDs and revisions: Spec Blocks project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`; Component Library `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3` read at head `23c5c6179e5ecfe70d002ded8b3c1b441d9eba63`: Table §22.21 (`ucl22-table`, `audit-table-no-grid`), Tree view §20.7 (records mode, virtualization, `renderItem`, messages). Foundation virtual list §19.24, grid navigation §14.9. New Data view section: Issue S-01 (committed v0.67.0).
- Owning contracts / dependencies / vocabulary: Component Library Data view (S-01); Foundation virtual list, grid navigation, ControllableState, change-reason registry, LiveAnnouncer, scrollable edges.
- Local reference evidence: no data grid exists in the local reference checkouts; the user's screenshots show the control kind only and were not reproduced.
- Tool readiness: direct Spec Blocks MCP tools available; Chrome DevTools MCP available.
- Browser / server / build under test: Chrome via DevTools MCP; Vite dev server `http://localhost:5173` (fixture, framework fixtures); Storybook `http://192.168.1.155:6006`.
- Evidence directory: `tmp/component-verification/data-view/2026-11-15/`
- Durable verification fixtures / served URLs: `tests/fixtures/components/data-view/index.html`; standalone fixture entry `TpDataView`.
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | `rows` (application array, never mutated) and `getRowId` (default `row.id`); duplicate/missing ids diagnosed with unique fallbacks | S-01 | `src/components/tree-view/tree-view.ts` `getItemId` (precedent) | `columns.ts` `rowIdentities`, `#prepareRows` | Usage | V-01, V-02 | passed | unit tests; fixture loads 10,000 rows |
| C-02 | `columns`: id, header, value, format, render, width (default `minmax(8rem, 1fr)`), align, sortable, compare, rowHeader | S-01 | none | `columns.ts`, `#renderRow`, `#renderHeader` | Usage, Custom cells | V-01, V-03 | passed | Badge and link renderers in stories and fixture |
| C-03 | Renderer contract `render(row, cell)` with value, text, selected, focused; interactive content out of the tab order, reached with Enter, left with Escape | S-01 | Tree view `renderItem` | `#renderRow`, `contentTarget`, `firstInteractive`, `updated()` tabindex | Custom cells | V-03 | passed | real Enter/Escape in `#links` |
| C-04 | Bounded viewport, header above the row scroller following it sideways, shared column tracks, horizontal scroll | S-01 | `src/components/table/table.ts` scroller | `styles.ts`, `NativeScrollEdges` | Usage | V-04 | passed | `#wide` 736 of 420 px scrolls; header stays at top |
| C-05 | Fixed-height virtualization (`size`, `--tp-data-view-row-height`, `overscan` 4) with focus pinning | Foundation §19.24 | `src/foundation/virtual-list.ts` `VirtualList` | `#virtual`, `slots(pinned)`, `setKeys` on height change | Many rows | V-02 | passed | 10,000 rows, 12–17 mounted; Ctrl+End to the last row |
| C-06 | Sort lane `sort`/`defaultSort` (`tp-sort-change`, cancelable), cycle ascending → descending → none, announced | S-01 | none | `#sortState`, `nextSort`, `LiveAnnouncer` | Sorting | V-05 | passed | header click/Enter; "Sorted by …" announced |
| C-07 | `sorting` local (default) / manual; helper `sortDataViewRows` stable, numeric collation, values by type, empties last, column compare | S-01 | `src/foundation/intl.ts` `collator` | `sort.ts` | Sorting | V-05, V-06 | passed | unit tests; `#manual` owner reorders |
| C-08 | Selection lane `value`/`defaultValue` with `selectionMode` none/single; press/Space selects, Ctrl/Cmd clears; `metadata.row` | S-01 | Tree view selection lane | `#valueState`, `#select` | Selection and activation | V-07 | passed | controlled owner rejects offline rows |
| C-09 | `tp-row-activate` on Enter or double click | S-01 | none | `#activate` | Selection and activation | V-07 | passed | fixture events |
| C-10 | `navigation` cell (default) / row; gridKeyMove keys incl. RTL, Home/End, Ctrl+Home/End, PageUp/PageDown; header reach in row mode | Foundation §14.9 | `src/foundation/grid-navigation.ts` | `navigation.ts`, `#keydown` | Keyboard | V-08 | passed | unit tests; real keys in both modes |
| C-11 | Focus kept by row and column identity across sorts; fallback to the nearest row when removed | S-01 | Tree view tab stop | `#tabStop`, `#lastFocusIndex` | Usage | V-09 | passed | fixture: focus after sort, removed row |
| C-12 | `loading` (skeleton rows; busy grid with a Progress bar), empty (slot `empty`), `error` (slot `error`, Retry → `tp-retry`) | S-01 | Tree view status rows, color palette states | `#renderState`, `#renderSkeleton` | Loading, empty and error | V-10 | passed | States story and fixture |
| C-13 | Accessibility: grid, aria-readonly, rowcount/rowindex, colcount/colindex, columnheader/rowheader/gridcell, aria-sort, aria-selected, aria-busy | S-01 | none | render | Keyboard | V-11 | passed | snapshot; axe 0 violations |
| C-14 | Presentation: parts, markers, size axis, hooks, Table's shared look | S-01 | `src/presentation/recipes/table.ts` | family, recipe, `shared/table-surface.ts` | Properties, API | V-12 | passed | light and dark compared with tp-table |
| C-15 | Methods `focusRow`, `scrollToRow`, `sortBy`, `selectRow`; getter `visibleRowIds`; `messages`, `label` | S-01 | Tree view methods | public API | API Reference | V-09, V-05 | passed | fixture calls |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-01 | No Data view section; Table forbids interactive grid behavior (`audit-table-no-grid`) | all C-IDs | Add the Data view section beside Table as the complete grid behavior contract | Committed: Component Library `ucl22-data-view` (requirements `ucl22-dv-q-*`), coverage row `ucl22-dv-coverage-row`, Foundation B.8.3 row `ucl22-dv-b83-row`; v0.67.0 head `92918c09`; Progress bar loading indicator and `data-status` marker amended in v0.67.1 head `0bdf8f63`; header outside the row scroller amended in v0.67.2 head `3c49eae5` | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/components/data-view/` — `data-view.ts` (element, lanes, focus, render), `navigation.ts` (pure focus model), `sort.ts` (helper), `columns.ts` (tracks, accessors, identities), `messages.ts`, `types.ts`, `styles.ts`, `index.ts`.
- Supported exports / registration / constituent API impact: `src/catalog.ts`, `src/components/index.ts`, `src/register.ts`, `src/presentation/families/index.ts`; Table recipe now composes `shared/table-surface.ts` with byte-identical generated CSS (shared-sets golden).
- Framework bindings: regenerated with `npm run cem`; lane `tp-data-view` passes in the React and Vue fixtures, smoke 213/213 in both; ledger row added and `check-ledger.mjs` passes.
- Public vocabulary / tokens / parts / presentation review: parts `data-view*`; tokens `--tp-data-view-row-height`, `--tp-data-view-header-height`; size axis `sm`/`default`/`lg`.

### Family dependency map

| Responsibility | Reference dependency path / symbol         | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Virtual window | Foundation §19.24 | `src/foundation/virtual-list.ts` `VirtualList` | Reused with a fixed estimate and unobserved rows; `setKeys` again when the measured height changes | Tree view, Select, color palette, data view / V-02 |
| Grid keys | Foundation §14.9 | `src/foundation/grid-navigation.ts` | Reused `gridKeyMove`, `stepGridCell`, `rowEdgeCell`; row mode is data-view specific | Calendar, heatmap, data view / V-08 |
| Lanes | ControllableState | `src/foundation/controllable-state.ts` | Reused; sort lane names its event `tp-sort-change` | V-05, V-07 |
| Scroll edges | Scrollable / NativeScrollEdges | `src/components/shared/scroll-edges.ts` | Reused as Table does, header protected | V-04 |
| Announcements | LiveAnnouncer | `src/foundation/announcer.ts` | Reused for sort announcements | V-05 |
| Tabular look | Table recipe | `src/presentation/recipes/table.ts` | Extracted to `shared/table-surface.ts`, used by both | Table golden, data view / V-12 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Header, cells, rows | Table | `recipes/table.ts` cells, header, row hover, selected | `shared/table-surface.ts` | Same tokens; fixed heights from the size axis | V-12 |
| Sort indicator | Icons | `src/icons/sort.ts` (`sortIcon`, `sortAscendingIcon`, `sortDescendingIcon`) | `tp-icon` | Muted until active | V-05 |
| Empty / error | Empty state | `tp-empty-state`, `tp-button` | library components | Error adds the alert icon and Retry | V-10 |
| Loading | Skeleton, Progress | `tp-skeleton`, `tp-progress` | library components | Indeterminate bar on the header edge so no header text is covered | V-10 |
| Focus | focus recipes | `shared/focus.ts` `insetFocusRing` | inset ring | none | V-08 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Status cells (stories, docs) | badge | `tp-badge` | V-03 | none |
| Error state | action | `tp-button` | V-10 | none |
| Empty/error state | layout | `tp-empty-state` | V-10 | none |
| Loading | placeholders, progress | `tp-skeleton`, `tp-progress` | V-10 | none |
| Fixture `#links` | link | native `a` | V-03 | Deliberate: renderer interoperability with plain links |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01, C-02; unit | `tests/unit/components/data-view/columns.test.ts` | tracks, values, text, identities | pass (two-pass identities fixed a fallback collision) | vitest | passed | Unit run of the pure module |
| V-02 | C-05; behavior | `#many` 10,000 rows; Control+End, PageDown | mounted ≈ visible + overscan; last row reached | 12–17 mounted; aria-rowindex 10001 focused at max scroll | DevTools real keys + evaluate | passed | Real keys in the RowNavigation story |
| V-03 | C-02, C-03; real input | `#links`: click a link; Enter on the link cell; Escape | no selection; focus into the link; back to the cell | value unchanged; focus `a`; focus cell `open` | DevTools click/press_key | passed | Link click followed its href as intended |
| V-04 | C-04; visual | `#wide` 420 px; scroll both axes | header pinned, columns scroll | header top 0 at scrollTop 64; scrollWidth 736 | screenshot | passed | Inspected at rest after scroll |
| V-05 | C-06, C-07, C-15; behavior | header clicks and Enter; `#manual` owner | cycle, aria-sort, announcement, manual order | announced "Sorted by Station, descending"; manual first row reordered by owner | DevTools + evaluate | passed | Header Enter by real key in row mode |
| V-06 | C-07; unit | `sort.test.ts` | stability, collation, types, empties last, comparator, no mutation | pass | vitest | passed | Frozen input array |
| V-07 | C-08, C-09; behavior | `#controlled`: offline row press, online row press | offline refused, online accepted; activation events | value kept st-0001, then online id | evaluate | passed | Synthetic clicks on cells |
| V-08 | C-10; real input + unit | both modes: arrows, Home/End, Ctrl+Home/End, PageUp/PageDown, Up to headers | moves per mode | real keys pass; `navigation.test.ts` pass | DevTools press_key; vitest | passed | RTL mirroring from unit tests and visual check |
| V-09 | C-11, C-15; behavior | focus a cell, re-sort; remove the focused row | focus kept by id; next row takes the stop | kept (row and column); st-0004 after st-0003 removed | evaluate | passed | Scripted focusRow |
| V-10 | C-12; visual | States story and fixture | skeleton, progress bar, empty, slot, error with Retry | all rendered; Retry fired `tp-retry` | screenshots + evaluate | passed | Progress bar replaced the Spinner after it covered header text |
| V-11 | C-13; accessibility | snapshot and axe on the fixture | roles and names; no violations | axe 0 violations | take_snapshot + axe-core | passed | No screen-reader run |
| V-12 | C-14; visual | light and dark, sizes, beside tp-table | Table's look | matching dividers, header weight, hover and selected fills; Table golden unchanged | screenshots + shared-sets test | passed | Light Default story and dark fixture inspected |
| V-13 | C-01–C-15; regression | `npm test`, lint, typecheck, build, size report, docs check | pass | 469 files / 6474 tests pass; lint, typecheck, build, size report pass; `check-docs.mjs components/data-view` passes after a JSDoc fix | commands | passed | A convention test renamed the state marker to `data-status` |
| V-14 | C-04, C-10; regression (user report) | Scroll rows with the header pinned; overlay and forced classic scrollbars; sideways scroll; wheel over the header; End on the header of a scrolled view | scrollbar never over the header; columns aligned; header follows rows | scroller starts at the header's bottom edge; column edges equal (overlay and 12 px classic gutter); head and rows scrollLeft equal; header wheel scrolled rows 200 px; End revealed Status with both at 316 px | evaluate + real keys + screenshot | passed | Fixed: the header moved out of the scroller (it was sticky inside it, so the vertical scrollbar covered it) |
| V-15 | C-04, C-14; behavior (user request) | `scroll-edge-fade` default, `="false"`, attribute removed | fades on by default, off with false, back on when removed | masks present/absent/restored | evaluate + screenshot | passed | `willUpdate` restores the reflected attribute |
| V-16 | C-06, C-14; visual (user request) | sort indicator unsorted, ascending, descending | one chevron per direction, normalized size, vertically centered | `src/icons/sort.ts`; centered paths; screenshot at rest | screenshot | passed | Selector at 0.6 opacity when unsorted |
| V-17 | C-14; visual (user request) | shared tabular rule on `#many`, `#rows` (striped, grid), `#flat` (flat region), Table fixture with striped/grid in default and flat | header muted, sorted chevron foreground (label stays muted, user request), cells foreground; stripe < hover < selected; flat clears lines with no seams | header rgb(161,161,170), sorted chevron rgb(250,250,250), cells rgb(250,250,250); flat lines transparent; no seam in flat stripes or hover; Table layout checks pass; golden updated for the intended change | evaluate + screenshots + `tableLayout.*` | passed | Fixed during review: collapsed borders left a seam in flat rows (Table now separate borders), transparent zero-use lines notched row lines (unused lines are zero width), footer line moved to the body's last row |
| V-18 | C-10, C-13; real input (user request) | `#many` Station header action: ArrowUp to header, Alt+ArrowDown, Enter, Escape, Escape, Tab | focus on trigger, menu opens, back to trigger, back to header, Tab leaves the grid | `station-actions` focused; menu open; header focused; next view focused | DevTools press_key | passed | Fixed: the scroller was a tab stop while the roving stop sat on a header (now tabindex -1); slot is the flex item since Menu is display: contents |
| V-19 | C-01–C-15; regression | `npm test`, lint, typecheck, `npm run cem`, docs check, Storybook docs page | pass | 469 files / 6474 tests; lint and typecheck clean; bindings regenerated; docs check passes; Column actions preview renders with the menu at the far end | commands + DevTools on Storybook | passed | Static Storybook not rebuilt |
| V-20 | C-04; visual + behavior (user request) | `#telemetry` 14 columns in a 1100 px page; `sticky-start-columns=1`, `sticky-end-columns=1`; scroll sideways; RTL `#rtl` with pins | view scrolls inside its box; pinned cells stay with fills; boundary lines while scrolled past; header follows | page no longer widened (host `contain: inline-size`); head/rows scrollLeft equal; `data-overflow` start/end; RTL start pin at the right edge, end at the left, 1px lines | evaluate + screenshots | passed | Fixed: 14 columns widened the page before containment |
| V-21 | C-10; real input | Home/ArrowRight/End/ArrowLeft across pinned columns; Enter on the pinned Open cell | revealed cells clear of pinned columns; Enter moves into the button | region left = station pin right (258 px); lastReading right < end pin left; focus on `tp-button` | DevTools press_key | passed | Telemetry fixture, cell navigation |
| V-22 | C-14, C-15; customization (user request) | telemetry middleware (units, search `text` layer with css, filtered empty), part contracts (offline row, low battery, firmware), `::part(data-view-cell-region)` | layers compose around built-ins; renderText reaches renderers; css adopted; contracts style by state; per-column part from document CSS | marks in Station renderer, themed by layer css; empty state with working Clear; italic region; unit headers keep indicator | evaluate + real click + screenshots; `middleware.test.ts` | passed | Story `Customized` and docs previews checked in Storybook |
| V-23 | C-04; regression (user report) | horizontal scroll with pinned columns; mask sampled in the scroll's own frame | no clipped pinned cells mid-scroll | every pinned cell inside the mask region at each delta (both pins, RTL single pin) | evaluate | passed | Fixed: fades lagged a frame and clipped pinned cells; pinned edges no longer fade; shared mask sides without a band reach the content edge |
| V-24 | C-04; behavior (user request) | vertical rubber band on the rows scroller | none | `overscroll-behavior-y: none` computed | evaluate | passed | Trackpad overscroll not drivable through DevTools; user to confirm |
| V-25 | C-13; accessibility + regression | axe on the fixture; render cost of a full window swap; full suite | 0 violations; budget | axe 0 (scroller now role rowgroup); 1.8 ms median / 5.3 ms max for 12×14 cells; 470 files / 6484 tests; lint, typecheck, docs check pass | axe-core + evaluate + commands | passed | Render cost measured in dev mode |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | VirtualList, gridKeyMove, ControllableState, NativeScrollEdges, LiveAnnouncer imported; Table and data view both compose `shared/table-surface.ts` |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | Default story beside Table: same dividers, header weight and fills |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | sorting, selection, navigation, size and states are independent; V-02–V-10 |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed  | Spec head read; Table's no-grid rule; approved plan; S-01 tracks the new section. |
| 1. Capability mapping                 | passed  | C-01–C-15 mapped. |
| 2. Architecture and composition reuse | passed  | Maps above. |
| 3. Behavior                           | passed  | V-01–V-10. |
| 4. Presentation and customization     | passed  | V-12; size axis and hooks. |
| 5. Accessibility                      | passed  | V-11; real keyboard V-08. |
| 6. Visual and interaction inspection  | passed  | V-04, V-10, V-12 in both schemes, RTL and narrow views. |
| 7. Documentation and demo reuse       | passed  | `check-docs.mjs components/data-view` passes; Storybook docs read: every section and all six previews render. Website rendering not read. |
| 8. Regression and reconciliation      | passed  | V-13; React and Vue lane and smoke 213/213; ledger check passes; Table golden unchanged. |

## Documentation synchronization

- [x] `docs/components/data-view.mdx` follows the tweakpad-docs skill; `check-docs.mjs components/data-view` passes; the story renders it with `libraryDocs()`.
- [x] JSDoc covers the element summary, every public field and method, slots, events and CSS properties; parts carry a description in the family; `npm run build` reports no undescribed row.
- [x] `elementDependencies` is complete (`TpButton`, `TpEmptyState`, `TpIcon`, `TpProgress`, `TpSkeleton`).
- [x] Verification fixtures are separate from the page.
- [x] Rendered and copyable previews reuse existing components.
- [x] Preview code works outside Storybook: previews set `columns` and `rows` from a script.

## Completion / handoff

- Change summary: new `tp-data-view` (read-only virtualized grid with sorting, selection, states and a renderer contract), the exported sort helper, a shared table surface used by Table and Data view, docs, stories, fixture and a workspace audit log.
- Actual delivery claim: complete component as scoped by the request, verified in Chrome (desktop) and by unit tests.
- Record checker: `check-gates.mjs --stage complete` (see the final run).
- Non-browser checks: `npm test` 6474 passed; lint, typecheck, build, size report, docs check and ledger check pass.
- Behavior: V-01–V-10 passed
- Accessibility: V-11 passed
- Visual/customization/motion inspection: V-04, V-10, V-12 passed
- Documentation and demo composition reuse: docs page and stories read in Storybook; workspace Activity page has the audit log.
- Shared-consumer regressions / package boundaries: Table golden unchanged; bindings verified
- Required failures or blocked checks: none known
- Older out-of-scope gaps: none known
- Changed source revisions / reopened gates: none
