# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Drawer, Side Panel, Navigation Panel and every default motion-bearing control
- Requested work / claim: User-requested shared corner and animation normalization within active whole-library goal
- Scope source: 2026-10-04: review drawers, sidebars, panels and normalize animations for all controls
- In-scope changes and existing gaps: Shared exposed-edge radii, timing/reduced-policy recipes, existing surface behavior; independent broader capability/source gaps remain in library-completion records
- Repository baseline / unrelated changes: Initial a6504d5; HEAD advanced externally to 1ed44dd during the pass. Existing Avatar/ListItem/AspectRatio work was preserved; no agent commit/staging/reset.
- Live project / document IDs and revisions: project prj_c5a403a0-d1d5-4487-ac78-f4e545f46483, Foundation doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1, Library doc_8077bf7c-0361-48f3-ac87-53b983bd89b3; head8440bff24a97dbbc5c762ebf4bd6baa958b305e1
- Owning contracts / dependencies / vocabulary: sec-cl-15-motion-surfaces; sec-64-motion-requests-and-drivers; audit-sec-126-reduced-motion-policy; ucl19-drawer/side-panel; ucl23-navigation-panel
- Local Base UI / Floating UI / shadcn evidence: local ui63c1308 base/ui/drawer,sheet,sidebar and style-nova.css; BaseUI5b495488 Dialog/Drawer family; no upstream modification
- Tool readiness: Both registered tools available
- Browser / server / build under test: Chrome page76; existing localhost6006 and5173
- Evidence directory: `tmp/component-verification/surface-motion-normalization/2026-10-04/`
- Durable verification fixtures / served URLs: Existing dialogs package/source fixtures and current Storybook Docs; scoped actual-component probes via Chrome MCP
- Evidence availability to the next agent: Local workspace evidence only

## Capability and interface mapping

Use one row per capability, not merely one row per component. Include properties,
attributes, defaults, methods, events/cancellation, slots/parts, state hooks,
composition, behavior, accessibility, presentation and customization.
Include the exact constituent and source symbol, its defaults and independently
configurable options. Do not merge placement, visibility and action semantics into
one "actions" row. Every C-ID must link to existing V-IDs. Before implementation,
the mapping must be complete even though implementation/test statuses are pending.

| ID   | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ---------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | One timing source, named properties only, immediate focus | motion scoping/reduced policy | Base controls/Nova timing presets | presentation/motion helpers for every default transition/ambient declaration | docs/motion.md | V-01 | passed | All production transition and animation declarations route through shared constructors or explicit suppression. Feedback uses fast; surface/layout uses normal; no blanket transition. Source inventory and computed Chrome timing. |
| C-02 | Docked free-edge and floating surface corners agree | user normalization; presentation contract | drawer/sheet/sidebar Nova | shared edge-surface recipe consumed by three owners | docs/styling.md | V-02 | passed | Drawer and SidePanel: 16 edge/direction combinations match exposed-edge 10px radii; Navigation: 12 variant/side/direction combinations match, floating all10px and inset content10px. Scoped radius18px updates floating corners. Built compact Drawer matches0/10/10/0. |
| C-03 | Equivalent anchored surface entry/exit | sec-cl-152-anchored-motion | Base positioning and popup owners | Select reuses anchoredPresenceAppearance; geometry exceptions explicit | docs/motion.md | V-03 | passed | Menu and Popover use opacity/transform280ms; ordinary Select uses shared transform with no separate scale and keyboard selection succeeds. Built inline/item-aligned Select transforms remain none. Built NavigationMenu click Learn then hover Tools replaces content with shared280ms viewport/positioner timing; screenshot inspected. |
| C-04 | Direction/gesture/focus/lifecycle preserved | Presence and Drawer contracts | Base Drawer/Sheet | Existing Dialog/gesture ownership, SidePanel full-edge slide | docs/motion.md | V-04 | passed | Real Dialog and nested AlertDialog Escape restores inner then outer trigger focus. Close/reopen/close finishes with no inert residue. Real compact Navigation toggle/Escape restores toggle. Drawer release recipe at strength0.5 yields140ms surface and backdrop; claimed drivers suppress CSS and complete both roles. Gesture recipe probe is presentation evidence, not a real drag claim. |
| C-05 | Ambient/feedback share theme policy | closed role inventory/reduced motion | Spinner/Skeleton/Progress | Existing prepareMotion, shared timing and play state | docs/motion.md | V-05 | passed | Built scoped normal500ms/fast100ms yields Spinner/Progress2s, Skeleton4s and Switch100ms. Explicit reduce pauses Spinner/Skeleton and suppresses Progress/Switch motion; panel matrix settles at0s. Drawer driver claims backdrop/surface and closes. Native OS media behavior not claimed. |
| C-06 | Existing role/API boundaries preserved | closed motion inventory | source role adaptation | No invented role or new public property | docs/motion.md | V-06 | passed | ESLint and Stylelint pass; TypeScript passes; focused Presence/Motion/Presentation/Drawer geometry/Toast gesture suites pass26 tests. Production and Storybook builds pass; git diff --check passes. Built Navigation modal and Select geometry cases verified. No public role/API/token additions. |

