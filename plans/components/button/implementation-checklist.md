# Button generic part repair and evidence record

## Delivery and source record

- Component(s) / public identity: TpButton / tp-button, existing identity unchanged.
- Requested work / claim: Root-authorized narrow shared generic part repair preserving all existing Button behavior and API; not a complete Button redesign.
- Scope source: Parent task2026-10-03 explicitly assigns button.ts renderPart adoption for Navigation Panel and Menu/Popover.
- Repository baseline / unrelated changes: HEAD4f3acddb2092359ffe026d991f091ff61acc9a18; preserve all parallel component/shared-state changes and index.
- Live project / document IDs and revisions: Fresh direct spec_get_project/document2026-10-03; UI Library0.3.15 HEAD8440bff24a97dbbc5c762ebf4bd6baa958b305e1 stateVersion07b68b0c8a1512b44d72d2a300784ea7b1b19e0b8e59e3d850c29eb5237885d3.
- Owning contracts / dependencies / vocabulary: Foundation sec-135-button, sec-41,sec-44,req-base-event-handler-cancellation; Library ucl16-button and B6/B7 public parts.
- Local Base UI / shadcn evidence: base-ui5b495488d182c81a8a14a440d7a376517118f8ec; ui63c1308d112b6b1205d86244a156cca1abef5087; clean refs. Base Button.tsx/Button.test.tsx/useButton; shadcn base/ui/button.tsx→style-nova.css149–205.
- Tool readiness: Direct Spec Blocks available and fresh read; registered Chrome exclusively, execution waits root handoff.
- Evidence directory: tmp/component-verification/button/2026-10-03/ (local artifacts only).
- Durable verification fixtures / served URLs: tests/fixtures/components/button/index.html source and ?built.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | All four parts generic delegate/native props/class/style/content/reference; default native action | sec-41/44; ucl16 parts | Button.tsx/useRenderElement | Shared renderPart + stable actual host ref, current button/label/leading/trailing parts | docs/button.md | V-01 | pending | Required repair mapped |
| C-02 | Custom host synthesized Enter/Space; native default gesture once | sec-135-button | useButton/Button.test.tsx render custom span | Existing SyntheticPress gated actual host/nativeAction; focus/click methods retain actual host | docs/button.md | V-02 | pending | API and real keys planned separately |
| C-03 | Native href semantic/attrs, no synth/form actions; disabled blocks all consumer activation; focusable-disabled retains focus | sec-135-button | Button.test.tsx disabled and focusableWhenDisabled | Actual anchor and invalid delegate diagnostic/fallback; actual-host capture disabled guard | docs/button.md | V-03 | pending | Native/custom disabled and link regression planned |
| C-04 | Consumer first, component cancellation distinct, native preventDefault; submit/reset late cancellation | sec-44; req-base-event-handler-cancellation | useButton activation handler order | Existing mergePartProperties, componentHandlingPrevented in queued form normalization | docs/button.md | V-04 | pending | Neutral handlers/canceled real action + native form API assertions |
| C-05 | Existing variant/size/type/name/value/icon/loading/slots/ARIA unaffected | ucl16-button | base/ui/button.tsx; Nova149–205 | Existing Button recipe/SyntheticPress/Icon/Spinner/form owner; wrappers renderPart only | docs/button.md | V-05 | pending | Source-native/default paint + precedence regressions |

## Architecture and reuse

