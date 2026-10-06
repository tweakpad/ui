# Component implementation and evidence record — Carousel effects

## Delivery and source record

- Component(s) / public identity: `tp-carousel` `effect` property; effect factories `carouselShaderEffect`, `carouselCrossfadeEffect`, `carouselLayeredEffect`, `carouselParallaxEffect`, `carouselFocusEffect`; effect contract types and helpers; internal WebGL infrastructure.
- Requested work / claim: complete delivery of the approved plan (`~/.claude/plans/i-need-you-to-enumerated-fairy.md`). Covers the carousel extension seam, a WebGL shader transition over incoming slides, and reimplementations of the Codrops CSS techniques.
- Scope source: user, 2026-10-06. Effects are fully supported and public, live next to the carousel, and must be tree-shakeable. The shader uses a full-frame stacked layout over slide media only. Phase 1 covers the seam, the shader and all CSS variants. The user's instruction was "implement it".
- In-scope changes and existing gaps:
  - In scope: the presenter refactor, effects, docs and stories.
  - Pre-existing gap 1 (resolved 2026-10-06, S-02): the published `dist/` shared one large chunk and global presentation registries, so carousel-only consumers bundled unrelated components (see V-16).
  - Pre-existing gap 2: the DevTools drag tool cannot produce a multi-step swipe, and that affects the basic carousel too (see V-07).
- Repository baseline / unrelated changes: `development`, clean at start. The media-player work belongs to another agent and is untouched.
- Live project / document IDs and revisions: Spec Blocks project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, HEAD `8440bff`. The carousel sections and exclusions were read on 2026-10-05/06. The amendment `spec-amendment.md` has not been applied (S-01).
- Owning contracts / dependencies / vocabulary: `sec-187-carousel`, `ucl21-carousel`, motion roles and drivers (`sec-64-motion-requests-and-drivers`), environment services (`sec-123`), and the carousel exclusions (`carousel.md` §1.2, `docs/carousel.md`).
- Local Base UI / Floating UI / shadcn evidence:
  - Swiper 14.3.0 in `library/external/swiper`: `shared/effect-init.ts`, `effect-virtual-transition-end.ts`, `core/update/updateSlidesProgress.ts`. Used as evidence only; no code was ported.
  - Codrops article and the dm81 CodePen. Both were read in full and fully reimplemented.