Record spec/upstream conflicts here before dependent implementation:

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |

For catalog-wide work, also reconcile every upstream identity with a catalog,
composition or Foundation exposure, evidence and any gap. Attach/reference that
inventory; matching names or catalog totals do not prove coverage.

## Architecture and reuse

- Component folder and responsibility boundaries: Retain existing Dialog/Drawer/SidePanel and Foundation Presence/gesture owners; centralize default timing and edge-corner presentation without new public attributes
- Supported exports / registration / constituent API impact: No public API, export, registration or role additions
- Public vocabulary / tokens / parts / presentation review: Existing radius-lg for surface corners; duration-fast for feedback, duration-normal for surfaces/layout, easing-standard and motion-scale; shared ambient cadence uses existing duration role

### Family dependency map

Trace upstream reexports/imports to implementation owners and inspect corresponding
local components. Name both the old owner and the planned shared owner if extracting
one; list the actual consumers that will use it. Low-level utility reuse alone is
insufficient. For a primitive without family dependencies, record the inspected
sources and concrete reason instead of omitting this map.

| Responsibility | Upstream dependency path / symbol          | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Overlay lifetime | Base Drawer/Sheet delegate Dialog | TpDialog, PresenceController, prepareMotion | Preserve state/focus/gesture owners; only existing motion defaults change | Dialog/Drawer/SidePanel/NavigationPanel; V-04 |
| Motion timing and shape | Base and Nova CSS definitions | scattered default recipes and existing anchoredPresenceAppearance | One default timing constructor, one exposed-edge recipe; existing component-specific movement retained | all current motion-bearing controls; V-01,V-02,V-03,V-05 |

### Presentation source map

Follow the selected registry base and preset through external stylesheets, tokens
and responsive selectors. Map every meaningful region to a library component or
recipe. Record contract/theme adaptations and absent optional regions explicitly.
For a change without presentation impact, document the dependency evidence here.

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Docked/floating surfaces | base/Nova | drawer-popup rounded exposed edge; Sheet square; sidebar floatinglg/insetxl | Drawer, SidePanel, NavigationPanel recipes | User requests normalization: radius-lg for all free surface corners, viewport edge stays flush | V-02 |
| Default transitions/ambient | base/Nova with live contract | registry controls and styles; existing token set | presentation/motion and anchoredPresenceAppearance | Normalize timing and policy, no arbitrary local curves or spacing props | V-01,V-03,V-05 |

### Implementation and composition reuse map

List nested UI roles in component internals, stories, docs, snippets and fixtures.
Use existing library components; record the contract or deliberate test purpose
for native anatomy that could otherwise look like a substitute.

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Actual component fixtures | Buttons, surfaces and menu rows | Existing public library components | Source and built registration | Native layout is only a fixture shell |

## Verification scenarios

