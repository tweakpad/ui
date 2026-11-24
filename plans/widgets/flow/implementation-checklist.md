# Component implementation and evidence record

Earlier Flow deliveries (inline node-body fields 2026-10-31, minimap reconnect repair 2026-11-08)
are archived unchanged in `archive/2026-10-31-inline-fields-and-minimap-reconnect.md`.

## Delivery and source record

- Component(s) / public identity: Flow (`tp-flow`, `tp-flow-node`, `tp-flow-inspector`, engine `@tweakpad/ui/flow`); composed Breadcrumb, Card, List item, Badge, Button.
- Requested work / claim: feature: enterable groups with boundary ports (organize nodes in groups, double click enters a sub-view showing only the subgraph, groups define inputs/outputs like other nodes). Complete for that feature; not a re-certification of unrelated Flow capabilities.
- Scope source: user 2026-11-24 "update our flow component to support groups … A double click enter into a sub-view showing only the subgraph … Groups should define inputs/outputs same as other nodes"; decisions taken with the user the same day: frame and collapsed card (both, configurable), Inputs/Outputs terminal cards, ports-only borders with auto-expose, header breadcrumb. Approved plan `/Users/vanrez/.claude/plans/we-need-to-update-noble-cookie-of-d3e78926-80d5-4e53-b514-349b9adea954.md`.
- In-scope changes and existing gaps: engine groups module (relations, flatten, scope view, commands), role-aware validation, collapsed sizing, routing/layout/run changes; widget path lane, scope rendering, terminals, collapsed card, frame hit testing, breadcrumb, group commands, drop reparent, live parent growth, resize clamp, keys, menu items, inspector group section, strings, parts; docs, story sample, fixture, bindings. Existing gaps: docs claimed parent growth that was not implemented (fixed here); `FLOW_SHORTCUTS` fit/reset rows disagree with the bindings (fixed here).
- Repository baseline / unrelated changes: `development` at 99d96fb7, clean tree at start. Other sessions may edit the same tree; preserve foreign changes.
- Live project / document IDs and revisions: UI Library `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483` read at v0.75.1 (head `5a47d49b`), amended to v0.76.0 (head `0e789f7e`; content 0.75.2 `452e0758`); UI Widgets Specification `doc_0d98facc-5a5d-4de2-bccb-7317abea0b9f` §6.3 Flow (`uwg-fl-sec`).
- Owning contracts / dependencies / vocabulary: Widgets §6.3.1 definition note `uwg-fl-not-def-1-p`, `uwg-fl-req-def-2`; §6.3.3 `uwg-fl-req-prop-3`, `uwg-fl2-req-prop-4`; §6.3.5 `uwg-fl-req-key-1..4`; §6.3.6 `uwg-fl-req-a11y-1..3`; §6.3.7 `uwg-fl-req-pres-1`; header `uwg-fl3-req-ana-5`; Component Library Breadcrumb, Card, List item, Badge, Button.
- Local reference evidence: node-graph reference checkout `external/xyflow` at 3d35b5731, clean (gitignored, in this repo, not under `../specification/external/`): `packages/system/src/utils/store.ts` (`calculateChildXYZ`, `handleExpandParent`), `xyresizer/XYResizer.ts` (child extent), `xydrag/utils.ts` (ancestor dedupe), examples `Subflow`. It has no enterable sub-views, terminals, collapse or group commands. Breadcrumb anatomy: `../specification/external/ui/apps/v4/registry/bases/base/ui/breadcrumb.tsx`, already owned by `src/components/breadcrumb/`.
- Tool readiness: direct Spec Blocks and Chrome DevTools MCP available.
- Browser / server / build under test: Chrome via DevTools MCP; Vite dev server on sources (`npm run dev`); user's Storybook at `http://192.168.1.155:6006` for the docs page.
- Evidence directory: `tmp/component-verification/flow/2026-11-24-groups/`
- Durable verification fixtures / served URLs: `tests/fixtures/widgets/flow/index.html` new `#groups` and `#groups-rtl` instances; `flowAPI.assertGroups`, `assertGroupNavigation`, `assertGroupEditing`, `assertGroupHitTesting`, `assertGroupPerformance`.
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | Group = node with definition shape `group`, membership `parentId`, parent-relative positions (existing) | `uwg-fl-not-def-1-p`, `uwg-fl-req-def-2` | `store.ts` `calculateChildXYZ` | `model/indices.ts`, `model/model.ts` (existing) | flow.mdx Groups | V-01 | passed | V-01 regression suite |
| C-02 | Group interface = definition ports + instance `ports`; commands always write `direction` | S-1 | — (no reference) | `FlowNode.ports`, `groups/commands.ts` `groupPortChanges` | flow.mdx Groups | V-04, V-09 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-03 | Edge relations sibling / inner-input / inner-output / through / crossing; `boundary-crossing` document issue | S-1 | — | `groups/relations.ts`, `model/validation.ts` | flow.mdx Groups | V-02, V-09 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-04 | Role-aware connection validation (effective directions, occupancy, multiplicity, pass-through not a self loop); `boundary` option reject/expose | S-1 | — | `validateConnection`, `FlowConnectionValidationOptions.boundary` | API rows | V-02, V-08 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-05 | Cycle detection, topological order and run ordering on the flattened graph; `flattenFlowGroups` export | S-1 | — | `groups/flatten.ts`, `model/queries.ts`, `run/state.ts` | flow.mdx Groups | V-02, V-12 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-06 | `collapsed` per group; collapsed card ignores persisted frame size, members and inner edges hidden; collapsed group is a routing obstacle | S-1 | example `toggleChildNodes` (hide children only) | `FlowNode.collapsed`, `declaredSize`, planner obstacle rule, `node/group-templates.ts` | flow.mdx Groups | V-03, V-05 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-07 | Expanded frame: header strip (label, count Badge, collapse Button), border strips, ports on frame edges; interior passes presses through | S-1, `uwg-fl-tab-anatomy-r5-c1-p` | `.xy-flow__node-group` | `renderGroupFrame`, structure CSS pointer-events | flow.mdx Groups | V-03, V-06 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-08 | Inner edges anchor inward on frame ports | S-1 | — | `edges/endpoints.ts` `inward` | — | V-03 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-09 | `path` / `defaultPath` lane, `onPathChange`, `tp-path-change` (cancelable, metadata surface/groupId) | S-1 | — | `groups/scope-controller.ts`, `flow.ts` | API rows | V-04, V-07 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-10 | Scoped canvas: culling, edges, routing, minimap, fit, select all, marquee, arrows, insert, paste, layout; document coordinates in every scope; root fast path | S-1 | — | `groups/view.ts` `FlowScopeView`, `#view` in `flow.ts` | flow.mdx Groups | V-04, V-13 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-11 | Terminals Inputs/Outputs: synthetic, not selectable/deletable, movable and nudgeable, positions in `terminals`, auto-placed, "+" adds a port | S-1 | — | `FlowScopeView` terminals, `renderTerminalShape`, `rewrite`/`resolve` | flow.mdx Groups | V-04, V-08 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-12 | Path truncation to nearest surviving ancestor (uncontrolled reconcile, controlled diagnostic) | S-1 | — | scope controller | — | V-07 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-13 | Enter: clear selection, fit first time else restore scope viewport, focus first member; exit: restore parent viewport, select and focus group; no content jump when header appears | S-1 | — | scope controller, `updated()` header compensation | — | V-04, V-11 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-14 | Header breadcrumb (`tp-breadcrumb`) in `header-start` while inside a group, replaceable by the slot; header renders while inside a group | S-1, `uwg-fl3-req-ana-5` | `breadcrumb.tsx` | `groups/breadcrumb.ts`, `#hasHeader` | flow.mdx Groups | V-04, V-10 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-15 | Double press on a group enters (frame interior, header, border, collapsed card); settings via toolbar and menu | S-1 amends `uwg-fl2-req-prop-4` | — | `#canvasDoubleClick`, `view.groupAt`, `#panFilter` | flow.mdx Groups | V-04, V-06 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-16 | Group selection (shared parent), ungroup, move out; crossing edges become ports with original segment id kept; shared source ports; one history entry each | S-1 | — | `groupNodesChanges`, `ungroupChanges`, `reparentChanges`, `groupSelection()`, `ungroup()`, `moveToGroup()` | flow.mdx Groups | V-08 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-17 | Cross-border connect exposes ports through every level, `tp-connect.exposed`, cancel leaves document unchanged | S-1, `uwg-fl-req-key-3` | — | `exposeConnectionChanges`, `connect()` | flow.mdx Groups | V-08 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-18 | Drop reparent into / out of a frame inside the drag's history entry, `data-drop-target` | S-1, `uwg-fl-req-key-1` | `getIntersectingNodes` | `interaction/drop.ts`, `NodeDragSession` `beforeDrop` | — | V-08 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-19 | Live parent growth while a member drags against the border, siblings and terminals keep place | S-1 (docs already claimed it) | `handleExpandParent` | `expandParentChanges` | flow.mdx Nodes | V-08 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-20 | Resize clamp to members' bounds plus padding; start/top resize keeps members in place | S-1 | `XYResizer` child extent | `groupResizeChanges`, `#nodeResize` | — | V-08 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-21 | Port add / rename / remove (remove deletes both sides' edges); inspector group section (label, collapsed, ports) | S-1 | — | `addGroupPort`, `updateGroupPort`, `removeGroupPort`, `panels/inspector.ts` | flow.mdx Groups | V-08, V-09 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-22 | Keys: `Alt+ArrowDown` enter, `Alt+ArrowUp` exit, Escape exits last, `Mod+G`, `Mod+Shift+G`, `C`; Keyboard table rows | S-1 | File explorer Alt+ArrowUp precedent | `shortcuts.ts`, `#installKeys`, `#canvasKeyDown` | flow.mdx Keyboard | V-07 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-23 | Context menu items: enter, collapse/expand, ungroup, move out, group selection, exit | S-1 | — | `groups/menu.ts` | — | V-07 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-24 | Accessibility: group name with state and count, terminal roledescription and names, breadcrumb nav name, focus on enter/exit, announcements | S-1, `uwg-fl-req-a11y-1/2` | — | strings, node aria, announcer | — | V-10 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-25 | Parts `flow-node-group-header`, `-count`, `-edge`, `flow-node-terminal`, `flow-node-terminal-add`, `flow-breadcrumb`; states `data-collapsed`, `data-terminal`, `data-drop-target` | S-1, `uwg-fl-req-pres-1` | — | `presentation/families/flow.ts`, `recipes/flow.ts` | Parts and customization | V-06, V-11 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-26 | Run: request lists leaf nodes, group scope expands to members, collapsed group shows aggregate status | S-1 | — | `flowRunGraph`, `aggregateRunStatus`, `#requestRun` | flow.mdx Run state | V-12 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-27 | Declarative `tp-flow-node` `collapsed` and `ports` (JSON) attributes | S-1 | — | `adoption.ts` | API rows | V-01 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |
| C-28 | Modes: view / read-only / disabled / locked allow navigation, refuse structure edits | `uwg-fl-req-prop-*` existing modes | — | command guards | — | V-07 | passed | scenarios in this row; evidence `tmp/component-verification/flow/2026-11-24-groups/` |

Record spec/reference conflicts here before dependent implementation:

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-1 | §6.3 has no rules for group interfaces, border relations, sub-views, terminals, collapsed groups, group commands, path lane, breadcrumb; `uwg-fl2-req-prop-4` makes a double press open the inspector | Flow engine, widget, inspector, bindings | amend §6.3 definition, anatomy, properties, events, keyboard, accessibility, presentation, upstream reference | added `uwg-flg-req-def-4..6`, `uwg-flg-req-ana-6..9` + anatomy rows, `uwg-flg-tab-props-path`, `uwg-flg-req-prop-10..17`, `uwg-flg-req-evt-7`, `uwg-flg-req-key-8..9`, `uwg-flg-req-a11y-4`, `uwg-flg-req-pres-5`, `uwg-flg-lis-up-i4`; amended `uwg-fl-not-def-1`, `uwg-fl2-req-prop-4`, `uwg-fl3-req-ana-5`, `uwg-fl-req-prop-1`, `uwg-fl-par-evt-1`, `uwg-fl-req-key-1` (extent clamp only for non-group parents); committed v0.76.0 `0e789f7e` | passed |
| S-2 | Reference provides nesting only; no counterpart for sub-views, terminals, collapse, group commands | — | owned by the amended §6.3 (upstream reference note) | `external/xyflow` 3d35b5731 survey | passed |
| S-4 | Foundation B.8.3 Flow reason row `flow-b83` does not name the path lane (its reasons are already listed) | label only | optional follow-up amendment | reported by the amendment run | not applicable |
| S-3 | AGENTS.md points to `../specification/external/` for references; the node-graph reference lives in `library/external/` | record only | record the actual path | `flow-analysis.md`, `LICENSE.xyflow` | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: engine `src/foundation/flow/groups/` (`relations.ts` edge relations and facing, `flatten.ts` port-chain resolution, `view.ts` `FlowGraphView` + `FlowScopeView` with terminals, `commands.ts` pure change builders); widget `src/widgets/flow/groups/` (`scope-controller.ts` path lane and viewport memory, `breadcrumb.ts` header crumb rendering, `group-commands.ts` widget methods over the engine builders, `menu.ts` context items), `src/widgets/flow/node/group-templates.ts` (frame, collapsed card, terminal), `src/widgets/flow/interaction/drop.ts` (drop target and live growth). `flow.ts` only wires these.
- Supported exports / registration / constituent API impact: new engine exports from `@tweakpad/ui/flow` (`flattenFlowGroups`, `FlowScopeView`, relation helpers, command builders, types); new `tp-flow` properties `path`/`defaultPath`/`onPathChange`, event `tp-path-change`, methods listed in C-09..C-21; `tp-flow-node` attributes `collapsed`, `ports`. No new element tags; no registration change.
- Framework bindings: regenerate with `npm run cem` (new property, lane callback, event detail type); `plans/frameworks/ledger.md` row for `tp-flow` updated with the `path` lane; React/Vue fixture scenarios through MCP.
- Public vocabulary / tokens / parts / presentation review: lane name `path` and event `tp-path-change` follow File explorer's folder-lane naming of lanes by value; parts follow the `flow-node-*` series; no new tokens.

### Family dependency map

| Responsibility | Reference dependency path / symbol         | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Nesting, relative positions, z elevation, cascade delete | `store.ts` `calculateChildXYZ`, `getElementsToRemove` | `model/indices.ts`, `model/queries.ts` `nodeZ`, `model/changes.ts` `expandRemoveCascade` | reused unchanged; group commands apply with `cascade: false, clamp: false` because passes read the pre-batch document | all group commands / V-01, V-08 |
| Drag of nested nodes | `xydrag/utils.ts` `isParentSelected` | `interaction/drag.ts` `NodeDragSession` | reused; adds a `beforeDrop` hook so reparent joins the drag transaction | V-08 |
| Parent growth | `handleExpandParent` | none (docs claim only) | new pure `expandParentChanges` in engine commands, called per drag frame | V-08 |
| Resize child extent | `XYResizer` `childExtent` | `node/resizer.ts`, `flow.ts #nodeResize` | new `groupResizeChanges` clamp used by `#nodeResize` for groups | V-08 |
| Read surface for layers/sessions | — | `FlowModel` passed to `NodeLayer`, `EdgeLayer`, `FlowInteractionHost`, keyboard, clipboard | one `FlowGraphView` interface that `FlowModel` satisfies; `FlowScopeView` wraps it; no parallel model | V-04, V-13 |
| Connection validation | — | `model/validation.ts` `validateConnection`, `connect.ts` | repaired in place to be role-aware; no second validator | V-02, V-08 |
| Lanes | — | `foundation/controllable-state` used by every Flow lane | path lane is one more `ControllableState` | V-07 |
| Header and breadcrumb | `breadcrumb.tsx` | `src/components/breadcrumb/` `tp-breadcrumb`, Flow `#renderHeader` | composed as is (fallback content of `header-start`) | V-10 |
| Announcements | — | `foundation/announcer` used by Flow | reused | V-10 |
| Layout of nested levels | — | `layout/groups.ts` `layoutGroupTree` | repaired: keeps group ports; scope layout through the view's projected source | V-05 |
| Routing | — | `router/planner.ts` | repaired: collapsed groups are obstacles, `endpoints(edge)` replaces `endpoint` | V-05, V-13 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Expanded frame | Flow recipe | `recipes/flow.ts` group recipe (~166, 300-310), part `flow-node-group` | existing frame recipe | header strip inside existing 40px header padding; frame stays paint only | V-03, V-06 |
| Frame header label / count / collapse | library | Badge, Button recipes | `tp-badge`, `tp-button` icon size | no local paint | V-06 |
| Collapsed group | Flow panel shape | `default-templates.ts` panel rows (262-299, 394-429) | `tp-card`, `tp-list-item`, `tp-badge`, `tp-button` | same widths and rows as the panel shape | V-03, V-06 |
| Terminals | Flow panel shape | panel rows | `tp-card`, `tp-list-item`, `tp-button` "+" | ports on the inward edge | V-04, V-06 |
| Header breadcrumb | Breadcrumb | `components/breadcrumb` recipe | `tp-breadcrumb` + `tp-button` crumbs | header-start region | V-10 |
| Drop target highlight | Flow states | existing selected/focus rings in `recipes/flow.ts` | Flow recipe state | `data-drop-target` reuses the selection ring color token | V-08 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| frame header | count, collapse | `tp-badge`, `tp-button` | `elementDependencies` of `tp-flow-node` | frame border/paint stays the existing recipe div |
| collapsed card, terminals | container, port rows, add | `tp-card`, `tp-list-item`, `tp-button` | V-03, V-04 | none |
| header | location trail | `tp-breadcrumb`, `tp-button` | `elementDependencies` of `tp-flow` | none |
| inspector group section | label, collapsed, ports | `tp-input`, `tp-switch`, `tp-list-item`, `tp-button` | V-09 | none |
| docs preview / story / fixture | graph | `tp-flow` with schema + document | check-docs, V-01 | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01, C-27; regression | all 31 existing flow helpers in file order on fresh loads (assertVirtualization 300, no assertPerformance), plus declarative adoption | all pass | 31/31 passed (assertClipboard re-run alone after a focus loss during a concurrent build; passed) | DevTools `flowAPI.*` | passed | `assertInspector` first failed: Group selection preceded Settings; group items now follow Settings on plain nodes |
| V-02 | C-03, C-04, C-05; unit | engine unit tests (relations, flatten, view, commands, validation, cycles, run) | pass | engine 347 + widget tests; full suite 6623 passed | `npx vitest run` | passed | — |
| V-03 | C-06, C-07, C-08; visual | `#groups` dark and light: frame, nested frame, collapsed card, inner edges | enclosed card, frame header, inward anchors | as expected | screenshots `entered-cleanup-fixed.png`, `root-light.png` | passed | — |
| V-04 | C-09, C-10, C-11, C-13, C-14, C-15; real input | real double click on the frame header (fixture and docs page), Escape, breadcrumb | sub-view with members and terminals only; breadcrumb; exit restores | as expected; focus on first member; exit selects and focuses the group | DevTools `click` dblClick, `press_key`; `assertGroupNavigation` 11/11 | passed | user found low-detail shells and terminal placement defects; both fixed and re-verified |
| V-05 | C-06, C-10; layout/routing | collapse with real `c`, expand again; zoom to 0.25 | outer edges stay attached and reroute; low-detail shells fill their box | as expected | screenshots; host/shell size probe | passed | pre-existing: low-detail shells never filled the host box (fixed) |
| V-06 | C-07, C-15, C-25; hit testing | elementFromPoint inside frames, header, strips, along inner edges | interior reaches pane/edges; header and strips the group | 3/3 | `assertGroupHitTesting` | passed | fixture members spread so edges are not covered by their insert Buttons |
| V-07 | C-09, C-12, C-22, C-23, C-28; keyboard and lane | real Alt+ArrowDown, Escape, `c`; controlled/uncontrolled path, truncation, read-only | per spec | as expected; path lane in React and Vue lane matrices | DevTools `press_key`; `assertGroupNavigation`; `reactBindings.lane('tp-flow','path')`, `vueBindings.lane(...)` | passed | lane first raised a Lit change-in-update warning (scope settle in `updated()`); fixed |
| V-08 | C-04, C-11, C-16..C-21; editing | group/ungroup round trip, ports, move out, collapse, real drag of a member out of its frame, undo | one history entry each, exact undo | 11/11; real drag reparented with rewiring in one commit and one undo restored it | `assertGroupEditing`; DevTools `drag` on the docs preview | passed | live growth exercised by unit tests and scripted drags; the DevTools drag tool emits one move |
| V-09 | C-02, C-03, C-21; inspector | inspector group section events | ports and edges update | unit tests for the section; port commands in `assertGroupEditing` | vitest, DevTools | passed | — |
| V-10 | C-14, C-24; accessibility | a11y tree, names, focus on enter/exit, axe at root and inside a group | names with state and count, terminals named, no violations | as expected; axe 0 violations both | DevTools snapshot, axe-core | passed | no screen-reader run |
| V-11 | C-13, C-25; visual/motion | enter/exit with header, RTL twin, dark and light | no content jump; mirrored breadcrumb | as expected | screenshots | passed | pre-existing RTL gap: port-row labels sit at inline start/end, away from physically placed ports |
| V-12 | C-05, C-26; run | run graph flattening, leaf ids | leaf ids only; aggregate | unit tests; `assertRunRequests`, `assertLiveRun` pass | vitest, DevTools | passed | — |
| V-13 | C-10; performance | `#large` 1000 nodes in 50 groups: pan at root, inside a stage, back | p95 within the display budget, no long task | p95 17.8 / 17.3 / 18.6 ms vs idle 25.5 ms; 22 hosts inside a stage; unloaded | `assertGroupPerformance` | passed | flat 16.7 ms not met on this display (idle frame 25.5 ms) |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | layers, sessions and keyboard read through `FlowGraphView`; one validator, one lane infrastructure; `renderGroupShape` replaced |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | frame, collapsed card and terminals compose Card, List item, Badge, Button; screenshots |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | collapsed vs expanded, terminals vs members, header breadcrumb vs slotted header |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed | scope from the user; spec amended to v0.76.0 (S-1); reference surveyed (S-2, S-3) |
| 1. Capability mapping                 | passed | C-01…C-28 mapped with scenarios |
| 2. Architecture and composition reuse | passed | maps above; no parallel owner |
| 3. Behavior                           | passed | V-02, V-04, V-07, V-08, V-12 |
| 4. Presentation and customization     | passed | V-03, V-06, I-01..I-03; golden regenerated |
| 5. Accessibility                      | passed | V-10 |
| 6. Visual and interaction inspection  | passed | V-03, V-05, V-11 |
| 7. Documentation and demo reuse       | passed | flow.mdx `### Groups`; check-docs passes; preview entered and exited in Storybook Docs |
| 8. Regression and reconciliation      | passed | V-01, V-13; `npm run cem`, lint, typecheck (frameworks), 6623 tests, build, test:package, size report, ledger check |

## Documentation synchronization

- [x] `docs/widgets/flow.mdx` follows the tweakpad-docs skill; `check-docs.mjs widgets/flow` passes (new `### Groups` after `### Nodes`; appended sentences only).
- [x] JSDoc covers every new property, event, method, attribute and part (docs build: 0 undescribed rows).
- [x] `elementDependencies` include the composed Breadcrumb.
- [x] Verification fixtures are separate from the page.
- [x] Previews reuse library components.
- [x] Preview code works outside Storybook (inline module, allowed specifiers).

## Completion / handoff

- Change summary: Flow groups encapsulate a subgraph: group ports with inverted-role inner edges, expanded frame and collapsed card, enterable sub-view with Inputs/Outputs terminals and header breadcrumb (`path` lane), ports-only borders with auto-expose, group/ungroup/move/collapse/port commands as single history entries, drop reparent and live growth, resize clamp, keys and menu items, run flattening, `flattenFlowGroups`.
- Actual delivery claim: the groups feature as specified in Widgets §6.3 v0.76.0, verified in the fixture, the docs page and the React/Vue lane matrices.
- Record checker: `check-gates.mjs --stage complete` passes.
- Non-browser checks: lint, `npm run typecheck`, `npx vitest run` (6623 passed), `npm run build`, `npm run test:package`, size report (tp-flow 425 kB gzip, +21 kB), `check-docs`, `check-ledger`.
- Behavior: V-04, V-07, V-08, V-12.
- Accessibility: V-10 (tree, focus, axe); no screen-reader run.
- Visual/customization/motion inspection: V-03, V-05, V-11.
- Documentation and demo composition reuse: gate 7.
- Shared-consumer regressions / package boundaries: V-01; framework lanes; pack smoke flattens a grouped document in Node.
- Framework bindings: regenerated by `npm run cem` (new `path`, `defaultPath`, `onPathChange`, `tp-path-change`, `FlowConnectDetail`); ledger row updated.
- Required failures or blocked checks: none.
- Defects found and fixed during verification: low-detail shells never filled their box (pre-existing, user report); terminal hosts not re-placed after measurement and first fit before measurement; an event-driven first attempt froze the fixture page and was replaced by frame-loop placement; scope settle in `updated()` caused a Lit change-in-update warning.
- Older out-of-scope gaps: a node's number field clamps while typing; in RTL, port-row labels sit at the inline start/end while ports keep their physical sides (panel shape too).
- Changed source revisions / reopened gates: gates 3–8 re-run after the browser fixes.
