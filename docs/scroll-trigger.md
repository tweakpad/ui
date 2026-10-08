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

Read-only: `status` (`idle`, `loading`, `ready`), `members` (the member elements in order) and
`revealed`.

## Entry

The trigger prepares members within 25% of the visible area (and of scroll containers), and
reveals on any intersection. With `reveal-repeat` it reveals only once it is 10% inside the
viewport and resets the moment it is entirely out, so a member's start offset cannot pull it
back in and loop. Without IntersectionObserver, or under reduced motion, the sequence plays as
soon as the members are ready, without stagger.

## Events

| Event | Detail | When |
| --- | --- | --- |
| `tp-loading-status-change` | `{ status, ready, failed, total }` | the members' aggregate readiness changes |
| `tp-reveal-change` | `{ revealed }` | the sequence starts, or a repeat resets it |
| `tp-reveal-change-complete` | `{ revealed }` | the last member's reveal has settled |

Members' events bubble through the trigger under the same names; check `event.target` to tell
them apart. To sync other motion, set `reveal-hold`, wait for what you need, then clear it.

Markers on the host: `data-status`, `data-in-view` (while observed) and `data-revealed`.

## Performance

Every trigger, group and standalone member shares the same IntersectionObserver per option set.
Members of a coordinator observe nothing for their reveal, and a trigger that does not repeat
stops observing once it has revealed.
