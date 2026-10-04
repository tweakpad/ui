# Scroll area implementation record

## Delivery and source record

- Requested work / claim: complete Scroll area with native viewport and custom proportional tracks/thumbs, all applicable upstream mechanics.
- Scope source: user full missing-controls request and shared theme/behavior requirements; preserve native scrolling.
- Current live Foundation sec-184-scrollarea, Library ucl21-scroll-area and lifecycle/part contracts read through direct MCP; latest Foundation/Library reads 2026-10-04. Pinned clean references in ../audit.md.
- Source: external/base-ui/packages/react/src/scroll-area/{root,viewport,content,scrollbar,thumb,corner}, constants, geometry helpers, tests and index.parts; shadcn base/ui/scroll-area.tsx reexports Base parts, Nova style-nova.css994–1001 and viewport focus classes. Floating is not involved in native scroll ownership.
- Existing TpScrollArea is only a native viewport wrapper; preserve that viewport ownership while completing observation and manipulation. No new scrolling physics or wheel interception over content. Foundation requires a 16 host-unit minimum thumb: this is a functional geometry bound, not fixed CSS spacing. Theme supplies track padding/thickness/radius and may enlarge minimum thumb size.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Exactly one Root/Viewport/Content and native scroll physics, focus, wheel, touch, anchoring | sec-184-scrollarea | Root/Viewport/Content | Preserve native overflow owner, focusable viewportElement; no content wheel/touch interception | docs/scroll-area.md | V-01 | blocked | Implementation and documented API reconciled; observed results in V-01. Native-input validation remains blocked. |
| C-02 | Zero/one track per axis with one thumb, optional corner; default vertical; old axis compatibility | sec-184; ucl21-scroll-area | Scrollbar orientation vertical; index.parts | orientation vertical; axis x/y/both compatibility; optional scrollbar descriptors for independent keepMounted/visibility | docs/scroll-area.md | V-01 V-02 | blocked | Implementation and documented API reconciled; observed results in V-01, V-02. Native-input validation remains blocked. |
| C-03 | Visibility automatic/always/while-scrolling/on-hover; mounting on overflow, keepMounted false | Library visibility; Foundation mounting | Scrollbar keepMounted/state; Root hover/scroll | visibility policy presentation only; retained tracks hidden unless explicit always; native scroll unaffected | docs/scroll-area.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-04 | Thumb proportional length/position, minimum16 host units, usable track floor, RTL | sec-184 | Viewport computeThumbPosition/getOffset; constants | Measured native extents/track box, clamped geometry; no hard-coded spacing or scroll physics | docs/scroll-area.md | V-01 V-03 | blocked | Implementation and documented API reconciled; observed results in V-01, V-03. Native-input validation remains blocked. |
| C-05 | Track primary press center jump then capture, no focus change, snap suspension/restore | sec-184 | Scrollbar onPointerDown; Root disableViewportSnap | One pointer manipulation controller, native scroll offsets, restored snap declaration | docs/scroll-area.md | V-03 | blocked | Implementation and documented API reconciled; observed results in V-03. Native-input validation remains blocked. |
| C-06 | Thumb drag linear; multipointer/missed release/cancel/lost capture/disabled/removal cleanup | sec-184 | Root pointer handlers/tests | Same native pointer-capture owner for track/thumb; cleanup scope and active pointer guard | docs/scroll-area.md | V-03 | blocked | Implementation and documented API reconciled; observed results in V-03. Native-input validation remains blocked. |
| C-07 | Track wheel axis delta/control zoom/edge chaining | sec-184 | Scrollbar handleWheel | Consume only movable axis delta, retain native parent chaining at reached edge | docs/scroll-area.md | V-01 V-03 | blocked | Implementation and documented API reconciled; observed results in V-01, V-03. Native-input validation remains blocked. |
| C-08 | Overflow edges independent xStart/xEnd/yStart/yEnd threshold; invalid threshold→0 | sec-184 | Root normalizeOverflowEdgeThreshold/stateAttributes | overflowEdgeThreshold number/record; normalized finite positives; public state markers | docs/scroll-area.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-09 | Exact overflow distance variables, corner sizes, thumb dimensions and scrolling inactivity | sec-184 | Viewport/Root/Scrollbar CssVars; SCROLL_TIMEOUT500 | Read-only measured geometry CSS variables, per-axis500ms timeout, same programmatic scroll state | docs/scroll-area.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-10 | Content/viewport resize, source mutations, axes update/detach/reconnect | sec-184 lifecycle | ResizeObserver/Content/Viewport tests | Observer+frame cleanup; preserve offsets; release capture before detached nodes | docs/scroll-area.md | V-02 V-03 | blocked | Implementation and documented API reconciled; observed results in V-02, V-03. Native-input validation remains blocked. |
| C-11 | Accessible viewport, hidden decorative tracks/thumb/corner; consumer delegate responsibility | sec-184; Library semantic invariants | Scrollbar aria-hidden; Viewport focus | Actual native viewport semantics; default hidden duplicated presentation; public part contracts | docs/scroll-area.md | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-12 | Theme/RTL/parts/class/style/delegates/dictionary and reduced motion | Library presentation | base/Nova track p-px/2.5 thickness/full radius; viewport focus | Canonical recipe with common spacing/border/radius/focus roles; generated measured geometry only | docs/scroll-area.md | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-13 | Complete docs/Controls/base and horizontal/both-axis distinct compositions | Library docs | base/examples/scroll-area-example.tsx | Authored stories reuse actual components/content; no local fake scrollbar | docs/scroll-area.md | V-05 | passed | Implementation and documented API reconciled; observed results in V-05. |
| C-99 | Native browser media/accessibility and applicable native-input or SSR verification | Shared Foundation accessibility/motion/lifecycle contract; skill verification procedure | Shared native platform and component source tests recorded above | Existing shared owners; no simulated platform substitute | Component docs and ../verification-results.md | V-98 V-99 | blocked | Implementation remains in scope; verification requires capabilities not exposed by registered tools. |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Native scrolling | Base Root/Viewport/Content | TpScrollArea wrapper | Preserve same native viewport, add measured presentation; no scrolling replacement | ScrollArea V-01 |
| Pointer and measurement | Base root + viewport + scrollbar common context | CleanupScope/Scheduler and existing component | ScrollArea-specific controller owns coordinate mapping/capture/observation, consumed by both axes and root, not parallel scroll owners | ScrollArea V-02 V-03 |
| Presentation/contracts | shadcn Base parts and Nova | PresentationController/renderPart/common focus recipe | Canonical generated anatomy uses existing part pipeline; structural geometry separate from theme paint | ScrollArea V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Root/viewport/content | base/Nova | scroll-area.tsx root relative/viewport size-full focus/Content | Existing native viewport plus common focus tokens | No scrollbar-induced content displacement | V-01 V-04 |
| Track/thumb/corner | base/Nova | cn-scroll-area-scrollbar/thumb, Base geometry | Shared border/spacing/radius roles in canonical scroll-area recipe | Theme proportional thickness;16 functional minimum floor from Foundation remains behavioral | V-03 V-04 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Vertical records/horizontal gallery | scroll controls and optional separators/images | Same ScrollArea; Separator where used; native img/text | Real viewport/capture; no fake scroller styling | Native content and scroll anatomy required by contract |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-02 C-04 C-07 | Native keyboard/programmatic scroll, both axes/RTL, edge chaining | Native viewport ownership and correct proportional geometry | Real PageDown moves native offset0 to220 and retains focus. Programmatic RTL offset-150 maps start distance150. Native wheel/touch edge chaining cannot be driven by registered tool. | Chrome MCP | blocked | See execution appendices and ../verification-results.md. Remaining physical-input boundary recorded in V-99. |
| V-02 | C-03 C-08 C-09 C-10 | Visibility/retention/thresholds/resize/mutation/scroll inactivity | Correct independent markers, geometry and no offset reset | Independent visibility/retention/corner/threshold changes preserve native viewport and offsets. Resize preserves position; inactivity clears marker after500ms; reconnect reattaches observation. | Chrome MCP public APIs | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-03 | C-04 C-05 C-06 C-07 C-10 | Actual pointer track/thumb, snap, cancellation, zero travel, removal | Capture mapping/focus preservation and cleanup | Real track click reaches midpoint463, actual thumb drag reaches925.5/926, viewport focus and snap restored. Tiny track4 gives thumb2 with zero travel. Native pointercancel unavailable. | Chrome MCP pointer capability | blocked | See execution appendices and ../verification-results.md. Remaining physical-input boundary recorded in V-99. |
| V-04 | C-11 C-12 | Default AX, keyboard, theme/dictionary/parts/delegates/light/dark/RTL | Hidden mirrored tracks; accessible viewport and theme source paint | Native named viewport region and mirrored decorative tracks inspected; light/dark/RTL/base5 geometry, actual viewport delegate/ref/dictionary and thumb part hook checked. | Chrome MCP screenshot/axe | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-05 | C-13 | Docs/Controls/catalog/exports and consumers | Real examples and complete public API | Complete public APIs, canonical scrolling content, authored Controls, package exports and builds pass. | build/static/Chrome | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-98 | C-99; native media/accessibility | OS forced-colors and applicable OS reduced-motion policy | Correct native high-contrast and media behavior | Registered Chrome MCP has no forced-colors or OS reduced-motion control. Explicit component reduce policy was tested separately where applicable. | Registered tool schema inspection | blocked | No CSS pseudo-state or matchMedia mock is accepted as native media evidence. |
| V-99 | C-99; native input/runtime | Required physical-input or SSR boundary | Native platform behavior verified without simulation | Native wheel/touch chaining and pointer cancellation are unavailable in registered Chrome MCP. | Registered Chrome MCP schemas and current runtime inventory | blocked | Source/API evidence does not substitute for this required execution. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners actually adopted, duplicate removed | passed | Extracted existing native viewport into one controller and canonical renderPart anatomy; removed old wrapper and duplicate viewport paint |
| I-02 | Sourced representative render and shared recipe | passed | Chrome61 dark both-axis screenshot: narrow shared-token tracks, proportional thumbs, shared radius/focus; native content, no substitute UI |
| I-03 | Independent constituents and placement | passed | Chrome61 independent horizontal always and vertical on-hover; optional corner removed; zero-track composition preserves viewport and offsets150/240; retained nonoverflow horizontal inspected separately |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh live contract and local Base/shadcn/Nova chain |
| 1. Capability mapping | passed | Native scroll, both axes/geometry/visibility/threshold/capture/wheel/cleanup/parts/docs mapped |
| 2. Architecture and composition reuse | passed | Existing viewport remains owner; one shared manipulation/measurement controller for both axes, no duplicate UI behavior |
| 3. Behavior | blocked | Observed behavior in V rows and execution appendices. Required native-input/runtime evidence remains V-99 blocked. |
| 4. Presentation and customization | passed | Shared recipes, theme overrides and applicable actual part/ref/delegate/dictionary checks pass; source and visual evidence in V rows. |
| 5. Accessibility | blocked | Native AX, real keyboard and local axe checks recorded; forced-colors browser inspection V-98 cannot be emulated with registered tools. |
| 6. Visual and interaction inspection | blocked | Light/dark/RTL/density and relevant optional states inspected; OS media/forced-colors V-98 remains blocked. |
| 7. Documentation and demo reuse | failed | User corrective review pending.  Authored API documentation, copyable source and actual public nested controls reconciled; full Storybook build passes. |
| 8. Regression and reconciliation | blocked | Focused regressions, lint/type/build, served built package and documentation pass. Complete-component certification remains blocked by explicit V-98/V-99 evidence boundaries. |

