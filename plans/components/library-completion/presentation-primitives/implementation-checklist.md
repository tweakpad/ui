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

- Component(s) / public identity: Bubble, Empty State, Aspect Ratio Box, Avatar; Bubble Group and Avatar Group constituents.
- Requested work / claim: implementation workstream within the full library completion request; completing this workstream does not complete or narrow that request.
- Scope source: user's complete control list and instruction to preserve working controls while removing non-normalized implementations.
- Repository baseline / unrelated changes: clean 3a03ac0b1bfc0ce2194eb22f3c1cf7748efff84d; audit report only added before this record.
- Live project / document IDs and revisions: direct MCP Foundation and Component Library reads retained in auditSpec0/auditSpec1; IDs and clean pinned reference revisions in ../audit.md.
- Owning contracts / dependencies / vocabulary: ucl22-bubble, ucl22-empty-state, ucl22-aspect-ratio; existing TpElement public part customization and semantic theme roles.
- Local Base UI / Floating UI / shadcn evidence: Base registry bubble.tsx, empty.tsx, aspect-ratio.tsx; Nova selectors cn-bubble*, cn-empty*; useRender/mergeProps expose native content delegates, not an overlay dependency.
- Tool readiness: direct Spec Blocks and Chrome DevTools MCP available.
- Browser / server / build under test: existing localhost:6006 Storybook, audit tab 61; Chrome MCP only.
- Evidence directory: tmp/component-verification/library-completion/presentation-primitives/
- Evidence availability to the next agent: local workspace and current MCP browser only.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Bubble seven treatments; secondary default | ucl22-bubble | ../specification/external/ui/apps/v4/registry/bases/base/ui/bubble.tsx/bubbleVariants; Nova cn-bubble-variant-* | existing variant axis; paint content through variantPresentation | docs/bubble.md and src/stories/bubble.stories.ts | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-02 | Bubble logical start/end placement; start default | ucl22-bubble | ../specification/external/ui/apps/v4/registry/bases/base/ui/bubble.tsx/Bubble align; Nova cn-bubble | existing align; logical margin and constrained width | docs/bubble.md and src/stories/bubble.stories.ts | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-03 | Optional reactions; block-start/end independently from start/end alignment | ucl22-bubble | ../specification/external/ui/apps/v4/registry/bases/base/ui/bubble.tsx/BubbleReactions; Nova cn-bubble-reactions-* | reactionSide/reactionsAlign; named reactions slot; absolute region only when populated | docs/bubble.md and src/stories/bubble.stories.ts | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-04 | Bubble grouping, rich content and named reaction controls without owning chat state | ucl22-bubble | ../specification/external/ui/apps/v4/registry/bases/base/ui/bubble.tsx/BubbleGroup,BubbleContent | TpBubbleGroup native group constituent, public Button reactions and slot content | docs/bubble.md and src/stories/bubble.stories.ts | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-05 | Bubble regions/customization; inherited themes and spacing; long content | ucl22-bubble | ../specification/external/ui/apps/v4/registry/bases/base/ui/Nova cn-bubble-content/group | bubble/root/content/reactions canonical parts and existing presentation controller | docs/bubble.md and src/stories/bubble.stories.ts | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-06 | Empty State optional media; plain default or icon enclosure | ucl22-empty-state | ../specification/external/ui/apps/v4/registry/bases/base/ui/empty.tsx/EmptyMedia; Nova cn-empty-media-* | mediaTreatment; media slot plus compatible icon slot; existing Icon or Avatar inside | docs/empty-state.md and src/stories/empty-state.stories.ts | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-07 | Empty State textual title/description and header; slot-only description supported | ucl22-empty-state | ../specification/external/ui/apps/v4/registry/bases/base/ui/empty.tsx/EmptyHeader,EmptyTitle,EmptyDescription | title/description properties and slots; canonical header/title/description parts | docs/empty-state.md and src/stories/empty-state.stories.ts | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-08 | Empty State optional content/recovery; stable empty regions; dynamic slots | ucl22-empty-state | ../specification/external/ui/apps/v4/registry/bases/base/ui/empty.tsx/EmptyContent | default/content/actions slots; public Button; hide unpopulated regions | docs/empty-state.md and src/stories/empty-state.stories.ts | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-09 | Empty State themed spacing/type/parts and constrained content | ucl22-empty-state | ../specification/external/ui/apps/v4/registry/bases/base/ui/Nova cn-empty/header/content/title/description | existing dictionary; no per-instance spacing attributes | docs/empty-state.md and src/stories/empty-state.stories.ts | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-10 | Aspect Ratio finite positive ratio; deterministic invalid rejection | ucl22-aspect-ratio | ../specification/external/ui/apps/v4/registry/bases/base/ui/aspect-ratio.tsx/AspectRatio ratio; contract strengthens validation | validated ratio setter; retain 16/9 initial compatibility default and require valid explicit updates | docs/aspect-ratio.md and src/stories/aspect-ratio.stories.ts | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-11 | Aspect Ratio content cannot determine ratio; fill/contain/cover/none; fill default | ucl22-aspect-ratio | ../specification/external/ui/apps/v4/registry/bases/base/ui/aspect-ratio.tsx/AspectRatio geometry; live Fit policy | fit property; absolute content region and slotted object-fit; native layout constraints | docs/aspect-ratio.md and src/stories/aspect-ratio.stories.ts | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-12 | Aspect Ratio root/content public customization and preserved DOM content semantics | ucl22-aspect-ratio | ../specification/external/ui/apps/v4/registry/bases/base/ui/aspect-ratio.tsx/native div | canonical aspect-ratio-box/content parts; slot content; no invented semantic role | docs/aspect-ratio.md and src/stories/aspect-ratio.stories.ts | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-13 | Registration/export/docs/generator integrity; shared consumers unchanged | user regression requirement; shared presentation contract | ../specification/external/ui/apps/v4/registry/bases/base/ui/existing local component family exports and story generator | grouped exports delegate to component folders; authored stories protected by generator | docs/all three.md and src/stories/all three.stories.ts | V-05 | passed | Implementation and documented API reconciled; observed results in V-05. |
| C-14 | Avatar loading generations, cached load/error and fallback exclusivity | Foundation sec-181-avatar; ucl21-avatar | Base UI avatar/image/useImageLoadingStatus.ts and AvatarImage.tsx | TpAvatar src/srcSet/sizes/crossOrigin/referrerPolicy; read-only imageLoadingStatus; callback and tp-loading-status-change notification; generation cleanup | docs/avatar.md | V-06 | passed | Implementation and documented API reconciled; observed results in V-06. |
| C-15 | Avatar fallback delay default zero; keepMounted default false; native lazy loading | Foundation sec-181-avatar | Base UI AvatarFallback.tsx and AvatarImage.test.tsx keepMounted tests | fallbackDelay/keepMounted/loading; current native element or preloader owns status; timer cleanup and no stale success | docs/avatar.md | V-06 | passed | Implementation and documented API reconciled; observed results in V-06. |
| C-16 | Avatar accessible image/fallback/name, sm/default/lg sizes, light/dark theme | ucl21-avatar | Base AvatarRoot/Image/Fallback; Nova cn-avatar* | alt/fallback/size preserved; canonical parts and semantic muted fallback; size unchanged for existing consumers | docs/avatar.md | V-07 | passed | Implementation and documented API reconciled; observed results in V-07. |
| C-17 | Avatar optional status badge, group and overflow count | ucl21-avatar | base/ui/avatar.tsx AvatarBadge/AvatarGroup/AvatarGroupCount; Nova cn-avatar-badge/group-count | badge slot uses existing public Badge; TpAvatarGroup constituent with default children and omitted count text; shared avatar presentation | docs/avatar.md | V-07 | passed | Implementation and documented API reconciled; observed results in V-07. |
| C-18 | Avatar actual part customization and standalone package/documentation boundaries | ucl21-avatar; inherited presentation contract | Base avatar/index.parts.ts; useRenderElement | component folder; grouped export preserved; explicit constituent part bindings take precedence over inherited bindings | docs/avatar.md; src/stories/avatar.stories.ts | V-08 | passed | Implementation and documented API reconciled; observed results in V-08. |
| C-19 | Skeleton motion pulse/sweep/none; pulse default; animated compatibility flag | ucl22-skeleton | base/ui/skeleton.tsx animate-pulse; Nova cn-skeleton | existing Motion loading role and Skeleton owner; add motion selector, keep animated=false suppression | docs/skeleton.md | V-09 | passed | Implementation and documented API reconciled; observed results in V-09. |
| C-20 | Skeleton decorative semantics and inherited geometry; public part customization | ucl22-skeleton | base/ui/skeleton.tsx native placeholder | aria-hidden placeholder, no status; preserve dimensions across motion changes; existing partContracts and partPresentation | docs/skeleton.md | V-09 | passed | Implementation and documented API reconciled; observed results in V-09. |
| C-21 | Spinner sm/default/lg already implemented; names versus decorative usage | ucl21-spinner | base/ui/spinner.tsx role status and Loader icon | Preserve existing sizes and recipe; label empty omits status; authored size Controls and public Button composition | docs/spinner.md | V-10 | passed | Implementation and documented API reconciled; observed results in V-10. |
| C-22 | Shared motion lifecycle and duration theme; cleanup and reconnect | inherited motion contract; ucl21-spinner/ucl22-skeleton | existing foundation/motion.ts prepareMotion | Reuse ambient handles, honor inherited/reduced policy and terminal hooks; timing derives from shared duration token | docs/spinner.md; docs/skeleton.md | V-09, V-10 | passed | Implementation and documented API reconciled; observed results in V-09, V-10. |
| C-99 | Native browser media/accessibility and applicable native-input or SSR verification | Shared Foundation accessibility/motion/lifecycle contract; skill verification procedure | Shared native platform and component source tests recorded above | Existing shared owners; no simulated platform substitute | Component docs and ../verification-results.md | V-98 | blocked | Implementation remains in scope; verification requires capabilities not exposed by registered tools. |

