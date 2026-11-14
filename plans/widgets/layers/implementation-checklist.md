# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Layers, `tp-layers` (widget); Tree view repairs (`tp-tree-view`, `tp-tree-item`)
- Requested work / claim: complete widget for the layer basics, without panel switching (user 2026-11-13: "cover the layer basics (no panel switching logic) in here so we can reuse a complete solution from here without having to bring devkit … proper select/active per layer states and follow our component and widget standards")
- Scope source: approved plan `/Users/vanrez/.claude/plans/lets-now-start-working-lazy-globe.md`; user decisions 2026-11-13: active + multi-select, groups included, header/footer slots plus built-in actions, records controlled or default; plan approval grants the Tree view repairs
- In-scope changes and existing gaps: `src/widgets/layers/`, its family, recipe, docs, story, fixture, tests; Tree view `selection-behavior`, `metadata.item`, `isItemCurrent` and the current-row look. Out of scope (stays in devkit or the app): panels, history/persistence, declarative types and add menus
- Repository baseline / unrelated changes: `b3e54bf4` on `development`; another session edits drag-drop-list (its changesets and files preserved, untouched)
- Live project / document IDs and revisions: UI Widgets Specification Layers section `uwg-lay-sec` committed at 0.65.48 (`98152a9edf6d4e7c0a166195dfdd2197cca791f6`); Component Library Tree view additions `tvsel-prop-behavior`, `tvsel-prop-current`, `tvsel-q1`–`q3` at 0.65.49 (`cab65a10ab805fdb423af10ebb93d73f375de9fa`); written from the implementation by a spec agent after Spec Blocks reconnected (2026-11-13)
- Owning contracts / dependencies / vocabulary: Foundation lane protocol (`ControllableState`, `TpValueChangeEvent`, `ControllableState.transaction`), nested-event containment (`containNestedEvents`), Tree view records mode; vocabulary checked locally (`tp-*-change` lanes, `selection-mode`, `data-current`/`aria-current` as Pagination and Carousel use them)
- Local reference evidence: no layers reference under `../specification/external/`; parity evidence is devkit `../devkit` at `9a58b8c` (`src/elements/layers.ts` `TweakLayerRow`, `TweakLayerStates`; `src/api/layers.ts` `LayersParams`, `LayerStateParams`, `LayersEvents`; `src/layers/model.ts` `moved`, `nextLayerId`; `docs/pane/layers.mdx`), clean
- Tool readiness: Spec Blocks MCP unavailable (connection failure); Chrome DevTools MCP available
- Browser / server / build under test: Chrome via DevTools MCP; Storybook dev `http://127.0.0.1:6006` (`widgets-layers--default`, `widgets-layers--docs`); Vite `http://127.0.0.1:5173/tests/fixtures/widgets/layers/`; source modules
- Evidence directory: `tmp/component-verification/layers/` (snapshots)
- Durable verification fixtures / served URLs: `tests/fixtures/widgets/layers/index.html`
- Evidence availability to the next agent: local only

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------ | -------------- |
| C-01 | Records lane: `layers`/`defaultLayers`, `tp-layers-change` with `metadata.change` (move, rename, state, add, duplicate, remove, group, ungroup) | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | devkit `LayersEvents`, `LayerParams` | `#layers` ControllableState, `LayersChange` | Usage, Controlled | V-04, V-09 | passed | Fixture controlled owner accepts and refuses; spec section pending |
| C-02 | Selection lane `value`/`defaultValue`, `tp-value-change`, `tp-value-commit` after a commit | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | devkit `selected` (single) | `#selection`; tree `selection-mode="multiple"` | Selection and the active layer | V-01, V-02 | passed | Real press and Shift+Arrow |
| C-03 | Active lane `active`/`defaultActive`, `tp-active-change`, proposed with the selection as one transaction; invariant active ∈ value | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | none in devkit (user request) | `#active`, `#select` transaction, `activeAfterSelection` | Selection and the active layer | V-01, V-02, V-09 | passed | Verified by V-01, V-02, V-09 in Chrome (DevTools MCP) or vitest; implementation `#active`, `#select` transaction, `activeAfterSelection` |
| C-04 | Active follows the acted-on layer; removing the active one from the selection passes it to the nearest selected layer | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | none | Tree `metadata.item`; `activeAfterSelection` | Selection and the active layer | V-02, V-15 | passed | unit + real input |
| C-05 | Expanded lane `expanded`/`defaultExpanded`, `tp-expanded-change` | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | none (devkit flat) | `#expansion`, forwarded from the tree | Groups | V-10 | passed | Verified by V-10 in Chrome (DevTools MCP) or vitest; implementation `#expansion`, forwarded from the tree |
| C-06 | Groups: `children` array makes a group; drops only into groups; `groupLayers`, `ungroupLayers` | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | none (devkit flat) | `#treeCanDrop`, model `groupLayers`/`ungroupLayers` | Groups | V-07, V-15 | passed | Verified by V-07, V-15 in Chrome (DevTools MCP) or vitest; implementation `#treeCanDrop`, model `groupLayers`/`ungroupLayers` |
| C-07 | Per-layer states: `tp-layer-state` children or record `states` (`name`, `label`, `value`, `values`, `scope`), any number of values each with `label`, `tp-icon`, `display` (`always`/`hover`), `dims`; a press proposes the next value; `scope="selection"` applies to selected layers with the same-named state; `getLayerState`, `setLayerState` (user 2026-11-13: "assume nothing except for the enabled state", "different layers have different capabilities", "Inside each tp-layer we add a tp-layer-state") | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | devkit `TweakLayerStates` (two-state only, replaced) | `#renderStates`, `#onStatePress`, `#setState`, model `nextValue`, `withState` | States | V-03, V-18 | passed | Fixture: three-valued visibility steps visible→hidden→solo→visible with the `value` attribute following; selection scope changed Sun and Fog together |
| C-08 | `dims` on the current value dims the label and icon, cascading into a group | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | devkit `mutes` (replaced) | model `dimmedIds`, `layers-label`/`layers-icon` `data-dimmed` | States | V-03, V-12 | passed | Colour mix keeps 4.5:1; axe clean |
| C-09 | Rename: `can-rename`, double-click, F2, `renameLayer()`; Enter/blur proposes, Escape cancels; focus returns | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | devkit `TweakLayerRow` rename | `#renderRow` `tp-input variant="inline"`, `#finishRename` | Renaming, removing and duplicating | V-05 | passed | Verified by V-05 in Chrome (DevTools MCP) or vitest; implementation `#renderRow` `tp-input variant="inline"`, `#finishRename` |
| C-10 | Remove: `can-remove`, Delete/Backspace, `removeLayers()`; active moves to the layer taking its place | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | devkit `remove` | `#remove`, `activeAfterRemoval` | Renaming, removing and duplicating | V-05, V-15 | passed | Verified by V-05, V-15 in Chrome (DevTools MCP) or vitest; implementation `#remove`, `activeAfterRemoval` |
| C-11 | Reorder: drag or handle keys, a selected row takes the selection along; Alt+Arrow steps; `moveLayers()`; `can-reorder`, `canDrop` | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | devkit `reorder`, `allow.move` | `#onTreeItems`, `dropLocation`, `stepLocation`, `#treeCanDrop` | Rules, Keyboard | V-06, V-07 | passed | pointer drag not exercised (DevTools drag emits one move); keyboard reorder passed |
| C-12 | Add and duplicate: `addLayer()` above the active layer, selected; `duplicateLayers()` above each source; `createLayerId` | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | devkit `add()`, `nextLayerId` | `addLayer`, `copyLayer`, `placeCopies`, `defaultCreateId` | Renaming, removing and duplicating; Header and footer | V-08, V-15 | passed | Verified by V-08, V-15 in Chrome (DevTools MCP) or vitest; implementation `addLayer`, `copyLayer`, `placeCopies`, `defaultCreateId` |
| C-13 | Slots `header`, `footer`, `empty`; bars hidden while empty | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | devkit `header`/`footer` bars | `#onSlotChange`, `data-empty` | Header and footer | V-08, V-11 | passed | Verified by V-08, V-11 in Chrome (DevTools MCP) or vitest; implementation `#onSlotChange`, `data-empty` |
| C-14 | Per-layer `icon` with a reserved cell when any has one; `renderLayer` replaces it | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | devkit `hasIcons`, `icon` | `#renderRow` `layers-icon` | Usage | V-01 | passed | `renderLayer` API-only, no thumbnail story |
| C-15 | `enabled` is the only built-in state; `false` freezes the layer (not selectable, draggable, renamable or removable; other controls inactive), its own declared control stays usable; `disabled`/`readonly` on the widget | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | devkit `enabled` | model `isEnabled`, tree `isItemDisabled`, `#flag`, `#renderStates` | Enabled | V-13, V-18 | passed | Frozen re-enabled by a real click on its control; gap: the control inherits `aria-disabled` from the frozen treeitem in the accessibility tree |
| C-16 | `size` (`sm`, `default`), `label`, `messages` (rename field, group name, copy suffix, moved announcement, tree messages) | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | devkit size | tree `size`, `resolveLayersMessages` | API Reference | V-11 | passed | Verified by V-11 in Chrome (DevTools MCP) or vitest; implementation tree `size`, `resolveLayersMessages` |
| C-17 | Nested constituent events contained | Foundation nested events | — | `containNestedEvents` | — | V-04 | passed | `leaked` empty |
| C-18 | Tree view repairs: `selection-behavior="replace"`, `metadata.item`, `isItemCurrent` with `aria-current`/`data-current` and the bar | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | — | `tree-view.ts`, `tree-item.ts`, `recipes/tree-view.ts` | Tree view page not yet updated | V-01, V-02, V-14 | passed | Tree view page sentence and spec rows pending |
| C-19 | Presentation: family parts, recipe, active bar, theming | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | devkit styles | `families/layers.ts`, `recipes/layers.ts` | API Reference parts | V-12, V-14 | passed | Verified by V-12, V-14 in Chrome (DevTools MCP) or vitest; implementation `families/layers.ts`, `recipes/layers.ts` |
| C-20 | Accessibility: tree multiselectable, `aria-current` on the active row, named Toggles, rename field name | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | devkit aria labels | tree roles, `.ariaLabel` | Keyboard | V-14 | passed | Verified by V-14 in Chrome (DevTools MCP) or vitest; implementation tree roles, `.ariaLabel` |
| C-22 | Permissions `can-rename`, `can-remove`, `can-reorder` on the stack (`canRename`, `canRemove`, `canReorder`); per-layer `can-rename` and `can-remove` (record `canRename`, `canRemove`; unset/present/`"false"`) override the stack's for that layer; reordering stays stack-wide plus `canDrop` (user 2026-11-13: "Renamable and removable also needs to work per layer", "instead of renamable try can-rename can-{something}"; `can-undo`/`can-redo` precedent) | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | devkit `LayerParams.rename`/`remove` | `#flag`, `TpLayer` `optionalBoolean`, `markup.ts` | Renaming, removing and duplicating | V-19 | passed | Fixture: F2 on Title (`can-rename="false"`) does not rename; Delete on Ground (`can-remove="false"`) keeps it; Delete on Sun removes it |
| C-23 | Alignment: rows keep the chevron column only while the stack has a group, and an icon cell only while a layer has an icon, so labels line up at each level with no empty gap (user 2026-11-13: "an extra space on the left even when there is not collapse controls nor icons") | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | devkit `hasIcons` | `styles.ts` `.tree[data-flat]::part(indicator)`, `#hasIcons` | — | V-20 | passed | Measured label offsets in Chrome |
| C-21 | Declarative `tp-layer`, `tp-layer-state`, `tp-layer-state-value` children read as the layers when `layers` is not controlled; edits written back while uncontrolled (create, move, update, remove; `id` unique in the document); author changes and late `tp-icon` artwork read back; records for frameworks (Gradient picker precedent) | UI Widgets Specification `uwg-lay-sec` (0.65.48, `98152a9e`) | Gradient picker `tp-gradient-stop` `#writeStops` | `layer.ts`, `markup.ts` `readLayers`/`writeLayers`/`sameLayers`, `#markupChanged`, observer on `data-empty` | Usage, Records | V-18 | passed | Fixture: move, rename (typed), state, duplicate, group, remove written back with no stale elements; page edits (label attribute, prepended layer, state value) read back |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| G-01 | The UI Widgets Specification had no Layers section; Tree view rows for the three repairs were missing | Gate 0, all C rows | Spec agent wrote the Layers section and Tree view rows as patch commits | 0.65.48 `98152a9e`, 0.65.49 `cab65a10`; no reason-registry entry or Appendix B rows for Layers (none needed beyond existing reasons) | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/widgets/layers/` — `layers.ts` (element, lanes, tree events, rows), `model.ts` (DOM-free index, edits, active rules), `types.ts`, `strings.ts`, `styles.ts` (structure), `index.ts`
- Supported exports / registration / constituent API impact: widget catalog tuple, `src/widgets/index.ts`, `src/register/widgets.ts`, `widgetPresentationFamilies`; Tree view gains `selectionBehavior`, `isItemCurrent`, `TreeSelectionBehavior`, `TreeItemState.current`
- Framework bindings: regenerated with `npm run cem` (React/Vue `layers` bindings, tag types; Tree view bindings gain the new properties); `npm run typecheck` passes; lane row in `tests/fixtures/frameworks/lanes.ts`; React and Vue lane and smoke passed; ledger row `tp-layers` passed
- Public vocabulary / tokens / parts / presentation review: parts `layers*`; markers `data-muted`, `data-concealed`, `data-plain`, `data-layer-state` (not `data-state`, a conventions test); lanes follow `tp-<lane>-change`

### Family dependency map

| Responsibility | Reference dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ---------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| List, nesting, multi-select keys, reorder, virtualization | devkit `tp-drag-drop-list` (flat) | `src/components/tree-view/tree-view.ts` records mode | Reused; repaired with `selection-behavior="replace"` (presses/arrows replace), `metadata.item`, `isItemCurrent`; drag-drop-list not reused (no nesting, no multi-select) | `tp-layers`; tree-view docs previews unchanged (`toggle` default) / V-01, V-06 |
| Lanes and atomic proposals | devkit imperative `on()` | `src/foundation/controllable-state.ts` `transaction` | Reused for layers+value+active | V-04, V-09 |
| State toggles | devkit `TweakLayerStates` `tp-toggle` | `tp-toggle` | Reused, controlled `.pressed` | V-03 |
| Rename field | devkit `tp-input variant="inline"` | `tp-input` | Reused, `copyable=false` | V-05 |
| Announcements | — | `src/foundation/announcer.ts` `LiveAnnouncer` | Reused for multi-layer moves | V-06 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | ------------------------------- | ------------ |
| Rows, selection fill, focus ring | library theme | devkit `tp-drag-drop-list::part(row)` | `recipes/tree-view.ts` navigation rows | Tree rows as they are | V-12 |
| Active row | library theme | none in devkit | `recipes/tree-view.ts` selected fill | No look of its own: selection is the library's background fill; the active row carries `aria-current` and `data-current` only (user 2026-11-13: "Selected is already the one marked by the bg color") | V-12, V-14 |
| Header and footer bars | library theme | devkit `.bar.header`/`.bar.footer` borders | `divider` edge kind | Divider line from `edges.ts` | V-08 |
| Name, icon, muting | library theme | devkit `:host([muted]) .label { opacity: .45 }` | `recipes/layers.ts` | Colour mix 70% instead of opacity for contrast | V-12 |
| State Toggles | library theme | devkit `tp-toggle.plain`, `.concealed` | `tp-toggle` ghost icon-xs | `--tp-pressed` cleared for plain toggles; concealed shown on row hover/focus | V-03 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Widget internals | list, rows | `tp-tree-view`, `tp-tree-item` | V-01 | none |
| Widget internals | state toggles, rename, icons | `tp-toggle`, `tp-input`, `tp-icon` | V-03, V-05 | none |
| Docs, story, fixture | panel | `tp-card` | V-08 | none |
| Docs header/footer preview | add menu, actions | `tp-menu`, `tp-menu-item`, `tp-button` | V-08 | none |
| Docs active preview | layout | `tp-stack`, native `output` for the readout | V-02 | `output` is a native live readout, as other pages use |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| ---- | ---------------------------------- | --------------- | --------------- | ------------- | ------------------------- | ------ | ------------------- |
| V-01 | C-02, C-03, C-14, C-18; real input | Story, click Stars | value [stars], active stars, one transaction | as expected | DevTools click + event log | passed | Observed: as expected (DevTools click + event log) |
| V-02 | C-03, C-04, C-18; real keys | Shift+ArrowDown | value [stars, hills], active hills | as expected | DevTools press_key | passed | Observed: as expected (DevTools press_key) |
| V-03 | C-07, C-08; real input | Toggle Visible on a selected row with a multi-selection | only layers that differ change; Stars un-muted | as expected | DevTools click | passed | Observed: as expected (DevTools click) |
| V-04 | C-01, C-17; API + real input | Event log on document | only `tp-layers` lane events reach the document | `leaked` empty | fixture `layersAPI.leaked` | passed | Observed: `leaked` empty (fixture `layersAPI.leaked`) |
| V-05 | C-09, C-10; real keys | Click Moon, Delete, F2, type, Enter; F2 + Escape | removed, active → Stars; rename proposed; focus back on row; Escape cancels | as expected | DevTools press_key/type_text | passed | Observed: as expected (DevTools press_key/type_text) |
| V-06 | C-11; real keys | Select Moon+Hills, Control+Enter, ArrowDown, Enter | both move below Stars as a block | `move` ids [moon, hills] index 1 | DevTools press_key | passed | pointer drag not exercised |
| V-07 | C-06, C-11; real keys | Alt+ArrowUp on Hills | Hills one place up within its group | as expected | DevTools press_key | passed | Observed: as expected (DevTools press_key) |
| V-08 | C-12, C-13; real input + API | Docs footer Menu → Spot light; duplicate, group, ungroup via API | added above the active one and selected; copies above; group/ungroup in place | as expected | DevTools click, evaluate | passed | Observed: as expected (DevTools click, evaluate) |
| V-09 | C-01, C-03; API | Fixture controlled owner; refuse `tp-layers-change` on a removal | nothing commits, owner writes to other lanes consumed | value/active unchanged | fixture `#controlled` | passed | Observed: value/active unchanged (fixture `#controlled`) |
| V-10 | C-05; real input | Chevron on a group | expansion proposed and committed | as expected | Story | passed | Observed: as expected (Story) |
| V-11 | C-13, C-16; visual | Fixture `#sm`, `#empty` | small rows; empty slot shown, tree hidden | as expected | screenshot | passed | Observed: as expected (screenshot) |
| V-12 | C-08, C-19; visual | Dark and light, selected, hovered, focused, muted | readable, active bar visible on the fill | as expected | screenshots | passed | Observed: as expected (screenshots) |
| V-13 | C-15; API | `readonly`, `disabled` | readonly keeps selection, blocks edits | edits refused through `#editable` | code review + story control | passed | no dedicated screenshot |
| V-14 | C-18, C-19, C-20; accessibility | Snapshot; axe on the widget in dark and light, plain and selected muted rows | tree multiselectable; `aria-current` on the active row; no violations | 0 violations after the muting fix | DevTools snapshot, injected axe | passed | screen readers not tested |
| V-15 | C-04, C-06, C-10, C-12; unit | `tests/unit/widgets/layers/model.test.ts` | rules hold | 11 tests pass | vitest | passed | Observed: 11 tests pass (vitest) |
| V-16 | C-19, C-20; RTL visual | Fixture `#rtl` | bar and Toggles mirror; tree guides mirror | as expected | screenshot | passed | Observed: as expected (screenshot) |
| V-17 | C-01, C-02, C-03; frameworks | React and Vue fixtures: `lane('tp-layers')` and `smoke(0, 300)` | lane round-trips; every binding mounts | lane passed in both; smoke 210/210 (with `tp-layer`, `tp-layer-state`, `tp-layer-state-value`) with no Layers diagnostic | `tests/fixtures/frameworks/{react,vue}/`, lanes.ts row | passed | Ledger row `tp-layers` passed |
| V-18 | C-07, C-15, C-21; real input + API | Fixture `#markup`: icons set after the read; click Title visibility three times; select Sun+Fog, press Fog twice; click Frozen's control; rename Fog by typing; move, duplicate, group, remove; page edits | values cycle and are written back; selection scope; frozen layer re-enabled; markup mirrors every edit; page edits read back | as expected | DevTools click/type_text/press_key, `layersAPI.markup` | passed | Observed in Chrome 2026-11-13 |
| V-19 | C-22; real keys | Fixture `#markup` on a renamable, removable stack: F2 on Title, Delete on Ground, Delete on Sun | Title not renamed; Ground kept with its attribute; Sun and its element removed | as expected | DevTools click/press_key | passed | Observed in Chrome 2026-11-13 |
| V-20 | C-23; layout | Fixture: label left edges in `#markup` (groups, one icon) and `#sm` (flat, no icons) | top-level labels share one edge; group members one indent in; flat stack starts at the row padding | 363 px for every top-level row, 387 px for members; flat rows at the row edge + 8 px | DevTools evaluate + screenshot | passed | Observed in Chrome 2026-11-13 |
| V-21 | C-13; docs demo, real input | Docs "Panel controls": select Fill, ArrowRight on the panel Slider, select Key, toggle Properties off, Clear, Add a light from the Empty state | the panel follows the active layer and keeps each light's intensity; the toggle hides it; Clear shows the `empty` slot; adding brings the stack back | Fill 40→41, Key kept 80; panel removed; Empty state shown; Point light 1 added, active, written as a `tp-layer` | Storybook docs, DevTools click/press_key | passed | Observed in Chrome 2026-11-13 |
| V-22 | Bars; layout | Fixture `#markup`: Opacity Input in `header`, lock Button in `header-end`, Menu in `footer`, trash in `footer-end`; `#rtl` | start controls at the bar's start, end controls at its end; bar hidden only with both regions empty | as expected | screenshot | passed | Observed in Chrome 2026-11-14 |
| V-23 | Lock pattern; real input | Select Title, header lock; then the row's lock | row shows the lock only while locked; the row lock unlocks; header icon and label follow the selection | `locked` → lock in the row, header "Unlock"; row press → `unlocked`, lock gone, header "Lock" | DevTools evaluate (dispatched click) + screenshot | passed | Observed in Chrome 2026-11-14 |
| V-24 | Drag activation; dispatched pointer (`pointerId: 1`, deep `elementFromPoint` target) | Press on a label + move; press on a state Button, the chevron, the rename field + move; press on the handle | label drags; the other three never drag; handle starts at once | as expected; dragged row at opacity 0.65 | DevTools evaluate | passed | Observed in Chrome 2026-11-14 |
| V-25 | Drop zones and into | Ground over Title's top quarter; over Scene's middle (expanded), Title over collapsed Scene held 900 ms, Scene over the empty group; Ground between Sun and Fog | before Title; into lands last; no auto-expand; empty group takes it; between children joins the group | `ground,title,…`; Scene `sun,fog,ground`; `expanded` stays `[]`; folder `[scene]`; Scene `sun,ground,fog` in both indicator modes | DevTools evaluate + screenshots (ring, line) | passed | Observed in Chrome 2026-11-14 |
| V-26 | Line mode; settle; reduced motion | `drop-indicator="line"`: Ground after Title; release; then `prefers-reduced-motion` in both modes | rows never move while dragging; line on the boundary inset to the depth; release animates the source and the rows that make room; reduced motion has no animation | row tops unchanged; line at 145 for a 146 boundary; animations on ground, scene, sun, fog, frozen; none under reduce | DevTools evaluate, `getAnimations` | passed | Observed in Chrome 2026-11-14 |
| V-27 | Auto-scroll | `#scroll`: 8 groups × 4 layers in a 12rem Scroll area; drag Layer 1.2 to the bottom edge and hold, then drop on a revealed row | viewport scrolls while held; drop lands beside the revealed row at its level | scrollTop 0 → 240 (end) within ~15 frames; lands at the root before Group 6 in both modes | DevTools evaluate | passed | Observed in Chrome 2026-11-14 |
| V-28 | Guides with the start handle | `#markup` Scene/Sun and `#controlled` | each guide centered under its parent's chevron; handles at the left edge at every depth | 85 = 85, 397 = 397 px | DevTools evaluate + screenshot | passed | Observed in Chrome 2026-11-14 |
| V-29 | User review fix: pointer follow | Fixture `#markup`, both indicator modes: drag Ground by its label | the row stays under the pointer at the grab offset, lifted on an opaque surface with content at 0.65, rows beneath hidden; drop line drawn above it; release glides from the pointer to the slot | grab 25 px = gap 25 px during the drag; glide from −30.6 px over 200 ms; lift, translate and opacity cleared after settle | DevTools evaluate + screenshots | passed | Observed in Chrome 2026-11-14 |
| V-30 | User review fix: no nesting under plain layers | Ground dragged up with a 70 px sideways drift, both modes | level only changes among a group's children; after a plain layer it stays at the root; over a group's middle the row keeps its level | displace levels `1…2…1`, line levels unchanged; lands `title,ground,…` at the root | DevTools evaluate (`aria-level` per frame) | passed | Was level 3 over Scene's middle before the fix (1-based level used as a depth) |
| V-31 | Default indicator | `tp-layers` without `drop-indicator` | a landing line, `drop-indicator="displace"` opens a gap | `dropIndicator` = `line`; manifest default `'line'` | DevTools evaluate, manifest probe | passed | Observed 2026-11-14 |

