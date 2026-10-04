# Preview Card implementation record

## Delivery and source record

- Requested work / claim: complete Preview Card implementation and conformance review.
- Scope source: user explicitly listed Preview Card among incomplete controls and authorized implementation while preserving normalized working components.

Complete Preview Card within parent library scope. Preserve working hover/positioning/focus owners and all public inherited APIs. Fresh full Library/Foundation direct MCP reads: ucl19-preview-card and sec-166-previewcard; IDs/pins/baseline in ../audit.md. Local shadcn bases/base/ui/hover-card.tsx -> Base UI PreviewCard constituent root/trigger/popup/positioner and tests; Nova lines668–674. Foundation requires fallback600/300; local inherited400/100 is wrong. Local group role currently fabricates aria-haspopup=group, lacks description, permits modal/backdrop blocking and always restores focus. These require policy repairs, not another hover owner. Sources clean at recorded pins. Direct Spec Blocks and Chrome MCP available; native touch unavailable. Existing Storybook6006/Vite5173 reused.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | State, defaultOpen/open, veto, callbacks, completion/unmount and retained content | sec-166-previewcard; ucl19-preview-card; common surfaces | PreviewCardRoot/store/Root.test.tsx | Existing SurfaceState/Presence; no new state owner | docs/preview-card.md; authored story | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-02 | Trigger registration/handle, identifier/payload, replacement/removal, viewport switching | sec-166-previewcard; ucl19-preview-card; common surfaces | Root.detached-triggers.test.tsx; Trigger.tsx | Existing anchored registration and viewport; close removed anchor | docs/preview-card.md; authored story | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-03 | Hover/focus opening, fallback delays 600/300, provider/per-trigger overrides and safe corridor | sec-166-previewcard; ucl19-preview-card; common surfaces | Trigger.tsx/constants; Floating safePolygon/useFocus | HoverSurfaceController; specific default getters and optional delayed focus policy | docs/preview-card.md; authored story | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-04 | Native trigger action preserved; Escape/outside close; supplementary description, nonmodal/backdrop nonblocking | sec-166-previewcard; ucl19-preview-card; common surfaces | sec-166-previewcard; Root.test.tsx | Shared description bridge reused with Tooltip; force nonmodal; native activation untouched | docs/preview-card.md; authored story | V-01 V-02 | passed | Implementation and documented API reconciled; observed results in V-01, V-02. |
| C-05 | Focus retained; restoration only after explicit initialFocus moves focus; optional focusable content reachable | sec-166-previewcard; ucl19-preview-card; common surfaces | PreviewCardPopup; common surface focus | Existing anchored initial/finalFocus, track actual explicit movement; public tab-order owner | docs/preview-card.md; authored story | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-06 | Logical placement, offsets, collision/arrow, portal/inline, tracking and viewport/retention | sec-166-previewcard; ucl19-preview-card; common surfaces | Positioner/Arrow/Portal; Floating positioning | Existing anchored surface/positionSurface/portal/motion | docs/preview-card.md; authored story | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-07 | Theme popup paint, typography, constrained extent, parts/dictionary/hooks and light/dark/RTL | sec-166-previewcard; ucl19-preview-card; common surfaces | base HoverCardContent; Nova cn-hover-card-content/logical | Shared surface/anchored-presence recipes; theme extent/padding, Avatar/Button demo reuse | docs/preview-card.md; authored story | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-08 | Cleanup pending hover/focus, removal/reconnect and disabled trigger preview availability | sec-166-previewcard; ucl19-preview-card; common surfaces | Trigger/root tests and Foundation lifecycle | Existing HoverSurface disconnect; disabled preview does not disable native link | docs/preview-card.md; authored story | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-99 | Native browser media/accessibility and applicable native-input or SSR verification | Shared Foundation accessibility/motion/lifecycle contract; skill verification procedure | Shared native platform and component source tests recorded above | Existing shared owners; no simulated platform substitute | Component docs and ../verification-results.md | V-98 | blocked | Implementation remains in scope; verification requires capabilities not exposed by registered tools. |

## Architecture and reuse

