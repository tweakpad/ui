# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: shared state-fill motion for every library control that animated a background: Button (tp-button and all TpButton subclasses/compositions), Toggle, Badge/Bubble (interactive), Navigation panel rows, Calendar day/navigation, Switch track, Table rows/cells (shadow and registered native), Attachment root, Questionnaire choice.
- Requested work / claim: library-wide fix of the intermittent one-frame "flash back" of state fills. User instruction 2026-10-06: "this is for all usage on all library", choosing the opacity fill layer (state-to-state color changes may become instant).
- Scope source: user selection "Opacity fill layer (Recommended)" for how the library animates background fills.
- In-scope changes and existing gaps: remove every background-color transition; state fills paint a structural ::before fill layer whose opacity fades. Older component gaps (calendar V-09, navigation, etc.) are untouched and not certified.
- Repository baseline / unrelated changes: b1ae255 (calendar transition:none already committed); untracked bug.mov at root preserved.
- Live project / document IDs and revisions: prj_c5a403a0-d1d5-4487-ac78-f4e545f46483 headOid 8d01eebc2bfe7bfbfd33736cb187aa38c237b738, stateVersion 07005867f98412ba60439d3dadb8099f5661ac53fd077b8e92e69fa157384454, version 0.3.21; Foundation doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1, Component Library doc_8077bf7c-0361-48f3-ac87-53b983bd89b3 read through direct Spec Blocks tools.
- Owning contracts / dependencies / vocabulary: cl-162-hover-fill-transition, cl-162-outline-hover-mix, cl-162-ghost-hover-mix, cl-162-default/secondary/destructive-hover-mix, cl-162-outline-ghost-shared-fill, cl-162-link-unpainted, cl-111-hover-disabled, req-cl-116-selection, req-cl-156-enumerate, req-cl-156-focus, req-cl-71-owned/req-cl-71-dict, req-cl-72-terminal, cl-52-input-hover-layer, tbl-cl-styling-surface-coverage-r8 (opacity not a color substitute), req-cl-55-component, ucl16-toggle-q2, ucl16-switch-q2/q3, tbl-cl-158-r10 (Switch track motion role), ucl22-table-q3, audit-req-126-effects (Foundation reduced motion).
- Local Base UI / Floating UI / shadcn evidence: ../specification/external/ui 63c1308d1 clean; bases/base/ui/button.tsx (transition-all, bg-clip-padding via .cn-button), styles/style-nova.css .cn-button/.cn-sidebar-menu-button (transition-[width,height,padding]).
- External defect evidence: Chrome 154.0.8037.98 composited background-color animations (CompositeBGColorAnimation) can paint the transition start color for one frame at completion; qtoggle/qui PR #52; Chromium background_color_paint_definition.cc GetAnimationIfCompositable. Plain-HTML repro tmp/component-verification/flicker/repro.html: 3 flashes / 20 fades; opacity-layer variant 0 / 20; library main-thread control 0 / 45 vs compositor 3 / 38.
- Tool readiness: direct Spec Blocks MCP available; Chrome DevTools MCP available.
- Browser / server / build under test: Chrome 154.0.8037.98 macOS arm DPR 2; Storybook source http://localhost:6006; Vite http://localhost:5173.
- Evidence directory: `tmp/component-verification/state-fill-layer/run-1/` (investigation evidence in `tmp/component-verification/flicker/`).
- Durable verification fixtures / served URLs: existing Storybook stories (Complete catalog overview, Button, Toggle, Switch, Table, Attachment, Questionnaire, Calendar, Badge); tmp/component-verification/flicker/repro*.html.
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | No library element transitions background or background-color; state fills fade through a structural ::before layer by opacity | req-cl-156-enumerate; external Chrome defect | style-nova .cn-button transition-all (replaced mechanism) | presentation/motion.ts fillLayerCss; recipes/shared/fill.ts | docs/motion.md, docs/styling.md | V-01 V-02 V-12 | pending | audit of all 149 stories found six sources |
| C-02 | Button default/secondary/destructive hover: opaque oklab mix fill over role base, boundary keeps role, fades rest↔hover | cl-162-hover-fill-transition; cl-162-default/secondary/destructive-hover-mix | bases/base/ui/button.tsx variants | components/button.ts structure; recipes/shared/variant.ts | docs/button.md | V-03 V-04 | pending | interpolation path becomes opacity crossfade; endpoints unchanged |
| C-03 | Button outline/ghost hover: translucent color-mix(in oklab, input 50%, transparent) layer over the base fill; outline border retained; ghost no-paint boundary | cl-162-outline-hover-mix; cl-162-ghost-hover-mix; cl-162-outline-ghost-shared-fill | button.tsx outline/ghost | variant.ts fill color | docs/button.md | V-03 V-04 | pending | replaces opaque input/background mix with the specified layer |
| C-04 | Link Button has no fill layer | cl-162-link-unpainted | button.tsx link | button.ts structure suppresses layer for link | docs/button.md | V-03 | pending | |
| C-05 | Disabled controls never show the hover layer; focus indication is not transitioned | cl-111-hover-disabled; req-cl-156-focus | button.tsx disabled:pointer-events-none; focus-visible ring classes | interactive selector excludes disabled; layer transitions opacity only | docs/motion.md | V-04 V-05 | pending | |
| C-06 | Reduced motion makes fill fades instant | cl-162-hover-fill-transition; audit-req-126-effects | none upstream (transition-all only); Foundation reduced-motion policy | motionDuration via --tp-motion-scale | docs/motion.md | V-05 | pending | |
| C-07 | Toggle hover layer; pressed fill distinct and not obscured by hover | ucl16-toggle-q2; cl-111-hover-disabled | toggle.tsx | toggle.ts structure; recipes toggle/core toggle | docs/toggle.md | V-06 | pending | pressed change becomes instant |
| C-08 | Interactive Badge/Bubble hover layer; Badge hit-target pseudo preserved | cl-162 (shared variant recipe); req-cl-71-owned | badge.tsx | components/badge, bubble structure; passive.ts | docs/badge.md | V-07 | pending | Badge hit target moves to ::after |
| C-09 | Navigation panel rows: hover/open/active accent through one fill layer; active change fades without flash | req-cl-116-selection; cl-111 | sidebar.tsx; style-nova .cn-sidebar-menu-button | recipes/shared/navigation-row.ts, navigation-panel.ts | docs/navigation-panel.md | V-01 V-08 | pending | |
| C-10 | Calendar days keep instant selection (b1ae255) and hover never obscures selected/today/range paint; previous/next keep Button hover fade | cl-111-hover-disabled | calendar.tsx | recipes/calendar.ts | docs/calendar.md | V-09 | pending | |
| C-11 | Switch checked track fill fades through the layer; driver claim (data-tp-motion-driven) suppresses the default layer transition; thumb motion unchanged | ucl16-switch-q2/q3; tbl-cl-158-r10 | switch.tsx | components/switch/switch.ts; recipes/switch.ts | docs/switch.md | V-10 | pending | a driver animating the track's own background is covered by the layer when checked (record) |
| C-12 | Table row hover fades on every cell including sticky cells, for shadow and registered native tables; selected rows keep muted fill not inferred from hover | ucl22-table-q3; cl-111 | table.tsx TableRow hover:bg-muted/50 | presentation/families/table.ts structure; recipes/table.ts | docs/table.md | V-11 | pending | selection change becomes instant |
| C-13 | Attachment trigger hover fades through layer; border-color transition kept | cl-111 | registry attachment (Nova cn-attachment-*) | components/attachment structure; recipes/attachment.ts | docs/attachment.md | V-12 | pending | |
| C-14 | Questionnaire choice hover fades through layer; checked fill distinct | cl-111 | no upstream component; library recipe recipes/questionnaire.ts | questionnaire styles; recipes/questionnaire.ts | docs/questionnaire.md | V-12 | pending | checked change becomes instant |
| C-15 | Consumer presentation stays terminal: the layer is overridable via dictionary keys and ::part()::before | req-cl-72-terminal | none upstream (React className); library PresentationDictionary + ::part | public parts unchanged | docs/styling.md | V-13 | pending | |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| --- | --- | --- | --- | --- | --- |
| G-01 | Layer visibility uses opacity 0/1; contract forbids opacity as a color-role substitute and literal state opacity values | all fill consumers | opacity is used only as a binary fade mechanism; layer color always comes from a role or oklab mix | tbl-cl-styling-surface-coverage-r8; req-cl-55-component | pending |
| G-02 | Switch track Motion role driver replacement: default fill now on a pseudo-element of the target | Switch | suppress layer transition under data-tp-motion-driven; record that a driver animating background is covered | tbl-cl-158-r10 | pending |

