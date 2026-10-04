# Resizable panel group implementation record

## Delivery and source record

- Requested work / claim: complete Resizable panel group and constituents against live and pinned upstream requirements.
- Scope source: user explicitly listed Resizable Panel Group in the full missing-controls implementation request, requiring shared behavior/theme and preservation of working controls.
- Fresh direct MCP reads: Foundation sec-1916-resizable-panels, Library ucl21-resizable-panels, controlled-state/part/lifecycle dependencies; 2026-10-04. Existing task edits preserved; pinned local references in ../audit.md.
- Source: local shadcn base/ui/resizable.tsx imports react-resizable-panels, NOT Base UI. Local lockfile pins4.5.8; no installed source exists. Published4.5.8 npm types and source map inspected under tmp/component-verification/resizable-panel-group/reference-4.5.8/; no runtime installed and supplied checkouts unchanged. Exact integrity sha512-X2S5YoYWbjd7Ove6e6T/kzOrjiUD6ccz55a+XW0H3JXbrPb+Gmz7YRAJy4ysOkua/U5jSOG9SoySbebMBjtQJQ==. Foundation governs stronger controlled, preservation, disabled, diagnostic and persistence requirements. Floating not involved in layout constraints. Current web main has newer preview API absent pinned4.5.8; do not silently mix versions.
- Presentation source: base wrapper and Nova cn-resizable-handle-icon (h6/w1/rounded-lg); common theme geometry, border and focus. Interactive handle is distinct from TpSeparator.
- Existing display.ts implementation hardcodes handle locations at equal percentages, writes unrelated pixel pairs, lacks constraints/capture/cleanup/complete keyboard/API. Replace this one owner; preserve legacy native direct-child composition through the same controller.
- Evidence local only; direct Spec Blocks and Chrome MCP available. Native cancellation/coarse-pointer injection unavailable, remains explicitly blocked if required.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Group/Panel/Separator direct-child composition, nested groups, deterministic IDs | sec-1916-resizable-panels; ucl21-resizable-panels | Group/Panel/Separator and shadcn base/ui/resizable.tsx | TpResizablePanelGroup, TpResizablePanel, TpResizableHandle; legacy native-panel composition uses same owner | docs/resizable-panel-group.md | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-02 | Horizontal default, vertical, RTL and accurate moving separator geometry | sec-1916-resizable-panels; ucl21-resizable-panels | Group orientation; onDocumentPointerMove | One group layout owner, measured separator extents and native flex, axis-correct separator ARIA | docs/resizable-panel-group.md | V-01 V-03 | blocked | Implementation and documented API reconciled; observed results in V-01, V-03. Native-input validation remains blocked. |
| C-03 | Units: numeric pixels, unitless strings percentages, %,px,em,rem,vh,vw; missing defaults distributed | sec-1916-resizable-panels; ucl21-resizable-panels | parseSizeAndUnit/sizeStyleToPixels/calculateDefaultLayout | Panel defaultSize/minSize/maxSize; group sizes ordered values/defaultLayout identity percentage record; shared component unit converter | docs/resizable-panel-group.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-04 | Bounded redistribution, frozen disabled panels, collapse domain and infeasible diagnostic | sec-1916-resizable-panels; ucl21-resizable-panels | adjustLayoutByDelta/validatePanelSize + Foundation stronger infeasibility/disabled rules | One constraint solver for initial/pointer/keyboard/API/resize; preserve bounds and publish tp-diagnostic on infeasible extents | docs/resizable-panel-group.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-05 | One atomic controlled/default lane; cancellation/no-ack leaves all panels unchanged | sec-1916-resizable-panels; ucl21-resizable-panels | Foundation controlled sizes; ControllableState | sizes/defaultSizes, onSizesChange/tp-value-change via shared state owner; no per-panel commit lanes | docs/resizable-panel-group.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-06 | Live and settled layout callbacks; drag settles once; same final layout | sec-1916-resizable-panels; ucl21-resizable-panels | Group onLayoutChange/onLayoutChanged | onLayoutChange/onLayoutChanged and tp-layout-change/tp-layout-changed; ordered unit proposal separate from committed layout notifications | docs/resizable-panel-group.md | V-03 | blocked | Implementation and documented API reconciled; observed results in V-03. Native-input validation remains blocked. |
| C-07 | Pointer target fine/coarse, capture, selection/cursor cleanup, disabled/cancel/removal | sec-1916-resizable-panels; ucl21-resizable-panels | calculateHitRegions/onDocumentPointerDown/Up/updateCursorStyle | resizeTargetMinimumSize default source10/20 functional input geometry; disableCursor; native capture lifecycle in group; both generated/authored handles reuse owner | docs/resizable-panel-group.md | V-03 | blocked | Implementation and documented API reconciled; observed results in V-03. Native-input validation remains blocked. |
| C-08 | Axis arrows, positive keyboard step1, Home/End, Enter collapse, F6 cycling | sec-1916-resizable-panels; ucl21-resizable-panels | onDocumentKeyDown; Foundation step override | keyboardStep; handle.target adjacent identity, disabled; native interactive separator with current/min/max/controls | docs/resizable-panel-group.md | V-03 V-04 | blocked | Implementation and documented API reconciled; observed results in V-03, V-04. Native-input validation remains blocked. |
| C-09 | Double activation resets associated default, independently disable reset | sec-1916-resizable-panels; ucl21-resizable-panels | onDocumentDoubleClick; Foundation opt-out | disableDoubleClickReset on group/handle; restore associated Panel declared default | docs/resizable-panel-group.md | V-03 | blocked | Implementation and documented API reconciled; observed results in V-03. Native-input validation remains blocked. |
| C-10 | Imperative group get/set layout and panel collapse/expand/get size/isCollapsed/resize | sec-1916-resizable-panels; ucl21-resizable-panels | getImperativeGroupMethods/getImperativePanelMethods | Element methods reuse same normalized proposal path; expanded-size memory by stable identity | docs/resizable-panel-group.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-11 | Container resize relative/pixel policy, at least one relative panel | sec-1916-resizable-panels; ucl21-resizable-panels | Foundation stronger preservation policy | Panel resizeBehavior relative(default)/preserve-pixel-size; diagnose all-fixed; never resize disabled panels | docs/resizable-panel-group.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-12 | Persistence injected adapter, stable key/IDs, restore before uncontrolled commit, controlled never overwritten | sec-1916-resizable-panels; ucl21-resizable-panels | useDefaultLayout/getStorageKey + Foundation consumer-adapter rule | persistenceKey/persistenceAdapter load/save, async lifetime guards, no localStorage policy; reject invalid persisted values deterministically | docs/resizable-panel-group.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-13 | Dynamic add/remove/reorder/reconnect and cleanup | sec-1916-resizable-panels; ucl21-resizable-panels | mountGroup registration; Foundation lifecycle | slot and property changes recompute using identity cache; release handles/capture/listeners/observer/cursor on detach | docs/resizable-panel-group.md | V-01 V-03 | blocked | Implementation and documented API reconciled; observed results in V-01, V-03. Native-input validation remains blocked. |
| C-14 | Shared presentation, independent optional handle decoration, hooks and themes | sec-1916-resizable-panels; ucl21-resizable-panels | base/ui/resizable.tsx + Nova cn-resizable-handle-icon | withHandle on each actual handle and implicit default; shared border/radius/space/focus/motion recipe; no decorative Separator substitution | docs/resizable-panel-group.md | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-15 | Complete docs and source examples including nested/control/collapse/persistence | sec-1916-resizable-panels; ucl21-resizable-panels | base/examples/resizable-example.tsx | Authored base/nested/workspace examples with actual controls and full API table, source/generator/export updates | docs/resizable-panel-group.md | V-05 | passed | Implementation and documented API reconciled; observed results in V-05. |
| C-99 | Native browser media/accessibility and applicable native-input or SSR verification | Shared Foundation accessibility/motion/lifecycle contract; skill verification procedure | Shared native platform and component source tests recorded above | Existing shared owners; no simulated platform substitute | Component docs and ../verification-results.md | V-98 V-99 | blocked | Implementation remains in scope; verification requires capabilities not exposed by registered tools. |

