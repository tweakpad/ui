# Drag Drop verification, 2026-10-04

Implementation covers the requested Foundation and List surface. This is **not an all-gates conformance claim**: the required real pointer-cancellation, visual-viewport zoom and OS reduced-motion checks remain blocked by the registered Chrome tool surface. See the precise boundary below. All feasible checks recorded here were executed; no device input is inferred from synthetic events.

## Sources and execution

- dnd-kit: `e522d9c6a3cbe39e6e980ee3b6fd7a78f238ab94`; shadcn: `63c1308d112b6b1205d86244a156cca1abef5087`. Neither reference was modified.
- Direct Spec Blocks validation: candidate `0ce91b33497d6ca9599bdb63e5b070f3fceccd9680152723182b75bee83f5fa3`, zero diagnostics, `canCommit=true`. Existing candidate work was preserved; no spec commit.
- Library began at `f467998`. The checkout advanced externally to `d2e64e5` and `710cb0a` during implementation. Those commits were preserved; this agent did not create them.
- Chrome DevTools MCP only. Source fixture: `http://localhost:5173/tests/fixtures/components/drag-drop-list/`; built fixture adds `?package`. Storybook Docs: `http://localhost:6006/?path=/docs/components-drag-drop-list--docs`.
- Local raw output and screenshots: `tmp/component-verification/drag-drop-list/2026-10-04/`. These artifacts are local, not uploaded or available automatically on another machine.

## Automated and imperative evidence

`npm test`: **64 files, 466 tests passed**. Includes all 60 helper-source cases plus invalid-index hardening; registry, manager, configuration, geometry, detector, modifier, activation, sortable guards/transitions and shared Store/Cleanup/Motion/ControllableState coverage. `npx tsc -p tsconfig.build.json --noEmit`, `npm run lint:ts`, `npm run lint:css`, `npm run build`, and `npm run build-storybook` passed. `git diff --check` passed.

`npm run format:check` remains red for two unchanged, pre-existing files: `src/components/field/field.ts` and `src/stories/message-scroller.examples.ts`. No unrelated formatting changes were made. Therefore the aggregate `npm run lint` is not claimed green.

The durable `tests/fixtures/components/drag-drop-list/contract-checks.js` was invoked through MCP. All **20 groups passed**, with individual assertions and scenario tags in the file:

1. Typed identities, first-registration ownership, atomic rekey permutations and retained source ID.
2. Invalid start and active-operation preservation, start/over ordering, veto, movement flags and stale render generations.
3. Terminal races, one suspension/first decision and rejected animation cleanup.
4. Resolver assignment order, constituent refs, split disabling, external replacement and manager lifetime.
5. Stationary geometry/acceptance/disabled invalidation, collision notifications and observer cleanup.
6. Four feedback modes, 3–5 px pickup points, transforms, same-origin scaled iframe and cross-document restoration.
7. Native clone values, radio/file/canvas/SVG IDs, contained/shared proxies, authored writes, ref-counted styles and portal reparenting.
8. Standalone optimistic DOM movement and sparse-index cancellation rollback.
9. Controlled fresh-object acknowledgments, coherent two-lane publication, over veto, unrelated disconnect and stale external replacement.
10. Negative ancestor scale, fractional table cells, sibling insertion, owned styles and accepted reduced-policy drop.
11. Inner/outer scrolling, boundary continuation, live zero thresholds, no trailing scroll and keyboard reveal.
12. Announcements, owned description tokens, nonce/style policy, independent managers and late callback replacement.
13. **Synthetic** pointer paths with explicitly mocked capture: right/nonprimary/nested input, multiple activators, second pointer, final-frame flush, one post-drag click, 250 ms touch and 200 ms ordinary/text-input delays, strict distance, destroy while pending, cancel/lost-capture/capture throw. This is not native device-cancellation evidence.
14. Live feedback-root replacement and standalone idle transition through shared motion ownership.
15. Custom activation callback failure, release and subsequent gesture; live source modifier replacement/disposal.
16. Actual running CSS translate transition, resting measurement and selective cancellation retaining opacity; stale standalone membership while renderer waits.
17. Mixed controlled/uncontrolled missing acknowledgment, incompatible owner result, veto, successful atomic transfer, duplicate destination and read-only invalidation during suspension.
18. Live frame scale change, negative-scale auto-scroll and reverse pointer intent, terminal interval cleanup.
19. Source removal during custom drop animation and latest announcement callback.
20. RTL feedback portal ancestry, scoped tokens, owned row styles, public keyboard-feedback motion owner and inherited reduced-policy completion.

These groups are deterministic API/DOM tests, not substitutes for the real-input evidence below. Final raw results are in `dom-contract-checks.txt`.

## Real Chrome input

