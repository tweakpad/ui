# Component implementation and evidence record

## Delivery and source record
- Requested work / claim: bounded repair of Drawer footer background stopping before the edge.
- Scope source: user screenshot and report, “Drawer footer is clipping the bg”.
- Baseline: ce9424ca455684c54b19d6ef36d362892f9b4f85; preserve unrelated src/components/field/field.ts edit.
- Live sources: direct Spec Blocks read 2026-10-05; project prj_c5a403a0-d1d5-4487-ac78-f4e545f46483, HEAD 8440bff24a97dbbc5c762ebf4bd6baa958b305e1; Foundation doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1 sec-163-dialog/sec-164-drawer; Library doc_8077bf7c-0361-48f3-ac87-53b983bd89b3 ucl19-drawer, sec-cl-7-structural-layer-merge, sec-cl-13-layout-spacing-density.
- Local upstream: clean external/base-ui 5b495488d182c81a8a14a440d7a376517118f8ec and external/ui 63c1308d112b6b1205d86244a156cca1abef5087. Base DrawerRoot delegates useRenderDialogRoot. Base/Rhea DrawerContent and .cn-drawer-swipe-handle arrange horizontal handle as sibling column.
- Reproduction: Chrome MCP page35, existing localhost:6006 Drawer Docs, inline-start, trusted Open settings. Handle column is 9.59375px; footer ends at content edge, leaving that lane unpainted. Screenshot supplied by user agrees.
- Tools: direct Spec Blocks and Chrome DevTools available. Use existing Storybook server; page37 isolated default story for verification.
- Evidence: tmp/component-verification/drawer/footer/; local only. MCP screenshot file writes rejected by tool workspace roots; inspect inline images instead.
- Existing complete Drawer/merge record remains plans/components/drawer/implementation-checklist.md; this fix does not recertify all gesture capabilities.

## Capability and interface mapping
| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Footer spans side surface with handle present; paint remains replaceable | ucl19-drawer; structural merge | base/ui/drawer.tsx DrawerContent; style-rhea.css .cn-drawer-swipe-handle | drawer/styles.ts side handle positioned over full-width content; default shared footer paint retained | docs/drawer.md parts | V-01,V-02 | passed | Full-width footer measured and inspected in V-01/V-02 |
| C-02 | Independent showSwipeHandle, swipeEnabled and showFooter; logical edges | ucl19-drawer | DrawerContext showSwipeHandle false; DrawerSwipeHandle | Existing public APIs; no binding changes | docs/drawer.md properties | V-01,V-02 | passed | Options independent; all four edges, RTL and disabled swipe verified |
| C-03 | Handle hit target, keyboard snaps, close/focus and semantics retained | sec-163-dialog/sec-164-drawer | DrawerRoot/useRenderDialogRoot; DrawerSwipeHandle | Existing gesture and TpDialog owner unchanged | docs/drawer.md behavior | V-03 | passed | Handle hit target and trusted Home/End, Done and Escape verified |

## Architecture and reuse
- Change only side handle arrangement in existing structural styles; no new paint, API, component or parallel owner.
- Overlay side handle at exposed physical edge with existing width and full height; content uses full surface width. Existing section padding exceeds handle width, keeping ordinary controls clear. Vertical handle layout remains unchanged.

### Family dependency map
| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Modal surface and actions | DrawerRoot -> useRenderDialogRoot | TpDrawer extends TpDialog | Preserve inherited semantics and existing gesture owner | Drawer, legacy SidePanel and NavigationPanel Drawer; V-03 |
| Side arrangement | Base DrawerContent x-axis flex-row | drawer/styles.ts | Position handle absolutely at side edge, preserve width/hit behavior | All Drawer instances; V-01,V-02 |

### Presentation source map
| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Surface/content/handle | Base/Rhea | DrawerContent/DrawerSwipeHandle; .cn-drawer-popup, .cn-drawer-swipe-handle | drawerStyles + drawerAppearance + edgeSurfaceAppearance | Fix structural lane exposed by muted footer; preserve public parts and token paint | V-01,V-02 |
| Footer/actions | Base/Rhea, Tweakpad shared section adaptation | DrawerFooter, .cn-drawer-footer-base; local default.ts sectionFooterAppearance | Shared Dialog section footer; tp-button | Full-width existing muted background and border, no copied appearance | V-01,V-02,V-03 |

### Implementation and composition reuse map
| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Existing Drawer default story | Trigger, footer close, field/input | tp-button, tp-field, tp-input | Existing story registration; V-03 | Native structural handle is contracted anatomy |

