# Toggle content and documentation review

## Delivery and source record

- Component(s) / public identity: Toggle, tp-toggle; affected Toggle Group members reuse the same TpToggle.
- Requested work / claim: Review and repair the missing icon/content cases, their presentation, accessibility/state hooks, and maintained documentation. This is a targeted review, not certification of every previously existing Toggle or library capability.
- Scope source: User: "you are missing the toggle cases with icons among other things in toggle. Review it"; root delegated source-backed Toggle/ToggleGroup review and remediation.
- In-scope changes and existing gaps: Text-only generated Toggle Docs lack public Controls and icon-only/icon-label/stateful artwork/Button compositions. Content lacks flex/gap geometry. Required focus-visible marker is absent. Dynamic aria-label is not observed. Default and small Icon context sizing and Toggle-specific typography/padding need shared recipe mappings. Existing state/action/group ownership remains shared and is regressed.
- Repository baseline / unrelated changes: Preserve external index/staged work and unrelated Tabs checklist; no commits or staging.
- Live project / document IDs and revisions: Fresh direct spec_get_project and complete Foundation/Library ASTs read 2026-10-02. UI Library prj_c5a403a0-d1d5-4487-ac78-f4e545f46483, 0.3.14, clean HEAD8440bff24a97dbbc5c762ebf4bd6baa958b305e1. Foundation doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1; Library doc_8077bf7c-0361-48f3-ac87-53b983bd89b3; vocabulary47 terms.
- Owning contracts / dependencies / vocabulary: sec-136-toggle, sec-137-togglegroup, ucl16-toggle, ucl16-toggle-group, ComponentPartContract, StateMarkerSet, environment ownership and library component reuse.
- Local Base UI / Floating UI / shadcn evidence: Base UI5b495488d182c81a8a14a440d7a376517118f8ec and shadcn63c1308d112b6b1205d86244a156cca1abef5087 clean. Base UI toggle/Toggle.tsx, Toggle.test.tsx, useButton/CompositeItem/ToggleGroupContext. shadcn bases/base/ui/toggle.tsx, toggle-group.tsx, examples/toggle-example.tsx, toggle-group-example.tsx, style-nova.css lines1341–1376. IconPlaceholder traces to registered SVG icon renderers; Tweakpad uses its existing TpIcon with plain IconDefinition data. No floating surface applies.
- Tool readiness: Direct Spec Blocks working; child Chrome client stalled, root exclusively performs final registered Chrome MCP checks on its operational pages.
- Browser / server / build under test: Existing root-managed localhost5173/6006, Chrome153; no server lifecycle changes.
- Evidence directory: tmp/component-verification/selections/2026-10-02/
- Durable verification fixtures / served URLs: tests/fixtures/components/selections/index.html and package.html; selectionAPI.run().
- Evidence availability to the next agent: Durable fixture/checklist/docs files in checkout; tmp screenshots/results are local only.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Icon-only content with accessible action name | ucl16-toggle Content; sec-7 accessibility | toggle-example ToggleBasic; ToggleWithButtonIcon | Real TpIcon in default content; reactive standard ariaLabel host-to-control bridge matching TpButton | docs/toggle.md; IconOnly | V-01,V-02 | passed | Root fresh source24/built24 and actual pointer/keyboard/AX/axe/theme evidence pass; final maintained Docs review also passes under C-07/V-04. |
| C-02 | Icon plus label, optional marks, stable gap/alignment | ucl16-toggle Content; ComponentPartContract | ToggleOutline, ToggleWithButtonIconText; Nova cn-toggle gap1 | Content flex layout; shared toggle-content recipe; plain text remains default slot | docs/toggle.md; IconWithLabel | V-01,V-04 | passed | Root fresh source24/built24 and actual pointer/keyboard/AX/axe/theme evidence pass; final maintained Docs review also passes under C-07/V-04. |
| C-03 | Sizes sm/default/lg and ghost/outline, disabled/pressed/focus states | ucl16-toggle; sec-136-toggle | ToggleSizes, ToggleDisabled; Nova size rules | Existing shared Button control extent; context maps existing icon-size tokens to source default16/small14 roles; Toggle typography and padding override generic Button sizing; authored Icon size remains authoritative; required focus-visible marker | docs/toggle.md; public Controls | V-01,V-02,V-04 | passed | Root fresh source24/built24 and actual pointer/keyboard/AX/axe/theme evidence pass; final maintained Docs review also passes under C-07/V-04. |
| C-04 | State-derived artwork and generic Content customization | ComponentPartContract; ucl16-toggle Content | ToggleWithIcon state-dependent bookmark fill | partContracts['toggle-content'].content resolver renders real TpIcon from committed pressed state | docs/toggle.md; StatefulIcon | V-01,V-05 | passed | Root fresh source24/built24 and actual pointer/keyboard/AX/axe/theme evidence pass; final maintained Docs review also passes under C-07/V-04. |
| C-05 | Grouped icons/labels, single/multiple, orientation and joined seams | sec-137-togglegroup; ucl16-toggle-group q1/q3 | ToggleGroupBasic, WithIcons, VerticalOutlineWithIcons, Sort | Existing TpToggle members; group appearance/size precedence and navigation; authored icon stories reuse same renderGroup helper | docs/toggle-group.md; IconOnly/IconWithLabel | V-03,V-04 | passed | Root fresh source24/built24 and actual pointer/keyboard/AX/axe/theme evidence pass; final maintained Docs review also passes under C-07/V-04. |
| C-06 | Button coexistence at matching sizes | reuse gate; live Button/Toggle identities | ToggleWithButtonText/Icon/IconText | Actual TpButton beside actual TpToggle; native layout only | docs/toggle.md; WithButton | V-04,V-05 | passed | Root fresh source24/built24 and actual pointer/keyboard/AX/axe/theme evidence pass; final maintained Docs review also passes under C-07/V-04. |
| C-07 | Canonical Default, complete reviewed API, real Controls and copyable examples | skill gate7; library definitions | Generated Toggle story and upstream examples | Maintained authored Toggle story; root generator/test exclusion; one Default plus distinct content cases, no permutation-only stories | docs/toggle.md; toggle.stories.ts | V-04 | passed | Root final Toggle/Group Docs Controls, actual controlled click/DOM veto, complete setup and copied live compositions pass; canonical Default retained and generated duplicate removed. |
| C-08 | Existing action/owner/cancellation and public customization regression | sec-136/137; ControlledValue; ComponentPartContract | Toggle.test.tsx controlled/cancel/disabled/render | Existing ControllableState, SyntheticPress, renderPart, selectionOwner; no implicit form submission/reset | docs/toggle.md; selections/api-checks.ts | V-02,V-03,V-05 | passed | Root fresh source24/built24 and actual pointer/keyboard/AX/axe/theme evidence pass; final maintained Docs review also passes under C-07/V-04. |