- Tool `drag` moved Research toward Review. The final tool-owned sample landed over Design after layout projection, producing `[b,a,c]`, one change and one commit, then idle and no portal. The final sample, not the first move, determined the result.
- Space/ArrowDown produced preview `[b,a,c]` while committed `[a,b,c]` remained unchanged. Escape restored order and native source-handle focus.
- Space/ArrowRight/Enter transferred into the empty connected Ready list. Both lanes committed and the remounted source handle received focus.
- The same sequence in the **controlled Docs example** kept both committed arrays unchanged during preview and published `[design,review]` / `[research]` atomically. Disabled and acceptance-rejected destinations did not project; Escape retained both owner arrays.
- Space/Tab and Space/Shift+Tab settled without delayed source-focus restoration. Forward traversal reached the next public action; backward traversal left the first handle normally.
- Horizontal RTL ArrowLeft previewed `[Second,First,Third]` and dropped through Enter.
- A Foundation keyboard source configured with `KeyW`/`Digit1`, offsets `{x:3,y:7}` received real `w`, Shift+ArrowRight, ArrowDown and `1`: displacement `{x:15,y:7}`, idle and restored source focus.
- Removing the active item through a controlled replacement canceled the operation and focused the next native handle, “Move Two”.
- The Docs rich example's real Open action worked independently and left the drag manager idle. Storybook orientation Controls changed the actual reflected property and flex direction.
- After feedback was made inert/hidden during projection, real Space/ArrowDown/Enter still committed `[b,a,c]`, returned to idle, cleared inert, and focused “Move Research”.

## Accessibility, presentation and motion

Accessibility-tree inspection separately confirmed ordered-list/list-item anatomy, native named handle buttons, configured instructions, polite atomic announcements, no false pressed/grabbed semantics, and meaningful empty destinations. No screen-reader test is claimed.

Local axe-core was injected only through MCP. Final light baseline: zero violations, 31 passes. Active keyboard drag: zero violations, 32 passes. Settled dark/narrow layout: zero violations, 32 passes. A transient theme-change contrast result disappeared after theme styles settled; no rule was disabled. An actual active-drag list-item/landmark failure was fixed by making the moving projection inert and aria-hidden, then rerun successfully.

Inspected screenshots: `light-desktop.png`, `dark-narrow.png`, `rtl-custom-preview.png` (1280×900 light desktop; 390×844 dark narrow). The last replaces the earlier exploratory `rtl-lg-reduced-preview.png`; supported density names are **xs, sm, default**. Shared row, Button/Icon and Empty State recipes remain intact. Long labels wrap at narrow widths, empty/read-only presentation remains legible, horizontal RTL has no document overflow, and the active RTL row retains right-aligned content without a stray list bullet. The portal now captures tokens and direction before projecting its owner, preserves logical ancestry, and restores its styles without leaving an `inset` shorthand.

Public customization checks: `--tp-space-2:17px` produced a 17 px list gap; item `partPresentation` class/opacity applied while native handle identity and focus persisted. A replacement presentation dictionary applied a 19 px gap and a distinct `rgb(30,60,90)` surface without changing flex structure or committed values; restoring the dictionary worked. RTL + token override + `motionPolicy=reduce` was checked together. Reduced policy applies through the public list motion owner even while feedback is outside its shadow root. Actual CSS geometry transitions are measured at rest and canceled selectively; unrelated opacity remains running. Custom drop rejection/removal and null/partial transitions release all feedback.

## Docs, reuse, regressions and package

One canonical base story plus five distinct composed examples: connected empty target, controlled owner, rich actions/badges/overlay, item activation with vertical constraint, and deferred accept/reject. Rendered and copyable code share `drag-drop-list-example.js`. Real List Item, Button, Icon, Empty State and Badge are reused. Native form/canvas/SVG nodes in tests deliberately exercise interoperability. Exhaustive fixtures are outside Storybook discovery. Complete API reference: `docs/drag-drop.md`.

Shared regressions: real Number Field scrub changed 3→20 with one change and commit, then restored selection/cursor styles. After the final portal repair, Dialog, Alert Dialog, Popover and Tooltip each opened visibly and closed fully in `select/surface-regressions.html`. Shared unit suites passed with the new cleanup, store, motion, style and portal behavior.

Built package: root registration defines `tp-drag-drop-list`; `@tweakpad/ui/drag-drop` exports manager/entities/sensors/custom activation/helpers. Built fixture transfer returned accepted, `[b,c]` / `[a]`, registry IDs `[b,c,a]`. Node imported and constructed/destroyed Foundation entities while `window`, `document`, `ResizeObserver` were undefined. `npm pack --dry-run` includes `dist/drag-drop.js`, declarations, registration and `dist/LICENSE.dnd-kit`. Static built-graph inspection found no dnd-kit/React/Swiper runtime imports; Lit remains the sole runtime dependency.

## Required checks still blocked

- **V-23:** Native pointercancel/lost-capture from a real device/gesture. The tool exposes complete drag actions, not individual pointer down/cancel/release steps. Synthetic cancellation and mocked capture failure pass; Android/device behavior is not certified.
- **V-42:** Actual visual-viewport pinch zoom. Available viewport/device emulation and attempted viewport-meta changes left `visualViewport.scale=1`. Frame scaling, viewport-size changes and 3–5 px pickup checks pass with measured initial/movement drift under 1 px (reference tolerances 10 px initial/5 px movement). Scale 1 is not represented as pinch-zoom evidence.
- **V-62:** OS `prefers-reduced-motion` media emulation. The registered `emulate` schema has color scheme, viewport, CPU/network, location and user agent, but no reduced-motion feature. Explicit inherited `motionPolicy=reduce` passes; it is not an OS-media test. Forced-colors inspection is also unavailable and unclaimed.

The skill explicitly says, “If a required input, media feature, browser condition, or tool cannot be exercised, record a blocked scenario.” These are tool limitations, not approvals or omitted implementation work. Gates 3/6/8 and the complete-record boundary therefore remain blocked. The request to move on to `carousel.md` is preserved without converting these gaps into passes.