Plan all applicable requirements/states and interacting combinations before
implementation; add newly discovered cases. Status vocabulary: `pending`,
`passed`, `failed`, `blocked`, `not applicable`. Non-applicability requires
source/capability evidence. Tool limitations are blocked, not passed or N/A.

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01; source/presentation | Inventory default motion and inspect computed timing | Shared timing, policy and named properties | All production transition and animation declarations route through shared constructors or explicit suppression. Feedback uses fast; surface/layout uses normal; no blanket transition. Source inventory and computed Chrome timing. | Chrome DevTools MCP page76, source audit, build logs; details below | passed | All default owners |
| V-02 | C-02; visual | Four physical edges, logical RTL and navigation variants | Shared exposed-edge radius follows theme | Drawer and SidePanel: 16 edge/direction combinations match exposed-edge 10px radii; Navigation: 12 variant/side/direction combinations match, floating all10px and inset content10px. Scoped radius18px updates floating corners. Built compact Drawer matches0/10/10/0. | Chrome DevTools MCP page76, source audit, build logs; details below | passed | Normalized corners |
| V-03 | C-03; anchored | Menu/Select/Popover/NavMenu and inline/aligned mode | Shared popup appearance without doubled transforms | Menu and Popover use opacity/transform280ms; ordinary Select uses shared transform with no separate scale and keyboard selection succeeds. Built inline/item-aligned Select transforms remain none. Built NavigationMenu click Learn then hover Tools replaces content with shared280ms viewport/positioner timing; screenshot inspected. | Chrome DevTools MCP page76, source audit, build logs; details below | passed | Geometry exceptions |
| V-04 | C-04; behavior | Trigger/Escape/reversal and gesture outputs | Correct state/focus/lifecycle/placement | Real Dialog and nested AlertDialog Escape restores inner then outer trigger focus. Close/reopen/close finishes with no inert residue. Real compact Navigation toggle/Escape restores toggle. Drawer release recipe at strength0.5 yields140ms surface and backdrop; claimed drivers suppress CSS and complete both roles. Gesture recipe probe is presentation evidence, not a real drag claim. | Chrome DevTools MCP page76, source audit, build logs; details below | passed | Existing owners |
| V-05 | C-05; customization | Scoped durations, reduce policy and driver | Shared policy stops/settles motion | Built scoped normal500ms/fast100ms yields Spinner/Progress2s, Skeleton4s and Switch100ms. Explicit reduce pauses Spinner/Skeleton and suppresses Progress/Switch motion; panel matrix settles at0s. Drawer driver claims backdrop/surface and closes. Native OS media behavior not claimed. | Chrome DevTools MCP page76, source audit, build logs; details below | passed | Native OS media needs separate evidence |
| V-06 | C-06; regression | Audit, type/lint/tests/build, docs | No API/role additions, all defaults mapped | ESLint and Stylelint pass; TypeScript passes; focused Presence/Motion/Presentation/Drawer geometry/Toast gesture suites pass26 tests. Production and Storybook builds pass; git diff --check passes. Built Navigation modal and Select geometry cases verified. No public role/API/token additions. | Chrome DevTools MCP page76, source audit, build logs; details below | passed | Whole-library goal remains active |

Record viewport, theme, direction, motion conditions and relevant browser features
for visual/interaction rows. Record what was visually inspected as well as the
screenshot path. Distinguish API evaluation, real input, accessibility tree,
automated analysis and screen-reader evidence. Do not reuse stale passes after
changes that affect them.

## Early integration checkpoint

Complete after the first integration, before exhaustive browser verification.
Inspect the actual diff and first rendered composition; do not infer these passes
from planned architecture, tokens, utility imports or accessibility results.

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Initial integration observations below: actual shared consumers, surface corners/timing and real triggers/Escape inspected. |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | Initial integration observations below: actual shared consumers, surface corners/timing and real triggers/Escape inspected. |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | Initial integration observations below: actual shared consumers, surface corners/timing and real triggers/Escape inspected. |

## Gate record