No source conflict blocks these repairs. The existing ratio initial default is preserved for compatibility; invalid supplied values must be rejected, not clamped. The remaining library work and its unresolved consolidation contract edits remain tracked in ../audit.md.

## Architecture and reuse

Substantially repaired primitives move to their own component folders; grouped exports remain compatible. Structure owns containment and logical geometry. The existing presentation dictionary owns paint, spacing and typography. No new tokens or layout attributes.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Primitive structure and public customization | useRender/mergeProps from BubbleContent; native Empty/AspectRatio | TpElement, PresentationController, primitive exports | Keep shared lifecycle and part customization; component folders own only local geometry/content anatomy | Bubble, Empty State, Aspect Ratio; V-01, V-03, V-04 |
| Variant paint | Nova cn-bubble-variant-* | default.ts variantPresentation; Badge/ListItem/Bubble passive map | Move Bubble paint to content; fill missing Bubble subdued/tinted using existing semantic roles; preserve Badge/ListItem variant behavior | Bubble plus unchanged Badge/ListItem; V-01, V-05 |
| Nested recovery/reaction UI | Bubble/Empty examples compose Button/Icon | existing TpButton/TpIcon | Compose these controls in docs and examples; no local action styling | Bubble reactions, Empty State recovery; V-02, V-03 |