## Architecture and reuse

One folder, group/constituents/solver/types. The existing owner is replaced, not accompanied by a second resize implementation. Stateful sizes use ControllableState; group commits all panel pixels together, with derived percentage layout and native flex geometry. Identity cache preserves removed/reordered state. Actual Panel and Handle are registered constituent elements, not separate catalog entries. Native legacy panels are deliberate supported interoperability, not visual substitutes.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Layout and input | shadcn wrapper→react-resizable-panels Group/Panel/Separator global layout | display.ts TpResizablePanelGroup | Extract/replace one deficient owner, share it across constituents and legacy composition; no standalone decorative Separator reuse | all group examples V-01 V-03 |
| Controlled proposals | Foundation atomic sizes | ControllableState and TpValueChangeEvent | One array lane; committed layout callbacks only after accepted publication; initial dynamic repairs remain constraint-valid | V-02 |
| Persistence/lifecycle | useDefaultLayout/mountGroup | NavigationPanel provider investigated | Adapter API pattern reused; group-specific identity layout payload and first-commit requirement cannot share boolean preference owner | V-02 |
| Theme/parts | shadcn/Nova | PresentationController/renderPart | Same canonical part dictionary, structure only in native layout | V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Group/Panel | base/Nova | resizable.tsx native flex | existing Group with native panel layout | constrain measured pixels, no local visual card/control | V-01 V-04 |
| Interactive separator and optional decoration | base/Nova | cn-resizable-handle and cn-resizable-handle-icon | common border/ring/spacing/radius | hairline separator, independent withHandle, functional coarse/fine target minimum; do not use decorative Separator | V-03 V-04 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Nested workspace | actual group/panel/handle, action buttons | same Group constituents and TpButton | V-01 V-05 | native text/layout only |
| Legacy native panels | authored content wrappers | same Group owner | V-01 | explicit existing interoperability, canonical part registration |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-02 C-13 | Nested/direct/legacy/RTL/vertical/dynamic geometry | Stable identity, current handles, correct native layout | Nested horizontal/vertical, direct and legacy layouts inspected. Three-panel reorder preserves identity20/50/30; removal repairs70/30 and handle membership. | Chrome MCP | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-02 | C-03 C-04 C-05 C-10 C-11 C-12 | Mixed units, controlled rejection, collapse, infeasible bounds, disabled sizes, resize, async persistence | Same solver and atomic commit, preserved bounds and ownership | Controlled no-ack rejects, accepted50/50 commits, vetoed60/40 stays50/50 without replay. Fixed150px policy survives resize; disabled freezes size; async persistence commits once after resolution. Six constraint tests pass. | focused solver tests plus Chrome public API | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-03 | C-06 C-07 C-08 C-09 C-13 | Real pointer drag/keyboard/reset, capture/cursor/selection cleanup, input disable | Accurate boundary, one settled notification, no leaked gesture | Real drag, Home/End/Enter and arrows move actual separator with one settled event; cursor style released. RTL and vertical keys move1px. Native pointercancel/coarse multitouch input unavailable. | Chrome MCP | blocked | See execution appendices and ../verification-results.md. Remaining physical-input boundary recorded in V-99. |
| V-04 | C-08 C-14 | AX/axe, theme/light/dark/RTL, parts/dictionary, optional handle | Native named separator and shared source paint | Named separator orientation/min/max and ariaControlsElements inspected; axe0. Light base5 handle5x30, optional decoration, canonical delegate/ref/dictionary preserving role/layout checked. | Chrome MCP | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-05 | C-15 | API/docs/controls/source/registration/exports | Complete reference-facing surface and real examples | Authored nested/controlled/collapsible APIs and source composition; public constituents and built exports pass. | static/build/Chrome | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-98 | C-99; native media/accessibility | OS forced-colors and applicable OS reduced-motion policy | Correct native high-contrast and media behavior | Registered Chrome MCP has no forced-colors or OS reduced-motion control. Explicit component reduce policy was tested separately where applicable. | Registered tool schema inspection | blocked | No CSS pseudo-state or matchMedia mock is accepted as native media evidence. |
| V-99 | C-99; native input/runtime | Required physical-input or SSR boundary | Native platform behavior verified without simulation | Native pointer cancellation and coarse/multiple touch input are unavailable in registered Chrome MCP. | Registered Chrome MCP schemas and current runtime inventory | blocked | Source/API evidence does not substitute for this required execution. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners actually adopted, duplicate removed | passed | Old display.ts resize class removed; actual Panel/Handle and native legacy path share one Group, solver and ControllableState |
| I-02 | Sourced representative render and shared recipe | passed | Chrome61 dark horizontal25/75 screenshot: actual native flex, hairline separator and independent Nova decoration using shared tokens |
| I-03 | Independent constituents and placement | passed | Chrome61 per-panel min15/30 reflected handle max70; API resize40%, collapse0%, expand40%; withHandle false removes decoration and preserves panel/layout; ariaControlsElements resolves actual sidebar across shadow boundary |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh live contracts and pinned imported owner traced; exact npm source map rather than replacing supplied refs |
| 1. Capability mapping | passed | Complete constituent properties/methods/events/constraints/units/input/cleanup/persistence/theme/docs mapped; Foundation adaptations explicit |
| 2. Architecture and composition reuse | passed | One extracted resize owner, actual shared ControllableState, native legacy compatibility, decorative Separator preserved |
| 3. Behavior | blocked | Observed behavior in V rows and execution appendices. Required native-input/runtime evidence remains V-99 blocked. |
| 4. Presentation and customization | passed | Shared recipes, theme overrides and applicable actual part/ref/delegate/dictionary checks pass; source and visual evidence in V rows. |
| 5. Accessibility | blocked | Native AX, real keyboard and local axe checks recorded; forced-colors browser inspection V-98 cannot be emulated with registered tools. |
| 6. Visual and interaction inspection | blocked | Light/dark/RTL/density and relevant optional states inspected; OS media/forced-colors V-98 remains blocked. |
| 7. Documentation and demo reuse | passed | Authored API documentation, copyable source and actual public nested controls reconciled; full Storybook build passes. |
| 8. Regression and reconciliation | blocked | Focused regressions, lint/type/build, served built package and documentation pass. Complete-component certification remains blocked by explicit V-98/V-99 evidence boundaries. |

