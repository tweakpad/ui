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
| C-01 | Comparable value/defaultValue; controlled mode; callback/cancellation | Foundation 13.4,5.2 | TabsRoot value/defaultValue/onValueChange and tests | Foundation TabsSelection owner; value/defaultValue, onValueChange, setValue; string attributes, comparable properties | docs/tabs.md | V-01 | passed | TabsSelection unit coverage and source/built controlled acceptance, cancellation, null/comparable values; browser-api.json |
| C-02 | Initial/missing/disabled fallback, explicit disabled defaults, duplicate exclusion | Foundation 13.4 | TabsRoot dynamic/disabled tests | Nearest successor then predecessor; noncancelable structural events; controlled missing selects nothing | docs/tabs.md | V-01,V-02 | passed | Unit initial/no-op/fallback coverage; Chrome successor/predecessor/all-disabled and duplicate checks |
| C-03 | Manual/automatic activation; loopFocus true; horizontal/vertical/RTL | Foundation 13.4,19.7 | TabsList and tests | Existing CollectionRegistry opt-in loop/disabled policy; activation + activateOnFocus alias | docs/tabs.md | V-03,V-04 | passed | Chrome real manual/automatic keys, disabled discovery, wrap/clamp, RTL/vertical and focus preservation |
| C-04 | Tab disabled false/nativeAction true; keyboard and no form submit | Foundation 13.4 | TabsTab -> useButton | Native button tab anatomy; aria-disabled discoverability; shared synthetic Press extracted from Button | docs/tabs.md | V-05 | passed | Chrome native/synthetic Enter/Space, disabled semantics and zero form submits; shared Button three-click regression |
| C-05 | Same-tree Tab/Panel relations and stable names/IDs | Foundation 13.4,7 | TabsTab/TabsPanel relationship tests | Register native parts; preserve authored IDs/restore owned attributes; one tab stop | docs/tabs.md | V-02,V-06 | passed | Chrome AX plus ID/pairing assertions; zero axe violations in both themes and Docs |
| C-06 | Panel keepMounted false, transitions/reversal/cleanup | Foundation 13.4,6 | TabsPanel and tests | Shared PresenceController per panel; inactive panel detached at stable placeholder into owned storage; same node restored | docs/tabs.md | V-07 | passed | Chrome actual CSS transition exit/reversal, retained/unmounted identity, completion and disconnect checks |
| C-07 | Optional Indicator; renderBeforeActivation false; offsets/size | Foundation 13.4,B.7 | TabsIndicator and geometry/resize tests | Indicator slot; geometry owner tracks all tab/list sizes, scroll, direction, transforms and selected tab | docs/tabs.md | V-08 | passed | 13 presentation checks including hidden reveal, scroll, scale, rotation, inherited RTL and label growth |
| C-08 | Rich labels and nested composition | ucl16-tabs | shadcn Tabs examples | Icon/Badge in labels; Card/Button/Input in panels; direct membership scope | docs/tabs.md | V-09 | passed | Rich Icon/Badge labels, Card/Button/Input panels and independent nested Tabs inspected |
| C-09 | Dynamic membership, values, IDs, cleanup/reconnect | Foundation 13.4,6 | Root dynamic tests and List observers | Owned registrations/attributes and observer cleanup | docs/tabs.md | V-02,V-07 | passed | Browser removal/rename/reorder/duplicate/reconnect and attribute restoration checks |
| C-10 | Enclosed/underline and five replaceable parts | ucl16-tabs, dictionary | base/ui/tabs.tsx + Nova selectors | All paint in existing recipes, geometry structural; tokens/dictionary/part hooks | docs/tabs.md | V-09,V-10 | passed | All five dictionary parts and per-instance hooks replaced; tokens and missing-key behavior verified |
| C-11 | Complete authored Docs and real Controls | skill gate7 | base/examples/tabs-example.tsx | Canonical story, docs/tabs.md, generator exclusion, correct examples | docs/tabs.md | V-11 | passed | Authored Default/Docs, working genuine Controls, imports, complete constituent API; generator exclusion and story tests |
| C-12 | Package and shared-consumer compatibility | Existing public surface | Tabs, CompositeRoot, useButton | Folder with tabs.ts reexport; Button and Collection regression checks | docs/tabs.md | V-12 | passed | 87 tests, lint, library and Storybook builds passed; actual built exports/registration, Button/Toggle/Radio regressions |

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
| V-01 | C-01,C-02; state | Controlled rejection/acceptance; null/object/default; cancel/reentrancy; explicit disabled | Correct frozen ownership and notifications | Passed controlled/default/null/object/no-op/cancel/reentrant/disabled-default cases; 11 focused unit tests plus browser API | Chrome DevTools MCP; tmp/component-verification/tabs/2026-10-02/browser-evidence.md and adjacent logs/screenshots | passed | No unresolved in-scope gap |
| V-02 | C-02,C-05,C-09; dynamic | Remove/disable/rename/reorder/duplicate/all-disabled/reconnect | Valid fallback, stable relations and cleanup | Passed ordered fallback, removal, rename/reorder, duplicates, IDs and reconnect/cleanup | Chrome DevTools MCP; tmp/component-verification/tabs/2026-10-02/browser-evidence.md and adjacent logs/screenshots | passed | No unresolved in-scope gap |
| V-03 | C-03; keyboard | Tab/arrows/Home/End/Enter/Space, manual/auto, loop on/off | Correct selection vs focus | Passed real Tab/arrows/Home/End/Enter/Space; manual versus auto, disabled discovery, wrap versus clamp | Chrome DevTools MCP; tmp/component-verification/tabs/2026-10-02/browser-evidence.md and adjacent logs/screenshots | passed | No unresolved in-scope gap |
| V-04 | C-03; direction | Vertical, RTL, wrong-axis and external selection | Correct movement and retained focus | Passed vertical and horizontal RTL; wrong axis ignored; controlled external updates retained focused entry | Chrome DevTools MCP; tmp/component-verification/tabs/2026-10-02/browser-evidence.md and adjacent logs/screenshots | passed | No unresolved in-scope gap |
| V-05 | C-04,C-12; actions | Native form, synthetic press, canceled/disabled; Button regression | No implicit submit, no duplicate activation | Passed native/synthetic activation, pointer cancellation, root disabling, no form submission; Button three clicks | Chrome DevTools MCP; tmp/component-verification/tabs/2026-10-02/browser-evidence.md and adjacent logs/screenshots | passed | No unresolved in-scope gap |
| V-06 | C-05; accessibility | Names/relations/tabstops/hidden; light and dark | Correct tree and zero axe violations | Named AX tabs/panels and real focus verified; zero axe violations in light/dark Overview/Activity, narrow and Docs | Chrome DevTools MCP; tmp/component-verification/tabs/2026-10-02/browser-evidence.md and adjacent logs/screenshots | passed | No unresolved in-scope gap |
| V-07 | C-06,C-09; lifecycle | Detached vs retained, transitions/reversal, removal/reconnect | Correct presence with original node identity | Passed actual-motion exit, reversal, retained/unmounted identity, complete-once and disconnect checks | Chrome DevTools MCP; tmp/component-verification/tabs/2026-10-02/browser-evidence.md and adjacent logs/screenshots | passed | No unresolved in-scope gap |
| V-08 | C-07; geometry | Selection/resize/scroll/RTL/vertical/scale/rotation/hidden reveal | Indicator tracks active bounds, no stale geometry | Passed active bounds under scroll/resize, inherited RTL, vertical, scale/rotation and hidden reveal; less than 1px error | Chrome DevTools MCP; tmp/component-verification/tabs/2026-10-02/browser-evidence.md and adjacent logs/screenshots | passed | No unresolved in-scope gap |
| V-09 | C-08,C-10; visual | Both variants/orientations/themes; rich labels, narrow, nested | Sourced appearance and containment | Inspected four screenshots: Nova treatment, rich composition, focus, both themes, orientations/RTL, narrow and long text; nested API isolated | Chrome DevTools MCP; tmp/component-verification/tabs/2026-10-02/browser-evidence.md and adjacent logs/screenshots | passed | No unresolved in-scope gap |
| V-10 | C-10; customization | All hooks/tokens/dictionaries/missing keys | Overrides preserve state/focus and structure | Passed alternate dictionary for five parts, all class/style hooks, scoped token and missing-key reset; state/focus preserved | Chrome DevTools MCP; tmp/component-verification/tabs/2026-10-02/browser-evidence.md and adjacent logs/screenshots | passed | No unresolved in-scope gap |
| V-11 | C-11; docs | Default, genuine Controls and complete API/source/generator | Maintained canonical documentation | Default and full Docs inspected; pointer and actual variant/orientation/activation Controls worked; one canonical story, real reuse | Chrome DevTools MCP; tmp/component-verification/tabs/2026-10-02/browser-evidence.md and adjacent logs/screenshots | passed | No unresolved in-scope gap |
| V-12 | C-12; regression | Unit/lint/tsc/build/Storybook/package/Button/Collection consumers | Supported exports and consumers preserved | 87 unit tests, lint, library build and Storybook build passed; source and built 38 browser assertions each, Button/Toggle/Radio regressions | Chrome DevTools MCP; tmp/component-verification/tabs/2026-10-02/browser-evidence.md and adjacent logs/screenshots | passed | No unresolved in-scope gap |

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
| 3. Behavior | passed | V-01 through V-05/V-07 passed; source and built API plus real keys |
| 4. Presentation and customization | passed | V-08 through V-10 passed; five parts and sourced visuals |
| 5. Accessibility | passed | V-06 passed: real keyboard, AX and unsuppressed axe separate |
| 6. Visual and interaction inspection | passed | Four inspected screenshots; themes, RTL, orientation, focus, constrained layout and motion |
| 7. Documentation and demo reuse | passed | V-11 passed; complete docs and one canonical story, actual library compositions |
| 8. Regression and reconciliation | passed | V-12 passed; 87 tests, lint/build/Storybook, built package and shared consumers |

