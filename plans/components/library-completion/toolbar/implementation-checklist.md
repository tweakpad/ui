# Toolbar Foundation implementation record

## Delivery and source record

- Requested work / claim: implement missing Toolbar behavior.
- Scope source: user-authorized whole-library audit and continuation. Foundation composition, no new catalog control and no change to standalone ButtonGroup keyboard semantics.
- Live sources: direct full Foundation/Library AST reads, refreshed project head 8440bff24a97dbbc5c762ebf4bd6baa958b305e1, state 5daad6324d67f008ae378650a86e7e961fc91a1025d6107c89be7002caecdfe1; sec-176-toolbar, ucl22-button-group, audit-foundation-catalog-coverage-map.
- Baseline: 3a03ac0b1bfc0ce2194eb22f3c1cf7748efff84d; preserve existing task work. Upstream clean pins recorded in ../audit.md: Base5b495488, Floating27629b74, shadcn63c1308d.
- Source files: Base toolbar root/button/link/input/group/separator and Root tests; internals/composite/CompositeRoot/useCompositeRoot/composite; utils/useFocusableWhenDisabled. shadcn bases/base/ui/button-group.tsx -> Separator; styles/style-nova.css cn-button-group family.
- Tools: direct Spec Blocks and Chrome DevTools MCP available. Existing Vite5173/Storybook6006 retained.
- Evidence: tmp/component-verification/toolbar/; durable tests/fixtures/components/toolbar/; local only.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Root role toolbar; orientation horizontal, loopFocus true, disabled false | sec-176-toolbar; ucl22-button-group | ToolbarRoot | ToolbarController native owner/update | docs/toolbar.md | V-01 | passed | Implemented; mapped V rows contain observed evidence. |
| C-02 | Button nativeAction true; own disabled false and focusableWhenDisabled true; child action state retained | sec-176-toolbar; ucl22-button-group | ToolbarButton -> useButton | registerItem button; actual TpButton shared composite context, native interoperability | docs/toolbar.md | V-01 V-02 | passed | Implemented; mapped V rows contain observed evidence. |
| C-03 | Link native navigation, unaffected by root/group disabled | sec-176-toolbar; ucl22-button-group | ToolbarLink -> CompositeItem | registerItem link; actual TpButton href or authored anchor | docs/toolbar.md | V-02 | passed | Implemented; mapped V rows contain observed evidence. |
| C-04 | Input defaultValue optional, own disabled false/focusableWhenDisabled true; native editing and form state retained | sec-176-toolbar; ucl22-button-group | ToolbarInput -> useFocusableWhenDisabled | registerItem input; actual TpTextControl consumes same context, no value ownership | docs/toolbar.md | V-02 V-03 | passed | Implemented; mapped V rows contain observed evidence. |
| C-05 | Group role group and disabled false; one root navigation sequence | sec-176-toolbar; ucl22-button-group | ToolbarGroup | registerGroup with update and release, ancestor composition | docs/toolbar.md | V-02 | passed | Implemented; mapped V rows contain observed evidence. |
| C-06 | Separator semantic orientation perpendicular by default, explicit override | sec-176-toolbar; ucl22-button-group | ToolbarSeparator -> Separator | registerSeparator on actual TpSeparator or native semantic node | docs/toolbar.md | V-02 | passed | Implemented; mapped V rows contain observed evidence. |
| C-07 | Exactly one eligible tab stop, arrows/RTL/Home/End/loop, Tab exits; consumer cancellation | sec-176-toolbar; ucl22-button-group | CompositeRoot/useCompositeRoot | existing CollectionRegistry with optional eligibility predicate; Toolbar policy | docs/toolbar.md | V-01 V-03 | passed | Implemented; mapped V rows contain observed evidence. |
| C-08 | Caret arrows retained until edge; composition/modifier/text selection preserved | sec-176-toolbar; ucl22-button-group | internals/composite/composite and ToolbarInput | native input selection policy, no synthetic editing/value owner | docs/toolbar.md | V-03 | passed | Implemented; mapped V rows contain observed evidence. |
| C-09 | Dynamic membership/removal/reorder/disabled, nearest focus repair without activation, dispose and reconnect | sec-176-toolbar; ucl22-button-group | ToolbarRoot metadata effects | explicit registrations with release/update, owner-window observer, shared composite lifecycle | docs/toolbar.md | V-04 | passed | Implemented; mapped V rows contain observed evidence. |
| C-10 | Unchanged theme/parts/native semantic roles/names; no parallel paint | sec-176-toolbar; ucl22-button-group | unstyled Toolbar; shadcn ButtonGroup Nova | actual Button/Input/Separator and ButtonGroup; public native anatomy only | docs/toolbar.md | V-05 | blocked | Shared Button hover contract conflict; no local styling workaround. |
| C-11 | Foundation exports and full docs/source and built composition | sec-176-toolbar; ucl22-button-group | toolbar/index.parts | foundation/index export controller/types; docs and isolated fixture | docs/toolbar.md | V-06 | passed | Implemented; mapped V rows contain observed evidence. |

