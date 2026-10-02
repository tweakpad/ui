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

- Component(s) / public identity: progress / tp-progress
- Requested work / claim: Complete component implementation
- Scope source: User requested Slider, Select, Native Select and Progress; Root assigned this agent Native Select and Progress.
- In-scope changes and existing gaps: Complete live/upstream applicable capabilities and necessary shared owner integration; no reduced scope.
- Repository baseline / unrelated changes: 16877c1e34ad80a9373285db1c2bc49da64bf9f1 clean starting baseline; parallel Slider/Select and Root integration preserved.
- Live project / document IDs and revisions: Direct project + full Foundation/Library ASTs freshly read: UI Library0.3.15 HEAD8440bff24a97dbbc5c762ebf4bd6baa958b305e1,0issues; Foundationdoc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1 Librarydoc_8077bf7c-0361-48f3-ac87-53b983bd89b3.
- Owning contracts / dependencies / vocabulary: Foundation4.1/4.4/4.5/5.2/5.3/7/9.1/9.2/14.1; fresh direct8440bff; Foundation18.2/18.3; ucl21-progress
- Local Base UI / Floating UI / shadcn evidence: Local Base UI5b495488d182c81a8a14a440d7a376517118f8ec and shadcn(ui)63c1308d112b6b1205d86244a156cca1abef5087 clean; full sources/tests/examples + base/style-nova traced.
- Tool readiness: Direct Spec Blocks and root Chrome DevTools MCP are operational after client configuration reload. Browser execution is serialized because concurrent page selection returned the wrong document. No alternate browser driver is used.
- Browser / server / build under test: Reuse localhost:5173 source/built fixture and localhost:6006 Docs; Root server lifecycle/build ownership.
- Evidence directory: `tmp/component-verification/progress/2026-10-02/`
- Durable verification fixtures / served URLs: tests/fixtures/components/progress/index.html and package.html served at http://localhost:5173/tests/fixtures/components/progress/
- Evidence availability to the next agent: Local workspace files and tmp evidence shared with this agent tree; no remote artifact availability implied.

## Capability and interface mapping

Use one row per capability, not merely one row per component. Include properties,
attributes, defaults, methods, events/cancellation, slots/parts, state hooks,
composition, behavior, accessibility, presentation and customization.
Include the exact constituent and source symbol, its defaults and independently
configurable options. Do not merge placement, visibility and action semantics into
one "actions" row. Every C-ID must link to existing V-IDs. Before implementation,
the mapping must be complete even though implementation/test statuses are pending.

