# Command palette implementation record

## Delivery and source record

- Requested work / claim: full Command palette with inline and optional actual Dialog composition, shared collection owner.
- Scope source: explicit user missing-control list, real reference parity, preserve working controls, no duplicate non-normalized behavior.
Fresh live Foundation sec-177-command and Library ucl18-command plus Dialog contract read via direct MCP. Source revisions in ../audit.md. Local base/ui/command.tsx imports cmdk and Dialog/InputGroup; cmdk runtime is not vendored and is not introduced. Foundation ranking/activation semantics resolve the local implementation. Nova356–416 traced. Existing Command inherits duplicated Combobox popup and lacks real Dialog; replace with Select list policy and actual Dialog lifecycle. Dialog body/has-body protected composition hooks preserve its current default slot path and all lifecycle ownership.

Library adaptation: Dialog live ucl19-dialog requires a reachable named Close action even when showCloseControl=false. Command retains that inherited fallback; it hides the corner control when an authored close action is reachable. This intentionally strengthens the shadcn default and preserves the existing Dialog contract. The query remains the default focus target after child rendering.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Command query and active value independent controlled/default/cancellation | sec-177-command; ucl18-command | cmdk Root interface referenced by base/ui/command.tsx | ControllableState query/highlight, Select query/list mechanics | docs/command-palette.md | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-02 | Default ranked token/keyword filter and custom finite rank/disabled filtering | sec-177-command | Command Root filter/shouldFilter; Foundation explicit ranking | Command ranking adapter produces authoritative Select filteredItems, stable records | docs/command-palette.md | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-03 | Pointer/keys, disabled, loops false, composition and nearest scrolling | sec-177-command | Command/Input/Item; Select shared query owner | Actual Select query/list with execution policy; no second collection renderer | docs/command-palette.md | V-01 V-02 | passed | Implementation and documented API reconciled; observed results in V-01, V-02. |
| C-04 | Execution callback first/cancellation; no persistent selection or active-lane mutation | sec-177-command audit rules | CommandItem activation | Select subclass overrides activation only; TpExecuteEvent details/source; no selection commit | docs/command-palette.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-05 | Dynamic source/removal/duplicate/order/force mounting/empty/noExecutableMatch | sec-177-command | CommandGroup/Item/List/Empty | Shared ChoiceModel/Collection; hidden mounted entries excluded navigation and counts | docs/command-palette.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-06 | Inline and Dialog composition/open/default/retained/control/focus/dismissal | ucl18-command; sec-163-dialog | CommandDialog imports Dialog; title/description defaults | TpCommandPalette extends actual TpDialog; inline returns same collection, no extra open owner | docs/command-palette.md | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-07 | Optional corner close false; independent header/name/description and footer | ucl18-command Dialog composition | CommandDialog showCloseButton=false; Dialog Header/Content | Inherited Dialog optional close/footer, header visually hidden for palette; same label semantics | docs/command-palette.md | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-08 | Icons, shortcuts, labels/groups/separators and empty content | Library anatomy | CommandItem/Shortcut/Group/Separator | Actual TpIcon/TpKeyHint; generated native option/group anatomy from shared Select | docs/command-palette.md | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-09 | Canonical parts/states/hooks/theme and shared radius/spacing | Library presentation | Nova cn-command-* and shared dialog/menu/InputGroup | Actual InputGroup/Button/Icon; same popup/list recipes, canonical command map | docs/command-palette.md | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-10 | Docs/Controls/compositions and package exports | Library definition | base/examples/command-example; base/ui/command | Authored canonical inline palette and Dialog use case, complete API | docs/command-palette.md | V-05 | passed | Implementation and documented API reconciled; observed results in V-05. |
| C-99 | Native browser media/accessibility and applicable native-input or SSR verification | Shared Foundation accessibility/motion/lifecycle contract; skill verification procedure | Shared native platform and component source tests recorded above | Existing shared owners; no simulated platform substitute | Component docs and ../verification-results.md | V-98 V-99 | blocked | Implementation remains in scope; verification requires capabilities not exposed by registered tools. |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Query/collection/items | cmdk public facade; Base choice families | Select and old Combobox-derived Command | Command list extends Select query owner, replacing only ranking/highlight/activation policy. Remove old Combobox owner and Command duplicate floating styles. | Select and Command V-01 V-02 |
| Modal lifecycle | base CommandDialog imports Dialog | TpDialog/AlertDialog | Root extends Dialog; small protected body rendering hooks preserve default Dialog markup. Inline skips optional modal render. | Dialog/AlertDialog/Command V-03 |
| Editor/actions/presentation | CommandInput imports InputGroup, icons | Actual InputGroup/Button/Icon/KeyHint | Reuse actual components and normalized menu recipes; Command canonical mapping | Select/InputGroup V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Input/List/Items | base/Nova cn-command-* | Command/InputGroup/List/Item/Group/Shortcut | Shared Select recipe and actual InputGroup/Icon/KeyHint | Same theme spacing/radius; no command-only spacing tokens | V-04 |
| Optional modal | base/Nova CommandDialog/Dialog | Dialog Header/Content, showCloseButton false | Actual TpDialog owner and recipe | Visually hidden naming header; optional corner/action regions independent | V-03 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Canonical inline and modal palette | query/list/modal/icons/shortcuts/trigger | Select collection, Dialog, InputGroup, Icon, KeyHint, Button | Real keyboard/close/focus/shortcut semantics; no global bindings installed | Native editor/options are shared Select anatomy |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-02 C-03 | Ranked query, controlled query/highlight rejection, real keys | Independent lanes, stable rank and no pointer scroll | Real query pref ranks Settings; controlled query/highlight reject missing acknowledgement, accepted owner updates commit, real ArrowDown and Enter work. Large Select pointer regression retains offset. | Chrome MCP + focused rank helper | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-02 | C-03 C-04 C-05 | Execute/cancel, pointer/disabled/source changes/force mount | Execution does not commit selection; dynamic repair | Real Enter emits execution without changing query/value or closing modal; item callback veto suppresses it. Source disabled removal repairs stale projection. Disabled-only matches report noExecutableMatch; forced unmatched item stays mounted but excluded from count/highlight. | Chrome MCP/API | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-03 | C-06 C-07 | Inline, modal trigger/open/close/Escape/corner/footer/focus | Actual Dialog lifecycle, no duplicated state | Inline and actual Dialog compositions checked. Programmatic and trigger opening focus query; authored Close action suppresses corner; Escape restores focus. Shared Dialog modal/trap/nonmodal checks pass. | Chrome MCP AX/keys | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-04 | C-08 C-09 | Default/icons/shortcuts/empty, theme/RTL/parts/dictionary | Shared sourced presentation and semantics | Actual InputGroup/Icon/KeyHint and groups/separators inspected in dark/light and shared density. No-results and disabled results inspected; canonical constituent customization is shared with Select. Axe evidence in combined composition. | Chrome MCP screenshot/axe | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-05 | C-10 | Docs/Controls/source/export plus Select/Dialog consumers | Complete public docs and no old Combobox owner | Authored inline/modal API and source examples, no separate Combobox owner. Production and Storybook builds and built public exports pass. | Build/static/Chrome MCP | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-98 | C-99; native media/accessibility | OS forced-colors and applicable OS reduced-motion policy | Correct native high-contrast and media behavior | Registered Chrome MCP has no forced-colors or OS reduced-motion control. Explicit component reduce policy was tested separately where applicable. | Registered tool schema inspection | blocked | No CSS pseudo-state or matchMedia mock is accepted as native media evidence. |
| V-99 | C-99; native input/runtime | Required physical-input or SSR boundary | Native platform behavior verified without simulation | Native IME composition and clipboard input cannot be driven by registered Chrome MCP. | Registered Chrome MCP schemas and current runtime inventory | blocked | Source/API evidence does not substitute for this required execution. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners actually adopted, duplicate removed | passed | Combobox removed; one Select collection/popup; Command delegates collection to Select and modal lifecycle to Dialog. Diff inspected. |
| I-02 | Sourced representative render and shared recipe | passed | Chrome pages 60/61: plain large list preserved, query InputGroup/chips and Command inline/modal screenshot inspected; close overlap and separator order repaired. Shared Command item treatment retains Menu declarations. |
| I-03 | Independent constituents and placement | passed | Chrome 61 public API: independent query trigger/clear/chip removal visibility; actual Button subclasses; inline list; modal fallback close versus authored footer close and initial input focus observed. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh Command/Dialog contract and reference chain, actual upstream dependency owners traced |
| 1. Capability mapping | passed | Query/highlight/execution/ranking/constituents/modal/lifecycle mapped |
| 2. Architecture and composition reuse | passed | Actual Select list and Dialog owners, no duplicated popup/list renderer; scoped protected composition hooks |
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
