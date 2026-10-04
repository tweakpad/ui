# Input Group implementation record

## Delivery and source record

- Requested work / claim: complete Input Group composition and shared boundary within the full library completion.
- Scope source: user's explicit Input Group complaint and requirements for one shared implementation, theme spacing and working-control preservation.
- Sources: live Library ucl17-input-group read fully through direct MCP, Foundation Input/Button/composition contracts. IDs, clean reference pins and baseline in ../audit.md.
- Source chain: shadcn bases/base/ui/input-group.tsx imports actual Button/Input/Textarea; input-group-example.tsx includes addon, button, Tooltip/Menu/Popover, KeyHint and textarea header/footer compositions. Nova cn-input-group*, especially input/textarea border/background/ring suppression and four logical addon positions. No separate Base UI/Floating owner: editor/press/floating semantics belong to existing components.
- Existing implementation: forms.ts TpInputGroup already composes editors and inherits un-authored Button size/variant. Preserve that owner; extract its folder and repair composition rather than create another Input/Button implementation.
- Design: actual Input/Textarea/native editor retains value/forms/selection/IME. Group registers its canonical control part on the current native editor, observes only actual composition/state changes, owns boundary/ring, and cleans up when removed. Existing Button action defaults preserved; disabled/readOnly editor never disables independent actions. Slots expose all four edges; prefix/suffix compatibility preserved.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Exactly one editor; Input/Textarea/native editing and form ownership retained | ucl17-input-group; cited Input/Button/composition | InputGroupInput/Textarea import actual controls | Existing TpTextControl; diagnose missing/multiple editor; observe replacement | docs/input-group.md; src/stories/input-group.stories.ts | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-02 | Root owns border/focus/invalid indication; editor standalone paint suppressed in all states | ucl17-input-group; cited Input/Button/composition | Nova cn-input-group-input/textarea and root has-focus/invalid | Canonical registered input-group-control recipe; shared field paint/root recipe, no shadow-piercing query-based CSS | docs/input-group.md; src/stories/input-group.stories.ts | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-03 | Four independent logical addon edges with prefix/suffix compatibility | ucl17-input-group; cited Input/Button/composition | InputGroupAddon align inline-start/end block-start/end | Named edge slots, prefix follows addonPosition default inline-start, suffix remains inline-end; hidden empty regions | docs/input-group.md; src/stories/input-group.stories.ts | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-04 | Independent public Button actions; default xs/ghost; authored variants/sizes respected and restored | ucl17-input-group; cited Input/Button/composition | InputGroupButton -> Button | Retain existing actionSize/actionVariant inheritance and cleanup; register actual action host; no local button paint | docs/input-group.md; src/stories/input-group.stories.ts | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-05 | Noninteractive addon focuses editor, interactive addon/action keeps its own operation | ucl17-input-group; cited Input/Button/composition | InputGroupAddon onClick guard; live contract | Composed-path focus guard; disabled editor skipped; readonly focus retained | docs/input-group.md; src/stories/input-group.stories.ts | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-06 | Disabled/readOnly/invalid propagation affects boundary, never unrelated actions | ucl17-input-group; cited Input/Button/composition | ucl17-input-group requirements | Read editor native and public state; no action disabled propagation; support Field association | docs/input-group.md; src/stories/input-group.stories.ts | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-07 | Dynamic controls/actions, semantic-host replacement, reconnect and pending update cleanup | ucl17-input-group; cited Input/Button/composition | composition/lifecycle contracts | Current native element registration lifecycle; owner-document observer, idempotent cleanup, original attributes restored | docs/input-group.md; src/stories/input-group.stories.ts | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-08 | Theme typography/gap/padding/radius, parts and composed controls in examples | ucl17-input-group; cited Input/Button/composition | Nova all input-group parts; source example units | Shared recipes and actual Field/Input/Textarea/Button/Icon/KeyHint/Menu; complete authored docs and copyable compositions | docs/input-group.md; src/stories/input-group.stories.ts | V-02 V-03 | passed | Implementation and documented API reconciled; observed results in V-02, V-03. |
| C-99 | Native browser media/accessibility and applicable native-input or SSR verification | Shared Foundation accessibility/motion/lifecycle contract; skill verification procedure | Shared native platform and component source tests recorded above | Existing shared owners; no simulated platform substitute | Component docs and ../verification-results.md | V-98 | blocked | Implementation remains in scope; verification requires capabilities not exposed by registered tools. |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Editor | InputGroupInput/Textarea -> Input/Textarea | TpInput/TpTextArea/TpTextControl | Register canonical composition part on existing native editor; no value or IME state copied | InputGroup and unchanged standalone editors; V-01 V-03 |
| Action | InputGroupButton -> Button | TpButton and current group inheritance | Keep actual Button press/focus/form/variant behavior, preserve authored configuration | InputGroup Button, Menu/Tooltip triggers; V-02 |
| Shared boundary | Nova root + control suppression | PresentationController and current group recipe | Root alone owns field paint/ring; group control suppression matches all field states | Field/InputGroup compositions; V-01 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Root/control | base/Nova | cn-input-group, cn-input-group-input/textarea | existing shared field tokens/recipes, input-group-control registered native target | Remove duplicate boundary/ring/background, preserve editor text padding and native semantics | V-01 |
| Addon/text/action | base/Nova | cn-input-group-addon-align-*; cn-input-group-button/text | actual Button/Icon/KeyHint; input-group-addon/text/action | Four logical placements; symmetric theme insets; no fixed-pixel or per-instance spacing patches | V-02 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Canonical input, multiline composer | editor, caption, action and mark | Field/Input/Textarea/Button/Icon/KeyHint | Field association, focus, action independence | Native spans only for actual text/layout |
| Actions and menu | floating option and command | actual Menu/Button | Trigger stays independently focusable and clickable | No local popup imitation |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-02 C-05 C-06 | Input/Textarea focus, addon pointer, invalid/disabled/readonly Field | One boundary/ring, original editor semantics, actions independently enabled | Real addon click focuses original editor; group ring2px while inner input outline0. Invalid/disabled state keeps one boundary and independent action enabled. Native Input/Textarea remain original owners. | Chrome MCP actual input/styles/tree | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-02 | C-03 C-04 C-08 | All four edges, empty/nonempty regions, Button defaults/overrides, themes/RTL/base spacing | No empty inset or overlap; actual Button styles and shared tokens | Four logical addon regions, optional empty sections, actual Button action defaults and light RTL composition inspected. Base3.2 to5 scales inset4.8/6.4 to7.5/10 without per-control spacing attributes. | Chrome MCP composition/screenshots | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-03 | C-07 C-08 | Replacement/delegate/reconnect and standalone Input/Button regressions; docs/build | No stale registration or mutated independent control; complete public composition | Moving editor out restores standalone border; reconnect restores joined border and action size. Button href changes register actual anchor. Root delegate/ref/dictionary cleanup and authored docs/build verified. | Chrome MCP API + focused checks | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-98 | C-99; native media/accessibility | OS forced-colors and applicable OS reduced-motion policy | Correct native high-contrast and media behavior | Registered Chrome MCP has no forced-colors or OS reduced-motion control. Explicit component reduce policy was tested separately where applicable. | Registered tool schema inspection | blocked | No CSS pseudo-state or matchMedia mock is accepted as native media evidence. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Existing Input/Textarea and Button owners retained; canonical native part registration supplies composition paint. No value/press controller duplicated. |
| I-02 | Default visual regions match traced source and shared library recipes | passed | Chrome page61 screenshot inspected: one shared field border, transparent editor, theme addon padding and actual Button. Real prefix click focuses input; editor outline 0, root outline 2px. |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | Actual Textarea with block-start text and block-end Button renders; empty regions hidden. Public invalid+disabled editor leaves action enabled and editor transparent/borderless. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Live section, upstream unit/reexports and Nova selectors read; preservation boundary identified. |
| 1. Capability mapping | passed | Editor, four edges, action defaults, input-state presentation, focus, lifecycle and customization separately mapped. |
| 2. Architecture and composition reuse | passed | Existing editor/Button and group owner retained; native-target recipe centralizes joined paint. |
| 3. Behavior | passed | Observed behavior in V rows and execution appendices. Focused state/lifecycle and real input paths pass. |
| 4. Presentation and customization | passed | Shared recipes, theme overrides and applicable actual part/ref/delegate/dictionary checks pass; source and visual evidence in V rows. |
| 5. Accessibility | blocked | Native AX, real keyboard and local axe checks recorded; forced-colors browser inspection V-98 cannot be emulated with registered tools. |
| 6. Visual and interaction inspection | blocked | Light/dark/RTL/density and relevant optional states inspected; OS media/forced-colors V-98 remains blocked. |
| 7. Documentation and demo reuse | passed | Authored API documentation, copyable source and actual public nested controls reconciled; full Storybook build passes. |
| 8. Regression and reconciliation | blocked | Focused regressions, lint/type/build, served built package and documentation pass. Complete-component certification remains blocked by explicit V-98/V-99 evidence boundaries. |