| ID   | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| C-01 | value number\|null defaultnull; null/empty/NaN/infinite indeterminate | Foundation18.3; ucl21-progress | ProgressRoot value/status tests | TpProgress published snapshot | docs/progress.md | V-01 | passed | Earlier source and built47/47 API matrices plus9 snapshot unit tests and Nova/screens/AX where applicable; unchanged constituent policy. Final expanded realm/Motion/Docs/package checks separately blocked. |
| C-02 | minimum0/maximum100; min/max compatibility aliases; invalid equal/reversed/nonfinite range zero percentage + diagnostic | Foundation18.2/18.3; ucl21 Range | ProgressRoot range tests + MeterRoot shared clamp | progressSnapshot range policy | docs/progress.md | V-01 | passed | Earlier source and built47/47 API matrices plus9 snapshot unit tests and Nova/screens/AX where applicable; unchanged constituent policy. Final expanded realm/Motion/Docs/package checks separately blocked. |
| C-03 | Finite values clamp for numeric ARIA, geometry, visible/default accessible formatting; raw value retained for resolver | Foundation18.2/18.3 | ProgressRoot range tests | one clamped snapshot | docs/progress.md | V-01 | passed | Earlier source and built47/47 API matrices plus9 snapshot unit tests and Nova/screens/AX where applicable; unchanged constituent policy. Final expanded realm/Motion/Docs/package checks separately blocked. |
| C-04 | Status progressing belowmax/complete at-abovemax/indeterminate nonfinite; all5parts synchronized | Foundation18.3/B7 data markers | ProgressRoot status cycle tests | ProgressState snapshot/data markers | docs/progress.md | V-01 | passed | Earlier source and built47/47 API matrices plus9 snapshot unit tests and Nova/screens/AX where applicable; unchanged constituent policy. Final expanded realm/Motion/Docs/package checks separately blocked. |
| C-05 | Default percent formatted normalized fraction; locale owner defaults; format Intl.NumberFormatOptions uses clamped scalar | Foundation18.3; ucl21 Format | ProgressRoot format/locale tests; formatNumber | shared LocaleService.number | docs/progress.md | V-02 | pending | Implemented; earlier source/built47 cases separately recorded. Required latest affected or expanded browser proof unavailable: registered Chrome calls stalled in two clients; no alternative transport. |
| C-06 | valueText optional explicit accessible text; getAccessibleValueText(formatted,raw) callback getsraw inclnull/nonfinite | Foundation18.3/B6.1 getAriaValueText mapping | ProgressRoot getAriaValueText tests | accessible text snapshot | docs/progress.md | V-02 | passed | Earlier source and built47/47 API matrices plus9 snapshot unit tests and Nova/screens/AX where applicable; unchanged constituent policy. Final expanded realm/Motion/Docs/package checks separately blocked. |
| C-07 | Root progressbar role/name and correct min/max/now/text; current/percent omitted indeterminate; no rapid automatic live announcements | Foundation18.3/7.1; ucl21 | ProgressRoot ARIA tests | renderPart progress | docs/progress.md | V-03 | passed | Earlier source and built47/47 API matrices plus9 snapshot unit tests and Nova/screens/AX where applicable; unchanged constituent policy. Final expanded realm/Motion/Docs/package checks separately blocked. |
| C-08 | Label optional richslot/partContracts content/delegate optin; stable IDs update/remove; legacy label=Progress accessiblefallback preserved | Foundation18.3/4.5; ucl21 Label | ProgressLabel association tests; existingTpProgresslabel | renderPart progress-label +consumerlabel fallback | docs/progress.md | V-03 | passed | Earlier source and built47/47 API matrices plus9 snapshot unit tests and Nova/screens/AX where applicable; unchanged constituent policy. Final expanded realm/Motion/Docs/package checks separately blocked. |
| C-09 | Value optional omitted bydefault; outputslot or explicitcontent/delegate optin; formatted empty for indeterminate | Foundation18.3 empty Value; ucl21 Value output | ProgressValue children tests; live empty governsupstreamsentinel | renderPart progress-value-output | docs/progress.md | V-04 | passed | Earlier source and built47/47 API matrices plus9 snapshot unit tests and Nova/screens/AX where applicable; unchanged constituent policy. Final expanded realm/Motion/Docs/package checks separately blocked. |
| C-10 | Track/Indicator composed bydefault; independent optionalomission via delegate returningnothing; containment remainsnative | Foundation18.3 anatomy; ucl21 cardinality; Foundation4.1 | base/ui/progress.tsx ProgressTrack/Indicator | renderPart progress-track/progress-indicator | docs/progress.md | V-04 | passed | Earlier source and built47/47 API matrices plus9 snapshot unit tests and Nova/screens/AX where applicable; unchanged constituent policy. Final expanded realm/Motion/Docs/package checks separately blocked. |
| C-11 | Indicator percentage extent normalized0–100; indeterminate no numeric geometry; logical RTL fill | Foundation18.3; ucl21 extent | ProgressIndicator internal style tests | mandatory component geometry | docs/progress.md | V-04 | passed | Earlier source and built47/47 API matrices plus9 snapshot unit tests and Nova/screens/AX where applicable; unchanged constituent policy. Final expanded realm/Motion/Docs/package checks separately blocked. |
| C-12 | Each of5part delegates accepts common committed status/formatted/raw/clamped snapshot and bind | Foundation4.1/4.4 | Base Progress allparts useRenderElement | shared renderPart delegates | docs/progress.md | V-05 | pending | Implemented; earlier source/built47 cases separately recorded. Required latest affected or expanded browser proof unavailable: registered Chrome calls stalled in two clients; no alternative transport. |
| C-13 | Each of5parts hostProperties neutral semantics/events/class/style merged with protected requiredrole/ARIA/state | Foundation4.1/4.4 | Progress all ...elementProps | shared PartController | docs/progress.md | V-05 | pending | Implemented; earlier source/built47 cases separately recorded. Required latest affected or expanded browser proof unavailable: registered Chrome calls stalled in two clients; no alternative transport. |
| C-14 | Each of5parts classHook string/resolver and styleHook record/resolver | Foundation4.1 | Progress BaseUIComponentProps | partContracts all5 | docs/progress.md | V-05 | pending | Implemented; earlier source/built47 cases separately recorded. Required latest affected or expanded browser proof unavailable: registered Chrome calls stalled in two clients; no alternative transport. |
| C-15 | Each of5parts elementReference live/null/replacement/reconnect lifecycle | Foundation4.1/4.5 | Progress forwardedrefs | shared PartController reference fanout | docs/progress.md | V-05 | pending | Implemented; earlier source/built47 cases separately recorded. Required latest affected or expanded browser proof unavailable: registered Chrome calls stalled in two clients; no alternative transport. |
| C-16 | Each of5parts content resolver where accepted; custom Label/Value/Track/Indicator and Root assembly preserve requiredparts | Foundation4.1 | Progress content composition | partContracts all5 | docs/progress.md | V-05 | pending | Implemented; earlier source/built47 cases separately recorded. Required latest affected or expanded browser proof unavailable: registered Chrome calls stalled in two clients; no alternative transport. |
| C-17 | publicparts progress/progress-label/progress-value-output/progress-track/progress-indicator and current markers | ucl21 inventory; FoundationB7 | base Progress parts/stateAttributesMapping | canonical5part names | docs/progress.md | V-05 | pending | Implemented; earlier source/built47 cases separately recorded. Required latest affected or expanded browser proof unavailable: registered Chrome calls stalled in two clients; no alternative transport. |
| C-18 | Value motion role state change nonblocking; cancels/reverses without delaying semantic current value | Foundation6.4/12.6 motion | existing displayMotionRoles.progressValue | shared prepareMotion value role | docs/progress.md | V-06 | pending | Implemented; earlier source/built47 cases separately recorded. Required latest affected or expanded browser proof unavailable: registered Chrome calls stalled in two clients; no alternative transport. |
| C-19 | Indeterminate ambient start/stop/reconnect/targetreplacement cancellation; reduce stopsautomated decorativeanimation | Foundation6.4/12.6 | existing displayMotionRoles.progressIndeterminate | shared prepareMotion + reduce CSS | docs/progress.md | V-06 | pending | Implemented; earlier source/built47 cases separately recorded. Required latest affected or expanded browser proof unavailable: registered Chrome calls stalled in two clients; no alternative transport. |
| C-20 | OS prefers-reduced-motion and explicit normal/reduce/inherit precedence; external driver claim/cancel and stable targets | Foundation12.6; motion contract | existing shared Motion infrastructure | shared Motion driver policy | docs/progress.md | V-06 | pending | Implemented; earlier source/built47 cases separately recorded. Required latest affected or expanded browser proof unavailable: registered Chrome calls stalled in two clients; no alternative transport. |
| C-21 | Progress noninteractive: no synthetic user value proposal/no focusableparts/no fabricated form participant | Foundation18.3 limits | ProgressRoot div | TpElement binding | docs/progress.md | V-03 | passed | Earlier source and built47/47 API matrices plus9 snapshot unit tests and Nova/screens/AX where applicable; unchanged constituent policy. Final expanded realm/Motion/Docs/package checks separately blocked. |
| C-22 | NovaRoot flexwrap gap3; Track muted h1 fullradius; Indicator primary; Label textsm medium; Value muted tabular margininline-start:auto | ucl21 sourced presentation | base/ui/progress.tsx + style-nova.css947-965 | progressAppearance dictionary; structure staticCSS | docs/progress.md | V-07 | passed | Earlier source and built47/47 API matrices plus9 snapshot unit tests and Nova/screens/AX where applicable; unchanged constituent policy. Final expanded realm/Motion/Docs/package checks separately blocked. |
| C-23 | Token overrides/scopedthemes/full dictionary/scoped parts/partPresentation preserve geometry/state/nativeidentity | Library presentation; Foundation4.1 | Nova and shared theme boundaries | shared PresentationController | docs/progress.md | V-08 | passed | Earlier source and built47/47 API matrices plus9 snapshot unit tests and Nova/screens/AX where applicable; unchanged constituent policy. Final expanded realm/Motion/Docs/package checks separately blocked. |
| C-24 | Light/dark narrow/longlabel/RTL multiple instances richregistered Badge/Icon label/output composition | Foundation4.5/7; Skill6 reuse | ProgressWithLabel/FileUploadList | actual TpBadge/TpIcon/TpButton fixtures | docs/progress.md | V-07 | pending | Implemented; earlier source/built47 cases separately recorded. Required latest affected or expanded browser proof unavailable: registered Chrome calls stalled in two clients; no alternative transport. |
| C-25 | Dynamic label/output slots/remove/id changes; disconnect/reconnect/adoption cleanup and owner locale/environment | Foundation4.5/12.2/18.3 | ProgressLabel/Root lifetimes | scoped light content observer + shared owners | docs/progress.md | V-03 | pending | Implemented; earlier source/built47 cases separately recorded. Required latest affected or expanded browser proof unavailable: registered Chrome calls stalled in two clients; no alternative transport. |
| C-26 | Canonical authoredDefault + complete all5constituentAPI/Controls/copy source; value props are external state only | Skill7; ucl21 properties | ProgressWithLabel/Controlled | authored progress.stories/docs | docs/progress.md | V-09 | pending | Implemented; earlier source/built47 cases separately recorded. Required latest affected or expanded browser proof unavailable: registered Chrome calls stalled in two clients; no alternative transport. |
| C-27 | No duplicated Meter sibling: BaseMeter and Progress share generic helpers only; no localMeter/catalogidentity; optional measurementcapability mapped | Foundation coverage row audit-foundation-catalog-coverage-map-r13 | MeterRoot/ProgressRoot imports clamp/valueToPercent/formatNumber | Progress snapshot + shared LocaleService; no extra tag | docs/progress.md | V-10 | passed | Earlier source and built47/47 API matrices plus9 snapshot unit tests and Nova/screens/AX where applicable; unchanged constituent policy. Final expanded realm/Motion/Docs/package checks separately blocked. |
| C-28 | Source/built exports/registration/compatibility and sharedMotion/Locale/part regressions | Skill8; Foundation sharedowners | existing display.ts TpProgress | newprogressfolder; Rootcompatibilityexport | docs/progress.md | V-10 | pending | Implemented; earlier source/built47 cases separately recorded. Required latest affected or expanded browser proof unavailable: registered Chrome calls stalled in two clients; no alternative transport. |