Keep every gate, including pending later gates. Replace the exit descriptions with
concrete evidence when passing them. Any failed dependency reopens affected gates.
Use `not applicable` only with contract/scope evidence, never for an unimplemented
requirement. Run the checker with `--stage implement`, then `verify`, then `complete`
at the work boundaries specified in SKILL.md.

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed | Fresh authority and explicit delivery boundary.                                       |
| 1. Capability mapping                 | passed | Complete applicable matrix; dependent semantic gaps resolved.                         |
| 2. Architecture and composition reuse | passed | Family dependencies, actual local owners, full presentation sources and reuse mapped. |
| 3. Behavior                           | passed | Real Dialog and nested AlertDialog Escape restores inner then outer trigger focus. Close/reopen/close finishes with no inert residue. Real compact Navigation toggle/Escape restores toggle. Drawer release recipe at strength0.5 yields140ms surface and backdrop; claimed drivers suppress CSS and complete both roles. Gesture recipe probe is presentation evidence, not a real drag claim. |
| 4. Presentation and customization     | passed | Drawer and SidePanel: 16 edge/direction combinations match exposed-edge 10px radii; Navigation: 12 variant/side/direction combinations match, floating all10px and inset content10px. Scoped radius18px updates floating corners. Built compact Drawer matches0/10/10/0. Built scoped normal500ms/fast100ms yields Spinner/Progress2s, Skeleton4s and Switch100ms. Explicit reduce pauses Spinner/Skeleton and suppresses Progress/Switch motion; panel matrix settles at0s. Drawer driver claims backdrop/surface and closes. Native OS media behavior not claimed. |
| 5. Accessibility                      | passed | Real nested modal and navigation focus/Escape inspected; names and roles inspected in Chrome tree. axe WCAG2A/AA/2.1AA: zero violations on built Navigation/actual component probe. No screen-reader claim. |
| 6. Visual and interaction inspection  | passed | Drawer and SidePanel: 16 edge/direction combinations match exposed-edge 10px radii; Navigation: 12 variant/side/direction combinations match, floating all10px and inset content10px. Scoped radius18px updates floating corners. Built compact Drawer matches0/10/10/0. Menu and Popover use opacity/transform280ms; ordinary Select uses shared transform with no separate scale and keyboard selection succeeds. Built inline/item-aligned Select transforms remain none. Built NavigationMenu click Learn then hover Tools replaces content with shared280ms viewport/positioner timing; screenshot inspected. |
| 7. Documentation and demo reuse       | passed | Shared policy documented in motion.md and styling.md; SidePanel docs corrected. No new APIs, story variants, or demo substitutes. |
| 8. Regression and reconciliation      | passed | ESLint and Stylelint pass; TypeScript passes; focused Presence/Motion/Presentation/Drawer geometry/Toast gesture suites pass26 tests. Production and Storybook builds pass; git diff --check passes. Built Navigation modal and Select geometry cases verified. No public role/API/token additions. |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup.
- [x] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary: Shared default timing constructors for all current motion-bearing controls and exposed-edge corner recipe for Drawer, SidePanel and NavigationPanel. Select adopts anchored presence; Dialog backdrop exits share Presence lifetime; focus ring remains immediate.
- Actual delivery claim: The requested default corners/motion normalization. This does not certify unrelated component capability completeness or finish the broader library goal.
- Record checker: implement, verify and complete checks passed after final reconciliation.
- Non-browser checks: TypeScript, ESLint, Stylelint,26 focused unit tests, production build, Storybook build and diff check passed. Builds logged under the evidence directory. Storybook emits its existing chunk-size warning.
- Behavior: Real pointer/keyboard checks and separate API/reversal/driver probes are distinguished in V-03/V-04.
- Accessibility: Chrome semantic tree and real focus restoration; built fixture axe WCAG2A/AA/2.1AA zero violations. No screen-reader or native OS reduced-motion claim.
- Visual/customization/motion inspection: V-02/V-03/V-05; dark floating navigation and anchored Tools screenshots viewed inline, actual SidePanel screenshot viewed earlier. Geometry/radii checked across logical edges/RTL. Browser screenshots could not be saved to the requested workspace path because the MCP server rejects that root; inline images remain in the conversation.
- Documentation and demo reuse: Existing docs updated for shared timing/corners. All probes compose registered library components; no new public examples or surrogate controls.
- Shared-consumer regressions / package boundaries: Built Navigation compact Drawer trigger/Escape, Select inline/item-aligned modes, activity/feedback tokens and claimed Drawer drivers verified. Existing shared owners retained.
- Required failures or blocked checks: No observed failures in the scoped checks. Native OS motion media cannot be emulated by the registered tool schema and was not verified; explicit public reduce policy was verified separately. No real drag claim is made from the release-style probe.
- Older out-of-scope gaps: Whole-library capability review remains active, including Attachment source/copy discrepancies. This pass addresses corners and animation defaults.
- Changed source revisions / reopened gates: External HEAD advancement noted above; final builds include current work. No commits made by the agent.

## Initial integration observations

Source scan shows all finite default transitions now use presentation/motion.ts; Spinner/Skeleton/Progress cadence uses the same ambient constructor. Foundation state, Presence, gesture and driver controllers remain unchanged. Native dynamic geometry is not replaced by theme constants. Select ordinary anchored mode now composes the shared anchoredPresenceAppearance; inline and item-aligned modes retain their geometry policy. Corner recipe is shared by Drawer, SidePanel and NavigationPanel; attached viewport edges stay square and exposed edges use radius-lg, with floating/inset radius-lg.

Chrome76 actual Open Drawer and Escape, then Open Side panel: both inline-end surfaces have10/0/0/10 corner radii and0.28s easing-standard motion. SidePanel retains opacity1 and now slides its full edge extent. Screenshot shows rounded exposed edge and flush attached edge. Default overlay/focus owners remain Dialog. An initial direct open-property probe did not open the uncontrolled fixture; actual triggers are the valid evidence. No changed APIs. This first integration permits the expanded motion/edge matrix; default Dialog's instant-exit exception was identified here and subsequently removed and verified in V-04.

Expanded normalization decisions: default Dialog/AlertDialog backdrop exit used a separate instant-completion branch. Remove that exception and redundant Drawer/SidePanel overrides so every existing backdrop role settles through the same Presence owner; no new Dialog surface role or driver API. Slider focus shadow becomes immediate by removing box-shadow from transitions. Drawer/Toast release duration now derives from their already-published strength through shared motionDuration; active dragging still suppresses transitions. Drawer uses its inverse-strength factor and Toast uses1-normalizedStrength, bounded by0.1. These preserve the live gesture contract rather than imposing a fixed animation on direct manipulation. Recheck shared Dialog focus restoration and rapid reversal as well as panel visuals.