| Avatar image lifecycle | Base avatar/root, image/useImageLoadingStatus and fallback | existing TpAvatar/TpElement lifecycle | Repair one Avatar owner with generation cleanup and delayed fallback; keep existing sizes | Navigation Panel and Avatar; V-06, V-07 |

| Activity motion | shadcn skeleton animate-pulse and spinner animate-spin; existing prepareMotion | Skeleton and Spinner ambient handles | Preserve one shared motion service; no timer or animation controller duplicate | Skeleton, Spinner and nested Button; V-09, V-10 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Bubble group/root/content | bases/base; Nova | bubble.tsx; cn-bubble-group, cn-bubble, cn-bubble-content and variants | componentAppearance and variantPresentation | Paint content rather than root; reference width constraint, theme radius and spacing | V-01 |
| Bubble reactions | bases/base; Nova | BubbleReactions; cn-bubble-reactions-* | bubble-reactions dictionary entry; public Button children | Logical anchoring, independent side/alignment, omit empty region | V-02 |
| Empty State root/header/media/title/description/content | bases/base; Nova | empty.tsx; cn-empty* | existing empty-state dictionary entries; public Icon/Button | Canonical part binding, zero native heading/paragraph margins; shared typography and spacing | V-03 |
| Aspect ratio root/content | bases/base | aspect-ratio.tsx relative aspect ratio box | TpElement and canonical part hooks | Structural ratio and fitting; appearance remains consumer/theme owned | V-04 |

