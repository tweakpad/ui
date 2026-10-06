# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Map — `tp-map` (catalog control, compound-reexport) with constituents `tp-map-pin`, `tp-map-overlay`, `tp-map-control`; engine adapters `createMapLibreEngine`, `createGoogleMapsEngine` in the `@tweakpad/ui/map` subpath
- Requested work / claim: complete new component (plan approved 2026-10-06): OpenFreeMap/MapLibre and Google Maps engines, custom SVG pins, custom themes, events, zoom to a region, external zoom-in/zoom-out/reset controls, pin selection with a custom overlay, and an external list that animates the camera to a pin
- Scope source: user request in this session plus the approved plan `/Users/vanrez/.claude/plans/lets-plan-to-create-cozy-star.md`; user authorized authoring the spec directly, injected adapters, and cloning references
- In-scope changes and existing gaps: new map foundation/component/presentation/docs/stories/tests; shared repairs: `resolveOwner` (portal-ownership, media migrated), Button group `groupBoundary` member hook, List Item selected-description contrast; new `engine` ChangeReason; icons `map.ts`
- Repository baseline / unrelated changes: branch `development` at `9b0f364`; slider/media-player working-tree edits present at session start were later committed or reverted by another actor and are untouched by this work
- Live project / document IDs and revisions: project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`; Foundation `doc_cd3c4721-…`, Component Library `doc_8077bf7c-…`; authored at commit `77ef963` (v0.4.0) and amended at `ff35e54` (v0.4.1)
- Owning contracts / dependencies / vocabulary: Foundation `sec-1812-map`, `map-reasons` (§5.3), B.8.3 row `map-b83-map`; Component Library `ucl21-map`, coverage row `audit-cov-map`; dependencies `ucl19-popover`, `ucl16-button`, `ucl22-icon`, `sec-102-anchorgeometry-and-virtualanchor`, `audit-sec-126-reduced-motion-policy`, `sec-54-store-and-subscription-behavior`
- Local Base UI / Floating UI / shadcn evidence: no upstream map primitive (no hits in base-ui, floating-ui, ui registry); references cloned 2026-10-06 into `../specification/external/`: maplibre-gl-js `f67ac5e` (6.13.0), js-api-loader `220885a`, extended-component-library `7c8bc05`, openfreemap-styles `cf9e8e7`, mapcn `d160bd7`, google-map (Polymer) `65c597b`
- Tool readiness: direct Spec Blocks MCP available; Chrome DevTools MCP available
- Browser / server / build under test: Chrome via DevTools MCP; Storybook dev server `http://localhost:6007` (source); `npm run build`, `npm run build-storybook`
- Evidence directory: `tmp/component-verification/map/run-1/`
- Durable verification fixtures / served URLs: `src/stories/map.stories.ts` (Default, Google Maps engine, Token theme), `src/stories/examples.ts` `tp-map` fixture
- Evidence availability to the next agent: local only (screenshots under `tmp/component-verification/map/run-1/`)

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ---------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | Engine adapter contract (required/optional capabilities, fallbacks) | map-f-engine-intro, map-f-engine | maplibre `src/ui/map.ts`, `marker.ts`; Google `OverlayView` docs | `foundation/map/engine.ts`, `controller.ts` | docs/map.md Engines | V-01, V-02, V-14 | passed | unit (controller.test, adapters.test); both engines rendered in Chrome |
| C-02 | Coordinates, 256-px zoom scale, bounds/antimeridian | map-f-coordinates | maplibre zoom (512 px) | `geo.ts`, adapter zoom ±1 | docs/map.md | V-01, V-14, V-15 | passed | geo.test; identical pin placement on both engines at zoom 11.85 (01, 08 screenshots) |
| C-03 | Mount lifecycle, status idle/loading/ready/error, zero-size deferral | map-f-mount, map-f-viewport | — | `MapController.#mount` | docs/map.md | V-15, V-13 | passed | controller.test lifecycle cases; empty status in Chrome (07) |
| C-04 | Deferred destroy across DOM moves; engine replacement keeps camera/pins | map-f-lifecycle, map-f-mount | media `mp-f-lifecycle` precedent | `connect/disconnect/setEngine` | docs/map.md | V-15 | passed | unit tests only; DOM move not exercised in browser |
| C-05 | Store snapshot, microtask batching, per-frame camera coalescing | map-f-store | media store | `state.ts`, `#engineCamera` | docs/map.md | V-15, V-03 | passed | controller.test coalescing; 20 frames/740 ms in Chrome |
| C-06 | Home view (bounds > center/zoom > pins > world); reset | map-f-home | google-map `fitToMarkers` | `homeCamera()` | docs/map.md | V-04, V-15 | passed | unit; reset control in Chrome |
| C-07 | Request pipeline: cancelable `tp-map-request`, NotSupported/NotFound, request-failed | map-f-request, map-f-pre-ready | media `mp-f-request` | `MapController.request` | docs/map.md events | V-05, V-15 | passed | unit; event log in Chrome |
| C-08 | Actions zoom-in/out (250 ms), reset, fly-to, fit-bounds, fit-pins, select-pin, reveal-pin | map-f-actions, map-f-motion | maplibre `easeTo/flyTo`; mapcn MapControls | `zoomIn…revealPin` | docs/map.md methods | V-04, V-06, V-15 | passed | Chrome: zoom +1 exact, reveal 740 ms centered |
| C-09 | Reduced motion → jump; new request/gesture cancels animation (resolves cancelled) | map-f-motion | maplibre `essential` | `#moveTo`, `resolvesReducedMotion` | docs/map.md | V-07, V-15 | passed | Chrome `motion-policy=reduce`: 0 intermediate frames; unit cancellation |
| C-10 | Pins: registration, unique value, placement via slot projection without copying | map-f-pins, map-f-pin-content | Polymer google-map copied innerHTML (rejected) | `tp-map-pin`, manual slot assignment | docs/map.md Pins | V-01, V-08 | passed | Chrome: custom SVG per-pin colors at correct coordinates |
| C-11 | Pin keyboard: one tab stop, arrows (RTL-aware), Home/End, Enter/Space, Escape; reveal on focus | map-f-pin-keyboard | Google accessible markers | `pin.ts #keydown`, `focusPin` | docs/map.md Pins | V-09, V-10 | passed | Chrome real keys incl. RTL and off-screen reveal |
| C-12 | Pin semantics: button, name, aria-pressed, aria-disabled, controls overlay | map-f-pin-semantics | — | `pin.ts render` | docs/map.md | V-11 | passed | a11y snapshot: buttons named, `pressed` |
| C-13 | Selection lane (controllable, reasons, missing pin) | map-f-selection | ControllableState | `TpMap.selectedPin` | docs/map.md | V-06, V-08, V-15 | passed | tp-value-change reasons item-press/keyboard/escape-key/imperative-action observed |
| C-14 | Reveal policy none/if-hidden/always, reveal-zoom | map-f-reveal | — | `#applyReveal` | docs/map.md | V-06 | passed | Chrome list → centered at zoom 15 |
| C-15 | Overlay: Popover anchored to pin, collision boundary, frame tracking, anchor-hidden, dismissal | map-f-overlay, map-l-overlay | Popover `anchored-surface.ts` | `tp-map-overlay extends TpPopover` | docs/map.md Overlay | V-08, V-06 | passed | Chrome open/track/Escape; controls keep it open |
| C-16 | Controls zoom-in/out/reset/fit-pins outside map (`map="id"`), aria-disabled at limits | map-f-controls, map-f-owner, map-l-control | media buttons | `tp-map-control` | docs/map.md | V-04, V-13 | passed | Chrome external group; disabled when no engine (07) |
| C-17 | Appearance: scheme from color-scheme; theme roles with token resolution | map-f-appearance, map-l-presentation | maplibre `setStyle/setPaintProperty`; Google JSON styles | `theme.ts`, `#resolveColor`, adapters | docs/map.md Theming | V-12, V-16 | passed | Chrome live light/dark switch; token theme story |
| C-18 | Events camera-change/commit/press/ready/error | map-f-events | Polymer events | `TpMap` emits | docs/map.md events | V-05, V-03 | passed | event log in Chrome; unit dedupe |
| C-19 | Cooperative gestures / interactive=false | map-f-gestures | maplibre `cooperativeGestures` | adapter options | docs/map.md | V-17 | passed | adapters.test (keyboard handler disabled, option passed); not exercised with real wheel input |
| C-20 | Presentation family/parts/recipe, pin motion role (transform only) | map-l-presentation, §6.1 | — | `families/map.ts`, `recipes/map.ts` | docs/map.md | V-01, V-12 | passed | families.test; Chrome visuals |
| C-21 | Google engine parity (OverlayView pins, tween, scheme re-create with mapId) | map-l-engines | js-api-loader, extended-component-library | `adapters/google.ts` | docs/map.md Engines | V-14, V-18 | blocked | dev-mode (no key) verified placement/click/reveal; cloud mapId scheme re-create unverified without a key |