## Completion / handoff

Active full scope; no completion claim.

## Execution evidence

Initial Chrome61 composition: viewport318x238, native extent676x1201; tracks310x8 and8x230, thumb145.07x6.41 and6.41x45.26. Dark screenshot matches traced narrow Nova tracks and shared radius. Independent visibility and optional corner changes retained exact viewport and150/240 offsets; empty track descriptors retained native scroll240. TypeScript and focused ESLint passed. Browser matrix remains active.

Chrome61 execution: actual PageDown changed native offset0→220 and retained viewport focus. Programmatic scroll set scrolling and cleared after500ms; independent thresholds suppressed xStart150 at200 and yEnd626 at10000, while NaN/negative normalized0. RTL native offset-150 mapped start distance150; width resize retained-150/300. Tiny12x12 two-axis host exposed a CSS minimum exceeding usable track; repaired proportional minimum resolution, now4-unit tracks have2-unit thumbs and zero drag travel. Default AX exposes only named native region/content. Public consumer scrollbar semantics fixture (aria-hidden override, role/range/controls/keyboard handler) allowed real Chrome click: midpoint scroll463, viewport focus retained, snap restored. Actual thumb drag reached925.5 of926 (device quantization), same focus and snap. Shared spacing seed5 produced12.5-unit track and1.25 padding; public part thumb color override applied. Detach/reconnect retained native element, native browser reset detached scroll offset to0; new scroll observation and inactivity cleanup worked after reconnect. No wheel/touch/pointer-cancel injection tool is registered; those physical-input paths remain blocked, not claimed from synthetic events.