Font Weight Selector additionally reuses TpField and TpBadge for rich content and committed selection feedback; Stateful Artwork applies the same Content owner within Group. Pure attribute permutations stay in Controls. Controlled Docs callbacks synchronously accept host state before Storybook updateArgs.

No contract amendment is needed. Source `default` visual variant maps to live `ghost`; Icon is composed content, not an invented Toggle icon property. Upstream fixture controls/layout are not new public properties. No runtime dependency is added.

## Architecture and reuse

- Component folder and responsibility boundaries: Bounded review retains existing src/components/toggle.ts shared owner consumed by ToggleGroup. No folder-only migration or duplicate behavior. Selection recipes own added appearance; component CSS owns only Content geometry.
- Supported exports / registration / constituent API impact: TpToggle compatibility unchanged; no new tag. Root removes generated Toggle story and adds authored exclusion/tests. IconDefinition artwork remains plain data.
- Public vocabulary / tokens / parts / presentation review: Existing toggle/toggle-content parts and existing icon-size/space/control-height tokens; standard aria-label reflected to semantic host. No icon-only size or content-kind axis.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Pressed state and grouping | Toggle imports ToggleGroupContext/useButton/CompositeItem | TpToggle, TpToggleGroup, ControllableState, SyntheticPress | Keep one actual Toggle owner in and outside groups; repair marker and semantic name bridge in that owner | Toggle/ToggleGroup; V-02,V-03,V-05 |
| Icon artwork and accessibility | IconPlaceholder selects registered icon renderers | TpIcon and IconDefinition | Supply plain data through TpIcon; decorative marks have no competing accessible name; explicit icon size preserved | All icon cases; V-01,V-04 |
| Control paint and joined geometry | toggle-group imports toggleVariants; Button comparison examples | existing default Toggle/Button recipes, selection-controls.ts, joinedControlPresentation | Extend Toggle Content recipe, preserve shared control sizing and group seam owner | Toggle/ToggleGroup/Button; V-01,V-03,V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Control | base/Nova | toggle.tsx + cn-toggle, variant/size rules | existing TpToggle and shared Button extent/variant recipes | Keep live ghost/outline and local semantic control-size tokens; pressed remains distinguishable while hovered | V-02,V-04 |
| Content and icons | base/Nova | cn-toggle gap1 and SVG shrink/size; ToggleBasic/Outline/WithIcon | toggle-content shared recipe and real TpIcon | Flex Content plus space1; default/lg context aliases existing md Icon extent to sm (16px role), small uses 0.875 of that role (14px); explicit size wins; shared control heights retained while text uses sm/default+lg and xs/small and source padding uses spacing*2.5 with logical icon edges | V-01,V-04 |
| Group items | base/Nova | toggle-group.tsx imports toggleVariants; joined seam rules | TpToggle, joinedControlPresentation | Existing shared joinedControlPresentation remains seam owner; Toggle-only recipe adds sourced zero-spacing padding2 and edge1.5 using actual Content markers. No group-local action clone; orientation/spacing APIs unchanged | V-03,V-04 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Standalone/icon/group Docs and fixtures | Toggle, decorative icon, comparison action | TpToggle, TpIcon.icon, TpButton.icon | Existing register import and built exports; V-04,V-05 | Native div/p are layout/content only; plain icon path data is the existing Icon contract |
| Field rich selection | Visible name, rich item content and selection result | TpField, TpToggleGroup, TpToggle public part hooks, TpBadge | Field logical owner and Group committed value; V-03,V-04 | Native spans are text only; Badge is the actual library component |
| Stateful artwork | Committed-state content | partContracts Content resolver + TpIcon | Pressed state drives same generic owner; V-01,V-05 | No independent renderer or icon state |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01,C-02,C-03,C-04; content API/geometry | All Icon sizes, explicit override, dynamic hints, nested Content and artwork | Sourced logical sizing/padding and same committed owner | Fresh source24/built24 pass all assertions including owned projected Content, nested hint isolation, content replacement/removal and joinedRTL padding | Root Chrome MCP central results; early source screenshot | passed | Earlier slot-crossing defect repaired and rerun; real Bookmark commits filled artwork |
| V-02 | C-01,C-03,C-08; semantic name/state/input | Dynamic aria-label; pointer focus then real Space/Enter; cancellation | Names and focus/pressed markers reflect actual committed native state | Fresh source/built actual pointer-to-Space gives native focus-visible=true and both host/control markers=true; source24/built24 name/cancellation/disabled/cleanup pass | Root Chrome MCP real input plus bounded24 API | passed | Earlier native modality drift repaired and verified |
| V-03 | C-05,C-08; group integration | Single/multiple horizontal/verticalRTL, spacing0/2, inherited size | Actual Toggle members with correct focus, selection and geometry | Real ArrowRight+Space focuses Italic and selects ordered bold/italic; disabled Underline tabIndex=-1; verticalRTL ArrowDown+Space selects/focuses Italic; API owner/size/RTL padding pass | Root Chrome MCP real input and source24/built24 | passed | Rich Field/Badge Docs confirmation passes under V-04 |
| V-04 | C-02,C-03,C-05,C-06,C-07; Docs/visual/a11y | Maintained Docs, Controls, copied source and light/dark narrowRTL | Complete functional source, actual nested library components and readable named content | Toggle real click/canceled inverse, size Control sm->height32, copied Icon activation and copied3Button/3Toggle pass. Group rich value/Badge feedback, veto, copied Bold, Bookmark, readOnly and padded desktop/narrowRTL layout pass. | Root Chrome MCP; toggle-final-evidence.json and final-controlled-docs.json; evidence.md | passed | Toggle Docs axe0/incomplete0/13passes; Group axe0/13passes with contrast manually checked. |
| V-05 | C-04,C-06,C-08; affected consumers/customization | Source/built shared state, form exclusion, Button/Icon, document adoption | Existing owners and generic customization remain coherent | Root source24/built24 all pass with errors[]; built console0; integrated133/21 tests, full TypeScript, lint, package/Storybook builds pass | Root Chrome MCP and final static commands; own focused23 tests | passed | Latest callback/source examples also pass under V-04 |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Actual shared owner adoption and old duplicate removal | passed | Source diff confirms actual TpToggle and TpIcon across standalone/group cases, existing state/press/part owners retained, real TpButton/Field/Badge composed; generated Toggle removed by root. |
| I-02 | Default regions match traced source and shared recipes | passed | Root Chrome MCP source render/AX/screenshot inspected: actual Bold/Italic Icons and labels align with space1 gap3.2px; default/lg Icon16px font14, small Icon14px font12; shared heights32/36/44; named icon-only controls and decorative icons, selected/disabled states and groups have no clipping. Evidence toggle-early-source.png. |
| I-03 | Independent constituent options | passed | Root Chrome MCP changed one Icon.size to27px and restored14 with same owner/name/pressedfalse. Real Bookmark click committed filled artwork while another Toggle stayed false. Real hover on selected Bold retained pressed and sourced muted paint rgb39,39,42. This checkpoint preceded full24 regression. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh direct complete ASTs/project/vocabulary and clean upstream revisions; exact user review scope above |
| 1. Capability mapping | passed | Source-backed omissions and reviewed capabilities mapped individually; no API invented from fixture variants |
| 2. Architecture and composition reuse | passed | Shared Toggle/Group/Icon/Button owners and recipe responsibilities traced; root integration coordinated |
| 3. Behavior | passed | Fresh source24/built24 and actual pointer/key input confirm dynamic name, required marker, committed artwork, selection and cancellation. |
| 4. Presentation and customization | passed | Logical default/joined padding, explicit/inherited icon sizing, same host state, hooks and light/darkRTL paint pass after repairs. |
| 5. Accessibility | passed | Named icon-only AX roles and decorative Icons; source/built axe0/21passes. Contrast incomplete manually checked: light foreground24/background255 >17 and dark250/background24 >16. No screen-reader claim. |
| 6. Visual and interaction inspection | passed | Root fresh built390 RTL light/dark screenshots inspected with every new control visible; actual group navigation and pointer/keyboard state pass. |
| 7. Documentation and demo reuse | passed | Authored Toggle and maintained Group distinct content/Field/Badge stories; real Controls, accepted/vetoed owner updates and live copied examples pass. |
| 8. Regression and reconciliation | passed | Source24/built24 and final real Docs pass; integrated133/21 tests, full TypeScript, lint and package/Storybook build passed. Last story-only padded layout passes lint/format/9 stories and root final post-layout Storybook rebuild also passed. |

