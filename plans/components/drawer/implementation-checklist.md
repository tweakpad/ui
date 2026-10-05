# Component implementation and evidence record

## Delivery and source record
- Requested work / claim: styling repair, merge Side Panel into Drawer, dark/blur backdrops.
- Scope source: latest explicit user request to fix styles, merge controls and provide blur. This is a merge and regression repair, not certification of all historical Drawer functionality.
- Baseline: db0f2e931f30912576bd4d7141cfb30885bb268d; clean working tree.
- Live direct MCP: project prj_c5a403a0-d1d5-4487-ac78-f4e545f46483; Foundation doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1; Library doc_8077bf7c-0361-48f3-ac87-53b983bd89b3. HEAD 8440bff24a97dbbc5c762ebf4bd6baa958b305e1. User-authorized merge amendment saved in current candidate 08b587880bc26c712e91ce523bc63d7b8260102a18f30246f1e66ca7c3953010.
- Owners: Foundation sec-163-dialog, sec-164-drawer; Library ucl19-drawer, ucl19-side-panel migration, sec-cl-154-backdrop; common spacing/token/dictionary contracts.
- Local reference: external/ui 63c1308d112b6b1205d86244a156cca1abef5087; external/base-ui 5b495488d182c81a8a14a440d7a376517118f8ec. Registry bases/base/ui/{drawer,sheet}.tsx and styles/style-rhea.css.
- Tools: direct Spec Blocks and Chrome DevTools MCP available. Existing localhost:6006 Storybook and localhost:5173 Vite.
- Reproduction: own Chrome page 84 default Drawer. Trusted Open settings click. Computed header/body/footer padding 0px, header gap normal. Screenshot showed content flush against viewport edge.
- Evidence directory: tmp/component-verification/drawer/merge/ (local only).
- Durable fixture: tests/fixtures/components/drawer/merge.html; existing dialogs fixture for sibling regression.

## Capability and interface mapping
| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | One Drawer identity, deprecated alias keeps inline-end/non-swipe defaults | ucl19-drawer; side-panel migration | Sheet delegates Dialog; DrawerRoot delegates DialogRoot | TpSidePanel extends TpDrawer; remove separate catalog/story/recipe | drawer.md migration | V-01 | passed | Scenarios verified |
| C-02 | Logical four edges, same geometry; modalities modal/default, non-modal, trap-focus-only | sec-163-dialog; merged binding | DrawerRoot modal; SheetRoot Dialog | Remove Drawer modality lock; inherited state/focus/presence | drawer.md | V-02 | passed | Scenarios verified |
| C-03 | swipeEnabled true; false cancels capture and hides handle, leaves explicit actions/snaps | drawer-merge-policy | DrawerRoot/Popup/SwipeArea and existing gesture controller | Add converter; gate existing gesture and cancel on changes | drawer.md | V-03 | passed | Scenarios verified |
| C-04 | backdrop dark/default and blur, plain fill fallback | sec-cl-154-backdrop; drawer-merge-policy | Rhea .cn-sheet-overlay bg-black/30 backdrop-blur-sm | Drawer overlay marker and dictionary selector; no geometry/state change | drawer.md | V-04 | passed | Scenarios verified |
| C-05 | Header, footer and corner-close independently visible; spacing follows shared recipe | ucl19-drawer; shared spacing | SheetHeader/Footer p-6 gap; DrawerHeader/Footer p-4 gap | Common section recipe reused with Drawer content wrapper selector | drawer.md | V-05 | passed | Reproduced missing padding |
| C-06 | Existing open/default/controlled, events/cancellation, explicit close, Escape/focus, portal, cleanup retained | sec-163-dialog/sec-164-drawer | DialogRoot and DrawerRoot reuse | Inherited TpDialog; existing Drawer snapping/provider unchanged | drawer.md existing API | V-02, V-03, V-06 | passed | Regression checks |
| C-07 | Public parts, token and dictionary overrides; light/dark/RTL/narrow | Foundation presentation; Library 5/6/9/13 | Rhea edge surface regions | Canonical Drawer parts for alias; shared seed and recipe | drawer.md | V-04, V-05 | passed | Scenarios verified |
| C-08 | Docs/catalog/consumers merge and real public controls | ucl19-drawer | Sheet/Drawer examples | Drawer controls + sheet use case; migrate workspace | drawer.md and stories | V-01, V-06 | passed | Scenarios verified |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| --- | --- | --- | --- | --- | --- |
| Merge | Old Drawer locked modal and Side Panel forbidden gestures as separate identity | Both controls | One Drawer; gesture switch; full Dialog modality; deprecated alias | Explicit user merge request; live candidate amendment via direct MCP | passed |