## Reconciled execution status — 2026-10-04

Implementation and documentation for this workstream are delivered. The scenario table above supersedes earlier prospective statements below/above that say implementation or final checks are pending. Required unavailable browser/runtime evidence remains explicitly blocked; no full conformance claim is made. See [final verification results](../verification-results.md) for shared fixes, commands, package evidence and tool boundaries.

## User corrective review — 2026-10-04

Fresh sec-184-scrollarea and ucl21-scroll-area; Base ScrollAreaScrollbar.tsx plus base/ui/scroll-area.tsx and Nova traced. Automatic scrollbar visibility must follow overflow, not pointer presence; reserve on-hover for explicit mode. Keep native viewport and current shared geometry/capture owner. Match source default bounded bordered vertical composition; docs horizontal and both-axis use cases. Verify keyboard scroll, tracks, edge geometry and stable native viewport.
Earlier visual/docs passes are reopened by the reported defects. Fresh direct MCP head8440bff/state5daad632. Existing scoped tests are regression leads, not proof of visual completeness.


Current corrective integration and shared-regression evidence: [library-wide use-case review](../use-case-review-2026-10-04.md). Parent scope remains active; this record does not certify unreconciled source cases.

## Source-case reconciliation design — 2026-10-04

Fresh live sec-184-scrollarea/ucl21-scroll-area reads at head8440bff/state5daad632 confirm native Viewport ownership, presentation-only visibility, independent axes, proportional thumb, accessible-hidden tracks and no unexpected displacement. Base/Nova source vertical repeated labels/separators and horizontal portrait artwork/captions plus new-york counterparts inspected. Existing Default covers vertical reference; horizontal Docs currently substitutes a repeated landscape illustration and1.5 ratio, diverging from source3/4 portrait gallery. Correct this composition using source-provided public artwork URLs/attribution, actual AspectRatio fitcover, native figures/captions and existing ScrollArea. Asset URLs belong only to docs; no runtime dependency. Preserve existing root/theme dimensions and actual shared track behavior. Both-axis example remains a distinct supported composition.