| Avatar root/image/fallback/badge/group/count | bases/base; Nova | avatar.tsx; cn-avatar* selectors 74-95 | existing Avatar recipe and part controller; public Badge in status slot | Muted semantic fallback; preserve working navigation sizes; constituent-specific bindings reuse same dictionary | V-07, V-08 |

| Skeleton / Spinner | bases/base; Nova | cn-skeleton bg-muted rounded-md; Spinner size-4 and activity mark | existing skeleton/spinner recipes; shared duration/color/size roles | Keep Spinner dimensions; Skeleton muted surface and explicit pulse/sweep/none; no new component tokens | V-09, V-10 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Bubble authored example | Reaction action | tp-button with accessible name | global package registration plus actual nested button inspection; V-02 | Message prose and grouping use ordinary native layout |
| Empty State authored example | Recovery/media | tp-button/tp-icon | public registration and keyboard focus; V-03 | Header/title/description are ordinary semantic content |
| Aspect Ratio example | Image | native img with alt | responsive dimensions and fitting; V-04 | Native replaced content is the required geometry consumer, not a substitute library control |

| Avatar authored example | Image, status and grouping | TpAvatar, public Badge, TpAvatarGroup | registration, images and consumer navigation checks; V-06, V-07 | Native image is the contract image, not a substitute control |