## Architecture and reuse
- One behavior owner: TpDrawer extends TpDialog; compatibility alias only changes defaults and selects canonical definition. No separate Side Panel styles or geometry.
- Backdrop marker is supplied by Drawer through shared Dialog overlay hook; only Drawer exposes new property.
- Shared spacing uses direct section selectors parameterized for Drawer wrapper, preserving Dialog/AlertDialog appearance.

### Family dependency map
| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Dialog lifecycle | base Sheet -> Dialog; DrawerRoot -> DialogRoot | TpDialog | Preserve complete shared owner; remove modality lock | Drawer, legacy alias, Dialog, AlertDialog; V-02,V-06 |
| Edge layout/gesture | base Drawer Popup/Viewport/Content | TpDrawer | Absorb former SidePanel, switch gesture capture | workspace/stories; V-01,V-03 |
| Section paint | Rhea drawer/sheet/header/footer | default.ts | Share section padding recipe across surface nesting | all Dialog family; V-05 |

### Presentation source map
| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| surface | Base/Rhea | DrawerContent/SheetContent edge geometry | drawer-surface + edgeSurfaceAppearance | Keep token-based border/radius and single geometry | V-02,V-05 |
| header/body/footer/close | Base/Rhea | sheet-header p-6 gap-1.5; footer p-6 gap-2; drawer-header-base p-4 | Dialog family sharedPresentation; tp-button | Library space-5 sections and space-2 gaps; optional-region selectors | V-05 |
| backdrop | Base/Rhea | sheet-overlay bg-black/30 blur-sm | drawer-overlay shared Dialog backdrop | Dark remains default; blur uses existing spacing seed; opacity-only transition | V-04 |
| handle | Base/Rhea | drawer-swipe-handle | existing drawer-swipe-handle | Keep existing geometry and keyboard snaps; hide when swipe disabled | V-03 |

### Implementation and composition reuse map
| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Drawer stories/fixture/workspace | trigger/close/actions | tp-button | V-01,V-06 | none |
| Drawer form | fields | tp-field/tp-input/tp-form | V-01,V-06 | Native text only |

