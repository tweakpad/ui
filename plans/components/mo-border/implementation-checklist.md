# Border implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Border, `<tp-mo-border>`, Motion › Surface (`docs/motion/surface/border.mdx`, story `Motion/Surface/Border`)
- Requested work / claim: complete component; a new Motion group (Surface) with one element that replaces a wrapped surface's border with a glow (tracked light, travelling lights) and dashes (march, breathe, draw)
- Scope source: user, 2026-10-30: "a new component … called tp-mo-border … 1. Glow border, 2. dash length animation … tracking 2d point … one ring loop or 2 ring loop animation … configurable with timing and spacing"; answers: Motion › Surface, combinable effect tokens, all three dash motions, pointer within a reach distance, ring loop = lights travelling the border; approved plan `~/.claude/plans/we-need-to-plan-lovely-bonbon.md`
- In-scope changes and existing gaps: new element, `pointer-position` foundation service, `surfaceMember` boundary lookup (Card and light-tree editors), Motion › Surface group wiring (catalog, docs folders, Storybook order, package files, docs checkers, website), docs page, story, fixture, spec definition
- Repository baseline / unrelated changes: `a79c7d7` on `development`, clean at start; nothing staged or committed
- Live project / document IDs and revisions: UI Library `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, Component Library `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`; read at `174f8e8d` (0.47.10); Border § 21.20 committed as `c4894a1a` (0.47.11), version bump `34288886` (0.48.0)
- Owning contracts / dependencies / vocabulary: CL Border (`mbd-*`), Foundation §18.18 viewport reveal (`sec-1818-viewport-reveal`), CL §15.8 motion roles (rows `tbl-cl-158-mo-border-loop`, `tbl-cl-158-mo-border-reveal`), CL Scroll trigger members (`stl-basis`)
- Local reference evidence: none; the effect has no reference counterpart under `../specification/external/`. The user's pasted snippet was a visual reference only; no code, names, structure or colors were taken from it
- Tool readiness: Chrome DevTools MCP and direct Spec Blocks MCP tools available
- Browser / server / build under test: Chrome via DevTools MCP; library Vite server on :5199 (source)
- Evidence directory: `tmp/component-verification/mo-border/2026-10-30/`
- Durable verification fixtures / served URLs: `tests/fixtures/components/mo-border/index.html` (README steps)
- Evidence availability to the next agent: local only

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------ | -------------- |
| C-01 | Surface lookup: boundary part of Button, Input, Text area, Select trigger, Native select, Input group, Toggle, Card, a composite's group boundary; a plain child itself; own box without a child | CL `mbd-surface` | none | `BorderSurface.resolve`, `surfaceMember` (`shared/group-members.ts`) | Usage | V-01 | passed | fixture geometry for every case |
| C-02 | Surface border color hidden through part composition, width kept, released on removal | CL `mbd-surface` | none | `setPartComposition` style hook; inline style for plain children | Usage | V-01, V-02 | passed | V-01, V-02 |
| C-03 | Ring over the border box: per-corner (elliptical) radii, border width, follows resizes and direction; no layout, hit testing or accessibility tree | CL `mbd-surface` | none | `ringPath`, `observeResize`, `scheduleLayoutPass`, inline-start offset, `pointer-events: none`, `aria-hidden` | Usage | V-01, V-03, V-10, V-12 | passed | V-01, V-03, V-10, V-12 |
| C-04 | `effect`: `glow` (default) or `dash`, never combined (user, 2026-10-30: "dashed + glow is not something we want") | CL `mbd-props` | none | `effect` property, `#effect`, `data-effect` | Usage, Dashes | V-06 | passed | V-06: `glow dash` reads as glow; dashed cards render no glow layer |
| C-05 | Tracked light (`trigger="pointer"`): `trackPoint` > `track-target` > mouse or pen pointer (never touch); full strength to 30% of `track-reach` (160), smooth fall to nothing; core within half the reach | CL `mbx-glow` (0.49.0) | none | `light-field.ts` pointer source, `#light`, `#trackChanged` | Usage, Light sources | V-04, V-17 | passed | V-04 (round 3 rerun), V-17 touch |
| C-06 | One document pointer listener; out-of-reach borders do no per-frame work; spring follow, snap under reduced motion | CL `mbd-glow` | none | `observePointerPosition`, `SpringFollower2D`, `frameLoopFor` | Usage | V-04, V-11 | passed | unit tests (5) and V-11 |
| C-07 | Comets: `lights` (2), `light-spacing` (even), `rotation`, `--tp-mo-border-light-length` (0.22, clamped below the gap), continuous and exactly spaced at every moment; lap `--tp-mo-border-loop-duration`, `-loop-delay` (faded out), `-loop-easing` | CL `mbx-glow` | none | `cometHeads`, `cometTail`, one lap clock per instance (`#sources`) | Comets | V-05 | passed | V-05 round 3 |
| C-08 | Dashes fitted to a whole number of periods; `march`, `breathe`, `--tp-mo-border-dash/gap/dash-to`, durations | CL `mbd-dash` | none | `fitDashPattern`, `tp-mo-border-march/breathe` | Dashes | V-06 | passed | dasharray and offsets sampled |
| C-09 | `motion="draw"`: a reveal with `trigger="always"`, drawn while hovered or focused with `hover`/`focus`, drawn with `none`; `reveal-repeat`, `reveal-hold` draws out; scrubbed by a Scroll trigger; events | CL `mbx-dash`, `mbd-api`, Foundation §18.18 | none | `RevealPlayback`, `StandaloneReveal`, `RevealMembership`, registered `--_tp-mo-border-drawn`, `data-trigger` draw states | Drawing the border in | V-07, V-08, V-19 | passed | draw, hold, release, scrub both ways; hover draw V-19 |
| C-10 | `trigger` (`none`, `always`, `hover`, `focus`, `pointer`; unset `pointer` for glow, `always` for dash) replaces `play`, `track`, `draw-trigger` (user, 2026-10-30) | CL `mbx-props`, `mbx-dash` | none | `#trigger`, `#on`, `data-trigger`, hover/focus listeners, CSS `--_play` and draw states | Hover and focus, Dashes | V-16, V-19 | passed | V-16, V-19 |
| C-11 | Reduced motion: comets and glint rest hidden, sweep still, pulse full, fades instant, dashes still, draw at once; a claimed loop driver stops the glow's own motion | CL `mbx-motion` | none | `#held()`, `Fade.snap`, container style query, `data-tp-motion-driven` | Usage | V-09, V-20 | passed | V-09, V-20 |
| C-12 | `revealed`, `refresh()` | CL `mbd-api` | none | getter, method | API Reference | V-07 | passed | revealed read in fixture |
| C-13 | Presentation: line from `--tp-border`; glow from `--tp-mo-border-glow-colors` (default sky, violet, pink chart colors, OKLCH blend), core `light-dark(transparent, #fff)`, angle 315deg; parts `mo-border`, `-ring`, `-line`, `-glow`, `-bloom` | CL `mbx-presentation` | none | `palette.ts`, `glow-renderer.ts`, `moBorderStyles`, `moBorderPresentation` | Colors | V-12, V-14 | passed | V-12, V-14 round 3 |
| C-15 | Canvas glow: per-point color by angle, white-hot core near the light, width swell, blurred bloom, comet head glow, wash; replaces the CSS-image gradient (user, 2026-10-30: "not a single color", "towards a white at the origin") | CL `mbx-glow` | none | `ring-samples.ts`, `light-field.ts`, `glow-renderer.ts` on `CanvasSurface` (+ `paint()`) | Usage, Colors | V-14 | passed | V-14 |
| C-16 | Fade: `--tp-mo-border-fade-duration` (normal), `-fade-easing` (standard), `-fade-out-delay` (fast) only on fading out; coming back cancels the delay; reversal continues from the current value; the light holds its last lit point during the delay | CL `mbx-fade` | none | `fade.ts`, `#triggerChanged`, `#light` | Fading | V-18 | passed | unit tests and V-18 |
| C-17 | Glow motions `sweep` (turns the colors), `pulse` (breathes), `glint` (diagonal band in the first 45% of each lap), combinable | CL `mbx-glow` | none | `light-field.ts` sweep/pulse/glint, `#sources` | Sweep, pulse and glint | V-15 | passed | V-15 |
| C-14 | Host display: block, or inline block around an inline child, without layout shift | CL `mbd-surface` | none | `data-tp-inline` from the child's display | Usage | V-03 | passed | no positions changed, no layout shifts |
| C-18 | Defaults follow `motion`: unset `effect` is `dash` for only dash motions; unset `trigger` is `always` for dashes and named glow motions, `pointer` otherwise; motions of the other effect are reported (`mo-border-motion-ignored`) (user, 2026-10-30: "motion for breathe, march, draw and other dont seem to work") | CL `mbx-props` (0.49.1, `1df7c6da`) | none | `#effect`, `#trigger`, `willUpdate` diagnostic | Sweep, pulse and glint; Dashes | V-21 | passed | V-21 |
| C-19 | Segments: `tp-mo-border-segment` children (`draw` states `start end` in % or px, wrapping; `leave`; `duration`/`delay`/`easing` through a timing probe; `repeat`, `alternate`; `glow`; `origin`), `effect="segments"` inferred from children, `trigger` hover by default, `always` waits for the view, reverse or leave on off, `segments` role, reduced motion and a claimed driver jump, timing re-read at each trigger change, plain lines in `--tp-mo-border-segment-color` (primary), glowing spans in the glow colors (user, 2026-10-30: segments by percentages, glowing or not) | CL `mbx-segments`, `mbx-motion` (0.50.0, `52eee191`, `06436ecb`) | none | `segment-timeline.ts`, `segments.ts`, `mo-border-segment.ts`, `light-field.ts` spans, `#stepSegments`, `#segmentsChanged` | Segments | V-22, V-23 | passed | unit tests and V-22, V-23 |
| C-20 | Stylized Colors (warm plan Card, one-color prompt) and Scroll scrubbing (three stop Cards drawn in turn in the preview's own scrolling viewport) examples (user, 2026-10-30: "use more stylized examples") | docs skill | none | `docs/motion/surface/border.mdx` | Colors, Scroll scrubbing | V-24 | passed | V-24 |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| G-01 | The Component Library had no Border or Motion › Surface definition | spec, docs | Add CL § 21.20 Border, motion role rows, Scroll trigger membership | Committed `c4894a1a`, bumped 0.48.0 in `34288886` | passed |
| G-02 | The planned `direction` attribute collides with `TpElement.direction` (text direction) | API, spec | Rename to `rotation` (`cw`, `ccw`) before the commit | Spec rows `mbd-props-r9c0`, `mbd-glow-15` corrected in the same commit | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/components/mo-border/` — `mo-border.ts` (element, light source, loops, reveal), `surface.ts` (surface lookup, border hiding, measurement), `ring-path.ts` (perimeter path, radii fitting, dash fitting), `styles.ts`; `src/foundation/pointer-position.ts` (shared document pointer position); presentation family `src/presentation/families/mo-border.ts`
- Supported exports / registration / constituent API impact: exported from `@tweakpad/ui`, defined by `@tweakpad/ui/register`; `surfaceMember` added beside `groupMember` without changing joined-group membership
- Public vocabulary / tokens / parts / presentation review: `--tp-mo-border-*` follows the Motion `--tp-mo-<name>-*` convention; private geometry as `--_tp-mo-border-*`; durations default to `--tp-duration-*` and the ambient placeholder period; colors default to `--tp-border` and `--tp-ring`. The tag `tp-mo-border` was named by the user (not `tp-mo-surface-border`)

### Family dependency map

| Responsibility | Reference dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ---------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Boundary part of a wrapped control | none (Tweakpad-only composition) | `groupMember` (`src/components/shared/group-members.ts`) used by joined groups | Reused; `surfaceMember` extends it with Card and light-tree editors without changing `groupMember`, so joined groups keep their members | Border, Button group, Input group; V-01, V-13 |
| Hiding a child's paint from a parent | none | `setPartComposition` (`src/presentation/controller.ts`), used by joined groups, Tooltip, Button group | Reused as is: a style hook `border-color: transparent` on the boundary part, released on change | Border; V-01, V-02 |
| Draw reveal, entry, coordination, scrub | Foundation §18.18 | `RevealPlayback`, `StandaloneReveal`, `RevealMembership` (as wired by `tp-image`) | Reused; the member offers `duration()`/`scrub()` from the draw keyframes | Border, Image, Text elements; V-07, V-08 |
| Ambient loops and drivers | CL §15.8 | `ambientRole`, `prepareMotion`, `ambientPeriod` | Reused; role `loop` on the host, `data-tp-motion-driven` turns the CSS off | Border; V-09 |
| Pointer position | none | `CursorDocument` (`src/components/cursor/cursor-document.ts`) | Not reused: it is component-private and bundles zones, presses, capability gating and top-layer raising; the position alone is a new foundation service `observePointerPosition` (one listener set per document, frame-coalesced). Cursor keeps its tracker because its pointer handling is inseparable from zone hit testing | Border; V-04, V-11 |
| Spring follow and frames | Foundation `cc-follower` | `SpringFollower2D`, `frameLoopFor` | Reused | Border, Cursor; V-04 |
| Batched layout | Foundation §12.3 | `scheduleLayoutPass` | Reused for geometry and light measurement | Border; V-11 |
| Registered animatable numbers | none | `registerProperty` (Drawer) | Reused for `--_tp-mo-border-phase`, `--_tp-mo-border-drawn` and the read lengths | Border; V-05, V-07 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | ------------------------------- | ------------ |
| host `mo-border` | none (paints no surface) | none | `moBorderPresentation` | block or inline block, `position: relative` | V-03 |
| ring `mo-border-ring` | none | none | `moBorderStyles` | SVG over the measured border box, `overflow: visible`, `aria-hidden` | V-01 |
| line `mo-border-line` | theme border role | surface border recipes (`core/card.ts`, `shared/text-control.ts`, `core/button.ts`) | `--tp-border`, `--tp-border-width` | drawn at the surface's own width and radii | V-01, V-12 |
| glow `mo-border-glow`, light `mo-border-light` | theme ring role | none (original effect) | `--tp-ring` | radial gradient by distance; blur bloom | V-04, V-05 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Docs, story, fixture | Surfaces | `tp-card`, `tp-button`, `tp-input`, `tp-text-area`, `tp-select`, `tp-native-select`, `tp-input-group`, `tp-toggle` | V-01 | fixture `div.plain`: deliberate plain-element interoperability case |
| Fixture draw case | Toggle button | `tp-button` | V-07 | none |
| Fixture scrub case, docs scrub | Scroll coordinator | `tp-scroll-trigger` scrub | V-08 | none |
| Fixture light source | Moving dot | native `span.beacon` | V-04 | a test target, not a UI role |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| ---- | ---------------------------------- | --------------- | --------------- | ------------- | ------------------------- | ------ | ------------------- |
| V-01 | C-01, C-02, C-03; behavior | fixture `geometry(id)` for every surface case | ring box equals surface border box; radii follow; surface border transparent at its width | equal for Card, Buttons xs–lg, Toggle, Native select, Input, invalid Input, Text area, Select, Input group, plain (12px 4px radii, 2px), own box; after fixing light-tree editor lookup | DevTools evaluate | passed | first run measured the Input host; fixed in `surfaceMember` |
| V-02 | C-02; behavior | remove a border wrapper, unwrap the child | child's own border returns | Input `transparent` → `rgb(63, 63, 70)`; Card `transparent` → `rgb(63, 63, 70)` | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-03 | C-03, C-14; layout | positions before and after defining the border (other elements defined first) | no movement, no layout shifts | `diffs: []`, `borderShifts: []` | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-04 | C-05, C-06; behavior and visual | hover the glow card heading; fixed `trackPoint`; moving `track-target` | lit edge nearest the source; unlit beyond reach | glow card lit at the pointer (cx 478, cy 47); point and target cards lit at the right edges | DevTools hover, evaluate, screenshot | passed | Observed values recorded in Actual result |
| V-05 | C-07; behavior and visual | `peaks()` of 2 and 3 comets and a ccw comet every 60 ms for 2.4 s; total lit along the line | always 2 and 3 peaks, spaced exactly; constant lit total through the start corner; continuous ccw | first rounds: lights hid at the top-left and drifted together (pattern longer than the path); round 3: counts constant, spacing 0.497–0.500 and 0.330–0.337, lit total ±1%, ccw trace 0.025 → 0.967 smooth; pause case dark 0.7 s per lap | DevTools evaluate, screenshots | passed | Fixed by the shared lap clock and canvas comets |
| V-06 | C-04, C-08; behavior | breathe and march-and-breathe dash cases | dasharray alternates; both animations on the line; dashed cards have no glow | dasharray 3.35 → 2.05 px over 1.2 s; `march`, `breathe` on the line; `data-effect=dash`, no glow layer | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-07 | C-09, C-12; behavior | scroll the draw case in; hold; release | drawn 0 → 1; hold draws out; events in order | 0.46, 0.83 … 1; hold 0.54 … 0; reveal-change/complete true, false, true | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-08 | C-09; behavior | scroll the scrub case through and back | draw follows scroll both ways | 0, 0.61, 0.83, 0.93, 0.98, back 0.83, 0.35 | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-09 | C-11; behavior | emulate reduced motion; claimed loop and reveal drivers | lights hidden, dashes still, draw complete with events; a driver removes the role's CSS motion | first run: dashes kept animating (specificity); after fix 0 animations, lights `display: none`, drawn 1 with both events; loop claim: `data-tp-motion-driven="loop"`, 0 light animations; reveal claim (init script): `reveal`, draw transition `none`, both events | DevTools emulate, evaluate | passed | Fixed in `styles.ts` |
| V-10 | C-03; accessibility | accessibility tree; keyboard focus; axe | surfaces unchanged; ring hidden; focus ring kept | snapshot lists only the surfaces' own roles and names; clicking the Input focuses it with its 2px ring outline while its border stays hidden; axe-core (page-injected) 0 violations | DevTools snapshot, click, evaluate | passed | Screen reader not tested |
| V-11 | C-06; performance | 20 sweeping and 20 comet borders on stage; frame work from rAF to post-render message, 60 frames | small per-border cost | median frame work 1.4 ms idle, 2.2 ms with 20 sweeps, 2.0 ms with 20 comets (≈0.04 ms per border) | DevTools evaluate | passed | Measured; no trace |
| V-12 | C-13; visual | light and dark themes, RTL, 400px (body margin 0), custom case | theme roles; custom width, color, spread, wash; rings stay on surfaces | dark and light screenshots; wash showed while unlit (fixed); after an RTL flip the Select ring stayed behind (fixed by placing the ring by inline-start offset); all rings aligned at 400px and through RTL flips, no shifts | DevTools screenshot, emulate, evaluate | passed | Fixed in `styles.ts`, `surface.ts` |
| V-14 | C-13, C-15; visual | stage of comets, sweep, pulse, glint and pointer at large size, dark and light schemes; reference image beside | white-hot core near the light in dark; the list's colors along the line; bloom; wash; vivid in light | round 3 passes: bloom canvas kept its transform (stale haze, fixed); first tuning too faint (plateau, swell, bloom raised); content-role colors muddy in light (chart colors); OKLab gray between sky and amber (OKLCH), then rainbow (default reduced to sky, violet, pink); final screenshots in both schemes | DevTools screenshot, evaluate | passed | Fixed in `glow-renderer.ts`, `light-field.ts`, `palette.ts`, `styles.ts` |
| V-13 | C-01; regression | joined Button group in the fixture page; Input group surface | joined radii and widths unchanged | members `10px 0`, `0 0`, `0 10px`, widths 1/0/0 before and after wrapping; Input group ring matches | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-15 | C-17; visual | sweep, pulse, glint (20 s lap to catch the pass), sweep pulse; glint lit-run series over a 4 s lap | colors turn; glow breathes; band crosses then rests | glint lit 0–1.8 s, dark to 4 s, repeats; screenshots of all in both schemes | DevTools evaluate, screenshot | passed | Observed values recorded in Actual result |
| V-16 | C-10; behavior (real input) | hover the hover card; click the focus field then blur; `none` card | hover lights then fades on leave; focus lights then fades on blur; none dark | 11485 lit while hovered, 0 after; 54569 focused, 0 after blur; none 0 | DevTools hover, click, evaluate | passed | Observed values recorded in Actual result |
| V-17 | C-05; behavior | synthetic touch then pen `pointermove` near the glow card | touch leaves it unlit; pen lights it | touch 0, pen 6768 | DevTools evaluate | passed | Synthetic events check the type filter only; real hover is V-04 |
| V-18 | C-16; behavior | slow-fade card (600 ms delay, 500 ms ease-out): light leaves; then returns inside the delay | holds for the delay, eases out; return never dims | 100% to 586 ms, then 70, 40, 16, 2, 0 by 1.1 s; return 100% throughout; rerun after the probe change | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-19 | C-10; behavior | dashes in view with default trigger, `trigger="none"`, hover draw | march and breathe run; none still; hover draws to 1 | running, running, paused; drawn 1 while hovered | DevTools evaluate, hover | passed | Observed values recorded in Actual result |
| V-20 | C-11; behavior | claimed loop driver on a comet border | glow motion off, marker set | lit 11290 → 0, `data-tp-motion-driven="loop"` | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-21 | C-18, C-09; behavior | Storybook Default story driven through `updateStoryArgs`: each glow motion, each dash motion, draw, then `trigger="hover"`, then `effect="glow"` with `march` | every motion visible; draw animates; hover draw undrawn at rest; mismatch reported | before the fix: glow motions dark (trigger stayed pointer), dash motions dark (effect stayed glow), draw jumped to drawn and stayed drawn on hover; after: glow lit for comets, sweep, pulse, glint; march, breathe, both running; draw 0.55 → 1.00 over 450 ms; hover draw 0.00; diagnostic `mo-border-motion-ignored` | DevTools evaluate on the Storybook dev server, screenshot | passed | Fixed in `mo-border.ts` (defaults, reveal reset, mask style flush) |
| V-22 | C-19; behavior | fixture `#case-segments`: real hover on the button; synthetic enter/leave; wrap, glowing exit, scanner, focus, invalid, round cap | pieces run forward and meet, the second 60 ms later; leaving mid-run plays back; wrap lit across the start; exit runs forward then rests; scanner loops; focus draws and blur returns; diagnostic; no dot | per-frame lengths 0.026/– at 16 ms → 0.500/0.500 at 516 ms; mid-run reverse continues; glow lit 0–60 px down each side of the Night ferry card (quarter perimeter 297); scanner loops; focus full then rest; `mo-border-segment-invalid`; hidden at zero | DevTools evaluate, hover, screenshot | passed | Observed values recorded in Actual result |
| V-23 | C-19; behavior | reduced motion switched on the live page; then off; a listener claiming `segments` | jump to the end on hover and to rest on leave; animate again after; requests `rest → active`, `active → rest` with `count` 2, pieces jump | before the fix: end state never shown (duration 0 returned the first state) and timing read once at load kept 0 after the preference changed; after: `0.500 0.500` / `- -` under reduce, `0.237 0.140` at 150 ms after; driver requests recorded and pieces jumped | DevTools evaluate | passed | Fixed in `segment-timeline.ts` (duration 0) and `segments.ts` (`retime()` at each trigger change) |
| V-24 | C-20, C-19; visual | static Storybook Docs page, dark and light schemes: Colors hovered, Segments hovered, Scanner, Scroll scrubbing scrolled; axe on the fixture's segments case | stylized, library-native compositions; scrub draws the stops in turn both ways; segment API tables present | warm plan glow amber→white→pink (dark), red→pink (light); one ring-color comet on the prompt (changed from a one-color sweep that read as a static halo); hood of light over the Night ferry card; scrub 0/0/0 → 1/0.83/0 → 1/1/1 and back; segment attribute and custom property tables; axe 0 violations, drawings `aria-hidden`, segments `display: none` | DevTools screenshots, evaluate | passed | Observed values recorded in Actual result |

## Early integration checkpoint

| ID   | Check | Status | Evidence / unresolved finding |
| ---- | ----- | ------ | ----------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | `surface.ts` calls `surfaceMember` → `groupMember` and `setPartComposition`; reveal through `RevealPlayback`/`StandaloneReveal`/`RevealMembership`; light through `SpringFollower2D`, `frameLoopFor`, `scheduleLayoutPass`; no duplicate implementations |
| I-02 | Default visual regions match traced source and shared library recipes | passed | Chrome fixture screenshots: dashed and glowing lines lie on each surface's border at its radius and width; the theme border color and ring color are used |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | effect, dash-motion tokens, lights/spacing/rotation, play, draw-trigger, track sources exercised separately (V-04 to V-08) |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| ---- | ------ | --------------------------------------- |
| 0. Sources and scope | passed | Scope from the user's messages and approved plan; live Component Library read at `174f8e8d`, Border committed `c4894a1a`, 0.48.0 `34288886` |
| 1. Capability mapping | passed | C-01 to C-14, each mapped to scenarios |
| 2. Architecture and composition reuse | passed | Shared owners reused; `surfaceMember` and `observePointerPosition` added with recorded reasons |
| 3. Behavior | passed | V-01 to V-09, V-11, V-13 in Chrome |
| 4. Presentation and customization | passed | V-12 custom properties and themes |
| 5. Accessibility | passed | V-10: accessibility tree, keyboard focus, axe 0 violations; no screen-reader test |
| 6. Visual and interaction inspection | passed | Screenshots in `tmp/component-verification/mo-border/2026-10-30/` and inline: themes, RTL, 400px, lights, glow, dashes |
| 7. Documentation and demo reuse | passed | `check-docs.mjs motion/surface/border` passes; static Storybook Docs page read in Chrome (sections in order, 15 previews with rings, full API with descriptions, no Related, no library chrome); website built against the linked library and read in Chrome (Surface › Border in the navigation, previews running); site restored to its installed 0.1.4 |
| 8. Regression and reconciliation | passed | `vitest` 6159 passed (revision 4); `tsc`; eslint clean; `npm run build`; static Storybook build; fixture rerun on the built package (`?built`). Stylelint and Prettier still fail on committed files outside this work (`avatar.ts`, `field.ts`, `slider/styles.ts`, `text-control.ts`); new files are clean |

## Documentation synchronization

- [x] `docs/motion/surface/border.mdx` follows the tweakpad-docs skill; `check-docs.mjs motion/surface/border` passes; the story renders it with `libraryDocs()`.
- [x] JSDoc covers the element summary, every public field and method, slots, events and CSS properties; parts carry a description in the family; `npm run build` reports no undescribed row.
- [x] `elementDependencies` is complete (none: the element renders no library component).
- [x] Verification fixtures are separate from the page.
- [x] Rendered and copyable previews reuse existing components (Card, Input, Text area, Button, Status dot, Skeleton, Scroll trigger).
- [x] Preview code works outside Storybook (read on the website build).

## Completion / handoff

- Revision 4, 2026-10-30 (user feedback: stylized Colors and Scroll scrubbing examples; custom segment animations for hover, glowing or not): `tp-mo-border-segment`, `effect="segments"`, `segments` role, spans light source; spec `52eee191`, bumped 0.50.0 `06436ecb`; C-19, C-20 and V-22–V-24 added; V-03 rerun (fixture flow probe excludes segments). The Default story keeps no segment children, so its `effect` control does not offer `segments`
- Revision 3, 2026-10-30 (user feedback: better animations, continuous evenly spaced loops, white core, multi-color default, `trigger`, fade easing and out delay): canvas glow, comets/sweep/pulse/glint, `trigger`, `motion`, fade; spec `4e08fbda`, bumped 0.49.0 `85e63163`; C-05, C-07, C-10, C-11, C-13, C-15–C-17 and V-05, V-11, V-14–V-20 rerun or added
- Revision 2026-10-30 (user feedback): glow and dashes made exclusive; the glow became a gradient-painted layer (`--tp-mo-border-glow-gradient`); spec `6712b304` (0.48.1); V-06, V-14 rerun; tests, build, docs checker and static Storybook rerun
- Change summary: new Motion › Surface group with Border (`tp-mo-border`): surface lookup and border replacement, tracked glow, travelling lights, dashes (march, breathe, draw), reveal and scrub; shared `observePointerPosition`; `surfaceMember`; spec § 21.20
- Actual delivery claim: complete component as specified in CL § 21.20 (0.48.0)
- Record checker: `--stage implement`, `verify`, `complete` pass
- Non-browser checks: `vitest` 6122 passed; `tsc --noEmit`; eslint; `npm run build`; `build-storybook`; docs checker
- Behavior: V-01 to V-09, V-11, V-13 passed in Chrome
- Accessibility: tree, keyboard focus and axe (V-10); no screen-reader test
- Visual/customization/motion inspection: V-04, V-05, V-12 screenshots
- Documentation and demo composition reuse: Gate 7
- Shared-consumer regressions / package boundaries: joined groups (V-13); built package (`?built`); website builds against both the installed 0.1.4 (Surface hidden while empty) and the linked library
- Required failures or blocked checks: none
- Older out-of-scope gaps: stylelint/prettier failures in `avatar.ts`, `field.ts`, `slider/styles.ts`, `text-control.ts` predate this work
- Changed source revisions / reopened gates: V-05, V-09, V-12 reopened by fixes and rerun