## Architecture and reuse

Toolbar owns focus coordination only. CollectionRegistry remains the collection keyboard owner used by Tabs/RadioGroup/ToggleGroup/Slider/ChoiceCollection. Add an optional eligibility callback without changing existing defaults. A shared CompositeControlController binds toolbar context to existing Button and text-control rendering, disabled action guards and form ownership without overwriting authored public properties. Native interoperability uses the same context/registration policy with reversible native attributes. No cloned button/editor, new token or per-component spacing API. The authored root is native Foundation anatomy. Plain ButtonGroup remains a visual group.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Composite navigation | ToolbarRoot -> CompositeRoot | foundation/collection.ts, focus.ts | Optional per-item eligibility in existing registry; toolbar adds caret/group policy only | Toolbar, existing Tabs/RadioGroup/ToggleGroup/Slider/ChoiceCollection V-01 V-06 |
| Action and editable state | ToolbarButton -> useButton; ToolbarInput -> useFocusableWhenDisabled | components/button.ts and field/text-control.ts | Shared context consumed by real controls, own disabled/value/form state stays with each owner | Button, Input, TextArea V-02 V-03 V-06 |
| Native lifecycle | constituent metadata registration | Foundation Meter/CheckboxGroup controller patterns | explicit registrations, reversible semantics and disposal | Toolbar V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Root/Group | Base unstyled Toolbar; shadcn base/Nova visual ButtonGroup | button-group.tsx; style-nova.css cn-button-group | actual TpButtonGroup joined seams, native layout | Toolbar supplies semantics only; no independent paint or default group behavior change | V-05 |
| Button/Link/Input/Separator | Base Toolbar imports underlying controls | toolbar constituents; shadcn button/input/separator and Nova recipes | actual TpButton, TpInput, TpSeparator | Existing recipes and overrides retained | V-05 V-06 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Toolbar fixture/docs | actions, editing, separator, visual grouping | TpButton including href, TpInput, TpSeparator, TpButtonGroup | V-01..V-06 | Root/group are authored Foundation semantic anatomy; separate native controls only for interoperability tests |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-02 C-07; real keyboard | Horizontal/vertical, RTL, loop toggle, Tab/Home/End/arrows | One stop; correct boundaries; Tab exits; no activation from focus | Source Chrome67 real Tab enters Save; arrows traverse Undo/disabled Redo/Input/Link, Enter on Redo fires zero actions, Tab exits. RTL ArrowLeft advances; vertical ArrowDown advances; loopFocus=false stops at End. Built package repeats Tab/arrow/disabled/exit with zero actions. | Chrome MCP | passed | Observed source and applicable built evidence. |
| V-02 | C-02 C-03 C-04 C-05 C-06; options/forms | Root/group/item disabled, focusable false, native/library, separator explicit/default | Native semantics; disabled editing/action blocked; links retained; form exclusion | Root disabled makes actual Input readonly but focusable, excludes its form value and blocks real X typing; re-enable restores Notes. Link stays enabled. Group disabling preserves authored Button.disabled; focusable false restores native disabled. Separator explicit horizontal/default perpendicular pass. Native readonly interoperability retains its native form semantics as documented. | Chrome MCP | passed | Observed source and applicable built evidence. |
| V-03 | C-04 C-07 C-08; editing/cancellation | Actual input caret interior/edges/selection, modifiers, prevented handlers | Normal editing until navigation edge; consumer cancellation honored | Real ArrowLeft moves caret5 to4; End stays in editor; ArrowRight at end exits. Consumer part keydown preventComponentHandling retains Save focus. Focused policy tests cover selections/modifiers/composition flag/RTL/native numeric arrows; no claim of real IME testing. | Chrome MCP and focused unit policy tests | passed | Observed source and applicable built evidence. |
| V-04 | C-09; lifecycle | Remove focused member; reorder, replace, release/dispose/recreate; author later changes | Nearest eligible focus without activation; preserved authored state and no stale listeners | Removing focused Input moves focus to Help; removed Input releases composite tabindex/disabled state; reinsertion retains Notes. Fully disabling focused Redo moves to Input. Disposal preserves later authored root role=group, restores native markup and standalone tab stops. Named-slot order overrides light DOM order; changing shadow slot order updates real arrow navigation. Pending focus is invalidated on dispose. | Chrome MCP public API | passed | Observed source and applicable built evidence. |
| V-05 | C-10; visuals/AX | Light/dark actual controls, token overrides, native roles, axe | Actual sibling recipes retained; focus/disabled presentation coherent; names/roles valid | Source dark/light screenshots inspected: actual Button/Input/Separator/Group recipes and focus ring. Global spacing seed0.2rem to0.25rem scales gap6.4 to8 and Button36 to45; scoped space-2 gives16px gap, preserving value/focus. Built/rest axe0. Real dark default Button hover axe fails3.8:1 because mandated shared formula; exact proposal in hover-contract-gap.md awaits approval. | Chrome MCP screenshot/tree/local axe | blocked | Shared live hover contract decision pending. |
| V-06 | C-07 C-10 C-11; regression/package/docs | Unenrolled Button/Input and collection consumers; source/build exports and docs | Existing semantics retained and public controller usable | 62 focused assertions across9 shared-consumer suites pass; TypeScript, focused ESLint, production and Storybook builds, diff check pass. Built ToolbarController export and real keyboard verified. Menu composed Button trigger opens via ArrowDown, Escape restores trigger then toolbar arrows resume. Existing Navigation Panel Switch team/Escape focus and Select End Country100 scrollTop3008.5 remain correct. | focused tests/types/lint/build, Chrome MCP | passed | Observed source and applicable built evidence. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners actually used | passed | Button and TextControl consume CompositeControlController; Toolbar invokes existing CollectionRegistry keyboard owner. Unenrolled defaults retain existing rendering/state paths. |
| I-02 | Source-matched representative visual composition | passed | Chrome67 dark screenshot inspected: actual default Button, outline joined seams, dim disabled Redo, existing Input/Link and vertical Separator. Corrected fixture-only nonexistent height token to existing control-height-md; production has no paint. |
| I-03 | Independent options | passed | Chrome67 group.disabled marks Undo without mutating its authored disabled property; Redo focusable false restores native disabled. Explicit horizontal separator and default perpendicular orientation independently applied. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh direct live contract and local constituent sources/tests reviewed; no catalog identity added |
| 1. Capability mapping | passed | C-01..C-11 map all six constituents, interaction, lifecycle and exports to V-01..V-06 |
| 2. Architecture and composition reuse | passed | Existing CollectionRegistry and actual Button/TextControl state/rendering owners; shared context, unchanged standalone defaults; no visual substitutes |
| 3. Behavior | passed | V-01..V-04 source/built and actual Menu trigger integration pass. |
| 4. Presentation and customization | blocked | Reuse/token scaling pass; existing mandated Button dark hover fails contrast. Proposal pending contract approval. |
| 5. Accessibility | blocked | Named toolbar/groups/separator and real keyboard pass; rest axe0; hovered shared Button3.8:1 conflict remains. |
| 6. Visual and interaction inspection | blocked | Light/dark and shared spacing inspected; Button hover conflict unresolved. |
| 7. Documentation and demo reuse | passed | docs/toolbar.md covers options, registrations, cleanup, native/library form differences and shared actual controls. |
| 8. Regression and reconciliation | blocked |62 focused assertions/types/lint/builds and actual existing Menu/NavigationPanel/Select checks pass; shared hover contract remains unresolved. |

## Current status

Toolbar behavior, package exports and authored docs are implemented and verified. This is not a complete conformance claim: required shared Button hover contrast is blocked by an explicit live contract formula. See hover-contract-gap.md and pending user decision. Root/Group intentionally use data-disabled rather than inherited aria-disabled so contained links remain semantically enabled, matching upstream policy. No shared hover paint or live spec has been changed. Whole-library implementation remains active.
