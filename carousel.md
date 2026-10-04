# Carousel Foundation and control specification

Status: source-grounded implementation specification and execution plan. This file records proposed additions and reconciliations for the live specifications. It does not replace live authority or claim that runtime code, source-derived tests, browser checks, or specification amendments have been implemented.

## 1. Objective and agreed scope

Replace the incomplete Carousel behavior with a source-derived Foundation implementation adapted from the supplied local Swiper checkout, then bind it to the existing `TpCarousel` / `tp-carousel`. Preserve tested calculations, guard conditions, ordering, fallbacks, and lifecycle behavior. Translate dependencies and framework mechanics into existing Tweakpad infrastructure rather than recreating the interaction from examples.

The delivery remains one catalog control with a reusable programmatic Foundation controller. Lit remains the existing runtime dependency. Do not add Swiper, Embla, React, Vue, a state package, a positioning package, or another runtime dependency.

### 1.1 Confirmed decisions

- Core carousel behavior is included, with virtualization, mousewheel navigation and a draggable scrollbar explicitly included.
- Preserve existing slotted content. Add an independent data/renderer mode; virtualization operates in data mode.
- Preserve the numeric `index` API and numeric value-change payloads. Add controlled `value` / `defaultValue` using numeric indices. Stable item identity is maintained internally and exposed through a separate ID-based controller operation.
- Preserve numeric `autoplay`: zero is off and a positive duration enables automatic advance subject to the live pause rules.
- No public plugin/module system. Required behavior implemented upstream as modules becomes explicit built-in services and options.
- Preserve existing exports, registration, public part hooks and the default footer navigation/fraction arrangement.
- This task writes the specification and plan. Runtime and live-spec changes are subsequent tasks with explicit gates below.

### 1.2 Feature boundary

| Included                                                                                             | Explicitly excluded                                                       |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Core measurement, fixed/fractional/automatic sizing, grouping, centering, containment and snap grids | Multirow Grid module                                                      |
| Transform and native scroll-snap transports                                                          | Free-mode/momentum module and arbitrary unsnapped final states            |
| Pointer/touch, keyboard, mousewheel and nested gestures                                              | Zoom and pinch-zoom module                                                |
| Finite navigation, continuous looping, rewind-style looping                                          | Fade, cube, flip, coverflow, creative and cards effects                   |
| Previous/next controls, bullet/fraction/progress/custom indicators, draggable scrollbar              | Parallax                                                                  |
| Autoplay, accessibility, motion policy and image/content remeasurement                               | Controller-linked carousels and thumbnail synchronization                 |
| Slotted content, immutable data plus Lit renderer, virtual rendering                                 | History/hash navigation, URL mutation and router integration              |
| Responsive configuration, owner environments, SSR-safe import and cleanup                            | Framework wrapper APIs, raw-HTML rendering and public module registration |

The standalone DOM Manipulation module is not exposed: consumer-owned slots and immutable `items` updates supply content changes. Its active-index/cache consequences are still regression obligations where applicable. Excluded module integration branches must be recorded as excluded, not silently deleted from source comparisons.

## 2. Authority, evidence and source map

### 2.1 Baselines

| Source                     | Recorded baseline                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Swiper                     | `external/swiper`, commit `e043db5462adc8cae0751ec148f5cd5cfb92f098`, package version `14.3.0`; clean reference checkout at inspection                                   |
| Library                    | HEAD `a6504d51c71f44a891fddc352e016e02c68d48b3`; unrelated local work is present and must be preserved                                                                   |
| Presentation reference     | `../specification/external/ui`, commit `63c1308d112b6b1205d86244a156cca1abef5087`                                                                                        |
| Live project               | `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, UI Library, version `0.3.15`                                                                                                 |
| Foundation document        | `doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`                                                                                                                               |
| Component Library document | `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`                                                                                                                               |
| Live candidate             | HEAD `8440bff24a97dbbc5c762ebf4bd6baa958b305e1`, state version `5daad6324d67f008ae378650a86e7e961fc91a1025d6107c89be7002caecdfe1`; dirty candidate, zero reported issues |

The candidate contains unrelated changes. Refresh direct Spec Blocks reads before amendments; the recorded state version is evidence, not a reusable mutation token. Do not commit another task's candidate changes.

### 2.2 Governing contracts

| Concern                                       | Live anchor                                                                |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| Carousel behavior                             | `sec-187-carousel`                                                         |
| Carousel control definition                   | `ucl21-carousel`                                                           |
| Controlled/default ownership                  | `sec-52-controlledvaluet`                                                  |
| Change events, reasons and ordering           | `sec-53-changeeventt-and-changereason`                                     |
| Coherent publication and subscriptions        | `sec-54-store-and-subscription-behavior`                                   |
| Atomic state ownership                        | `audit-sec-55-atomic-state-ownership`                                      |
| Direction, identity and owner environment     | `sec-45-direction-identifiers-and-environment-ownership`                   |
| Semantics and disabled/read-only behavior     | `sec-71-semantic-invariants`, `sec-72-disabled-read-only-hidden-and-inert` |
| Pointer capture and cleanup                   | `sec-83-activation-and-pointer-behavior`, `sec-122-scheduling-and-cleanup` |
| Environment, inertness and content security   | `sec-123-environment-and-interaction-services`                             |
| Diagnostics and common failure behavior       | `sec-125-diagnostics`, `sec-1915-common-edge-and-failure-matrix`           |
| Composition coordination                      | `audit-sec-1918-composition-coordination`                                  |
| Definition tables, structure and presentation | `sec-cl-81-definition-record`, `sec-cl-7-structural-layer-merge`           |
| Closed state vocabulary and motion roles      | `sec-cl-111-state-vocabulary`, `sec-cl-158-motion-roles`                   |
| Scroll Area and Pagination boundaries         | `ucl21-scroll-area`, `ucl20-pagination`                                    |

Current Carousel authority already requires stable identity, snap groups, controlled approval before committed movement, horizontal/vertical behavior, logical RTL navigation, exact can-scroll control state, and autoplay pauses for focus, hover, hidden documents, reduced motion and direct manipulation. It requires a full interval after the last pause clears and no finite-end wrapping without Loop.

The opening Foundation wording associates automation with a plugin; later normative text directly specifies optional automatic advance. Amend the opening wording to permit the explicit built-in service. Do not introduce a public plugin API to satisfy that older introductory sentence.

### 2.3 Upstream source map

Paths below are relative to `external/swiper/`.

| ID  | Source                                                                                                                        | Required evidence                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| U01 | `src/core/core.ts`, `src/core/defaults.ts`, `src/types/options.ts`                                                            | Lifecycle, public core methods, runtime defaults, type comments and discrepancies                           |
| U02 | `src/core/update/`                                                                                                            | Size, slides/snap grids, active index, progress, classes, clicked item and auto height                      |
| U03 | `src/core/slide/`, `src/core/translate/`, `src/core/transition/`                                                              | Destination normalization, locks, group movement, closest snap and completion                               |
| U04 | `src/core/events/`                                                                                                            | Pointer/touch eligibility, thresholds, resistance, nested ownership, release, click, native scroll and load |
| U05 | `src/core/loop/`                                                                                                              | Group filling, buffer calculation, permutation, compensation and restoration                                |
| U06 | `src/core/breakpoints/`, `src/core/check-overflow/`                                                                           | Breakpoint lookup/application, relayout ordering, lock/unlock                                               |
| U07 | `src/core/modules/resize/`, `src/core/modules/observer/`                                                                      | Continuous resize, mutation filtering, observer lifetime and fallback                                       |
| U08 | `src/modules/navigation/`, `src/modules/pagination/`                                                                          | Control lookup, visibility, boundaries, indicator modes and renderer callbacks                              |
| U09 | `src/modules/keyboard/`, `src/modules/mousewheel/`                                                                            | Input eligibility, key mapping, wheel normalization, thresholds and release                                 |
| U10 | `src/modules/scrollbar/`                                                                                                      | Thumb sizing, proportional movement, drag offset, hide timing and release snapping                          |
| U11 | `src/modules/autoplay/`                                                                                                       | Timers, pause/resume, delay resolution, direction, transition interaction and disposal                      |
| U12 | `src/modules/a11y/`                                                                                                           | Names, roles, announcements, focus navigation, loop Tab exit and owned inertness                            |
| U13 | `src/modules/virtual/`                                                                                                        | Range, offset, cache, initial window, loop mapping, external rendering and mutation consequences            |
| U14 | `src/shared/`, `src/components-shared/`                                                                                       | Realm-safe parameter merge, element lookup, CSS calculations, lazy preloading and binding updates           |
| U15 | `src/swiper-element.ts`, `src/swiper-element.d.ts`, `src/react/`, `src/vue/`                                                  | Slotted content, property binding, initialize/update/destroy and renderer synchronization semantics         |
| U16 | `tests/element-dom/element-dom.test.mjs`, `tests/element-dom/loop-warning.test.mjs`                                           | Named DOM regressions, including initial virtual rendering, nested events and continuous resize             |
| U17 | `tests/params/cross-realm-params.test.mjs`, `tests/ssr/ssr.test.mjs`, `tests/dist-contract.test.mjs`, `tests/consumer-types/` | Cross-realm objects, SSR, public exports/types and packaging                                                |
| U18 | `CHANGELOG.md`, source-linked issue comments and selected demos                                                               | Historical regressions and capability combinations absent from automated cases                              |

### 2.4 Port discipline

Port/adapt source routines with file, symbol and pinned revision provenance. Preserve the MIT notice in copied/adapted source. Preserve branch order, thresholds, rounding and fallbacks unless a numbered adaptation changes them.

Translate applicable upstream tests before changing the corresponding algorithm. Do not treat Swiper's distribution tests or a working demo as comprehensive behavioral coverage. The inspected checkout has targeted regressions, not an exhaustive validation oracle for every selected combination.

Maintain a branch ledger with `requirementId`, `sourcePath`, `symbol/branch`, `localOwner`, `disposition`, `adaptationId`, `scenarioIds`, `executionEvidence`. Dispositions are `preserved`, `adapted`, `internal`, or `excluded`. Every exported option and relevant early-return/warning branch receives a disposition. A whole-directory reference alone cannot close a capability.

### 2.5 Algorithm-level port anchors

These files are relative to `external/swiper/`. Read the complete routine and its callers before porting; the named guard obligations supplement the acceptance matrix. Keep calculations together with their validation and cleanup branches. A translation of only the successful path is incomplete.

| Routine/file                                                                              | Local owner                      | Branches that must survive the adaptation                                                                                                                                                                |
| ----------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/update/updateSize.ts`                                                           | layout                           | Explicit dimension overrides, zero active-axis size, padding subtraction and finite-size guard                                                                                                           |
| `src/core/update/updateSlides.ts`                                                         | layout                           | Hidden slides, auto measurement, temporary transform restoration, fixed/fractional size, percentage gaps, grouping/skip, centered bounds, insufficient content, terminal snap trimming and edge snapping |
| `src/core/update/updateActiveIndex.ts`                                                    | selection                        | Snap versus item index, normalized index, unchanged logical selection and virtual/loop physical-index conversion                                                                                         |
| `src/core/update/updateSlidesProgress.ts`                                                 | layout/accessibility             | Offset initialization, RTL signs, partial/full intersection and zero-size safety                                                                                                                         |
| `src/core/update/updateProgress.ts`                                                       | controller                       | Zero translation range, boundary tolerance, beginning/end transitions and loop progress                                                                                                                  |
| `src/core/update/updateAutoHeight.ts`                                                     | layout                           | Auto/fixed/multiple visible items, missing rendered refs and empty height candidates                                                                                                                     |
| `src/core/slide/slideTo.ts`                                                               | transport/selection              | Input normalization, destroyed/disabled/transition guards, skip/group snap, direction locks, same-translate branch, native versus transform and completion ownership                                     |
| `src/core/slide/slideNext.ts`, `src/core/slide/slidePrev.ts`                              | selection/loop                   | Auto group, group skip, loop maintenance/transition lock, rewind boundaries and previous-grid rounding                                                                                                   |
| `src/core/slide/slideToClosest.ts`                                                        | selection                        | Snap-neighbor threshold comparisons, first/last bounds and group-to-item conversion                                                                                                                      |
| `src/core/slide/slideToLoop.ts`, `src/core/slide/slideToClickedSlide.ts`                  | loop/selection                   | Logical/physical conversion, seam repair, deferred move validity and clicked-target eligibility                                                                                                          |
| `src/core/events/onTouchStart.ts`                                                         | gesture                          | Pointer/touch identity, button, target/handler/no-swipe ancestry, edge detection, focusable targets, initial coordinates and default prevention                                                          |
| `src/core/events/onTouchMove.ts`                                                          | gesture                          | Owned identity, nested ownership, multi-touch, angle, both thresholds, reversal, loop compensation, resistance, direction restrictions and follow-pointer preview                                        |
| `src/core/events/onTouchEnd.ts`                                                           | gesture                          | Cancel-versus-release, click timing, no-op branches, stop-group distance, exact long/short comparisons and rewind                                                                                        |
| `src/core/events/onClick.ts`, `src/core/events/onScroll.ts`                               | transport/gesture                | Post-drag suppression, native scroll sign/normalization and restoration-event ownership                                                                                                                  |
| `src/core/loop/loopCreate.ts`, `src/core/loop/loopFix.ts`, `src/core/loop/loopDestroy.ts` | loop                             | Group fill, measured eligibility, buffer/offset arithmetic, prepend/append bounds, origin compensation, temporary locks, silent maintenance and original-order restoration                               |
| `src/core/breakpoints/getBreakpoint.ts`, `src/core/breakpoints/setBreakpoint.ts`          | responsive                       | Numeric/ratio selection, base resolution, service toggles, orientation switch, measure-before-reloop and base reset                                                                                      |
| `src/core/check-overflow/index.ts`                                                        | layout/controller                | Offset-dependent extent, snap-count lock, consumer direction restrictions and unlock edge reset                                                                                                          |
| `src/core/modules/resize/resize.ts`, `src/core/modules/observer/observer.ts`              | shared observation binding       | Entry-size history, owner observer construction, mutation filtering, frame coalescing and destruction                                                                                                    |
| `src/modules/navigation/navigation.ts`, `src/modules/pagination/pagination.ts`            | controls                         | Scoped target resolution, independent controls, disabled/hidden state, grouped counts, dynamic window and target replacement                                                                             |
| `src/modules/mousewheel/mousewheel.ts`                                                    | wheel                            | Legacy normalization, axis/RTL/inversion order, thresholds, recent-event throttling, finite-edge release and listener cleanup                                                                            |
| `src/modules/scrollbar/scrollbar.ts`                                                      | shared scrollbar adapter         | Extent/travel, overshoot compression, press offset, native snap lease, pointer cleanup, visibility and release snapping                                                                                  |
| `src/modules/autoplay/autoplay.ts`                                                        | autoplay                         | Delay resolution, transition wait, timer generations, pause causes, finite ends, countdown and destruction; local full-interval policy replaces remaining-time resume                                    |
| `src/modules/virtual/virtual.ts`                                                          | virtual                          | Initial empty range, fractional coverage, loop range/offset, same-range grid update, render barrier and cache invalidation                                                                               |
| `src/modules/a11y/a11y.ts`                                                                | accessibility                    | Role/name ownership, action availability, focus reveal, loop Tab exit, live announcements and attribute cleanup                                                                                          |
| `src/shared/utils.ts`, `src/shared/process-lazy-preloader.ts`                             | existing shared services/loading | Safe parameter merge, realm-safe refs, computed geometry, cancellable native scrolling and adjacent preload boundaries                                                                                   |

