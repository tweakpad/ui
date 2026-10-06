# Carousel interruptible motion: proposed spec amendment

**Status: draft.** This change was requested by the user on 2026-10-06 and has not been applied to the live spec. It was drafted against Spec Blocks project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483` at HEAD `8d01eebc` (version 0.3.21, state version `07005867…`).

The user asked for four changes:

- Transitions must never block interaction.
- Drags must respond to velocity and carry inertia.
- A reversal before the transition settles must be handled.
- Repeated next/previous must accelerate the in-flight transition.
- Motion must be frame-based while still honoring easing.

Each item below replaces or extends one live clause.

## UI Foundation Specification: Carousel (`sec-187-carousel`)

### Replace `carousel-adopt-718` (18.7.1.7)

> `transport` is `'transform'` by default or `'scroll'`. `loopMode` is `'continuous'` by default or `'rewind'`, effective only when root loop is true. `loopOptions` accepts `additionalItems=0`, `fillGroups=true`, `preventDuringTransition=false`; count must be a nonnegative integer. `preventDuringTransition=true` restores the source behavior: continuous loops reject navigation and gesture start while a transition is in flight.

### Replace `carousel-adopt-1034` (18.7.6.2)

> Multiply movement by ratio, apply RTL sign, derive the overall swipe direction and the release velocity separately from the latest sample, apply one-way behavior, then enforce direction locks. Preserve the source boundary resistance equations and ratio. `releaseOnEdges` disables resistance and yields according to orientation/RTL boundaries. Release velocity is measured over the last 100 ms of owned movement samples and is zero when the pointer rested for 60 ms or more before release.

### Replace `carousel-adopt-1049` (18.7.6.3)

> Locate the stop group using the source skip/group increments and actual grid distances. Guard empty grids and zero group distance before ratio division.
>
> A release is a flick when it moves at least 0.3 px/ms and has reversed by at least the activation threshold (minimum 10 px) from its furthest point, or when it continues in the overall direction at that speed. A flick decides the short-swipe direction from its velocity, independent of elapsed time. Otherwise, a long classification uses `elapsed > longSwipeMs`.
>
> For next, the source ratio comparison is `>= longSwipeRatio`; previous uses `> 1 - longSwipeRatio` for the forward-side snap. Preserve this asymmetry and the short-swipe direction behavior. Disabled long or short mode returns to the accepted snap. Navigation-button release targets resolve actual action elements through composed paths.

### Add to 18.7.4.1 (transform transport), after `carousel-adopt-976`

> Transform-transport motion is sampled every animation frame from the presented position and velocity.
>
> - A navigation from rest uses the resolved speed and easing unchanged.
> - A navigation that starts while the presentation is moving, including a drag release, continues from the presented position at the presented velocity. It uses a curve that arrives at rest on the destination snap. Toward the destination, its duration is shortened (to no less than 35% of the resolved speed) so the presented velocity is kept rather than eased in again.
> - A navigation that supersedes an in-flight transition ends no later than the superseded one, down to 50% of the resolved speed. Repeated next/previous therefore accelerates the movement.
> - Each replacement publishes a new motion request and generation, and cancels the previous one through the shared motion owner.
> - Zero speed and reduced motion remain instant.
>
> This is snap settlement, not free momentum: every movement still ends on an accepted snap.

### Replace `carousel-adopt-1083` (18.7.7.2), first sentence

> Port the configured delta/time thresholds, the source 6-unit/60 ms suppression and the recent-event direction/magnitude decisions. In snap mode, a new wheel impulse during a transition supersedes it like any other navigation, unless `preventInteractionOnTransition` or `loopOptions.preventDuringTransition` is set.

### Extend `carousel-adopt-1060` (18.7.6.4)

> While an owned gesture is pending or active, the Carousel holds a selection-and-drag lease. It prevents `selectstart` and native `dragstart` for its owned surface, and marks the track non-selectable while dragging. Native drag of an explicitly draggable descendant (`draggable="true"`) cancels the carousel activation instead. Default controls and indicators are not text-selectable, so repeated activation does not select surrounding content.

### Replace in `req-f-carousel-presenter-default`

> Without an effect, the presenter **MUST** translate the track and animate frame by frame through the `track` motion role.

The phrase "exactly as before" is removed.

## UI Component Library Specification: Carousel (`ucl21-carousel`)

In `carousel-effect-factories`, list the shader variants as `wipe`, `displace`, `chromatic` and `crosswarp`. Note that the shader accepts a travel `direction` (four edges and four corners).

No change to properties, parts or events. The `track` and `transition` motion roles keep their rows. Drivers still claim each replacement request.
