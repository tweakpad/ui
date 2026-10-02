# Dialog and Alert Dialog correction

## Delivery and source record

- Component(s) / public identity: `tp-dialog`, `tp-alert-dialog`; affected shared consumers `tp-drawer`, `tp-side-panel`.
- Requested work / claim: fix both dialogs' shared implementation, close-control composition and footer presentation, including behavior and documentation regressions caused by that repair.
- Scope source: user correction requires Alert Dialog to reuse Dialog, configurable Dialog corner closing, Card-style footer presentation, and extraction from local shadcn; latest instruction is "now fix both dialogs".
- In-scope changes and existing gaps: remove the parallel Dialog-family owner, preserve distinct policies and existing supported APIs, expose a real corner control and independently authored footer actions, share Card footer paint. This record covers that correction, not full Foundation conformance. Older generic Portal/delegation/controlled-association gaps recorded in `../alert-dialog/implementation-checklist.md` remain unresolved and are not reclassified as non-applicable or passed here.
- Repository baseline / unrelated changes: `bdaf410d8ee736a90db3322d0f40d0f85e293324`; user-staged prior work and skill changes preserved; no index resets or commits.
- Live project / document IDs and revisions: direct Spec Blocks reads, UI Library 0.3.14, HEAD `8440bff24a97dbbc5c762ebf4bd6baa958b305e1`, candidate clean; Foundation `doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`, library `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`, all 47 terms.
- Owning contracts / dependencies / vocabulary: Foundation shared surface §16.1, AlertDialog §16.2, Dialog §16.3, state/atomic ownership, focus/dismiss policy, Presence, semantic hosts, cross-component composition; library `ucl19-dialog`, `ucl19-alert-dialog`, motion role inventory.
- Local Base UI / Floating UI / shadcn evidence: `../specification/external/base-ui` at `5b495488d182c81a8a14a440d7a376517118f8ec`; Floating UI at `27629b74ba36ab8ceb2a968051927b9b69511a3b`; `ui` at `63c1308d112b6b1205d86244a156cca1abef5087`; all clean.
- Tool readiness: direct Spec Blocks and Chrome DevTools MCP available. Exclusive browser driver is Chrome DevTools MCP.
- Browser / server / build under test: existing Storybook `http://localhost:6006` and task-owned Vite `http://localhost:5173`; source then built fixtures.
- Evidence directory: `tmp/component-verification/dialogs/2026-10-02-shared/`, local only.
- Durable verification fixtures / served URLs: `tests/fixtures/components/dialogs/index.html`, served from Vite; existing Alert Dialog fixture retained for regressions.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Shared family state, lifecycle, parts and nesting owner | Foundation §16.1–3 | base-ui alert-dialog/index.parts.ts and useRenderDialogRoot | TpDialog implementation in components/dialog; Alert Dialog policy subclass; Drawer/SidePanel reuse same owner | docs/dialog.md | V-01 | passed | Registered Alert, Drawer and SidePanel instances share TpDialog; Alert handle aliases DialogHandle; old TpDialogBase and separate lifecycle removed. |
| C-02 | Corner Close defaults visible in Dialog and can be disabled only with another reachable Close | ucl19-dialog | shadcn bases/base/ui/dialog.tsx DialogContent.showCloseButton | showCloseControl; library Button and X icon at logical upper end; registered authored close alternative with fallback | docs/dialog.md | V-02 | passed | Real corner click proposed close-action and returned focus; enabled alternative hides corner, disabled/hidden alternatives restore it; RTL corner follows logical end. |
| C-03 | Footer actions independent of corner closing, optional/absent when empty | ucl19-dialog; shadcn Footer | bases/base/ui/dialog.tsx DialogFooter | footer slot accepts library controls; registerCloseAction binds authored Close without prescribing placement | docs/dialog.md | V-03 | passed | Empty footer hidden; footer Save and named Close remain independent of corner; Storybook showCloseControl false leaves footer Close available. |
| C-04 | Shared muted bordered footer paint | library presentation merge; user correction | style-nova.css cn-card-footer / cn-dialog-footer / cn-alert-dialog-footer | Extract Card footer paint into one recipe; apply to dialog-footer and alert-dialog-actions | docs/dialog.md; docs/alert-dialog.md | V-04 | passed | Card and Dialog computed footer background rgb(39,39,42), border 1px rgb(63,63,70), padding16px; Card borders/sectionColors off preserved; token override works. |
| C-05 | Alert remains always modal, outside press never closes, safe Cancel focus | Foundation §16.2; ucl19-alert-dialog | base-ui useRenderDialogRoot alert policy; shadcn AlertDialogCancel | Alert subclass fixes policies; explicit Cancel/Confirm; no automatic generic corner affordance | docs/alert-dialog.md | V-05 | passed | AX shows modal alertdialog with named title/description, initial Cancel; real Cancel and child Escape work; outside-reason proposal ignored even after attempts to enable outside policy; no generic corner. |
| C-06 | Dialog modal/non-modal/trap-focus-only; trigger toggles; dismissal reasons and veto | Foundation §16.3 | base-ui dialog/root/useDialogRoot | modality, closeOnOutsideInteraction, closeOnEscape; native modal or non-modal top layer; shared proposals | docs/dialog.md | V-06 | passed | Real non-modal outside click closes without stealing focus; outside-disabled click stays open; trigger toggles; focus-outside API check; modal veto keeps native modality/lock. All three live modality handoffs pass after focus guard repair. |
| C-07 | Focus initialization, trap, restoration and mixed nesting | Foundation §8, §16.1–3 | base-ui DialogPopup; FloatingFocusManager | shared composed focus and shared parent recognition across both dialogs and affected consumers | docs/dialog.md | V-07 | passed | Real Tab/ShiftTab and Escape in both mixed nesting directions; child closes alone, parent remains modal with lock and restored trigger focus. |
| C-08 | Trigger replacement, handles, controlled/default state and veto keep existing behavior | Foundation §5 and §16.1 | Base UI root/trigger/handle tests | shared existing SurfaceState and handle implementation with aliases preserving Alert exports | docs/dialog.md; docs/alert-dialog.md | V-08 | passed | 64 unit tests pass; controlled rejection retains modal; detached handle inert without root, payload/identifier accepted, detach restores inert; one shared handle constructor. |
| C-09 | Presence, retained exit, cleanup/reconnect and backdrop motion | Foundation §6; library motion inventory | Base UI root actions / Popup; existing Presence tests | same Presence and scroll leases; shared motion target selection; Drawer surface role retained | docs/dialog.md; docs/alert-dialog.md | V-09 | passed | Retention/unmount, reconnect, interrupted completion, and Drawer/SidePanel settled geometry pass. Final source and built regression: unclaimed close completes within update, hidden by next frame, one completion; opening alone transitions. Claimed exits retain stable top-layer paint. Claimed backdrop enter/exit with reduced policy completes. |
| C-10 | Accessible names, descriptions, real controls and focus relations | Foundation §7; both catalog contracts | DialogTitle / Description / Close | visible Title; description slots; Button native actions; labelled corner icon | docs/dialog.md | V-10 | passed | Chrome AX roles/names/descriptions; real Tab/ShiftTab/Escape and named corner Button; local axe WCAG2A/AA and 2.1AA has zero violations for both open surfaces. |
| C-11 | Token/dictionary/part overrides; light/dark, RTL, narrow and long content | library presentation contracts | selected base/Nova regions adapted to existing Tweakpad tokens | common structure and shared presentation; registered native controls; no private consumer selectors | docs/dialog.md; docs/alert-dialog.md | V-11 | passed | Inspected dark desktop and light narrow/RTL screenshots: full-width footer, wrapped title/description, no horizontal overflow. Part hooks, tokens, alternate dictionary paint and geometry apply while preserving node identity, open state and focus. |
| C-12 | Docs, Controls, supported exports and affected-consumer regression | skill gates 7–8 | existing catalog and generator; Drawer source | authored Dialog/Alert base examples, same public tags, shared Drawer/SidePanel paths | docs/dialog.md; stories | V-12 | passed | Authored Dialog/Alert Docs, real text and showCloseControl Controls update component; built exports share classes/handles; package close and mode regressions pass. Tests64, lint, build and Storybook build pass. |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Dialog coordination | AlertDialogRoot -> useRenderDialogRoot; Alert index.parts -> Dialog parts | overlays.ts TpDialogBase; alert-dialog.ts TpAlertDialog; SurfaceState, Presence | Make TpDialog the shared implementation, replace both old owners; Alert overrides policy/part names only; move Drawer/SidePanel onto same class while retaining edge layout | Dialog, Alert, Drawer, SidePanel; V-01 V-07 V-09 |
| Action controls | DialogContent/Close render Button; AlertDialogCancel renders Button | components/button.ts, icon.ts and icons/types.ts | Use tp-button for synthesized corner Close, an X artwork definition through existing icon pipeline; authored controls retain handlers | V-02 V-03 V-10 |
| Dismissal/focus/scroll | DialogInteractions and FloatingFocusManager | foundation/focus.ts, floating-dismiss.ts, scroll-lock.ts | Retain shared helpers; add topmost/public containment hooks where needed; mode policy stays on shared owner | dialog family; Popover regression V-06 V-07 V-09 |
| Handle | Alert handle and Dialog handle share root store profile | alert-dialog/handle.ts | Move common handle to dialog/handle.ts, preserve Alert type/factory aliases | V-08 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Content/Header/Title/Description | shadcn base/Nova; compare new-york anatomy | bases/base/ui/dialog.tsx and alert-dialog.tsx; style-nova.css cn-dialog-content/header/title/description | surfaceAppearance and existing Tweakpad typography/token roles | Use coherent base/Nova section anatomy, translated into current Tweakpad tokens and no new axes; keep public parts distinct | V-04 V-11 |
| Footer/Actions | base/Nova | style-nova.css cn-dialog-footer, cn-alert-dialog-footer and cn-card-footer | default.ts card-footer recipe | Extract same background/border paint; give full-width padded footer with lower corner clipping; preserve existing Card public overrides | V-04 V-11 |
| Corner Close | base/Nova | DialogContent.showCloseButton; cn-dialog-close absolute top/right | tp-button ghost icon-sm, tp-icon | Logical inset for RTL; named Close; separate from footer and confirmation policy | V-02 V-10 V-11 |
| Overlay | base/Nova adapted to current tokens | cn-dialog-overlay and cn-alert-dialog-overlay | existing backdrop motion recipe | Shared backdrop recipe; suppress duplicate nested backdrop and non-modal blocking; keep declared motion roles | V-05 V-06 V-09 |
| Alert Media/Actions | base/Nova | AlertDialogMedia/Cancel/Action and corresponding cn styles | tp-icon/Badge/Button; shared section presentation | Preserve consumer content and explicit distinct actions; responsive layout; no invented size axis | V-05 V-11 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Both component internals, stories and fixtures | Trigger and actions | tp-button; tp-icon through icon property | public register entry; real native Button focus, name and theme checks V-02 V-10 | Native dialog/heading/section/layout provide required semantics and layout, not substitute controls |
| Presentation comparison fixture | Footer baseline | tp-card with footer Button | Compare shared recipe paint and Card overrides V-04 | Shared appearance does not require nesting a Card in each Dialog |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01; reuse | Inspect imports/classes and actual registered instances | One family implementation, thin Alert policy, Drawer/SidePanel adoption | Registered Alert, Drawer and SidePanel instances share TpDialog; Alert handle aliases DialogHandle; old TpDialogBase and separate lifecycle removed. | Chrome DevTools MCP; browser-results.json, verification.md and screenshot artifacts; relevant unit/build commands | passed | Evidence scope and tool limits below |
| V-02 | C-02; behavior/visual | Toggle showCloseControl with and without registered alternative; actual corner click | Corner positioned correctly; hidden only with reachable alternate; reason close-action and focus return | Real corner click proposed close-action and returned focus; enabled alternative hides corner, disabled/hidden alternatives restore it; RTL corner follows logical end. | Chrome DevTools MCP; browser-results.json, verification.md and screenshot artifacts; relevant unit/build commands | passed | Evidence scope and tool limits below |
| V-03 | C-03; composition | Dialog with absent footer, footer Save, footer Close, corner enabled/disabled | Empty footer absent; independent placement and action behavior | Empty footer hidden; footer Save and named Close remain independent of corner; Storybook showCloseControl false leaves footer Close available. | Chrome DevTools MCP; browser-results.json, verification.md and screenshot artifacts; relevant unit/build commands | passed | Evidence scope and tool limits below |
| V-04 | C-04; visual/reuse | Compare both footer regions and actual Card at default and overridden tokens | Same shared paint; correct full-width boundaries and padding; Card options preserved | Card and Dialog computed footer background rgb(39,39,42), border 1px rgb(63,63,70), padding16px; Card borders/sectionColors off preserved; token override works. | Chrome DevTools MCP; browser-results.json, verification.md and screenshot artifacts; relevant unit/build commands | passed | Evidence scope and tool limits below |
| V-05 | C-05; behavior | Alert Cancel/Confirm, outside click, Escape, safe focus | No corner by default; Cancel initial focus; outside never closes/confirms; explicit actions | AX shows modal alertdialog with named title/description, initial Cancel; real Cancel and child Escape work; outside-reason proposal ignored even after attempts to enable outside policy; no generic corner. | Chrome DevTools MCP; browser-results.json, verification.md and screenshot artifacts; relevant unit/build commands | passed | Evidence scope and tool limits below |
| V-06 | C-06; behavior | Three Dialog modalities, outside/focus-outside, trigger toggle, veto | Mode-correct pointer/focus/scroll behavior, distinguish reasons, veto retains state | Real non-modal outside click closes without stealing focus; outside-disabled click stays open; trigger toggles; focus-outside API check; modal veto keeps native modality/lock. All three live modality handoffs pass after focus guard repair. | Chrome DevTools MCP; browser-results.json, verification.md and screenshot artifacts; relevant unit/build commands | passed | Evidence scope and tool limits below |
| V-07 | C-07; behavior | Mixed nesting both directions; Tab/ShiftTab/Escape | Only top surface closes/traps; parent resumes; nested locks persist | Real Tab/ShiftTab and Escape in both mixed nesting directions; child closes alone, parent remains modal with lock and restored trigger focus. | Chrome DevTools MCP; browser-results.json, verification.md and screenshot artifacts; relevant unit/build commands | passed | Evidence scope and tool limits below |
| V-08 | C-08; behavior | Existing handle/trigger/state tests for both classes | Existing supported behavior preserved and shared | 64 unit tests pass; controlled rejection retains modal; detached handle inert without root, payload/identifier accepted, detach restores inert; one shared handle constructor. | Chrome DevTools MCP; browser-results.json, verification.md and screenshot artifacts; relevant unit/build commands | passed | Evidence scope and tool limits below |
| V-09 | C-09; motion/lifecycle | Retention, interruption, reconnect, motion replacement, Drawer/SidePanel | One completion, no stale leases, proper layer/focus restoration | Retention/unmount, reconnect, interrupted completion, and Drawer/SidePanel settled geometry pass. Final source and built regression: unclaimed close completes within update, hidden by next frame, one completion; opening alone transitions. Claimed exits retain stable top-layer paint. Claimed backdrop enter/exit with reduced policy completes. | Chrome DevTools MCP; browser-results.json, verification.md and screenshot artifacts; relevant unit/build commands | passed | Evidence scope and tool limits below |
| V-10 | C-10; accessibility | Named open dialogs, real keyboard, axe local | Correct role/name/action relationships, trap/return, no component violations | Chrome AX roles/names/descriptions; real Tab/ShiftTab/Escape and named corner Button; local axe WCAG2A/AA and 2.1AA has zero violations for both open surfaces. | Chrome DevTools MCP; browser-results.json, verification.md and screenshot artifacts; relevant unit/build commands | passed | Evidence scope and tool limits below |
| V-11 | C-11; visual/customization | Dark/light, narrow/desktop, RTL/long text, token/part/dictionary changes | Source-mapped regions, no clipping, stable focus and identity | Inspected dark desktop and light narrow/RTL screenshots: full-width footer, wrapped title/description, no horizontal overflow. Part hooks, tokens, alternate dictionary paint and geometry apply while preserving node identity, open state and focus. | Chrome DevTools MCP; browser-results.json, verification.md and screenshot artifacts; relevant unit/build commands | passed | Evidence scope and tool limits below |
| V-12 | C-12; docs/regression/build | Authored Docs/Controls, built exports; affected consumers | Complete current API docs, shared registration, targeted regressions and checks clean | Authored Dialog/Alert Docs, real text and showCloseControl Controls update component; built exports share classes/handles; package close and mode regressions pass. Tests64, lint, build and Storybook build pass. | Chrome DevTools MCP; browser-results.json, verification.md and screenshot artifacts; relevant unit/build commands | passed | Evidence scope and tool limits below |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Actual family ownership and duplicate removal | passed | TpAlertDialog and TpDrawer extend TpDialog; SidePanel extends Drawer; TpDialogBase removed; both handles alias DialogHandle |
| I-02 | First default composition matches sourced footer and corner treatment | passed | Chrome page44: full-width footer and corner X inspected at 1440x1000 dark; Card/Dialog both background rgb(39,39,42), top border 1px rgb(63,63,70), padding16px. Matches Nova section anatomy via existing tokens. |
| I-03 | Corner visibility and footer action independence | passed | Chrome: showCloseControl=false hides corner with enabled Close editor; disabling it restores corner. Real corner click closes with close-action. Footer Save and Close remain independent. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh direct project/doc/term reads and clean local source revisions above; concrete user correction preserved |
| 1. Capability mapping | passed | C-01 through C-12 map correction and regressions to source, API and V-IDs; older conformance gaps retained separately |
| 2. Architecture and composition reuse | passed | Repair design replaces parallel owners with TpDialog and shared footer recipe; actual adoption remains I-01, not assumed |
| 3. Behavior | passed | V-02, V-03, V-05 through V-09 |
| 4. Presentation and customization | passed | V-04 and V-11 |
| 5. Accessibility | passed | V-10 |
| 6. Visual and interaction inspection | passed | V-02 through V-07 and V-11 |
| 7. Documentation and demo reuse | passed | V-12 |
| 8. Regression and reconciliation | passed | V-01, V-09, V-12 and completion checker |

