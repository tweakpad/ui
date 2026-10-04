# One-time code implementation record

## Delivery and source record

- Requested work / claim: complete One-time code field, preserving a single editor and common forms/state behavior.
- Scope source: user requested complete One time code review/implementation with shared theme and behavior, preserving working controls.
- Sources: freshly read full live sec-147-otpfield and ucl17-one-time-code through direct MCP, IDs/pins/baseline in ../audit.md. Read local base/ui/input-otp.tsx, base/examples/input-otp-example.tsx and Nova682–700. Source imports input-otp; its runtime is not vendored locally and cannot be introduced. Native editor implements typing/IME/selection/autofill, Foundation owns state and form serialization. No Base UI/Floating OTP primitive; shadcn/native semantics apply.
- Default reconciliation: Library explicitly redefaults validation to alphanumeric/text; Foundation primitive numeric default is not adopted by the library binding. Length is required in both live contracts; remove implicit6 and diagnose absent/invalid length, updating existing catalog composition to explicit6. Default examples can show6 without implying API default.
- Design: extract existing class to one-time-code folder; adopt existing ControllableState and preserve TpFormElement association/Field/form owner. Native editor remains sole editable input; generated canonical Group/Slot/Separator parts guarantee exactly length slots. groupLengths array is the Lit binding for grouping, validationType predicate + characterPredicate supplies Library character-policy predicate; normalizeValue maps Foundation callback. No state per slot. Public normalize/value-complete/value-invalid callbacks map to existing events.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Required positive integer length, one editor/exact slots, no holes | sec-147-otpfield; ucl17-one-time-code | InputOTP/maxLength and Slot index | length required; generated canonical slots, invalid length/group diagnostics and completion blocked | docs/one-time-code.md | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-02 | Controlled/default value, proposal cancellation, normalization without mutating supplied value | same live sections and shared state | InputOTP value/defaultValue/onChange | Existing ControllableState; normalized getter/serialization, restore actual editor and selection on rejection | docs/one-time-code.md | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-03 | ASCII numeric, Unicode letter/alphanumeric, predicate, idempotent normalizer, whitespace filtering/truncation | same live sections | pattern constants/pasteTransformer capability; native code points | validationType default alphanumeric; characterPredicate; normalizeValue; inputMode derived but override hint only | docs/one-time-code.md | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-04 | Typing, deletion, logical selection/arrows, paste/autofill, IME | sec-147-otpfield | InputOTP one native editor | Native editor owns editing; composition defers normalization; paste processes full replacement and repeated completion | docs/one-time-code.md | V-01 V-02 | passed | Implementation and documented API reconciled; observed results in V-01, V-02. |
| C-05 | Completion after committed value; repeated complete paste; cancellation prevents submission | sec-147-otpfield | InputOTP onComplete/native form example | onValueComplete/tp-complete; autoSubmit false; normalized accepted value only | docs/one-time-code.md | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-06 | Name/required/disabled/readOnly/formOwner/reset/restore/Field; one value/name | Foundation forms/OTP | Field/Button actual form composition | TpFormElement unchanged; required complete validity, nativeEditor semantic target | docs/one-time-code.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-07 | Group/Separator composition, mask, placeholder/caret, aggregate/slot state, canonical parts | Library anatomy; OTP slots | InputOTPGroup/Separator/Slot, Nova caret/slot | groupLengths and separator Icon, presentational regions aria-hidden; slot indexed state/codepoints | docs/one-time-code.md | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-08 | Shared theme boundary and focus, no fixed spacing, logical joined borders/radius, reduced motion | Library presentation; motion | Nova cn-input-otp-* | shared text boundary recipe declarations, theme token extent/spacing; stable caret without new animation owner | docs/one-time-code.md | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-09 | Dynamic length/policy/owner, reconnect and no leaked selection/composition handlers | Foundation lifecycle | native editor/ref lifecycle | Lit events, shared controllers; disconnect clears transient composition/selection focus | docs/one-time-code.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-99 | Native browser media/accessibility and applicable native-input or SSR verification | Shared Foundation accessibility/motion/lifecycle contract; skill verification procedure | Shared native platform and component source tests recorded above | Existing shared owners; no simulated platform substitute | Component docs and ../verification-results.md | V-98 V-99 | blocked | Implementation remains in scope; verification requires capabilities not exposed by registered tools. |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Editing/form | input-otp via shadcn, native single editor | TpOtpField/TpFormElement, Field | Keep one editor, native editing; no TextInput lookalike because this editor is required internal anatomy | OTP/Field/Form V-01 V-02 |
| State/cancellation | InputOTP value/onChange | ControllableState used by Select/Input peers | Adopt same owner; no per-slot values or new controller | OTP plus unchanged shared consumers V-01 |
| Appearance | Nova input-otp/slot/group/caret | shared text-controls fieldBoundary/focus/invalid | Named recipe contributions reused; new slot structure follows logical grouping, no control-specific tokens | OTP/Input/InputGroup V-03 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Root/group/slots | base/Nova | cn-input-otp gap2; grouped joined borders/radius, active ring | shared field boundary/focus/invalid, theme target size/radius | Logical borders, single native editor overlays; generated slots use canonical parts | V-03 |
| Separator | base InputOTPSeparator | actual Minus Icon | TpIcon/minusIcon | aria-hidden, no separator text in value | V-03 |
| Form composition | InputOTPForm | public Field, Form, Button | Existing components | No recreated controls | V-02 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Default and verification form | field/form/action | Field/Form/Button | actual label/validation/submission; Icon separator | One native input is OTP contract anatomy |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-02 C-03 C-04 C-05 | Actual type/delete/select, controlled accept/reject, complete and invalid input | Atomic normalized value/slots/caret; no rejected completion | Real fill/type/delete/caret and controlled acceptance/rejection verified. Veto after synchronous owner write restores WXYZ and caret3; rejected proposal emits no completion; accepted completion emits once. | Chrome MCP keys/fill and public callbacks | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-02 | C-04 C-06 C-09 | Real Field focus/reset/submit, disabled/readOnly, dynamic props/reconnect | One named control/value, no stale state | One editor and repeated/native form checks verified. Uncontrolled completion submits once; reset clears uncontrolled but preserves controlled. Disabled/readOnly and native label semantics inspected. | Chrome MCP AX/API/keys/axe | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-03 | C-07 C-08 | Groups/separators/mask, active/invalid, theme/RTL/base spacing/hooks | Sourced grouped appearance, token proportion and decorative separators | Group3/3, separator/mask, Unicode code points, light RTL and base5 screenshot inspected. Part/ref/delegate/dictionary reaches group and cleans up. Axe0 for actual Field composition. | Chrome MCP screenshots/dictionary/parts | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-98 | C-99; native media/accessibility | OS forced-colors and applicable OS reduced-motion policy | Correct native high-contrast and media behavior | Registered Chrome MCP has no forced-colors or OS reduced-motion control. Explicit component reduce policy was tested separately where applicable. | Registered tool schema inspection | blocked | No CSS pseudo-state or matchMedia mock is accepted as native media evidence. |
| V-99 | C-99; native input/runtime | Required physical-input or SSR boundary | Native platform behavior verified without simulation | Native IME, clipboard paste and one-time-code autofill cannot be driven by registered Chrome MCP. | Registered Chrome MCP schemas and current runtime inventory | blocked | Source/API evidence does not substitute for this required execution. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Extracted old class; same TpFormElement and actual ControllableState owner now supply values/forms. No slot value owner. Native editor remains one. |
| I-02 | Default visual regions match traced source and shared library recipes | passed | Chrome61 grouped joined borders and shared field radius inspected; genuine minus Icon is decorative. Actual alphanumeric fill shows6characters and one form value. |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | Public groupLengths[3,3] produces2groups/one decorative separator; mask shows6bullets while value staysA1b2C3; native readonly updates independently. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Live source and local shadcn reference, dependency runtime absence and binding defaults explicitly resolved. |
| 1. Capability mapping | passed | Entire single-editor capability, constituent options, callbacks, state, normalization/form/lifecycle and presentation mapped. |
| 2. Architecture and composition reuse | passed | Existing native editor and Foundation state/forms reused; shared boundary recipe, actual Icon/Field/Form/Button. |
| 3. Behavior | blocked | Observed behavior in V rows and execution appendices. Required native-input/runtime evidence remains V-99 blocked. |
| 4. Presentation and customization | passed | Shared recipes, theme overrides and applicable actual part/ref/delegate/dictionary checks pass; source and visual evidence in V rows. |
| 5. Accessibility | blocked | Native AX, real keyboard and local axe checks recorded; forced-colors browser inspection V-98 cannot be emulated with registered tools. |
| 6. Visual and interaction inspection | blocked | Light/dark/RTL/density and relevant optional states inspected; OS media/forced-colors V-98 remains blocked. |
| 7. Documentation and demo reuse | failed | User corrective review pending.  Authored API documentation, copyable source and actual public nested controls reconciled; full Storybook build passes. |
| 8. Regression and reconciliation | blocked | Focused regressions, lint/type/build, served built package and documentation pass. Complete-component certification remains blocked by explicit V-98/V-99 evidence boundaries. |