Record spec/upstream conflicts here before dependent implementation:

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-1 | No map contract existed | all | Author Foundation §18.12 + CL Map + coverage + B.8 | user authorization; commit `77ef963` | passed |
| S-2 | Off-screen keyboard focus hid pins; keyboard selection exempt from reveal | map-f-pin-keyboard, map-f-reveal | reveal on focus; only pointer presses exempt | commit `ff35e54` | passed |
| S-3 | Map controls dismissed the overlay as outside press | map-f-overlay | own controls keep overlay open | commit `ff35e54` | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/foundation/map/` (geo, engine contract, theme, camera tween, state store, controller, adapters) is headless; `src/components/map/` binds it (map root, pin, overlay, control, context)
- Supported exports / registration / constituent API impact: catalog `Map`; `register.ts` defines tp-map first; `elements.ts` tag map; `./map` package subpath and vite entry; foundation index re-export
- Public vocabulary / tokens / parts / presentation review: parts `viewport`, `status`, `controls`, `pin`, `pin-visual`; presentation keys `map`, `map-viewport`, `map-pin`, `map-pin-visual`, `map-overlay`, `map-control`, `map-status`; only existing token roles

### Family dependency map

| Responsibility | Upstream dependency path / symbol          | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Owner lookup by id or nearest portal-aware owner | media `mp-f-owner` | `components/media-player/context.ts` `mediaPlayerOf` | extracted `resolveOwner` in `foundation/portal-ownership.ts`; media migrated | `mediaPlayerOf`, `mapOf` / V-13, V-19 |
| Store and selected subscriptions | media store | `foundation/store.ts` ObservableStore, shallowEqual | reused inside `MapStore` with microtask batching | `TpMap`, constituents / V-15 |
| Selection lane | Base UI controlled/uncontrolled | `foundation/controllable-state.ts` | reused | `TpMap.selectedPin` / V-06 |
| Overlay surface | Popover family | `components/anchored-surface.ts`, `popover/popover.ts` | `TpMapOverlay` subclasses TpPopover (controlled open, anchor = pin) | V-08 |
| Controls | media buttons | `components/button.ts`, `icon.ts` | composed; Button group `groupBoundary` hook added | V-04 |
| Engine stylesheet adoption | content security | `foundation/generated-style.ts` | reused for MapLibre CSS in shadow root | V-01 |
| Reduced motion | motion policy | `foundation/motion.ts` `resolvesReducedMotion` | reused | V-07 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Viewport surface | no shadcn map (mapcn third-party) | mapcn Map container (rounded, bordered) | tokens radius-lg/border/muted | recipe `map` | V-01 |
| Pins | mapcn MarkerContent | mapcn default marker | tokens primary/background/shadow-md | default teardrop marker; authored SVG uses currentColor | V-01, V-12 |
| Overlay | shadcn Popover | `ui` popover registry | `tp-popover` (subclassed) | Popover title/description/content unchanged | V-08 |
| Controls | mapcn MapControls (ButtonGroup) | mapcn controls | `tp-button` outline/icon + `tp-button-group` | joined seams via group boundary hook | V-04 |
| Status | shadcn Empty/Spinner | spinner registry | `tp-spinner`, muted tokens | loading/empty/error text | V-13 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Map stories | zoom/reset group | `tp-button-group` + `tp-map-control` | V-04 | none |
| Map stories | location list | `tp-list-item-group`, `tp-list-item`, `tp-button` | V-06 | none |
| Map stories | overlay link | `tp-button href` | V-08 | none |
| Map stories | pin artwork | authored inline SVG | V-01 | consumer content by design (custom pins) |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01, C-02, C-10, C-20; visual | Default story, dark OS scheme, 1280×900 | OpenFreeMap basemap, Lisbon region, six custom SVG pins at landmarks | as expected after pin color fix | MCP screenshots 01, 03 | passed | observed via the listed tool; artifacts in tmp/component-verification/map/run-1/ |
| V-02 | C-01; behavior | engine mount on load | status ready, tp-map-ready | ready, event fired | MCP evaluate | passed | observed via the listed tool; artifacts in tmp/component-verification/map/run-1/ |
| V-03 | C-05, C-18; behavior | reveal via list | camera-change per frame, one commit | 20 changes / 740 ms, 1 commit | MCP evaluate | passed | observed via the listed tool; artifacts in tmp/component-verification/map/run-1/ |
| V-04 | C-06, C-08, C-16; real pointer | click external Zoom in | zoom +1, request trigger-press | 11.85 → 12.85, request + commit | MCP click | passed | observed via the listed tool; artifacts in tmp/component-verification/map/run-1/ |
| V-05 | C-07, C-18; events | event log during requests | request → value-change → reveal → commit | observed in order | MCP evaluate | passed | observed via the listed tool; artifacts in tmp/component-verification/map/run-1/ |
| V-06 | C-08, C-13, C-14, C-15; real pointer | click list Show (Oceanário) | animated reveal, centered, overlay open, row current | centered (338,191 of 676×382), zoom 15, open | MCP click + screenshot 04 | passed | observed via the listed tool; artifacts in tmp/component-verification/map/run-1/ |
| V-07 | C-09; motion | `motion-policy="reduce"`, select castle | camera jumps | 0 intermediate frames, zoom 15 | MCP evaluate | passed | OS-level reduced-motion emulation not separately tested |
| V-08 | C-10, C-13, C-15; real pointer | click São Jorge pin | overlay opens above pin; list row current | as expected | MCP click + screenshot 03 | passed | observed via the listed tool; artifacts in tmp/component-verification/map/run-1/ |
| V-09 | C-11; real keyboard | Tab into map, ArrowRight/Down, Enter | focus roves; selection keyboard reason; map not panned by arrows | as expected | MCP press_key | passed | observed via the listed tool; artifacts in tmp/component-verification/map/run-1/ |
| V-10 | C-11; real keyboard + RTL | `dir=rtl`, ArrowRight from LX Factory | focus moves to previous (Jerónimos); keyboard selection reveals | as expected | MCP press_key + screenshot 10 | passed | observed via the listed tool; artifacts in tmp/component-verification/map/run-1/ |
| V-11 | C-12; accessibility tree | snapshot | named region, pin buttons with pressed state, named controls | as expected | MCP take_snapshot | passed | screen reader not tested |
| V-12 | C-17, C-20; visual themes | emulate light scheme live | style switches, camera/selection preserved | Liberty light, zoom/selection preserved | MCP emulate + screenshot 05 | passed | observed via the listed tool; artifacts in tmp/component-verification/map/run-1/ |
| V-13 | C-03, C-16; empty state | Google story without key | empty status, controls aria-disabled | as expected | screenshot 07 | passed | observed via the listed tool; artifacts in tmp/component-verification/map/run-1/ |
| V-14 | C-01, C-02, C-21; Google engine | dev-mode (no key) Google engine | pins placed identically; click selects; reveal tween | identical placement; item-press; 42 frames/744 ms centered | MCP + screenshots 08, 09 | passed | watermark/dev-mode only |
| V-15 | C-03..C-09, C-13; unit | `npx vitest run src/foundation/map` | all pass | 38/38 (full suite 1102) | vitest | passed | observed via the listed tool; artifacts in tmp/component-verification/map/run-1/ |
| V-16 | C-17; token theme | Token theme story (scoped dark) | roles resolved from tokens | background #18181b, water #27272a | MCP evaluate + screenshot 06 | passed | observed via the listed tool; artifacts in tmp/component-verification/map/run-1/ |
| V-17 | C-19; gestures | cooperative gestures / interactive=false | option forwarded; handlers disabled | adapters.test | vitest | passed | real wheel/touch not exercised |
| V-18 | C-21; Google mapId scheme switch | Google with mapId and key, toggle scheme | map re-created, camera kept | not run | needs API key and map ID | blocked | no key available |
| V-19 | C-12; automated accessibility + regression | axe-core in page with overlay open; media owner regression | 0 violations | 0 violations after List Item contrast repair; media tests pass | MCP evaluate axe, vitest | passed | observed via the listed tool; artifacts in tmp/component-verification/map/run-1/ |
| V-20 | C-20; responsive | 390×844 mobile touch | no horizontal scroll; usable | scrollWidth 390; overlay fits | screenshot 11 | passed | MapLibre compact attribution initially expanded over a pin |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | `mediaPlayerOf` now delegates to `resolveOwner`; map uses ControllableState, ObservableStore, TpPopover, TpButton |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | screenshots 01/03: Popover, Button group, List Item reused; pin color defect fixed |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | controls inside/outside map, overlay placement props, reveal policy independent |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed | spec authored/committed; references cloned and pinned |
| 1. Capability mapping                 | passed | C-01..C-21 mapped; spec gaps S-1..S-3 resolved |
| 2. Architecture and composition reuse | passed | family, presentation and composition maps above |
| 3. Behavior                           | passed | V-02..V-10, V-15 |
| 4. Presentation and customization     | passed | V-12, V-16; families.test |
| 5. Accessibility                      | passed | V-11 tree, V-09/V-10 keyboard, V-19 axe; no screen-reader claim |
| 6. Visual and interaction inspection  | passed | screenshots 01–11 |
| 7. Documentation and demo reuse       | passed | docs/map.md, map stories, Storybook build |
| 8. Regression and reconciliation      | blocked | V-18 (Google mapId scheme switch with a real key) outstanding |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup.
- [x] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary: new engine-neutral `tp-map` family with MapLibre/OpenFreeMap and Google adapters, spec sections, docs, stories and tests
- Actual delivery claim: complete for the MapLibre/OpenFreeMap engine; Google engine verified in key-less development mode only
- Record checker: see run results in the session
- Non-browser checks: `npx tsc --noEmit` clean; `npm run lint` clean; `npx vitest run` 1102 passed; `npm run build` and `npm run build-storybook` succeeded
- Behavior: V-02..V-10, V-14, V-15 passed
- Accessibility: tree snapshot, real keyboard and axe (0 violations); no screen-reader testing
- Visual/customization/motion inspection: V-01, V-06, V-07, V-12, V-16, V-20
- Documentation and demo composition reuse: docs/map.md; stories reuse Button group, List Item, Button, Popover
- Shared-consumer regressions / package boundaries: media owner lookup, Button group hook, List Item selected contrast; dist has no engine imports
- Required failures or blocked checks: V-18 blocked (needs a Google Maps API key and map ID)
- Older out-of-scope gaps: OpenFreeMap style warns about a missing `wood-pattern` sprite (upstream style)
- Changed source revisions / reopened gates: spec amended to `ff35e54` after browser findings; gates re-run