Record spec/upstream conflicts here before dependent implementation:

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |

For catalog-wide work, also reconcile every upstream identity with a catalog,
composition or Foundation exposure, evidence and any gap. Attach/reference that
inventory; matching names or catalog totals do not prove coverage.

## Architecture and reuse

- Component folder and responsibility boundaries: src/components/progress/index.ts entry; meaningful host/state/native registry or snapshot responsibilities; appearance in src/presentation/recipes/progress.ts.
- Supported exports / registration / constituent API impact: Preserve class export/tag via Root compatibility reexport and registration; no unapproved public tag/dependency.
- Public vocabulary / tokens / parts / presentation review: Canonical live part names; existing semantic token roles; shared renderPart/PresentationController and Motion; NativeSelect visualsize distinct native row size.

### Family dependency map

Trace upstream reexports/imports to implementation owners and inspect corresponding
local components. Name both the old owner and the planned shared owner if extracting
one; list the actual consumers that will use it. Low-level utility reuse alone is
insufficient. For a primitive without family dependencies, record the inspected
sources and concrete reason instead of omitting this map.

| Responsibility | Upstream dependency path / symbol          | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| status/range/format and Motion | ProgressRoot vsMeterRoot share clamp/valueToPercent/formatNumber only; no component reexport | olddisplay.ts TpProgress; no localTpMeter; shared LocaleService/prepareMotion/renderPart | OneProgress snapshot across5parts; retainsharedformat/Motion/partowners; no fictionalMeteridentity | Progress/Locale/Motion/renderPart consumers V-01 V-02 V-06 V-10 |