## Verification scenarios
| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01,C-08; integration | Inspect exports/catalog/story and legacy alias | One catalog control; alias delegates and retains defaults; workspace migrated | Chrome84 Docs index contains Drawer default/snap/nested/side-drawer; no Side Panel story. Chrome85 legacy alias has edge inline-end, swipe false, canonical drawer-surface and header padding16px. Workspace usages migrated. | MCP + source/tests | passed | Verified scoped merge and repair; see limitations below |
| V-02 | C-02,C-06; behavior | Four edges, modal modes, trusted Escape/focus; RTL | Geometry correct, modal policy inherited and focus restored | Chrome85 settled geometry: all four edges flush at 1624x917, logical inline edges reverse in RTL. All three modalities report correct aria-modal/backdrop/viewport pointers. Trusted Escape and corner-close restore trigger focus; scroll lock releases. | MCP fixture | passed | Verified scoped merge and repair; see limitations below |
| V-03 | C-03,C-06; gesture | Snap keyboard; trusted drag with on/off; cancellation | Swipe switch suppresses capture, snaps remain operable, geometry restores | Trusted handle click plus End selects final snap (1, aria value874). A Chrome drag began active capture on page85; toggling swipeEnabled false removed handle, canceled capture and restored movement0px with snap1 retained. Built page86 trusted disabled drag completes with no swipe markers and stays open. Attribute false/true/removal produces false/true/true. | MCP + existing geometry tests | passed | Verified scoped merge and repair; see limitations below |
| V-04 | C-04,C-07; presentation | Dark/blur toggle incl portal and dictionary override | Correct filter/fill, state/focus stable, nonmodal hides overlay | Chrome85 dark filter none, blur3.2px with identical dark fill. Portal at390x844 RTL renders correctly. Alternate dictionary sets blur7px and custom fill then resets, retaining open state. Direct section token override gives24px padding and same surface identity. | MCP | passed | Verified scoped merge and repair; see limitations below |
| V-05 | C-05,C-07; visual | Header/footer/corner combos, narrow/RTL/light/dark, token override | Section padding/gaps, close clear of body, no overflow | Screenshots inspected at1624x917 dark horizontal/side and390x844 light RTL portal. Header/footer16px, gap6.4px, close reservation41.6px. All eight section/close combinations checked; no-header body padding16px or44.8px with close. No horizontal overflow. | MCP screenshots/geometry | passed | Verified scoped merge and repair; see limitations below |
| V-06 | C-06,C-08; regression | Dialog/AlertDialog plus built fixture; axe; docs; tsc/tests/build | Shared consumers preserved, no a11y violations, builds pass | 517 tests/72 files; tsc, focused ESLint/Stylelint/Prettier, library and Storybook builds, diff check pass. Dialog and AlertDialog retain section padding16px and respective roles. Fresh controlled instance rejects unacknowledged close, owner close works; canceled close stays open; detach/reconnect closes safely. Axe zero violations in both themes; one Field label contrast item required manual check (250,250,250 on32,32,36 dark;24,24,27 on255,255,255 light), visibly high contrast. Built package registration and interaction pass. | MCP + nonbrowser checks | passed | Verified scoped merge and repair; see limitations below |

## Early integration checkpoint
| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners actually adopted | passed | Diff removes 140-line SidePanel owner and its recipe; alias inherits Drawer and its definition. |
| I-02 | Source-backed default appearance | passed | Chrome85 screenshot: inset header/body/footer, muted footer, close clear of title; padding16px and gap6.4px from shared recipe. |
| I-03 | Independent constituent options | passed | Chrome85 all eight combinations: visibility independent; body top padding0/16/44.8px; mandated fallback close retained when trapped with no footer action. |

## Gate record
| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh live docs, local Base/Rhea sources, clean baseline and trusted reproduction |
| 1. Capability mapping | passed | Merge amendment authorized and saved; API/region/scenario mapping above |
| 2. Architecture and composition reuse | passed | Single Drawer/Dialog owner and shared recipe design mapped |
| 3. Behavior | passed | V-01 through V-06 recorded; scoped merge evidence, not full historical conformance. |
| 4. Presentation and customization | passed | V-01 through V-06 recorded; scoped merge evidence, not full historical conformance. |
| 5. Accessibility | passed | V-01 through V-06 recorded; scoped merge evidence, not full historical conformance. |
| 6. Visual and interaction inspection | passed | V-01 through V-06 recorded; scoped merge evidence, not full historical conformance. |
| 7. Documentation and demo reuse | passed | V-01 through V-06 recorded; scoped merge evidence, not full historical conformance. |
| 8. Regression and reconciliation | passed | V-01 through V-06 recorded; scoped merge evidence, not full historical conformance. |

## Documentation synchronization
- Updated Drawer API/Controls, side-drawer example, legacy migration, workspace usages and authored-story generator list. All demos retain public Button/Field/Input.

## Completion / handoff
- Merge and shared spacing repair implemented and verified as above. Local logs: tmp/component-verification/drawer/merge/{tests,build,storybook}.log.
- Chrome MCP drag endpoint failures left its mouse state pressed on two task pages; no claim of complete new release-gesture verification. Required switch capture/cancel, disabled drag and keyboard checks above are independently evidenced. Existing gesture algorithm is unchanged.
- Automated contrast could not analyze the nested Field label; computed foreground/background and both screenshots were manually inspected. No screen-reader or cross-browser claim.
- Spec amendment is saved in the live candidate. Validation has zero errors and 47 candidate review requirements; candidate cannot be committed until those reviews are resolved. No spec commit attempted or unrelated review approved.
- Spec candidate has review requirements; do not commit unrelated accumulated candidate changes.