C-01/C-02/C-08 and docs/source mapping extension: both Docs compositions use markupExample so one authored markup string is live and copy source, removing independent render/source duplicates. Canonical Default still binds real Controls. Do not add variants, scroll state, pointer interception, per-instance track spacing or replacement controls. Native figures/text and original destination-free content are semantic content, not parallel components. Traced owners: shadcn ScrollArea->Base ScrollArea Root/Viewport/Scrollbar/Thumb/Corner maps to existing TpScrollArea/ScrollAreaController; Nova thin track/thumb map to existing recipes, unchanged. Verify representative gallery sizing/actual images and vertical native keyboard scroll first, then horizontal keyboard/scroll API, viewport identity/offset through source toggles and visibility changes, both-axis corner/resize, themeRTL/narrow and axe. Existing pointer drag/wheel/touch platform evidence boundaries remain as documented; no synthetic input counted as native.

Early integration passed: actual Release history PageDown moves native viewport and keeps viewport focus. Gallery loads all3source images (naturalWidth300) into actual240×320 AspectRatio regions, native viewport384×370 with scrollWidth771 and one visible accessibility-hidden horizontal track. Two-axis viewport320×230 has content538×1166 and both tracks. Screenshot inspected shared border/radius, image/caption layout and track; no separate visual scrolling owner. Image width/height300/400 are intrinsic metadata, not fixed spacing/layout; rendered extents follow theme-relative figure width and ratio. Proceed with source-toggle/visibility identity, horizontal keyboard and narrowRTL checks.

