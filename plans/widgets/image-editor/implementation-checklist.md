# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Image editor, `tp-image-editor` (`TpImageEditor`), catalog kind `flattening-compound`, shipped through `@tweakpad/ui/widgets` and `@tweakpad/ui/register/widgets` only.
- Requested work / claim: complete new widget: image inspection (zoom, pan, rotate, checker background) and crop regions (rect with ratio or circle, fixed or adjustable), tested on mobile with gestures.
- Scope source: user request of 2026-11-15 and the approved plan `/Users/vanrez/.claude/plans/pasted-content-id-8ac7-we-want-lazy-neumann.md` (name `tp-image-editor`, zoom 1 = natural pixels, configurable region drag defaulting to move-inside/pan-outside, opt-in controls bar, mobile gestures tested).
- In-scope changes and existing gaps: new widget folder, presentation family and recipe, docs page, stories, fixture, sample images; opt-in Foundation hooks in `src/foundation/pan-zoom.ts`; optional colour argument of `swatchFill`; shared `floatingSet` recipe adopted by Flow's controls; two rotate icons. No `src/components/*` change.
- Repository baseline / unrelated changes: `bf328c59` on `development`, clean tree at start.
- Live project / document IDs and revisions: Spec Blocks project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, UI Widgets Specification `doc_0d98facc-5a5d-4de2-bccb-7317abea0b9f` read at head `b87b0dfe0eaa9b5ba22be77224cc12c65ebedea7`; §5 shared widget contracts (`uwg-req-134`, `uwg-req-150`, `uwg-req-166`, `uwg-req-176`, `uwg-req-186`, `uwg-req-196`), Flow `uwg-fl-req-key-2` (wheel policy precedent); Foundation 8.3 `fl-par-83-pan-zoom` (pan and zoom owner), 18.17 Image (`img-purpose`: Image does not crop, so cropping is a widget). §6.10 Image editor is being added from the approved plan (see Issue S-01).
- Owning contracts / dependencies / vocabulary: Widgets §5 and §6.10; Foundation pan and zoom owner, single-pointer drag owner, ControllableState, form element, image load owner, change-reason registry.
- Local reference evidence: no widget reference implementation exists for this widget under `../specification/external/`; a third-party cropper page linked by the user was read for feature coverage only (API surface, not code or presentation) and is not named in sources.
- Tool readiness: direct Spec Blocks MCP tools available; Chrome DevTools MCP available.
- Browser / server / build under test: Chrome via DevTools MCP; Storybook dev server `http://192.168.1.155:6006` (source).
- Evidence directory: `tmp/component-verification/image-editor/2026-11-15/`
- Durable verification fixtures / served URLs: `tests/fixtures/widgets/image-editor/index.html`; stories `Widgets/Image editor`.
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | Image source `src`, `alt`, `crossorigin`; load status with placeholder, error fallback slot, `tp-load`/`tp-error` | §6.10; `uwg-req-166` | `src/foundation/image-load.ts` `ImageLoadController` | `image-editor.ts` render `img` + `settle`; `fallback` slot | Properties table, API | V-01, V-14 | passed | Avatar, Rotation stories load; `#error` fallback verified in V-14 |
| C-02 | Value lane `value`/`defaultValue` `{x,y,width,height,rotation}` in image space; cancelable `tp-value-change`, `tp-value-commit` on settle; `setValue` | `uwg-req-134` | `src/foundation/controllable-state.ts` | `#state`, `#act`, `#commit` | Usage › Avatars | V-02, V-12 | passed | Events recorded with reasons (V-02, V-12); controlled transforming owner and rejecting owner verified in the fixture |
| C-03 | `fit` contain/cover/none (default contain), rotation-aware floor and pan clamp | §6.10 | none (new) | `geometry.ts` `coverZoom`, `containZoom`, `clampView` | Usage | V-03, V-04 | passed | unit tests + Chrome cover clamp on pan |
| C-04 | Zoom unit natural pixels; `min-zoom` number or CSS length; `max-zoom` 8; `zoomRange`; `zoom` get/set | §6.10 | none | `zoomRange`, `resolveMinZoom`, `resolveLength` | Usage | V-03, V-05 | passed | unit tests; `toCanvas` natural size 624 = value width |
| C-05 | `wheel` zoom (vertical zooms to pointer, horizontal/Shift pans)/pan/none; Ctrl/Meta and pinch always zoom | `uwg-req-150`, `uwg-fl-req-key-2` | `src/foundation/pan-zoom.ts` | policy `wheel`, `wheelCrossAxisPans` | Usage, In a scrolling page | V-02 | passed | wheel −200 zoomed 0.1007→0.1329 at pointer; deltaX panned x only |
| C-06 | `cooperative-gestures` gives plain wheels and one-finger drags to the page | §6.10 | pan-zoom `cooperative` | policy, `touch-action: pan-x pan-y` | In a scrolling page | V-13 | passed | Verified in the fixture run of 2026-11-15 |
| C-07 | Drag pans; middle button pans; double click / double tap zoom | `uwg-req-150` | pan-zoom | `PanZoomController` with camera origin at image centre | Usage | V-02, V-10 | passed | synthetic drag pan and pinch; touch double tap awaits the real-device pass V-20 |
| C-08 | Touch: one finger pans, two fingers pinch, `pinch-rotate` twists | §6.10 | pan-zoom `pinchRotate`, `handlers.rotate` | `#gestureTurn`, `#toCamera` | Usage, Rotation | V-10, V-11 | passed | synthetic touch: pinch ×3.67, twist 30° → rotation 30 |
| C-09 | `crop` none/rect/circle; circle forces 1:1; dim outside with `--tp-image-editor-dim` | §6.10 | none | `.region` box-shadow, `data-shape` | Avatars | V-06 | passed | screenshots dark/light |
| C-10 | `aspect-ratio` number or `w/h`; Shift keeps a free region's shape | §6.10 | none | `parseAspectRatio`, `resizeRegion` | Adjustable region | V-07 | passed | ratio 1.7778 after handle drags |
| C-11 | `region-mode` fixed/adjustable; 8 handles (circle: 4 edges) | §6.10 | `src/widgets/flow/node/resizer.ts` (inspected) | `#renderRegion`, `PointerDrag` with `grip` | Adjustable region | V-07 | passed | move and resize in Chrome |
| C-12 | `region-drag` move (default)/pan | §6.10 | none | `#beginRegion`, `#cameraFilter` | Adjustable region | V-07, V-08 | passed | move default verified; pan used in twist probe |
| C-13 | Region sizes `region-width/height`, limits `region-min-*`/`region-max-*` as lengths or %, default inset `--tp-image-editor-inset` | §6.10 | none | `initialRegion`, `#limits`, viewport padding | Adjustable region | V-07 | passed | inset applied (circle 24px from edges) |
| C-14 | Region stays in viewport; with cover also on the image | §6.10 | none | `#regionBounds`, `moveRegion` | Adjustable region | V-07 | passed | region clamped at image edge |
| C-15 | Escape or pointer cancel during a region gesture restores the region and value | `uwg-req-150` | `src/foundation/pointer-drag.ts` | `#cancelRegion` | Keyboard | V-07 | passed | after-escape region and value equal pre-press |
| C-16 | `guides` rule-of-thirds while adjusting | §6.10 | none | `.guides`, `data-adjusting` | Adjustable region | V-07 | passed | Verified in the fixture run of 2026-11-15 |
| C-17 | Rotation: `rotateTo`, `rotateBy`, `[`/`]`, rotate controls; fitted image stays fitted across a turn | §6.10 | none | `#rotateTo`, `rotateAround`, `centredView` | Rotation and controls | V-09 | passed | real click rotate right → rotation 90 |
| C-18 | Controls bar `controls` list and `controls-position`; Sliders (logarithmic zoom track, straighten ±45°), icon Buttons with press-and-hold zoom, toolbar arrow keys | §6.10 | `src/widgets/flow/panels/controls.ts` | `#renderControls`, `ToolbarController`, `PressAndHold` | Rotation and controls | V-09 | passed | rendered in both themes; ArrowRight moved toolbar focus |
| C-19 | Keyboard on the viewport: arrows pan (Shift/Alt steps), `+`/`-`, `0`, `1`, Home/End, `[`/`]`; region arrows move, Alt+arrows resize | `uwg-req-150` | `src/foundation/dimension-step.ts` | `#viewportKeydown`, `#regionKeydown` | Keyboard | V-12 | passed | Verified in the fixture run of 2026-11-15 |
| C-20 | Methods `zoomTo`, `zoomBy`, `panBy`, `fitImage`, `actualSize`, `reset`, `toCanvas`, `toBlob` | §6.10 | none | public methods, `export.ts` | API Reference | V-05 | passed | `toBlob` 256×256 with maxSize, centre pixel matches |
| C-21 | Forms: `name` submits JSON, reset restores default, Field marker | `uwg-req-134` | `src/foundation/form-element.ts` | `TpFormElement`, `setFormValue`, `data-field-control` | API Reference | V-15 | passed | Verified in the fixture run of 2026-11-15 |
| C-22 | Accessibility: viewport group with role description, name, described by value text and instructions; region group with value text; image alt | `uwg-req-176` | none | `aria-describedby` hidden spans | Keyboard | V-16 | passed | snapshot lists group, image, region, controls |
| C-23 | Theming: checker `--tp-image-editor-checker-size/-color`, `background` checker/none, parts | `uwg-req-186` | `src/presentation/recipes/shared/swatch.ts` | recipe `image-editor-*` | Rotation and controls | V-17 | passed | Verified in the fixture run of 2026-11-15 |
| C-24 | `disabled` stops gestures, keys and controls | §5 | none | `effectiveDisabled` checks | Properties | V-14 | passed | Verified in the fixture run of 2026-11-15 |
| C-25 | Resize keeps the image point at the frame centre; release observers on disconnect | `uwg-req-196` | `src/foundation/observation.ts` | `#resized`, `disconnectedCallback` | none | V-18 | passed | Verified in the fixture run of 2026-11-15 |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-01 | No §6.10 Image editor in the Widgets specification | all C-IDs | Add §6.10 from the approved plan through Spec Blocks MCP | passed | §6.10 committed: v0.66.0 head `614d3919`, fine rotation keys v0.66.1 head `23c5c617` |
| S-02 | `uwg-req-150` requires wheel editing to be opt-in; the user asked for wheel zoom by default | C-05 | §6.10 states viewport wheel zoom is view navigation consumed by default, as Flow's wheel pan is; `cooperative-gestures` is the page-friendly mode | user request; Flow precedent `uwg-fl-req-key-2` | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/widgets/image-editor/` — `image-editor.ts` (element: lanes, surfaces, keys, controls, render), `geometry.ts` (pure layer/zoom/clamp/region math), `export.ts` (canvas export), `styles.ts` (structure), `strings.ts`, `types.ts`, `index.ts`.
- Supported exports / registration / constituent API impact: widget catalog, `src/widgets/index.ts`, `src/register/widgets.ts`, `widgetPresentationFamilies`; Foundation `PanZoomOptions.clamp`, `PanZoomPolicy.wheelCrossAxisPans`/`pinchRotate`/`doubleTapZoom`, `PanZoomHandlers.rotate` (all opt-in, Flow unchanged); `swatchFill(paint, tile, color?)`; icons `rotate-ccw`, `rotate-cw`.
- Framework bindings: regenerated with `npm run cem`; lane `tp-image-editor` passes in the React and Vue fixtures, smoke 212/212 in both; ledger row added and `check-ledger.mjs` passes.
- Public vocabulary / tokens / parts / presentation review: parts `image-editor*`; tokens `--tp-image-editor-checker-size`, `-checker-color`, `-dim`, `-inset`; dim reuses the dialog backdrop paint deepened; handles reuse `thumbRing` with `handleSurface`; sets reuse the shared `floatingSet`.