## Architecture and reuse

- Component folder and responsibility boundaries: structure (layer box, isolation, pointer suppression, transition scoping) in component structural CSS through one helper; dictionary supplies only layer color and visibility per state.
- Supported exports / registration / constituent API impact: none; no new public parts, properties or tokens.
- Public vocabulary / tokens / parts / presentation review: existing roles (accent, input, muted, primary, card, background); oklab mixes; motion through motionDuration/--tp-motion-scale.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| State fill motion structure | button.tsx cn-button transition-all | components/button.ts .control transition; toggle.ts .control | new shared helper fillLayerCss in presentation/motion.ts used by every consumer; Button/Toggle already reserve content above a layer (.control > * z-index 1) | Button, Toggle, Badge, Bubble, Switch, Table, Attachment, Questionnaire / V-01..V-12 |
| State fill appearance | button.tsx variants; style-nova | recipes/shared/variant.ts variantPresentation | shared fill.ts helpers; variant fill color per variant | Button, Toggle, Badge, Bubble / V-03 V-06 V-07 |
| Row paint | sidebar.tsx SidebarMenuButton | recipes/shared/navigation-row.ts, navigation-panel.ts | accent through the layer, single paint target | Navigation panel link/sublink/action/disclosure / V-01 V-08 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Button fill and hover | base / Nova | button.tsx cn-button bg-clip-padding, cn-button-variant-* hover | core/button.ts, shared/variant.ts | layer over padding box; library contract mixes retained | V-03 V-04 |
| Sidebar row | base / Nova | .cn-sidebar-menu-button hover/active/data-open accent | shared/navigation-row.ts | accent layer | V-08 |
| Table row hover | base / Nova | TableRow hover:bg-muted/50, data-[state=selected]:bg-muted | recipes/table.ts | hover via cell layers, selected base fill | V-11 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| All stories | unchanged | no story or demo changes | V-01 | none |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-09; flash regression | Complete catalog sidebar, real hover→click protocol, traced frames | 0 one-frame flashes; background animations absent | not run | Chrome MCP traces + flash detector | pending | |
| V-02 | C-01; audit | all 149 stories, computed transition-property | no element transitions background/background-color/all (library) | not run | Chrome MCP story audit | pending | |
| V-03 | C-02 C-03 C-04; visual | Button variants rest/hover light and dark | hover fills match contract; link no layer | not run | Chrome MCP screenshots + computed ::before | pending | |
| V-04 | C-02 C-03 C-05; interaction | real hover in/out on each variant; disabled | smooth opacity fade; disabled no layer; focus ring immediate | not run | Chrome MCP | pending | |
| V-05 | C-06; motion | reduced motion (--tp-motion-scale 0 / prefers-reduced-motion emulation) | fade instant | not run | Chrome MCP emulate | pending | |
| V-06 | C-07; Toggle | hover, press, pressed+hover | pressed muted distinct; hover layer hidden when pressed | not run | Chrome MCP | pending | |
| V-07 | C-08; Badge/Bubble | interactive badge hover; hit target size | layer fade; hit target unchanged | not run | Chrome MCP | pending | |
| V-08 | C-09; sidebar | hover, open menu trigger, active change | accent single layer; open trigger constant | not run | Chrome MCP | pending | |
| V-09 | C-10; calendar | hover selected/today/range days; select | hover never obscures selection; instant selection | not run | Chrome MCP | pending | |
| V-10 | C-11; switch | toggle checked; motion-driven attribute | track fill fade; thumb unchanged; driven no transition | not run | Chrome MCP | pending | |
| V-11 | C-12; table | hover rows incl. sticky columns; selected rows; native registered table | all cells fade; selected muted | not run | Chrome MCP | pending | |
| V-12 | C-01 C-13 C-14; attachment/questionnaire | hover trigger attachment; hover/check choice | layer fade; checked distinct | not run | Chrome MCP | pending | |
| V-13 | C-15; customization | consumer ::part(button)::before override; dictionary override | override applies | not run | Chrome MCP | pending | |
| V-14 | C-01; regression | vitest, tsc, eslint, stylelint, prettier, build, build-storybook | pass | not run | local commands | pending | |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | pending | |
| I-02 | Default visual regions match traced source and shared library recipes | pending | |
| I-03 | Independent constituent options work, including placement separately from action behavior | pending | |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Live spec headOid 8d01eebc read via direct tools; scope from user selection; shadcn 63c1308d1 clean |
| 1. Capability mapping | passed | C-01..C-15 mapped to contracts and scenarios; G-01/G-02 recorded with resolution |
| 2. Architecture and composition reuse | passed | One structural helper + one appearance helper; six transition sources and their consumers enumerated by runtime audit of 149 stories |
| 3. Behavior | pending | V-04 V-06 V-08..V-12 |
| 4. Presentation and customization | pending | V-03 V-13 |
| 5. Accessibility | pending | focus/disabled semantics unchanged; verify V-04 |
| 6. Visual and interaction inspection | pending | V-01 V-03..V-12 |
| 7. Documentation and demo reuse | pending | docs/motion.md, docs/styling.md |
| 8. Regression and reconciliation | pending | V-02 V-14 |

## Documentation synchronization

- [ ] Base example, actual Controls, constituent APIs and reference agree with code.
- [ ] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [ ] Verification fixtures are separate from curated public examples.
- [ ] Rendered and copyable compositions reuse existing components.
- [ ] Imports and registration work outside Storybook's global setup.
- [ ] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary: pending
- Actual delivery claim: pending
- Record checker: pending
- Non-browser checks: pending
- Behavior: pending
- Accessibility: pending
- Visual/customization/motion inspection: pending
- Documentation and demo composition reuse: pending
- Shared-consumer regressions / package boundaries: pending
- Required failures or blocked checks: pending
- Older out-of-scope gaps: not certified
- Changed source revisions / reopened gates: pending