## Verification scenarios
| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01,C-02; integration | Original inline-start story, toggle handle/footer independently | Footer reaches inner surface edge; optional parts independent | Footer306.195px equals inner surface306.195px; hidden handle retains width; footer and corner independently hidden | Chrome MCP page37 | passed | Fresh reload after HMR; inline screenshot inspected |
| V-02 | C-01,C-02; visual/customization | Both inline edges LTR/RTL light/dark, narrow viewport, block edges, handle disabled; footer public part paint | Full-width footer, rounded clipping, stable controls, retained vertical layout and overrides | 32 desktop combinations pass full-width/footer and handle hit checks at1624x728; 8 narrow edge/direction combinations pass at390x844; swipeEnabled false hides handle; public footer part accepts rgb(220,235,250) across full width | Chrome MCP screenshots/geometry | passed | Inspected light/dark desktop and light/dark RTL narrow screenshots; vertical layout retained. Narrow uses MCP viewport emulation after window resize was unavailable |
| V-03 | C-03; behavior/a11y/regression | Pointer hit testing, keyboard snap, trusted Done/Escape, accessibility tree and local axe; focused lint/typecheck/geometry tests | Handle target accessible, snaps and dismissal work, no new violations | Trusted handle click and Home/End select .5/1; Done and Escape close and restore native trigger focus. Named modal dialog tree intact. Axe zero violations both themes; existing Field label contrast incomplete and manually inspected. Geometry tests2/2, tsc, ESLint, Stylelint, Prettier, diff check pass | Chrome MCP and local checks | passed | No screen-reader or full gesture conformance claim; no runtime behavior changed |

## Early integration checkpoint
| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners actually used | passed | Diff changes only drawerStyles; shared footer recipe and TpDialog remain owners |
| I-02 | Source-backed appearance | passed | Fresh reload Chrome37: footer306.195px equals inner surface306.195px; inspected dark screenshot has continuous muted footer and rounded corner |
| I-03 | Independent constituent options | passed | Fresh Chrome37: handle toggle leaves footer306.195px; footer false hides only footer; corner-close false removes only corner control |

## Gate record
| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh live owners and presentation boundaries read; defect reproduced by trusted click and geometry |
| 1. Capability mapping | passed | C-01 to C-03 cover bounded layout and affected handle behavior; no semantic changes |
| 2. Architecture and composition reuse | passed | Existing structural owner repair; shared paint and controls retained; no new public names |
| 3. Behavior | passed | V-03 trusted keyboard and dismissal plus handle hit targeting |
| 4. Presentation and customization | passed | V-01,V-02 full-width existing shared paint; public part override reaches entire footer |
| 5. Accessibility | passed | V-03 tree, trusted keyboard/focus and axe scoped checks; Field contrast analyzer limitation disclosed |
| 6. Visual and interaction inspection | passed | Desktop/narrow light/dark screenshots inspected; full-width footer and rounded clipping |
| 7. Documentation and demo reuse | passed | Existing docs/API and real Button/Field/Input story remain accurate; no API or example change |
| 8. Regression and reconciliation | passed | Only Drawer side handle arrangement changes; vertical/handle-hidden cases pass, focused static checks and existing geometry tests pass |

## Documentation synchronization
Existing story/docs already describe all affected options and parts; no API changes planned. Reuse existing public controls and keep verification setup outside curated examples.

## Completion / handoff
- Implemented nine structural CSS lines: side handle overlays its existing edge instead of reserving a column. Footer background/border now span the inner surface and clip to the surface radius.
- Exact claim: screenshot defect repaired and scoped layout/keyboard/accessibility regressions checked; historical full-component gaps remain governed by prior Drawer records.
- All three record boundaries checked. Initial verify record was reopened immediately when first HMR click/measurement failed; successful fresh-reload checkpoint is the evidence retained above. No stale rendering used for final results.
- Final static checks: TypeScript noEmit, focused ESLint/Stylelint/Prettier and git diff --check pass. Existing drawer geometry tests2/2 pass. A duplicate selector found by Stylelint was consolidated and final checks rerun.
- No new public APIs, docs or runtime behavior. Dialog and AlertDialog styles not touched; Drawer consumers automatically share this structural owner. No new dependency or duplicated presentation.
- Inline screenshots are in the tool conversation; screenshot disk writes were denied by the MCP tool's configured roots. Evidence record is durable; no fabricated screenshot paths. No full build or cross-browser/real-touch/screen-reader claim.
- Axe reported zero violations in both themes but could not calculate contrast of the existing nested Field label; light/dark screenshots were manually inspected. Unrelated Field edit preserved.