Component-specific policy moves from overlays.ts into preview-card/preview-card.ts with compatible reexport. Existing TpHoverSurface, HoverSurfaceController, TpAnchoredSurface, positioning, Portal, SurfaceState and PresentationController retain all shared responsibilities. New descriptive-trigger policy reuses Tooltip bridge; existing Tooltip behavior unchanged. Delayed focus optional internal hook defaults to existing immediate behavior for Tooltip and NavigationMenu. Preview alone uses600/per-trigger delay and keyboard-visible focus.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| State/portal/geometry | PreviewCard Root/store/Positioner -> floating/shared popup | TpAnchoredSurface | Keep all shared lifecycle/positioning; preview forces nonmodal, descriptive association | Preview/Tooltip/Popover/Menu V-02 V-03 |
| Hover intent | PreviewCardTrigger -> safePolygon/useHover/useFocus | HoverSurfaceController; TpHoverSurface | Per-preview600/300 defaults and optional focus policy; preserve other consumers defaults | Tooltip/NavigationMenu/Preview V-01 V-02 |
| Description | PreviewCard supplementary description; Tooltip association | anchored registerTrigger bridge | Generalize existing bridge policy, never duplicate it | Tooltip/Preview V-02 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Content | base/Nova | cn-hover-card-content/logical: themed popup width/padding/radius/animation | surfaceAppearance/anchoredPresenceAppearance | Share surface paint, theme-proportional64-unit extent and2.5 inset; no local fixed geometry | V-03 |
| Trigger/positioner/portal | Base UI/Nova | native anchor, shared positioner | actual Button href or native link; anchored parts | Native link actions remain intact; structural backdrop pointer-events none only Preview | V-01 V-03 |
| Profile preview | base HoverCard example | actual Avatar, text, optional Badge | existing Avatar/Badge | Plain text containers are content, not substitutes | V-03 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Default profile | link, avatar, status | Button href variant link; Avatar; Badge | Real href/label/default styling | Native text paragraphs only |
| Multiple triggers | shared preview, distinct payload | public handle/registerTrigger/content | Different anchor/payload same owner | Existing fixture native links test native action preservation |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-03 C-04 | Real hover, keyboard focus/Escape, accepted/rejected open, native activation | 600/300 fallback, content reachable with gap, no trigger-action suppression | Real hover enters popup without closing, Tab focus opens after fallback, Escape closes, Enter preserves native hash navigation. Public veto rejects open. Source defaults600/300 and shared hover unit checks pass. | Chrome MCP story/fixture | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-02 | C-02 C-04 C-05 C-08 | Multiple/detached/replaced/disabled trigger, description, modal/backdrop, explicit focus, reconnect | One owner, link unchanged, no focus trap/blocking, cleanup | Public SurfaceHandle switches Alex to Sam without new owner; unregister active trigger closes and removes description. Disabled retains native href and rejects open; detach makes handle trigger inert, reconnect restores and opens. Explicit initialFocus moves to action and close returns trigger. | Chrome MCP public APIs/real keys; affected Tooltip/NavMenu | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-03 | C-06 C-07 | Portal/inline/arrow, themes/RTL/constrained extent, tokens/hooks, actual profile composition | Sourced shared visual result, proportional spacing and no state reset | Dark profile and light RTL/base5 screenshot, actual Avatar/Badge/Button, arrow/backdrop and nonmodal policy checked. Popup partPresentation changes padding on actual role group; shared portal/geometry owners retained. | Chrome MCP screenshots/AX/axe; focused build/docs | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-98 | C-99; native media/accessibility | OS forced-colors and applicable OS reduced-motion policy | Correct native high-contrast and media behavior | Registered Chrome MCP has no forced-colors or OS reduced-motion control. Explicit component reduce policy was tested separately where applicable. | Registered tool schema inspection | blocked | No CSS pseudo-state or matchMedia mock is accepted as native media evidence. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Preview retains TpHoverSurface/TpAnchoredSurface; description bridge policy generalized in same owner. No alternate state or timer implementation. Existing hover tests pass19 across hover+stories batch. |
| I-02 | Default visual regions match traced source and shared library recipes | passed | Chrome55 dark profile screenshot inspected: actual Avatar/Badge/Button, shared popup paint and8px inset; missing vertical gap found and repaired with shared space2. |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | Native link remains link without haspopup/expanded; description added. Arrow independently renders; modal=true cannot set aria-modal/inert, backdrop pointer-events none. Real hover into content remains open. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh live source read, upstream tests/imports/presentation and local owners inspected. |
| 1. Capability mapping | passed | All Preview constituent APIs mapped to inherited owners and required policy fixes; no new public identity. |
| 2. Architecture and composition reuse | passed | One hover/position/state owner; specific policies and reused description bridge. |
| 3. Behavior | passed | Observed behavior in V rows and execution appendices. Focused state/lifecycle and real input paths pass. |
| 4. Presentation and customization | passed | Shared recipes, theme overrides and applicable actual part/ref/delegate/dictionary checks pass; source and visual evidence in V rows. |
| 5. Accessibility | blocked | Native AX, real keyboard and local axe checks recorded; forced-colors browser inspection V-98 cannot be emulated with registered tools. |
| 6. Visual and interaction inspection | blocked | Light/dark/RTL/density and relevant optional states inspected; OS media/forced-colors V-98 remains blocked. |
| 7. Documentation and demo reuse | passed | Authored API documentation, copyable source and actual public nested controls reconciled; full Storybook build passes. |
| 8. Regression and reconciliation | blocked | Focused regressions, lint/type/build, served built package and documentation pass. Complete-component certification remains blocked by explicit V-98/V-99 evidence boundaries. |

## Completion / handoff

Active full task; no conformance claim.

## Execution evidence

Chrome55,1000x850, actual hover and keyboard: hover opens, entering popup maintains it, Escape dismisses, Tab-focus opens after fallback delay, Enter preserves href hash navigation. Accessible native link has supplementary description and no fabricated haspopup/expanded. Axe Storybook root: zero violations. showArrow/backdrop independent; modal=true produced no aria-modal/outside inert, backdrop pointer-events none. Light RTL/base spacing5 yielded width320,padding12.5, arrow matches white popup; dark screenshot spacing2 gap6.4 inspected. Description bridge reused, Tooltip branch retains old policy. Focused hover/stories19 tests, TypeScript/ESLint passed. Remaining full detached-trigger/focus-policy/dictionary/consumer/package checks active.

## Reconciled execution status — 2026-10-04

Implementation and documentation for this workstream are delivered. The scenario table above supersedes earlier prospective statements below/above that say implementation or final checks are pending. Required unavailable browser/runtime evidence remains explicitly blocked; no full conformance claim is made. See [final verification results](../verification-results.md) for shared fixes, commands, package evidence and tool boundaries.
