# Form implementation and evidence record

## Delivery and source record

- Requested work / claim: Form implementation workstream in the full library completion task; no reduction of the parent scope.
- Scope source: user explicitly lists broken Form and requires shared behavior, theme spacing and protection of working controls.
- Sources: fresh direct Foundation sec-145-form and Library ucl17-form; project/document IDs and clean pinned revisions in ../audit.md. Current Spec Blocks HEAD 8440bff24a97dbbc5c762ebf4bd6baa958b305e1.
- Source correction: async validation intentionally does NOT block default submission. Consumers cancel tp-submit and await the exposed ValidationRun when required. Repair pending policy without changing that contract.
- Implementation baseline: grouped forms.ts TpForm; existing Field registry, Field submission symbol, ValidationRun and Button form association. Chrome MCP tab 61 showed native form display block, no gap, named values intact.
- References: Base UI form/Form.tsx and Form.test.tsx; Nova cn-field-group and cn-field. No shadcn separate Form wrapper in this registry base; composition uses Field and native form.
- Evidence: tmp/component-verification/library-completion/form/; local only. Existing Vite and Storybook servers reused.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Native form boundary and current successful values; named fields/duplicates/unnamed/dynamic membership | Foundation sec-145-form | Base form/Form.tsx fields and getValue | retain light DOM native form and fieldValues; stable existing Field registry; extract owner folder | docs/form.md; src/stories/form.stories.ts | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-02 | External errors remain authoritative; validationMode and timing on-submit/on-blur/on-change default on-submit | Foundation sec-145-form; Library ucl17-form | Form externalErrors/validationMode and local Field.mode | existing errors/validationMode/validationTiming properties; live attribute updates notify Fields | docs/form.md; src/stories/form.stories.ts | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-03 | validate(name?) returns current ValidationRun; cancellation and failed/stale generations | Foundation sec-145-form | Base Form actionsRef and local ValidationRun | retain validate/actions; propagate canceled field runs instead of settling valid; cleanup at disconnect | docs/form.md; src/stories/form.stories.ts | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-04 | Required synchronous validation blocks submission; async validation remains consumer-owned | Foundation sec-145-form | Base Form onSubmit/onFormSubmit; local Field[fieldSubmission] | retain requestSubmit, tp-submit cancellation and onFormSubmit; one values snapshot reused for event/callback | docs/form.md; src/stories/form.stories.ts | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-05 | Native validation enabled/suppressed; novalidate alias updates native host | Library ucl17-form | native form noValidate and local existing API | synchronize property and attribute changes; suppression controls native host interface, Field synchronous constraints retained | docs/form.md; src/stories/form.stories.ts | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-06 | Submission policy always-enabled/disable-while-invalid/disable-while-pending; preserve authored disabled | Library ucl17-form | Foundation shared validation status; local TpButton submit forwarding | pending aggregate and published Field markers; only restore disabled attributes owned by Form policy | docs/form.md; src/stories/form.stories.ts | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-07 | Invalid enabled visible control focus and cancellation policy | Foundation sec-145-form | Base focusFirstInvalid, comesBeforeInSameTree | DOM-order registered Fields; retain rejection if invalid but skip nonfocusable controls for focus | docs/form.md; src/stories/form.stories.ts | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-08 | Reset defaults only; controlled values remain; tp-reset observes completed state and real form | Foundation sec-145-form; Library ucl17-form | native reset and local Field/TpFormElement reset callbacks | capture native form before microtask; do not publish canceled reset; include post-reset values | docs/form.md; src/stories/form.stories.ts | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-09 | Optional summary/actions regions; root/parts/theming | Library ucl17-form | Nova cn-field-group, cn-field; native layout compositions | existing presentation controller and registered structural owner; reuse field-group spacing; canonical part bindings for actions and summary | docs/form.md; src/stories/form.stories.ts | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-10 | Standalone export/docs/canonical example, native and public Button integration | user regression requirement | local Button.requestSubmit and Field/ValidationRun owners | move only Form class; generated entry replaced with authored public Controls and docs; reuse Field/Input/Button | docs/form.md; src/stories/form.stories.ts | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-99 | Native browser media/accessibility and applicable native-input or SSR verification | Shared Foundation accessibility/motion/lifecycle contract; skill verification procedure | Shared native platform and component source tests recorded above | Existing shared owners; no simulated platform substitute | Component docs and ../verification-results.md | V-98 | blocked | Implementation remains in scope; verification requires capabilities not exposed by registered tools. |

## Architecture and reuse