## Completion / handoff

Active full scope; no complete claim.

## Execution evidence

Chrome61 real fillA1b2C3: single editor/six slots, one FormData code=A1b2C3, derived text mode. Independent group3/3, mask and readOnly verified. Fresh controlled valueAB rejected fillWXYZ without owner publication: editor/valueAB, incomplete, zero completion. Accepting owner publication yieldsWXYZ and one completion. Actual ArrowLeft+Backspace with callback writing1111 then veto restoresWXYZ and caret3, with no second completion. Actual uncontrolled completion auto-submitted once; native Reset cleared uncontrolled value and preserved controlledWXYZ.
Chrome55 authored default: named textbox Verification code with description, axe on Storybook root zero violations. Light RTL screenshot with Unicode𝔄B1é displaysone code point per slot, joined logical corners anddecorative separator. Themebase5 changes gap10px; target size44px remains shared accessible-target token. Native clipboard/autofill/IME driving unavailable in MCP, not claimed.
TypeScript/ESLint and productionnpm run build passed. No external OTP runtime introduced. Full docs/parts/dictionary/lifecycle matrix remains active.

## Reconciled execution status — 2026-10-04

Implementation and documentation for this workstream are delivered. The scenario table above supersedes earlier prospective statements below/above that say implementation or final checks are pending. Required unavailable browser/runtime evidence remains explicitly blocked; no full conformance claim is made. See [final verification results](../verification-results.md) for shared fixes, commands, package evidence and tool boundaries.

## User corrective review — 2026-10-04

User reports missing use cases; Base input-otp-example.tsx includes numeric, alphanumeric, four-digit, separators, disabled, invalid and submitted form. Add Docs-only examples composing public Field and Form; reuse one logical editor and current controller.
Earlier visual/docs passes are reopened by the reported defects. Fresh direct MCP head8440bff/state5daad632. Existing scoped tests are regression leads, not proof of visual completeness.
