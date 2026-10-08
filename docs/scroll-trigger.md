# Scroll trigger

`tp-scroll-trigger` reveals the components inside it together. As it nears the viewport it asks
every member to prepare (images start loading); once it is in view, every member is ready and
nothing holds it, it reveals them in document order, `stagger` milliseconds apart.

```html
<tp-scroll-trigger stagger="200">
  <h2><tp-text-motion split="words lines" mask="lines" reveal="up">A coordinated entrance</tp-text-motion></h2>
  <tp-image-group reveal="fade up" stagger="120" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px">
    <tp-image ratio="1" src="/a.jpg" alt=""></tp-image>
    <tp-image ratio="1" src="/b.jpg" alt=""></tp-image>
    <tp-image ratio="1" src="/c.jpg" alt=""></tp-image>
  </tp-image-group>
  <p><tp-text-motion reveal="fade">The caption follows the images.</tp-text-motion></p>
</tp-scroll-trigger>
```

Here the heading reveals first, the image group 200ms later (its images 120ms apart), and the
caption 200ms after the group starts, but only once all three images have loaded and the
heading's fonts are ready.

Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css`. To bundle only the trigger, call
`defineElement(TpScrollTrigger.tagName, TpScrollTrigger)` and define the members you use.

## Members

Members are the revealing components whose nearest coordinator is the trigger, at any depth and
across shadow roots: [Text motion](text-motion.md), [Image](image.md), Image groups and nested
scroll triggers. Each keeps its own effect and motion role; members without their own `reveal`
use the trigger's. A group or trigger inside the trigger is a single member: it is ready when all
of its own members are, and it plays its own sequence after the delay it receives. Members never
reveal by themselves inside a trigger. A member added after the sequence reveals as soon as it is
ready.

The trigger is an ordinary block with no styling of its own. It is a block before it is defined
too, so binding it never moves the content around it. Lay out its content as you like.

## Properties

| Property / attribute | Values | Default |
| --- | --- | --- |
| `stagger` | milliseconds between consecutive members | `0` |
| `staggerFrom` / `stagger-from` | `first`, `last`, `center` | `first` |
| `reveal` | default effect tokens for members without their own | `''` |
| `revealRepeat` / `reveal-repeat` | reset every member once fully out of view and replay on entry | `false` |
| `revealHold` / `reveal-hold` | hold every member in its start state until cleared | `false` |
| `scrub` | follow the scroll position instead of time | `false` |
| `scrubRange` / `scrub-range` | `contain`, `cover`, `entry`, `exit` | `contain` |
| `scrubSmoothing` / `scrub-smoothing` | 0 to 0.98; how far progress trails the scroll | `0` |
| `pin` | pin the content in a sticky stage for an extra scroll length | `false` |

Read-only: `status` (`idle`, `loading`, `ready`), `members` (the member elements in order),
`revealed` and `progress` (0 to 1 while scrubbing).

## Entry

The trigger prepares members within 25% of the visible area (and of scroll containers), and
reveals on any intersection. With `reveal-repeat` it reveals only once it is 10% inside the
viewport and resets the moment it is entirely out, so a member's start offset cannot pull it
back in and loop. Without IntersectionObserver, or under reduced motion, the sequence plays as
soon as the members are ready, without stagger.

## Scroll-linked reveals

With `scrub`, the scroll position drives the reveal instead of time. The trigger's progress
through its scroller (over `scrub-range`) is mapped onto the same choreography a timed reveal
would play: members start `stagger` milliseconds apart along a timeline that ends when the last
member's own reveal (its duration, stagger and easing) ends, and progress 0 to 1 moves through
that timeline. A section therefore looks the same scrubbed as played.

By default progress only moves forward: once something is revealed, scrolling back up leaves it at
rest. With `reveal-repeat` the reveal follows the scroll both ways. `scrub-smoothing` (0 to 0.98)
makes it trail the scroll a little, like `parallax-smoothing` on Image.

| Range (`scrub-range`) | Progress runs |
| --- | --- |
| `contain` (default) | while the trigger fills its place in the viewport; for a trigger taller than the viewport (a pinned track), from its top at the viewport top to its bottom at the viewport bottom |
| `cover` | from entering at the bottom to leaving at the top |
| `entry` | while entering |
| `exit` | while leaving |

`reveal-hold` keeps every member at its start state. Members are still asked to prepare when the
trigger nears the viewport, but scrubbing does not wait for them: an image that is still loading
scrubs in with its placeholder. Under reduced motion every member is at rest and progress is still
reported. Turning `scrub` off returns the members to timed reveals.

## Pinning

With `pin`, the trigger becomes a track one visible extent tall plus `--tp-scroll-trigger-pin-length`
(default `200cqb`, twice the visible extent) and its content sticks to the top of that extent, in
the `stage` part, for the whole track. Together with `scrub` this is the usual pinned scene: the
section stays in place while the scroll advances its reveal.

The visible extent is the nearest size container: give the scroll container
`container-type: size` and the stage fills it exactly. Without one it is the viewport, for a
section pinned to the page scroll.

```html
<div style="block-size: 26rem; overflow: auto; container-type: size">
  <p>Intro content…</p>
  <tp-scroll-trigger scrub pin stagger="250" style="--tp-scroll-trigger-pin-length: 150cqb">
    <div style="block-size: 100%; display: grid; align-content: center; gap: 16px">
      <h2><tp-text-motion split="words" mask="words" reveal="up">Quiet spaces reveal as you scroll</tp-text-motion></h2>
      <tp-image-group reveal="fade up" stagger="120">…</tp-image-group>
    </div>
  </tp-scroll-trigger>
  <p>The section unpins and the content continues.</p>
</div>
```

The stage is one visible extent tall (minus `--tp-scroll-trigger-pin-top`, for fixed headers) and
clips what does not fit, so lay the scene out inside it as above. The track has the same height
before the element is defined (from `@tweakpad/ui/styles.css`), so pinning never moves the content
that follows. Pinning also works without `scrub`, for a timed reveal inside a pinned stage. As for
any sticky element, there must be no clipping ancestor between the trigger and its scroller.

## Events

| Event | Detail | When |
| --- | --- | --- |
| `tp-loading-status-change` | `{ status, ready, failed, total }` | the members' aggregate readiness changes |
| `tp-reveal-change` | `{ revealed }` | the sequence starts, or a repeat resets it |
| `tp-reveal-change-complete` | `{ revealed }` | the last member's reveal has settled (scrubbed: progress reached 1) |
| `tp-scroll-progress` | `{ progress }` | each frame scrubbed progress changes |

Scrubbed reveals request no motion role. To drive an external animation library from the scroll,
listen to `tp-scroll-progress` and seek your own timeline.

Members' events bubble through the trigger under the same names; check `event.target` to tell
them apart. To sync other motion, set `reveal-hold`, wait for what you need, then clear it.

Markers on the host: `data-status`, `data-in-view` (while observed) and `data-revealed`.

## Performance

Every trigger, group and standalone member shares the same IntersectionObserver per option set.
Members of a coordinator observe nothing for their reveal, and a trigger that does not repeat
stops observing once it has revealed.