### Family dependency map

| Responsibility | Reference dependency path / symbol         | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Pan, pinch, wheel latch, cooperative gestures, double tap | Foundation 8.3 pan and zoom owner | `src/foundation/pan-zoom.ts` `PanZoomController` | Reused; opt-in clamp hook, cross-axis wheel pan, pinch rotation, touch double tap added | Flow (`src/widgets/flow/viewport-owner.ts`), image editor / V-02, V-10, V-19 |
| Region drag, capture, Escape restore | single-pointer drag owner | `src/foundation/pointer-drag.ts` `PointerDrag` | Reused with `grip` for handles | color picker, gradient picker, easing editor, image editor / V-07 |
| Keyboard steps | Slider step model | `src/foundation/dimension-step.ts` `stepForKey` | Reused for viewport pan (angular, no RTL flip of image space) | V-12 |
| Lane state | ControllableState | `src/foundation/controllable-state.ts` | Reused; `reconcile` for the initial value and resize clamps | V-02, V-12 |
| Forms | form element base | `src/foundation/form-element.ts` `TpFormElement` | Reused; JSON form value | V-15 |
| Image loading | image load owner | `src/foundation/image-load.ts` | Reused through rendered image `settle` | V-01, V-14 |
| Region resize geometry | none | `src/widgets/flow/node/resizer.ts` `TpFlowNodeResizer` | Not reusable: a node element without ratio lock, circle or image bounds; the math stays widget-local and pure in `geometry.ts` | V-07, unit tests |
| Floating control sets | Flow controls panel | `src/presentation/recipes/flow.ts` `flow-controls` | Extracted to `src/presentation/recipes/shared/floating-set.ts`; Flow now uses it | Flow controls, image editor / V-09, V-19 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| `image-editor-background` checker | library swatch | `recipes/shared/swatch.ts` `swatchFill` | swatch checker | Public size and colour hooks | V-17 |
| `image-editor-region` dim and line | dialog backdrop | `recipes/core/dialog-family.ts` backdrop paint | backdrop colour mix | Deepened by 16% for image contrast; inset hairline | V-06 |
| `image-editor-handle` | widget handles | `recipes/shared/handle.ts` `thumbRing`, `handleSurface` | handle ring | Light marker in both schemes; coarse hit target from `RESIZE_SEPARATOR_TARGET` | V-07, V-11 |
| `image-editor-controls` / `-control-set` | Flow controls | `recipes/flow.ts` `flow-controls` | `floatingSet`, Button, Slider | Sets hold ghost icon Buttons and Sliders with a border | V-09 |
| `image-editor-placeholder` | Skeleton | `recipes/skeleton.ts`, heatmap loading pulse | muted fill + ambient pulse | Same reduced-motion rule as Heatmap | V-01 |
| `image-editor-viewport` focus | focus recipes | `recipes/shared/focus.ts` `insetFocusRing` | inset ring | none | V-16 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Controls bar | icon buttons | `tp-button` (`size="icon"`, `.icon`) | `elementDependencies`; V-09 | none |
| Controls bar | zoom and straighten | `tp-slider` (`formAssociatedValue=false`) | V-09 | none |
| Error state | icon | `tp-icon` | V-14 | none |
| Image | picture | native `img` | V-01 | Required: the transformed image layer is the widget's own anatomy; `tp-image` frames responsive images and must not transform them (Foundation 18.17) |
| Fixture form | reset button | native `button type=reset` | V-15 | Deliberate interoperability test of native form reset |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01; behavior | Avatar and Rotation stories load portrait and sticker | Image shows, value set after load, no errors | loaded; value `{x:0,y:200,width:1600,height:1600}`; console clean | DevTools MCP screenshot + evaluate | passed | Observed rendered images and the value after load in Storybook (dark theme, 1200px) |
| V-02 | C-02, C-05, C-07; behavior (synthetic) | AdjustableRegion story: wheel −200 at region centre, wheel deltaX 120, pointer drag outside region | zoom toward pointer; x pan only; drag pans; change and commit events | zoom 0.1007→0.1329; x 578→1162 at same zoom; drag moved x/y; reasons wheel, drag + commits | evaluate (synthetic events) | passed | Wheels dispatched by script; real key and click input in V-09 and V-12 |
| V-03 | C-03, C-04; unit | `geometry.test.ts` | floors, clamps, ranges | 21 tests pass | `npx vitest run tests/unit/widgets/image-editor` | passed | Unit run on the pure geometry module; covers 0°, 90°, 37° and 45° cases |
| V-04 | C-03; visual | cover avatar panned to the edge | no gap inside the circle | one-finger pan clamped x at 0 | evaluate + screenshot | passed | Mobile emulation, avatar story: value x stayed 0 while y moved |
| V-05 | C-04, C-20; behavior | `zoomTo(0.5)`, `toBlob({maxSize:256})`, `toCanvas()` | natural-pixel export | 624×624 natural, 256×256 scaled, skin-tone centre pixel | evaluate | passed | Decoded the exported PNG in the page and sampled its centre pixel |
| V-06 | C-09; visual | Avatar dark and light | dimmed outside, hairline circle | visible in both schemes | screenshots | passed | Inspected the dim at the circle corners in both schemes |
| V-07 | C-10–C-15; behavior (synthetic) | handle se/w drags, move drag, Escape mid-move | ratio kept, region moves and stays in bounds, Escape restores | ratio 1.7778; moved +17.8,+30 within image; restore exact | evaluate | passed | Guides shown mid-drag in the fixture (opacity 1) |
| V-08 | C-12; behavior | `region-drag="pan"`, press inside region | image pans, region stays | press inside the region panned the image (twist probe ran with `region-drag="pan"`); the region kept its place | evaluate in the Rotation story | passed |  Synthetic press; drag-tool real input moves once only |
| V-09 | C-17, C-18; real input | click Rotate right; ArrowRight on toolbar | rotation 90; toolbar focus moves | rotation 90; active element the next control | DevTools click/press_key | passed | Real DevTools click and key press; value read back by evaluate |
| V-10 | C-07, C-08; mobile (synthetic) | 400×800 mobile touch: one-finger pan, two-finger pinch 60→220 | pan; zoom ×3.67 | pan y moved; zoom 0.195→0.715 | emulate + evaluate | passed | Synthetic touch pointers; real device in V-20 |
| V-11 | C-08, C-11; mobile (synthetic) | twist 30° with `pinch-rotate`; coarse handle hit area | rotation 30; hit inset −20px | rotation 30; inset −20px | emulate + evaluate + screenshot | passed | Synthetic twist; computed ::before inset read under emulated coarse pointer; screenshot inspected |
| V-12 | C-19, C-02; real input | fixture keys on viewport and region | map as documented | `1`→zoom 1; ArrowRight +20px; Shift+ArrowDown +100px; `-` ÷1.25; `]` → 90°; region Alt+ArrowLeft −4px width at 16:9, Shift+ArrowRight moved within the image; Shift+`]` turned 1° | DevTools `press_key` after a real `click` focused the viewport/region (fixture `tests/fixtures/widgets/image-editor/`) | passed | Real key presses; Shift+bracket checked with a dispatched key carrying `code` |
| V-13 | C-06; behavior | `#cooperative` in `#scroller` | plain wheel scrolls the box | plain wheel not prevented and zoom unchanged; Ctrl wheel prevented and zoomed | evaluate on `#cooperative` | passed | Synthetic wheels |
| V-14 | C-01, C-24; behavior | `#error`, `#disabled` | fallback, `tp-error`; no interaction | `#error` shows the fallback and records `tp-error`; `#disabled` ignores wheels, tabindex −1, controls disabled | evaluate + screenshot | passed | Inspected the fallback and the disabled editor in the dark scheme |
| V-15 | C-21; forms | `#form` submit/reset | JSON entry; reset restores | `crop` form entry is the JSON value; after a zoom it changed; form reset restored the initial value and entry | evaluate on `#form` | passed | Native form reset |
| V-16 | C-22; accessibility | snapshot + axe | named groups, value text, no violations | groups named with role descriptions and described by value text and instructions; Sliders labelled with `aria-valuetext` "20%"; axe: no component violation (only the fixture page lacks an h1) | take_snapshot + injected axe-core | passed | No screen-reader run |
| V-17 | C-23; customization | override checker size/colour and dim | applied | checker size 40px applied; dim token painted red | evaluate on `#avatar` | passed | Computed styles read back |
| V-18 | C-25; behavior | resize the host | centre image point stays; zoom stays | resized `#inspect` to 700×400 at zoom 1: centre image point moved 0,0; zoom kept 1 | evaluate | passed | Host resized by style in the fixture; value read before and after |
| V-19 | C-05, C-07; Flow regression | Flow controls and wheel after Foundation hooks | unchanged | Flow control sets keep background, 8px radius and shadow-sm through `floatingSet`; pan-zoom unit tests cover the default policy | Storybook Flow Default + vitest | passed | Flow wheel in Chrome not re-run; covered by unit tests |
| V-20 | C-08; real device | Storybook stories on a phone over the LAN | pinch, twist, pan, handles | not run | user's device | blocked | DevTools MCP cannot produce real multi-touch; needs the user's pass on a phone |
| V-21 | C-17, C-18; regression (user report) | Straighten Slider dragged past either end and moved outside the track, released at the end; then a quarter-turn button; repeated from 180° | rotation holds at the end without flicker; the thumb keeps its end after release; a quarter turn keeps the offset | 0 direction changes over 90 samples; 45/−45 held and kept after release; rotate right from −45 → 45 with the thumb at −45; from 180 held at −135 with the thumb at +45 | evaluate (synthetic pointer on the thumb's deepest element) + screenshot; unit test `straightenBase` | passed | Fixed: the base quarter turn was chosen again on every move and flipped at ±45° |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | `PanZoomController`, `PointerDrag`, `ControllableState`, `TpFormElement`, `ImageLoadController` imported in `image-editor.ts`; `floatingSet` used by `recipes/flow.ts` and `recipes/image-editor.ts` |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | Avatar/Adjustable/Rotation screenshots: Flow-like floating sets, light thumb rings, backdrop dim, swatch checker |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | crop shape, region mode, region drag, controls list and position are separate properties; V-07, V-09, V-11 |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed  | Spec head read; approved plan; §6.10 authoring tracked as S-01. |
| 1. Capability mapping                 | passed  | C-01–C-25 mapped to V-IDs. |
| 2. Architecture and composition reuse | passed  | Family, presentation and composition maps above. |
| 3. Behavior                           | passed  | V-01–V-15, V-18 pass: lanes, controlled/rejecting owners, gestures, keys, forms, load/error, disabled, resize. |
| 4. Presentation and customization     | passed  | V-17: checker and dim tokens apply; parts registered in the family. |
| 5. Accessibility                      | passed  | V-16 tree and axe; V-12 real keyboard; no screen-reader run. |
| 6. Visual and interaction inspection  | passed  | Dark and light, RTL, 400px mobile, guides mid-drag, error and disabled inspected; real-device touch is V-20 (blocked). |
| 7. Documentation and demo reuse       | passed  | `check-docs.mjs widgets/image-editor` passes; Storybook Docs read; previews need the Storybook restart for `images/`; website rendering not read. |
| 8. Regression and reconciliation      | passed  | `npm test` 6455 passed; lint, typecheck, build, size report, `check-ledger.mjs` pass; React/Vue lane and smoke 212/212; Flow controls unchanged. |

## Documentation synchronization

- [x] `docs/widgets/image-editor.mdx` follows the tweakpad-docs skill; `check-docs.mjs widgets/image-editor` passes; the story renders it with `libraryDocs()`.
- [x] JSDoc covers the element summary, every public field and method, slots, events and CSS properties; parts carry a description in the family; `npm run build` reports no undescribed row.
- [x] `elementDependencies` is complete (`TpButton`, `TpIcon`, `TpSlider`).
- [x] Verification fixtures are separate from the page (`tests/fixtures/widgets/image-editor/`, `!autodocs` stories).
- [x] Rendered and copyable previews reuse existing components.
- [ ] Preview code works outside Storybook: the sample images are served at `images/` (Storybook static dir; the site needs the same folder).

## Completion / handoff

- Change summary: new `tp-image-editor` widget (view lane in image space, fit floors, rotation, crop regions, controls bar, touch gestures, export); opt-in Foundation pan-zoom hooks; `swatchFill` colour argument; shared `floatingSet`; rotate icons; spec §6.10 (v0.66.0–0.66.1).
- Actual delivery claim: complete widget in Chrome desktop and emulated mobile; real multi-touch on a device not yet verified (V-20).
- Record checker: `check-gates.mjs --stage complete` (see below).
- Non-browser checks: `npm test` 466 files / 6455 tests pass; `npm run lint`, `npm run typecheck`, `npm run build`, `npm run size:report`, `check-docs.mjs widgets/image-editor`, `check-ledger.mjs` pass.
- Behavior: V-01–V-15, V-18 passed (synthetic gestures labelled as such; keys and clicks real).
- Accessibility: tree snapshot and injected axe (no component violation); real keyboard; no screen reader.
- Visual/customization/motion inspection: both schemes, RTL, 400px mobile, guides, tokens; reduced-motion placeholder rule shared with Heatmap.
- Documentation and demo composition reuse: docs page and stories pass; workspace General settings gains a cover-image editor.
- Shared-consumer regressions / package boundaries: Flow controls paint and pan-zoom default policy unchanged; React/Vue bindings regenerated and verified.
- Required failures or blocked checks: V-20 real-device touch (blocked on the user's device).
- Older out-of-scope gaps: none known.
- Changed source revisions / reopened gates: none after the final runs.
