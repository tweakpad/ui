# Select consolidation implementation record

## Delivery and source record

- Requested work / claim: Full Select + editable-choice union under Select; user explicitly removes separate Combobox. Existing passing plain Select must retain positioning, pointer and form behavior.
- Scope source: user full-library request and explicit removal of Combobox; accepted instruction preserve working controls and normalize implementation.
Fresh Foundation sec-151/152/153/154, Library Select/Combobox, shared state/forms/surface/parts read through direct MCP. Authorized Library consolidation moved query anatomy/requirements into Select, retained Foundation behavior identities, redirected coverage and removed separate public Combobox. Candidate validated zero issues, canCommit true; unrelated existing candidate edits preserved, no commit.
Source revisions in ../audit.md remain pinned. Local Base UI select/combobox index.parts, Root APIs, Item/Clear tests and shadcn base Select/Combobox imports plus Nova appearance inspected. Floating owner remains existing positionSurface, not a new runtime.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Public identity/default modes | Library ucl18-select and select-mode-binding | Select/Combobox index.parts; Root | TpSelect searchable=false; remove Combobox registration/exports/docs after migration; NativeSelect unchanged | docs/select.md | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-02 | Plain selection, pointer/typeahead, controlled/default/rejection | sec-154-select | SelectRoot/useSelectRoot, Trigger and Item tests | Preserve existing Select selection, pointer, position and render owner | docs/select.md | V-01 V-02 | passed | Implementation and documented API reconciled; observed results in V-01, V-02. |
| C-03 | Query independent controlled/default lane and cancellation | sec-153-combobox | ComboboxRoot/AutocompleteRoot | SelectQueryController uses ControllableState only for inputValue; no second selection/open owner | docs/select.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-04 | Filter/authoritative results/locale/limit/stable source/duplicates | sec-151/152/153 | useFilter/createItems and tests | Move tested helpers to Select; factory normalization feeds existing ChoiceModel/Collection; plain entry syntax preserved | docs/select.md | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-05 | Completion list/both/inline/none and IME | sec-152-autocomplete | Input/useInputKeyboardNavigation | Query controller transient suffix; editor retained; Escape clears before popup | docs/select.md | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-06 | autoHighlight false/true/always, keepHighlight, hover true, loop true | sec-152/153 | AutocompleteRoot and Item tests | Same collection visible/highlight; pointer never scrolls, keyboard scrolls nearest container | docs/select.md | V-03 V-04 | passed | Implementation and documented API reconciled; observed results in V-03, V-04. |
| C-07 | Single/multiple selection; closeOnSelect; source identity | Library cardinality; sec-153 | ComboboxRoot and Item tests | Select owner selects; query controller publishes independent accepted text; multiple ordered set | docs/select.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-08 | Clear query/selection/both/contextual; atomic rejection | Library audit-combobox-clear | ComboboxClear tests | Existing ControllableState.transaction across shared selection and query | docs/select.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-09 | Chips/remove/backspace/focus after removal | sec-153 | Chips/Chip/ChipRemove; Nova chips | Actual Badge and Button inside actual InputGroup; editor keeps focus; nearest remove after action | docs/select.md | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-10 | Optional trigger/clear/remove, native action/retention and canonical hooks | sec-153 and Library anatomy | Trigger/Clear/ChipRemove and shadcn ComboboxInput/Chip | Migrate actual Button companions to Select; independent booleans and clear presence | docs/select.md | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-11 | Inline/grid/virtual source/mounted window and outer cleanup | sec-152/153 | Row/List/Collection/AutocompleteRoot | One Select owner; query controller grid nav, mounted subset and outer reset; inline no floating lifecycle | docs/select.md | V-05 | passed | Implementation and documented API reconciled; observed results in V-05. |
| C-12 | Popup geometry/portal/arrow/backdrop/modal/presence and cleanup | Foundation10/11/16; sec-154 | Select Positioner, Floating computePosition/autoUpdate | Retain Select surface/position/motion; query mode default nonmodal/no item alignment; explicit options remain | docs/select.md | V-05 V-06 | passed | Implementation and documented API reconciled; observed results in V-05, V-06. |
| C-13 | Forms/readOnly/disabled/required/reset/restore/Field | Foundation9; sec-153/154 | Root form tests | TpFormElement; query adds reset without creating another form value | docs/select.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-14 | Semantics/status/empty/loading/descriptions, focus and native keys | Foundation7/8; sec-152/153/154 | Input/Status/Empty/Item | Actual native editable combobox input, active descendant; existing plain roving options | docs/select.md | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-15 | Shared theme/spacing/radius/parts/dictionary/RTL | Library presentation | base/ui/{select,combobox,input-group,button}.tsx; Nova296–355/1003–1065 | Same option/surface recipes; actual InputGroup and Button/Badge; no new spacing API/tokens | docs/select.md | V-06 | passed | Implementation and documented API reconciled; observed results in V-06. |
| C-16 | Lifecycle/environment/source updates and no pointer scroll reset | Foundation lifecycle; user regression | ChoiceModel/Collection; upstream Item tests | Preserve per-open position cache; all query transient state cleared on disconnect; dynamic source/filter modes | docs/select.md | V-05 | passed | Implementation and documented API reconciled; observed results in V-05. |
| C-17 | Docs/Controls/copyable source and public package migration | Library public definition | base/examples/select/combobox | Select canonical base plus searchable/async/multiple use cases; remove Combo entry and move fixtures/imports | docs/select.md | V-07 | passed | Implementation and documented API reconciled; observed results in V-07. |
| C-99 | Native browser media/accessibility and applicable native-input or SSR verification | Shared Foundation accessibility/motion/lifecycle contract; skill verification procedure | Shared native platform and component source tests recorded above | Existing shared owners; no simulated platform substitute | Component docs and ../verification-results.md | V-98 V-99 | blocked | Implementation remains in scope; verification requires capabilities not exposed by registered tools. |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Selection, collection, popup, forms | Base Select and Combobox shared collection/state/floating primitives | TpSelect and duplicated TpCombobox | Keep TpSelect lifecycle/render/selection owner. Query controller adds only editable state/filter/navigation policy. Delete duplicate Combobox owner after consumers migrate. | All Select stories, NativeSelect unaffected, CommandPalette must migrate to Select collection plus Dialog V-01 V-05 |
| Editor/chips/actions | shadcn ComboboxInput imports InputGroup/Button; Chips owns layout | InputGroup/Button/Badge | Actual components; native editor is required combobox anatomy. InputGroup resolves one editor through ordinary content wrapper to allow wrapping chips; standalone path unchanged. | InputGroup single editor/action regression V-04 V-06 |
| Position and presentation | Floating/Select Positioner and Nova menu classes | positionSurface, SelectPointer, menu-family recipe | Preserve cached alignment and keyboard-only scroll; one popup recipe/arrow owner | Select/Menu/NavigationMenu V-01 V-06 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Surface/items/groups/separators | base/Nova | select and combobox cn-menu-target + cn-* styles | menu-family/Select recipe | Existing shared symmetric padding and token radius | V-06 |
| Editor anchor | base/Nova | ComboboxInput→InputGroup/Addon/Input | actual InputGroup with native query input | One boundary owner; wrapped native editor discovery, no border recreation | V-04 V-06 |
| Chips/actions | base/Nova | ComboboxChip/Remove→Button; muted chip | actual Badge/Button | Tokenized chip content/layout; canonical parts on actual delegates | V-04 V-06 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Searchable Select and chips | field/query/actions/tokens | Field/InputGroup/Badge/Button/Icon | Real registered nested components and form/label checks | native query input is single combobox semantic editor |
| Command consumer migration | collection and modal | Select collection plus Dialog owner | Retain whole command capability under separate record | No second option/surface owner |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-02 C-12 | Plain Default/Multiple/LargeList before-after query integration | Existing pointer/keyboard/geometry preserved, hover no scrolling | Plain Default/Multiple preserved. Real LargeList End reaches Country100 at3008.5; pointer hover Country98 leaves scrollTop3008.5. Real searchable editor-to-editor switch keeps focus on second editor. | Chrome MCP | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-02 | C-02 C-03 C-07 C-08 C-13 | Controlled accept/reject/veto, atomic clear, selection/query/form/reset | Independent lanes; one value owner and stable focus | Existing73 query API/protocol assertions all pass in source and built package: independent controlled lanes, veto/atomic clear, selection/query/FormData/reset. Real ArrowDown+Enter multi commits Ada/Grace with query cleared and popup retained. | Chrome MCP keys/API | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-03 | C-04 C-05 C-06 | Filter, authoritative ordering, locale, completion, query/hover keys | Stable collection and no pointer scroll/jump | Existing source/filter/model tests plus built assertions verify remote authoritative results, collation, rank/order and completion. Removed highlighted source item clears highlight without rewriting text. | Focused helpers + Chrome MCP | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-04 | C-09 C-10 C-14 | Chips, optional controls, native keys and labels/status | Correct focus/removal/active descendant; genuine components | Actual InputGroup, chips, independent trigger/clear/removal visibility and labels checked. Real multi keyboard and query focus pass; one editor and accessible chip removal verified. | Chrome MCP AX/keys/axe | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-05 | C-11 C-12 C-16 | Inline/portal/grid/virtualized/source removal/reconnect/modal/outer close | One owner and no stale registrations/highlight | Built API assertions cover rows/grid, virtual logical highlight with mounted active reference, portal/retention/unmount, dynamic source, disconnect/reconnect and delegated actual Button reference cleanup. | Chrome MCP | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-06 | C-12 C-15 | Theme spacing/light/dark/RTL, hooks/dictionary, actual InputGroup | Shared defaults and proportionate geometry | Light/dark/RTL/base-spacing inspection and existing common parts/dictionary keep actual InputGroup/Buttons and popup recipe. Shared source integration does not reset large-list scroll. | Chrome MCP screenshot/style | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-07 | C-17 | Docs/base/examples/exports/catalog/no Combo | Complete API and migration, copied examples genuine | Combobox identity removed after query capabilities moved into Select; public docs/examples/catalog/source migration and built exports/register verified. Native Select remains native. | Build/docs/static + Chrome MCP | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-98 | C-99; native media/accessibility | OS forced-colors and applicable OS reduced-motion policy | Correct native high-contrast and media behavior | Registered Chrome MCP has no forced-colors or OS reduced-motion control. Explicit component reduce policy was tested separately where applicable. | Registered tool schema inspection | blocked | No CSS pseudo-state or matchMedia mock is accepted as native media evidence. |
| V-99 | C-99; native input/runtime | Required physical-input or SSR boundary | Native platform behavior verified without simulation | Native IME composition, clipboard and autofill cannot be driven by registered Chrome MCP. Synthetic protocol guards passed but are not native-input evidence. | Registered Chrome MCP schemas and current runtime inventory | blocked | Source/API evidence does not substitute for this required execution. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners actually adopted, duplicate removed | passed | Combobox removed; one Select collection/popup; Command delegates collection to Select and modal lifecycle to Dialog. Diff inspected. |
| I-02 | Sourced representative render and shared recipe | passed | Chrome pages 60/61: plain large list preserved, query InputGroup/chips and Command inline/modal screenshot inspected; close overlap and separator order repaired. Shared Command item treatment retains Menu declarations. |
| I-03 | Independent constituents and placement | passed | Chrome 61 public API: independent query trigger/clear/chip removal visibility; actual Button subclasses; inline list; modal fallback close versus authored footer close and initial input focus observed. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh live source and local reference chain; authorized identity merge validated zero issues |
| 1. Capability mapping | passed | Complete query/selection/source/surface/constituent/lifecycle union mapped, plain defaults retained |
| 2. Architecture and composition reuse | passed | One Select owner; query-specific controller, existing actual InputGroup/Button/Badge, migrate duplicate consumers |
| 3. Behavior | blocked | Observed behavior in V rows and execution appendices. Required native-input/runtime evidence remains V-99 blocked. |
| 4. Presentation and customization | passed | Shared recipes, theme overrides and applicable actual part/ref/delegate/dictionary checks pass; source and visual evidence in V rows. |
| 5. Accessibility | blocked | Native AX, real keyboard and local axe checks recorded; forced-colors browser inspection V-98 cannot be emulated with registered tools. |
| 6. Visual and interaction inspection | blocked | Light/dark/RTL/density and relevant optional states inspected; OS media/forced-colors V-98 remains blocked. |
| 7. Documentation and demo reuse | passed | Authored API documentation, copyable source and actual public nested controls reconciled; full Storybook build passes. |
| 8. Regression and reconciliation | blocked | Focused regressions, lint/type/build, served built package and documentation pass. Complete-component certification remains blocked by explicit V-98/V-99 evidence boundaries. |

## Completion / handoff

Active full scope; no completion claim.

2026-10-04 integration evidence: TypeScript including stories passes. Real Chrome query pref matches Settings keyword; Enter emits tp-execute with unchanged query/value and open modal. Programmatic and trigger openings focus native query; authored Close footer suppresses corner control. Query constituent visibility inspected on initialized controlled fixture. LargeList pointer scroll/geometry unchanged in prior integration. Native IME/clipboard and remaining matrix rows still pending.

## Reconciled execution status — 2026-10-04

Implementation and documentation for this workstream are delivered. The scenario table above supersedes earlier prospective statements below/above that say implementation or final checks are pending. Required unavailable browser/runtime evidence remains explicitly blocked; no full conformance claim is made. See [final verification results](../verification-results.md) for shared fixes, commands, package evidence and tool boundaries.
