# Carousel

`tp-carousel` presents slotted content or keyed data at discrete positions. Navigation,
keyboard, swipe, optional wheel input, indicators and the scrollbar share one numeric
selection. Dragging and native scrolling expose provisional progress; they do not
publish selection until the owner accepts a destination.

```html
<tp-carousel label="Project stages">
  <tp-card
    ><h3>Research</h3>
    <p>Understand the problem.</p></tp-card
  >
  <tp-card
    ><h3>Design</h3>
    <p>Explore the interaction.</p></tp-card
  >
  <tp-card
    ><h3>Review</h3>
    <p>Test the complete experience.</p></tp-card
  >
</tp-carousel>
```

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
their composed event path; there is no public listener-order flag.

`keyboard` is enabled by default, with `pageKeys=false` and `homeEnd=true`; false
disables it. Arrow keys follow the active logical axis and RTL. Home/End select
boundaries. Optional PageUp/PageDown use the same snap navigation. Modifiers, IME,
cross-axis keys and descendant editing/control behavior remain native.

`mousewheel` defaults false. Its enabled group defaults to `enabled=true`,
`forceToAxis=false`, `releaseOnEdges=false`, `invert=false`, `sensitivity=1`,
`target='root'`, `thresholdDelta=null`, `thresholdTime=null`, and
`ignoreSelector='[data-tp-no-wheel]'`. Sensitivity is positive; explicit thresholds
are nonnegative. Pixel, line, page and Shift deltas are normalized before axis/RTL
mapping. Control zoom remains native. A handled custom wheel event never also
performs native viewport scrolling.

### Navigation, indicators and scrollbar

`navigation` defaults to `{enabled:true, previous:true, next:true, icons:true,
placement:'footer', hideOnClick:false}`. `previousElement` and `nextElement` are
optional scoped targets replacing only their corresponding generated Button.
One element cannot own both actions. Labels remain consumer-owned unless explicitly
replaced through messages. Placements are `footer`, `inside`, and `outside`.

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
bullets are presentation, and fraction/status text describes committed snaps.
Custom rendering must preserve accessible action/position meaning. Indicator count
is snap count, which may differ from item count or mounted virtual count.

`scrollbar` defaults false. Enabling it defaults to `enabled=true`,
`draggable=false`, `thumbSize='auto'`, `visibility='always'`. A numeric thumb size
must be positive and is constrained by track extent and the shared minimum.
Visibility accepts `always`, `automatic`, `while-scrolling`, or `on-hover`.
Optional `element` and `thumbElement` accept scoped targets. An interactive bar has
scrollbar semantics, keyboard navigation and mandatory snap-on-release. Its common
geometry/capture/rendering owner is also used by Scroll Area. Timed visibility
waits 1000 ms, retains hover/focus/drag, and uses the scrollbar visibility motion role.

### Transport, looping, responsiveness and observation

`transport` is `'transform'` or `'scroll'`, default transform. Native scrolling is
provisional until scroll settlement; rejection restores the committed snap. Native
smooth-scroll timing belongs to the browser. Transform resistance and simulated
mouse dragging are inactive in native mode.

Root loop permits `loopMode='continuous'` (default) or `'rewind'`.
`loopOptions` defaults to `{additionalItems:0, fillGroups:true,
preventDuringTransition:true}`. Additional items is a nonnegative integer.
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

`observation` defaults to `{resizeObserver:true, windowResize:true,
observeItemSubtree:false, observeParents:false}`. Membership and layout updates
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
configured. Focus, hover, hidden documents, reduced motion, gestures, scrollbar
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
source event, trigger, cancellation/propagation and proposal metadata identifying
the IDs, snap and generation. Input reasons include `trigger-press`, `item-press`,
`keyboard`, `swipe`, `wheel`, `drag`, `track-press`, `imperative-action`, and
`automatic-advance`. Lifecycle/owner changes use their registered reasons.

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
`carousel-autoplay-control`, and `carousel-announcements`. Legacy `root`, `viewport`,
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

Motion roles are `track`, `auto-height`, and `scrollbar-visibility`: state motions
with phase `change` and non-blocking completion. Shared motion policy, consumer
drivers, cancellation and bounded completion apply. Reduced motion and explicit
zero-speed requests settle immediately.

Grid/multirow layout, unsnapped free momentum, zoom, effects, parallax, linked
controllers, thumbnail controllers, URL routing, raw HTML renderers and a public
plugin/module injection system are outside this Carousel contract.