- Tool readiness: Spec Blocks MCP connected; Chrome DevTools MCP connected.
- Browser / server / build under test: Storybook dev server from this checkout, plus `npm run build` output for the package check.
- Evidence directory: `tmp/component-verification/carousel-effects/2026-10-06/`
- Durable verification fixtures / served URLs: the Storybook `Components/Carousel` docs examples (Shader transition, Crossfade, Layered 3D, Parallax, Focus) and `src/foundation/carousel/effect.test.ts`.
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| -- | ------------------------------------- | -------------- | ---------------------------- | ------------------------------ | ------------- | ------------ | ------ | -------------- |
| C-01 | Presenter seam; default translate behavior unchanged | draft Presentation and effects | Swiper `setTranslate` | `foundation/carousel/presenter.ts` `TranslatePresenter`; `CarouselTransport.presenter` | docs/carousel.md Effects | V-01 | passed | 67 existing carousel tests pass; browser animate/settle unchanged |
| C-02 | Logical-position effect presenter with frame-driven animation and interruption | draft Presentation and effects | Swiper `virtualTranslate` | `foundation/carousel/effect.ts` `EffectPresenter` | docs/carousel.md Effects | V-02, V-07 | passed | unit tests: interrupt freezes at 50, then resume; browser scrub via preview |
| C-03 | Frame data: phase, position, velocity, direction, items with loop-wrapped progress, current/next/amount | draft frame requirement | Swiper `updateSlidesProgress` | `carouselItemProgress`, `CarouselEffectFrame` | docs/carousel.md Custom effects | V-02, V-03 | passed | unit tests for progress, loop wrap and pair |
| C-04 | Stack layout: origin stacking, pair visibility, 1-per-view constraint with diagnostic | draft stack requirement | Swiper fade/cube `overwriteParams` | `stackEffectConstraint`; `#stacked` projection in `carousel.ts` | docs/carousel.md Effects | V-03, V-04 | passed | unit constraint test; browser shells absolute at origin, track transform none |
| C-05 | `transition` motion role; external drivers can claim it; reduced motion settles instantly | draft `transition` role | — | `carouselMotionRoles.transition`; components.ts motionRoles | docs/motion.md table | V-05 | passed | browser reduced-motion carousel settled with no canvas frames |
| C-06 | `effect` property; scroll transport ignored with a diagnostic; replace/detach restores | draft property row | — | `TpCarousel.effect`, `#applyEffect` | docs/carousel.md Effects | V-04, V-06 | passed | effect null restores translate (browser); variant switch reattaches |
| C-07 | Effect surface part, `aria-hidden`, no pointer events, isolated stacking | draft part row | — | `carousel-effect-surface` part and styles | docs/carousel.md Parts | V-08 | passed | a11y tree omits the canvas; axe clean |
| C-08 | Crossfade with overlap; also the fallback | draft factories | Codrops 1A | `effects/crossfade.ts` | docs/carousel.md options | V-03 | passed | browser opacity sampled mid-transition |
| C-09 | Layered 3D with staggered layers ending at arrival | draft factories | Codrops 1B | `effects/layered.ts` | docs/carousel.md options | V-09 | passed | docs example renders; layer windows end at amount 1 |
| C-10 | Parallax on the moving track via item progress | draft factories | Codrops 2C | `effects/parallax.ts` | docs/carousel.md options | V-09, V-10 | passed | screenshot parallax-focus.png; RTL mirrored offsets |
| C-11 | Focus dim/scale with layer reveal on arrival | draft factories | Codrops 2A/2B | `effects/focus.ts` | docs/carousel.md options | V-09 | passed | screenshot parallax-focus.png |
| C-12 | Shader: shared WebGL2 context, bitmap presentation, idle compile, shared program and textures | draft graphics service | dm81 CodePen (defects avoided) | `foundation/webgl/*`, `effects/shader/effect.ts` | docs/carousel.md Shader behavior | V-11, V-12 | passed | 4 carousels on one host; displays use bitmaprenderer |
| C-13 | Shader look: wipe/displace/chromatic, cover-fit, focal point, linear light, zoom-drift, velocity smear | draft shader requirement | dm81 CodePen | `effects/shader/shaders.ts` | docs/carousel.md options | V-13 | passed | screenshots shader-mid-2.png and shader-displace-mid.png; unit cover/focal tests |
| C-14 | Shader fallbacks: no WebGL2, context loss/restore, CORS, missing media, off-screen, reduced motion | draft fallback requirement | — | `#ensure`, `#draw`, texture failures | docs/carousel.md Shader behavior | V-05, V-14 | passed | loss gives crossfade frames, restore resumes GL; CORS diagnostic |
| C-15 | Layers above the canvas without breaking author positioning | draft layer requirement | — | `#layers`, `#static` | docs/carousel.md Authoring hooks | V-13 | passed | caption stays absolutely positioned (fixed defect) |
| C-16 | Rendering only while transitioning; no idle frames | draft shader requirement | — | presenter and effect scheduling | docs/carousel.md Shader behavior | V-15 | passed | 0 rAF calls in 2 s idle with 4 carousels |
| C-17 | Tree-shakeable factories (no module side effects) | user requirement | — | explicit factory imports | docs/carousel.md Effects | V-16 | passed | Effect and WebGL code ship only to shader consumers; a `TpCarousel`-only bundle contains the carousel, button, icon, progress and spinner families only (V-16) |
| C-18 | Public exports and custom-effect helpers | draft factories | — | `components/carousel/index.ts`, `foundation/carousel/index.ts` | docs/carousel.md Custom effects | V-17 | passed | `npm run build`; types exported |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-01 | Live spec excludes carousel effects and parallax and has no effect contract | Carousel, motion roles, environment services | Apply `spec-amendment.md` | Write withheld: shared candidate busy (player spec in progress) | blocked |
| S-02 | Presentation definitions, bindings, recipes and the default dictionary are global registries, so every component ships every component's presentation data | every component | Per-component presentation bundles that the controller resolves from a registry | Implemented library-wide. Each component imports its own `PresentationFamily` (`src/presentation/families/`), recipes are split per component and shared recipe modules, and the controller resolves families from the element class. `elementDependencies` with a recursive `defineElement` registers the rendered elements. Aggregates are opt-in. Guarded by `src/presentation/families.test.ts`. | resolved |

## Architecture and reuse

- Component folder and responsibility boundaries:
  - `foundation/carousel/{presenter,timing,effect}.ts`: the seam and the contract.
  - `foundation/motion-easing.ts`: easing evaluation.
  - `foundation/webgl/*`: the graphics service, kept internal for now.
  - `components/carousel/effects/*`: the factories.
  - `TpCarousel`: binds the effect, stacked projection and surface.
- Supported exports / registration / constituent API impact:
  - `TpCarousel.effect` (property only).
  - Factories and contract types are exported from the root and from `@tweakpad/ui/carousel`.
  - The new part is `carousel-effect-surface`; the new motion role is `transition`.
  - The WebGL modules are not exported.