### Presentation source map

Follow the selected registry base and preset through external stylesheets, tokens
and responsive selectors. Map every meaningful region to a library component or
recipe. Record contract/theme adaptations and absent optional regions explicitly.
For a change without presentation impact, document the dependency evidence here.

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Root/Label/Value/Track/Indicator | shadcnbase +Nova | progress.tsx; style-nova.css947-965 flexgap3, muted h1track/roundradius, primaryindicator, textsm mediumlabel/mutedtabularvalue | newprogressAppearance +sharedtokens/PresentationController | SourcebaseTrack distinctfromRoot; currentdisplay8px/card/accent repaired; invariantextent incomponentCSS | V-07 V-08 |

### Implementation and composition reuse map

List nested UI roles in component internals, stories, docs, snippets and fixtures.
Use existing library components; record the contract or deliberate test purpose
for native anatomy that could otherwise look like a substitute.

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Progress internals/Docs/stories/fixtures | Label/Value/Track/Indicator text/presentation +richcontent/actions | Native contract-required spans/divs; actualTpIcon/TpBadge/TpButton | V-03 V-07 V-09 actualregistrations | Noninteractive native progressparts are required anatomy; no replacement formcontrol/Slider |

## Verification scenarios

Plan all applicable requirements/states and interacting combinations before
implementation; add newly discovered cases. Status vocabulary: `pending`,
`passed`, `failed`, `blocked`, `not applicable`. Non-applicability requires
source/capability evidence. Tool limitations are blocked, not passed or N/A.

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| V-01 | C-01/C-02/C-03/C-04; behavior/API/visual category as described | Defaultnull/nonfinite/customrange/clampedvalues/invalidranges/statuscycle | Finite values clamp into valid bounds and normalize geometry0–100; each part publishes progressing/complete/indeterminate consistently. Null/nonfinite omit aria-valuenow/percentage and empty Value. Invalid range diagnoses once and publishes safe0/100/current0 geometry; raw resolver values retained. | Source47/47 and built47/47 API matrices; earlier source screenshots/AX and9 snapshot unit tests as applicable | Chrome MCP ownedfixture; tmp/component-verification/progress/2026-10-02/ | passed | Unchanged range/optional-geometry/token constituent policy observed before latest realm/shared Motion changes; latest package/realm cases remain blocked in V-03/V-05/V-06/V-10. |
| V-02 | C-05/C-06; behavior/API/visual category as described | locale/format/valueText/accessibleresolverrawclampedcurrent | Default normalized percent and custom scalar Intl formatting match declared locale; resolver receives formatted clamped scalar and raw value; explicit valueText wins; invalid format diagnoses and falls back. Inherited composed lang updates after shadow/slot and adoption. | Earlier47 API/screen/AX evidence retained; latest expanded or repaired case not executed | Chrome MCP ownedfixture; tmp/component-verification/progress/2026-10-02/ | pending | Chrome restored; source expanded55/55 passed on2026-10-03. Latest built, visual, AX/axe and Docs rows are being executed separately; earlier47 results do not establish completion. |
| V-03 | C-07/C-08/C-21/C-25; behavior/API/visual category as described | AXnaming/richlabel/externalassociation/dynamicid/remove +noninteractive/noannouncements | Root exposes progressbar with meaningful name, finite min/max/current and formatted valuetext; Label and external aria associations update/clear; no focus target or implicit live announcements. Native identity and owner locale/name remain coherent across reconnect/adoption. AX and axe separately verified. | Earlier47 API/screen/AX evidence retained; latest expanded or repaired case not executed | Chrome MCP ownedfixture; tmp/component-verification/progress/2026-10-02/ | pending | Chrome restored; source expanded55/55 passed on2026-10-03. Latest built, visual, AX/axe and Docs rows are being executed separately; earlier47 results do not establish completion. |
| V-04 | C-09/C-10/C-11; behavior/API/visual category as described | IndependentLabel/Value/Track/Indicatorpresence/content/geometry/indeterminate | Optional Label and Value independently mount from slot/content contracts and omit without optin. Output duplicate is aria-hidden and empty when indeterminate. Track/Indicator delegates independently omit and restore; logical RTL percentage geometry remains coherent. | Source47/47 and built47/47 API matrices; earlier source screenshots/AX and9 snapshot unit tests as applicable | Chrome MCP ownedfixture; tmp/component-verification/progress/2026-10-02/ | passed | Unchanged range/optional-geometry/token constituent policy observed before latest realm/shared Motion changes; latest package/realm cases remain blocked in V-03/V-05/V-06/V-10. |
| V-05 | C-12/C-13/C-14/C-15/C-16/C-17; behavior/API/visual category as described | Each5partdelegate/hostprops/class/style/ref/content/cleanup with coherentstatus | Each of five hosts receives class/style/host props/content and delegate bind; resolver status/value snapshot agrees; native refs mount/replacement/null/disconnect/reconnect; consumer handlers preserve noninteractive semantics. | Earlier47 API/screen/AX evidence retained; latest expanded or repaired case not executed | Chrome MCP ownedfixture; tmp/component-verification/progress/2026-10-02/ | pending | Chrome restored; source expanded55/55 passed on2026-10-03. Latest built, visual, AX/axe and Docs rows are being executed separately; earlier47 results do not establish completion. |
| V-06 | C-18/C-19/C-20; behavior/API/visual category as described | Finite/ambientdrivers,rapidreversal/disconnect/reconnect/reducedmotionOS+explicit | Finite value motion requests carry coherent from/to/context; indeterminate ambient start/stop transitions; driver cancellation on rapid updates, omission/disconnect/replacement; explicit and OS reduced motion remove decorative movement without delaying semantic updates. | Earlier47 API/screen/AX evidence retained; latest expanded or repaired case not executed | Chrome MCP ownedfixture; tmp/component-verification/progress/2026-10-02/ | pending | Chrome restored; source expanded55/55 passed on2026-10-03. Latest built, visual, AX/axe and Docs rows are being executed separately; earlier47 results do not establish completion. |
| V-07 | C-22/C-24; behavior/API/visual category as described | SourcedNova defaultlightdark/narrowlonglabel/RTL/actualnestedcomponents | Nova muted rounded track/primary fill and source typography align; actual Badge/Button reuse; light/dark, narrow long labels and logical RTL remain legible, contained and correct. | Earlier47 API/screen/AX evidence retained; latest expanded or repaired case not executed | Chrome MCP ownedfixture; tmp/component-verification/progress/2026-10-02/ | pending | Chrome restored; source expanded55/55 passed on2026-10-03. Latest built, visual, AX/axe and Docs rows are being executed separately; earlier47 results do not establish completion. |
| V-08 | C-23; behavior/API/visual category as described | Fullalternate dictionary/scopedtokens/parts/hooks preservingstate/geometry | Scoped tokens/partPresentation/hooks and full alternate dictionary change paint while percentage/status/ARIA/mandatorygeometry remain correct; default dictionary restored after test. | Source47/47 and built47/47 API matrices; earlier source screenshots/AX and9 snapshot unit tests as applicable | Chrome MCP ownedfixture; tmp/component-verification/progress/2026-10-02/ | passed | Unchanged range/optional-geometry/token constituent policy observed before latest realm/shared Motion changes; latest package/realm cases remain blocked in V-03/V-05/V-06/V-10. |
| V-09 | C-26; behavior/API/visual category as described | CanonicalDocsControls +completeconstituentAPI/rendered-copyablecomposition | Canonical Default and Docs Controls update value/range/label/locale/motion independently; rendered and copyable actual component anatomy agrees with documented complete API; no test permutations in public stories. | Earlier47 API/screen/AX evidence retained; latest expanded or repaired case not executed | Chrome MCP ownedfixture; tmp/component-verification/progress/2026-10-02/ | pending | Chrome restored; source expanded55/55 passed on2026-10-03. Latest built, visual, AX/axe and Docs rows are being executed separately; earlier47 results do not establish completion. |
| V-10 | C-27/C-28; behavior/API/visual category as described | Actualsource/built registration/exports/sharedformat/Motion/partconsumers | Standalone source/built registration resolves public class and compatibility exports; shared locale formatting/part/Motion regressions pass; focused tests/type/lint/build reconcile current source with observed package. | Earlier47 API/screen/AX evidence retained; latest expanded or repaired case not executed | Chrome MCP ownedfixture; tmp/component-verification/progress/2026-10-02/ | pending | Chrome restored; source expanded55/55 passed on2026-10-03. Latest built, visual, AX/axe and Docs rows are being executed separately; earlier47 results do not establish completion. |

