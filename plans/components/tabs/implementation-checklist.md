# Tabs implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Tabs, TpTabs / tp-tabs.
- Requested work / claim: full Tabs implementation, continuing the component workflow.
- Scope source: user “lets now do tabs”; no self-imposed feature subset.
- Repository baseline / unrelated changes: ac9ea1d9930ade85d685007e7ac1785d6ac9bdc2, clean; earlier Alert work committed by user.
- Live project / document IDs and revisions: prj_c5a403a0-d1d5-4487-ac78-f4e545f46483 0.3.14 HEAD 8440bff24a97dbbc5c762ebf4bd6baa958b305e1; Foundation doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1 and Library doc_8077bf7c-0361-48f3-ac87-53b983bd89b3 freshly read through direct MCP, 47 terms.
- Owning contracts: sec-134-tabs, ucl16-tabs, controlled state 5.2, presence 6, accessibility 7, environment/direction 4.5, list navigation 19.7, marker/geometry inventory B.7.
- Local references: Base UI 5b495488d182c81a8a14a440d7a376517118f8ec, shadcn 63c1308d112b6b1205d86244a156cca1abef5087, clean. Tabs Root/List/Tab/Panel/Indicator code, adjacent tests, base/ui/tabs.tsx, base/examples/tabs-example.tsx and style-nova.css Tabs selectors read. Floating UI popup behavior is not applicable; DOM transform/ancestry measurement used by Indicator is relevant.
- Tool readiness: direct Spec Blocks and Chrome DevTools MCP available; no other browser driver.
- Browser / server / build under test: existing localhost:5173 Vite and localhost:6006 Storybook, Chrome 153, source/built fixtures.
- Evidence directory: tmp/component-verification/tabs/2026-10-02/ (local only).
- Durable verification fixtures / served URLs: tests/fixtures/components/tabs/index.html and ?built, existing Vite server.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Comparable value/defaultValue; controlled mode; callback/cancellation | Foundation 13.4,5.2 | TabsRoot value/defaultValue/onValueChange and tests | Foundation TabsSelection owner; value/defaultValue, onValueChange, setValue; string attributes, comparable properties | docs/tabs.md | V-01 | pending | Mode frozen at initialization |
| C-02 | Initial/missing/disabled fallback, explicit disabled defaults, duplicate exclusion | Foundation 13.4 | TabsRoot dynamic/disabled tests | Nearest successor then predecessor; noncancelable structural events; controlled missing selects nothing | docs/tabs.md | V-01,V-02 | pending | Ordered registry |
| C-03 | Manual/automatic activation; loopFocus true; horizontal/vertical/RTL | Foundation 13.4,19.7 | TabsList and tests | Existing CollectionRegistry opt-in loop/disabled policy; activation + activateOnFocus alias | docs/tabs.md | V-03,V-04 | pending | Roving entry separate from selection |
| C-04 | Tab disabled false/nativeAction true; keyboard and no form submit | Foundation 13.4 | TabsTab -> useButton | Native button tab anatomy; aria-disabled discoverability; shared synthetic Press extracted from Button | docs/tabs.md | V-05 | pending | Native action contract |
| C-05 | Same-tree Tab/Panel relations and stable names/IDs | Foundation 13.4,7 | TabsTab/TabsPanel relationship tests | Register native parts; preserve authored references/restore ownership; one tab stop | docs/tabs.md | V-02,V-06 | pending | No cross-shadow IDREF break |
| C-06 | Panel keepMounted false, transitions/reversal/cleanup | Foundation 13.4,6 | TabsPanel and tests | Shared PresenceController per panel; inactive panel detached at stable placeholder into owned storage; same node restored | docs/tabs.md | V-07 | pending | Observe storage removal and restore on disconnect |
| C-07 | Optional Indicator; renderBeforeActivation false; offsets/size | Foundation 13.4,B.7 | TabsIndicator and geometry/resize tests | Indicator slot; geometry owner tracks all tab/list sizes, scroll, direction, transforms and selected tab | docs/tabs.md | V-08 | pending | No duplicate selection paint |
| C-08 | Rich labels and nested composition | ucl16-tabs | shadcn Tabs examples | Icon/Badge in labels; Card/Button/Input in panels; direct membership scope | docs/tabs.md | V-09 | pending | Native tab is contract anatomy |
| C-09 | Dynamic membership, values, IDs, cleanup/reconnect | Foundation 13.4,6 | Root dynamic tests and List observers | Owned registrations/attributes and observer cleanup | docs/tabs.md | V-02,V-07 | pending | No leaked identity/state |
| C-10 | Enclosed/underline and five replaceable parts | ucl16-tabs, dictionary | base/ui/tabs.tsx + Nova selectors | All paint in existing recipes, geometry structural; tokens/dictionary/part hooks | docs/tabs.md | V-09,V-10 | pending | No invented axes/keys |
| C-11 | Complete authored Docs and real Controls | skill gate7 | base/examples/tabs-example.tsx | Canonical story, docs/tabs.md, generator exclusion, correct examples | docs/tabs.md | V-11 | pending | Fixture options outside Controls |
| C-12 | Package and shared-consumer compatibility | Existing public surface | Tabs, CompositeRoot, useButton | Folder with tabs.ts reexport; Button and Collection regression checks | docs/tabs.md | V-12 | pending | No package dependency added |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| --- | --- | --- | --- | --- | --- |
| Fallback order | Upstream first enabled versus live nearest successor/predecessor | Selection | Follow live ordered-neighbor fallback | Foundation 13.4 | passed |
| Part counts | Generated library detail says 0/1 Trigger/Content; behavior requires multiple | Anatomy | Explicit owning behavior strengthens cardinality | Foundation 13.4, ucl16-tabs | passed |
| Authored panel mounting | Unmount must preserve authored node ownership/identity | Presence | Detach at comment placeholder, restore same node; observe removal and restore all on disconnect | Foundation absent/retained semantics | passed |
| Disabled focus | Native disabled cannot receive focus | Keyboard | Native disabled remains native; aria-disabled hosts permit discovery; both cannot activate | Foundation permits, does not mandate, disabled focus | passed |
| Variant names | Source default/line versus live enclosed/underline | Paint | Translate source treatments into live names | ucl16-tabs | passed |

