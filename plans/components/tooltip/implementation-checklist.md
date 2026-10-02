# Tooltip implementation and evidence record

## Delivery and source record

- Component/public identity: Tooltip, `tp-tooltip`.
- Requested work / claim: implement Tooltip, explicitly including source-pointing arrows, viewport visibility/collision validation, side placement and icon/keyboard-hint children.
- Scope source: user request to do Tooltip and review Floating UI and Base UI implementations.
- Repository baseline: `8d1304b536407a0880b19caff1fa3a2fd2fa63d1`; clean tree at start. Preserve subsequent external changes.
- Fresh live authority: project UI Library0.3.14, HEAD8440bff24a97dbbc5c762ebf4bd6baa958b305e1, clean. Foundation doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1 and Library doc_8077bf7c-0361-48f3-ac87-53b983bd89b3; all47 managed terms.
- Local refs: BaseUI5b495488d182c81a8a14a440d7a376517118f8ec; Floating27629b74ba36ab8ceb2a968051927b9b69511a3b; shadcn/ui63c1308d112b6b1205d86244a156cca1abef5087. Registry base/base and Nova preset traced through tooltip.tsx into style-nova.css1379+ and kbd recipe781.
- Sources: Foundation16.7, shared16.1, geometry10, delay11.4, surface11.5, hover19.3; Libraryucl19-tooltip and motion15. Typed geometry pipeline remains internal, not a newly published low-level Floating UI API.
- Tools: registered direct Spec Blocks and Chrome DevTools MCP ready. Reuse localhost:6006 and localhost:5173. No alternate browser driver/runtime dependency.
- Evidence: `tmp/component-verification/tooltip/2026-10-02/`; fixtures `tests/fixtures/components/tooltip/`.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | State and association | Foundation16.1/16.7 | Foundation16.1/16.7; BaseUI TooltipRoot/store | open/defaultOpen, cancelable proposals, callbacks, actions, identifiers, payload resolver; SurfaceState and shared handle | docs/tooltip.md | V-01 | pending | Planned and mapped; execute next |
| C-02 | Trigger interaction | Foundation16.7 | Foundation16.7; TooltipTrigger.tsx/tests | focus/non-touch hover, closeOnClick, disabled, preserving consumer handlers and ARIA; no focus transfer | docs/tooltip.md | V-02 | pending | Planned and mapped; execute next |
| C-03 | Provider and delays | Foundation11.4/16.7 | Foundation11.4/16.7; TooltipProvider.tsx/tests | logical TooltipProvider service; openDelay600/closeDelay0 fallback, explicit delay overrides, restTimeout400, one pending/open participant | docs/tooltip.md | V-03 | pending | Planned and mapped; execute next |
| C-04 | Hoverable popup | Foundation19.3 | Foundation19.3; floating safePolygon; existing safe-corridor.ts | shared hover owner for PreviewCard/Tooltip, safe corridor, disableHoverablePopup false | docs/tooltip.md | V-04 | pending | Planned and mapped; execute next |
| C-05 | Manual placement | Foundation10 | Foundation10; ucl19-tooltip; useAnchorPositioning | side and align attributes; sideOffset/alignOffset; legacy placement/offset aliases; resolve logical direction | docs/tooltip.md | V-05 | pending | Planned and mapped; execute next |
| C-06 | Collision and visibility | Foundation10.6/10.8/10.9 | Foundation10.6/10.8/10.9; Floating flip/shift/size/hide/autoUpdate | repair shared positionSurface: collisionPadding/boundary/avoidance, available dimensions, anchor-hidden, viewport tracking and clipped anchor detection | docs/tooltip.md | V-06 | pending | Planned and mapped; execute next |
| C-07 | Arrow | Foundation10 Arrow | Foundation10 Arrow; TooltipArrow and Floating arrow.ts; shadcn base tooltip | optional showArrow, dynamic side/align/uncentered, padding, dimensions/path/tip and border; post-shift positioning | docs/tooltip.md | V-07 | pending | Planned and mapped; execute next |
| C-08 | Cursor/anchor geometry | Foundation16.7/10.2 | Foundation16.7/10.2; TooltipRoot useClientPoint | virtual anchor support in shared positioning, trackCursorAxis none/horizontal/vertical/both; keyboard opening ignores cursor | docs/tooltip.md | V-08 | pending | Planned and mapped; execute next |
| C-09 | Content and semantics | Foundation16.7 | Foundation16.7; TooltipPopup; shadcn children | default slot and payload resolver; meaningful text with tp-icon and tp-key-hint; role tooltip, active native Trigger description, no interactive content | docs/tooltip.md | V-09 | pending | Planned and mapped; execute next |
| C-10 | Layer and lifecycle | Foundation11.3/16.7 | Foundation11.3/16.7; TooltipPortal/usePositioner | native top layer keeps authored nodes/slots and inherited theme while escaping clipping; shared anchored owner, cleanup and reconnect | docs/tooltip.md | V-10 | pending | Planned and mapped; execute next |
| C-11 | Shared appearance and motion | Library15 | Library15; shadcn base/Nova cn-tooltip-content/arrow | inverted surface recipe, compact inline layout, side-aware entry/exit role surface; token and part/dictionary overrides | docs/tooltip.md | V-11 | pending | Planned and mapped; execute next |
| C-12 | Docs and consumer regression | Skill7/8 | Skill7/8; current catalog | authored Tooltip story/API docs and rich content example; preserve public exports; Popover and PreviewCard consume repaired anchored owner | docs/tooltip.md | V-12 | pending | Planned and mapped; execute next |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Anchored lifecycle/geometry | Tooltip/Popover/PreviewCard usePopupRootStore and useAnchorPositioning | overlays.ts TpAnchoredOverlay, SurfaceState, positionSurface, Presence | Extract/repair actual TpAnchoredSurface consumed by all three; Tooltip-specific role/ARIA/focus policy, not PreviewCard inheritance | V-01 V-06 V-10 V-12 |
| Hover interaction | Tooltip and PreviewCard use shared hover interaction/Floating safe polygon | TpPreviewCard timers; foundation/safe-corridor.ts | Shared hover binding consumed by both; Tooltip adds provider/cursor/description policy | V-02 V-03 V-04 |
| Positioning | core offset/flip/shift/size/arrow/hide; dom autoUpdate | foundation/positioning.ts used by choices, menus and overlays | Repair existing geometry owner and preserve consumers; arrow after collision correction, owner-window cleanup | V-05 V-06 V-07 V-08 V-12 |
| Handles | TooltipHandle uses same popup handle attachment family | dialog/handle.ts | Move generic registration owner into Foundation, preserve Dialog aliases; anchored owner rejects unknown IDs | V-01 V-12 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Content | base/Nova | bases/base/ui/tooltip.tsx; cn-tooltip-content | existing surface recipe and tokens; Tooltip specialization in dictionary | Inverted foreground/background, compact inline-flex, rounded, max width and wrapping; no new variant axis | V-09 V-11 |
| Arrow | base/Nova plus Floating renderer | TooltipArrow; cn-tooltip-arrow | shared native geometry/arrow presentation | Native SVG geometry is required arrow anatomy, not an icon substitute; inherits surface paint and resolves side | V-07 V-11 |
| Rich children | base/Nova tooltip/kbd | children; cn-kbd inside tooltip | tp-icon and tp-key-hint | Reuse actual components and supported hooks; no custom painted kbd/button | V-09 V-11 |
| Surface motion | library15 | cn-tooltip-content, logical inverse slide | shared motion role/controller | opacity + scale + side translation; instant markers suppress movement on reanchor/group/focus | V-10 V-11 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Tooltip default/rich stories and fixtures | Trigger, icon, keyboard hint | tp-button, tp-icon, tp-key-hint | public register entry and actual native focus/AX validation | Native span/text layout and geometry SVG arrow are semantic content/anatomy |
| Regression fixtures | Popover/PreviewCard/Dialog anchors | existing public controls | V-10 V-12 | None |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01; behavior/source/visual | State acceptance, veto, detached trigger migration, retained lifecycle | Meets mapped contract and retains shared consumer behavior | not run | Chrome MCP and focused unit/package checks | pending | Implement then inspect |
| V-02 | C-02; behavior/source/visual | Real hover/focus/blur/click/Escape and disabled/touch policy | Meets mapped contract and retains shared consumer behavior | not run | Chrome MCP and focused unit/package checks | pending | Implement then inspect |
| V-03 | C-03; behavior/source/visual | Timer cancellation, instant sibling switching and rest expiry | Meets mapped contract and retains shared consumer behavior | not run | Chrome MCP and focused unit/package checks | pending | Implement then inspect |
| V-04 | C-04; behavior/source/visual | Cross trigger-popup gap, hover content, leave/cancel/teardown | Meets mapped contract and retains shared consumer behavior | not run | Chrome MCP and focused unit/package checks | pending | Implement then inspect |
| V-05 | C-05; behavior/source/visual | Every physical/logical side, align, offsets and RTL | Meets mapped contract and retains shared consumer behavior | not run | Chrome MCP and focused unit/package checks | pending | Implement then inspect |
| V-06 | C-06; behavior/source/visual | All viewport edges, oversized text, scroll/resize/layout shift, no stale geometry | Meets mapped contract and retains shared consumer behavior | not run | Chrome MCP and focused unit/package checks | pending | Implement then inspect |
| V-07 | C-07; behavior/source/visual | Arrows point toward anchor on all sides and after collision correction | Meets mapped contract and retains shared consumer behavior | not run | Chrome MCP and focused unit/package checks | pending | Implement then inspect |
| V-08 | C-08; behavior/source/visual | Pointer tracking, virtual anchor, no tracking after close | Meets mapped contract and retains shared consumer behavior | not run | Chrome MCP and focused unit/package checks | pending | Implement then inspect |
| V-09 | C-09; behavior/source/visual | AX relationship, icon/keyboard hint composition and local axe | Meets mapped contract and retains shared consumer behavior | not run | Chrome MCP and focused unit/package checks | pending | Implement then inspect |
| V-10 | C-10; behavior/source/visual | Clipped/transformed ancestors, nested modal, anchor removal, retained hidden state | Meets mapped contract and retains shared consumer behavior | not run | Chrome MCP and focused unit/package checks | pending | Implement then inspect |
| V-11 | C-11; behavior/source/visual | First integration visual; themes, narrow/long text, motion replacement and reduce policy | Meets mapped contract and retains shared consumer behavior | not run | Chrome MCP and focused unit/package checks | pending | Implement then inspect |
| V-12 | C-12; behavior/source/visual | Actual Controls/Docs, source and built fixture; other positioning consumers and tests | Meets mapped contract and retains shared consumer behavior | not run | Chrome MCP and focused unit/package checks | pending | Implement then inspect |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners actually adopted | passed | overlays.ts Popover extends TpAnchoredSurface, PreviewCard and Tooltip extend TpHoverSurface; old anchored/hover implementation removed. Dialog handle aliases the extracted Foundation owner. |
| I-02 | First sourced visual composition | passed | Chrome56 integration.png: compact inverted rounded surface, side-aware triangle, inline actual Icon and KeyHint. Arrow10x5 and gap6 leave one pixel separation; documented geometry adaptation from source gap4. KeyHint nested paint uses composition hooks. |
| I-03 | Independent options | passed | Chrome56 public API: four sides resolved as requested; showArrow false removes arrow; top-left anchor flips top to bottom and shifts x5. Rich children visible and native button AX description includes keyboard hint. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh live docs/terms and local BaseUI/Floating/shadcn sources above |
| 1. Capability mapping | passed | C-01 through C-12 and corresponding scenarios map public Tooltip behavior and dependencies |
| 2. Architecture and composition reuse | passed | Actual shared anchored and hover owners selected; geometry repair shared by existing consumers; presentation source chain explicit |
| 3. Behavior | pending | Execute V-01 through V-10 |
| 4. Presentation and customization | pending | V-07 V-11 |
| 5. Accessibility | pending | V-02 V-09 |
| 6. Visual and interaction inspection | pending | V-04 through V-11 |
| 7. Documentation and demo reuse | pending | V-09 V-12 |
| 8. Regression and reconciliation | pending | V-12, build and completion checker |

## Completion / handoff

Implementation pending. No prior Dialog evidence counts as Tooltip verification.
