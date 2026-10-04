# Component implementation and evidence record

Copy to `plans/components/<component>/implementation-checklist.md`. Replace
bracketed fields and expand the tables for the actual task. Keep this file updated
through the gates; do not check boxes merely because code was written.
Keep the named sections, table columns and IDs below: the skill's record checker
uses them. Add rows and detail, not replacement prose. Keep status cells to the
documented status vocabulary and put reasons/evidence in their own cells. Escape
literal pipes inside table cells. A recorded defect does not clear a gate.
For a read-only review, use these fields in the response or an authorized report;
do not create a checklist file unless writing one is in scope.

## Delivery and source record

- Component: Button Group / tp-button-group; Text segment constituent tp-button-group-text. Existing Separator reused directly.
- Requested work / claim: whole-library reference parity, including the missing Input Group dependency; this work does not narrow the parent goal.
- Scope source: user requests all controls and use cases, shared tokens/behaviors and continuing until the whole library is done.
- Baseline: 3a03ac0b; substantial existing staged/unstaged library work preserved.
- Fresh direct Spec Blocks: project prj_c5a403a0-d1d5-4487-ac78-f4e545f46483; Foundation doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1; Library doc_8077bf7c-0361-48f3-ac87-53b983bd89b3; head8440bff/state5daad632. ucl22-button-group and ucl17-input-group read in full; Foundation presentation/part and grouping rules apply.
- Local references clean: Base UI5b495488, Floating UI27629b74, shadcn63c1308d. Source base/ui/button-group.tsx -> base/ui/separator.tsx -> Base UI Separator. No Base UI standalone ButtonGroup behavior owner; group is semantic/layout composition. Nova registry/styles/style-nova.css lines210-228 supplies nested gap, outer radius, text and separator appearance. Base examples/button-group-example.tsx all17 examples read; new-york-v4 examples input, select, nested, input-group, separator, split, popover inspected.
- Tools available: direct Spec Blocks and Chrome DevTools MCP. Reuse audit tab76 and running localhost6006/5173. Evidence under tmp/component-verification/button-group/ locally only.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Orientation horizontal default; vertical changes axis without reorder | ucl22-button-group | base/ui/button-group.tsx ButtonGroup | existing orientation, extracted owner | docs/button-group.md | V-01 | pending | preserve existing API |
| C-02 | Joined true default; preserve outer corners and one boundary, no overlap | ucl22-button-group | buttonGroupVariants; Nova horizontal/vertical | existing joined and shared joinedControlPresentation; preserve member outer radius | docs/button-group.md | V-01,V-02 | pending | old helper forces radius-sm |
| C-03 | Same Button semantics, sizes, variants, disabled, links, marks, hover/press | ucl22-button-group | base/ui/button.tsx; group passes members unchanged | setPartComposition existing member owner; no replacements | docs/button-group.md | V-01,V-03 | pending | direct Buttons already work |
| C-04 | Mixed Input/Select/NativeSelect/InputGroup/choice controls | ucl22-button-group; ucl17-input-group | WithInput, WithSelect, WithFields | resolve existing public parts; composition hooks, register group-control alias; no focus/value state | docs/button-group.md | V-02,V-03 | pending | old direct Button filter misses them |
| C-05 | Menu/Popover trigger members retain their own control and popup state | ucl22-button-group | WithDropdown, button-group-popover | resolve slotted trigger member; observe membership/target changes | docs/button-group.md | V-03 | pending | no styling popup body |
| C-06 | Noninteractive text, label/icon composition | ucl22-button-group Text segment | ButtonGroupText useRender | tp-button-group-text renders canonical part; native text anatomy, existing Label/Icon nested | docs/button-group.md | V-02,V-04 | pending | new constituent uses family dictionary |
| C-07 | Optional separator; never adjustable, defaults perpendicular to group | ucl22-button-group Separator | ButtonGroupSeparator -> SeparatorPrimitive | existing tp-separator; authored orientation retained, default owned/restored; group alias | docs/button-group.md | V-02,V-04 | pending | no duplicate separator runtime |
| C-08 | Nested groups have own seam sets and theme gap | ucl22-button-group | Nested/VerticalNested; Nova has group gap2 | skip nested group members; existing root recipe uses nested state | docs/button-group.md | V-02 | pending | nested orientation independent |
| C-09 | Dynamic insert/remove/hide/reorder, target replacement/reconnect cleanup | Foundation part/lifecycle | useRender/ref reconciliation; Button href change | observers and registered-part cleanup, stable member identity | docs/button-group.md | V-05 | pending | no stale hooks |
| C-10 | Group name, independent Tab order, no implied selection or group form state | ucl22-button-group | role group, aria-label | existing label + authored aria-label/labelledby; Button/Form owners unchanged | docs/button-group.md | V-03,V-04 | pending | real keyboard/AX |
| C-11 | Theme spacing/radii, RTL, custom dictionary/part overrides | Foundation presentation; group part inventory | Nova styling chain | shared recipes/hooks, alias registration; no new spacing attributes or theme tokens | docs/button-group.md | V-06 | pending | consumer hooks win |
| C-12 | Complete use cases, copyable source, one Default; exports | skill docs; source union | base17 + new-york standalone variants | docs.examples shared Canvas; original exports preserved; Text export/register/types | docs/button-group.md | V-07 | pending | no sidebar permutation gallery |

