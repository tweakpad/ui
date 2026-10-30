# Segment border implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Segment border, `<tp-mo-segment-border>`, with its child `<tp-mo-border-segment>`, Motion › Surface (`docs/motion/surface/segment-border.mdx`, story `Motion/Surface/Segment border`)
- Requested work / claim: split of the former Border into Glow border and Segment border; Segment border draws custom segments (plain or glowing) with no pointer tracking; drawing a border in becomes a segment pattern
- Scope source: user, 2026-10-30: "split it into two: glow-border and segment-border. For segment border we dont need the mouse tracking. Lets try to share features in foundation"; answers: drop dashes (draw-in becomes a segment pattern, no scroll scrubbing), tags `tp-mo-segment-border` and `tp-mo-border-segment`; earlier segment round: segments by percentages, glowing or not, reverse by default with an optional `leave`, theme primary, hover/focus/in view
- In-scope changes and existing gaps: new element folder (element, segment child, segment collection, timeline, spans), shared base and foundation (see the Glow border record), family, catalog, register, docs page, story, fixture, spec § 21.21
- Repository baseline / unrelated changes: `a02b7ee` on `development`; nothing staged or committed by this work
- Live project / document IDs and revisions: UI Library `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, Component Library `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`; § 21.21 `ucl21-mo-segment-border` (`msb-*`, moved `mbs-props`, `mbs-segments`) committed `7b4113b7`, bumped 0.51.0 `3f4ac24c`
- Owning contracts / dependencies / vocabulary: CL § 21.21 Segment border, CL § 21.20 Glow border (surface), CL §15.8 (row `tbl-cl-158-mo-border-segments`, now Segment border `segments`), Foundation §18.18 viewport signals
- Local reference evidence: none; segments have no reference counterpart under `../specification/external/`; the percentage stretch notation is an idea, no code or names taken
- Tool readiness: Chrome DevTools MCP and direct Spec Blocks MCP tools available
- Browser / server / build under test: Chrome via DevTools MCP; library Vite server on :5199 (source); static Storybook build
- Evidence directory: inline in this record (DevTools evaluate results and screenshots in the session)
- Durable verification fixtures / served URLs: `tests/fixtures/components/mo-segment-border/index.html` (README steps)
- Evidence availability to the next agent: local only

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------ | -------------- |
| C-01 | Surface as Glow border, segment children never the surface | CL `msb-surface`, `mbd-surface` | none | `describesDrawing`, `BorderSurface` | Usage | V-01 | passed | V-01 |
| C-02 | States `start end` in % or px, single end, wrap past the ends, origin keywords or %, zero length hidden | CL `mbs-segments` | none | `segment-timeline.ts` (`parseStates`, `resolveStates`), `segments.ts` (`#origin`, `spanDash`) | Usage | V-01, V-02 | passed | unit tests and V-01, V-02 |
| C-03 | Per-segment duration, delay, easing (timing probe), repeat, alternate; reverse from where it is, or `leave` then rest; re-enter during leave | CL `mbs-segments`, `mbs-props` | none | `SegmentRun`, `TpMoBorderSegment` probe, `transitionTimings` | Usage; Leaving and glowing; Loops | V-02 | passed | unit tests and V-02 |
| C-04 | `trigger` `hover` (default, mouse or pen), `focus`, `always` (once actually in view, not merely near), `none` | CL `msb-props`, `mbs-segments` | none | `#trigger`, `#active`, base `inView` | Drawing the border in; Focus | V-02, V-03 | passed | V-02, V-03 |
| C-05 | Glowing segments in `--tp-mo-segment-border-glow-colors`, core at both ends, bloom | CL `mbs-segments`, `msb-presentation` | none | `spans.ts` (`lightSpans`), shared `GlowRenderer` | Leaving and glowing | V-02, V-05 | passed | unit tests and V-02, V-05 |
| C-06 | Plain segments: `--tp-mo-border-segment-color` (primary), `-width`, `-cap`; track line `--tp-mo-segment-border-color` (`transparent` leaves only segments) | CL `mbs-segments`, `msb-presentation` | none | `styles.ts`, look copied per segment | Usage; Drawing the border in | V-01, V-03 | passed | V-01, V-03 |
| C-07 | `segments` role; reduced motion and a claimed driver jump; timings re-read at each trigger change | CL `msb-motion`, §15.8 | none | `#changed`, `#held`, `BorderSegments.retime` | Usage | V-04 | passed | V-04 |
| C-08 | Invalid `draw` or `leave` reported (`mo-border-segment-invalid`) | CL `mbs-segments` | none | `BorderSegments.collect` | none (diagnostic) | V-01 | passed | V-01 |
| C-09 | Drawing in as a segment pattern replaces the dash draw reveal (user: drop dashes) | user, plan | none | docs example, fixture `case-drawin` | Drawing the border in | V-03, V-05 | passed | V-03, V-05 |
| C-10 | `refresh()` from the shared base; internal segment hook hidden from the API | CL `msb-api` | none | `SurfaceBorderElement.refresh`, `@internal` on the hook | API Reference | V-05 | passed | manifest lists `refresh` only |
| C-11 | Owns focus and invalid states: hides the surface's outline, draws its own focus ring (ring role, theme width and offset) unless the effect plays on focus, and an invalid line and ring in the destructive role; forced colors use system colors (user, 2026-10-30: "consider the focus override which is messing with all the visual style") | CL `sbf-states` (0.51.1, `16b387fb`) | none | `SurfaceBorderElement.syncState`, `effectShowsFocus`, `.focus` path, `HIDDEN_PAINT` | Usage | V-06 | passed | V-06 |
| C-12 | Exact geometry under a CSS zoom or scale transform (ring and canvas), and fill-width surfaces keep filling their row | CL `sbf-states` | none | `BorderSurface.measure` scale, `inlineLevel`, `CanvasSurface` device ratio | none (internal) | V-07 | passed | V-07 |
| C-13 | Glowing segments fade softly at both ends (no hot ticks); docs rebuilt: viewfinder hero, exit path, traced-in stats, focus field, scanner (user, 2026-10-30: "segment border usage is awful", the two use cases "are garbage") | CL `mbs-segments` (0.51.1) | none | `spans.ts`, `docs/motion/surface/segment-border.mdx` | all sections | V-08 | passed | unit test and V-08 |
| C-14 | Positions may name points of the box (`top-left`, `top`, … `left`): exact corners and edge middles on any proportions, reached the short way from the previous state, a stretch ending at a point running clockwise to it (user references, 2026-10-30: per-edge lines that meet at the corners and leave through the far corner) | CL `mbs-segments`, `mbs-props` (0.51.2, `a9758fdc`) | none | `segment-timeline.ts` (`BOX_POINTS`, `Placement`, `resolveStates`), `segments.ts` (`#points`, `#placement`), `draw` JSDoc | Patterns; Leaving | V-09 | passed | unit tests and V-09 |
| C-15 | A run keeps its place when its timing changes (motion scale or timing changed mid-run), instead of keeping its milliseconds | CL `mbs-segments` (0.51.2) | none | `SegmentRun.timing` setter (`#place`) | none (internal) | V-09 | passed | unit tests and V-09 |
| C-16 | Docs reworked on Buttons without glow: the hero meets at the bottom center, Patterns trace, pinwheel, corners and edges, Leaving runs each line in at one corner and out through the next (user, 2026-10-30: "remove the first use case and rework the Leaving one", a button for the default, button references for the general logic only, "no glowing") | user | none | `docs/motion/surface/segment-border.mdx`, story Default | Segment border; Patterns; Leaving | V-10 | passed | V-10 |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| G-01 | Segments were an effect of Border, with a pointer trigger and a 25%-margin "in view" | spec, code | § 21.21 Segment border without pointer; `always` waits for actual intersection | Committed `7b4113b7`, bumped 0.51.0 `3f4ac24c`; V-03 | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/components/mo-segment-border/` — `mo-segment-border.ts` (trigger, playback, drawing), `mo-border-segment.ts` (child and its timing probe), `segments.ts` (collection, origins, dashes), `segment-timeline.ts` (states and playback), `spans.ts` (glowing span light source), `styles.ts`; shared base and foundation as in the Glow border record; family `src/presentation/families/mo-segment-border.ts`
- Supported exports / registration / constituent API impact: exported from `@tweakpad/ui`; `@tweakpad/ui/register` defines the segment before the border
- Public vocabulary / tokens / parts / presentation review: `--tp-mo-segment-border-*` on the border, `--tp-mo-border-segment-*` on the child; parts `mo-segment-border`, `-ring`, `-line`, `-segment-line`, `-glow`, `-bloom`, `mo-border-segment`

### Family dependency map

| Responsibility | Reference dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ---------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Surface, ring, canvases, hover/focus/viewport state, frames | none | `SurfaceBorderElement` | Extended; adds segment children as drawing descriptions | Segment border, Glow border; V-01 |
| Glow painting of segments | none | foundation `GlowRenderer`, `LightField` | Reused with the `lightSpans` source | Segment border; V-02 |
| In-view signal | Foundation §18.18 | `ViewportTrigger` | Reused through the base | Segment border; V-03 |
| Motion role and drivers | CL §15.8 | `stateRole`, `prepareMotion` | Reused (`segments` role) | Segment border; V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | ------------------------------- | ------------ |
| host `mo-segment-border` | none | none | `surfaceBorderStyles` | block or inline block | V-01 |
| line `mo-segment-border-line` | theme border role | surface border recipes | `--tp-border` | track under the segments; `transparent` for draw-in | V-03 |
| segment lines `mo-segment-border-segment-line` | theme primary role | none (original effect) | `--tp-primary` | one SVG dash per plain segment on a path of length 1 | V-02 |
| glow and bloom `mo-segment-border-glow`, `-bloom` | theme chart roles | none | shared renderer | present only while a segment glows | V-02, V-05 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Docs, story, fixture | Surfaces | `tp-button`, `tp-card`, `tp-input`, `tp-text-area`, `tp-select`, `tp-native-select`, `tp-input-group`, `tp-toggle` | V-01, V-05 | fixture `div.plain`: deliberate plain-element case |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| ---- | ---------------------------------- | --------------- | --------------- | ------------- | ------------------------- | ------ | ------------------- |
| V-01 | C-01, C-02, C-06, C-08; behavior | fixture: geometry of 22 borders; positions before and after definition; wrap, round cap, invalid cases | rings on surfaces; nothing moves; wrap visible at rest; no dot; diagnostic | all equal; flow positions equal; 0 shifts; wrap `0.2 0.8`; round cap hidden; `seg-invalid: mo-border-segment-invalid` | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-02 | C-02, C-03, C-04, C-05; behavior | hover button sampled per frame, leave mid-run; glowing exit; scanner; focus field | forward and meet with the 60 ms stagger; play back; exit then rest; loop; draw on focus | 0.004/– at 2 ms → 0.392/0.318 at 252 ms; back 0.309/0.221 → – –; exit lit top half, then the bottom center, then 0; scanner span moves each 500 ms; focus `none` (full), blur hidden | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-03 | C-04, C-06, C-09; behavior | draw-in cards below a spacer: 120 px below the viewport, then in view | undrawn while only near; drawn once in view, second 300 ms later | near: hidden/hidden; in view: 0.50 → 1.00, second 0.19 → 1.00; track stroke transparent | DevTools evaluate | passed | Fixed the former 25% near margin |
| V-04 | C-07; behavior | reduced motion on the live page; off again; a listener claiming `segments` | jump and return; animate again; requests with count; jump | `0.500 0.500` / `- -`; `0.255 0.160` at 150 ms; `rest → active`, `active → rest`, count 2; jumped | DevTools emulate, evaluate | passed | Observed values recorded in Actual result |
| V-05 | C-05, C-09, C-10; visual and accessibility | static Storybook page (hero hovered, drawn in, focus, scanner); API tables; axe on the fixture | library-native examples; `refresh()` only; no violations | hero draws on hover; three stop cards drawn in the ring color; focus field drawn; scanner glows; Methods `refresh()` after marking the hook internal; axe 0 violations, drawings `aria-hidden` | DevTools hover, click, screenshot, evaluate | passed | Screen reader not tested |
| V-06 | C-11; behavior and visual | fixture `#case-states`: focus, invalid; staged hover-trigger and focus-trigger fields | ring outside the line; none for a focus trigger; red line | ring visible; surface outline transparent; focus-trigger field shows only its 2 px segment; invalid line `rgb(239, 68, 68)` | DevTools click, evaluate, screenshot | passed | Observed values recorded in Actual result |
| V-07 | C-12; behavior | `#state-zoomed` in `zoom: 1.5`; staged cards under 1.25×–2× | rings on the surfaces | ring minus surface 0,0,-1,0; every case matches; no layout shift | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-08 | C-13; visual | static Storybook page, dark and light: viewfinder at rest and hovered (also zoomed), Aurora hovered and leaving (slowed ×6), traced-in stats (slowed ×4–×12 mid-trace), focus field, scanner | library-native, calm, readable at rest and in motion | brackets at rest, full frame on hover; streak across the top, exiting forward around the corner; grey trace behind a short glowing head, ending as native cards; 2 px ring-color focus line; soft scanner; light scheme the same | DevTools hover, click, screenshot, evaluate | passed | Observed values recorded in Actual result |
| V-09 | C-14, C-15; behavior | fixture `#case-points` hovered and settled: `segmentEnds()` on the Corners and Edges buttons and the 24rem card; Around left; Corners slowed ×20, scale reset mid-run, then left | ends on the corner arc middles at any width; edges reach their corners together; exit through the far corners; playback at the new pace | button (r 10): ends at 2.8/70.9 × 2.8/28.2 of 73.7 × 31; edges 2.8/59.1 × 2.8/28.2; card (r 14): 4/379 × 4/42 of 383 × 46; Around exits clockwise, then rests; Corners 0.442 → 0.004 within 1.2 s after the reset (before the fix it stayed drawn) | DevTools hover, evaluate, screenshot | passed | Observed values recorded in Actual result |
| V-10 | C-16; visual | the hero, Patterns and Leaving buttons staged at `zoom: 2`, dark and light, rest, slowed ×20 mid-motion, hovered, leaving, Tab focus | calm plain lines, corner-exact, no glow | Pinwheel pauses at the corners between phases; Corners and Edges meet at the corners; Across, Up and down and Around exit forward; focus ring outside the line while hovered; light scheme the same | DevTools hover, press_key, emulate, screenshot | passed | Static Storybook page checked separately |

