# Questionnaire implementation record

## Delivery and source record

- Requested work / claim: Full Questionnaire implementation; preserve working controls and normalize shared behavior. Whole-library audit remains active.
- Scope source: User full component audit and implementation list, followed by authorization to proceed while avoiding regressions and duplicate implementations.
- Baseline/reference revisions in ../audit.md. Clean pinned Base UI, Floating UI and shadcn references; no fetch/update. Fresh direct MCP Foundation sec-1410-questionnaire and Library ucl17-questionnaire read2026-10-04, with full Foundation state/form/part dependencies retained from same current document.
- Source: ui/packages/react/src/questionnaire/{types,components,use-questionnaire-root,use-questionnaire-item,use-questionnaire-choice,use-questionnaire-input,collection,utils} plus unit/browser/SSR tests; base registry ui/questionnaire.tsx imports @shadcn/react/questionnaire and buttonVariants, Nova1598–1666 owns paint. Base/Floating have no independent questionnaire owner; native form/selection plus common state is the appropriate dependency.
- Current forms.ts implementation duplicates manual controlled state, local Button/input/shortcut paint, misses mixed free input/per-answer control, and commits skipped metadata after rejected controlled proposals. Existing Foundation questionnaire normalization is the domain owner, ControllableState.transaction owns proposals. Preserve calendar/other forms.ts work.
- Component folder src/components/questionnaire; state/host/structural styles. Keep forms.ts reexport and registration. Native form, fieldset/legend, choice label and native radio/checkbox are required by Foundation; they reuse existing selection-control recipe rather than substitute a new visual checkbox. Freeform native input similarly required; share text-control recipe and native validation, with state owned by questionnaire as specified. Actual TpButton and actual TpKeyHint for actions/shortcuts.
- State design: a supplied aggregate record uses one aggregate ControllableState and forbids child controlled values. Otherwise keyed choice/input ControllableState lanes own values; aggregate is a derived snapshot, not a second commit owner. Item uses the same controller. One transaction joins affected lanes and metadata (skipped/attempted/reached/free-input selection); aggregate notification is cancelable before atomic publication. Keep unselected input drafts and omit their names from FormData. Native controls mirror committed values after rejected changes.
- Source parity/contract adaptation: data definitions express native constituent options; no new visual catalog identities. Existing choiceMode/flow/skippable defaults remain library-authoritative. Native DOM is a contract requirement, and appearance must use common recipes. Shared checkbox/radio behavior remains unchanged.
- Direct Spec Blocks and Chrome MCP available. Existing5173/6006 used. Evidence inline/local under tmp/component-verification/questionnaire; durable fixtures tests/fixtures/components/library-completion/.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Native form and ordered enabled uniquely named questions; complete initial progress | sec1410 / ucl17 | Root/types + collection + SSR tests | questions, native form; existing Questionnaire domain helpers | docs/questionnaire.md | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-02 | Controlled/default item; linear/free flow; removal next then previous; empty0/0 | sec1410 / ucl17 | use-questionnaire-root and collection | ControllableState item lane; reached metadata | docs/questionnaire.md | V-02 V-03 | passed | Implementation and documented API reconciled; observed results in V-02, V-03. |
| C-03 | Aggregate controlled answers sole owner; per-answer controlled/default checked and text otherwise | sec1410 / ucl17 | use-questionnaire-choice/input; Foundation stricter aggregate exclusion | conditional aggregate owner OR answer lanes using existing ControllableState; no simultaneous duplicate owners | docs/questionnaire.md | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-04 | Single native radios, multiple native checkboxes; mixed freeform answer and retained unselected draft | sec1410 / ucl17 | ChoiceInput/Input + mixed-input tests | native constituent semantics; input configuration and typed per-answer lanes | docs/questionnaire.md | V-01 V-04 | passed | Implementation and documented API reconciled; observed results in V-01, V-04. |
| C-05 | Answered predicate distinct from validity; skipped/attempted/reached metadata atomic with answers/item | sec1410 / ucl17 | Item/status; sec1410 final paragraphs | transaction participant for metadata and aggregate notification, same ControllableState.transaction | docs/questionnaire.md | V-03 V-05 | passed | Implementation and documented API reconciled; observed results in V-03, V-05. |
| C-06 | Skip optional only; clear answers/mark/advance-or-submit atomically; reject restores all | sec1410 / ucl17 | Root skipCurrent + controlled skip tests | skip action and joint state proposal; no local manual controlled protocol | docs/questionnaire.md | V-03 V-05 | passed | Implementation and documented API reconciled; observed results in V-03, V-05. |
| C-07 | Next/confirm active validation; submit all and first-invalid focus; native reporting optional | sec1410 / ucl17 | Root/Item validate + browser nativevalidation tests | existing native validation + validation helpers; guarded focus after update | docs/questionnaire.md | V-05 | passed | Implementation and documented API reconciled; observed results in V-05. |
| C-08 | Reset cancellation; owned defaults; controlled rejection; no stale replay | sec1410 / ucl17 | Root reset + reset tests | native reset event + same joint proposal, defaults snapshot policy | docs/questionnaire.md | V-03 V-05 | passed | Implementation and documented API reconciled; observed results in V-03, V-05. |
| C-09 | Arrow navigation, native radio/number/text preservation; Enter/modified Enter/IME/repeat guard | sec1410 / ucl17 | Root keydown and utils + browser tests | native semantics and event.composedPath; shared focus helpers | docs/questionnaire.md | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-10 | Unique enabled answer shortcuts none/letters/numbers, authored overrides, focus/activation | sec1410 / ucl17 | collection/getShortcutByChoiceValue | shortcut assignment map keyed identity, native input aria-keyshortcuts | docs/questionnaire.md | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-11 | Independent action visible/disabled/status/shortcut; actual Button reuse | sec1410 / ucl17 | registry Previous/Skip/Next/Submit imports buttonVariants | TpButton; canonical Actions native layout; no local button paint | docs/questionnaire.md | V-01 V-04 | passed | Implementation and documented API reconciled; observed results in V-01, V-04. |
| C-12 | External invalid/errors, required/disabled/readonly, min/max/pattern/type native validity | sec1410 / ucl17 | Item invalid + Input types/tests | question invalid/error + input configuration; retained validation after attempted | docs/questionnaire.md | V-05 | passed | Implementation and documented API reconciled; observed results in V-05. |
| C-13 | Dynamic item/answer order/removal/type changes and cleanup/focus recovery | sec1410 / ucl17 | registration and browser removal tests | reconcile keyed owner lanes; remove controllers and pending focus on removal/disconnect | docs/questionnaire.md | V-02 V-05 | passed | Implementation and documented API reconciled; observed results in V-02, V-05. |
| C-14 | Canonical parts/default sourced presentation/theme/part hooks/render delegates | sec1410 / ucl17 | Library ucl17; base registry + Nova1598–1666 | common renderPart; shared native choice indicator/text/shortcut recipes; public definition keys | docs/questionnaire.md | V-01 V-06 | passed | Implementation and documented API reconciled; observed results in V-01, V-06. |
| C-15 | Docs/Controls/copyable compositions/registration/exports | sec1410 / ucl17 | README, registry examples | authored Questionnaire docs/story plus mixed answer use case and fixtures | docs/questionnaire.md | V-07 | passed | Implementation and documented API reconciled; observed results in V-07. |
| C-99 | Native browser media/accessibility and applicable native-input or SSR verification | Shared Foundation accessibility/motion/lifecycle contract; skill verification procedure | Shared native platform and component source tests recorded above | Existing shared owners; no simulated platform substitute | Component docs and ../verification-results.md | V-98 V-99 | blocked | Implementation remains in scope; verification requires capabilities not exposed by registered tools. |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| State and atomic actions | shadcn root/item/choice/input hooks | ControllableState.transaction, Foundation questionnaire | Conditional aggregate or native answer lanes; no manual controlled protocol | Questionnaire V-03; existing Select/Drawer transaction tests |
| Form anatomy/validation | Root native form and Item fieldset/input | TpForm and native validation, TpTextControl | Native form required inside Questionnaire; no nested TpForm duplicate submit owner, reuse native validity and domain helpers | V-05 |
| Actions | registry navigation→buttonVariants | TpButton native form submission support | Actual Button, no local button CSS | Questionnaire V-01 V-04 |
| Presentation | Nova cn-questionnaire + input/selection styles | selection-controls/text-controls/menu shortcut recipes | Export/share existing native indicator/text/shortcut paint, avoid per-control tokens | Checkbox/Input/Menu V-06 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Form/questions/text/progress | base/Nova | cn-questionnaire/item/title/description/progress | Questionnaire dictionary + shared text tokens | Canonical parts and relative spacing | V-01 V-06 |
| Choice rows | base/Nova | cn-questionnaire-choice + indicator | shared selection-control indicator paint + actual icon renderer | Native radio/checkbox required; row selection not new control variants | V-01 V-06 |
| Freeform input | base/Nova | cn-questionnaire-input | existing textControlAppearance recipe | Native constituent required; same field palette/radius/focus | V-01 V-06 |
| Shortcuts | base/Nova | cn-questionnaire-shortcut | TpKeyHint | Actual TpKeyHint, no local keyboard-control paint | V-06 |
| Actions | base/Nova | Previous/Skip/Next/Submit→buttonVariants | actual TpButton | Outline previous/skip, default next/submit; theme gap | V-01 V-04 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Default and mixed responses | Actions and semantic answers | actual Button; same Questionnaire public question definitions | V-01 V-07 | Native form/fieldset/legend/label/radio/checkbox/input mandated by sec1410; shared recipes supply paint |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-04 C-11 C-14 | Default single/multiple/freeform and mixed initial render/AX | Native semantics and source appearance with actual Buttons | Native single/multiple/mixed freeform answer rendering and AX inspected; actual Button and KeyHint anatomy uses shared recipes. | Chrome MCP | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-02 | C-02 C-13 | Linear/free order, dynamic removal/disable/reorder/empty | Correct item/progress/focus, controlled item preserved | Dynamic cardinality/removal preserves or clears appropriate keyed lanes; controlled removed item remains current0/total2 without fabricated owner update. Ordered flow/source reconciliation inspected. | Chrome MCP | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-03 | C-03 C-05 C-06 C-08 | Controlled aggregate and separate answer/item accept/reject/veto/reset/skip | No partial commit or replay; old snapshot during all callbacks | Atomic controlled skip with rejected answer and accepted item leaves all old state; acknowledged retry clears/advances. Aggregate and per-answer text owners reject missing acknowledgement and accept synchronous publication; native reset veto/default restoration pass. | state tests + Chrome APIs | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-04 | C-04 C-09 C-10 C-11 | Real label/radio/checkbox/input/shortcuts/Enter/arrows/actions | Native behavior preserved and correct navigation | Real radio label, checkbox letter B, text editing, Enter navigation and submission pass; native number/text semantics retained. IME input cannot be driven by registered tool and is separately blocked. | Chrome MCP input/AX | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-05 | C-05 C-06 C-07 C-08 C-12 C-13 | Native/custom invalid, skipped data, reset/defaults, disabled/readOnly, cleanup | Correct data/status/focus and rejection | Bad email answered-but-invalid prevents navigation; choosing fixed radio excludes invalid retained freeform draft from FormData. Numeric min2/max10/step2 rejects3, accepts4, and submit serializes n=4 once after render. | Chrome MCP | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-06 | C-14 | Light/dark/density/radius/RTL/narrow/part/ref/delegate/dictionary + peers | Shared tokens and native controls no visual drift | Dark/default and light RTL/base5 screenshots, native choice geometry, title delegate/ref/dictionary and axe0 checked. Actual region customization does not add spacing attributes. | Chrome MCP screenshot/axe | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-07 | C-15 | Authored docs/source/Controls/export/build | Full documented surface and reuse | Authored default/mixed docs and Controls plus focused atomic state tests and production/Storybook build/export pass. Real SSR/hydration runtime remains unavailable and separately blocked. | static/build/Chrome | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-98 | C-99; native media/accessibility | OS forced-colors and applicable OS reduced-motion policy | Correct native high-contrast and media behavior | Registered Chrome MCP has no forced-colors or OS reduced-motion control. Explicit component reduce policy was tested separately where applicable. | Registered tool schema inspection | blocked | No CSS pseudo-state or matchMedia mock is accepted as native media evidence. |
| V-99 | C-99; native input/runtime | Required physical-input or SSR boundary | Native platform behavior verified without simulation | Native IME input and SSR/hydration execution are unavailable in the current browser/runtime setup. | Registered Chrome MCP schemas and current runtime inventory | blocked | Source/API evidence does not substitute for this required execution. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners actually adopted, duplicate removed | passed | Old forms.ts class removed/reexported; conditional aggregate or per-answer ControllableState lanes and common transaction; actual TpButton actions; existing native selection/text and actual KeyHint recipes consumed |
| I-02 | Sourced representative render and shared recipe | passed | Chrome61 dark mixed-choice screenshot inspected against Nova: shared field/selection border, typography and theme gaps; native radio label activated with focus retained; header gap measured12.8 sharedspace4 |
| I-03 | Independent constituents and placement | passed | Removing description/free input and switching choice cardinality independently preserves answer; checkbox native type, no residual input/description, actual conditional Buttons |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh contracts, reference chain and full scope |
| 1. Capability mapping | passed | All required native/controlled/mixed/actions/presentation channels mapped |
| 2. Architecture and composition reuse | passed | One conditional answer owner and shared transaction; native exceptions explicit and actual Button reuse |
| 3. Behavior | blocked | Observed behavior in V rows and execution appendices. Required native-input/runtime evidence remains V-99 blocked. |
| 4. Presentation and customization | passed | Shared recipes, theme overrides and applicable actual part/ref/delegate/dictionary checks pass; source and visual evidence in V rows. |
| 5. Accessibility | blocked | Native AX, real keyboard and local axe checks recorded; forced-colors browser inspection V-98 cannot be emulated with registered tools. |
| 6. Visual and interaction inspection | blocked | Light/dark/RTL/density and relevant optional states inspected; OS media/forced-colors V-98 remains blocked. |
| 7. Documentation and demo reuse | passed | Authored API documentation, copyable source and actual public nested controls reconciled; full Storybook build passes. |
| 8. Regression and reconciliation | blocked | Focused regressions, lint/type/build, served built package and documentation pass. Complete-component certification remains blocked by explicit V-98/V-99 evidence boundaries. |