## Documentation synchronization

- [x] Base example and actual Controls agree with public API.
- [x] Constituent properties, events, slots, methods and geometry documented.
- [x] Fixtures separate from Docs and nested roles reuse library components.
- [x] Registration, generator and tests reconcile.

## Completion / handoff

- All C-01–C-12, V-01–V-12 and gates 0–8 passed. Source revisions are recorded above.
- Detailed evidence: tmp/component-verification/tabs/2026-10-02/browser-evidence.md, browser-api.json, unit.log, lint.log, build.log, storybook.log and four PNGs. These artifacts are local only.
- Durable API/layout checks live beside the HTML fixture and are executed through Chrome DevTools MCP; they do not drive a browser or simulate input.
- Resolved rejected-proposal direction, inherited RTL geometry, initial no-op notification, synthetic/root disabled semantics and a fixture Input label. Browser assertions wait for actual transition completion.
- No unresolved Tabs capability gap. No spoken AT, cross-browser or OS reduced-motion emulation claim; Tabs imposes no default panel animation.
- Existing exports preserved; no dependency added. Shared changes keep existing defaults, with actual Button/Toggle Group/Radio Group checks. Source-mode Lit presence/dev warnings and standard Storybook chunk warning are recorded in the evidence.
- Existing Vite/Storybook stopped during work; confirmed vacant ports and restarted at localhost:5173/6006 without killing any existing process. Unrelated changes and the user's index staging were preserved.