Source-specific fields such as `animating`, `isTouched`, `isMoved`, `allowClick`, `allowThresholdMove`, `loopFixed`, pointer/touch IDs and pending resize/virtual tasks need explicit equivalents or an adaptation entry. Do not erase their state-machine meaning by replacing them with a single generic dragging Boolean.

## 3. Existing implementation and shared architecture

### 3.1 Current gaps and compatibility

The current `TpCarousel` in `src/components/display.ts` exposes `index`, `loop` and numeric `autoplay`. It uses horizontal `index * -100%` translation, generic slotted children, native previous/next buttons and a fraction status. It has no measured snap owner, full pointer interaction, full controlled state or complete autoplay pause model. Horizontal arrow interception and direct-index synchronization are incomplete.

These limitations are repair targets, not behavior to preserve. Preserve public identity, numeric selection/event types, numeric autoplay, existing imports, registration and styling hooks. Do not preserve bugs such as swallowing another control's arrows, restarting autoplay while focus remains inside, or leaving slides' inert state stale after an external index change.

Move the substantial implementation into `src/components/carousel/`, retaining compatibility reexports from `display.ts` and the component barrel. Keep `displayMotionRoles.carouselTrack` compatible with the existing `track` descriptor. Do not migrate or rewrite the other display controls.

### 3.2 Proposed responsibilities

```text
src/foundation/carousel/
  index.ts               controller and supported types
  controller.ts          lifecycle, coherent snapshots, actions
  model.ts               logical identity and source order
  layout.ts              source-derived sizing and snap calculations
  selection.ts           adapter to ControllableState, normalization
  loop.ts                source-derived permutation and compensation
  transport.ts           transform/native-scroll adapters
  gesture.ts             source-derived pointer/touch behavior
  wheel.ts               source-derived wheel policy
  responsive.ts          breakpoint resolution and application
  virtual.ts             source-derived virtual range/cache policy
  autoplay.ts            timer policy integrated with shared services
  accessibility.ts       semantics, focus and announcements
  types.ts
  *.test.ts
src/components/carousel/
  index.ts
  carousel.ts            TpCarousel Lit binding and projections
  controls.ts            composed navigation/indicator/autoplay regions
  styles.ts              structural styles only
  motion.ts              existing track role and added internal roles
  *.test.ts
docs/carousel.md
src/stories/carousel.stories.ts
tests/fixtures/components/carousel/index.html
plans/components/carousel/implementation-checklist.md
plans/components/carousel/source-traceability.md
```

These are target artifacts, not existing implementation claims. Split only along meaningful responsibilities. The Foundation controller must operate through a renderer/host adapter without depending on the catalog element.

### 3.3 Shared owner map

| Responsibility          | Existing owner                                                       | Integration decision                                                                                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selection state         | `src/foundation/controllable-state.ts`                               | One numeric lane; index compatibility delegates to it; no parallel controlled store                                                                                                                               |
| Publication             | `src/foundation/store.ts`                                            | Coherent snapshots and stable subscriptions; pending measurement never leaks half-updated arrays                                                                                                                  |
| Mounted collection      | `src/foundation/collection.ts`                                       | Reuse mounted order/eligibility utilities. Carousel model adds logical records for unmounted data, not competing focus/selection machinery.                                                                       |
| Logical model precedent | `src/foundation/choice-model.ts`                                     | Preserve the separation between declarations and mounted refs. Do not reuse Select-specific option/presence semantics as if slides were choices.                                                                  |
| Lifetime and scheduling | `src/foundation/services.ts`                                         | Owner-environment listeners, cancelable scheduled slots, reverse disposal and continued cleanup after errors; repair existing owner if needed                                                                     |
| Environment and IDs     | Existing composed-environment, ID and environment services           | Composed direction, deep active element, owner window/document, stable IDs, reduced motion                                                                                                                        |
| Attributes/inertness    | `src/foundation/owned-attributes.ts`, existing inertness services    | Lease owned state; preserve authored and later consumer changes                                                                                                                                                   |
| Motion                  | `src/foundation/motion.ts`                                           | Existing request/claim/cancel/finished protocol and track role; no second transition lifecycle                                                                                                                    |
| CSP/style transport     | Existing part binding, generated-style and content-security services | CSSOM geometry transport, nonce, disabled-style policy and terminal consumer hooks                                                                                                                                |
| Navigation/actions      | Existing Button and icons                                            | Actual `tp-button`, `type="button"`, localized names and shared icon registry                                                                                                                                     |
| Progress                | Existing Progress                                                    | Real progress control for indicator mode; no styled local progress substitute                                                                                                                                     |
| Scrollbar               | `src/components/scroll-area/controller.ts` and Scroll Area recipes   | Extract shared scrollbar geometry/input/lifetime/rendering owner, consumed by both Scroll Area and Carousel. Native Scroll Area keeps its viewport adapter; Carousel supplies transport/progress and snap policy. |
| Example content         | Existing public content components                                   | Use real Card, Button, Image and applicable families; ordinary text/layout is allowed                                                                                                                             |

Scrollbar extraction must include capture, coordinate scaling, grab offset, geometry, visibility timers, style restoration and structural rendering. Sharing only a clamp function does not satisfy reuse. Test Scroll Area's existing two-axis, RTL, wheel, overflow and capture behavior after extraction.

Do not replace the scrollbar with Slider: Slider is a value input, while this part represents content position and extent. Do not replace carousel indicators with Pagination: the live Pagination definition requires links with destinations, while these indicators are actions.

## 4. Public API and configuration

### 4.1 Root properties

`TpCarousel<T = unknown>` retains `tp-carousel`. Complex inputs are properties only, with `attribute: false`; they are not JSON-decoded from arbitrary strings.

