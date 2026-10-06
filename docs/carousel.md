# Carousel

`tp-carousel` presents slotted content or keyed data at discrete positions. Navigation,
keyboard, swipe, optional wheel input, indicators and the scrollbar share one numeric
selection. Dragging and native scrolling expose provisional progress; they do not
publish selection until the owner accepts a destination.

The horizontal and vertical demos use five simple numbered Cards, following the
[shadcn Carousel examples](https://ui.shadcn.com/docs/components/base/carousel).
Cards retain the shared solid surface, border and radius; there are no slide actions.

```html
<tp-carousel label="Numbered slides" style="max-width:20rem">
  <tp-card section-colors="off">1</tp-card>
  <tp-card section-colors="off">2</tp-card>
  <tp-card section-colors="off">3</tp-card>
  <tp-card section-colors="off">4</tp-card>
  <tp-card section-colors="off">5</tp-card>
</tp-carousel>
```

For the vertical example, set `orientation="vertical"`, give the Carousel a fixed
height, and set `options.layout.itemsPerView` to `2`. The Storybook Horizontal and
Vertical examples include their complete layout CSS and outside-navigation setup
in the copyable source.

Give the Carousel a meaningful `label` or `aria-label`. A vertical Carousel needs
a definite available height. Size the component through CSS; the measurement
override is an explicitly identified adapter/testing facility.

## Properties

| Property / attribute                                | Type and default                                             | Purpose                                                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `value`                                             | `number \| undefined`; property only                         | Defined on initialization establishes controlled selection for that lifetime.                                                    |
| `defaultValue`                                      | `number \| undefined`; property only                         | Uncontrolled initial source index. Do not combine with `value`.                                                                  |
| `index` / `index`                                   | `number`, initially `0`                                      | Compatibility getter for committed selection. Later writes request navigation through the same lane. Empty collections read `0`. |
| `orientation`                                       | `horizontal \| vertical`; `horizontal`                       | Active track, input and scrollbar axis.                                                                                          |
| `loop`                                              | Boolean, `false`                                             | Allows wrapping. No other option independently enables wrap.                                                                     |
| `itemsPerMovement` / `items-per-movement`           | Positive integer, `1`                                        | Declared snap group size.                                                                                                        |
| `autoplay`                                          | Finite nonnegative number, `0`                               | Interval in milliseconds; zero disables automatic advance.                                                                       |
| `label`                                             | String, empty                                                | Accessible name fallback.                                                                                                        |
| `items`                                             | `readonly T[] \| undefined`; property only                   | Defined arrays, including `[]`, select data mode. Undefined selects slots.                                                       |
| `getItemId`                                         | `(item, sourceIndex) => string \| number`                    | Defaults to a primitive string/finite number or an object's own `id`.                                                            |
| `getItemLabel`                                      | `(item, sourceIndex) => string`                              | Defaults to the item label or ID text.                                                                                           |
| `getItemOptions`                                    | `(item, sourceIndex) => {disabled?, autoplayDelay?, label?}` | Per-item behavior without changing identity or ownership.                                                                        |
| `renderItem`                                        | `(item, context) => Lit content`                             | Required for object data. Primitive items can render as text.                                                                    |
| `options`                                           | `CarouselOptions`, `{}`; property only                       | Closed groups below.                                                                                                             |
| `onControllerChange`                                | `(controller \| null) => void`; property only                | Receives the initialized handle and null when its binding is released.                                                           |
| `controller`                                        | Read-only `CarouselController \| null`                       | Null before initialization and after disposal.                                                                                   |
| `disabled`, `readOnly` / `readonly`                 | Boolean, `false`                                             | Prevent user and imperative navigation; explicit controlled publication remains authoritative.                                   |
| `motionPolicy`, `partPresentation`, `partContracts` | Shared component APIs                                        | Motion and public part customization.                                                                                            |

Render context contains `id`, original `index`, `selected`, `visible`, and `preview`.
Strings remain text unless the consumer deliberately returns a Lit template.
Numeric ID `1` and string ID `'1'` are distinct. Invalid or duplicate IDs diagnose;
only the first coherent participant owns a duplicate ID. Hidden and disabled
records do not renumber subsequent public source indices.

Do not combine default slide children with data items. Initial conflicts prefer
data with a diagnostic; conflicting later mode changes retain the coherent mode.
Light DOM nodes retain their identity and source order. The Carousel owns temporary
named slot assignments and internal projection shells, restoring its assignments
on disconnect without overwriting later consumer changes.

## Controlled selection

```ts
import type { TpCarousel, TpValueChangeEvent } from '@tweakpad/ui';

const carousel = document.createElement('tp-carousel') as TpCarousel<string>;
carousel.label = 'Project stages';
carousel.items = ['Research', 'Design', 'Review'];
carousel.value = 0;
carousel.addEventListener('tp-value-change', (event) => {
  const change = event as TpValueChangeEvent<number>;
  carousel.value = change.detail.value; // synchronous acknowledgement
});
document.body.append(carousel);
```

Use `preventDefault()` to reject a proposal. Leaving the controlled value unchanged
also rejects it. An owner may synchronously publish another valid destination;
the result reports the destination actually committed. An uncanceled event alone
does not establish acceptance. Do not switch between controlled and uncontrolled
mode during one host lifetime.

Reorder retains selected identity and proposes any numeric correction through the
same lane. If a controlled owner refuses that correction, the snapshot has no
selected marker and navigation remains unavailable until the owner or membership
resolves the identity. The replacement item at the old numeric position is not
silently selected. Removal uses the nearest eligible source position, with ties
choosing the earlier group.

## Configuration

Resolution order is defaults, base `options`, root scalar properties, then the
matching breakpoint. Undefined inherits, partial declared groups merge, and
references/callbacks replace by identity. False disables an optional service.
Unknown fields and invalid values diagnose. Invalid updates retain the last
coherent configuration; invalid initial groups use that group's defaults.

### Layout

| Field                         | Default / values                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `itemsPerView`                | `1`; positive finite number, including fractions, or `'auto'`                          |
| `gap`                         | `0`; nonnegative pixels or a strict nonnegative percentage string                      |
| `groupSkip`                   | `0`; nonnegative integer for initial single-item groups                                |
| `groupAuto`                   | `false`; only with auto view and root movement size one                                |
| `centered`                    | `false`                                                                                |
| `centeredBounds`              | `false`; requires centered, finite mode and indicators off                             |
| `centerInsufficient`          | `false`; finite mode only                                                              |
| `offsetBefore`, `offsetAfter` | `0`; nonnegative pixels or a resolver receiving `{width,height}`                       |
| `snapToItemEdge`              | `false`; active for finite, noncentered auto/fractional view                           |
| `roundLengths`                | `false`; true floors source geometry                                                   |
| `autoHeight`                  | `false`; horizontal only, follows the accepted visible group                           |
| `watchOverflow`               | `true`; affects lock presentation, never enables nonexistent movement                  |
| `measurementOverride`         | Absent; positive finite `width` and/or `height`, identified as `override` in snapshots |

Auto sizing measures individual content extents. Virtual auto sizing instead uses
the declared fixed `virtual.itemSize`; it does not promise variable-size virtual
estimation. Configured gap belongs to the projection track, independently of
consumer margins. Fractional dimensions remain fractional unless rounded explicitly.
Zero-size/hidden mounts remain initialized but unmeasured and acquire no fake snaps.

### Interaction, keyboard and wheel

`interaction` defaults:

| Fields                                                                   | Defaults                                                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `enabled`, `target`, `simulateMouse`                                     | `true`, `'track'`, `true`                                                                  |
| `threshold`, `angle`, `ratio`, `followPointer`                           | `5`, `45`, `1`, `true`                                                                     |
| `shortSwipes`, `longSwipes`, `longSwipeRatio`, `longSwipeMs`             | `true`, `true`, `0.5`, `300`                                                               |
| `allowPrevious`, `allowNext`, `oneWay`                                   | `true`, `true`, `false`                                                                    |
| `resistance`, `resistanceRatio`, `releaseOnEdges`                        | `true`, `0.85`, `false`                                                                    |
| `handle`, `noSwipe`, `noSwipeSelector`                                   | `null`, `true`, `'[data-tp-no-swipe]'`                                                     |
| `preventActivation`                                                      | Optional `(event, snapshot) => boolean`; true prevents activation                          |
| `edgeSwipeDetection`, `edgeSwipeThreshold`                               | `false`, `20`; detection true yields at the browser edge, `'prevent'` prevents its default |
| `preventStartDefault`, `forcePreventStartDefault`, `stopMovePropagation` | `true`, `false`, `false`                                                                   |
| `preventClicks`, `preventClickPropagation`                               | `true`, `true` after a drag                                                                |
| `navigateOnItemClick`, `grabCursor`, `preventInteractionOnTransition`    | `false`, `false`, `false`                                                                  |

Times/thresholds are nonnegative, angle is 0–90, ratio is positive, and swipe and
resistance ratios are 0–1. Targets/handles accept an owner-scoped selector, element,
or resolver; selectors do not search unrelated instances. Editable and independent
interactive content retains its own actions. Nested Carousels coordinate through
their composed event path; there is no public listener-order flag. Pointer capture
is acquired on the track only once a drag is claimed; if the browser refuses
capture, the gesture is cancelled like `pointercancel` (the preview returns to the
accepted position and no swipe settles). Double tap/click is not intercepted: the
Carousel exposes no tap/double-tap event and does not implement Zoom, so native
`dblclick` reaches slide content unchanged.

Transitions never block interaction by default. A drag can grab a moving carousel and
continues from the presented position. Next/previous, keys and wheel impulses during a
transition retarget it, and repeated requests accelerate. The new movement ends no
later than the one it replaced, down to half the normal duration. A release keeps the
drag's velocity and slows to rest on the chosen snap; it is never left unsnapped.
Velocity is measured over the last 100 ms of the drag and is zero if the pointer rested
for 60 ms before release. A flick of at least 0.3 px/ms decides the direction like a
short swipe, however long the drag lasted. That includes a reversal of at least the
threshold (minimum 10 px), so dragging forward and flicking back returns. Slower
releases use the long-swipe ratio.

While a gesture is pending or active, the Carousel prevents text selection and native
image dragging inside it, with no consumer CSS. A descendant marked `draggable="true"`
keeps its own native drag. Controls, indicators and the scrollbar are not
text-selectable, so repeated clicks on Next do not select slide content.
`preventInteractionOnTransition` and `loopOptions.preventDuringTransition` restore
transition locking.

`keyboard` is enabled by default, with `pageKeys=false` and `homeEnd=true`; false
disables it. Arrow keys follow the active logical axis and RTL. Home/End select
boundaries. Optional PageUp/PageDown use the same snap navigation. Modifiers, IME,
cross-axis keys and descendant editing/control behavior remain native. Keys owned by
a nested control inside a slide stay with it: editable fields (inputs, text areas,
contenteditable, textbox/combobox/spinbutton) and controls own every key, and nested
composites (tablist/tab, listbox/option, menu/menuitem, radiogroup/radio, slider,
grid, toolbar, tree, native-controls media, Tweakpad menu/radio/select/slider items,
or any element marked `data-tp-owns-keys`) keep their arrow, Home/End and Page keys,
so those keys do not move the Carousel. Plain slide content (text, images, groups)
still navigates, and a composite that contains the whole Carousel does not claim its
keys. An inner Carousel owns its own navigation.

`mousewheel` defaults false. Its enabled group defaults to `enabled=true`,
`forceToAxis=false`, `releaseOnEdges=false`, `invert=false`, `sensitivity=1`,
`target='root'`, `thresholdDelta=null`, `thresholdTime=null`, and
`ignoreSelector='[data-tp-no-wheel]'`. Sensitivity is positive; explicit thresholds
are nonnegative. Pixel, line, page and Shift deltas are normalized before axis/RTL
mapping. Control zoom remains native. A handled custom wheel event never also
performs native viewport scrolling.

### Navigation, indicators and scrollbar

With `navigation.placement: "outside"`, arrows remain centered on the viewport edges and pagination occupies its own row below a horizontal viewport or a column beside a vertical viewport, with library-owned spacing. `inside` overlays the controls within the viewport; `footer` groups them below it.

`navigation` defaults to `{enabled:true, previous:true, next:true, icons:true, placement:'footer', hideOnClick:false}`. `previousElement` and `nextElement` are
optional scoped targets replacing only their corresponding generated Button.
One element cannot own both actions. Labels remain consumer-owned unless explicitly
replaced through messages. Placements are `footer`, `inside`, and `outside`.

`navigation.hideOnClick` and `indicators.hideOnClick` toggle their controls when
noninteractive slide content is clicked. Clicks on descendant controls (the
controls group, autoplay Button, scrollbar), interactive slide content (native
form controls, links, labels, `tp-button` and other interactive library controls,
or elements with interactive roles) and clicks already handled with
`preventDefault()` never hide anything. Hidden controls are removed from the tab
order and return when a mouse/pen pointer newly enters the Carousel or keyboard
focus enters it from outside; touch users tap content again.

`indicators` defaults to fraction and accepts false or:

| Field                                  | Default / purpose                                                   |
| -------------------------------------- | ------------------------------------------------------------------- |
| `type`                                 | `'fraction'`; also `'bullets'`, `'progress'`, `'custom'`            |
| `clickable`, `dynamic`, `dynamicCount` | `false`, `false`, `1`; bullet options, count a positive integer     |
| `hideOnClick`, `opposite`              | `false`, `false`; opposite applies to progress                      |
| `formatCurrent`, `formatTotal`         | String conversion                                                   |
| `renderIndicator`                      | Optional Lit renderer receiving `{index,count,current,sourceIndex}` |
| `renderCustom`                         | Required for custom type; receives the coherent snapshot            |

Clickable indicators are actual Buttons. Progress uses `tp-progress`. Nonclickable
bullets are non-focusable named images (`role="img"`, labelled with their position
such as "3 of 8") inside the labelled indicator group, and fraction/status text
describes committed snaps. Custom rendering must preserve accessible
action/position meaning. Indicator count is snap count, which may differ from item
count or mounted virtual count.

If `renderCustom`, `renderIndicator`, `formatCurrent`, `formatTotal` or
`messages.status` throws, that indicator render is cancelled: the previous coherent
indicator content stays on screen (nothing before the first successful render)
and a `tp-diagnostic` event reports the failure.

`scrollbar` defaults false. Enabling it defaults to `enabled=true`,
`draggable=false`, `thumbSize='auto'`, `visibility='always'`. A numeric thumb size
must be positive and is constrained by track extent and the shared minimum.
Visibility accepts `always`, `automatic`, `while-scrolling`, or `on-hover`.
Optional `element` and `thumbElement` accept scoped targets. An interactive bar has
scrollbar semantics (`aria-valuemin/max/now` plus human-readable `aria-valuetext`
from `messages.position`, for example "3 of 8"), keyboard navigation and mandatory
snap-on-release. Its common geometry/capture/rendering owner is also used by Scroll
Area. With `visibility: 'while-scrolling'` any track movement reveals the bar:
previous/next, indicators, swipe, wheel, keyboard, scrollbar input, autoplay and
controller calls all report activity to the shared scrollbar owner. The bar hides
after 1000 ms without movement with a 400 ms fade, stays visible while hovered,
focused or dragged, and uses the `scrollbar-visibility` motion role (parameters:
previous/next visibility and `context.orientation`). The `auto-height` role
receives previous/next height and `context.snap`, the accepted snap index.

### Transport, looping, responsiveness and observation

`transport` is `'transform'` or `'scroll'`, default transform. Native scrolling is
provisional until scroll settlement; rejection restores the committed snap. Native
smooth-scroll timing belongs to the browser. Transform resistance and simulated
mouse dragging are inactive in native mode.

Root loop permits `loopMode='continuous'` (default) or `'rewind'`.
`loopOptions` defaults to `{additionalItems:0, fillGroups:true, preventDuringTransition:false}`; `true` rejects navigation and drags while a continuous loop transitions. Additional items is a nonnegative integer.
Continuous mode permutes owned shells without cloning consumer controls or changing
logical source order. Unmeasured content does not claim loop eligibility. All-fit
content stays in source order; insufficient distinct content falls back to effective
rewind with a diagnostic. Fillers have no public IDs, selection or accessibility role.

`breakpoints` maps nonnegative pixel widths or positive `@ratio` keys to responsive
overrides. Fractional thresholds are compared precisely. `breakpointsBase` is
`'window'` (default), `'container'`, or a scoped element/resolver. Ratios use that
base's height. Below all thresholds restores immutable base options.

Allowed breakpoint fields are orientation, itemsPerMovement, layout, loop,
loopMode, loopOptions, navigation, indicators, scrollbar, mousewheel, keyboard
and interaction. Breakpoints cannot change selection ownership, content mode,
renderers, transport, virtual enablement or callbacks.

`observation` defaults to `{resizeObserver:true, windowResize:true, observeItemSubtree:false, observeParents:false}`. Membership and layout updates
remain automatic; extra subtree/parent coverage is optional. Image load/error and
font completion invalidate layout. `loading` defaults to `{preload:true, adjacent:0}`;
adjacent is a nonnegative logical item count. Authored image-loading attributes
remain owned by the consumer.

### Virtual rendering and autoplay

`virtual` defaults false and requires data mode. Its group defaults to
`{enabled:true, cache:true, before:0, after:0, itemSize:320}`. Before/after are
nonnegative overscan counts; itemSize is positive. Fractional views include the
partially visible item. Typed IDs and renderer/data generations govern cached views.
A focused item may be retained outside the nominal range and is identified in the
snapshot. Removed IDs and obsolete renderer generations are released. Asynchronous
render completion belongs to the host adapter; stale work cannot publish a newer view.

`autoplayOptions` defaults to `{reverse:false, stopAfterInteraction:false}`.
Per-item `autoplayDelay` or a slotted `data-tp-autoplay-delay` overrides a valid
root interval. A Pause/Resume Button precedes moving content when autoplay is
configured. Its text and accessible name name the action for the actual timer
state: Pause while the timer runs, Resume after a manual pause, an unacknowledged
proposal, a finite-end stop or a `stopAfterInteraction` stop. Activating Resume
clears the manual pause and restarts a stopped timer. Mandatory hover/focus pauses
do not rename the Button. Focus, hover, hidden documents, reduced motion, gestures, scrollbar
input, disabled/read-only state, unavailable geometry, unresolved ownership and
active transitions independently pause the timer. All reasons must clear before a
new full interval starts. Advances never overlap. Unacknowledged proposals stay
paused until resume or owner publication. Finite endpoints stop automatic advance.

`messages` accepts `previous`, `next`, `first`, `last`, `slide`, `scrollbar`,
`pause`, `resume`, `position(index,count)`, optional `announce(snapshot)`, and
optional `status(snapshot)`. These customize text; they cannot remove required roles.

## Controller and events

```ts
const result = await carousel.controller?.scrollToId('review', { speed: 0 });
// {status, index, id, reason}: the actual committed destination
const unsubscribe = carousel.controller?.subscribe((snapshot) => console.log(snapshot));
unsubscribe?.();
```

The Foundation export is available through `@tweakpad/ui/carousel`; it has no
dependency on the catalog element. Construct `CarouselController` with a complete
`CarouselAdapter` (`host`, `read`, `measure`, `render`, `move`, `cancel`, optional
binding/focus/diagnostic hooks and owner window), then call `initialize()`.
Render completion is awaited before geometry-dependent movement. Structurally
invalid adapters throw before acquiring resources.
An animated adapter supplies `readPosition()` in logical track coordinates and
preserves that visible position in `cancel()`, so a new drag can interrupt motion
without jumping to its previous destination.

| Method                                        | Result                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `previous(request?)`, `next(request?)`        | Promise of a navigation result                                                |
| `scrollToIndex(index, request?)`              | Strict integer request; out-of-range integers clamp to nearest eligible group |
| `scrollToId(id, request?)`                    | Exact typed identity; missing IDs reject                                      |
| `reinitialize()`                              | Completion promise; rebuilds geometry and retains identity where possible     |
| `subscribe(listener)`                         | Immediately receives the snapshot; returns an idempotent disposer             |
| `on(event, listener)`, `off(event, listener)` | Noncancelable observation subscription; `on` returns a disposer               |
| `destroy()`                                   | Cancels owned work and makes the handle inert until explicit reinitialize     |
| `autoplay.start/stop/pause/resume()`          | Timer policy methods subject to mandatory pause reasons                       |

Requests accept an optional finite nonnegative `speed` (transform milliseconds),
`reason` and `sourceEvent`. Navigation resolves `accepted`, `unchanged`, `rejected`,
or `cancelled`, with actual committed `index`/`id` and a reason code. User rejection
does not reject the Promise. Host disconnect is terminal for the old handle;
reconnection supplies a new controller.

Snapshots are immutable and contain `initialized`, `measured`, `measurementSource`,
`selectedIndex`, `selectedId`, `snapIndex`, `snapCount`, `itemCount`, `visibleIds`,
`progress`, `previewProgress`, `canScrollPrevious`, `canScrollNext`, `locked`,
`animating`, `orientation`, `direction`, effective `loopMode`, `virtual`,
`autoplayRunning`, and `autoplayPaused`. Empty/unresolved selection uses null.
Virtual state contains `from`, `to`, `offset`, `visibleIds`, `mountedIds` and `pinnedId`.

`tp-value-change` is the cancelable numeric proposal; `tp-value-commit` follows an
accepted publication. Shared details include previous/current values, reason,
source event, trigger, cancellation/propagation and metadata
`{previousId, nextId, snap, generation, inputKind}`; `tp-value-commit` carries the
same metadata for the committed destination. `inputKind` is `mouse`, `touch`,
`pen`, `pointer`, `keyboard`, `wheel`, `scroll`, `focus`, `timer`, `lifecycle` or
`programmatic` (exported as the `CarouselInputKind` type). Input reasons include
`trigger-press`, `item-press`, `keyboard`, `swipe`, `wheel`, `drag`, `track-press`,
`imperative-action`, and `automatic-advance`. Timer proposals carry a synthetic
`tp-carousel-autoplay-timer` source event rather than the generic programmatic
origin. Lifecycle/owner changes use their registered reasons: `missing` when the
selected item is removed or hidden, `disabled` when it becomes disabled, and
`window-resize` for remeasurement or reorder corrections.

Observation events bubble and compose: `tp-carousel-initialized`,
`tp-carousel-reinitialized`, `tp-carousel-progress`, `tp-carousel-settled`,
`tp-carousel-lock-change`, `tp-carousel-breakpoint-change`,
`tp-carousel-virtual-update`, and `tp-carousel-autoplay-state-change`. Their detail
is the coherent snapshot; Foundation `on()` uses names without `tp-carousel-`.
Progress is provisional and frame-coalesced. Settlement follows current motion;
loop maintenance does not emit value changes or announcements. Native DOM listener
exceptions are not vetoes: use `preventDefault()`. Callback failures diagnose and
release pending work; passive observation cannot undo an already committed value.

## Parts, states and customization

Public parts are `carousel`, `carousel-viewport`, `carousel-track`, `carousel-item`,
`carousel-previous`, `carousel-next`, `carousel-indicator`, `carousel-controls`,
`carousel-status`, `carousel-scrollbar`, `carousel-thumb`,
`carousel-autoplay-control`, `carousel-announcements`, and, while an effect is active,
`carousel-effect-surface`. Legacy `root`, `viewport`,
`track`, `previous`, `next`, `controls`, and `status` aliases remain available.
Action parts reach the actual Button through supported part registration/export.

Orientation keys apply to root, viewport, track, item, previous, next, indicator,
scrollbar and thumb. Indicator type keys are `carousel-indicator-type-*`; placement
keys are `carousel-controls-placement-*`. Status, autoplay control and announcements
have base keys only. Use the shared presentation dictionary, `partPresentation`,
or `partContracts` instead of private shadow selectors. Render delegates must
forward the supplied behavior binding and references.

Markers include selected/current, disabled/read-only, orientation, dragging,
transitioning, locked, visible/fully-visible, autoplay-running/autoplay-paused and
virtual on their corresponding owners. Any positive intersection keeps slide
content operable; offscreen shells are inert. Focus has a fallback before a shell
becomes inert. One polite region announces accepted manual settlement, not progress
frames or timer advances.

Motion roles are `track`, `transition` (effects only), `auto-height`, and
`scrollbar-visibility`: state motions with phase `change` and non-blocking completion.
Shared motion policy, consumer drivers, cancellation and bounded completion apply.
`track` and `transition` are sampled every animation frame. A navigation from rest uses
the resolved duration and easing. One that starts while the carousel moves continues at
the presented velocity, and each replacement publishes a new motion request. Reduced
motion and explicit zero-speed requests settle immediately.

## Effects

Basic usage needs no effect: the track translates between items. Assign an effect object
to `effect` (property only) for an advanced presentation. Effects are created by
factories you import, so a page that uses none bundles none.

```js
import { carouselShaderEffect } from '@tweakpad/ui';

carousel.effect = carouselShaderEffect({ variant: 'displace' });
carousel.effect = null; // back to the moving track
```

| Factory                     | Layout | Look                                                                                                                                         |
| --------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `carouselShaderEffect()`    | stack  | WebGL2 transition over each item's `data-carousel-media`: a noise-edged `wipe`, a full-frame liquid `displace`, or an RGB-split `chromatic`. |
| `carouselCrossfadeEffect()` | stack  | Opacity transition; the outgoing item stays under the incoming one for `overlap`.                                                            |
| `carouselLayeredEffect()`   | stack  | Media turns away and in with perspective; `data-carousel-layer` elements rise in order.                                                      |
| `carouselParallaxEffect()`  | track  | Media travels more slowly than its item (`depth`).                                                                                           |
| `carouselFocusEffect()`     | track  | Items dim and shrink with distance from alignment; layers reveal as an item arrives.                                                         |

Every factory accepts `duration` (ms) and `easing` (CSS easing), used when a navigation
does not set a speed, plus the options in the table below.

- **Stack** effects keep every item at the viewport origin and force one item per view
  and per movement. Conflicting layout options are overridden with a `tp-diagnostic`.
- **Track** effects keep the moving track, so any layout, loop or centering works.
- Effects need the transform transport. With `transport: 'scroll'` the effect is
  ignored and a diagnostic reports it.

Effects are pure functions of the carousel position. Dragging scrubs them, interrupting
a transition freezes them where they are, and reversing plays them backwards. Under
reduced motion they settle instantly. Item semantics, labels, inert handling, focus
fallback and announcements are unchanged.

### Authoring hooks

- `data-carousel-media` marks the one media element per item that effects transform.
  The shader requires an `img`, `video` or `canvas`; cross-origin media needs
  `crossorigin="anonymous"` and a CORS-enabled server.
- `data-carousel-layer="n"` marks text or decoration that reveals in order `n`. With
  the shader, layers stay live DOM above the canvas. Statically positioned layers are
  made relative so they can rise above it.
- While an effect is active each item shell exposes `--tp-carousel-item-progress`
  (0 aligned, positive upcoming, negative passed, loop-wrapped) and
  `data-effect-role` (`current`, `outgoing` or `incoming`) for your own CSS.

### Effect options

| Factory   | Options (defaults)                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| Shader    | `variant` (`wipe`), `direction` (axis), `intensity` (0.35), `softness` (0.08), `scale` (3), `rise` (24), `duration` (1200) |
| Crossfade | `overlap` (0.5), `duration` (600)                                                                                          |
| Layered   | `perspective` (1200), `rotation` (70), `depthScale` (0.6), `rise` (32), `stagger` (0.12), `duration` (1000)                |
| Parallax  | `depth` (0.3), `duration` (900)                                                                                            |
| Focus     | `dim` (0.35), `scale` (0.9), `rise` (24), `duration` (800)                                                                 |

### Shader behavior

- **Variants:**
  - `wipe` sweeps a noise-edged front across the frame.
  - `displace` and `chromatic` have no front. They use an fBm noise map as a displacement map that flows along the direction. The map pushes the outgoing image out and draws the incoming one in from behind, and it staggers when each pixel crosses over. `chromatic` displaces each color channel by a different amount.
  - `intensity` sets the displacement strength, `softness` widens the crossover, and `scale` sets the noise frequency. Gesture speed strengthens the effect.
- **Direction:** `direction` is the travel direction. It is one of the edges `left`, `right`, `up` and `down`, or one of the corners for a diagonal: `up-left`, `up-right`, `down-left` and `down-right`. By default it follows the carousel axis toward the inline start (block start when vertical), mirrored in RTL. Navigating backwards plays the transition in reverse.

- **Shared context:** all shader carousels on a page share one WebGL2 context. Each
  carousel displays frames in its own canvas, so many carousels never exhaust the
  browser's context limit.
- **Rendering:** the shader compiles during idle time and renders only while
  transitioning. Neighbouring media is uploaded ahead of time as sRGB textures with
  mipmaps, and blended in linear light with cover-fit and `object-position`.
- **Crossfade fallback**, with one diagnostic per reason, when:
  - WebGL2 is unavailable or the context is lost (it resumes after restoration);
  - the media is not ready or is cross-origin without CORS;
  - an item has no usable `data-carousel-media`;
  - the carousel is off-screen.

### Custom effects

`CarouselEffect` objects have:

- `name` and `layout` (`track` or `stack`);
- optional `duration`, `easing` and `constrain(input, diagnose)`;
- `attach(context)`, which returns `{ frame(frame), update?(), detach() }`.

Each frame provides:

- `phase` (`drag`, `animate`, `settle`), `position`, `velocity` (items per second), `direction`;
- `items`, each with `progress`, `shell` and `content`;
- `current`, `next` and `amount`, the pair being transitioned and how far.

The context provides the viewport, track, effect surface, orientation, direction,
`invalidate()` and `diagnose()`. Restore everything you change in `detach()`. Helpers
`stackEffectConstraint`, `carouselItemProgress` and `mergeCarouselOptions` are exported.

Grid/multirow layout, unsnapped free momentum, zoom, linked controllers, thumbnail
controllers, URL routing, raw HTML renderers and a public plugin/module injection
system are outside this Carousel contract. Effects are typed presentation objects,
not installable modules.