## Early integration checkpoint

| ID   | Check | Status | Evidence / unresolved finding |
| ---- | ----- | ------ | ----------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | extends `SurfaceBorderElement`; glowing spans paint through the foundation renderer; no copy of glow-border code |
| I-02 | Default visual regions match traced source and shared library recipes | passed | V-01 geometry; V-05 screenshots |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | each trigger, timing option, leave, glow and origin exercised separately (V-02 to V-04) |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| ---- | ------ | --------------------------------------- |
| 0. Sources and scope | passed | User's split request and answers; approved plan; spec committed `7b4113b7`, 0.51.0 `3f4ac24c` |
| 1. Capability mapping | passed | C-01 to C-10, each mapped to scenarios |
| 2. Architecture and composition reuse | passed | Shared base and foundation reused |
| 3. Behavior | passed | V-01 to V-04 in Chrome |
| 4. Presentation and customization | passed | V-03 track and segment colors; V-05 |
| 5. Accessibility | passed | V-05 axe 0 violations; no screen-reader test |
| 6. Visual and interaction inspection | passed | V-05 screenshots |
| 7. Documentation and demo reuse | passed | `check-docs.mjs motion/surface/segment-border` passes; static Storybook page read in Chrome |
| 8. Regression and reconciliation | passed | full `vitest`, `tsc`, eslint, stylelint and prettier on touched files, `npm run build`, static Storybook build |

