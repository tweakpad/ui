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

## Reference-use-case reconciliation design — 2026-10-04

Fresh direct project/Foundation/Library reads retain head8440bff/state5daad632. Read full sec-147-otpfield/ucl17-one-time-code and ucl17-form; existing required-length, alphanumeric binding, single editor, controlled synchronous acceptance and common form submission/reset remain unchanged. Re-read base input-otp component/example and Nova682–700, plus new-york controlled case. Eight base cases and four new-york cases remain individually inventoried. Missing details: source separator example uses three groups2/2/2 with initial123456; invalid example uses Field Error and three groups; controlled output example is absent. Existing verification form duplicates live/copy handlers and does not cover the source Card/login/resend/support composition.

C-02/C-06/C-07 and V-01..03 design extension: use existing interactiveMarkupExample plus one setup module for controlled code output and both form compositions. Publish controlled initial value before user input; synchronously accept non-cancelled proposals, then report committed value in a microtask. Existing ControllableState remains the sole component state owner. Source2/2/2 separator example uses the same controlled handler. Field's error property/invalid state supplies the invalid example, no painted error substitute. Existing auto-submit/reset verification form is retained using shared setup; add distinct explicit-submit login composition with actual Card header/description/footer, Form, Field, OTP and Button. Resend is a consumer action reporting a request, not a fake network claim. Place it in Card's supported action region rather than nesting an interactive button inside the Field label. Native support/recovery anchors preserve destination semantics. No custom component paint, slot-size override or new theme token; use existing shared default geometry.

One setup module and trusted markup feed live and copy source, including scoped outputs and listener cleanup. All eight existing small examples stay Docs-only; Default remains the sole sidebar story. Required scenarios: real input acceptance/filtering/truncation/deletion, distinct2/2/2 grouping, native disabled and invalid naming/error relationships, explicit invalid/valid submission and reset, automatic completion submission, controlled output + source expansion retaining editor identity, narrow/RTL/theme screenshot and axe. Reopen gates0–2 for these fully mapped corrections; early integration must prove shared owners and live/copy parity before expanding verification. V-98/V-99 native-input/platform boundaries remain unresolved.

Early integration identified a component defect before wider verification: at390px, preview248px overflows to264 for ungrouped codes,297 for3/3,330 for2/2/2. Card clips the same geometry. The sole editor covers the full group; the six visual slots are not six independent targets. Reopen C-08/Gate2: constrain existing root to available width, allow groups/slots to shrink evenly while retaining the shared target-size token as preferred extent and full block hit target. This uses native flex sizing, no viewport observer, spacing attribute, demo override or new recipe. Verify wide geometry unchanged, constrained all groups fit, single editor and caret/value unaffected. Current desktop Form/Field/Card integration already rejects empty submission, focuses OTP, accepts123456 once and publishes one code; controlled output acceptsA1b2C3. Do not mark the early visual checkpoint passed until narrow repair is rendered.

Narrow repair continuation: individual OTP examples now fit248px with retained44px block target; login Card's editor fits214px. Automatic Form still expands its grid track to297px because TpForm host keeps the grid item's intrinsic auto minimum despite the native form part already declaring min-inline-size0. Extend the existing Form host structure with min-inline-size0, matching existing Field; preserve native form/layout/registration owners. This is required to let child fields honor available width in grid/flex, not a story-specific workaround. Include Form submission/reset and narrow geometry in affected-consumer regression. Support action uses existing Button link variant to avoid default browser blue outside Field's description recipe.

Form structure owner correction: static shadow :host CSS is not installed for Form's deliberate light-DOM renderRoot. The initial static declaration had no effect and was removed. Reuse registeredPartStructure.form, which already owns native Form geometry: a scoped parent selector tp-form:has(> &) sets only its owning wrapper's min-inline-size0. Registration/unregistration manages the rule; native anatomy, public part mapping and shared spacing stay unchanged. No unscoped global host rule or inline style mutation.

Early integration now passes: real controlled inputA1b2C3 updates committed output; empty login Verify blocks and focuses the sole editor, valid123456 submits one value. Shared Card/Field/Button regions inspected in desktop/narrow screenshots. All11 Docs previews at390px now reportclient248/scroll248; native OTP editor retains44px height and grouped slots fit the Card's214px content. Form wrapper's computed min-inline-size is0 through registered structure. Common live/copy setup and source separation/group/Error capabilities are present. Proceed to targeted editing, submission/reset, explorer identity, scoped theme/RTL and axe checks.

## Continuation results — 2026-10-04

- Twelve inventoried base/new-york source cases map individually to the existing canonical Default and11 Docs compositions. Added controlled feedback and source login Card; corrected initialized2/2/2 grouping,3/3 alphanumeric/disabled cases and real Field error content. Preserved automatic submit/reset composition. Source Simple3/3 also maps to Default; the additional Simple Docs example intentionally retains the ungrouped shape. Resend uses Button's existing Icon channel with a reusable refresh IconDefinition corresponding to the source RefreshCw role. Support uses Button's native link variant; recovery remains a native Field-description link. Resend is an application request only, with no network delivery claim. Card action placement and default slot sizes follow local public sections/theme rather than alternate source-local size overrides.
- Live and copied interactive examples now share one setup module through interactiveMarkupExample, scoped outputs and cleanup. Actual controlledA1b2C3 then ArrowLeft/Backspace yieldsA1b23/caret4 and matching output; actual Show/Copy reports Copied, includes setup code and preserves exact native editor identity/value. Grouped initialized123456; real deletion changes it to13456, subsequent fill987654 commits and reports987654. Initial full-code fill attempts did not change the value and are not counted as replacement evidence; no native IME/paste/autofill claim is made.
- Actual numeric12a34!567→123456; PIN123456→1234; Unicode alphanumericA1b2é3 accepted in3/3; mask displays6bullets while value123456 remains. Disabled editor is natively disabled with123456; invalid editor exposes Field error text in its description and aria-invalid. Actual empty login Verify blocks and focuses OTP; valid123456 produces Submitted code123456. Automatic accepted654321 produces one code value/output, actual Reset clears value/output. Resend actual click reports Resend requested.
- Fixed actual narrow OTP overflow in the component: root constrained to available inline size, groups min-inline-size0, slots flex-shrink with retained theme preferred width. Wide slots remain44px; narrow editor remains44px high, no separate slot input targets. All11 previews at390px now client248/scroll248; Card's editor fits214px. Dark RTL grouped987654 with radius18 visually inspected; logical value preserved, separators remain decorative. Screenshot evidence inspected inline only.
- Form's existing registered structure now also allows its light-DOM owning wrapper to shrink in grid/flex. An attempted shadow :host style had no effect and was removed. Regression actual Form Default moved into240px grid: after registration settles min-inline-size0/client240/scroll240; NameAlex + Save yields one named value and saved output, Reset clears both. No Form semantics or spacing recipe changed.
- Axe across all11 usage previews:0violations,23passing rules. TypeScript, focused ESLint/stylelint and formatting/whitespace pass; existing stories9 + structural7 + Field-state4 tests20pass. Production and Storybook builds pass, logs tmp/component-verification/one-time-code/2026-10-04/{build,storybook-build}.log. Icon exported by existing package icons wildcard, no new runtime dependency. These local logs are not portable screenshot attachments.

Source-case mapping and identified narrow/shared-wrapper regressions are resolved. Broader capability claims retain V-98/V-99 unavailable native-platform/input evidence and the full library audit remains active; no complete-component or library claim.
