# Alert Dialog implementation and evidence record

## Delivery boundary

Reviewed the live contracts and replaced the thin `TpDialogBase` subclass with a dedicated Lit implementation in `src/components/alert-dialog/`. The public tag, `TpAlertDialog` export, package registration, and existing label/description/trigger content remain available. The old generic close control is replaced by explicit consumer-owned decision actions.

**This is an implemented and tested core component, not a complete Foundation conformance claim.** Custom portal-target mounting, generic ComponentPartContract delegation/reference/content-resolver channels, and complete independently controlled trigger-association semantics remain pending. Browser coverage is Chrome only. See the unresolved capabilities below.

## Source authority

- Live Spec Blocks project: UI Library, `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`.
- Fresh direct MCP reads: Foundation `doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`, Component Library `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`, project and all 47 managed terms.
- Live version **0.3.14**, HEAD **`8440bff24a97dbbc5c762ebf4bd6baa958b305e1`**. Rechecked after implementation: unchanged, candidate clean. No specification mutations or substitute transport.
- Owning contracts: `sec-161-shared-surface-control-contract`, `sec-162-alertdialog`, `ucl19-alert-dialog`.
- Dependencies read: Foundation sections 4–8, 11, focus manager, portal/overlay/tree ownership, transition data, cross-component composition, edge/failure matrix, conformance, and applicable Appendix B marker/reason rows. Library definition/flattening rules, part naming/exposure, composition, token/dictionary/structure boundaries, state/presence, and `sec-cl-158-motion-roles`.
- Library baseline: `bdaf410d8ee736a90db3322d0f40d0f85e293324`.
- Base UI: `5b495488d182c81a8a14a440d7a376517118f8ec`, clean. Investigated AlertDialog exports/root/handle/tests, reused Dialog root/popup/portal behavior and focus tests.
- Floating UI: `27629b74ba36ab8ceb2a968051927b9b69511a3b`, clean. Investigated focus management, composed boundaries, restoration and nesting.
- shadcn: `63c1308d112b6b1205d86244a156cca1abef5087`, clean. Investigated base and new-york Alert Dialog anatomy, action ownership, spacing and responsive composition.
- Reference checkout revisions and cleanliness were rechecked. No external checkout was modified or fetched.

## Architecture and composition reuse

| Responsibility                              | Owner and implementation                                   | Regression boundary                                                                             |
| ------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Root, generated anatomy, action association | `components/alert-dialog/alert-dialog.ts`                  | Alert Dialog instances, nesting, slots and events                                               |
| Detached handle and trigger migration       | `components/alert-dialog/handle.ts`                        | Most recent live Root, payload, cleanup and inactive triggers                                   |
| Structural layout                           | `components/alert-dialog/styles.ts`                        | Native top layer, viewport bounds, RTL, stacked actions                                         |
| Controlled proposals and retention          | `foundation/surface-state.ts`                              | New independently tested owner; used by Alert Dialog                                            |
| Composed focus                              | `foundation/focus.ts`                                      | Alert Dialog, Dialog, Drawer, Side Panel; floating restoration                                  |
| Escape ordering                             | `foundation/floating-dismiss.ts`                           | Topmost open surface, including a top surface with Escape disabled                              |
| Presence completion/reconnect               | `foundation/presence.ts`                                   | Dialog family, floating overlays, Collapsible/Accordion consumers                               |
| Scroll lock                                 | `foundation/scroll-lock.ts`                                | Reference-counted owner-document leases; preserve later inline writes                           |
| Paint and public hooks                      | `presentation/default.ts`, existing PresentationController | Alert Dialog parts, tokens, alternate dictionary and registered native actions                  |
| Composed Button sizing and contrast         | `components/button.ts`, `styles.css`                       | Native control fills a stretched host; primary/destructive foregrounds pass dark-theme contrast |

All demos and fixtures use registered `tp-button` for action roles. Native headings, paragraphs and layout wrappers provide ordinary content. The implementation's native `dialog` owns modal semantics, and its native top-layer Overlay provides replaceable backdrop motion. No runtime dependency was added. The fixture is outside Storybook discovery and package exports.

## Capability matrix