## Documentation synchronization

- [x] `docs/motion/surface/segment-border.mdx` follows the tweakpad-docs skill; `check-docs.mjs motion/surface/segment-border` passes; the story renders it with `libraryDocs()`.
- [x] JSDoc covers both elements' summaries, public fields, slots and CSS properties; parts carry a description in the family.
- [x] `elementDependencies` is complete (none).
- [x] Verification fixtures are separate from the page.
- [x] Rendered and copyable previews reuse existing components (Button, Card, Input).
- [x] Preview code works outside Storybook (plain markup; the website renders `docs/motion/surface/*.mdx`).

## Completion / handoff

- Revision 2, 2026-10-30 (user feedback: usage, focus override, two use cases): focus and invalid owned by the border, zoom-exact geometry, fill-width fields, soft glowing spans, every docs example rebuilt and reviewed in motion; spec `16b387fb` (0.51.1); C-11–C-13, V-06–V-08 added
- Change summary: Segment border split out of Border, without pointer tracking or dashes; drawing in as a segment pattern; spec § 21.21
- Actual delivery claim: complete component as specified in CL § 21.21 (0.51.0)
- Record checker: `--stage implement`, `verify`, `complete` pass
- Non-browser checks: full `vitest`, `tsc --noEmit`, eslint, stylelint, prettier, `npm run build`, `build-storybook`, docs checker
- Behavior: V-01 to V-04 passed in Chrome
- Accessibility: axe (V-05); no screen-reader test
- Visual/customization/motion inspection: V-05
- Documentation and demo composition reuse: Gate 7
- Shared-consumer regressions / package boundaries: Glow border record (`plans/components/mo-glow-border/`)
- Required failures or blocked checks: none
- Older out-of-scope gaps: stylelint/prettier failures in `avatar.ts`, `field.ts`, `slider/styles.ts`, `text-control.ts` predate this work
- Changed source revisions / reopened gates: replaces the former Border record (`plans/components/mo-border/`)