| Spinner/Skeleton examples | Named Button activity and layout placeholders | TpButton/TpSpinner/TpSkeleton | Named/decorative accessibility and motion controls; V-09, V-10 | Native layout sets placeholder geometry; no substitute real control |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-02 C-05; visual/customization | All variants; light/dark; spacing overrides; RTL; long text | Content paint and logical placement agree with reference and shared theme | All seven Bubble treatments, dark/light, base5 RTL and long wrapping inspected against Nova and shared tokens. | Chrome MCP screenshot and measured geometry | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-02 | C-03 C-04; composition/interaction | Toggle reactions, side/alignment; group bubbles; Tab to actual reaction Button | No empty reaction surface; correct independent anchoring; named button keyboard reachable | Actual Tab reaches named reaction Button; all four independent side/alignment combinations move same region; removing content hides reactions. Group remains content-only. | Chrome MCP real keyboard, snapshot, screenshot | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-03 | C-06 C-07 C-08 C-09; visual/semantics | Slot-only description; no media/actions; icon treatment; change title/slots/theme | Optional regions collapse; no browser default margins; all canonical parts styled | Slot-only EmptyState description and optional media/actions render correctly; removing actions collapses region. Title h3 render delegate/ref/host properties and shared-theme layout checked. | Chrome MCP evaluation, screenshot and accessibility tree | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-04 | C-10 C-11 C-12; geometry/API | Positive, zero, NaN and infinite updates; oversized child; all fit values | Invalid supplied ratio rejects deterministically; content never expands box; fit responds | Invalid0/negative/NaN/Infinity ratio throws RangeError; oversized2000px child does not expand426.664px square; all four native object-fit modes inspected. | Chrome MCP public API and geometry | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-05 | C-13; package/regression/docs | Typecheck/build; authored docs; render Badge/ListItem/Buttons alongside changed primitives | Existing consumers retain owners and behavior; new constituent registered and docs match API | Authored public compositions and generated-entry protection checked; source/type/lint/build and native package exports pass. Actual Button, Badge and shared primitive consumers retained. | TypeScript/build, diff review, Chrome MCP | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-06 | C-14 C-15; lifecycle/API | Invalid image then valid source; cached image; fast source replacement; delay zero/nonzero; keep-mounted; disconnect/reconnect | Exactly one visible image/fallback; current generation only; canceled timers; current source recovers from error | Native invalid/valid/cached/fast-replacement image events and delayed fallback checked; keepMounted is inaccessible while fallback visible. Disconnect/reconnect current error state has no stale timer/load publish. | Chrome MCP public API fixture and actual image events | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-07 | C-16 C-17; visual/semantics | Light/dark, sizes, badge, group omitted count and RTL; existing navigation avatars | Centered named fallback, semantic contrast and existing sizes preserved; group count announced | Light/dark/RTL Avatar/Group/status size screenshots and AX inspected. Overflow+3 isolated LTR. Navigation expanded/collapsed visible avatars grid-center and align with rail icons. | Chrome MCP screenshot/accessibility tree | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-08 | C-18; composition/regression | Part overrides, custom dictionary, group registration and navigation inherited bindings | Hooks reach canonical parts; no unintended avatar-circle style on group or other constituent owners | Canonical Avatar/Group/ref/delegate/dictionary hooks bind to actual parts, not inherited circle recipe on group. Ref cleared when fallback replaced and on disconnect. | TypeScript, Chrome MCP actual consumers | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-09 | C-19 C-20 C-22; motion/visual/customization | pulse/sweep/none, animated false, reduced policy, fixed layout; light/dark | Correct visual policy and muted surface; same dimensions; no accessible placeholder announcement | Pulse/sweep/none and animated=false checked. Explicit reduce pauses animation, normal resumes; geometry retained and placeholder absent from AX. OS media remains separately blocked. | Chrome MCP styles/screenshot and accessibility | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-10 | C-21 C-22; semantics/size | Three sizes, named standalone, empty label in Button; theme spacing and reduced motion | Existing dimensions scale with theme, only named status announced, one motion owner | Spinner sizes at base5 are25/31.25/37.5; named statuses and decorative Button spinner AX checked. Explicit reduce pauses host animation, normal resumes. | Chrome MCP and authored story Controls | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-98 | C-99; native media/accessibility | OS forced-colors and applicable OS reduced-motion policy | Correct native high-contrast and media behavior | Registered Chrome MCP has no forced-colors or OS reduced-motion control. Explicit component reduce policy was tested separately where applicable. | Registered tool schema inspection | blocked | No CSS pseudo-state or matchMedia mock is accepted as native media evidence. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Diff delegates grouped exports to component folders, retains TpElement/PresentationController, and uses the existing variant owner on Bubble content. No Button or overlay owner changed. |
| I-02 | Default visual regions match traced source and shared library recipes | passed | Chrome tab 61 screenshot: Bubble content alone painted; Empty State title/description grouped with 6.4px gap and zero native margins; oversized content leaves a 435.21px square unchanged. Theme spacing 3.2px. |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | Chrome API inspection: reactionSide block-start and reactionsAlign start move the same optional region independently; removing actions hides the content region; slot-only description remains visible; Bubble Group registered. |

Avatar and activity components were added after the first three-component checkpoint; its evidence is retained, and the expanded checkpoint must be rerun.

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh owning contracts and clean local source pins read; full requested delivery remains tracked in parent audit. |
| 1. Capability mapping | passed | C-01 through C-22 map all targeted constituent APIs and inherited customization to sources and V-01 through V-10. |
| 2. Architecture and composition reuse | passed | Existing TpElement/presentation/variant/Button owners retained; native content anatomy is justified; source styles mapped. |
| 3. Behavior | passed | Observed behavior in V rows and execution appendices. Focused state/lifecycle and real input paths pass. |
| 4. Presentation and customization | passed | Shared recipes, theme overrides and applicable actual part/ref/delegate/dictionary checks pass; source and visual evidence in V rows. |
| 5. Accessibility | blocked | Native AX, real keyboard and local axe checks recorded; forced-colors browser inspection V-98 cannot be emulated with registered tools. |
| 6. Visual and interaction inspection | blocked | Light/dark/RTL/density and relevant optional states inspected; OS media/forced-colors V-98 remains blocked. |
| 7. Documentation and demo reuse | failed | User reports incomplete examples; corrective review reopened.  Authored API documentation, copyable source and actual public nested controls reconciled; full Storybook build passes. |
| 8. Regression and reconciliation | blocked | Focused regressions, lint/type/build, served built package and documentation pass. Complete-component certification remains blocked by explicit V-98/V-99 evidence boundaries. |