## Early integration checkpoint

| ID   | Check | Status | Evidence / unresolved finding |
| ---- | ----- | ------ | ----------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Widget composes `tp-tree-view` records mode; no list, selection or drag logic of its own beyond the multi-move target |
| I-02 | Default visual regions match traced source and shared library recipes | passed | Story screenshots: tree rows, Card, Toggles; active bar from the tree recipe |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | `can-rename`, `can-remove`, `can-reorder`, per-layer `can-rename` and `can-remove`, `display`, `mutes` exercised (V-03, V-05, V-07) |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| ---- | ------ | --------------------------------------- |
| 0. Sources and scope | passed | Layers section `uwg-lay-sec` (0.65.48) and Tree view additions (0.65.49) committed from the implementation; scope from the approved plan and the user decisions of 2026-11-13 |
| 1. Capability mapping | passed | C-01..C-20 mapped to devkit evidence, implementation, docs and scenarios |
| 2. Architecture and composition reuse | passed | Tree view reused and repaired; Toggle, Input, Icon, Card, Menu reused |
| 3. Behavior | passed | V-01..V-10, V-15 |
| 4. Presentation and customization | passed | Parts registered across the tree's shadow root; recipe goldens updated |
| 5. Accessibility | passed | V-14 (tree, keyboard, axe); no screen reader run |
| 6. Visual and interaction inspection | passed | V-11, V-12, V-16 |
| 7. Documentation and demo reuse | pending | `check-docs.mjs widgets/layers` passes and the Storybook docs page was read in Chrome; the website rendering (site linked to the library) was not read |
| 8. Regression and reconciliation | passed | Full vitest, typecheck, lint, build, ledger check; React and Vue lane and smoke (V-17) |