## Completion / handoff

Active full scope. No completion claim.


## Execution evidence

Chrome61 early render:25/75, actual149.25/447.75px panels plus1px separator in598px content. API40%→collapse0→expand40 preserved identity; independent handle decoration omitted; ariaControlsElements references actual light-DOM sidebar across shadow. Real drag constrained to70/30 with one live and one settled notification, separator x equaled panel right444.492, drag style removed. Found and fixed pointer focus (upstream explicitly focuses separator): real click/Home collapsed with separator focus; Enter restored25%, ArrowRight added1px. Controlled30/70 rejected no-ack resize, accepted synchronous50/50, vetoed60/40 including synchronous owner write, and retained50/50 after another measurement (internal sync uses automatic comparison to avoid replaying consumed canceled input).

Chrome55 authored nested Storybook screenshot: horizontal and vertical actual Group composition; AX named separators report perpendicular orientations/current/min/max. Real vertical ArrowDown moved65→65.262467%; RTL horizontal ArrowLeft moved25→25.103627%, both1px. Light shared spacing5 gave decoration5x30px; per-constituent part color override applied; axe0 component violations. Chrome61 container600→800 preserved150px fixed-policy panel; disabling it preserved150px through50/50 setLayout. Async persistence had0 commits before resolution, then exactly40/60 commit and same saved identity layout. Legacy3-panel layout20/30/50 placed handles x120/300; reorder preserved identity20/50/30 and removal repaired70/30 with1 handle.

Six focused constraint tests initially passed. Tightened infeasible reporting for a disabled panel whose new bounds exclude its frozen size; the test expectation is updated to require the diagnostic rather than silently calling that layout feasible. Final rerun pending. Native pointer cancellation/coarse multi-touch still lacks direct tool support. Matrices remain active, no complete-component claim.

Final focused constraint solver rerun: all six tests passed after correcting the assertion for the newly infeasible disabled-panel bounds; no production solver change was needed for that assertion.

## Reconciled execution status — 2026-10-04

Implementation and documentation for this workstream are delivered. The scenario table above supersedes earlier prospective statements below/above that say implementation or final checks are pending. Required unavailable browser/runtime evidence remains explicitly blocked; no full conformance claim is made. See [final verification results](../verification-results.md) for shared fixes, commands, package evidence and tool boundaries.