## Architecture and reuse

- Folder: src/components/tabs/ for binding, panel presence and geometry. Existing tabs.ts remains a reexport.
- Foundation TabsSelection owns Tabs-specific structural fallback; ControllableState and SurfaceState inspected but neither owns ordered tab fallback/null selection.
- Native tab buttons and panel elements are required same-tree anatomy. Ordinary panel actions use Button. Synthetic keyboard behavior is shared with Button.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Composite movement | TabsList -> CompositeRoot | CollectionRegistry | Add opt-in loop/disabled navigation; preserve defaults | Tabs, menu/toggle consumers V-03,V-12 |
| Press | TabsTab -> useButton | TpButton keyboard handlers | Extract SyntheticPress helper used by Button and synthetic Tabs | V-05,V-12 |
| Presence | TabsPanel -> useTransitionStatus | PresenceController | Use existing owner per panel; no copied modal state | Tabs and Presence tests V-07,V-12 |
| Presentation | useRenderElement and shadcn | TpElement/PresentationController | Register native constituent parts and release on cleanup | V-10 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| tabs | base/nova | .cn-tabs flex/gap-2 | tabs recipe | Logical orientation and semantic gap | V-09 |
| tabs-list | base/nova | .cn-tabs-list/default/line | tabs-list recipe | Rounded muted enclosure or transparent line; constrained list scrolling | V-09 |
| tabs-trigger | base/nova | .cn-tabs-trigger active/disabled/focus | Native Tab and tabs-trigger recipe | All paint moved out of class CSS; own tab role | V-05,V-09,V-10 |
| tabs-indicator | Base UI | TabsIndicator measurement/CSS variables | tabs-indicator recipe | Optional measured part; suppress duplicate selected paint | V-08,V-10 |
| tabs-content | base/nova | .cn-tabs-content | PresenceController and tabs-content recipe | Small text, focus ring, inert exits | V-06,V-07 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Canonical story/snippet | Surface/action | TpCard/TpButton | V-11,V-12 registration | Native tab button and panel implement ARIA Tabs anatomy |
| Fixture rich labels/panels | Icon/Badge/input/action | TpIcon/TpBadge/TpInput/TpButton | V-06,V-09 | Synthetic div explicitly tests nativeAction=false |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01,C-02; state | Controlled rejection/acceptance; null/object/default; cancel/reentrancy; explicit disabled | Correct frozen ownership and notifications | not run | Unit + Chrome API | pending | Required |
| V-02 | C-02,C-05,C-09; dynamic | Remove/disable/rename/reorder/duplicate/all-disabled/reconnect | Valid fallback, stable relations and cleanup | not run | Unit + Chrome | pending | Required |
| V-03 | C-03; keyboard | Tab/arrows/Home/End/Enter/Space, manual/auto, loop on/off | Correct selection vs focus | not run | Chrome real keys | pending | Required |
| V-04 | C-03; direction | Vertical, RTL, wrong-axis and external selection | Correct movement and retained focus | not run | Chrome real keys | pending | Required |
| V-05 | C-04,C-12; actions | Native form, synthetic press, canceled/disabled; Button regression | No implicit submit, no duplicate activation | not run | Chrome input/unit | pending | Required |
| V-06 | C-05; accessibility | Names/relations/tabstops/hidden; light and dark | Correct tree and zero axe violations | not run | Chrome AX + axe | pending | No spoken AT claim |
| V-07 | C-06,C-09; lifecycle | Detached vs retained, transitions/reversal, removal/reconnect | Correct presence with original node identity | not run | Chrome + Presence tests | pending | Required |
| V-08 | C-07; geometry | Selection/resize/scroll/RTL/vertical/scale/rotation/hidden reveal | Indicator tracks active bounds, no stale geometry | not run | Chrome geometry/screenshots | pending | Required |
| V-09 | C-08,C-10; visual | Both variants/orientations/themes; rich labels, narrow, nested | Sourced appearance and containment | not run | Chrome screenshots | pending | Required |
| V-10 | C-10; customization | All hooks/tokens/dictionaries/missing keys | Overrides preserve state/focus and structure | not run | Chrome API | pending | Required |
| V-11 | C-11; docs | Default, genuine Controls and complete API/source/generator | Maintained canonical documentation | not run | Chrome + story tests | pending | Required |
| V-12 | C-12; regression | Unit/lint/tsc/build/Storybook/package/Button/Collection consumers | Supported exports and consumers preserved | not run | Commands + Chrome | pending | Required |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Actual shared ownership | passed | Actual diff inspected: Button and Tabs both consume SyntheticPress; Collection defaults preserved; TabsPanel consumes PresenceController |
| I-02 | Sourced default appearance | passed | Chrome page67 screenshot inspected: rounded muted enclosed track, underline/vertical/RTL single indicator, real Card/Button/Icon/Badge |
| I-03 | Independent constituent options | passed | Chrome real ArrowRight preserved manual selection; Enter selected; automatic ArrowRight selected. API checked inactive retained panel hidden/inert, default detached, indicator removal/restoration |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh authority, local sources, clean baseline |
| 1. Capability mapping | passed | C-01 through C-12 mapped before code |
| 2. Architecture and composition reuse | passed | Complete family/presentation/composition maps |
| 3. Behavior | pending | State, keyboard, fallback and lifecycle |
| 4. Presentation and customization | pending | Five public parts |
| 5. Accessibility | pending | Keys, tree, axe |
| 6. Visual and interaction inspection | pending | Variants, orientations, themes, indicator |
| 7. Documentation and demo reuse | pending | Authored API/Controls |
| 8. Regression and reconciliation | pending | Tests/builds/package |

## Documentation synchronization

- [ ] Base example and actual Controls agree with public API.
- [ ] Constituent properties, events, slots, methods and geometry documented.
- [ ] Fixtures separate from Docs and nested roles reuse library components.
- [ ] Registration, generator and tests reconcile.

## Completion / handoff

- Pending implementation and verification; no incomplete scope relabeling.