## Completion / handoff

Task active. No implementation/completeness claim yet.

2026-10-04 execution: Chrome61 native mixed fixed/free rendering and Cardinality change preserve selected answer; optional description/input disappear independently. Dark default screenshot inspected. Real Skip with controlled choice rejecting and item acknowledging leaves old answers/item/status, all callback observations old; acknowledged retry clears and advances atomically and FormData omits skipped answer. Real bad email+Enter stays on answered-but-invalid question, focuses input and shows native/custom error; choosing fixed radio retains invalid draft but removes its name/data, Enter advances. Real letter B toggles checkbox and Enter submits complete data including prior answer. Prevented native reset preserves values/item; accepted reset clears values and returns initial item. Controlled aggregate veto consumption and mixed draft ownership have focused state tests; total8 targeted tests pass, TypeScript and focused ESLint pass. Controlled removed item remains unchanged with current0/total2. Chrome63 authored Default loads, real Buttons/KeyHints present, title ref/host-properties work, shared spacing seed5 produces row padding12.5x15, light RTL screenshot inspected, axe0 violations. CSS partPresentation uses kebab-case declarations; camelCase borderColor test was invalid API input and corrected. Final matrices/build/exports and native IME/SSR evidence still pending; no complete claim.

## Reconciled execution status — 2026-10-04

Implementation and documentation for this workstream are delivered. The scenario table above supersedes earlier prospective statements below/above that say implementation or final checks are pending. Required unavailable browser/runtime evidence remains explicitly blocked; no full conformance claim is made. See [final verification results](../verification-results.md) for shared fixes, commands, package evidence and tool boundaries.