Record viewport, theme, direction, motion conditions and relevant browser features
for visual/interaction rows. Record what was visually inspected as well as the
screenshot path. Distinguish API evaluation, real input, accessibility tree,
automated analysis and screen-reader evidence. Do not reuse stale passes after
changes that affect them.

## Early integration checkpoint

Complete after the first integration, before exhaustive browser verification.
Inspect the actual diff and first rendered composition; do not infer these passes
from planned architecture, tokens, utility imports or accessibility results.

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Root actual diff inspection: display oldclass/paint removed, new shared state/LocaleService/Motion/renderPart consumed; 2026-10-02 early source checkpoint. |
| I-02 | Default visual regions match traced source and shared library recipes | passed | Root Chrome page99,1280x900 light visually inspected Nova optional Label+Value, muted round track/primary56 percent and customrange50 percent; actual TpBadge/TpButton. Screenshot tmp/component-verification/progress/2026-10-02/early-source.png. |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | Root Chrome independently omitted Indicator retaining Track then Label retaining Value/Track/Indicator, restored all with unchanged56 committed state. |

## Gate record

Keep every gate, including pending later gates. Replace the exit descriptions with
concrete evidence when passing them. Any failed dependency reopens affected gates.
Use `not applicable` only with contract/scope evidence, never for an unimplemented
requirement. Run the checker with `--stage implement`, then `verify`, then `complete`
at the work boundaries specified in SKILL.md.

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed | Fresh direct fullASTs/project/vocabulary and localcleanreferences; full assignedscope explicit.                                       |
| 1. Capability mapping | passed | All28 constituent/native/publichooks/format/state/motion/docscapabilities mapped; live indeterminate empty Value overridesupstreamsentinel; Meter optionalcatalog disposition and existinglegacylabel preserved. Root approvednativepartprojection/omission insteadof unlistedboolean APIs. |
| 2. Architecture and composition reuse | passed | Existing TpElement/renderPart/LocaleService/Motion owners retained; all5sourceparts and Nova paint chain mapped. Base Meter shares generic formatting only; optional Foundation exposure, no invented catalog identity. Root integration completed. |
| 3. Behavior                           | pending | Registered Chrome verification unavailable; prior observed cases retained but latest required affected cases await restoration.  Required state, event, input, lifecycle and composition scenarios pass.               |
| 4. Presentation and customization     | pending | Registered Chrome verification unavailable; prior observed cases retained but latest required affected cases await restoration.  Canonical names and public overrides work without behavioral damage.                  |
| 5. Accessibility                      | pending | Registered Chrome verification unavailable; prior observed cases retained but latest required affected cases await restoration.  Semantic, keyboard/focus and automated results separately evidenced.                  |
| 6. Visual and interaction inspection  | pending | Registered Chrome verification unavailable; prior observed cases retained but latest required affected cases await restoration.  States, themes, layouts, motion and integration inspected.                            |
| 7. Documentation and demo reuse       | pending | Registered Chrome verification unavailable; prior observed cases retained but latest required affected cases await restoration.  Base example, complete API, curated Docs and real component composition verified.     |
| 8. Regression and reconciliation      | pending | Registered Chrome verification unavailable; prior observed cases retained but latest required affected cases await restoration.  Target, affected consumers, build/package boundaries and final records reconcile.     |