## Completion / handoff

Active workstream, parent scope unchanged. No complete-component claim.

## Recorded execution evidence

Chrome page61 fixture: real prefix click focused the original editor; root outline 2px and editor outline 0. Invalid+disabled native editor kept zero border/outline, transparent background, and independent action enabled. Moving editor outside restored standalone 1px border and removed group registration; reconnect restored joined border 0 and xs action. Button href replacement registered the actual native anchor.
Chrome page55 authored Default: accessibility tree names textbox Website through actual Field; axe on Storybook root returned zero violations. Light RTL screenshot inspected; logical edges swap without overlap. Base spacing 3.2→5 changes addon padding 4.8/6.4→7.5/10. Public root partPresentation changes border without replacement. Screenshots inspected in conversation; MCP artifact-path restriction remains.
TypeScript and targeted ESLint passed after removing extraction-unused import; focused stories check exposed a test incorrectly banning ordinary layout in later composition stories, corrected to enforce unstyled Default. Package/build and full doc matrix remain for final batch.

## Reconciled execution status — 2026-10-04

Implementation and documentation for this workstream are delivered. The scenario table above supersedes earlier prospective statements below/above that say implementation or final checks are pending. Required unavailable browser/runtime evidence remains explicitly blocked; no full conformance claim is made. See [final verification results](../verification-results.md) for shared fixes, commands, package evidence and tool boundaries.