## Documentation synchronization

- [x] `docs/widgets/layers.mdx` follows the tweakpad-docs skill; `check-docs.mjs widgets/layers` passes; the story renders it with `libraryDocs()`.
- [x] JSDoc covers the element summary, every public field and method, slots and events; parts carry a description in the family; `npm run build` reports no undescribed row.
- [x] `elementDependencies` is complete.
- [x] Verification fixtures are separate from the page.
- [x] Rendered and copyable previews reuse existing components.
- [x] Preview code works outside Storybook: it imports only package subpaths and `lit`.

## Completion / handoff

- Change summary: new `tp-layers` widget on Tree view records mode, with active + multi-select, groups, state Toggles, rename, remove, duplicate, group, reorder; three Tree view repairs
- Actual delivery claim: the widget and repairs as verified above; not spec-conformant until the spec section exists
- Record checker: see the run after this record
- Non-browser checks: `npm run typecheck`, `npm run lint`, full vitest (6375 passed after the golden update and marker rename), `npm run build`, `check-docs.mjs widgets/layers`, `check-ledger.mjs`
- Behavior: V-01..V-10
- Accessibility: V-14
- Visual/customization/motion inspection: V-11, V-12, V-16; no motion of its own (the tree's expansion motion)
- Documentation and demo composition reuse: Storybook docs page read in Chrome
- Shared-consumer regressions / package boundaries: Tree view defaults unchanged (`toggle`, no current item); golden diff shows only the added current rule
- Required failures or blocked checks: gate 0 blocked on Spec Blocks; gate 7 waits for the website reading
- Older out-of-scope gaps: devkit still has its own layer stack; moving devkit onto `tp-layers` is devkit work
- Changed source revisions / reopened gates: none