## Documentation synchronization

- [ ] Base example, actual Controls, constituent APIs and reference agree with code.
- [ ] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [ ] Verification fixtures are separate from curated public examples.
- [ ] Rendered and copyable compositions reuse existing components.
- [ ] Imports and registration work outside Storybook's global setup.
- [ ] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary: Complete source-grounded implementation/docs/fixtures integrated; latest required browser verification is blocked by registered Chrome MCP availability.
- Actual delivery claim: Implemented and static-checked; earlier47 source/built browser cases recorded. Full component conformance is not claimed while expanded/Docs checks remain blocked.
- Record checker: implement and verify pass for mapped sources/owners and early checkpoint. complete deliberately fails Gates3–8 and required expanded/Docs rows blocked by registered Chrome MCP.
- Non-browser checks: Own full tsc/scoped ESLint/stylelint and15 policy/snapshot/locale tests passed. Root final integrated189tests/31files, tsc, lint, package build, Storybook build, diff and public exports passed.
- Behavior: Earlier source and built47/47 matrices passed; latest expanded realm/Motion cases blocked pending Chrome restoration.
- Accessibility: Earlier source axe0violations/20passes/0incomplete and AX observed separately. Latest realm/part cases require rerun; no screen-reader claim.
- Visual/customization/motion inspection: Earlier light1280x900 and dark RTL375x812 screenshots inspected. Actual OS=true source behavior observed by root; later current OS=false distinguished. Expanded shared realm/Motion cases blocked.
- Documentation and demo composition reuse: Static API/copyable source and actual component reuse audited; curated Docs real Controls and interaction remain blocked.
- Shared-consumer regressions / package boundaries: Earlier source/built public registration passed; root latest build passed. Latest shared realm/Motion/package browser smoke blocked.
- Required failures or blocked checks: Required expanded matrix, realm adoption, latest Motion policy/driver cases and curated Docs interaction await registered Chrome restoration. No scope reduction or alternate browser verification.
- Older out-of-scope gaps: Other library components outside assigned task, preserved.
- Changed source revisions / reopened gates: Fresh source revision8440bff; gates reopen on affected changes.

