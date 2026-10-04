# Side panel implementation record

## Delivery and source record

- Requested work / claim: complete Side Panel as an edge-attached Dialog, preserving existing Dialog-family behavior and completing inherited public channels through its owner.
- Scope source: user full listed-controls implementation, shared normalization and no working-control regressions.
- Current live Library ucl19-side-panel and Foundation sec-163-dialog/sec-161-shared-surface-control-contract read directly2026-10-04; pinned local Base/shadcn/Floating sources in ../audit.md.
- Source chain: shadcn base/ui/sheet.tsx imports actual Base Dialog; base/Nova style-nova.css1080–1106. Base Dialog root/useDialogRoot/useRenderDialogRoot, portal/close/popup/trigger and their tests govern inherited capabilities. Existing local SidePanel incorrectly inherits Drawer; change direct parent to TpDialog. No new open/focus/dismissal owner.
- Shared gaps: optional visible header/footer are not independently configured; generated anatomy bypasses renderPart; custom portal channels are missing. Concrete repair stays in Dialog using existing renderPart/OwnedPortal/common focus and SurfaceState. Native top-layer default stays unchanged. External portal anatomy uses owned projection and logicalPortalOwner to preserve association; no local portal implementation.
- Logical edges normalize legacy physical side at the boundary using existing resolveSide and ComposedEnvironmentObserver. Native Dialog retains common accessible-close fallback.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | One actual Dialog open/default/cancel/retention/lifecycle owner | sec-163/sec-161; ucl19-side-panel | sheet Root→Dialog.Root | SidePanel extends TpDialog directly; no Drawer gestures | docs/side-panel.md | V-01 V-03 | passed | Implementation and documented API reconciled; observed results in V-01, V-03. |
| C-02 | Logical edges block/inline start/end, default inline-end, physical aliases normalize, RTL/writing modes | ucl19-side-panel | SheetContent side right; Foundation adaptation | edge plus legacy side alias, shared resolveSide/environment observation | docs/side-panel.md | V-01 V-02 | passed | Implementation and documented API reconciled; observed results in V-01, V-02. |
| C-03 | Trigger/detached handle/payload/native action/Close associations | sec-161 | Dialog Trigger/Close/store | Existing registerTrigger/registerCloseAction/DialogHandle; shared part-bound actual Button | docs/side-panel.md | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-04 | Modal/nonmodal/trap-focus-only, outside/Escape, topmost/nested, scroll lock, restore | sec-163 | Dialog root/popup/tests | Existing Dialog + FloatingDismiss/global tree; preserve native behavior | docs/side-panel.md | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-05 | Independent header/title/description/footer/corner close | Library anatomy/cardinality | SheetHeader/Footer/Title/Description/Content showCloseButton | Shared Dialog showHeader/showFooter defaulttrue; conditional footer, named hidden header; existing close fallback | docs/side-panel.md | V-01 V-02 | passed | Implementation and documented API reconciled; observed results in V-01, V-02. |
| C-06 | Initial/final focus, keepMounted/forceRender/actions completion | sec-163/sec-161 | Dialog Popup/Portal/Root | Existing inherited properties and presence/motion owner | docs/side-panel.md | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-07 | Canonical generated part delegate/host/ref/class/style APIs | Library part boundary | Base useRenderElement | Repair shared Dialog renderPart while retaining required native dialog semantic host and original node identity | docs/side-panel.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-08 | Custom portal container/ref/resolver/id and cleanup | Foundation Portal profile | DialogPortal→FloatingPortal | Shared OwnedPortal in Dialog, projected real nodes, logical ownership/environment, native top-layer default | docs/side-panel.md | V-02 V-03 | passed | Implementation and documented API reconciled; observed results in V-02, V-03. |
| C-09 | Shared token spacing/radius/footer/action recipe and edge-specific layout, motion/reduce | Library presentation | base/Nova Sheet selectors | Shared Dialog section paint/spacing; SidePanel edge geometry and border recipe only | docs/side-panel.md | V-01 V-02 | passed | Implementation and documented API reconciled; observed results in V-01, V-02. |
| C-10 | Complete inherited APIs/docs/source/Controls and working consumers | Library docs | sheet examples + existing Dialog/Alert/Command compositions | Authored SidePanel examples and shared Dialog docs update, regress Dialog/Alert/Command | docs/side-panel.md | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-99 | Native browser media/accessibility and applicable native-input or SSR verification | Shared Foundation accessibility/motion/lifecycle contract; skill verification procedure | Shared native platform and component source tests recorded above | Existing shared owners; no simulated platform substitute | Component docs and ../verification-results.md | V-98 | blocked | Implementation remains in scope; verification requires capabilities not exposed by registered tools. |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| All surface state and interactions | Sheet→Dialog | dialog/dialog.ts SurfaceState/Presence/FloatingDismiss | Direct inheritance; remove SidePanel→Drawer; common optional sections/part/portal repair in Dialog | Dialog/AlertDialog/Command/SidePanel V-03 V-04 |
| External portal | DialogPortal→FloatingPortal | OwnedPortal consumed by anchored surfaces | Reuse owned node projection, not another portal lifecycle | V-02 V-03 |
| Edge resolution | Sheet physical side plus Tweakpad logical contract | positioning.resolveSide, ComposedEnvironmentObserver | Reuse resolution; side alias normalized once; edge geometry alone is preset-specific | V-01 V-02 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Surface/sections | base/Nova Sheet | cn-sheet-content/header/footer/title/description | Actual Dialog section anatomy and shared paint | Shared section rhythm retained; edge border and no corner radius as attached surface; no independent spacing knobs | V-01 V-02 |
| Corner close | SheetContent Button/Icon | actual TpButton/xIcon | Existing Dialog Close | Independent from footer, reachable-close fallback preserved | V-01 V-03 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Settings panel | Dialog sections/inputs/actions | TpSidePanel/TpField/TpInput/TpButton | V-04 | native layout only |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-02 C-05 C-09 | Edges/default, optional sections and close, screenshot | Sourced attached surface and independent regions | Independent header/footer/Close and default attached surface inspected; hidden regions preserve accessible name and fallback Close. | Chrome MCP | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-02 | C-02 C-05 C-07 C-08 C-09 | RTL/writing mode, parts/theme/dictionary, delegated hosts, portals and focus | Same state and consistent styling through supported channels | All16 logical edge/direction/writing-mode placements correct. Portaled trigger ariaControlsElements targets actual host; title and native-dialog content delegate/ref/theme hooks preserve open/focus. | Chrome MCP | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-03 | C-01 C-03 C-04 C-06 C-08 | Real trigger/Escape/Tab/outside, cancellation, nested, retained/remove/reconnect | Full shared Dialog contract preserved | Real trigger/Escape/Tab and portaled close restore actual nodes/focus. Shared Dialog modal/trap/nonmodal and reduced close checks pass; content delegate removed ref releases after close. | Chrome MCP | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-04 | C-10 | Docs/Controls/API/source/exports and Dialog/Alert/Command regression | Real components and no regressions | Authored public API/Controls, actual Dialog owner and AlertDialog/Command regression inspected; type/build/export and docs pass. | Chrome/static/build | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-98 | C-99; native media/accessibility | OS forced-colors and applicable OS reduced-motion policy | Correct native high-contrast and media behavior | Registered Chrome MCP has no forced-colors or OS reduced-motion control. Explicit component reduce policy was tested separately where applicable. | Registered tool schema inspection | blocked | No CSS pseudo-state or matchMedia mock is accepted as native media evidence. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners actually adopted, duplicate removed | passed | Direct TpDialog inheritance, renderPart/OwnedPortal common repair; browser constructor confirms Dialog owner |
| I-02 | Sourced representative render and shared recipe | passed | Chrome page61 dark right-edge screenshot: common Dialog sections, real Field/Input/Button, attached square inner border; measured307.195x917 |
| I-03 | Independent constituents and placement | passed | Header/footer hidden independently, named surface retained and fallback Close; page55 external portal actual Close restores trigger; empty content geometry repaired |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh contracts/local Sheet→Dialog source chain and inherited gaps explicit |
| 1. Capability mapping | passed | Complete inherited and preset surface mapped, no gesture behavior, shared channels required |
| 2. Architecture and composition reuse | passed | Actual Dialog owner and existing OwnedPortal/parts; shared repair is next step, not parallel state |
| 3. Behavior | passed | Observed behavior in V rows and execution appendices. Focused state/lifecycle and real input paths pass. |
| 4. Presentation and customization | passed | Shared recipes, theme overrides and applicable actual part/ref/delegate/dictionary checks pass; source and visual evidence in V rows. |
| 5. Accessibility | blocked | Native AX, real keyboard and local axe checks recorded; forced-colors browser inspection V-98 cannot be emulated with registered tools. |
| 6. Visual and interaction inspection | blocked | Light/dark/RTL/density and relevant optional states inspected; OS media/forced-colors V-98 remains blocked. |
| 7. Documentation and demo reuse | passed | Authored API documentation, copyable source and actual public nested controls reconciled; full Storybook build passes. |
| 8. Regression and reconciliation | blocked | Focused regressions, lint/type/build, served built package and documentation pass. Complete-component certification remains blocked by explicit V-98/V-99 evidence boundaries. |

