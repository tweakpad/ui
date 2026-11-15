# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: File explorer, `tp-file-explorer` (`TpFileExplorer`), catalog kind `flattening-compound`, shipped through `@tweakpad/ui/widgets` and `@tweakpad/ui/register/widgets` only; headless data layer as the companion entry `@tweakpad/ui/file-explorer` (`src/foundation/file-explorer/`).
- Requested work / claim: complete new widget for file systems: folders and files with custom columns; single and multiple selection, drag to move, a status bar; a column (path) view; decoupled fuzzy search with loading states; a middleware pipeline for listings, metadata (lazy or eager) and search; details, compact, icons, gallery and columns views; sort and visible columns; restricted presets (single folder, read only, rename only, permissions, hidden files); any mix of client, server and browser sources.
- Scope source: user request of 2026-11-15 and the approved plan `/Users/vanrez/.claude/plans/pasted-content-id-8ac7-we-want-lazy-neumann.md` (tiles in Data view as `layout="grid"`; gallery and details pane; companion entry; inline rename, drag move, create and delete, OS-file upload). The user's screenshots illustrate use cases only: no design, data or naming is taken from them.
- In-scope changes and existing gaps: new widget folder, companion data layer, presentation family and recipe, file and layout icons, docs page, stories, workspace Browse tab, fixture; Data view gains multiple selection, a checkbox column, hidden header, grid layout with the `tile` hook and a row drag hook (record `plans/components/data-view/implementation-checklist.md`); Tree view gains `dragAndDrop` external drop targets and starts initial loads before the first render.
- Repository baseline / unrelated changes: `8e905ac8` on `development`; another session may commit in this tree; unrelated changes preserved.
- Live project / document IDs and revisions: Spec Blocks project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`; UI Widgets Specification `doc_0d98facc-5a5d-4de2-bccb-7317abea0b9f` and Component Library (Data view, Tree view) read at v0.73.0 head `adee355e`; implementation deltas sent for a patch amendment (S-02).
- Owning contracts / dependencies / vocabulary: Widgets §5 shared widget contracts and the new File explorer section; Component Library Data view and Tree view; Foundation ControllableState, drag-and-drop manager, text index search, live announcer.
- Local reference evidence: no widget reference implementation exists for this widget under `../specification/external/` (S-01).
- Tool readiness: direct Spec Blocks MCP tools (through the background spec agent); Chrome DevTools MCP available.
- Browser / server / build under test: Chrome via DevTools MCP; Vite dev server `http://localhost:5173` (fixtures, framework fixtures); Storybook `http://192.168.1.155:6006` (the user's).
- Evidence directory: DevTools MCP screenshots and evaluate results in the session of 2026-11-15 (not kept as files).
- Durable verification fixtures / served URLs: `tests/fixtures/widgets/file-explorer/index.html` (`#full`, `#picker`, `#slow`); stories `Widgets/File explorer`; workspace Files › Browse.
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | Data layer: `FileSource` with any subset of list, path, metadata, search, rename, move, createFolder, remove, upload, thumbnail; abort signals; `createFilePipeline` runs `[...layers, source]` with `next` | File explorer section | none (S-01) | `src/foundation/file-explorer/pipeline.ts`, `types.ts` | Usage | V-01 | passed | 12 unit tests (pipeline order, `next`, abort, supports) |
| C-02 | Built-in layers: cache (per folder, in-flight sharing, invalidation on mutations, `refresh`), metadata (lazy batched with a concurrency cap, or eager), fuzzy search (fallback/always, scope, walk limit, ranges, partial), sort (folders first, numeric collation) | File explorer section | `src/foundation/search/text-index.ts` | `layers.ts` `defaultFileLayers()` | Search, Metadata | V-01, V-06, V-07 | passed | unit tests; lazy metadata asked once for the 9 visible rows in `#slow` |
| C-03 | `createMemorySource`: every operation, unique names per folder, no move into self, recursive remove, upload, latency | File explorer section | none | `memory-source.ts` | Usage | V-01 | passed | unit tests; fixture and samples use it |
| C-04 | Lanes `folder`, `value`, `view`, `sort` with defaults, cancelable `tp-*-change`, `on<Lane>Change` callbacks; `query` property with `tp-query-change` | `uwg-req-134` | `src/foundation/controllable-state.ts` | `#folderState`, `#valueState`, `#viewState`, `#sortState` | Usage | V-02, V-13 | passed | React/Vue lane `view`; fixture events record proposals with reasons |
| C-05 | Layout: path breadcrumb, search, view switcher, resizable sidebar tree (folders only, lazy), main view, details pane, status bar; slots toolbar-start/end, sidebar-start/end, details-actions | File explorer section | `tp-breadcrumb`, `tp-tree-view`, `tp-resizable-panel-group` | `render()` | hero, Views | V-02, V-11 | passed | screenshots dark, light |
| C-06 | Views details, compact, icons, gallery, columns; `views` limits the switcher, the first is the default | File explorer section | `tp-data-view` (`layout="grid"`, `header="hidden"`) | `#renderView`, `#renderColumns` | Views | V-03, V-11 | passed | every view rendered and screenshot; columns keyboard |
| C-07 | Columns: built-in name, size, modified, kind, location (search); application `columns` with `fields` for lazy metadata; `visibleColumns`; sort by header or `sortBy` | File explorer section | Data view sort | `columns.ts`, `#columnsFor` | Views, Metadata | V-03, V-07 | passed | observer column fills lazily; sort header presses |
| C-08 | Selection: single and multiple, checkboxes, Shift/Mod ranges, select all, Escape; status bar counts folders, files, total size and the selection | File explorer section | Data view selection | `#valueState`, status bar | Usage | V-04 | passed | real clicks and keys; status "2009 selected · 115.1 GB" |
| C-09 | Search: fuzzy by default, scope folder/subtree/all, highlighted ranges, Location column, spinner while pending, partial note, Escape clears; a source `search` replaces the client search | File explorer section | `renderHighlighted` | `#runSearch`, `#explorerLayer` text hook | Search | V-06 | passed | typed queries in the fixture; `#slow` shows the spinner |
| C-10 | Rename inline (F2), error keeps the field open and invalid; create folder then rename; delete (Delete, Mod+Backspace); cut and paste move (Mod+X, Mod+V); Alt+ArrowUp parent; all cancelable proposals before the source; `tp-operation-error` | File explorer section | `tp-input` | `startRename`, `createFolder`, `deleteSelection`, `moveEntries`, `#viewKeydown` | Changes, Keyboard | V-08 | passed | real keys; error path shown in the status bar |
| C-11 | Drag move onto folders in the view, the tree and the path, through one manager; OS file drop uploads with per-file progress | File explorer section | `src/foundation/drag-drop/` | `#dragManager`, Data view and Tree view `dragAndDrop`, `#nativeDrop` | Changes | V-09 | passed | pointer drags onto a tree folder and a path segment; upload by a dispatched DragEvent with a real File |
| C-12 | Restrictions: `root`, `operations`, `readonly`, entry `permissions` (lock mark, disabled affordances), `showHidden`; picker preset | File explorer section | none | `supports`, `#allowed` | Changes | V-10 | passed | `#picker`; Instrument manuals lock; hidden cache shown only with `show-hidden` |
| C-13 | Details pane: preview, metadata list, actions slot; empty and multi-selection summaries | File explorer section | `tp-image`, `tp-description-list` | `#renderDetails` | hero | V-11 | passed | screenshots |
| C-14 | Accessibility: named regions, unique path landmark per explorer, grid semantics from Data view, tree semantics, live status | `uwg-req-176` | none | `messages.path(label)` | Keyboard | V-12 | passed | axe clean on every view, both schemes |
| C-15 | Presentation: family parts, theme gaps, no own panel styles; tile size hooks `--tp-file-explorer-tile-size`, `--tp-file-explorer-gallery-tile-size` | `uwg-req-186` | library recipes | `presentation/families/file-explorer.ts`, `recipes/file-explorer.ts` | API Reference | V-11 | passed | dark, light, RTL, 400 px |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-01 | No local reference implementation for a file explorer | all C-IDs | Build from the approved plan and the library's own components; the user's images illustrate use cases only | approved plan | passed |
| S-02 | Spec text written from the plan differs from the shipped API: tree `dragAndDrop` target only; no Data view selected-count message; explorer defaults, lane callbacks, `query`/`visibleColumns` as plain properties, extra methods and keys, pointer-only drag with cut and paste as the keyboard path | C-04, C-10, C-11 | Patch amendment through the spec agent | Spec v0.73.1 head `c9d3ffda` (Data view messages and grid reveal, Tree view `dragAndDrop` target only and `tv-preload`, explorer parts, slots, lanes, callbacks, plain properties, methods, keys, pointer-only drag, path landmark); the tree hover-expansion reason set to `drag` in code and in `tv-external-drop` at v0.73.2 head `0e8299b1` | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/widgets/file-explorer/` — `file-explorer.ts` (element: lanes, layout, views, search, mutations, drag), `columns.ts` (built-in columns), `icons.ts` (`fileIconOf`), `strings.ts`, `styles.ts` (structure), `types.ts`, `index.ts` (re-exports the companion); `src/foundation/file-explorer/` — DOM-free pipeline, layers and memory source.
- Supported exports / registration / constituent API impact: widget catalog, `src/widgets/index.ts`, `src/register/widgets.ts`, `widgetPresentationFamilies`; `package.json` export `./file-explorer`, Vite entry, pack smoke, size report, docs preview modules; Data view and Tree view additions recorded in their own records.
- Framework bindings: regenerated with `npm run cem`; lanes `onFolderChange`, `onValueChange`, `onViewChange`, `onSortChange`; lane row `tp-file-explorer` `view` passes in React and Vue, smoke 214/214 in both; ledger row added.
- Public vocabulary / tokens / parts / presentation review: parts `file-explorer*`; tokens for tile sizes only; every surface reuses Data view, Tree view, Breadcrumb, Input group, Toggle group, Resizable panels, Scroll area, Description list, Image, Empty state.

### Family dependency map

| Responsibility | Reference dependency path / symbol         | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Tabular listing, selection, sort, tiles | Component Library Data view | `src/components/data-view/` | Reused; multiple selection, checkboxes, hidden header, grid layout, row drag hook added to Data view | Data view fixture, explorer / V-03, V-04 |
| Folder tree with lazy loading | Component Library Tree view | `src/components/tree-view/` `loadChildren` | Reused; `dragAndDrop` external targets added; first loads start in `willUpdate` | Tree view tests, explorer / V-02, V-09 |
| Drag between surfaces | Foundation drag and drop | `src/foundation/drag-drop/` `DragDropManager` | Reused; one manager shared by the views, tree and path | V-09 |
| Fuzzy search and highlighting | Foundation search | `src/foundation/search/text-index.ts`, `highlight.ts` | Reused in `fileSearchLayer` and the text hook | V-06 |
| Byte and time formatting | Foundation formatting | `src/foundation/format-bytes.ts`, `tp-time` | Reused | V-04 |
| Middleware pipeline | Flow hooks | `src/foundation/flow/model/hooks.ts` | Same `(request, next)` shape, file-specific operations | V-01 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| `file-explorer-view` rows and tiles | tabular surface | `recipes/data-view.ts`, `recipes/shared/table-surface.ts` | Data view | Tiles use the row fills on a rounded surface | V-03, V-11 |
| `file-explorer-sidebar` | tree | `recipes/tree-view.ts` | Tree view | none | V-11 |
| `file-explorer-column` borders | surface edge | `recipes/file-explorer.ts` `surfaceEdge` | shared line | Column separators only | V-03 |
| `file-explorer-main` drop | drop indication | `recipes/shared/drop-line.ts` `dropInto` | drag indication | OS-file drop over the open folder | V-09 |
| `file-explorer-status` | muted text | theme muted foreground | none | none | V-04 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Toolbar | path | `tp-breadcrumb` | `elementDependencies`; V-02 | Anchors inside the breadcrumb are its documented content |
| Toolbar | search | `tp-input-group`, `tp-input`, `tp-spinner` | V-06 | none |
| Toolbar | view switcher | `tp-toggle-group`, `tp-toggle` | V-03 | none |
| Body | panels | `tp-resizable-panel-group` | V-11 | none |
| Columns view | horizontal scroller | `tp-scroll-area axis="x"` | V-03 | none |
| Details pane | preview and metadata | `tp-image`, `tp-description-list`, `tp-empty-state` | V-11 | none |
| Rename | field | `tp-input` | V-08 | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01, C-02, C-03; unit | `tests/unit/widgets/file-explorer/data-layer.test.ts` | pipeline order, abort, cache, metadata batching, search ranges, memory source | 12 tests pass | `npx vitest run tests/unit/widgets/file-explorer` | passed | Unit run on the DOM-free layer |
| V-02 | C-04, C-05; behavior (real input) | `#full`: click tree folders and path segments, Enter on a folder, Alt+ArrowUp | folder lane proposals with reasons; tree current item follows | proposals recorded in `fileExplorerAPI.events`; tree and path follow | DevTools click/press_key + evaluate | passed | Real clicks and keys |
| V-03 | C-06, C-07; behavior + visual | switch every view; columns view ArrowLeft/Right; sort header press | each view renders; columns open on selection; sort toggles | 4 tiles per row in icons at 583 px; gallery thumbnails; columns keys move between levels; sort cycles | DevTools click/press_key + screenshots | passed | Real input |
| V-04 | C-08; behavior (real input) | click, Shift-click, Mod-click, box, select-all, Shift+Arrow, Escape | selection and status bar follow | status "1 folder · 2008 files · 115.1 GB  2009 selected · 115.1 GB" after select all | DevTools click/press_key + screenshot | passed | Real input |
| V-05 | C-06; behavior | focus `plate-600` in details, switch to gallery | focused tile revealed after the tile measurement | tile at 339–530 inside the 44–530 viewport | evaluate | passed | Layout switch by `setView` |
| V-06 | C-09; behavior (real input) | type queries in `#full` and `#slow`; Escape | highlights, Location column, spinner in `#slow`, Escape clears | as expected | DevTools type_text/press_key + screenshot | passed | Real typing |
| V-07 | C-02, C-07; behavior | `#slow` details with the observer column | skeleton, then values for visible rows only | one metadata call for the 9 visible rows | `fileExplorerAPI.metadataCalls` | passed | — |
| V-08 | C-10; behavior (real input) | F2 rename (commit, Escape, duplicate name error), new folder then rename, Delete, Mod+X / Mod+V | proposals then source changes; error keeps the field open | all paths verified; tree hasChildren refreshed after new folder | DevTools press_key/type_text + evaluate | passed | Real keys |
| V-09 | C-11; behavior | pointer drag a selection onto a tree folder and a path segment; OS-file drop | entries move; upload progress in the status bar | moves applied; upload listed with progress | DevTools drag + evaluate (dispatched DragEvent with a real File for the OS drop) | passed | DevTools cannot drive an OS drag; the drop is synthetic |
| V-10 | C-12; behavior | `#picker`; Instrument manuals; `show-hidden` | restricted affordances; lock mark; hidden entry only when shown | as expected | evaluate + screenshot | passed | — |
| V-11 | C-05, C-13, C-15; visual | dark and light, RTL (columns view), 400 px with body margin 0 | regions align, chevrons flip, no page overflow | dark and light correct; RTL chevrons fixed (`.entry-chevron:dir(rtl)`, a `:host()` rule never matched inside the nested layer CSS); 400 px wraps the toolbar with no overflow | DevTools emulate + screenshots | passed | English status text reorders under bidi in an RTL page, as any unlocalized text does |
| V-12 | C-14; accessibility | injected axe-core on every view, dark and light, with a full selection | no violations | dark run found `landmark-unique` (three explorers named "Breadcrumb"); fixed with `messages.path(label)`; light run: no violations on every view | evaluate with `/node_modules/axe-core/axe.min.js` | passed | No screen-reader run |
| V-13 | C-04; frameworks | React and Vue fixtures: lane `tp-file-explorer` `view`; all 38 lanes; smoke | controlled accept/reject, uncontrolled default, no diagnostics | pass in both; smoke 214/214; first run found the always-true `hasDefaultValue` diagnostic, missing lane callbacks and Lit change-in-update warnings from Data view tile measurement and Tree view first loads, all fixed | `reactBindings`/`vueBindings` in DevTools | passed | — |
| V-14 | C-08, C-12, C-13; real input (user request) | docs hero: `Reference plate.tif` marked `disabled`; click Andromeda.tif, then the protected plate; `selectAll()` | not selectable, grayed, details shown, selection kept, no lock | box disabled, no `aria-selected`, muted name; details describe the plate while Andromeda.tif stays selected; select all leaves it out and the header box reads checked; lock icon removed | DevTools click + evaluate + screenshot in Storybook | passed | 2026-11-15 |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Data view, Tree view, DragDropManager, TextIndex, ControllableState imported by the widget; no widget-local grid, tree or search |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | Data view and Tree view recipes paint the views; the explorer recipe adds only gaps, column lines and the drop indication |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | sidebar, search, status bar, details, views, operations and selection mode are separate properties; V-03, V-10 |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed  | Approved plan; spec v0.73.0 read; no local reference (S-01); deltas tracked as S-02. |
| 1. Capability mapping                 | passed  | C-01–C-15 mapped to V-IDs. |
| 2. Architecture and composition reuse | passed  | Family, presentation and composition maps above. |
| 3. Behavior                           | passed  | V-01–V-10 pass: lanes, views, selection, search, metadata, mutations, drag, restrictions. |
| 4. Presentation and customization     | passed  | Parts registered in the family; tile size hooks; middleware and part contracts pass through to the views. |
| 5. Accessibility                      | passed  | V-12 axe on every view and both schemes; real keyboard in V-02–V-08; no screen-reader run. |
| 6. Visual and interaction inspection  | passed  | V-11 dark, light, RTL, 400 px; gallery thumbnails; drop indication. |
| 7. Documentation and demo reuse       | passed  | `check-docs.mjs widgets/file-explorer` passes; stories and workspace Browse tab; Storybook Docs page read on the user's server (2026-11-15): hero, Columns and Picker previews load their sources and render; website rendering not read. |
| 8. Regression and reconciliation      | passed  | `npm test` 471 files pass; lint, typecheck, build, cem, size report, `test:package`; React/Vue lanes and smoke. |