- Public vocabulary / tokens / parts / presentation review:
  - The part follows the `carousel-*` naming, and the role follows the existing role table.
  - Demo CSS uses theme tokens.
  - Effect parameters are documented numeric options (geometry/timing), not appearance literals.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | --------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Track movement | Swiper `setTranslate`/`setTransition` | `foundation/carousel/transport.ts` `CarouselTransport` transform branch | Extracted unchanged into `TranslatePresenter`; transport delegates; the scroll branch is untouched | `tp-carousel`; V-01 |
| Motion timing and roles | — | `transport.ts` `carouselMotionTiming`, `carouselMotionRoles` | Moved to `timing.ts` and re-exported from `transport.ts` (no API change); added the `transition` role | `TranslatePresenter`, `EffectPresenter`, auto-height; V-01, V-05 |
| Motion driver claim | — | `foundation/motion.ts` `prepareMotion` | Reused for effect transitions with an rAF fallback driver | `EffectPresenter`; V-05 |
| Frame scheduling | — | `foundation/services.ts` `Scheduler.animationFrame` | Reused; frames run only while animating | `EffectPresenter`; V-15 |
| Owned inline styles | — | `foundation/owned-styles.ts` `OwnedStyles` | Reused through `EffectStyles`, so detach restores exactly | all effects; V-06 |
| Stacked shells | — | virtual-mode absolute shells in `carousel.ts#project`/`#renderItem` | Same absolute-shell path with origin insets | stack effects; V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | ------------------------------- | ------------ |
| Viewport, track, items | library theme | carousel recipes (`presentation/recipes/carousel.ts`) | carousel recipes unchanged | Effects write only inline transform, opacity, visibility, translate and scale on the effect's own targets | V-09 |
| Effect surface | — (Tweakpad original) | `components/carousel/styles.ts` `.effect-surface` | structural style | Structural positioning only; no appearance | V-08 |
| Demo slides and captions | library theme | `src/stories/carousel-effects.stories.css` | Toggle Group for variant switching | Captions use theme spacing and type tokens | V-09 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Shader example | variant switch | `tp-toggle-group` / `tp-toggle` | V-13 (real click on Displace) | none |
| All effect examples | carousel | `tp-carousel` with `effect` | V-09 | none |
| Slides | media and captions | native `figure`/`img`/`figcaption` | V-13 | native content with `data-carousel-media`/`-layer` hooks |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| -- | ---------------------------------- | --------------- | --------------- | ------------- | ------------------------- | ------ | ------------------- |
| V-01 | C-01; regression | existing carousel tests; Default story `next()` | unchanged behavior | 67/67 tests pass; mid-animation matrix interpolated, settled at -336px | vitest; MCP evaluate | passed | Observed with vitest and in the browser |
| V-02 | C-02, C-03; unit | fake host: animate, cancel, reverse | frozen position, settle frame, direction -1 | 9/9 effect tests pass | `npx vitest run src/foundation/carousel/effect.test.ts` | passed | Observed unit results |
| V-03 | C-03, C-04, C-08; browser | crossfade `next()` | outgoing/incoming opacity frames, clean end | 0.92/0.71 → 0.19/0.99 → settled current | MCP evaluate | passed | Observed frame samples |
| V-04 | C-04, C-06; browser | stack effects | shells absolute at origin, track transform none, 1 per view | observed | MCP evaluate | passed | Observed DOM state |
| V-05 | C-05, C-14; browser | `motion-policy="reduce"` shader carousel | instant settle, no canvas | index advanced, no canvas frames | MCP evaluate | passed | Observed |
| V-06 | C-06; browser | `effect = null`, variant switch | translate restored, new effect attached | observed | MCP evaluate | passed | Observed |
| V-07 | C-02; input | preview scrub 0.1→0.35→0.6→0.35 then release | GL frames at intermediate amounts; snaps back | canvas block at 0.35/0.6/0.35; animate then settle at 0 | MCP evaluate (public `preview()` API, not real pointer) | passed | Real-pointer drag blocked by the tool: a single-move drag also fails on the basic carousel |
| V-08 | C-07; accessibility | snapshot plus axe on 5 examples | canvas absent from tree; no violations | tree shows only current slide; axe 0 violations | MCP snapshot and axe | passed | Accessibility tree and axe; no screen reader run |
| V-09 | C-09, C-10, C-11; visual | docs examples | effects render with real components | parallax/focus screenshot inspected | `parallax-focus.png` | passed | Observed visually |
| V-10 | C-10; RTL/vertical | RTL parallax; vertical crossfade | mirrored offsets; block-axis stacking | +15% offsets in RTL; vertical settled | MCP evaluate | passed | Observed |
| V-11 | C-12; shader | 4 shader carousels | one host; bitmap displays; GL frames on all | shared true; 4×block | MCP evaluate (effect's module URL) | passed | Observed |
| V-12 | C-12; shader | variant switch then immediate transition | GPU frames with no first-transition fallback | block | MCP evaluate | passed | Observed after sharing textures and program |
| V-13 | C-13, C-15; visual + real input | real clicks on Displace and Next | displacement band, no edge streaks, caption above | 71 GL frames on click; screenshots inspected | MCP click; `shader-displace-mid.png` | passed | Observed visually and by frame log |
| V-14 | C-14; fallback | context lose/restore; CORS-less image | crossfade while lost, GL after restore; CORS diagnostic | none → block; diagnostic emitted | MCP evaluate | passed | Observed |
| V-15 | C-16; performance | 2 s idle with 4 shader carousels | no rAF | 0 calls | MCP evaluate | passed | Observed |
| V-16 | C-17; package | vite bundle importing only `TpCarousel` from dist | no effect/WebGL code; no unrelated components | Effect and WebGL code ship only to shader consumers (20 KB). After the per-component family split (S-02), `defineElement(TpCarousel.tagName, TpCarousel)` from `dist/index.js` minifies to 203 KB excluding Lit. It contains the carousel, button, icon, progress and spinner families only, with no registry or aggregate modules. | `tmp/presentation-migration/measure.py`, `sizes-after-deps.txt`; Chrome standalone fixture | passed | — |
| V-17 | C-18; build | lint, tests, build | clean | vitest 1032 pass; eslint/stylelint clean; build ok; pre-existing field.ts format warning | npm scripts | passed | Observed |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| -- | ----- | ------ | ----------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | The transform branch moved out of `CarouselTransport` (no duplicate), and both presenters use `timing.ts`. Effects reuse `prepareMotion`, `Scheduler` and `OwnedStyles`. Program and textures are shared per context. |
| I-02 | Default visual regions match traced source and shared library recipes | passed | The basic carousel is unchanged (V-01). Effects only write inline animated properties on their own targets (V-09). |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | Variant, duration/easing, overlap, depth and layer rise are independent. Navigation buttons, indicators and keyboard keep working with every effect (V-13). |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| ---- | ------ | --------------------------------------- |
| 0. Sources and scope | blocked | Live spec read via MCP. It excludes effects, so the amendment is drafted but not applied (S-01). Implementation proceeded per the approved plan. |
| 1. Capability mapping | passed | C-01–C-18 map the plan, the draft amendment and the user requirements to code, docs and scenarios. |
| 2. Architecture and composition reuse | passed | The family map shows extraction instead of duplication, and reuse of motion, scheduler, owned styles and virtual-shell paths. |
| 3. Behavior | passed | V-01–V-07, V-10–V-12, V-14 and V-15 pass. Real-pointer drag is a tool limitation recorded in V-07. |
| 4. Presentation and customization | passed | V-09: effects restore styles on detach. Item progress custom property and role attribute are exposed. |
| 5. Accessibility | passed | V-08: tree and axe. Item semantics and announcements are unchanged. No screen reader run. |
| 6. Visual and interaction inspection | passed | Screenshots inspected; edge-streak, caption and drift-sign defects found and fixed. |
| 7. Documentation and demo reuse | passed | docs/carousel.md Effects, docs/motion.md, and five docs examples using Toggle Group and real carousels. |
| 8. Regression and reconciliation | passed | vitest 1032; eslint/stylelint clean; build ok; carousel regression V-01. Tree-shaking S-02 resolved; vitest 1039, lint and build re-run after the split. |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup.
- [x] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary: the presenter seam, the effect contract and presenter, five effects, internal WebGL infrastructure, docs and examples.
- Actual delivery claim: complete against the plan, except spec adoption (S-01).
- Record checker: blocked only by Gate 0 (spec adoption, S-01).
- Non-browser checks: vitest 1032 pass; eslint/stylelint clean; `npm run build` ok.
- Behavior: passed, with the real-pointer drag tool limitation noted.
- Accessibility: tree and axe; no screen reader run.
- Visual/customization/motion inspection: passed.
- Documentation and demo composition reuse: passed.
- Shared-consumer regressions / package boundaries: carousel unchanged; single-component bundles verified (V-16).
- Required failures or blocked checks: S-01.
- Older out-of-scope gaps: DevTools drag tool cannot express multi-step swipes.
- Changed source revisions / reopened gates: none after the final runs.