## Completion / handoff

Active full scope. Existing inherited channel gaps cannot be deferred to claim completion.

## Browser evidence2026-10-04

Chrome page61: all16 combinations of four logical edges, horizontal-tb/vertical-rl and LTR/RTL place the surface on the correct physical viewport boundary. Default width307.195 and fullheight917; top/bottom fullwidth1440. Portal referenceTarget now links trigger ariaControlsElements to its actual external host. Public title hostProperties/ref/style applied without resetting open/focus. Root spacing5 scales width480 and section padding25; light screenshot inspected. Axe on actual portaled composition: zero violations. Header/footer hiding retains name and restores Close; headerless body reserves Close space through shared spacing/control-size tokens. Real Escape closes and returns trigger focus. Page55 AlertDialog real trigger→Cancel retains named modal decision semantics and safe Cancel focus; Command Palette modal retains focused query and listbox and closes with real Escape. Normal Dialog default and external empty optional sections Close were checked earlier. Broader retained/nested/delegate/cleanup/API exports matrix remains active.

## Reconciled execution status — 2026-10-04

Implementation and documentation for this workstream are delivered. The scenario table above supersedes earlier prospective statements below/above that say implementation or final checks are pending. Required unavailable browser/runtime evidence remains explicitly blocked; no full conformance claim is made. See [final verification results](../verification-results.md) for shared fixes, commands, package evidence and tool boundaries.