## Documentation synchronization

- [x] `docs/widgets/file-explorer.mdx` follows the tweakpad-docs skill; `check-docs.mjs widgets/file-explorer` passes; the story renders it with `libraryDocs()`.
- [x] JSDoc covers the element summary, every public field and method, slots, events, parts and CSS properties; `npm run build` reports no undescribed row.
- [x] `elementDependencies` lists every composed component.
- [x] Verification fixtures are separate from the page (`tests/fixtures/widgets/file-explorer/`, `!autodocs` stories).
- [x] Rendered and copyable previews reuse existing components and import only `@tweakpad/ui/file-explorer`.

## Completion / handoff

- Change summary: new `tp-file-explorer` widget and `@tweakpad/ui/file-explorer` data layer; Data view multiple selection, checkboxes, hidden header, grid layout and drag hook; Tree view drop targets; file and layout icons; docs, stories, workspace tab, fixture; pack budget raised from 8 to 9 MB.
- Actual delivery claim: complete widget in Chrome desktop and a 400 px viewport, with pointer drag and cut and paste as the move paths.
- Record checker: `check-gates.mjs --stage complete`.
- Non-browser checks: `npm test` 471 files / 6499 tests pass; `npm run lint`, `npm run typecheck`, `npm run build`, `npm run cem`, `npm run size:report`, `npm run test:package`, `check-docs.mjs widgets/file-explorer` pass.
- Behavior: V-01–V-10 passed (OS-file drop synthetic; everything else real input or unit).
- Accessibility: injected axe on every view in both schemes; real keyboard; no screen reader.
- Visual/customization/motion inspection: both schemes, RTL, 400 px.
- Documentation and demo composition reuse: docs page, stories and the workspace Browse tab.
- Shared-consumer regressions / package boundaries: Data view and Tree view tests pass; main entries reach no widget or companion module; the companion runs in Node.
- Required failures or blocked checks: none.
- Older out-of-scope gaps: none known.
- Changed source revisions / reopened gates: none after the final runs.