- Scope is a narrow repair in existing button.ts; no unrelated folder migration or shared-state change.
- Existing public exports/registration stay unchanged; generic contracts already public through TpElement.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Part delegates/event cancellation/refs | Button.tsx→useRenderElement/useButton | foundation/part.ts, part-reference.ts, TpElement.renderPart | Consume actual shared owner for all parts; no copied directive or event channel | Button, Navigation Panel, Menu/Popover; V-01,V-04 |
| Native/custom actions/forms | use-button/useButton | SyntheticPress; existing TpButton activate/native submit/reset | Preserve owner and behavior; detect substituted host to synthesize required keyboard action | Button and action consumers; V-02,V-03,V-04 |
| Marks/appearance | shadcn base/ui/button.tsx→Nova | actual TpIcon/TpSpinner and Button presentation recipe | Preserve props/slots priority and recipe keys; no paint resolver change | All Button consumers; V-05 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| button + label/leading/trailing | base/ui/button.tsx / Nova | cn-button variant/size selectors Nova149–205 | Existing Button recipes.ts + actual Icon/Spinner | No visual redesign; generic terminal hooks applied after same owned anatomy/state | V-01,V-05 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Button internal marks/fixture | Icon/Spinner/action/link | Actual TpIcon/TpSpinner/TpButton | register.js/imports unchanged; V-01,V-05 | Native button/anchor/span delegate deliberate semantic interoperability tests |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01; API + actual refs | Default→delegated→default hosts, props/title/data attrs/hooks, all four content delegates | Stable actual ref, old refs released, controlled semantics intact | not run | Source+built buttonAPI.assertParts | pending | Fixture prepared with actual default/delegated/default references and protected/neutral props |
| V-02 | C-02; synthetic protocol + real keys | Custom span/default native Button Enter/Space/cancel | One action per gesture, custom keyboard cancellation suppresses action | not run | API suite then registered Chrome real keys | pending | No synthetic real-input claim |
| V-03 | C-03; API/AX/focus | Disabled native/custom/link and focusableWhenDisabled | No consumer activation/navigation; actual focus semantics and native link attrs retained | not run | API then registered Chrome focus/tree | pending | Environment executes after root handoff |
| V-04 | C-04; API/form + real action | Neutral click handling, component cancellation and native default; submit/reset normal/canceled | Consumer first and form action only accepted; no duplicate action | not run | buttonAPI + registered Chrome click | pending | Existing native form interoperability explicit test |
| V-05 | C-05; API/visual | Default/outline/icon/loading/slot precedence and custom hook | Same recipe appearance, actual Icon/Spinner, loading clears to authored slots | not run | API and early screenshot before broader integration | pending | No painted substitute |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Actual shared owners and affected consumers | pending | Source uses shared renderPart on all four parts, SyntheticPress gates actual native/custom host, form/link/mark owners retained; parent consumer adoption browser pending |
| I-02 | Default paint stays Button recipe | pending | Await actual registered Chrome representative |
| I-03 | Independent parts/options and delegated host | pending | Await native/custom/hooks/form assertion |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh direct whole project/Foundation/Library ASTs + local Button/upstreamtests; parent repair authorization explicit |
| 1. Capability mapping | passed | Five bounded repair rows preserve full existing API and map required generic/native/custom/link/form/mark behavior |
| 2. Architecture and composition reuse | passed | Parent approves repair of actual Button owner; same part/reference/SyntheticPress/form/Icon/Spinner/presentation owners; affected consumers coordinated Menu agent will not edit Button |
| 3. Behavior | pending | API/native form and real keyboard/action regressions pending |
| 4. Presentation and customization | pending | Four public part contracts and protected behavior hooks pending |
| 5. Accessibility | pending | Native/custom/link names/focus/disabled AX pending |
| 6. Visual and interaction inspection | pending | Early real source/default paint and custom appearance pending |
| 7. Documentation and demo reuse | pending | Add accurate generic contract documentation + public component fixture |
| 8. Regression and reconciliation | pending | Scoped static checks + root builds and shared-consumer source/built checkpoint pending |

## Completion / handoff

Scoped ESLint passes. Build tsc at the repair checkpoint reported only parallel anchored-surface errors; parent full tsc also noted the Navigation intentional fake-path test cast, now corrected. Provider + shared part focused tests14pass. Button fixture has23 original API/synthetic/form/reference/mark assertions plus5 inherited-owner and15 shared-owner assertions prepared; none is a real-input claim. No completion claim. This is the authorized shared repair boundary; complete Button parity outside that boundary is not inferred. Browser execution awaits serialized root handoff.

## Required shared-consumer extensions prepared

Actual Button has protected buttonPartContract and buttonTabIndex seams. Default behavior is unchanged; Navigation controls and Combobox actions inherit this owner. The durable assertInheritedOwner suite checks native/default and delegated targets, terminal neutral props/reference, prescribed tabindex, nativeAction=false SyntheticPress and component cancellation. Actual Badge/Skeleton/Separator renderPart repairs are covered in assertSharedOwners, including default/delegate/default ownership, hidden Skeleton/no status announcement, decorative Separator protections, local state and event-channel distinction. These synthetic/API suites are prepared for source and built fixtures; none has been browser-executed yet. No complete Badge/Skeleton/Separator parity claim is included in this narrow shared repair.

Current registered Chrome blocker also prevents this shared repair browser checkpoint. Source adoption remains reviewed, scoped lint/full tsc passed, and durable43 API/synthetic assertions remain unexecuted; no native pointer/keyboard/AX/visual pass is inferred. Parent shared consumer early observations are separate from this complete repair matrix.