## Architecture and reuse

Extract existing TpButtonGroup from primitives.ts into components/button-group/button-group.ts with Text constituent and member resolution. Keep primitives reexports and all public register/type paths. No standalone catalog identity for Text. Group owns only membership/layout/presentation. Existing Foundation/presentation controllers own hooks and cleanup; do not add parallel state/control behavior. Extend joinedControlPresentation with opt-in preservation of outer radii; ToggleGroup default remains unchanged.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Members | Button/Input/Select imports in base examples | corresponding TpElement owners/public parts | compose unchanged objects; no value/focus controller | ButtonGroup/InputGroup V-02,V-03 |
| Joined seams | shadcn buttonGroupVariants | presentation/composition.ts also used by ToggleGroup | same helper, optional preserve existing outer radius | ToggleGroup V-06 |
| Separators | base/ui/button-group -> separator -> Base UI | TpSeparator in display.ts | reuse direct member, register canonical family part, inherit only unauthored axis | V-04,V-05 |
| Floating triggers | DropdownMenu/Popover Trigger render Button | TpMenu/TpPopover slotted trigger; existing Button | resolve trigger owner, do not include popup children | V-03,V-05 |
| Text | useRender native div/Label | TpElement + family dictionary; existing TpLabel/TpIcon | native span anatomy in new family constituent, not another control | V-02,V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Root | base/Nova | cn-button-group/nested gap2 | recipes button-group | theme space2, structural stretch/orientation | V-01,V-02 |
| Control seams | base/Nova | data-slot outer corner/internal zero radius and border | joinedControlPresentation + existing members | preserve member outer radii, no upstream negative overlap | V-01,V-06 |
| Text segment | base/Nova | cn-button-group-text muted gap2 border px2.5 textsm | family text-segment recipe | semantic tokens/radiuslg; Label/Icon public reuse | V-02,V-06 |
| Separator | base/Nova | cn-button-group-separator bg-input, selfstretch | TpSeparator/group-separator recipe | border width token, owned axis; no adjustable role | V-04,V-06 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| docs.examples and fixture | actions, editors, popup menus, labels, fields, marks | Button/Input/TextArea/Select/NativeSelect/InputGroup/Menu/Popover/Field/Label/Icon/Separator | V-02..07; same public imports in copy source | native text/layout only; Text segment new governed constituent |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01..03 behavior/visual | existing Buttons horizontal/vertical/joined false, disabled/link/icon/sizes; actual hover/click | same control, logical outer corners, adjacent nonoverlap | not run | Chrome76 | pending | early integration |
| V-02 | C-02,C-04,C-06,C-08 visual | mixed Input/Select/InputGroup/Text/Separator, nested groups | shared seams, matching extents and text padding, own nested seams/gap | not run | Chrome76 screenshot/geometry | pending | early integration |
| V-03 | C-03..05,C-10 behavior | type editor, menu select, popup close, real Tab/Enter; Form submit | values/identities preserved; independent disabled/actions | not run | Chrome76 real input | pending | no synthetic interaction claim |
| V-04 | C-06,C-07,C-10 a11y | text label click, separator decorative/semantic, group label; axe | names and noninteractive segment/separator, no false selection | not run | Chrome76 AX/axe | pending | independent semantics |
| V-05 | C-05,C-07,C-09 lifecycle | reorder/remove/reinsert/hide/reconnect; Button href native replacement | all registrations and seam overrides update/release | not run | Chrome76 public API | pending | identity and owned restoration |
| V-06 | C-11 presentation/regression | light/dark/RTL/narrow, spacing/radius override, group/member hooks, ToggleGroup | live scaling, terminal hooks, unchanged values/focus | not run | Chrome76 screenshot/style | pending | affected shared helper |
| V-07 | C-12 docs/package | all source cases, explorer, generated registration, build/lint/type and exports | complete source/use-case mapping and no custom substitutes | not run | source audit and focused commands/MCP | pending | production then Storybook build |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Extracted existing class, retained Button/Input/Select/Menu owners; same seam helper with unchanged default for ToggleGroup. Group registerPart exposes existing targets; no replacement native controls. |
| I-02 | Default visual regions match traced source and shared library recipes | passed | Chrome76 fixture screenshot inspected; mixed Text/Input/Button, Select/Input/Button and InputGroup/Button now all36 high, outer corners10 and internal0. Nested gap6.4; separator1 wide. Existing source divergence in shared sizes/radii repaired before expanding. |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | Real Menu More→Archive outputs archive; typed Amount125 persists. Public joined=false restores all10 radii/gap6.4 without replacing editor; vertical group makes default separator horizontal. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | fresh direct authority, clean source pins and full scope recorded |
| 1. Capability mapping | passed | capabilities and scenarios mapped; text and Separator already governed |
| 2. Architecture and composition reuse | passed | original owners retained; shared seam helper, presentation/controller and actual member controls |
| 3. Behavior | pending | actual interactions/lifecycle |
| 4. Presentation and customization | pending | theme/parts and source match |
| 5. Accessibility | pending | AX/keyboard/axe |
| 6. Visual and interaction inspection | pending | representative and expanded scenario matrix |
| 7. Documentation and demo reuse | pending | complete case reconciliation |
| 8. Regression and reconciliation | pending | affected consumers and checks |