Visual integration correction: source examples explicitly frame the ScrollArea with rounded-md/border, while current local compositions omitted that boundary. The primitive source Root itself has no mandatory border, so do not change every ScrollArea consumer. Add one shared example-frame declaration using existing border/radius tokens to canonical and both Docs compositions, reflecting the source demo's caller layout. No padding/scrollbar override. Earlier screenshot proves artwork/track geometry, not the absent source border; final screenshot must include the frame.

Canonical-story boundary correction: the existing stories check flagged source-demo border paint on Default. Skill gate7 requires the canonical example to use actual default presentation, and ScrollArea's source Root/our default recipe has no border. Removed the frame from Default rather than weakening that invariant or globally adding paint to embedded ScrollArea consumers. Source frame remains on both composed Docs cases. Vertical source case maps native list/Separators/scroll behavior to canonical unstyled Default; demo-only border is an explicit adaptation. Earlier appendix wording that all three compositions acquire a frame is superseded.

## Continuation results — 2026-10-04

Four inventoried base/new-york source cases map individually to canonical vertical Default and horizontal Docs gallery. Replaced repeated landscape illustration/1.5ratio with actual source-provided portrait artworks/attributions in3/4 AspectRatio; all3images loaded atnaturalWidth300/rendered240×320. Both-axis composition retained. Shared markupExample now owns rendered and copied HTML, eliminating separate gallery/two-axis render implementations. Docs examples use shared border/radius token frame from source; canonical Default remains unstyled per Skill gate7 and existing story invariant. No runtime ScrollArea, controller or track recipe change.

Chrome76 actual native PageDown0→252 with viewport focus; actual gallery ArrowRight0→40 with focus. Show/Copy retains identical viewport and40offset, Copy reports Copied. Programmatic visibility changes always/while-scrolling/on-hover/automatic retain same viewport/150offset; observed track flags true/true/false/true respectively. Two-axis100/250 retained with optional Corner removed/restored and same viewport. Actual pointer hover into/out of on-hover gallery changes visibletrue→false and retains120offset/identity; automatic changes flag backtrue without pointer presence. This directly checks hover without synthetic pointer events.

Narrow390px Docs previewsclient248/scroll248; framed native viewport246, content771. RTL native offset-125 retains expected source gallery order and proportional track in dark screenshot. Track/thumb remain AX-hidden and viewport exposes one named region. Axe0 across two usage previews,18passing rules. Scoped screenshot inspected inline. Browser emulation cleared. Canonical border change initially failed the existing unstyled-story test; corrected by removing canonical paint, leaving all9tests passing. TypeScript/ESLint/Prettier/whitespace pass. Final Storybook build succeeds at tmp/component-verification/scroll-area/2026-10-04/storybook-build.log. Public image URLs are Docs-only and require network access; no library runtime dependency added.

Source-case visual/docs mapping is reconciled. Native wheel/touch/capture-cancel and OS-media evidence gaps remain as documented; these results do not certify every ScrollArea capability or the complete library.