| Capability                         | Authority / local evidence                                | Implemented interface and evidence                                                                                                                                                              | Status  |
| ---------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Controlled/uncontrolled state      | Foundation §5, shared surface control; Base UI root tests | Optional `open`, `defaultOpen`, cancellable proposals, stable ownership mode, reentrant proposal queue; unit and browser acceptance/rejection                                                   | passed  |
| Cancellation and source events     | Foundation §5.3, Appendix B.8                             | `TpSurfaceOpenChangeEvent`, allowed reasons, source placeholder, callback and DOM veto; canceled retention does not leak                                                                        | passed  |
| Modal decision semantics           | AlertDialog contract and library identity                 | Native named `alertdialog`, always modal, no outside-close, closeOnEscape, explicit actions; AX and actual keyboard/pointer checks                                                              | passed  |
| Initial/final focus                | AlertDialog / FocusPolicy                                 | Cancel default, Confirm/ID/element/resolver support, composed Tab/Shift+Tab, connected trigger/previous fallback; tested safe default, Confirm and disabled fallback                            | passed  |
| Trigger ownership                  | Foundation shared surface control                         | Keeps authored handlers/part tokens, cleans replaced trigger, forwards semantics to actual action, uses owner referenceTarget where available; real old/new-trigger clicks                      | passed  |
| Detached handles                   | Foundation shared surface control; Base UI handle         | Factory, open/close/isOpen, payload, migration/overlap, inert without Root; browser API and original-ARIA cleanup checks                                                                        | passed  |
| Independent trigger control lane   | Foundation atomic association rules                       | Basic triggerIdentifier/defaultTriggerIdentifier inputs exist; complete accepted/rejected association-lane semantics and content resolver parity are not implemented                            | pending |
| Title/Description                  | Foundation §7 / catalog                                   | Visible Title, label/description fallback, slot-only description and dynamic text relation; accessible tree and axe                                                                             | passed  |
| Nested modality                    | Shared surface control / floating tree                    | Native modal boundary, tree registration, topmost Escape, nested markers, suppressed duplicate Overlay, scroll leases; child-only Escape and restored parent trigger                            | passed  |
| Top layer and transformed ancestor | Portal/overlay contract                                   | Native dialog and Overlay escape transformed/clipped fixture ancestor without moving authored children                                                                                          | passed  |
| Generic Portal API                 | Foundation portal profile                                 | Custom target/identifier/preserveTabOrder binding and target migration are not provided                                                                                                         | pending |
| Presence and external motion       | Foundation §6; library backdrop role                      | Retention, close/unmount actions, completion once, interruption, reconnect, external driver, reduced policy; unit/browser tests                                                                 | passed  |
| Full Backdrop forceRender profile  | Shared surface control                                    | Nested backdrop forcing is supported; independent inactive Backdrop mounting is not exposed                                                                                                     | pending |
| Public anatomy/presentation        | `ucl19-alert-dialog`                                      | All 12 named parts available in their applicable presence/slot conditions; Actions replaces undeclared footer part; token and native-part hooks verified                                        | passed  |
| ComponentPartContract completeness | Foundation §4 / library delegation law                    | Generic renderDelegate, hostProperties, state-resolver class/style/content and elementReference channels are not exposed; no claim that slots replace the complete contract                     | pending |
| Owner-realm/advanced focus policy  | Foundation §4.5, §8, §19.11                               | Current-owner document locks/native modality implemented; full cross-document/shadow-realm, logical portaled descendants, permitted outside elements and every focus-policy variant not covered | pending |
| Documentation                      | Skill gate 7                                              | Authored Default, public property/method/event/slot/part docs, real Controls, generator exception and catalog tests                                                                             | passed  |

Confirm is a synthesized action identity: its effect belongs to the consumer. It does not automatically delete, submit, or close. Cancel proposes `close-action`. The canonical example uses a consumer handler to close Confirm. Existing `footer` content remains accepted as an Actions slot alias; no undeclared footer part is emitted.

## Browser verification

Exclusive driver: registered Chrome DevTools MCP. No Playwright, CUA, raw CDP, shell browser driver or browser-script command was run.

- Chrome 153/macOS. Native desktop viewport plus emulated **1440 × 1000** dark and **390 × 844** light, DPR 1; LTR and RTL.
- Existing Storybook reused at `http://localhost:6006`.
- A task-owned Vite server was started at `http://localhost:5173` because Storybook did not serve the durable fixture path. No other server was stopped.
- Source fixture: `http://localhost:5173/tests/fixtures/components/alert-dialog/index.html`.
- Built fixture: `http://localhost:5173/tests/fixtures/components/alert-dialog/package.html`.
- Docs: `http://localhost:6006/?path=/docs/components-alert-dialog--docs`.