## Documentation synchronization

Pending complete public APIs, copyable source and shared explorer reconciliation. No new catalog variants. No completed-component claim.

## Completion / handoff

Active implementation; earlier goal turn made concrete verified progress. This missing shared dependency is the next safe authorized action, not a blocker or reduced delivery.

### Early integration repair findings

Chrome76 rendered mixed-control fixture: existing Select default32 versus Input/Button36, InputGroup38 due to editor36 plus outer borders, and Button outer radius6.8 versus field10. Source Nova declares the same h-8/rounded-lg baseline for default Button/Input/Select/InputGroup. Live ucl16-button/ucl18-select/ucl17-input-group permit shared theme presentation and preserve all interaction policies. Repair the default Button radius to the existing radius-lg role, Select default height to the existing control-height-md role, and single-line grouped editor minimum to parent extent minus its two boundary widths. No new tokens or per-example sizes; Textarea/block addons retain content sizing. Recheck actual Button variants/hover, Select open/select, InputGroup single/multiline and ToggleGroup helper default. Gates1/2 extended with this concrete shared repair; I02 remains pending until rerender.

Native Select integration exposed a fourth extent drift:25.6 default despite source h-8 matching other defaults. Its existing recipe now maps default/small to shared control-height-md/sm rather than independent spacing multipliers. Native picker behavior and text alignment stay native. The Form example deliberately uses standalone named controls; Form docs distinguish typed Field values from native successful-control FormData, so its application handler reads event.detail.data. No parallel serialization or Form behavior change.

## Execution evidence — 2026-10-04