Form moves from forms.ts to components/form, with a compatible grouped export. No duplicate Field validator, form-value model or Button implementation. Existing Field settled-event semantics remain unchanged; Form observes published pending/invalid markers as well as its own aggregate run.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Field state and values | Base FormContext fields; Field validation | Field[fieldSubmission], fieldValues, ValidationRun | Preserve synchronous/async policy; propagate cancellation and aggregate run state | Form, Field, Input; V-01, V-02 |
| Native submit/reset | Base Form native form; native event semantics | TpForm, TpButton requestSubmit, TpFormElement.formResetCallback | Capture stable event targets; preserve Button submitter/name/value; do not recreate buttons | Form/public and native Button; V-01, V-03 |
| Theme and regions | shadcn Field group composition / Nova | fieldAppearance, PresentationController, registeredPartStructure | Same Field group spacing; native form structure and canonical summary/actions parts | Form and unchanged Field consumers; V-03 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Form root and Field group | bases/base; Nova | field.tsx; cn-field-group gap-5 | fieldAppearance field-field-group and registeredPartStructure | Reuse actual gap recipe; structure owns layout | V-03 |
| Form actions and summary | bases/base; Nova | Field/Button composition; native content | existing public Button, native summary links, form-actions/form-error-summary | Theme gap roles and text; no local button paint or per-control spacing API | V-03 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Canonical Form | Field, editable value, submit/reset | TpField, TpInput, TpButton | Native association and actual click/keyboard submission/reset; V-01, V-03 | Native form/action group/summary content preserve required semantics |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-04 C-07; behavior/semantics | Real submit invalid then valid; tp-submit cancellation; callback values; hidden invalid followed by visible invalid; native submitter | Synchronous errors block, correct visible focus and one value snapshot; callback prevents navigation; cancel suppresses callback | Real invalid/valid Save and public requestSubmit inspected; callback receives named value plus public submitter intent=save. Preventing tp-submit suppresses callback. Hidden invalid before visible invalid focuses visible after shared native-form named-property fix. | Chrome MCP actual click/fill/key and event collection | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-02 | C-02 C-03 C-05 C-06; lifecycle/API | Deferred validators, replacement/cancel, submission policies, runtime attrs/errors, preserved disabled | Current pending disables policy-owned actions; settles/restores; no canceled run reported valid; native interface updates; async default unchanged | Deferred validation pending disables/restores policy-owned actions; superseded run cancels. Removing/moving/reinserting actions releases/reapplies owned disabled state. nativeValidation/noValidate/method changes synchronize live. | Chrome MCP controlled Promise/public API fixture | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-03 | C-08 C-09 C-10; visual/docs/regression | Reset canceled/accepted, public fields and actions; spacing override, light/dark; authored Docs | Reset references actual form and restored values; grouped themed layout; original Field/Button owners and exports work | Cancelled reset preserves Alex; accepted reset clears and reports actual native form. Light/dark/base5 screenshot and native AX/axe0; shared Field-group gap and real Field/Input/Button composition. Docs and builds pass. | Chrome MCP, typecheck/build and relevant tests | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-98 | C-99; native media/accessibility | OS forced-colors and applicable OS reduced-motion policy | Correct native high-contrast and media behavior | Registered Chrome MCP has no forced-colors or OS reduced-motion control. Explicit component reduce policy was tested separately where applicable. | Registered tool schema inspection | blocked | No CSS pseudo-state or matchMedia mock is accepted as native media evidence. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Actual diff retains Field submission symbol, ValidationRun, fieldValues and TpButton native submit adapter; grouped export delegates to form folder. |
| I-02 | Default visual regions match traced source and shared library recipes | passed | Chrome tab 61: native form display flex, shared Field-group gap 16px at 3.2px base spacing, actions expose form-actions. No local Button appearance. |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | Real Save/Reset input preserved native submitter data and reset form reference; pending policy disables/restores and native-validation attrs update independently. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh full Form contracts read; Base native submit implementation confirms async nonblocking policy; parent audit corrected. |
| 1. Capability mapping | passed | All current properties/methods/events/regions map to C-01..C-10 and V-01..V-03; no changed transport or async default. |
| 2. Architecture and composition reuse | passed | Shared Field/ValidationRun/Button remain actual owners; native Form structure and shared Field-group spacing mapped. |
| 3. Behavior | passed | Observed behavior in V rows and execution appendices. Focused state/lifecycle and real input paths pass. |
| 4. Presentation and customization | passed | Shared recipes, theme overrides and applicable actual part/ref/delegate/dictionary checks pass; source and visual evidence in V rows. |
| 5. Accessibility | blocked | Native AX, real keyboard and local axe checks recorded; forced-colors browser inspection V-98 cannot be emulated with registered tools. |
| 6. Visual and interaction inspection | blocked | Light/dark/RTL/density and relevant optional states inspected; OS media/forced-colors V-98 remains blocked. |
| 7. Documentation and demo reuse | failed | User corrective review pending.  Authored API documentation, copyable source and actual public nested controls reconciled; full Storybook build passes. |
| 8. Regression and reconciliation | blocked | Focused regressions, lint/type/build, served built package and documentation pass. Complete-component certification remains blocked by explicit V-98/V-99 evidence boundaries. |

