# Attachment implementation record

## Delivery and source record

- Requested work / claim: complete Attachment composition and group, preserving application-owned status and actual Button behavior.
- Scope source: user missing-control list, library-wide shared theme and component reuse requirements.
- Fresh direct MCP Foundation and Component Library read 2026-10-04; Library ucl22-attachment, Foundation Button, composition, parts, semantics govern. Pinned clean references in ../audit.md.
- Source chain: ui/apps/v4/registry/bases/base/ui/attachment.tsx imports Button, Base mergeProps/useRender; all constituent implementations and attachment-example.tsx scenarios inspected. Nova style-nova.css1520–1575 supplies presentation. Floating not applicable to Attachment itself; preview Dialog remains actual Dialog.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Application status idle/uploading/processing/error/complete, default idle; no upload machine | ucl22-attachment | Attachment state, states examples | status; text description/error; actual Spinner; no network or lifecycle inference | docs/attachment.md | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-02 | Size xs/sm/default default default; horizontal/vertical default horizontal; mark/image default mark | ucl22-attachment | attachmentVariants/attachmentMediaVariants, Nova1520–1575 | size/orientation/mediaTreatment, existing semantic spacing/radius | docs/attachment.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-03 | Title required; optional description/content/media/actions, content-only/image states | ucl22-attachment anatomy | Content/Title/Description/Media; Files/Images/ContentOnly examples | filename/title slot; description/fileSize; media/preview/default slots; no empty region geometry | docs/attachment.md | V-01 V-02 | passed | Implementation and documented API reconciled; observed results in V-01, V-02. |
| C-04 | Native link/action trigger; independent actions; focus, keyboard, disabled and no bubbling activation | ucl22-attachment Button binding | AttachmentTrigger useRender; AttachmentAction imports Button; Triggers example | actual TpButton href or slotted trigger; actual Button remove/actions; sibling trigger overlay | docs/attachment.md | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-05 | Group overflow/snap/keyboard access, constituent registration and cleanup | ucl22-attachment Group | AttachmentGroup, ScrollableGroup example | TpAttachmentGroup same canonical part; native scrolling, optional region observation and delegate part cleanup | docs/attachment.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-06 | Parts, class/style/delegate, theme and motion; error names/status text | Library parts/appearance; Foundation7/8 | Source reusable parts and Nova | renderPart anatomy and actual Button/Spinner/Icon; shared recipes | docs/attachment.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-07 | Complete docs/API/copyable canonical and distinct group/preview compositions | Library documentation | All eight attachment-example cases mapped above | authored story, controls and actual Dialog preview with public controls | docs/attachment.md | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-99 | Native browser media/accessibility and applicable native-input or SSR verification | Shared Foundation accessibility/motion/lifecycle contract; skill verification procedure | Shared native platform and component source tests recorded above | Existing shared owners; no simulated platform substitute | Component docs and ../verification-results.md | V-98 | blocked | Implementation remains in scope; verification requires capabilities not exposed by registered tools. |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Trigger and actions | AttachmentAction→Button; Trigger→useRender native button/link | TpButton | Actual Button for generated actions/trigger; slotted public controls retained. No root click handler, no nested interactive trigger. | Button/Attachment V-01 |
| Status/media | States examples→Spinner/Icon | TpSpinner/TpIcon | Application status drives only presentation; no upload owner introduced | Spinner/Attachment V-02 |
| Surface and group | Attachment/Group + Nova | TpAttachment, shared surface recipe | Extract folder, reuse card surface semantics; native flex/overflow group; shared spacing tokens | Attachment V-02 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Root/content/media/description/group | base/Nova | attachment.tsx; style-nova.css1520–1575 | existing Attachment canonical parts and semantic surface/text/radius tokens | Preserve theme-scale spacing; complete idle/error and media treatment, optional composition | V-02 |
| Actions/trigger | base/Nova | Button imports; cn-attachment-action/trigger | Actual TpButton; attachment overlay contribution only | Root status cannot start operations; event cancellation application-owned | V-01 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| File/image/group/preview | media/status/remove/open/preview | Icon/Spinner/Button/Dialog | Real actions independent of trigger; no painted substitutes | Native img/text for document content |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-03 C-04 | Real trigger/removal/keyboard/status updates, disabled | Independent events/native semantics, error text, no upload inference | Real Chrome click and keyboard Enter emit one removal with filename; removal preserves attachment and does not navigate. Keyboard trigger follows #report independently. Disabled propagates to generated trigger/removal; processing/error semantics visible in AX. | Chrome MCP | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-02 | C-02 C-03 C-05 C-06 | Group/regions/theme/RTL/image/status and part hooks | Source-matched shared paint, proportional spacing, clean lifecycle | Light/dark/RTL/base-spacing screenshots, image/processing/error group, title delegate/ref/dictionary and actions-to-trigger reassignment checked. Remove/reinsert and disconnect/reconnect release and restore canonical registrations. | Chrome MCP screenshot/AX/axe | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-03 | C-07 | Docs/Controls/copyable examples/public registration | Complete API/compositions and exports | Authored docs and complete status/group composition use public Button, Spinner and Icon; production build, Storybook build and package registration pass. | build/static/Chrome | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-98 | C-99; native media/accessibility | OS forced-colors and applicable OS reduced-motion policy | Correct native high-contrast and media behavior | Registered Chrome MCP has no forced-colors or OS reduced-motion control. Explicit component reduce policy was tested separately where applicable. | Registered tool schema inspection | blocked | No CSS pseudo-state or matchMedia mock is accepted as native media evidence. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners actually adopted, duplicate removed | passed | Native locally painted remove replaced by actual TpButton; Spinner/media/trigger actual components. Registration, exports and diff inspected. |
| I-02 | Sourced representative render and shared recipe | passed | Chrome61 screenshot file/image/busy/error group compared with Nova; conditional vertical action placement repaired and error text wraps. Shared theme-only recipe. |
| I-03 | Independent constituents and placement | passed | Chrome61 AX actual link/remove/download, optional media and busy-to-complete collapse; click Remove emits once without hash navigation or automatic removal. Size presets scale theme spacing. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh live Attachment/Button/composition; complete local source and Nova chain |
| 1. Capability mapping | passed | All constituents, optional visibility, status, sizes/orientation/group/triggers and demos mapped |
| 2. Architecture and composition reuse | passed | Actual Button/Spinner/Icon/Dialog owners; layout only Attachment/Group; canonical recipe |
| 3. Behavior | passed | Observed behavior in V rows and execution appendices. Focused state/lifecycle and real input paths pass. |
| 4. Presentation and customization | passed | Shared recipes, theme overrides and applicable actual part/ref/delegate/dictionary checks pass; source and visual evidence in V rows. |
| 5. Accessibility | blocked | Native AX, real keyboard and local axe checks recorded; forced-colors browser inspection V-98 cannot be emulated with registered tools. |
| 6. Visual and interaction inspection | blocked | Light/dark/RTL/density and relevant optional states inspected; OS media/forced-colors V-98 remains blocked. |
| 7. Documentation and demo reuse | failed | User corrective review pending.  Authored API documentation, copyable source and actual public nested controls reconciled; full Storybook build passes. |
| 8. Regression and reconciliation | blocked | Focused regressions, lint/type/build, served built package and documentation pass. Complete-component certification remains blocked by explicit V-98/V-99 evidence boundaries. |

## Completion / handoff

Active full scope; no completion claim.

2026-10-04: full source TypeScript and focused Attachment ESLint pass. Real Chrome Remove click emitted tp-remove with original click and filename; location hash stayed empty, attachment remained. AX exposes image, file link, independently named Buttons and processing/error text. Full theme/customization/keyboard/preview matrix remains active.

## Reconciled execution status — 2026-10-04

Implementation and documentation for this workstream are delivered. The scenario table above supersedes earlier prospective statements below/above that say implementation or final checks are pending. Required unavailable browser/runtime evidence remains explicitly blocked; no full conformance claim is made. See [final verification results](../verification-results.md) for shared fixes, commands, package evidence and tool boundaries.

## User corrective review — 2026-10-04

Base attachment.tsx and Nova cn-attachment-* reread: default must fit content; horizontal minimum40spacing, vertical width24/30 based on content; sm gap2.5; xs radiuslg; vertical content inset1; image media preserved in busy states; default status stays idle per live contract. Preserve actual Button/Spinner/Icon/attachment Group owners. Add full docs use cases; do not invent component variants.
Earlier visual/docs passes are reopened by the reported defects. Fresh direct MCP head8440bff/state5daad632. Existing scoped tests are regression leads, not proof of visual completeness.