## Documentation synchronization

- [ ] Base examples, actual Controls, API docs and generator reconcile.
- [ ] Rendered and copyable examples use public nested controls.
- [ ] Updated part, property, slot and constituent exports documented.

## Completion / handoff

Avatar added after its complete Foundation/Base image/fallback and Nova source review. Avatar early integration remains pending separately from the recorded first three components.

Active work. No implementation or verification pass is implied by passed source/design gates. Full library scope remains in ../audit.md.

Expanded early integration2026-10-04: Chrome61 light screenshot inspected all7Bubble treatments, slot-only EmptyState, fit-contain square, centered muted Avatar fallback and AvatarGroup overflow count, actualSpinner sizes/LoadingButton andSkeleton. Completed public renderPart bindings on Avatar image/fallback/badge/group/count, Bubble root/reactions, EmptyState regions and AspectRatio parts; fallback reference/host props verified on actualspan. Shared behavior and default paint retained.

## Expanded execution evidence 2026-10-04

Chrome61 light and dark/RTL/spacing5 screenshots inspected all7Bubble treatments, long wrapping, optional EmptyState regions, native image fit, muted centered Avatar+Group and activity. Actual Tab reaches named reaction Button. All4reaction side/alignment combinations move the same delegated aside; removing content hides reactions. Removing EmptyState actions hides content while slot-only description remains. Public render delegate/title h3/ref/hostProperties and Avatar presentation dictionary replacement applied to actual semantic nodes.

Avatar native invalid→valid image requests: error/fallback, then loaded/image only and old fallback ref cleared; keepMounted retains inaccessible hidden failing image with visible fallback. Initial80ms fallback absent before delay and visible after; disconnect/reconnect returns current error state without stale loaded image. Actual source events collected. AspectRatio rejects0/negative/NaN/Infinity withRangeError; fill/contain/cover/none map to nativeobjectFit;2000pxchild leaves426.664x426.664box unchanged (earlier comparison across theme width change was invalid and repeated correctly).

Skeleton pulse/sweep/none report pulse/shimmer/noanimation on appropriate region;animated=false stops animation. Spinner named statuses and decorative Button spinner inspected in AX; sizes atseed5 are25/31.25/37.5px. Axe on visibleprimitivecomposition zero violations. OS reduced-motion emulation unavailable in registered Chrome tool; explicit policy remains independently testable and is not OS proof. Counter text was isolated LTR so+3 stays correctly ordered within RTLgroup. Remaining navigationAvatar regression, cached/fastreplacement, publichooks across all visualparts and full final build afterpartbindings are tracked; no full component claim.

Navigation regression Chrome63: expandedTeam firsthover backgroundrgb76,29,149/bordertransparent equals returnedhover after actualclick→Escape→pointeraway→return. Collapsed screenshot reviewed, toggle aligns avatar, publicAvatar fallback remains gridcenter; all rail icon centers inspected. Existing navigation paint/interaction owner preserved. Expanded semantic test skipped a retained hidden account-popup Avatar whose computed style was empty; visible header/footer avatars both center.

## Reconciled execution status — 2026-10-04

Implementation and documentation for this workstream are delivered. The scenario table above supersedes earlier prospective statements below/above that say implementation or final checks are pending. Required unavailable browser/runtime evidence remains explicitly blocked; no full conformance claim is made. See [final verification results](../verification-results.md) for shared fixes, commands, package evidence and tool boundaries.

## Reopened by user review — 2026-10-04