| Property             | Type/default                                                                    | Contract                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`              | `number \| undefined`                                                           | Defined at initialization selects controlled numeric selection. Index refers to source order, not physical loop order.                             |
| `defaultValue`       | `number \| undefined`                                                           | Uncontrolled initial index; absent selects first eligible group. Mutually exclusive with `value`.                                                  |
| `index`              | `number`, reflected compatibility surface; initial 0                            | Reads committed numeric index, with 0 as legacy empty fallback. Writes delegate to the same lane; never establish another state owner.             |
| `orientation`        | `'horizontal' \| 'vertical'`, horizontal                                        | Track, input, snap, scrollbar and keyboard axis. It is not inherited LTR/RTL `direction`.                                                          |
| `loop`               | Boolean false                                                                   | Sole public authority permitting wrapping.                                                                                                         |
| `itemsPerMovement`   | Positive integer 1; `items-per-movement`                                        | Declared group step, mapped to source `slidesPerGroup`.                                                                                            |
| `autoplay`           | Number 0                                                                        | Milliseconds; 0 off, positive finite interval on.                                                                                                  |
| `items`              | `readonly T[] \| undefined`                                                     | Defined, including `[]`, selects data mode. Never mutate the array or items.                                                                       |
| `getItemId`          | `(item, index) => string \| number`                                             | Default primitive string/finite number or object's own `id`; otherwise resolver required. Numeric IDs are IDs only in ID-specific APIs.            |
| `getItemLabel`       | `(item, index) => string`                                                       | Default label or stable ID text; positional fallback for unlabeled slotted content.                                                                |
| `getItemOptions`     | `(item, index) => {disabled?: boolean; autoplayDelay?: number; label?: string}` | Defaults enabled, inherited delay/label; cannot override identity, refs or registration.                                                           |
| `renderItem`         | `(item, context) => Lit content`                                                | Required in data mode for object content; primitive values can render as text. Context includes ID, source index, committed/visible/preview state. |
| `options`            | `CarouselOptions`, empty overrides                                              | Closed configuration groups below. No raw Swiper object or unrestricted option passthrough.                                                        |
| `onControllerChange` | `(controller: CarouselController \| null) => void`                              | Latest callback receives current initialized controller; receives null when that binding is released.                                              |
| `controller`         | Read-only `CarouselController \| null`                                          | Null before usable initialization/after disposal; no stale live handle.                                                                            |

Inherited `disabled`, `readOnly`, label, direction, locale, presentation, motion and content-security behavior apply. If the existing base does not surface read-only state for Carousel, add the declared property in the Carousel binding; do not assume a field-only implementation is inherited.

Disabled/read-only prevent user navigation and mutating controller actions. Explicit controlled owner publication remains authoritative. Read-only content and nested independent actions remain operable; disabled does not justify making arbitrary slide content globally inert.

### 4.2 Configuration shape and precedence

`CarouselOptions` contains only `layout`, `interaction`, `transport`, `loopMode`, `loopOptions`, `breakpoints`, `breakpointsBase`, `navigation`, `indicators`, `scrollbar`, `mousewheel`, `keyboard`, `autoplayOptions`, `virtual`, `messages`, `observation`, and `loading`.

Resolve defaults → base `options` → declared root scalar configuration → matching breakpoint overrides. Breakpoints can override only their enumerated responsive fields. Root disabled/read-only remains a terminal restriction that no breakpoint or service may override.

Undefined inherits. Boolean false disables an optional service. Partial configuration objects merge declared fields. Arrays and element/controller references replace by reference, not deep merge. Null is allowed only where specifically declared. Ignore prototype keys and do not use realm-bound `constructor === Object` checks. Invalid options diagnose and retain the last coherent configuration; at initial binding reject the invalid option group and use its documented default without partially acquiring resources.

Use immutable base parameters for every breakpoint resolution. Do not mutate consumer objects or merge a new breakpoint into the previously effective breakpoint.

### 4.3 Layout options

| Local option                  | Default | Upstream mapping and validation                                                                                                                   |
| ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `itemsPerView`                | 1       | `slidesPerView`; positive finite number, fractional allowed, or `'auto'`                                                                          |
| `gap`                         | 0       | `spaceBetween`; finite nonnegative px or strictly parsed nonnegative percentage string                                                            |
| `groupSkip`                   | 0       | `slidesPerGroupSkip`; nonnegative integer                                                                                                         |
| `groupAuto`                   | false   | `slidesPerGroupAuto`; valid only with auto view and itemsPerMovement=1                                                                            |
| `centered`                    | false   | `centeredSlides`                                                                                                                                  |
| `centeredBounds`              | false   | `centeredSlidesBounds`; requires centered, finite mode and no indicators; source incompatibility made explicit                                    |
| `centerInsufficient`          | false   | `centerInsufficientSlides`; finite mode only                                                                                                      |
| `offsetBefore`, `offsetAfter` | 0       | Source offsets; finite nonnegative px or Foundation resolver returning such a value; resolver runs against current measurement context            |
| `snapToItemEdge`              | false   | `snapToSlideEdge`; active for finite, noncentered auto/fractional layouts; otherwise documented inactive setting                                  |
| `roundLengths`                | false   | Source integer-floor behavior; disabled retains fractional precision                                                                              |
| `autoHeight`                  | false   | Source active/visible item height logic; horizontal mode only to avoid axis feedback                                                              |
| `watchOverflow`               | true    | Source lock/unlock; no meaningful movement still means unavailable controls when false                                                            |
| `measurementOverride`         | absent  | Foundation/test/SSR equivalent of width/height overrides; finite positive supplied dimensions, not a replacement for normal responsive CSS sizing |

Explicit overrides do not imply that a hidden DOM has measured actual size. Snapshots label overridden versus observed measurement so tests cannot mistake synthetic geometry for browser evidence.

### 4.4 Interaction, keyboard and wheel options

| Group               | Options/defaults                                                                                                                                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `interaction`       | `enabled=true`, `target='track'`, `simulateMouse=true`, `threshold=5`, `angle=45`, `ratio=1`, `followPointer=true`, `shortSwipes=true`, `longSwipes=true`, `longSwipeRatio=0.5`, `longSwipeMs=300`                                       |
| Direction/bounds    | `allowPrevious=true`, `allowNext=true`, `oneWay=false`, `resistance=true`, `resistanceRatio=0.85`, `releaseOnEdges=false`                                                                                                                |
| Activation controls | `handle=null`, `noSwipe=true`, `noSwipeSelector='[data-tp-no-swipe]'`, optional `preventActivation(event, context)`, `edgeSwipeDetection=false`, `edgeSwipeThreshold=20`                                                                 |
| Event behavior      | `preventStartDefault=true`, `forcePreventStartDefault=false`, `stopMovePropagation=false`, `preventClicks=true`, `preventClickPropagation=true`, `navigateOnItemClick=false`, `grabCursor=false`, `preventInteractionOnTransition=false` |
| `keyboard`          | Enabled for focused Carousel by default; `pageKeys=false`, `homeEnd=true`. No document-global arrow listener.                                                                                                                            |
| `mousewheel`        | false by default; when enabled: `forceToAxis=false`, `releaseOnEdges=false`, `invert=false`, `sensitivity=1`, `target='root'`, `thresholdDelta=null`, `thresholdTime=null`, `ignoreSelector='[data-tp-no-wheel]'`                        |

Numbers must be finite: thresholds/times nonnegative, angle in `[0,90]`, ratio positive, long-swipe ratio in `[0,1]`, resistance ratio in `[0,1]`, wheel sensitivity positive. Explicit edge detection accepts false, true (yield to browser), or `'prevent'`. Validate selectors on update before binding, and accept explicit element references for handles/targets. Selectors are owner-scoped; no global cross-instance fallback.

Nested coordination is always correct; it is not disabled by a public `nested=false` default. The upstream `nested` flag's listener-order mechanics become an internal composed interaction policy, including coordination with nested non-Carousel controls.

### 4.5 Navigation and indicators

`navigation` defaults to enabled with both controls visible, shared icons, `placement='footer'`, `hideOnClick=false`. It accepts `enabled`, independent `previous`/`next` visibility, `previousElement`/`nextElement`, `icons`, `placement: 'footer' | 'inside' | 'outside'`, and localized labels through messages.

Explicit external elements replace only the corresponding default control. Reject one element assigned both contradictory roles. Preserve authored labels unless the consumer explicitly supplies replacement labels. Disabled attributes belong on the actual actionable element, including Button's internal native action.

`indicators` defaults to `{type:'fraction'}` to preserve existing UI, rather than Swiper's unmounted-by-default bullet module. False removes indicators. Supported options: `type: 'bullets' | 'fraction' | 'progress' | 'custom'`, `clickable=false`, `dynamic=false`, `dynamicCount=1`, `hideOnClick=false`, `opposite=false`, current/total formatters and Lit `renderIndicator` / `renderCustom` callbacks. Custom type requires its renderer. Dynamic count is a positive integer. Dynamic/clickable apply to bullets; opposite applies to progress. Irrelevant combinations diagnose rather than producing misleading controls.

Clickable bullets are real named Buttons; nonclickable bullets are presentation with a group label and current-position description. No generic span receives fabricated button semantics. Fraction uses ordinary text, progress uses existing Progress, and custom rendering must preserve the declared named action/position contract. `tp-pagination` is not used.

### 4.6 Scrollbar and autoplay options

`scrollbar` defaults false. Enabling it resolves `draggable=false`, `thumbSize='auto'`, `visibility='always'`. Visibility uses the existing Scroll Area vocabulary: `always`, `automatic`, `while-scrolling`, `on-hover`. Source `hide=false` maps to always; source hide behavior maps to while-scrolling. The Carousel has one scrollbar on its active axis. Optional explicit element/part targets use the same scoped resolution and lifetime rules as navigation.

`thumbSize` is auto or a finite positive number; clamp to track extent with the shared theme minimum. Snap-on-release is mandatory. The source's optional unsnapped final state is incompatible with the live Carousel contract and is not exposed. Keyboard accessibility applies to an interactive scrollbar even though the original Swiper path emphasizes pointer dragging.

`autoplayOptions` accepts `reverse=false`, `stopAfterInteraction=false`. Per-item delay comes from getItemOptions or authored `data-tp-autoplay-delay`; invalid overrides diagnose and fall back to the valid root interval. Mandatory focus/hover/visibility/motion/gesture pauses and finite-end stopping cannot be disabled. Motion completion precedes scheduling the next full interval; no configurable flag can create overlapping advances.

### 4.7 Virtual, observation, loading and messages

| Group             | Contract                                                                                                                                                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `virtual`         | false by default; data mode only. Enabled defaults `cache=true`, `before=0`, `after=0`, `itemSize=320` for auto-view fixed sizing. Before/after are nonnegative integers; itemSize positive finite.                                                              |
| Virtual rendering | Uses the same `renderItem`; no second raw HTML renderer or independently mutable virtual slides array. Render completion is supplied by the host adapter.                                                                                                        |
| `observation`     | Automatic collection/layout updates are mandatory. `resizeObserver=true`, `windowResize=true`; `observeItemSubtree=false`, `observeParents=false` are optional extra invalidation coverage. Explicit reinitialize remains available.                             |
| `loading`         | `preload=true`, `adjacent=0`; adjacent nonnegative integer. Native image loading plus source-derived neighboring preload traversal, never a new image-loader runtime.                                                                                            |
| `messages`        | Localized previous/next, first/last, slide/position, scrollbar and pause/resume labels; optional committed-position announcement formatter and controller status text. Names/roles mandated by live contracts cannot be disabled through arbitrary role strings. |

`transport` is `'transform'` by default or `'scroll'`. `loopMode` is `'continuous'` by default or `'rewind'`, effective only when root loop is true. `loopOptions` accepts `additionalItems=0`, `fillGroups=true`, `preventDuringTransition=true`; count must be a nonnegative integer.

### 4.8 Public controller and outcomes

The controller provides immutable/coherent snapshots with `initialized`, `measured`, `measurementSource`, `selectedIndex: number | null`, `selectedId`, `snapIndex: number | null`, `snapCount`, `itemCount`, `visibleIds`, `progress`, `previewProgress`, `canScrollPrevious`, `canScrollNext`, `locked`, `animating`, effective orientation/direction/loop mode, and virtual range. Do not expose mutable source arrays or raw physical loop indices.

Methods: `previous()`, `next()`, `scrollToIndex(index)`, `scrollToId(id)`, `reinitialize()`, `subscribe(listener)`, `on(event, listener)`, `off(event, listener)`, `destroy()`, and autoplay `start/stop/pause/resume`. Subscriptions return idempotent disposal. The component owns its controller; consumers of its handle must not leave it half-destroyed and still mounted—destroy makes the binding inert until explicit reinitialize.

Navigation returns `Promise<CarouselNavigationResult>` resolved after settlement or rejection, with `status: 'accepted' | 'unchanged' | 'rejected' | 'cancelled'`, committed index/ID and a reason code. Invalid runtime index requests resolve rejected with diagnostics; they cannot parse a malformed string into a valid index. Direct programmer construction with structurally invalid adapter contracts fails before acquiring resources. No navigation promise rejects merely because a user canceled an action.

`reinitialize()` preserves membership identity when possible, cancels stale work, rebuilds measurement, and returns a completion promise. A controller handle disposed by host disconnect cannot be revived by an old callback; a new host lifetime supplies a new handle. Foundation-owned standalone controllers have explicit init/destroy lifetime and a renderer adapter.

## 5. Selection, identity and event ordering

### 5.1 One numeric lane

Use one `ControllableState<number>` lane. Defined initial value establishes controlled mode for the host lifetime. Uncontrolled initialization chooses validated defaultValue, explicit initial index, or the first eligible group, in that order. Empty collections retain legacy index 0 while snapshot selectedIndex/selectedId and selected markers are absent.

The index compatibility setter performs an imperative selection request after initialization; it does not change controlled mode or bypass cancellation. With value ownership active, a conflicting index write requests the change but cannot publish it unless the owner supplies an accepted value. Conflicting value/default/index initialization diagnoses with value authoritative. Direct canonical value publication uses the existing owner synchronization protocol.

A finite integer navigation index is normalized to the collection boundary and the nearest eligible snap group. Invalid types, fractions, NaN and infinity reject. Negative/out-of-range integer navigation indices clamp; invalid negative default/controlled values are diagnosed as invalid external state, not silently written back to consumers. Ties choose the earlier group. `scrollToId` requires exact typed identity and rejects a missing ID rather than treating it as an array index.

Store original source index on every logical record. Hidden/duplicate/disabled entries must not shift the meaning of public indices by accidentally using a filtered array position. Snap grouping operates over participating geometry with a map back to source indices.

### 5.2 Stable identity and changing content

IDs are strings or finite numbers; distinguish numeric `1` from string `'1'`. Duplicates follow first-coherent-participant rules. Slotted node identity persists while that node persists; changing an authored ID is an explicit identity change, not an invisible rename.

On collection mutation or remeasurement, preserve selected identity first, then find its nearest valid snap. If source order changes its numeric index, propose a correction through the same lane with a registered lifecycle reason. The owner can accept or reject. On controlled refusal, retain the owner's numeric value and report unresolved identity reconciliation; do not falsely mark the item now occupying that numeric index as the previously accepted identity. Navigation remains inert until the owner supplies a valid selection or membership resolves. This is a documented invalid controlled input state, not a second hidden committed value.

Uncontrolled removal chooses the nearest enabled source position, ties earlier, then none. All-disabled/empty collections cannot auto-select a disabled entry. Disabled slides may remain visible content; they cannot lead a selected snap. Duplicate content can remain rendered for author visibility but does not share behavioral IDs or participate twice.

### 5.3 Commit sequence

1. Receive input and let the initiating consumer handler run.
2. Reject ineligible input; otherwise derive destination from current source-derived snap calculations.
3. Validate configuration, membership generation, eligibility and direction locks.
4. Emit the canonical cancelable numeric change request with source event and metadata.
5. In controlled mode wait only for the existing synchronous owner acceptance contract, not a private shadow commit. In uncontrolled mode publish an uncanceled request synchronously.
6. Recompute selected group, availability, controls and semantics in one coherent publication.
7. Move/settle physical presentation toward the accepted destination. For direct manipulation, existing preview is reconciled to the accepted or previous snap.
8. Emit settlement after current motion/native scrolling completes. Announce at semantic completion, not every frame.

Rejected movement restores the committed snap and produces no value commit. No-op navigation produces no redundant value request/commit. A geometry-only adjustment preserving accepted selection does not fabricate a user selection change. Physical loop maintenance and virtual updates never commit a selection.

The current shared `ControllableState.set()` Boolean reports that the proposal was not canceled; by itself it does not prove a controlled owner published a value. Determine navigation acceptance from the resulting committed lane and its publication, not that Boolean. An unacknowledged proposal resolves rejected and restores preview. If the owner synchronously substitutes another valid value, reconcile to that authoritative value and report the actual committed destination rather than claiming the originally requested destination was selected. Reentrant queued actions retain separate operation generations and settle against their own eventual publication.

### 5.4 Events and reason registry

Retain `tp-value-change` / `TpValueChangeEvent<number>` and use `tp-value-commit` through the existing event owner. Details include value, previousValue, reason, sourceEvent, trigger, cancellation and propagation, with metadata for previous/next identity, snap, input kind and operation generation. A synthetic originating event is supplied for non-DOM operations.

Register the exact Carousel lane reasons in the live appendix: `trigger-press` for previous/next activation, `item-press` for direct indicators/item clicks, `keyboard`, `swipe`, `wheel`, `drag` for scrollbar dragging, `track-press`, `imperative-action`, `missing`, `disabled`, `window-resize`, `programmatic` for genuine owner-driven noninteractive updates, and new `automatic-advance` for timer proposals. Initialization uses the registered initial-state policy; do not emit fake user commits on mount. Never label timer/input/lifecycle movement programmatic as a neutral fallback.

Additional noncancelable observation events: `tp-carousel-initialized`, `tp-carousel-reinitialized`, `tp-carousel-progress`, `tp-carousel-settled`, `tp-carousel-lock-change`, `tp-carousel-breakpoint-change`, `tp-carousel-virtual-update`, `tp-carousel-autoplay-state-change`. Progress is explicitly provisional and frame-coalesced. Selection/settled events are not interchangeable. DOM events bubble and compose according to shared policy; Foundation callbacks use stable listener snapshots.

Direct callback errors stop the pending default action and trigger mandatory cleanup/diagnostics. Native DOM dispatch does not throw listener exceptions back to the caller, so catching dispatchEvent is not a veto mechanism; consumers use preventDefault. Postcommit passive observer errors cannot retroactively undo a committed value, but remaining mandatory finalization must run. Document and test this platform distinction.

## 6. Measurement, snap grids and responsive geometry

### 6.1 Measurement states

Separate uninitialized, initialized-unmeasured, measured, and disposed states. Hidden/zero-axis-size mount is valid but unmeasured. Do not infer empty content, divide by zero, issue a loop-shortage warning or publish NaN grids while unmeasured. Preserve logical content/selection and wait for valid owner measurements.

Preserve source size/snap algorithms while validating values before use. In U02, arithmetic can already produce NaN before an undefined check; the port must test finite usable dimensions explicitly. Padding and border calculations use actual axis properties, fractional values and owner-realm computed styles. Temporary removal of transforms for intrinsic measurement is exception-safe and restores only still-owned writes.

Fixed size derives from usable viewport minus gap allocation divided by itemsPerView. Auto sizing measures intrinsic extent, margins and box sizing; it must not assume uniform item extents. Centered positions use adjacent half extents and gap. Preserve floor behavior only when roundLengths is enabled, the near-zero centering tolerance, terminal snap tolerance and normalized index rounding from source.

No dual gap ownership: configured gap is structural spacing between projection shells. Consumer item margins remain content/intrinsic measurement concerns; reject or diagnose a configuration that attempts to apply the same gap through multiple owned layers. Never erase authored item margins wholesale.

### 6.2 Group/snap mapping

Maintain source item records, measured item grid, size grid, navigable snap grid and mappings between them. Group skip affects initial single-item movement. Auto-group mode counts the visible range using source dynamic sizing and applies only with auto view and declared group size one.

Centered bounds and containment may coalesce equal snap coordinates; deduplicate navigable snaps while retaining group membership. Active item is the leading enabled visible item of the committed snap group. Previous/next and indicators use this normalized ordered grid, not `itemCount - 1` arithmetic. Item identity, visible count, snap count and virtual mounted count are different quantities.

For snapToItemEdge, preserve source backward-fit calculation for auto sizes and floor(itemsPerView) for fractional sizes. Do not append the usual arbitrary terminal snap when the option suppresses it. Test its interaction with grouping rather than assuming snap-array indices are item indices.

Centered bounds requires centered, nonlooping content and indicators off, reflecting source's stated incompatibilities. centerInsufficient is nonlooping. These are deliberate validated combinations. snapToItemEdge is documented inactive for centered/loop layouts rather than an implied different algorithm.

### 6.3 Overflow and auto height

Overflow lock follows current extents/snaps. Zero/one movable snap has both directions unavailable. watchOverflow controls lock observation/presentation, not permission to navigate to a nonexistent snap. Consumer direction locks combine with overflow and disabled/read-only state; loop cannot blindly enable controls when nothing can move.

Recompute lock, current group, progress and can-scroll flags together. On unlock, clear stale end-state before navigation. All-fit loop content preserves original order without shortage warnings.

Auto height uses the current accepted visible group and latest item dimensions. Image success/error, fonts/content changes and resize can update it. Zero-duration and hidden states do not lock a stale height. Vertical autoHeight is rejected because changing the active measurement axis feeds layout back into itself.

### 6.4 Responsive rules

Breakpoint keys are nonnegative finite pixel widths or `@ratio` with a finite positive ratio. Compare numeric values precisely; do not inherit parseInt truncation for fractional thresholds. Select the largest matching threshold against owner-window width or configured container width. Ratio thresholds multiply the corresponding base height. Below every threshold restores base configuration.

`breakpointsBase` accepts `'window'`, `'container'`, or an explicit element/resolver; source selector lookup maps to the same owner-scoped resolver used elsewhere. Missing external base keeps the last valid effective configuration and diagnoses; initial absence uses base options without a fabricated match.

Allowed breakpoint fields: orientation, itemsPerMovement, layout fields, loop/loopMode/loopOptions, navigation, indicators, scrollbar, mousewheel, keyboard and interaction restrictions. It cannot change value/defaultValue/index ownership, content mode, items/resolvers/renderers, transport, virtual enablement, or callbacks. Those changes use explicit root updates with their own cancellation/rebind sequence.

Resolve a complete option snapshot; validate all affected groups; cancel incompatible preview; measure with new sizing; then rebuild loop/projection/virtual state. Preserve accepted identity and recompute direction-dependent translation when switching orientation. Emit one coherent breakpoint result, not transient old-size/new-loop snapshots.

### 6.5 Observation and loading

Preserve U07's last-handled ResizeObserver entry sizes rather than comparing delayed entries against newer live dimensions, which previously skipped alternating resize frames. Support array/object contentBoxSize shapes, owner-window observers and fallback resize/orientation listeners.

Observe collection/ref changes and relevant load/error events. Filter owned projection mutations to avoid feedback loops without hiding genuine consumer changes. Cancel pending frame slots before replacing them; disconnected callbacks cannot reinitialize the controller.

Native lazy loading stays consumer-owned. Preload only the declared adjacent logical range, account for loop wrapping without visiting the same ID repeatedly, and request a layout update after load/error. Any loading indicator uses an existing public component; do not duplicate an image-loading subsystem or remove consumer loading attributes indiscriminately.

## 7. Transport, transitions and looping

### 7.1 Transform transport

Port translate/min/max/slideTo/closest-snap calculations, including RTL sign conventions. Direction locks validate the actual proposed movement. Recognize same-translate/different-index normalization without reporting a fake animation. Track progress is physical; committed selection is not updated merely because a pointer passed an item midpoint.

The existing `track` motion role remains `kind='state'`, phase change, non-blocking. Source speed default 300 ms informs the default Carousel presentation motion, resolved through shared motion policy/tokens. Explicit request speed is finite nonnegative; zero/reduced motion completes immediately. Consumer motion drivers use existing claim/cancel/finished handling.

Every movement has a generation. Replacement, direction change, reinitialize or destruction cancels stale completion. Check event target/property; descendant transitions cannot end the track transition. Missing transitionend, driver rejection and interrupted motion take bounded cleanup paths through the shared motion owner. Source temporary transition listeners and delayed tasks cannot survive disconnect.

### 7.2 Native scroll-snap transport

Native transport maps the same logical snaps into CSS snap geometry and owner-normalized scrollLeft/scrollTop. Browser scrolling is provisional until settlement; controls and public selected markers remain committed-state observations. A gesture may physically preview a rejected destination, but rejection restores the accepted snap.

Use native scrollend when available and a cancellable position-stability fallback otherwise. Tag library-originated restoration/teleport writes so their echo scroll events do not start a new user action. Native smooth timing is browser-defined; do not promise transform speed or emit fabricated CSS transition events.

Native transport supports controls, indicators, grouped programmatic navigation, acceptance/rejection, loop maintenance, virtual rendering and the opt-in scrollbar. It does not implement transform resistance or mouse drag simulation merely by setting the same option. Explicit transform-only interaction overrides in scroll mode diagnose; default inactive settings are documented as not used. Browser scroll preview may cross direction locks, but settlement never commits a prohibited destination and restores the accepted snap.

Custom mousewheel navigation owns a wheel event only when enabled and handled; otherwise let the native viewport scroll. Never run both native default scrolling and discrete custom navigation for the same owned event. Control zoom and cross-axis scrolling stay with the browser/appropriate ancestor.

### 7.3 Loop and rewind

Public loop=false always means finite boundaries. With loop=true, continuous mode ports U05's calculated prepend/append permutation, buffer sizing, offsets and translation compensation. Rewind mode maps to source rewind navigation while retaining the public Loop permission; do not expose a conflicting independent rewind boolean.

Compute dynamic visible count only from usable geometry. For unmeasured auto+centered content use the source safe count of one solely as an internal initialization fallback, not proof of final loop eligibility.

Preserve buffer arithmetic: rounded visible count; odd adjustment for centered/offset bidirectional layouts; group-aligned loop buffer; offset contribution based on actual grid step; additional items; initial-end overflow and movement-direction reversal. Internal temporary direction unlocks restore in finally even if a renderer fails.

After measurement validate available real content against required visible range and loop buffer. All-fit locked content does not loop or warn. Genuine shortage with more than one navigable snap selects effective rewind mode and reports the reason; insufficient content cannot run unsafe indexing. Effective mode is visible in the snapshot; do not claim continuous-loop fidelity while falling back.

Group fillers are internally owned inert projection shells, never consumer objects or public IDs. Exclude them from item counts, labels, selection and focus. fillGroups=false with nondivisible groups triggers safe rewind fallback instead of warning and continuing a broken continuous loop.

### 7.4 Projection ownership

Logical source order is authoritative. Loop permutation applies only to internally owned keyed projection shells. For slots, assign scoped generated slot names through OwnedAttributes and render each real child once through its matching shell. Track original slot assignments, filter owned mutations and restore only owned assignments on teardown. Reserved navigation/indicator slots are not slides. Consumer changes to an assigned slot are respected and trigger reconciliation.

Do not reparent or clone light-DOM consumer nodes. Data-mode shells are keyed by typed identity and reconciled by Lit. Loop maintenance waits for renderer completion and updates physical compensation as one generation, preserving focus and logical identity. No transient duplicate IDs, form controls, media players or entity registration are permitted.

Compensation must not emit value changes, index changes, announcements, autoplay restarts or indicator flicker. Restore normal logical shell order when loop turns off. Cancellation rolls physical preview back to accepted state, never overwrites a newer source array.

## 8. Pointer and nested gesture specification

### 8.1 Start eligibility

Validate before storing the active pointer/touch ID or preventing default: connected/live controller, enabled/non-read-only state, primary left button, no existing different owned pointer, valid target on configured surface, permitted mouse simulation, transition policy, consumer veto and a measurable movable range.

Use composedPath for shadow descendants and realm-safe target guards. Preserve source no-swipe/handler ancestry semantics but use owned root traversal rather than global document/window equality. Nested buttons, links, inputs, selects, editable content, Slider handles and Scroll Area thumbs keep their own actions; source-specific handle opt-in must be deliberate.

Do not copy upstream unconditional blur of another active input. Preserve focus unless the initiating interaction explicitly needs a focus change under shared policy. A select interaction cannot leave an active drag flag. Browser edge detection is evaluated in the owner viewport, with default 20 px when enabled.

### 8.2 Tracking and thresholds

Track one pointer or touch identifier; synthesized touch/pointer streams must not duplicate one gesture. Resolve nested descendants innermost first independently of registration order, with one processing token per actual event. A descendant which consumes the movement prevents the ancestor from moving; an eligible edge release hands control back without jumping accumulated origin coordinates.

Preserve the source's two threshold stages: initial Euclidean threshold, then active-axis strict threshold that resets the drag origin upon crossing. Axis detection waits for sufficient movement (source squared-distance threshold 25), compares angle to configured threshold and uses exact-axis fast paths. Tests must cover equality on both thresholds; do not simplify to a single `distance > threshold` rule.

Multiply movement by ratio, apply RTL sign, derive overall swipe direction separately from latest direction, apply one-way behavior, then enforce direction locks. Preserve source boundary resistance equations and ratio; releaseOnEdges disables resistance and yields according to orientation/RTL boundaries.

Follow-pointer=false still records the proposed release position while leaving visual translation at the accepted start. Follow-pointer=true displays provisional translation without writing committed selection. Loop compensation updates stored gesture origin/current translate consistently to avoid jumps, including reversal-reset logic.

### 8.3 Release decision

Flush the last owned movement sample before release. Validate the current source generation and grid again. No movement, zero delta, no swipe direction or unchanged translation is a no-op, except the source loop-reversal reset branch that still requires normalization.

Locate stop group using source skip/group increments and actual grid distances. Guard empty grids and zero group distance before ratio division. Long classification uses `elapsed > longSwipeMs`. For next, source ratio comparison is `>= longSwipeRatio`; previous uses `> 1 - longSwipeRatio` for the forward-side snap. Preserve asymmetry and short-swipe direction behavior. Disabled long/short mode returns to accepted snap. Navigation-button release targets resolve actual action elements through composed paths.

Then propose the destination through section 5; release is not permission to bypass controlled ownership. Capture/listeners are released immediately even if physical settlement remains pending.

### 8.4 Cancellation and clicks

Escape during an owned direct gesture, pointercancel, touchcancel, required capture loss, disable, owner removal or destruction discard uncommitted preview and release resources once. Ordinary pointerleave while capture remains valid does not falsely cancel. Do not inherit upstream's browser-conditional pointercancel handling as permission to leave a non-Safari gesture active or to treat cancellation as a successful swipe.

Preserve normal click/tap if activation never crossed movement threshold. Suppress the owned post-drag activation only; reset suppression in a cancellable next-task slot. Double tap/click uses the source 300 ms timing without inventing Zoom behavior. Do not emit synthetic native clicks in addition to the real button click.

Capture is acquired only for the claimed gesture, on the correct owner element; a capture exception cancels safely. Every terminal path releases capture, listeners, cursor and selection leases, including callbacks that throw. One cleanup error cannot prevent remaining reverse-order disposal.

## 9. Keyboard and mousewheel specification

### 9.1 Keyboard

Use the existing composed focus environment and logical event.key, not document-global numeric keyCode handling. Horizontal previous/next respect inherited direction; vertical uses Up/Down. Cross-axis arrows are not intercepted. Prevent a native key action only when Carousel actually accepts/handles that command.

Ignore consumer-prevented events, modified shortcuts, IME composition and keys owned by nested actions/editors/composites. Home/End target first/last eligible finite snap; optional PageUp/PageDown request previous/next group. Button Enter/Space activation runs its action once and does not become a second Carousel keyboard request.

Focus remains on navigation/indicator controls during selection. Programmatic focus entering an offscreen existing slide may request revealing that slide if permitted, but must not silently change controlled value. On rejection use a connected logical focus fallback rather than hide/inert the active focus without a plan. Tab/Shift+Tab leave the carousel normally; loop never creates an infinite focus cycle.

### 9.2 Wheel

Port source normalization for legacy fields, pixel deltas, line/page modes and Shift-to-horizontal behavior, retaining constants where used: pixel step 10, line height 40 and page height 800. These are source normalization units, not measured CSS line-height claims. If shared Scroll Area normalization differs, share the acquisition/ownership infrastructure and retain explicit per-consumer policy instead of silently changing either algorithm.

Apply axis forcing, dominant-axis choice, horizontal RTL factor, inversion and sensitivity in source order. Validate zero/nonfinite deltas. Reject/ignore browser zoom (`ctrlKey`) and ignored descendants before default prevention. Resolve target element references as elements; do not run a selector API on an element supplied by the consumer.

Port configured delta/time thresholds, source 6-unit/60 ms suppression, recent-event direction/magnitude decisions and animation locks for snap mode. Excluded free-mode momentum branches do not become a hidden feature. At a finite boundary releaseOnEdges permits ancestor scrolling. A throttled event may be consumed only while the Carousel already owns that wheel sequence; unrelated or ineligible input remains native.

Replacing wheel target/options disconnects previous listeners and timers. Multiple instances cannot claim one event independently. Native transport explicitly arbitrates custom wheel navigation versus native scroll; it must not prevent the event before determining eligibility as a blind consequence of cssMode.

## 10. Navigation, indicators and scrollbar behavior

### 10.1 Controls

Previous/next disabled state equals controller availability plus root disabled/read-only. Loop mode alone is not sufficient to enable a control. Visibility, placement, icon rendering, action callback and disabled state are independently specified and tested.

Default controls use actual Button with shared icon definitions, localized accessible names and type button. Preserve consumer handlers before default action. External targets are scoped/resolved without selector fallback into unrelated instances, refreshed on replacement and restored on disposal. If a target disappears, remove that binding without disabling the surviving control.

Hide-on-click excludes descendant controls, interactive slide content and indicator/scrollbar actions. Never hide the currently focused control in response to its own activation. Re-show policy follows focus/hover and explicit configuration; hidden controls are absent from tab order through owned semantics.

### 10.2 Indicator calculations

Port source group-aware current/total calculation, loop normalization and dynamic-bullet offset/window behavior. Replace raw HTML/class-name renderer contracts with Lit content and part contexts. Formatters receive numeric committed current/total values; return string/number text, never HTML interpreted implicitly.

Counts exclude fillers and duplicate/nonparticipating items and use navigable snap groups. Empty fraction is `0 of 0`; progress handles zero denominator. Bullet clicks resolve a current snap ID/index, validate membership and submit the same numeric lane proposal. Current bullet cannot reflect transient loop physical index. Dynamic window changes retain focused bullet or move focus deliberately before removing it.

Custom renderer exceptions cancel the pending render and preserve previous coherent UI. Required roles/names belong to the host/real action owners and cannot depend on a consumer returning a magic class name. Existing authored icons/classes/styles remain controlled through presentation hooks.

### 10.3 Shared scrollbar adapter

Define a shared scrollbar owner with readExtent/readOffset, previewOffset, finish/cancel and canInteract adapters. It owns geometry, input, capture, visibility and cleanup for both Scroll Area and Carousel; structural part rendering and recipes are shared. Carousel finish requests an eligible snap; Scroll Area continues to mirror native continuous position. A canceled Carousel preview restores accepted position without changing Scroll Area's continuous semantics.

Port thumb proportion from viewport/content extent including source offsets/centering, and source boundary compression when preview overshoots. Clamp negative/nonfinite extent/travel. Zero travel cannot divide by zero or capture a pointer. Explicit thumb size cannot exceed track extent. Preserve theme minimum size and scaled track coordinates from existing Scroll Area.

Track press centers the grab on the thumb; thumb press preserves the measured grab offset. Only owning pointer updates; primary/button checks and capture-failure cleanup are mandatory. Pointer release snaps to the accepted destination, pointer cancellation rolls back. Direction/size changes during capture cancel/recompute instead of moving against stale geometry.

Interactive scrollbar exposes an appropriate named scrollbar relationship, orientation, value min/max/now and human-readable position text, with keyboard previous/next/page/Home/End through the same controller. Noninteractive scrollbar is presentation, not a fake focusable input.

For while-scrolling visibility, preserve source's 1000 ms inactivity delay and 400 ms fade as presentation defaults, routed through shared scheduling/motion. Keep visible while hovered, focused or dragging; reduced motion removes fade without disabling hide/show semantics. No hidden-but-focusable thumb. Native snap suppression is a lease: restore only the value still owned by the gesture.

## 11. Autoplay contract

Automatic advance is off by default. Root autoplay is a finite positive interval when enabled; invalid intervals diagnose and disable scheduling rather than creating a zero-delay frame loop. Per-item positive delay overrides are resolved for the committed item, including virtual data not currently represented by a stale DOM node.

Pause reasons are a set: explicit pause, focus-within, hover, document hidden, reduced motion, gesture, scrollbar interaction, disabled/read-only, unmeasured/locked layout, pending render/transition and unresolved controlled selection. Clearing one does not clear the others. Start/resume cannot override a mandatory reason.

After accepted movement and after the last pause clears, schedule a full newly resolved interval. Do not resume an old fractional remainder: the live contract explicitly requires a fresh interval. Reverse direction is supported. At a finite end stop; rewind is only available under public loop. One meaningful snap never runs a timer solely to emit repeated unchanged events.

stopAfterInteraction explicitly stops running state after user navigation; otherwise gesture/focus/hover pauses resume under the same full-interval rule. A rejected timer proposal pauses with a rejection reason until explicit resume or a relevant authoritative update; it must not repeatedly pressure a controlled owner every frame.

Provide an actual named pause/resume Button while autoplay is configured, before moving slide content in logical action order. Manual pause remains until manual resume. Visible text/icon and accessible name reflect running/paused state without using toggle semantics incorrectly.

Autoplay progress/time-left is optional observable state from the same scheduler, clamped to `[0, interval]`. Only acquire an animation-frame countdown while it has a subscriber/rendered consumer. Timer expiry carries selection and lifecycle generations. Transition completion cannot resume a stopped or disconnected instance. Teardown clears timeout, countdown frame, delayed gesture pause, transition listener and all environment subscriptions.

Record source differences: runtime disableOnInteraction=false despite its comment; pauseOnMouseEnter is not enabled by default upstream; upstream can wrap a finite carousel when stopOnLastSlide=false; remaining-time resume differs from Tweakpad's full interval. The local live contract wins in all four cases.

## 12. Accessibility, focus and environment ownership

Root is a named region with carousel description. Items expose group semantics and slide description with stable logical position and set size. Use supported role attributes correctly; do not put aria-setsize/posinset on unsupported roles merely to duplicate label information. Supply localized position text where native roles require it.

Preserve authored labels/descriptions and merge owned relationships. Do not replace all slide attributes or remove whole style attributes on destroy. Attributes/styles written later by a consumer win over stale restoration.

Offscreen content excluded from keyboard navigation is leased inert while committed visible items remain operable, including multiple visible slides. Partial visibility uses measured positive intersection, not only selectedIndex. Do not hide/inert the element containing focus until focus is safely retained or transferred. Loop fillers and duplicate projections are never exposed as real slides.

Keep the actual control focused on navigation. Focus-driven reveal uses accepted logical identity. Removed focused content uses nearest connected visible/eligible fallback, then a named root/action; no detached focus target. In loop mode Tab exits at logical edges rather than following endlessly permuted physical order. Virtual focus pinning prevents window recycling from discarding an active descendant.

Use one owned polite announcement path for accepted user navigation/settlement and relevant boundary feedback. Suppress per-frame, loop-maintenance and automatic-motion chatter. Autoplay live behavior is off for automatic advances; pause/resume state has concise explicit feedback. Deduplicate equivalent announcements and cancel stale messages after replacement/disposal.

Resolve documents, windows, constructors, active elements and root queries from actual refs. No process-global document listeners that survive the instance. Same-origin embedded owner contexts work without realm-bound checks; inaccessible documents are not traversed. SSR import and construction acquire no DOM observer/timer. Optional host service absence has a declared fallback; simulated geometry is not browser proof.

CSP nonce/disabled-style policy applies to every generated resource. Geometry uses existing CSSOM/part transport. Consumers replacing dictionaries, direction or themes retain identity, focus and state. Restrict motion styles to owned shells, not arbitrary slotted component internals.

## 13. Data rendering and virtualization

### 13.1 Content mode

Undefined items selects slots. Defined items, including empty, selects data. Supplying data and default slide children is invalid: on initial conflict data wins with a diagnostic; later conflicting updates retain the coherent mode until resolved. Reserved control slots are allowed in either mode.

Switching content mode or renderer identity is an explicit generation change: cancel gesture/animation/virtual work, retain the selected stable ID if it exists in the new model, otherwise resolve nearest eligible selection through section 5. Destroy obsolete caches/refs and restore owned slot assignments. No mixed owner can mutate the same slide.

Strings are text unless the consumer deliberately produces Lit templates through renderItem. No internal unsafeHTML/setInnerHTML translation of upstream renderSlide strings. Existing custom elements render as actual instances, not cloned shadow roots.

### 13.2 Source-derived range

Port U13's centered/noncentered before/after calculations from active index, visible count, group and overscan. Normalize rendered boundaries to integer indices covering all intersecting slides; fractional itemsPerView must not create fractional array access or omit a partially visible last slide.

Initialize range `from=0, to=-1` so the first real update always renders slide zero. Empty count retains an empty range and never performs modulo zero. Nonzero initial selection gets its full initial window before measuring/focusing. Single-item input renders exactly one real item.

For auto view in virtual mode, itemSize is the source fixed dimension (default 320 px), not an estimate promising arbitrary variable-size virtualization. Use ceil(viewport/itemSize) with minimum one for usable initialization. Real variable-size auto layout remains supported without virtualization. A consumer requesting incompatible variable virtual extents gets an explicit diagnostic rather than silent drift.

Loop virtual positions can be outside logical `[0,count)`; map via normalized modulo for any number of cycles, not a single add/subtract that can still be out of range. Preserve source offset arithmetic and RTL right/vertical top mapping. Never render the same real interactive ID twice; overscan that would duplicate a real item is clamped/deduplicated. Insufficient distinct items uses the same safe effective rewind fallback.

### 13.3 Cache and updates

Cache by typed item ID and renderer/content generation. Index is mapping metadata, not cache identity. Retain data object references without mutating them. Cache=true reuses valid keyed views; cache=false releases off-window views except focus-pinned content. Removed IDs and replaced renderer generations are evicted and disposed.

Insertion/prepend/removal/reorder preserves selected identity and recalculates numeric index. Do not inherit truthiness checks that discard `0`, false-valued payload fields, or empty strings. Validate multiple removal indices in upstream-derived tests even though public mutation is expressed as a new items array, because cache-shift mistakes remain relevant.

An unchanged from/to range still updates offsets and progress when the grid changes. Await Lit updateComplete/ref registration before reading new dimensions. Tag each render request with lifecycle, data and layout generations. A slow old render cannot overwrite newer selection/window/style state, emit stale virtual-update, or restart autoplay.

Read-only virtual snapshot includes logical range, offset, visible IDs and mounted IDs; a focused retained item may sit outside the nominal window and is explicitly identified. No public mutable virtual cache, append/prepend/remove API or independent slides store is exposed. Foundation custom host adapters provide a render-completion promise, preserving external-render capability without requiring consumer calls into private update routines.

## 14. Public parts, presentation and motion

### 14.1 Canonical anatomy

| Public part      | Foundation part           | Part slot                   | Exposure                                                     |
| ---------------- | ------------------------- | --------------------------- | ------------------------------------------------------------ |
| Root             | Carousel.Root             | `carousel`                  | Existing public owner host                                   |
| Viewport         | Carousel.Viewport         | `carousel-viewport`         | Exactly one operational viewport                             |
| Track            | Carousel.Track            | `carousel-track`            | Exactly one track within viewport                            |
| Item             | Carousel.Item             | `carousel-item`             | Repeated owned projection with consumer content              |
| Previous         | Carousel.Previous         | `carousel-previous`         | Optional independent action                                  |
| Next             | Carousel.Next             | `carousel-next`             | Optional independent action                                  |
| Indicator        | Carousel.Indicator        | `carousel-indicator`        | Optional indicator region, repeated actions where applicable |
| Controls         | Synthesized layout        | `carousel-controls`         | Existing controls hook formalized                            |
| Status           | Committed position text   | `carousel-status`           | Existing status hook formalized                              |
| Scrollbar        | Shared scrollbar owner    | `carousel-scrollbar`        | Zero or one, active axis                                     |
| Thumb            | Shared scrollbar owner    | `carousel-thumb`            | One within enabled scrollbar                                 |
| Autoplay control | Button + autoplay service | `carousel-autoplay-control` | Required when automatic advance is configured                |
| Announcements    | Accessibility service     | `carousel-announcements`    | One owned hidden region                                      |

| Public control | Kind              | Variant axes and defaults                   | Fixed or re-defaulted foundation properties                                                                    | Surfaced hidden-part properties                                                                      |
| -------------- | ----------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Carousel       | compound-reexport | Orientation horizontal/vertical; horizontal | Numeric compatibility lane; footer navigation and fraction default; mandatory snap settlement and pause policy | Measurement/snap identity, transport, input, loop, virtual and built-in service options in section 4 |

### 14.2 Closed key inventory

| Part             | Cardinality/containment                    | Presentation keys                                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root             | One owner                                  | `carousel`, `carousel-orientation-horizontal`, `carousel-orientation-vertical`                                                                                                                                                                            |
| Viewport         | One in Root                                | `carousel-viewport`, `carousel-viewport-orientation-horizontal`, `carousel-viewport-orientation-vertical`                                                                                                                                                 |
| Track            | One in Viewport                            | `carousel-track`, `carousel-track-orientation-horizontal`, `carousel-track-orientation-vertical`                                                                                                                                                          |
| Item             | Zero or more in Track                      | `carousel-item`, `carousel-item-orientation-horizontal`, `carousel-item-orientation-vertical`                                                                                                                                                             |
| Previous         | Zero or one generated role                 | `carousel-previous`, `carousel-previous-orientation-horizontal`, `carousel-previous-orientation-vertical`                                                                                                                                                 |
| Next             | Zero or one generated role                 | `carousel-next`, `carousel-next-orientation-horizontal`, `carousel-next-orientation-vertical`                                                                                                                                                             |
| Indicator        | Zero or one region with zero or more items | `carousel-indicator`, `carousel-indicator-orientation-horizontal`, `carousel-indicator-orientation-vertical`, `carousel-indicator-type-bullets`, `carousel-indicator-type-fraction`, `carousel-indicator-type-progress`, `carousel-indicator-type-custom` |
| Controls         | Zero or one group                          | `carousel-controls`, `carousel-controls-placement-footer`, `carousel-controls-placement-inside`, `carousel-controls-placement-outside`                                                                                                                    |
| Status           | Zero or one position text                  | `carousel-status`                                                                                                                                                                                                                                         |
| Scrollbar        | Zero or one active-axis region             | `carousel-scrollbar`, `carousel-scrollbar-orientation-horizontal`, `carousel-scrollbar-orientation-vertical`                                                                                                                                              |
| Thumb            | One within scrollbar                       | `carousel-thumb`, `carousel-thumb-orientation-horizontal`, `carousel-thumb-orientation-vertical`                                                                                                                                                          |
| Autoplay control | Zero or one action                         | `carousel-autoplay-control`                                                                                                                                                                                                                               |
| Announcements    | One owned region when initialized          | `carousel-announcements`                                                                                                                                                                                                                                  |

The existing root/viewport/track/previous/next/controls/status CSS parts remain aliases on the same owned nodes or supported exported parts. Do not silently move a hook behind an inaccessible shadow boundary. Public action parts style real Button through supported hooks, not private selectors.

Map selected/current, disabled, orientation and existing common state markers to live vocabulary. Proposed additions requiring vocabulary review are `dragging`, `transitioning`, `locked`, `visible`, `fully-visible`, `autoplay-running`, `autoplay-paused`, and `virtual`. Reuse an existing identical managed term rather than minting synonyms. State belongs on its owner, not indiscriminately every descendant.

Track movement retains its existing motion role. Add auto-height and scrollbar-visibility roles only through the live motion inventory; define completion as non-blocking and cancellation behavior. Geometry projection itself is not an independent consumer appearance animation that can corrupt snap calculations.

### 14.3 Presentation source chain and examples

Trace `../specification/external/ui/apps/v4/registry/bases/base/ui/carousel.tsx` through its shared Button and `registry/styles/style-vega.css` carousel selectors. The reference uses overflow clipping, a flex track, intrinsic shrink/grow/basis behavior, orientation-aware item spacing, outside controls, icons and rounded shared Button treatment.

Adapt appearance to existing Tweakpad recipes: footer navigation remains the compatibility default, inside/outside are explicit choices, gap uses one owner, and icons use the existing registry. No external utility-class stylesheet is imported. Preserve semantic tokens and terminal dictionary/part overrides without `!important` escalation.

Publish one canonical slotted example, one distinct data/virtual example and one controlled example as warranted by the API. Other combinations belong in durable fixtures, not a Docs gallery of every attribute. Both rendered examples and copyable code reuse real public components. Do not publish a hand-built card/button/progress substitute to make Carousel look correct.

## 15. Complete upstream disposition and discrepancy register

### 15.1 Core option disposition

This table closes the source-default surface; detailed defaults and validations are above. Public type-only fields and module options must be reconciled against the same ledger during implementation, without adding arbitrary pass-through properties.

| Upstream surface                                                                                                                                                             | Local disposition                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| init, initialSlide, runCallbacksOnInit                                                                                                                                       | Host lifecycle/defaultValue/index and initialized notification; no fake initial change commit                                                                        |
| direction                                                                                                                                                                    | orientation; inherited direction remains LTR/RTL                                                                                                                     |
| speed, preventInteractionOnTransition                                                                                                                                        | Shared motion request duration and interaction policy                                                                                                                |
| cssMode                                                                                                                                                                      | transport=scroll with documented native differences                                                                                                                  |
| updateOnWindowResize, resizeObserver, observer, observeParents, observeSlideChildren                                                                                         | observation group plus mandatory membership/ref invalidation                                                                                                         |
| nested                                                                                                                                                                       | Internal always-correct nested coordination                                                                                                                          |
| enabled                                                                                                                                                                      | Root disabled/read-only plus service enabled policy; no competing inverse public root state                                                                          |
| width, height                                                                                                                                                                | measurementOverride for explicit measured-host/SSR/test use                                                                                                          |
| userAgent, url                                                                                                                                                               | No public UA spoofing/URL API; owner capability detection, no URL navigation                                                                                         |
| touchEventsTarget, simulateTouch, touchRatio, touchAngle, threshold, followFinger, allowTouchMove                                                                            | interaction target/simulateMouse/ratio/angle/threshold/followPointer/enabled                                                                                         |
| shortSwipes, longSwipes, longSwipesRatio, longSwipesMs                                                                                                                       | interaction swipe classification settings                                                                                                                            |
| touchMoveStopPropagation, touchStartPreventDefault, touchStartForcePreventDefault                                                                                            | Declared event policy subordinate to native action safety                                                                                                            |
| edgeSwipeDetection, edgeSwipeThreshold, touchReleaseOnEdges                                                                                                                  | Browser-edge/yield policy                                                                                                                                            |
| resistance, resistanceRatio, oneWayMovement, allowSlidePrev, allowSlideNext                                                                                                  | interaction resistance/oneWay/direction locks                                                                                                                        |
| noSwiping, noSwipingClass, noSwipingSelector, swipeHandler, focusableElements                                                                                                | Owned no-swipe selector/handle plus shared composed interactive-target policy; no brittle global selector list                                                       |
| slidesPerView, spaceBetween, slidesPerGroup, slidesPerGroupSkip, slidesPerGroupAuto                                                                                          | layout itemsPerView/gap, root itemsPerMovement, groupSkip/groupAuto                                                                                                  |
| centeredSlides, centeredSlidesBounds, centerInsufficientSlides                                                                                                               | Validated centering settings                                                                                                                                         |
| slidesOffsetBefore, slidesOffsetAfter, snapToSlideEdge, roundLengths                                                                                                         | Layout offsets/edge snapping/rounding                                                                                                                                |
| normalizeSlideIndex                                                                                                                                                          | Mandatory normalized valid destination; disabling it cannot bypass contract                                                                                          |
| autoHeight, watchOverflow                                                                                                                                                    | layout settings with local invariants                                                                                                                                |
| setWrapperSize                                                                                                                                                               | Internal geometry transport decision; not a public appearance toggle                                                                                                 |
| virtualTranslate                                                                                                                                                             | Internal motion/renderer adapter responsibility; no public effect feature                                                                                            |
| effect                                                                                                                                                                       | Fixed slide effect; other effects excluded                                                                                                                           |
| breakpoints, breakpointsBase                                                                                                                                                 | Closed responsive whitelist and owner-scoped bases                                                                                                                   |
| uniqueNavElements                                                                                                                                                            | Mandatory owner-safe lookup; no global bind-all fallback                                                                                                             |
| preventClicks, preventClicksPropagation, slideToClickedSlide, grabCursor                                                                                                     | interaction click policy/navigateOnItemClick/grabCursor                                                                                                              |
| loop, loopAddBlankSlides, loopAdditionalSlides, loopPreventsSliding, rewind                                                                                                  | Root Loop, loopOptions and mutually exclusive effective loopMode                                                                                                     |
| watchSlidesProgress                                                                                                                                                          | Internal required visibility/progress observation, subscription-driven where possible                                                                                |
| lazyPreload, lazyPreloadPrevNext, lazyPreloaderClass                                                                                                                         | loading group and real existing loader component/presentation if needed                                                                                              |
| maxBackfaceHiddenSlides                                                                                                                                                      | Internal rendering optimization; preserve source threshold 10 when used, never affect semantics                                                                      |
| passiveListeners                                                                                                                                                             | Internal correct per-event registration; no consumer option that makes required prevention impossible                                                                |
| createElements, swiperElementNodeName, eventsPrefix                                                                                                                          | Tweakpad's fixed owned anatomy, registration and event vocabulary                                                                                                    |
| containerModifierClass, slideClass, slideBlankClass, slideActiveClass, slideVisibleClass, slideFullyVisibleClass, slideNextClass, slidePrevClass, wrapperClass, _emitClasses | Existing part/dictionary/state system; no public Swiper class namespace                                                                                              |
| on/onAny/once/off/emit and module registration methods                                                                                                                       | Typed controller subscriptions and DOM events; preserve observation/lifetime capabilities, exclude arbitrary module installation and public internal-event injection |
| get/setTranslate, min/maxTranslate, transition methods and loopFix internals                                                                                                 | Internal adapters and read-only snapshots, not public bypasses around controlled selection                                                                           |
| append/prepend/add/remove methods                                                                                                                                            | Immutable items/consumer slot updates, no direct mutation of renderer-owned data                                                                                     |

Navigation class/icon injection options translate to Button, icon and public part hooks; default/icon/visibility/external-target capabilities remain. Pagination string renderers become typed Lit renderers; class tokens become dictionary/state keys. A11y free-form role overrides cannot contradict mandatory semantics. Virtual renderExternal becomes the host render-completion adapter; its cache mutation methods are internal. Scrollbar unsnapped release is deliberately not supported under a snap-based contract.

### 15.2 Intentional adaptations

| ID   | Evidence/risk                                                            | Required adaptation                                                                          |
| ---- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| A-01 | slideTo accepts parseInt strings and incompletely guards nonfinite grids | Strict typed index/config validation; finite geometry before calculations                    |
| A-02 | Some zero-size checks occur after arithmetic                             | Explicit unmeasured state; no NaN snaps or false shortage                                    |
| A-03 | Source physical activeIndex changes during gesture/loop                  | Separate preview/physical position from one committed numeric lane                           |
| A-04 | DOM loop reorders slides                                                 | Permute owned projection shells, preserve consumer node order and identity                   |
| A-05 | Loop warning can leave unsafe behavior running                           | Measured eligibility, deterministic rewind fallback, no unsafe continuation                  |
| A-06 | Loop + rewind can conflict                                               | One public Loop permission and exclusive loopMode                                            |
| A-07 | Source native mode omits transform capabilities/events                   | Explicit transport compatibility and real scroll settlement contract                         |
| A-08 | Native scroll and custom wheel can both move/prevent prematurely         | One event owner and no duplicate movement                                                    |
| A-09 | Global document/window and realm-sensitive checks                        | Existing owner-environment and safe merge services                                           |
| A-10 | Source focus blur and global keyboard listener                           | Local logical-key/focus policy and independent nested controls                               |
| A-11 | Browser-specific pointercancel early returns                             | Uniform discard-preview/release policy, no stranded gesture                                  |
| A-12 | Upstream autoplay wraps finite ends and resumes remaining time           | Live no-wrap/full-interval multi-reason pause rules                                          |
| A-13 | Runtime autoplay disableOnInteraction differs from comment               | Record actual false baseline; explicit local stopAfterInteraction option                     |
| A-14 | Scrollbar hide/snap comments differ from runtime                         | Runtime hide=false/snap=true evidence; local mandatory snap and shared visibility vocabulary |
| A-15 | Pagination hideOnClick comment differs from runtime                      | Runtime false; explicit local default false                                                  |
| A-16 | Virtual cache is indexed and mutation paths use truthiness               | Typed ID/generation cache, preserve falsy data, coherent immutable replacement               |
| A-17 | Virtual loop remapping only adjusts one cycle                            | Safe modulo, empty guards and no duplicate real interactive render                           |
| A-18 | Auto virtual size is fixed, not arbitrary measured virtualization        | Expose explicit itemSize 320 default; no unsupported claim                                   |
| A-19 | HTML string renderer and innerHTML source paths                          | Lit/text rendering only                                                                      |
| A-20 | destroy can remove whole style attributes                                | Owned writes restored without erasing consumer styles                                        |
| A-21 | Async frames/listeners can outlive configuration                         | Lifecycle/layout/data/movement generations and complete cancellation                         |
| A-22 | Legacy Carousel had no coherent controlled owner                         | Numeric compatibility adapter over shared ControllableState                                  |
| A-23 | Generic Pagination looks similar but represents links                    | Button indicators and real Progress, no link-semantic substitution                           |
| A-24 | Source scrollbar duplicates existing local family behavior               | Actual shared owner/rendering used by Scroll Area and Carousel                               |
| A-25 | Breakpoint mutation can retain prior overrides                           | Immutable-base resolution, precise numeric thresholds and validated whitelist                |
| A-26 | Listener/animation/cleanup exceptions may interrupt terminal work        | Shared exception-safe cleanup; DOM dispatch exception boundary explicit                      |
| A-27 | Delayed controlled identity reconciliation can select wrong replacement  | Preserve authoritative value without false marker; explicit unresolved reconciliation        |
| A-28 | Lifecycle/loop maintenance can look like selection                       | Typed distinct observation events, no fabricated commits/announcements                       |

## 16. Validation and regression acceptance matrix

### 16.1 Existing tests and evidence limits

Translate relevant U16/U17 tests into the local harness. Source suite categories are DOM element behavior, loop warnings, cross-realm params, SSR imports/initialization, distribution contracts and consumer types. They are not all real-browser tests: the DOM suite uses happy-dom and cannot prove layout, pointer capture or visual alignment.

Named regressions to retain include slotted-slide detection, explicit navigation targets avoiding duplicate default controls, initial virtual slide zero/single item, direction/rtlTranslate changes, loop-fix silence, descendant transitionend filtering, nested init-order independence, deferred initialization, continuous resize, auto+centered hidden loop warnings, actual shortage and breakpoint all-fit lock/unlock.

Wrapper-specific exports/framework hooks and excluded effect tests are classified explicitly. Their transferable renderer/lifecycle behavior is still tested locally. Do not install upstream development dependencies into this package solely to run their harness, and do not update the reference checkout.

### 16.2 Capability index

| ID   | Capability                                 | Source/authority          | Mandatory scenarios |
| ---- | ------------------------------------------ | ------------------------- | ------------------- |
| C-01 | Public numeric compatibility and ownership | Live state, U01/U03       | V-01–V-08           |
| C-02 | Logical identity/content mode              | Live collection, U15      | V-09–V-15           |
| C-03 | Measurement and snap math                  | U02/U03                   | V-16–V-25           |
| C-04 | Responsive/overflow                        | U06/U07                   | V-26–V-31           |
| C-05 | Loop/projection                            | U05                       | V-32–V-39           |
| C-06 | Pointer/nesting/clicks                     | U04                       | V-40–V-51           |
| C-07 | Keyboard/focus input                       | U09/U12                   | V-52–V-55           |
| C-08 | Wheel                                      | U09                       | V-56–V-60           |
| C-09 | Transport/motion                           | U03/U04                   | V-61–V-66           |
| C-10 | Navigation/indicators                      | U08                       | V-67–V-72           |
| C-11 | Shared scrollbar                           | U10/local Scroll Area     | V-73–V-78           |
| C-12 | Autoplay                                   | U11/live pause contract   | V-79–V-85           |
| C-13 | Virtual rendering/cache                    | U13/U15                   | V-86–V-95           |
| C-14 | Accessibility/environment                  | U12/U14                   | V-96–V-101          |
| C-15 | Cleanup/reactivity/errors                  | U01/U07/U14               | V-102–V-106         |
| C-16 | Presentation/docs/package                  | Live component definition | V-107–V-112         |

### 16.3 Required scenarios

All rows are planned and **pending** until implementation evidence exists. In the implementation checklist, each needs setup, expected result, actual result, tool/command, evidence path and status. Unit proof, real input, geometry measurements, accessibility tree, automated analysis and visual inspection are distinct evidence categories.

| ID    | Setup/input                                                                   | Required result                                                                           |
| ----- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| V-01  | Existing default slot example and numeric index/autoplay attributes           | Same public identity/types and usable default composition; no required migration          |
| V-02  | Controlled value, uncontrolled default, both supplied, mode switch attempt    | One lifetime owner; invalid combinations diagnose; controlled requests cannot self-commit |
| V-03  | index setter before/after init and with controlled value                      | Compatibility delegates to lane; no competing owner or silent mode switch                 |
| V-04  | Accepted, vetoed and unacknowledged numeric proposals                         | Correct event order and numeric payload; rejected preview returns to accepted snap        |
| V-05  | Negative/large integer, fraction, NaN, infinity and numeric string navigation | Declared clamp versus reject policy; no parseInt coercion or NaN transform                |
| V-06  | Reentrant change handler and direct callback exception                        | Queued coherent action; direct failure stops default; remaining finalization runs         |
| V-07  | No-op, geometry-only update and loop compensation                             | No duplicate value request/commit or false selected marker                                |
| V-08  | Button/key/pointer/wheel/timer/imperative/lifecycle movement                  | Exact registered reasons and source events; no timer programmatic fallback                |
| V-09  | IDs 0, empty string, numeric/string variants, invalid and duplicate IDs       | Typed identity; first coherent participation; no duplicate behavioral IDs                 |
| V-10  | Insert/prepend/reorder around selected ID                                     | Identity retained; correct numeric correction through ownership contract                  |
| V-11  | Controlled owner refuses identity/index correction                            | No false selection of replacement item; diagnosed unresolved state                        |
| V-12  | Selected removal, disabled selection, all-disabled and empty                  | Nearest eligible/none policy and unavailable controls, no accidental activation           |
| V-13  | Slot node removal/reinsert, authored ID or slot update                        | Stable node identity until explicit change; original slot ownership restored              |
| V-14  | Mixed slot/data input and mode switch during drag                             | Declared winner/retention policy; old work canceled; no two content owners                |
| V-15  | Renderer/resolver throws or changes during pending render                     | Last coherent state retained; obsolete generation cannot publish                          |
| V-16  | Hidden/zero-size mount then reveal, both axes                                 | Unmeasured state without NaN/false shortage; correct measured selection after reveal      |
| V-17  | Fractional padding/borders/margins, border/content box and transform          | Correct intrinsic extents; original authored styles preserved                             |
| V-18  | Fixed/fractional/auto views with numeric/% gap                                | Source-derived sizes/snaps and one spacing owner                                          |
| V-19  | Negative/invalid dimensions/gap/group/offset resolver output                  | Rejected option group or unmeasured result; no division/indexing corruption               |
| V-20  | Variable extents, group skip, groupAuto and unequal distances                 | Correct snap group mapping and leading selected source index                              |
| V-21  | Centered, centered bounds, insufficient content and invalid combinations      | Correct geometry or explicit rejection, no silent incompatible algorithm                  |
| V-22  | snapToItemEdge with fractional/auto, grouped terminal positions               | Source terminal-fit calculation and no unwanted arbitrary end snap                        |
| V-23  | Equal snap coordinates, hidden slides, disabled leaders                       | Deduplicated navigable snaps with preserved source-index/ID maps                          |
| V-24  | roundLengths on/off and subpixel boundaries                                   | Correct floor/normalization tolerances; no cumulative drift                               |
| V-25  | Auto height and image success/error/content changes                           | Latest accepted visible group's height; no stale hidden height or axis feedback           |
| V-26  | Zero/one/all-fit content, watchOverflow on/off and direction locks            | Availability represents real movement; lock/unlock publication coherent                   |
| V-27  | Pixel/ratio breakpoints at exact and fractional boundaries                    | Largest numeric match; no parseInt threshold truncation                                   |
| V-28  | Window/container/external base, missing base and owner realm                  | Correct base/fallback and owned subscriptions                                             |
| V-29  | Enter/leave breakpoints with partial nested options                           | Reset from immutable base, no stale prior fields or mutated consumer objects              |
| V-30  | Breakpoint orientation/size/loop switch and RTL                               | Remeasure before reloop; translate/input/scrollbar axes update together                   |
| V-31  | Continuous ResizeObserver stream, object/array box sizes, fallback            | Every changed frame handled without alternating stale geometry                            |
| V-32  | Loop forward/backward, nonzero/end initial item                               | Correct source buffer/permutation and stable real identity                                |
| V-33  | Loop auto+centered hidden then measured                                       | No false shortage; real measured eligibility checked later                                |
| V-34  | All-fit breakpoint lock then unlock/relock                                    | No warning/reorder while locked; source order restored                                    |
| V-35  | Genuine shortage and nondivisible group with fill off                         | Explicit effective rewind fallback, no unsafe indexing                                    |
| V-36  | Group fillers and additional/offset buffer sizing                             | Fillers inert/excluded from counts; source group/offset math retained                     |
| V-37  | Reverse drag direction across loop seam                                       | Compensated origin/translate; no visible jump or stale swipe direction                    |
| V-38  | Loop maintenance with focused child/form/media/custom element                 | Same real node once; no duplicate IDs, reconnect loss or focus theft                      |
| V-39  | Loop on/off and renderer failure mid-permutation                              | Logical order restored, temporary locks released, no false selection events               |
| V-40  | Right/nonprimary/second pointer, busy/destroyed/read-only controller          | No claim/default prevention or changed ownership                                          |
| V-41  | no-swipe/handle selectors and nested shadow controls                          | Correct composed eligibility; native controls remain usable                               |
| V-42  | Threshold below/equal/above and axis-angle boundary                           | Both source threshold stages and origin reset preserved                                   |
| V-43  | Ratio, one-way, RTL and previous/next locks                                   | Correct sign/order and permitted displacement only                                        |
| V-44  | Follow-pointer false and source release computation                           | No live visual movement, correct final accepted snap                                      |
| V-45  | Resistance, release-on-edge, browser edge detection/prevent                   | Source formulas and explicit ancestor/browser handoff                                     |
| V-46  | Long/short duration and ratio equality in both directions                     | Exact asymmetric comparison and disabled-mode reset                                       |
| V-47  | Last move queued immediately before release                                   | Final location used once; no stale frame writes afterward                                 |
| V-48  | Child/parent initialized in either order, same/cross axis                     | Innermost eligible owner first; no double movement or jump on handoff                     |
| V-49  | Nested Slider, Scroll Area, input/link/select and editable content            | Their interactions win appropriately; no unconditional blur                               |
| V-50  | pointercancel/touchcancel/capture loss/Escape/disable/remove                  | Preview discarded and resources released once on every terminal path                      |
| V-51  | Normal tap/click, threshold-aborted click, drag click and double tap          | Correct native action preservation/suppression, no duplicate synthetic click              |
| V-52  | Horizontal/vertical, LTR/RTL and cross-axis arrows                            | Correct logical movement; only handled active-axis keys prevented                         |
| V-53  | Editable/nested action, modifiers/IME and button Enter/Space                  | No parent interception or double activation                                               |
| V-54  | Home/End/Page keys, disabled groups and finite ends                           | Correct eligible snaps and configured page-key behavior                                   |
| V-55  | Tab/Shift+Tab with loop and offscreen focus reveal/rejection                  | Normal exit and controlled focus safety, no trap                                          |
| V-56  | Legacy/pixel/line/page wheel data, Shift and zero deltas                      | Exact normalization and no NaN/phantom movement                                           |
| V-57  | Axis force, RTL, invert, sensitivity and ctrl-zoom                            | Correct mapping; browser zoom and ineligible cross-axis input preserved                   |
| V-58  | Delta/time thresholds, 6-unit/60 ms suppression and animation lock            | Source gating without uncontrolled repeated navigation                                    |
| V-59  | Nested wheel target, element versus selector, missing/replaced target         | Scoped ownership; no querySelector(Element) failure or stale binding                      |
| V-60  | Finite boundary release, loop and native transport                            | Correct consume/release policy, no double native/custom movement                          |
| V-61  | Transform navigation/same translate/different group and RTL                   | Coherent selected group, source translation and no fake motion                            |
| V-62  | Zero duration, reduced motion and external motion driver                      | Correct shared role, immediate cleanup and no never-fired-event wait                      |
| V-63  | Rapid reversal, reinit/disconnect and rejected motion promise                 | Old completions cannot settle/reset newer work                                            |
| V-64  | Descendant/unrelated transitionend                                            | Only owning movement finishes; listener is not consumed early                             |
| V-65  | Native scrollend/stability fallback and restoration echo                      | Exactly one settlement; no restoration feedback loop                                      |
| V-66  | Native controlled veto/direction lock/group/virtual combination               | Valid accepted snap or restoration; transport differences explicit                        |
| V-67  | Previous/next visibility, placement, icons and availability independently     | Each option works; real Button actions retain semantics                                   |
| V-68  | External custom targets and multiple/nested Carousel instances                | No duplicate defaults or cross-instance binding; authored state restored                  |
| V-69  | Hide-on-click with focused/interactive descendants                            | No disappearing focused control or swallowed slide action                                 |
| V-70  | Bullet/fraction/progress/custom and empty/grouped/loop counts                 | Correct committed snap count/current state and real component reuse                       |
| V-71  | Dynamic bullet count/window and focused bullet movement                       | Correct visible window without lost focused action                                        |
| V-72  | Format/custom render callbacks, click veto and renderer error                 | Text/Lit safety, coherent prior state, no raw-HTML dependency                             |
| V-73  | Scrollbar proportion, explicit/auto thumb, tiny track and zero range          | Correct shared geometry, no division/capture when immovable                               |
| V-74  | Both axes/RTL/scaled track, thumb grab versus track press                     | Correct offset/proportion and accepted snap mapping                                       |
| V-75  | Second pointer, capture throw/loss, disable or resize while dragging          | Exception-safe release/cancel; no stale geometry movement                                 |
| V-76  | Scrollbar release/veto and native snap-style ownership                        | Valid snap or restore; authored replacement style preserved                               |
| V-77  | Visibility timers, hover/focus/drag and reduced motion                        | No hidden focusable thumb or timer leak; correct shared visibility policy                 |
| V-78  | Scrollbar keys/a11y and existing Scroll Area regression                       | Correct content-position semantics; native Scroll Area two-axis behavior preserved        |
| V-79  | Autoplay off/positive/invalid and per-item delay/virtual data                 | Valid timers only; correct committed-item delay                                           |
| V-80  | Focus/hover/hidden/reduced-motion/gesture pauses separately and combined      | Clearing one reason never overrides remaining pauses                                      |
| V-81  | Resume and accepted movement with changed interval                            | New full interval, never stale remainder                                                  |
| V-82  | Finite last/first, reverse, loop and single snap                              | Stop unless wrapping allowed; no busy unchanged loop                                      |
| V-83  | Controlled autoplay rejection and explicit restart                            | Pause on rejection; no repeated owner pressure or silent commit                           |
| V-84  | Manual pause/resume and stopAfterInteraction                                  | Real Button works; manual pause persists and policy matches state                         |
| V-85  | Transition interruption, disconnect and old timer expiry                      | No stale advance/resume/countdown frame after stop/disposal                               |
| V-86  | Virtual empty/single/slide-zero/nonzero initial selection                     | Complete first window, no omitted first slide or modulo zero                              |
| V-87  | Centered/grouped/fractional views and overscan                                | Integer complete range covering partial visible items                                     |
| V-88  | Virtual auto fixed size and invalid variable-size expectation                 | Explicit source-sized model, no fabricated variable-size guarantee                        |
| V-89  | Loop range beyond one cycle, RTL/vertical offsets and tiny counts             | Correct normalized mapping, no duplicate real nodes                                       |
| V-90  | Data 0/empty string, numeric IDs and object payloads                          | No truthiness-based omission; identity preserved                                          |
| V-91  | Prepend/remove/reorder with cache on/off                                      | Correct ID cache and index correction; removed entries disposed                           |
| V-92  | Renderer/content generation changes                                           | Old cached template cannot render new item incorrectly                                    |
| V-93  | Same from/to with new snap grid/offset                                        | Position updates even without membership change                                           |
| V-94  | Slow render completes after data/selection/reinit replacement                 | Stale callback ignored, no stale virtual update or autoplay restart                       |
| V-95  | Focused item outside range then authoritative removal                         | Safe focus pinning/fallback; no stranded detached focus                                   |
| V-96  | Named root/items, multiple/partially visible slides and empty content         | Correct tree/count, visible content operable, offscreen state owned                       |
| V-97  | Existing names/descriptions/inert and consumer updates during use             | Owned restoration preserves newer authored changes                                        |
| V-98  | Manual navigation, autoplay, loop fix and rapid replacement                   | Appropriate announcement only, no frame/automatic/teleport chatter                        |
| V-99  | Same-origin foreign realm and nested shadow roots                             | Correct document/window/constructors/active element; independent instances                |
| V-100 | SSR import/construction without DOM/ResizeObserver                            | No eager service acquisition or ambient mutation                                          |
| V-101 | Nonce/disabled-style policy and strict CSP                                    | Existing geometry transport works; no raw HTML or unowned style injection                 |
| V-102 | Lifecycle, refs, target replacement and reconnect                             | No duplicate subscriptions or stale controller callback                                   |
| V-103 | Destroy during gesture/render/scroll/loop/animation/timer                     | All resource categories released and no late write                                        |
| V-104 | A disposer throws among multiple resources                                    | Remaining reverse-order cleanup completes with diagnostic                                 |
| V-105 | Foreign-realm options, arrays/elements and prototype keys                     | Defaults retained, references not merged, pollution keys ignored                          |
| V-106 | Direct callback error versus native DOM listener exception                    | Correct platform distinction; no false claim catch(dispatchEvent) vetoes listeners        |
| V-107 | Themes, scoped tokens, dictionary replacement and reset                       | Actual shared recipes and terminal hooks; no state/focus reset                            |
| V-108 | Orientations/RTL, long content, small viewport and custom parts               | Correct layout/hit targets/clipping; inspected screenshots and geometry                   |
| V-109 | Footer/inside/outside, indicators/scrollbar/autoplay combinations             | Independent regions coexist without overlap or counterfeit components                     |
| V-110 | Canonical/slotted/data/controlled docs and copyable examples                  | Full API/defaults agree, real components and sufficient imports                           |
| V-111 | Built exports, types, register and legacy display imports                     | Existing public identity retained; controller/types usable outside Storybook              |
| V-112 | Source/dist dependency audit, generators and full reconciliation              | No new runtime deps/plugin exports; no deleted authored docs or unmapped source branch    |

### 16.4 Required combinations and evidence

Test loop with controlled state, virtual windows, grouped/auto layouts, RTL and cancellation. Test native transport with rejection and wheel/scrollbar ownership. Test breakpoints with hidden reveal, lock/unlock and changing orientation. Test shared Scroll Area after extraction, including native content position independent of Carousel snap rules.

Use real Chrome DevTools MCP pointer/keyboard input for interaction claims. Evaluation may prepare fixtures and inspect public APIs/geometry, but synthetic events are not proof of capture, native default action or focus traversal. OS reduced-motion, touch/device and other-browser claims require actual supporting evidence; record unavailable conditions as blocked, not passed.

Read scripts before running checks; existing browser/package scripts may launch Playwright. Use registered Chrome DevTools MCP exclusively for browser verification. Run applicable unit tests, type/build/lint and Storybook builds separately. No browser tests are executed merely by authoring this file.

## 17. Live-spec amendment and integration plan

Before runtime implementation, fresh-read complete Foundation/Component Library ASTs, managed vocabulary, project and authoring schema through registered direct Spec Blocks tools. Use current concurrency values on every small mutation batch and validate the whole candidate afterward.

1. Extend `sec-187-carousel` with the closed numeric lane, identity/index reconciliation, controller outcomes, source-derived layout/gesture/loop policy, native transport differences, virtual mode, wheel/scrollbar and built-in service contracts.
2. Reconcile introductory plugin wording with optional built-in automation; preserve the existing mandatory pause/full-interval/no-finite-wrap requirements.
3. Extend `ucl21-carousel` with complete property/default tables, explicit two content modes, anatomy/keys, independent controls, compatibility aliases and customization.
4. Register automatic-advance and the exact state-lane reason inventory; reuse existing managed state terms where identical and add only missing terms/roles.
5. Record Scroll Area's common scrollbar-owner adaptation without changing native scroll semantics. Add dependency/review relationships for state, motion, environment, Button, Progress, collection and Scroll Area owners.
6. Update source baseline, coverage and discrepancy appendices. Record intentional exclusions and A-IDs; runtime behavior must not become authority by being implemented first.
7. Validate all affected definitions and dependent obligations. Preserve unrelated candidate edits and do not bundle them into an unsolicited commit.

If direct Spec Blocks tools are unavailable, report the connection limitation and continue independent local research. Never substitute curl, shell JSON-RPC or a bridge. If Chrome tools are unavailable, browser gates remain blocked without another driver.

## 18. Ordered implementation plan and completion criteria

| Task | Dependencies | Required work/artifacts                                                                                                          | Exit gate                                                                    |
| ---- | ------------ | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| P-01 | None         | Refresh baselines/dirty work, adopt precise live amendments, preserve unrelated edits                                            | Valid authoritative contracts, scope and discrepancies recorded              |
| P-02 | P-01         | Copy skill checklist, expand capability/options map, source branch ledger, family/presentation/reuse maps                        | Gates 0–2 and implement checker truthfully pass                              |
| P-03 | P-02         | Repair required shared state/lifecycle/environment services; extract actual shared scrollbar owner/rendering used by Scroll Area | Existing affected consumers pass focused regressions                         |
| P-04 | P-03         | Port pure size/snap/group/breakpoint/loop/virtual arithmetic with provenance and source-derived tests                            | Boundary/invalid/rounding calculations covered before DOM binding            |
| P-05 | P-04         | Implement logical records, numeric ownership, controller snapshots/events, renderer barriers and compatibility adapters          | Selection/identity/reentrancy/error tests pass                               |
| P-06 | P-05         | Bind transform/native transport, loop shells, observation and source-derived pointer/key/wheel input                             | Core real-input integration and safe cancellation demonstrated               |
| P-07 | P-06         | Data/slotted rendering, virtual windows/cache, focus retention and stale-work protection                                         | Initial/dynamic/loop virtual regressions pass                                |
| P-08 | P-07         | Real navigation/indicator/scrollbar/autoplay controls, accessibility and motion integration                                      | Services work together through public APIs and mandatory pause/commit rules  |
| P-09 | P-08         | Presentation definitions/recipes, canonical example, actual reuse diff review and independent-option check                       | I-01 ownership, I-02 visual comparison, I-03 options; verify checker passes  |
| P-10 | P-09         | Execute V-01–V-112 and required cross-products; repair failures and rerun affected evidence                                      | All in-scope behavior/accessibility/visual rows have actual passing evidence |
| P-11 | P-08–P-10    | Complete docs/Controls, curated examples, generator preservation, exports/registration/types and built fixture                   | Public documentation and package agree with implementation                   |
| P-12 | P-10–P-11    | Required test/lint/type/build/Storybook checks, shared regressions, dependency and source-disposition audit                      | Gates 0–8 and complete checker pass without missing required rows            |

Use `plans/components/carousel/implementation-checklist.md` from the repository skill template. Preserve its status vocabulary, C/V IDs, gate table, family dependency map, presentation source map, composition reuse map and I-01–I-03 checkpoint. Expand broad C-rows into individual public options where required; retain links to this document's IDs.

```sh
node .agents/skills/tweakpad-component/scripts/check-gates.mjs plans/components/carousel/implementation-checklist.md --stage implement
node .agents/skills/tweakpad-component/scripts/check-gates.mjs plans/components/carousel/implementation-checklist.md --stage verify
node .agents/skills/tweakpad-component/scripts/check-gates.mjs plans/components/carousel/implementation-checklist.md --stage complete
```

Run each stage only at its actual work boundary. A syntactically valid record is not evidence that behavior passed. Excluded advanced modules can be not applicable with scope evidence; included virtual/wheel/scrollbar/core behavior cannot be relabeled optional to clear a failure.

Store local logs, measured geometry and inspected screenshots at `tmp/component-verification/carousel/<run>/`; they are not automatically shared with another machine. Durable fixtures live outside package/story discovery. Record browser version, served URL, source/built package, viewport, theme, direction, motion policy and actual inspected outcomes.

Completion requires a reusable Foundation controller, compatible Carousel API, preserved source logic with explicit adaptations, shared scrollbar ownership with Scroll Area, full included capability coverage, complete docs and actual acceptance evidence. No added runtime libraries, no public plugin system, no raw-HTML renderer and no invented proof from a build or default screenshot.

Document acceptance for this Markdown deliverable is separate: source paths and pinned revisions checked, live governing contracts refreshed, confirmed scope reflected, all proposed interfaces/defaults mapped, unique requirement/scenario/adaptation/task IDs, internal cross-references consistent and formatting clean. Runtime and browser scenarios remain planned until the subsequent implementation is performed.