- Source fixture: http://localhost:5173/tests/fixtures/components/button-group/index.html, auditChrome76. After reload, mixed Text/Input/Button, Select/Input/Button, NativeSelect/Input and InputGroup/Button all36 high using common role tokens; outer10px/internal0 default radius. NativeSelect small uses control-height-sm. Single-line InputGroup accounts for its border widths. Nested gap6.4. Root now uses source w-fit geometry, keeping vertical icon-only groups intrinsic instead of stretching across Docs.
- Actual Menu selection emits Archive, Select changesUSD→EUR and closes; Amount125 survives menu transitions. Public joined=false restores standalone corners and gap; vertical default Separator becomes horizontal, explicit decorative=false exposes role separator with correct axis. No value/focus owner was added.
- Actual Docs actions: Like uses real Toggle and updates1,200→1,201; voice Toggle disables only the editor and toggles back. Transfer Form uses native successful-control data and submits currencyUSD/amount125. No custom Form serializer. Menu screenshot confirms real Icon/KeyHint/Separator. Unregistered custom element scan is empty. Axe across all example previews returns zero violations.
- Public lifecycle fixture: reorder updates first/last corners; moving Input out restores all corners and border and removes registration; changing Button.href replaces its native button with a real anchor and reapplies the group-control alias; disconnect removes alias, reconnect restores it with identical Input/value25. Observers now release removed member roots instead of retaining them.
- Public theme/part checks: RTL, spacing5 and radius18 yield nested gap10, outer18, unchanged editor25. Member terminal input border rgb(4,5,6) wins over group alias border rgb(1,2,3). Dictionary replacement of text-segment changes live padding9.6 and accent background without replacing editor. Restored dictionary. Authored aria-labelledby resolves to external Payment settings element across shadow boundary. Actual Tab from Amount reaches Send with visible focus ring.
- Dark screenshot at viewport390x844 and constrained224-wide container inspected: mixed rows fit, no clipped text/hit-target overlap. Native resize initially rejected maximized window; supported DevTools emulate was used and then cleared with viewport empty string. Screenshots inspected inline, not claimed as saved artifacts.
- Shared InputGroup Docs now renders the ButtonGroup dependency through real owners: both rows36 high, native boundaries align. Shared interactiveMarkupExample supplies lifecycle/copyable source for ButtonGroup and InputGroup; shared Canvas explorer is retained. Actual release notes entry survives Show/Hide with identical editor.
- Nonbrowser: focused stories/resolver/structural styles/ToggleGroup selection23tests passed. TypeScript, focused ESLint/stylelint and diff checks passed. Production and Storybook builds pass at tmp/component-verification/button-group/2026-10-04/{build,storybook-build}.log. Generated index/type reexports and register contain TpButtonGroupText; no new catalog identity.

Remaining: joined pagination and text-alignment reference reconciliation; full per-case matrix, constituent render-delegate/CSP/built-runtime checks and further affected shared-control regressions. I01..03 permit current verification, not complete-component certification. No whole-library completion claim.


## Pagination and selection composition design — 2026-10-04

Fresh direct live reads retain head8440bff/state5daad632. ucl20-pagination requires destination links and native current-page semantics; ucl16-toggle-group owns selection and zero-spacing seams; ucl22-button-group owns layout only. Source base/examples/button-group-example.tsx ButtonGroupPagination, ButtonGroupPaginationSplit and ButtonGroupTextAlignment use outline Button groups. Adapt their behavior to existing Pagination and ToggleGroup rather than implementing navigation or exclusive selection in examples.

C-04/C-08/C-12 design extension: ButtonGroup resolves a direct Pagination's public pagination-list/page-item parts to its actual Button members. It applies existing joinedControlPresentation and a list composition contribution (joined gap zero, unjoined existing theme gap; orientation and no wrapping while joined). Native nav/ul/li are retained. Ellipsis and container boundaries split seam runs. Track/release container contributions and observers on remove/reconnect; never replace links or intercept events. Pagination retains all page/window/link/event ownership. Public Pagination partContracts select outline Button appearance for this composition. Split groups share one application-owned page; no duplicated page model. Text Alignment composes existing Field/ToggleGroup/Toggle with documented spacing=0, single selection and size=sm, and uses the existing value event; no extra styling attribute or state owner.