## Completion / handoff

The requested shared-owner, close-control and footer correction is implemented.
The subsequent close-blink report is fixed by preserving the exiting surface in
the top layer after native modality releases; source and built frame sampling pass.
Live modality changes also preserve open state during native focus restoration.

Evidence is local under the directory above; it is not bundled with the package.
Chrome153 was the only browser driver. No screen-reader, OS-level reduced-motion,
forced-colors or cross-browser claim is made. Reduced motion was tested through
the public policy and claimed motion role. The available MCP click tool targets
AX nodes rather than backdrop coordinates; Alert outside-dismissal evidence is
its fixed policy, ignored outside-reason proposals and native modality, not a
claimed coordinate-driven backdrop click. Existing broader Foundation parity gaps
remain in the older Alert record. A full workspace `tsc --noEmit` additionally
reports pre-existing possibly-undefined regex captures in presentation.test.ts;
the production declaration build and executable unit tests pass.

Early timed probes (240ms) sampled transitions before they completed; the settled
checks and frame regression replace those observations. The initial dynamic
Vite dictionary probe loaded a separate module instance; the static public API
fixture verified replacement correctly with state/focus preserved. See
verification.md for exact outcomes and the subsequent fixes.

## Follow-up: immediate default close and trigger layout

User explicitly requires opening-only default transitions and immediate closing.
The shared owner completes unclaimed Dialog/Alert exit immediately; explicitly
claimed motion still owns its completion. Drawer/SidePanel preserve their existing
surface exit contract. Portal uses display:contents so mounting its fixed children
cannot insert a block/grid/flex item beneath Trigger. Gates3/4/6/8 reverified with passing source and built timing/geometry checks. Existing delayed-exit evidence above
is superseded for default Dialog/Alert close by this explicit request.

Final follow-up results: Dialog and Alert each close in the accepting update and
are hidden on the next frame, emitting one completion. Opening retains a running
0.28s transition. Trigger-adjacent content stays at exactly the same vertical
position in grid, flex and block fixtures. keepMounted, opening interruption and
explicit custom exit completion pass. Tests64, lint, package build and Storybook
build pass after these changes. Production typecheck is included in the build.