Fresh direct MCP head8440bff/state5daad632, ucl22-skeleton/bubble/aspect-ratio re-read. Earlier default-story and visual passes do not resolve the newly reported missing use cases. Source/design repair: preserve TpSkeleton ambient motion and shared recipes; make inherited host radius reach the painted placeholder; publish the five Base/Nova skeleton-example compositions (avatar, card, text, form, table) using actual Skeleton and Card, with dimensions proportional to theme spacing. Replace the Aspect Ratio example image with a solid semantic theme color. Bubble requires grouped bodies, interactive body delegates, rich attachments and actual reaction controls, traced to bubble-example.tsx; preserve the shared Button/Collapsible/Attachment owners. Docs examples are composed content, not new variants. Acceptance: inspect actual Docs and source, shape/motion geometry, keyboard reaction/body behavior, scoped tokens.

Aspect Ratio corrective source map: base/examples/aspect-ratio-example.tsx explicitly publishes16:9,21:9,1:1,9:16. All four now mapped to Docs-only examples, plus responsive container sizing requested by the user. Host-authored radius passes into existing root geometry; no new property, component token or behavior owner. Verify all actual rendered ratios, responsive widths, theme colors and no images before moving on.

## Library-wide use-case reconciliation — 2026-10-04

The scope remains all catalog controls. Fresh direct Foundation/Library reads retain head 8440bff24a97dbbc5c762ebf4bd6baa958b305e1 and state 5daad6324d67f008ae378650a86e7e961fc91a1025d6107c89be7002caecdfe1. Current source review covers base/examples/{avatar,empty,spinner}-example.tsx, base/ui/{avatar,empty,spinner}.tsx, Nova avatar selectors 74–95 and empty selectors 586–616. Existing C-06..09, C-16..18, C-21..22 govern this corrective work.

Design addition: publish reference use cases inside Docs through the common authored-markup renderer. Spinner composes the existing Button loading owner, Badge, Field/InputGroup and EmptyState. EmptyState composes actual Button/InputGroup/Input/KeyHint/Icon/Card; source backgrounds/borders use existing public part hooks and semantic theme variables, never spacing attributes. Avatar composes existing Avatar/Group/Icon; its status marker is the AvatarBadge constituent (a dot/icon enclosure upstream), not a full pill Badge. The missing avatar-badge recipe must supply source-backed primary/primary-foreground paint, ring, radius and proportional small/default/large sizing; retain existing Avatar viewport sizes for navigation compatibility. Group icon count uses the existing count part contract and retains the required omitted-count accessible text. No new token or public option is needed.

Verification additions to V-03/V-07/V-10: actual Docs sizes, optional status/icon/group/count, InputGroup spinner, Badge spinner and EmptyState regions in light/dark. Current earlier documentation and badge conformance claims are reopened; complete coverage remains pending until rendered evidence and source reconciliation are recorded.


Current corrective integration and shared-regression evidence: [library-wide use-case review](../use-case-review-2026-10-04.md). Parent scope remains active; this record does not certify unreconciled source cases.

## Shared Docs explorer correction — 2026-10-04

User reports the new usage examples replaced the existing code explorer with a native details/Source block. Reopen C-13/V-05 documentation integration. Installed Storybook10.6 blocks.js CanvasImpl owns Preview's source toggle, copy action and accessible source relationships; its supported MDX Story override accepts a custom composition renderer. Reuse Canvas and scope MDXProvider's Story override to each example; retain the existing Lit mount/cleanup. Remove duplicate preview border/padding and details/source UI. No runtime-library component or public API changes. Examples remain Docs-only, without variant exports. Verify OTP plus another family: actual Show/Hide code and source identity, copy action, editor value persistence through explorer toggling, matching default explorer markup. Use Canvas layout=padded; no duplicate local toolbar or spacing owner.

Explorer early integration: Chrome76 OTP Docs now has one real Storybook Canvas per usage case; no native details element. Actual typing123456, Show code, Copy code and Hide code inspected; Canvas renders the correct example source and the same OTP instance retains its value. Screenshot shows the common dark source area and Show/Hide plus Copy actions. Existing canonical Primary remains unchanged. Shared fix covers every family using docs.examples.