A complete-component claim requires every applicable required gate to pass. A
bounded fix reports its boundary and older gaps without certifying the component.

- Source reconciliation: Fresh direct project/fullFoundation/fullLibrary after authorized Slider and NativeSelect amendments: UI Library0.3.15, HEAD8440bff24a97dbbc5c762ebf4bd6baa958b305e1, state07b68b0c8a1512b44d72d2a300784ea7b1b19e0b8e59e3d850c29eb5237885d3, dirty candidate0issues. User-approved NativeSelect single textnode correction readback zero-or-more; owning Progress/nativebehavior otherwise unchanged. Root validcandidate canCommittrue; no commit by this agent.

## Recorded browser evidence and current execution boundary

On 2026-10-02, registered Chrome DevTools MCP source and built Progress matrices each passed 47 assertions. Source local axe found 0 violations, 20 passes, 0 incomplete. Source AX exposed actual named progressbars and ranges. Light 1280x900 and dark RTL 375x812 screenshots were visually inspected (muted rounded track, primary normalized fill, real Badge/Button, logical Label/Value placement, no overflow). Durable artifacts are api-source.json, light-1280.png and dark-rtl-375.png in tmp/component-verification/progress/2026-10-02/.

User enabled actual OS Reduce Motion; root Chrome99 observed matchMedia true, inherit-policy reduced markers true, animation none/transition 0s, and a real Indeterminate button click immediately removed current/percentage with zero movement. Root later measured false after viewport/color emulation, so the extended fixture records the actual current OS media result and asserts inheritance against that result; it does not claim current true or mock matchMedia. Explicit reduce and normal, composed ancestor policy and foreign-window adoption remain separately observable. Root corrected shared Motion ownerWindow/composed policy and TpElement direction realm ownership; extended source/built execution after those repairs remains required. AX snapshot showed empty valuetext even for a plain native ARIA baseline; DOM valuetext is correct, this tool result cannot establish screen-reader behavior.