| Scenario                                                  | Observed result                                                                                                                                                                                                                                                            | Status                    |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Real opening and keyboard cycle                           | Cancel focused; Tab visits Confirm and cycles; Shift+Tab wraps; Escape closes and restores Trigger, including built package                                                                                                                                                | passed                    |
| Nested dialog                                             | Child safe action focused; one Escape closes child only; parent remains modal/scroll-locked and child Trigger regains focus                                                                                                                                                | passed                    |
| Outside pointer and Escape disabled                       | Real click on an ignored background node leaves dialog open and Cancel focused; Escape disabled leaves it open                                                                                                                                                             | passed                    |
| State APIs                                                | Controlled rejection/acceptance, property close, cancellation, retention, unmount, keepMounted removal, disconnect/reconnect and scroll cleanup observed                                                                                                                   | passed                    |
| Replaced triggers                                         | Old trigger keeps authored onclick and part but no longer opens; new trigger preserves onclick/part and opens exactly once                                                                                                                                                 | passed                    |
| Handles                                                   | Payload and identifier, last attached Root wins, prior Root restored on detach, no-Root trigger inert, original ARIA restored on cleanup                                                                                                                                   | passed                    |
| Motion                                                    | Declared backdrop enter/exit requests; external playback completes each cycle once; reduce policy skips driver playback; rapid reversal has one final completion; close-complete callback may reopen with a new payload                                                    | passed                    |
| Automated accessibility                                   | Local axe-core, no disabled rules: zero violations in open dark and narrow/light/RTL states and dark shared action colors. `aria-valid-attr-value` remains a manual-review item because axe sees the empty serialized attribute of the element-reference ARIA relationship | passed with manual review |
| Semantics                                                 | AX exposes one named modal alertdialog and consequence description; Trigger expanded/haspopup reaches the actual Button control; element reference points to the owning host and Chrome referenceTarget points to Content                                                  | passed                    |
| Visual review                                             | Screenshots inspected: centered surface, title/description hierarchy, separated actions, focus ring, dark/light palette, clipped/transformed ancestor, long RTL text, narrow layout; narrow native Button widths now match stretched hosts                                 | passed                    |
| Customization                                             | Scoped popover token, content/action partPresentation and a replacement dictionary with changed color/font/padding/border preserve focus and native Content identity                                                                                                       | passed                    |
| Docs and Controls                                         | API headings, canonical registered Buttons and one Default rendered. Real Control label click opens; Escape closes and the Control returns false after the Storybook args update                                                                                           | passed                    |
| Shared consumers                                          | Real keyboard checks for Dialog, Drawer, Side Panel and Escape for Popover; API reconnect visibility for those plus Collapsible                                                                                                                                            | passed                    |
| OS reduced motion / touch / forced colors / screen reader | Tool did not provide these environmental/input gates. Policy-level reduced motion is separately verified. No simulated input or AX snapshot is claimed as a screen-reader test                                                                                             | blocked                   |
| Full affected-catalog visual audit                        | Representative Button/Badge token checks and overlay consumers covered; not a complete catalog-wide audit of changed semantic color pairs                                                                                                                                  | pending                   |

The original review failures and MCP/client troubleshooting history are preserved in `tmp/component-verification/alert-dialog/2026-10-02-implementation/pre-implementation-checklist.md`. They are historical, not current blocker statuses. The direct Spec Blocks connection is working.

## Non-browser checks and evidence

- `npm test`: **64 tests passed**, 10 files, including surface-state and Presence regressions.
- TypeScript build and `npm run build`: passed.
- `npm run build-storybook`: passed; existing large-chunk advisory remains.
- `npx eslint .`: passed.
- Focused Stylelint for changed style-bearing files: passed.
- `npm run format:check`: passed.
- `git diff --check`: passed.
- Full `npm run lint`: fails on four **pre-existing** `rule-empty-line-before` errors in `src/components/primitives.ts` (lines 258, 261, 655, 658). Confirmed in HEAD; that file is unchanged.
- Built package exports/registration and actual keyboard behavior verified through the served built fixture.

Evidence is local under `tmp/component-verification/alert-dialog/2026-10-02-implementation/`, including screenshots, command logs, and `browser-evidence.json`. These ignored files are not automatically available on another machine. The durable fixture and this checklist are reviewable source artifacts.

## Remaining work before a complete-component claim

1. Implement the generic Foundation part/delegation, content-resolver, independently controlled trigger-association and complete Portal/Backdrop profiles without replacing them with undocumented binding-specific behavior.
2. Complete the owner-realm/logical portal/focus-policy and environmental-input matrix; extend regression coverage for all affected shared consumers and semantic color pairs.
3. Resolve the unrelated baseline Stylelint errors in a separate cleanup scope.

No specification amendment, dependency addition, package-script cleanup, commit or publication is included in this change.
