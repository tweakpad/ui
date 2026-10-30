# Glow border implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Glow border, `<tp-mo-glow-border>`, Motion › Surface (`docs/motion/surface/glow-border.mdx`, story `Motion/Surface/Glow border`)
- Requested work / claim: split of the former Border (`tp-mo-border`) into Glow border and Segment border, sharing what both need in foundation; Glow border keeps the glow (tracked light, comets, sweep, pulse, glint, fade); dashes and the draw reveal are removed
- Scope source: user, 2026-10-30: "We will need to split it into two: glow-border and segment-border. For segment border we dont need the mouse tracking. Lets try to share features in foundation and make a clear and clean split"; answers: drop dashes, tags `tp-mo-glow-border` / `tp-mo-segment-border` with the child `tp-mo-border-segment`; approved plan `~/.claude/plans/we-need-to-plan-lovely-bonbon.md`. Earlier Border rounds (glow, colors, trigger, fade) carry over unchanged in behavior
- In-scope changes and existing gaps: new element folder, shared foundation `src/foundation/border-ring/` (ring path, ring samples, glow palette, light field, glow renderer), `src/foundation/css-list.ts`, `transitionTimings` in `motion.ts`, shared base `SurfaceBorderElement` and `BorderSurface` (`src/components/shared/surface-border.ts`), family, catalog, register, docs page, story, fixture, spec; `tp-mo-border` removed with no alias
- Repository baseline / unrelated changes: `a02b7ee` on `development` (the Border commit); nothing staged or committed by this work
- Live project / document IDs and revisions: UI Library `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, Component Library `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`; read at `06436ecb` (0.50.0); split committed `7b4113b7` (0.50.1), bumped `3f4ac24c` (0.51.0)
- Owning contracts / dependencies / vocabulary: CL § 21.20 Glow border (`mbd-*`, `mbx-*` nodes in container `ucl21-mo-border`), CL §15.8 motion roles (row `tbl-cl-158-mo-border-loop`, now Glow border `loop`)
- Local reference evidence: none; the effect has no reference counterpart under `../specification/external/`
- Tool readiness: Chrome DevTools MCP and direct Spec Blocks MCP tools available
- Browser / server / build under test: Chrome via DevTools MCP; library Vite server on :5199 (source); static Storybook build
- Evidence directory: inline in this record (DevTools evaluate results and screenshots in the session)
- Durable verification fixtures / served URLs: `tests/fixtures/components/mo-glow-border/index.html` (README steps)
- Evidence availability to the next agent: local only

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------ | -------------- |
| C-01 | Surface lookup and border replacement: boundary part of library surfaces, a plain child, or the own box; border color hidden with its width kept; ring over the border box with per-corner radii, width and direction; no layout, hit testing or accessibility tree | CL `mbd-surface` | none | `BorderSurface`, `SurfaceBorderElement` (`shared/surface-border.ts`) | Usage, Controls and fields | V-01, V-07 | passed | V-01, V-07 |
| C-02 | `trigger` `none`, `always`, `hover`, `focus`, `pointer`; unset `always` for a named motion, `pointer` otherwise | CL `mbx-props` | none | `#trigger`, `#on`, base hover/focus state | Hover and focus | V-04 | passed | V-04 |
| C-03 | Tracked light: `trackPoint`, `track-target`, mouse or pen (never touch); reach; white-hot core | CL `mbx-glow` | none | `lights.ts` pointer source, `#light`, `observePointerPosition` | Usage, Light sources | V-02 | passed | V-02 |
| C-04 | Comets exactly spaced; sweep, pulse, glint; lap duration, delay and easing | CL `mbx-glow` | none | `lights.ts` (`cometHeads`, `cometTail`, `lightGlow`), `#sources` | Comets; Sweep, pulse and glint | V-03 | passed | unit tests and V-03 |
| C-05 | Fade duration, easing and out delay (only when fading out) | CL `mbx-fade` | none | `fade.ts`, `triggerChanged` | Fading | V-04 | passed | unit tests and V-04 |
| C-06 | Loop role; reduced motion rests comets and glint, holds sweep and pulse; claimed driver | CL `mbx-motion`, §15.8 | none | `#syncLoop`, `#held` | Usage | V-05 | passed | V-05 |
| C-07 | Presentation: line `--tp-mo-glow-border-color`, colors, core, angle, intensity, spread, fill, width, radius; parts `mo-glow-border`, `-ring`, `-line`, `-glow`, `-bloom` | CL `mbx-presentation` | none | `styles.ts` mapping onto `--_tp-surface-border-*`, `moGlowBorderPresentation` | Colors | V-06 | passed | V-06 |
| C-08 | `refresh()` | CL `mbd-api` | none | `SurfaceBorderElement.refresh` (own-API base) | API Reference | V-06 | passed | V-06 |
| C-09 | Shared foundation and base, no duplicate in either element (user: "share features in foundation") | plan | none | `foundation/border-ring/*`, `css-list.ts`, `transitionTimings`, `SurfaceBorderElement` | none (internal) | V-01 | passed | unit tests for every moved module; V-01 |
| C-10 | Owns focus and invalid states: hides the surface's outline, draws its own focus ring (ring role, theme width and offset) unless the effect plays on focus, and an invalid line and ring in the destructive role; forced colors use system colors (user, 2026-10-30: "consider the focus override which is messing with all the visual style") | CL `sbf-states` (0.51.1, `16b387fb`) | none | `SurfaceBorderElement.syncState`, `effectShowsFocus`, `.focus` path, `HIDDEN_PAINT` | Usage | V-08 | passed | V-08 |
| C-11 | Exact geometry under a CSS zoom or scale transform (ring and canvas), and fill-width surfaces keep filling their row | CL `sbf-states` | none | `BorderSurface.measure` scale, `inlineLevel`, `CanvasSurface` device ratio | none (internal) | V-09 | passed | V-09 |
| C-12 | Pointer light is a local highlight along the line around its nearest point (a share of the perimeter), dimming with distance up to `track-reach`; calmer bloom and sweep (user, 2026-10-30: "all saturated and ugly") | CL `mbx-glow` (0.51.1) | none | `lights.ts` spot, `glow-renderer.ts` bloom ×1.2 and mean-per-stroke, sweep 0.65 | Usage, Controls and fields | V-10 | passed | unit test and V-10 |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| G-01 | CL § 21.20 Border combined glow, dashes and segments behind `effect` | spec, docs, code | Section becomes Glow border; dashes, draw reveal, `effect` and the Scroll trigger membership removed; Segment border is § 21.21 | Committed `7b4113b7`, bumped 0.51.0 `3f4ac24c` | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/components/mo-glow-border/` — `mo-glow-border.ts` (trigger, light sources, tracking, loop, fade), `lights.ts` (glow light sources), `fade.ts`, `styles.ts`; shared base `src/components/shared/surface-border.ts`; foundation `src/foundation/border-ring/`; family `src/presentation/families/mo-glow-border.ts`
- Supported exports / registration / constituent API impact: exported from `@tweakpad/ui`, defined by `@tweakpad/ui/register`; `SurfaceBorderElement` listed in `OWN_API_BASES` so `refresh()` shows on each page
- Public vocabulary / tokens / parts / presentation review: `--tp-mo-glow-border-*`; private shared look `--_tp-surface-border-*` (registered once in the base); the tag was named by the user

### Family dependency map

| Responsibility | Reference dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ---------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Surface lookup, border hiding, ring geometry, canvases, hover/focus/viewport state, frame subscription | none (Tweakpad-only) | former `tp-mo-border` internals | Moved into `SurfaceBorderElement`; both elements extend it | Glow border, Segment border; V-01 |
| Ring path, samples, palette, light field, glow painting | none | former `mo-border/*` modules | Moved to `src/foundation/border-ring/`; the renderer takes a `light` function, `spots` and `wash` instead of knowing sources | Glow border, Segment border; V-01, V-03 |
| Viewport near / in view | Foundation §18.18 | `ViewportTrigger` | Reused in the base (near pauses loops, in view plays segments) | Glow border, Segment border; V-03 |
| Timing probe lists | none | `cssTimeMs` | `transitionTimings` and `splitCssList` added to foundation; glow lap/fade and segment timings read through them | Glow border, Segment border; V-04 |
| Pointer position, spring follow, layout batch | Foundation | `observePointerPosition`, `SpringFollower2D`, `scheduleLayoutPass` | Reused | Glow border; V-02 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | ------------------------------- | ------------ |
| host `mo-glow-border` | none (paints no surface) | none | `surfaceBorderStyles` | block or inline block, `position: relative` | V-01 |
| ring and line `mo-glow-border-ring`, `-line` | theme border role | surface border recipes | `--tp-border`, `--tp-border-width` | drawn at the surface's own width and radii | V-01 |
| glow and bloom `mo-glow-border-glow`, `-bloom` | theme chart roles | none (original effect) | `--tp-chart-2`, `--tp-chart-1`, `--tp-chart-5` | canvas glow from the shared renderer | V-03, V-06 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Docs, story, fixture | Surfaces | `tp-card`, `tp-button`, `tp-input`, `tp-text-area`, `tp-select`, `tp-native-select`, `tp-input-group`, `tp-toggle`, `tp-badge` | V-01, V-06 | fixture `div.plain`: deliberate plain-element case |
| Fixture light source | Moving dot | native `span.beacon` | V-02 | a test target, not a UI role |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| ---- | ---------------------------------- | --------------- | --------------- | ------------- | ------------------------- | ------ | ------------------- |
| V-01 | C-01, C-09; behavior | fixture `geometry(id)` for all 29 borders; positions before and after definition | ring equals surface; surface border transparent; nothing moves | all equal (within 1 px); transparent except the own-box case; flow positions equal; 0 layout shifts | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-02 | C-03; behavior | synthetic touch, then pen `pointermove` near the glow card; leave | touch unlit; pen lit with a white core; fades after leaving | touch 0; pen 4295, hottest point rgb(206, 237, 255) at full alpha; 4295 → 923 → 0 | DevTools evaluate | passed | Synthetic events check the type filter; real hover in V-06 |
| V-03 | C-04; behavior | `peaks()` of 2 and 3 comets; lit totals of sweep, pulse, none | 2 and 3 peaks; sweep and pulse lit; none dark | 2/3 each sample (comets-3 0 during its pause); sweep 25206, pulse 30473, none 0 | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-04 | C-02, C-05; behavior | focus then blur the focus field; slow-fade card (600 ms out delay) | focus lights and unlights; fade holds, then eases out | 0 → 36399 → 0; 100% to 569 ms, then 83, 50, 24, 8, 0 by 1.12 s | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-05 | C-06; behavior | reduced motion emulated; a listener claiming `loop` on a new comet border | comets and glint dark; sweep still; pulse steady; claimed loop dark with marker | comets 0, glint 0, sweep profiles identical 600 ms apart, pulse 30473; request `loop`/`start`/`comets`, lit 0, `data-tp-motion-driven="loop"`; unclaimed 7683 | DevTools emulate, evaluate | passed | Observed values recorded in Actual result |
| V-06 | C-07, C-08; visual | static Storybook Glow border page, dark and light, Colors hovered; API tables | warm glow, library-native compositions; `refresh()` row from the base | amber to white to pink (dark), red to pink (light); one ring-color comet on the prompt; Methods: `refresh()` | DevTools hover, screenshot, evaluate | passed | Observed values recorded in Actual result |
| V-07 | C-01; accessibility | axe on the fixture main; drawings | no violations; drawings hidden | 0 violations; every SVG and canvas `aria-hidden` | DevTools evaluate (page-injected axe-core) | passed | Screen reader not tested |
| V-08 | C-10; behavior and visual | staged fields: click focus on a hover-trigger field, Tab to a button, focus a `trigger="focus"` field, an invalid field | one ring outside the line; none when the effect shows focus; red line, no halo | ring visible on click and Tab focus, the surface outline `rgba(0, 0, 0, 0)`; `data-tp-focus-shown` on focus-trigger borders with no ring; invalid line `rgb(239, 68, 68)` | DevTools click, press_key, screenshot, evaluate | passed | Observed values recorded in Actual result |
| V-09 | C-11; behavior and visual | stage under `zoom: 1.6` and `2`; docs preview zoom buttons; Field with an Input | rings and glow on the surfaces; fields fill their row | ring minus surface 0,0,0,0 for every case; glow highlight on the edge at 2×; zoomed docs preview frame on the card; Field inputs 318 px wide (were 178 px) | DevTools evaluate, screenshot | passed | Before: rings 1.6× off, glow drawn at half scale (also fixed for every `CanvasSurface` user) |
| V-10 | C-12; visual | the reported composition (Input, Text area, two Buttons) with the pointer below the Text area; docs page in both schemes | a local highlight, no whole outlines lit, calmer bloom | highlights only near the pointer on each control; the far top edge dark (unit test); docs hero, form (one comet on the focused field), hover, fade, colors read calmly in dark and light | DevTools screenshot | passed | Observed values recorded in Actual result |

## Early integration checkpoint

| ID   | Check | Status | Evidence / unresolved finding |
| ---- | ----- | ------ | ----------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | both elements extend `SurfaceBorderElement` and paint through the foundation `GlowRenderer`; `src/components/mo-border/` removed |
| I-02 | Default visual regions match traced source and shared library recipes | passed | V-01 geometry; V-06 screenshots in both schemes |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | triggers, motions, sources and fade exercised separately (V-02 to V-05) |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| ---- | ------ | --------------------------------------- |
| 0. Sources and scope | passed | User's split request and answers; approved plan; spec read at `06436ecb`, committed `7b4113b7`, 0.51.0 `3f4ac24c` |
| 1. Capability mapping | passed | C-01 to C-09, each mapped to scenarios |
| 2. Architecture and composition reuse | passed | Shared base and foundation modules; no duplicate code in the elements |
| 3. Behavior | passed | V-01 to V-05 in Chrome |
| 4. Presentation and customization | passed | V-06 themes and custom colors |
| 5. Accessibility | passed | V-07 axe 0 violations; no screen-reader test |
| 6. Visual and interaction inspection | passed | V-06 screenshots in both schemes |
| 7. Documentation and demo reuse | passed | `check-docs.mjs motion/surface/glow-border` passes; static Storybook page read in Chrome |
| 8. Regression and reconciliation | passed | full `vitest`, `tsc`, eslint, stylelint and prettier on touched files, `npm run build`, static Storybook build |

## Documentation synchronization

- [x] `docs/motion/surface/glow-border.mdx` follows the tweakpad-docs skill; `check-docs.mjs motion/surface/glow-border` passes; the story renders it with `libraryDocs()`.
- [x] JSDoc covers the element summary, every public field and method, slots and CSS properties; parts carry a description in the family.
- [x] `elementDependencies` is complete (none: the element renders no library component).
- [x] Verification fixtures are separate from the page.
- [x] Rendered and copyable previews reuse existing components (Card, Input, Input group, Text area, Button, Badge, Status dot).
- [x] Preview code works outside Storybook (plain markup; the website renders `docs/motion/surface/*.mdx`).

## Completion / handoff

- Revision 2, 2026-10-30 (user feedback: focus override, saturated composition): focus and invalid owned by the border, zoom-exact geometry, local pointer highlight, calmer bloom and sweep, controls example rebuilt as a form with focus comets; spec `16b387fb` (0.51.1); C-10–C-12, V-08–V-10 added
- Change summary: Border split; Glow border keeps the glow on the shared base and foundation; spec § 21.20 Glow border
- Actual delivery claim: complete component as specified in CL § 21.20 (0.51.0)
- Record checker: `--stage implement`, `verify`, `complete` pass
- Non-browser checks: full `vitest`, `tsc --noEmit`, eslint, stylelint, prettier, `npm run build`, `build-storybook`, docs checker
- Behavior: V-01 to V-05 passed in Chrome
- Accessibility: axe (V-07); no screen-reader test
- Visual/customization/motion inspection: V-06
- Documentation and demo composition reuse: Gate 7
- Shared-consumer regressions / package boundaries: Segment border record (`plans/components/mo-segment-border/`)
- Required failures or blocked checks: none
- Older out-of-scope gaps: stylelint/prettier failures in `avatar.ts`, `field.ts`, `slider/styles.ts`, `text-control.ts` predate this work
- Changed source revisions / reopened gates: the former Border record (`plans/components/mo-border/`) is replaced by this record and the Segment border record