### Latest handoff boundary

Root confirmed final package build passed after the current shared native part bind, Field baseline and Motion owner-window repairs. Own full tsc, scoped ESLint/stylelint and15 focused policy/snapshot/locale tests passed. Root integrated tests/lint/Storybook are recorded by root. Registered Chrome calls then stalled in two clients; no outstanding browser call remains and no browser substitute is authorized. All expanded browser assertions exist in durable fixtures but are explicitly unexecuted. Completion checker must fail while those required gates are blocked.

### 2026-10-03 recovery and source retry

Root reloaded the MCP client configuration and directly observed successful registered Chrome pages/navigation/evaluation/screenshots. Fresh full Foundation and Library ASTs and project HEAD/state were read, unchanged from8440bff/07b68b0c. Source expanded55/55 assertions pass, including realm adoption, composed locale/direction, all five part boundaries, custom dictionary, native references, external driver interruption and actual current OS policy (false). Concrete ambient LTR failure was repaired: the recipe referenced nonexistent --tp-duration-slow; it now consumes existing --tp-duration-normal times4. Adoption geometry uses a0.05px tolerance for browser layout quantization (3.1875px for3.2px). The shared Motion role inventory now lists actual Progress context. Latest full build/lint/Storybook build pass. Source API evidence: tmp/component-verification/progress/2026-10-03/source-api.json. Built/browser/Docs verification continues; no complete claim yet.