## Documentation synchronization

- [x] Maintained Toggle API and distinct content compositions.
- [x] Root generator/test integration removes duplicate generated entry.
- [x] Group icon compositions reuse real library owners.
- [x] Copied artwork examples include required setup.

## Reopened browser findings

- Source24 first run was23/24: actual leading padding failed across projected content; real pointer-to-Space input also proved stale focus-visible markers. The owner now observes rendered Content/default slots for private edge markers with nested-owner isolation and resamples the browser focus predicate on input. No new public icon property or modality owner was introduced. Final source audit additionally mapped missing zero-spacing Toggle-only padding to a shared recipe layered over existing ButtonGroup seam geometry; suite23 checks baseline/leading/RTL and dynamic ownership. Group readOnly is now a real Control. All controlled Toggle/Group story callbacks synchronously accept, then mirror only committed uncanceled values after DOM dispatch; this avoids resurrecting vetoed proposals. Fresh source24/built24 and real pointer-to-keyboard reruns pass. Real Docs additionally exposed a stale Badge and centered-canvas caption compression; the committed-result binding and padded native layout repairs both pass real input/copy and desktop/narrowRTL screenshots.

## Completion / handoff

- Actual delivery claim: Targeted Toggle/ToggleGroup content, state-hook and documentation review/remediation; no whole-library certification.
- Record checker: implement, verify and complete all passed after final source/built/Docs evidence reconciliation.
- Remaining work: None in the mapped Toggle review. Fresh source24/built24, real input/Docs/visual/AX/axe/manual contrast and copied examples pass. Own focused23/23 tests and root integrated133/21, full TypeScript, lint/package/Storybook checks pass. Final story-only layout and root final post-layout Storybook rebuild also passed.

- Final evidence index: tmp/component-verification/selections/2026-10-02/toggle-final-evidence.json; toggle-final-source-dark.png; toggle-final-built-narrow-light.png; toggle-final-built-narrow-dark.png; toggle-docs.png; toggle-group-docs-final.png; toggle-group-docs-narrow-rtl.png. Shared controlled Docs and static results: tmp/component-verification/shared-form-parts/2026-10-02/final-controlled-docs.json and integrated-checks.json. Final integrated run2026-10-02T21:51:49; artifacts are local to this checkout.