Family map addition: Pagination -> actual Button (pagination.ts #link), ButtonGroup -> same Button boundaries via public parts, ToggleGroup -> Toggle and shared joinedControlPresentation. Presentation source remains base/Nova group seams + existing Button/Toggle recipes. Native nav/list is required semantic anatomy. Verification V-02..07 expands to actual link activation, previous disabled boundary, split synchronization, current-page AX, modifier preservation, dynamic page-window/ellipsis membership, removal/reconnect cleanup, orientation/unjoined restore, theme/RTL and selected alignment keyboard behavior. Gates0–2 remain passed for this mapped extension; early integration must pass before expanding its checks.

Pagination early integration passed: actual Docs composition uses native nav/ul/li and existing TpButton anchors; all seven controls36 high, listgap0, first/last outer10 corners, internal0 and only one border per seam. Split groups have separate outer corners and existing space2 gap. Source outline treatment retained; aria-current remains on the active destination. Source diff inspected: no additional selection/navigation model or replacement controls. TypeScript passes. This satisfies I01..03 for the extension; continue targeted interactions/lifecycle.


### Pagination/selection execution evidence

- Chrome76 actual Docs Page3 click: page3, one aria-current=page on destination3, native URL unchanged by the application's existing event handling. Split Page1 click synchronizes both Pagination instances and exposes aria-disabled=true/tabindex=-1 on Previous. Native anchors retain real destinations. Text Alignment: actual Center click then ArrowRight/Space yields value[right], pressed Right and right-aligned paragraph.
- Public API lifecycle: joined=false restores each corner10/border1 and gap6.4; orientation vertical preserves order. Initial vertical check caught numbered link hosts retaining44px width. Repair now composes pagination-page-item stretch and pagination-page-link inline-size100%; after reload every link measures108.039px wide. Returning horizontal restores intrinsic widths. Dynamic pages20/page10 produces seam runs separated by ellipses. Moving Pagination out removes group aliases/hooks and restores its standalone gap1.6; reinserting reapplies seams. No link model duplicated.
- Screenshots inspected in light and scoped dark, plus RTL/radius18. Root --tp-spacing5 yields nested gap10. A scoped --tp-space-2 override also works; changing only a descendant spacing seed does not recompute inherited root aliases (shared theme scope follow-up, not claimed fixed here). All13 Docs example previews: axe zero violations. Keyboard evidence is independent of axe; no screen-reader testing claim.
- Production and Storybook builds pass: tmp/component-verification/button-group/2026-10-04-pagination/build.log and storybook-build.log. Focused ESLint, TypeScript and git diff whitespace checks pass. Existing stories and ToggleGroup selection tests11 pass; no browser smoke driver used. Screenshots were inspected inline, not saved artifact claims.
- Remaining full-scope work: reconcile each source case rather than mark the whole family passed; inspect narrow joined Pagination (source visible labels and local responsive behavior), explicit current-page visual treatment for the all-outline composition, modified-link behavior and part render delegates/built-runtime/CSP. Broader catalog work stays active. This evidence completes the new three example implementations, not library certification.


Narrow integration reopened: at390 viewport, nested Pagination groups shrink below their native list width and overlap. Repair group layout so direct Pagination and nested ButtonGroup containers do not flex-shrink; controls keep distinct hit regions. Their combined natural width can exceed a narrow container, so the Docs joined-navigation composition uses the existing horizontal ScrollArea (native scrolling, existing track/theme/controller) with ordinary theme-spaced layout around the group for focus visibility. No local scrolling behavior or control-size compression. This extends C-08/C-11/C-12 and V-02/V-06/V-07 with native keyboard scrolling and nonoverlap checks. Current-page visual follow-up is resolved through existing Button secondary variant via Pagination's public rendering contract; no new paint owner.

Continuation early integration verified at390px: ScrollArea viewport248/scrollWidth311 contains separate numbered220 and direction72 sets with6.4 gap; no overlapping hit regions. Actual Page3 then four Tabs reaches Next, Enter updates both instances to4 and native focus scrolling reaches scrollLeft63. Current destination4 receives actual Button secondary; others outline. Shared code explorer includes the same renderDelegate and retains page4. Link behavior still comes through bind; no local paint.