## Reference use-case expansion — 2026-10-04

Fresh direct project/Foundation/Library reads retain head8440bff/state5daad632. Base/Nova input-group-example.tsx entire seven sections and input-group.tsx imports were read: Basic, Addons(all4edges/multiplemarks/description/embeddedlabel), Buttons, Tooltip/Menu/Popover/ButtonGroup, Kbd/status/loading, Card, Textarea(header/footer/actions/code). New-york-v4 independent input-group-{button-group,custom,dropdown,textarea,button,spinner,text} inspected for unique behavior. Existing public Field/Input/TextArea/Button/Icon/KeyHint/Spinner/Menu/Popover/Tooltip/Card owners supply their roles. Native div is layout only; no substitute controls. Retain theme-relative spacing, default group boundary, actual root/control recipe and independent actions; no new tokens or spacing attributes.

Docs design: one canonical story, remaining compositions inside docs.examples using the restored common Storybook Canvas. Same static markup and setup module feed live render and copyable source. Application-only actions update local outputs; Menu selection uses its real item callback, Popover/Tooltip use their real triggers, Card submits/resets through Form. All four addon edges and native editable interoperability included. No attribute-permutation sidebar variants. Extend V-01..03 with actual composed actions, unchanged editor identity/value after popup toggle and code explorer toggle, names/axe and light/dark theme geometry.

Dependency gap retained: current TpButtonGroup only registers direct TpButton despite ucl22-button-group's mixed controls/text/separator contract and source ButtonGroupText/Separator. Its source example cannot be implemented with local styled spans; repair the ButtonGroup owner separately and then add that composition. This does not narrow delivery or certify Input Group complete. Docs Gate7 remains pending while this case is unresolved.

Early rendered checkpoint found root sizing drift: source InputGroup root is w-full, while local host shrink-wraps differently according to each addon and editor's intrinsic width. Repair the existing InputGroup host to fill its allocated inline size (min-inline-size0 retained), including native input/textarea in the existing slotted flex sizing rule. This is default composition structure, not an example width patch. Existing InputGroup in EmptyState/Card/Field and narrow containers are regression consumers. Icon-sized example Buttons must contain real TpIcon rather than text hidden by Button's correct icon-only treatment.

Current early integration: actual Docs renders all eight sections through common Canvas, all configured icons assigned, no invalid-composition diagnostic. Four floating compositions each fill384px allocated width; native and TpInput editor flex region retains room for addons. Icon-only Buttons use their public icon-start slot and paint actual icons. Real Phone fill5550123→Menu+44 selection preserves same editor/value and updates label/output. Modal Menu and nonmodal Popover render through the repaired shared positioning owner; Popover title/description/Done no longer duplicates its accessible label as body content. Real Done closes. Root focus boundary, source four-edge slots and independent actions remain the original owners. Broader ButtonGroup dependency and full case reconciliation remain pending.

Additional actual Chrome76 actions: Clear uses public clear(event), empties the editor and retains focus; Copy succeeds. Comment18/280→Post submits JSON→Cancel resets value/output/count0/280. Final focused ESLint/stylelint/diff checks, production build and Storybook build pass; see use-case-review-2026-10-04.md for logs. Dark/narrow and remaining shared-consumer regressions are still pending. This appendix supersedes any earlier completed Docs status while the Button Group dependency remains unresolved.

ButtonGroup dependency implementation is now available (components/button-group): mixed editor/popup-trigger members, Text segment, existing Separator and nested groups. InputGroup Docs has its real ButtonGroup composition; screenshot and36px extents verified, actual release notes entry persists through shared explorer toggle. The previous missing-owner blocker is resolved; full InputGroup source-case/remaining browser matrix remains pending. See plans/components/button-group/implementation-checklist.md for independent remaining ButtonGroup cases.