## Documentation synchronization

- [x] API, native semantics, async cancellation example and public Controls.
- [x] Canonical and copyable source use public Field/Input/Button.
- [x] Export and generator handling preserve authored docs.

## Completion / handoff

Active work; no completion claimed. Parent scope remains in ../audit.md.

## Reconciled execution status — 2026-10-04

Implementation and documentation for this workstream are delivered. The scenario table above supersedes earlier prospective statements below/above that say implementation or final checks are pending. Required unavailable browser/runtime evidence remains explicitly blocked; no full conformance claim is made. See [final verification results](../verification-results.md) for shared fixes, commands, package evidence and tool boundaries.

## User corrective review — 2026-10-04

User reports missing use cases; source-backed form composition examples must cover validation, external errors, mixed actual field controls, reset and submission, not attribute-permutation stories. Preserve current Form/Field owners.
Earlier visual/docs passes are reopened by the reported defects. Fresh direct MCP head8440bff/state5daad632. Existing scoped tests are regression leads, not proof of visual completeness.

## Shared light-DOM presentation regression — 2026-10-04

Chrome76 current Form Docs exposed `form-actions` and `form` part names but computed `display:block;gap:normal` for every form. The CSP resource migration only emitted automatic bound-part rules to shadow roots; light-DOM bindings received part names without native-part registration. Earlier spacing passes do not survive this regression.

Design repair: PresentationController must register automatically bound light-DOM parts through its existing `registerPart` and GeneratedStyleResource owner, with per-element/part cleanup on removal/disconnect. Preserve shadow-root emission and explicit native registration unchanged. Form is the only current component overriding createRenderRoot to light DOM. Actual shared consumers to regress: shadow Button/Field and custom/native Table; scoped CSP nonce/suppression and Form dynamic actions. No Form-specific paint or duplicated style transport. C-09/I-02/V-03 and content-security C-07 are reopened until this result is verified.


Current corrective integration and shared-regression evidence: [library-wide use-case review](../use-case-review-2026-10-04.md). Parent scope remains active; this record does not certify unreconciled source cases.

## Field validation timing repair — 2026-10-04

Fresh direct contracts sec-143-field, sec-145-form, ucl17-field/input-group: Field publishes validity according to validation mode and propagates it to the semantic control. Local Base FieldRoot.tsx initializes valid=null; useFieldValidation.ts/getValidationProps sets aria-invalid only from published invalid state; FieldRoot.test.tsx confirms no aria-invalid before submission/validation finishes. Current TpFormElement.effectiveInvalid incorrectly ORs native invalidity even when Field publishes invalid=false, causing required fields to announce errors on first render and InputGroup to paint invalid prematurely.

Shared design: an explicitly supplied Field invalid boolean owns computed invalid presentation; native ElementInternals validity remains unchanged and still blocks invalid submission. Standalone native invalid state remains the fallback when no Field invalid context exists. Independently authored control invalid=true remains authoritative. Slider thumb propagation already supplies the owning Slider invalid boolean and remains on this same path. No new state machine, API, token or per-control exception.

Capability/test extension C-02/C-07, V-02/V-03: inspect required Input/TextArea/Select/NativeSelect/Checkbox/OTP initial Field state, failed submit and reset; explicit invalid and Field external errors; detachment/restoration; retain standalone constraint validation and actual Save/reset behavior. Representative live integration precedes broader verification. InputGroup's native control invalid observation consumes the same repaired state.

Validation integration exposed a second shared defect: OTP Verification form, actual fill12 then Verify, has ElementInternals.validity.valid=false but Field publishes valid=true/no error. Field.validate reads the inner input first; an inner text input cannot represent a composed code's completion constraint (or a composed/range control's aggregate constraints). Extend the same shared repair to prefer the registered control's public validity and validationMessage, falling back to its inputElement only when no host validity exists. Native controls still read their own validity. TpFormElement exposes ElementInternals as the common owner; no OTP exception. Required-consumer matrix includes actual incomplete/complete code submission and reset plus Input/Textarea/Select/NativeSelect/Checkbox and standalone constraints. The earlier fixture missing OTP's required length was invalid setup and is discarded.

Current shared validation integration: Chrome76 actual Form Save→error, typeAlex→error clears, Save→saved output, Reset→empty/pristine; required native validity remains false before validation. Public API fixture for Input/Textarea/Select/NativeSelect/Checkbox/OTP(length6): all six initially publish invalid=false while native constraints remain invalid; Field.validate exposes their own message and invalid=true. Actual OTP12→Verify now shows Complete the code and blocks output; completing123456 clears the error and auto-submits Submitted code:123456. Explicit control invalid remains authoritative and detaching from Field restores standalone validity presentation. OTP Docs reset now clears its completion output and uses the existing form-actions wrapper. This extends the earlier integration evidence, not whole-library certification.
