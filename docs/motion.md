# Motion

Tweakpad components provide CSS motion by default and publish semantic hooks for consumers that need Web Animations, GSAP, Motion One, or another tween runtime. The hook describes what is changing and supplies the current target; it does not expose a selector or transfer component state, focus, presence, or mounting to the animation library.

## Motion tokens

Every default animation takes its timing from six token roles, installed with the
rest of the token set by `@tweakpad/ui/styles.css`:

| Role                   | Default                          | Used for                                                       |
| ---------------------- | -------------------------------- | -------------------------------------------------------------- |
| `--tp-duration-fast`   | `200ms`                          | Feedback: color, fill, track and thumb changes; dialog fades   |
| `--tp-duration-normal` | `280ms`                          | Anchored surfaces, panels, layout changes and viewport moves   |
| `--tp-duration-slow`   | `560ms`                          | Image and Text motion reveals, hover zoom                      |
| `--tp-easing-standard` | `cubic-bezier(0.2, 0, 0, 1)`     | State changes and movement within the page                     |
| `--tp-easing-enter`    | `cubic-bezier(0.22, 1, 0.36, 1)` | Arrivals: opening surfaces, reveals, items settling into place |
| `--tp-easing-exit`     | `cubic-bezier(0.4, 0, 1, 1)`     | Departures: closing surfaces                                   |

Durations increase from fast to slow. Every finite animation multiplies its
duration by `--tp-motion-scale`, which the reduced-motion policy sets to `0`, so
reduced motion makes it instant. Override the roles on `:root` or on any subtree
to retime everything inside it:

```css
.calm-region {
  --tp-duration-normal: 400ms;
  --tp-easing-enter: cubic-bezier(0.16, 1, 0.3, 1);
}
```

Script-driven motion follows the same roles. Carousel tracks and auto height, Flow
layout and viewport moves (`fitView`, `zoomTo`, `setCenter`), Map zoom steps,
Tree view row reordering and the Easing editor's range resolve the roles from
the element they animate, so a scoped override reaches them too. A `duration`
option on one of those calls replaces the role for that call and is still scaled
by the motion policy. Option defaults with their own documented values, such as
Drag drop list transitions and Carousel effect durations, are unchanged by the
roles.

## Default CSS motion

Feedback (color, track and thumb changes) and dialog fades use the fast
duration; anchored surfaces, panel movement and layout changes use the normal
duration. State changes use the standard easing. Focus rings appear immediately.
Component recipes list the properties they animate; none use `transition: all`.

Menu, Popover, Preview Card, Tooltip, Navigation Menu popup and ordinary Select
popup share opacity, scale and side-relative entry/exit: they arrive on the
enter easing and leave on the exit easing over the same duration. Select's
inline and item-aligned layouts preserve their anchoring geometry. Drawer and
Side Panel slide from their attached viewport edge on the standard easing in
both directions, so a release continues the swipe; their backdrop fades
independently. Dialog and Alert Dialog fade their content and backdrop together
from the first closing frame; neither waits visibly for the other to disappear.

Spinner and indeterminate Progress share a continuous activity cadence of four
times the normal duration; Skeleton placeholders, the Marker shimmer and the Status
dot pulse and ping use twice that period. Rotation, sweep and ping remain linear,
while pulse and progress use the standard easing.
All ambient motion observes the inherited `--tp-motion-play-state`, which the
reduced-motion policy pauses. Gesture-driven surfaces remain directly coupled to
the pointer, then derive release timing from their published strength and the
same normal duration.

Set `motion-policy="reduce"` on any Tweakpad component or ancestor Tweakpad component to suppress nonessential motion in that subtree. `motion-policy="normal"` opts a subtree back into normal motion. `inherit` is the property default. When no explicit boundary applies, `prefers-reduced-motion` supplies the policy.

```html
<tp-dialog motion-policy="reduce">…</tp-dialog>
```

Reduced motion does not skip component lifecycle states. Presence still publishes `starting` and `ending`, then completes at the next scheduling checkpoint.

## External drivers

Before a declared role starts its default presentation, its component dispatches a bubbling, composed `tp-motion-request`. Call `respondWith(driver)` synchronously to claim it. The first claim wins; later or asynchronous claims are ignored and emit `tp-diagnostic`.

```ts
import type { MotionDriver, TpMotionRequestEvent } from '@tweakpad/ui';

const driver: MotionDriver = {
  play(request) {
    const style = getComputedStyle(request.owner);
    // Duration roles compute to canonical times such as `0.2s`.
    const duration = parseFloat(style.getPropertyValue('--tp-duration-fast')) * 1000;
    const easing = style.getPropertyValue(
      request.phase === 'enter' ? '--tp-easing-enter' : '--tp-easing-exit',
    );
    const animation = request.target.animate(
      request.phase === 'enter'
        ? [
            { opacity: 0, transform: 'translateY(-4px)' },
            { opacity: 1, transform: 'none' },
          ]
        : [
            { opacity: 1, transform: 'none' },
            { opacity: 0, transform: 'translateY(-4px)' },
          ],
      { duration, easing, fill: 'both' },
    );
    const finished = animation.finished.then(() => {
      animation.cancel();
    });

    return {
      finished,
      cancel: () => animation.cancel(),
    };
  },
};

document.addEventListener('tp-motion-request', (event) => {
  const motionEvent = event as TpMotionRequestEvent;
  if (motionEvent.request.role === 'surface') motionEvent.respondWith(driver);
});
```

`play()` runs only after the component has published its current state. A claimed role suppresses default CSS only on that role's target. Unclaimed sibling roles keep their CSS motion. The returned `finished` promise participates in presence completion only when the role is declared blocking. On reversal, replacement, or destruction, the request signal aborts and `cancel()` is called once; stale completion cannot roll state back.

The request contains:

- `role`, `kind`, and `phase`
- the owning public component and current presentation `target`
- `fromState`, `toState`, and documented public `context`
- the resolved `reducedMotion` decision
- an abort `signal`

Treat `target` as request-scoped. Do not retain it as a permanent DOM identity.

## Tween-library adapter

No tween runtime is a dependency of `@tweakpad/ui`. Adapt the runtime already used by the application. For example, a GSAP adapter can wrap its completion and cancellation surface without changing component internals:

```ts
const gsapDriver = {
  play(request) {
    let resolveFinished!: () => void;
    const finished = new Promise<void>((resolve) => (resolveFinished = resolve));
    const tween = gsap.fromTo(
      request.target,
      { opacity: request.phase === 'enter' ? 0 : 1 },
      {
        opacity: request.phase === 'enter' ? 1 : 0,
        duration: 0.24,
        onComplete: resolveFinished,
        onInterrupt: resolveFinished,
      },
    );
    return { finished, cancel: () => tween.kill() };
  },
};
```

Web Animations and third-party tween libraries do not inherit a component's CSS transition declaration. Resolve the motion roles from the request's owner, as shown above, when the driver should follow the Tweakpad motion theme: duration roles always compute to seconds (`0.28s`), and easing roles to CSS easing functions. The `reducedMotion` field already reflects the resolved policy. Application-specific drivers may instead use durations and easings from their own centralized motion system.

The library splits text only through [Text motion](text-motion.md), whose `reveal` role hands a claimed driver the split pieces, and sequences reveals only through [Scroll trigger](scroll-trigger.md) and Image groups. It does not construct timelines or define choreography between arbitrary descendants. A consumer may do that inside `play()` using its own light-DOM content. The Collapsible and Accordion **External line-by-line motion** stories demonstrate this boundary by claiming only the `content` role and staggering their paragraphs; panel measurement and presence remain owned by Collapsible.

## Current role inventory

Public context lists only stable values supplied by the component in addition to the request's standard fields. `—` means that the role has no additional context.

| Component                      | Role                | Public target                               | Kind and phases                                     | Public context                                       | Completion   |
| ------------------------------ | ------------------- | ------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------- | ------------ |
| Collapsible; Accordion Item    | `disclosure`        | Content                                     | presence: `enter`, `exit`                           | `value`, `index` only in Accordion                   | blocking     |
| Collapsible; Accordion Item    | `content`           | ContentBody                                 | presence: `enter`, `exit`; no default visual motion | `value`, `index` only in Accordion                   | blocking     |
| Collapsible; Accordion Item    | `indicator`         | Default disclosure indicator, when rendered | state: `change`                                     | `value`, `index` only in Accordion                   | non-blocking |
| Tree view                      | `disclosure`        | Group (markup) or row region (records)      | presence: `enter`, `exit`                           | `itemId`, `level`                                    | blocking     |
| Tree view                      | `content`           | Group rows                                  | presence: `enter`, `exit`; no default visual motion | `itemId`, `level`                                    | blocking     |
| Tree view                      | `indicator`         | Default disclosure indicator                | state: `change`                                     | `itemId`, `level`                                    | non-blocking |
| Tree view                      | `sort-displacement` | Item                                        | state: `change`                                     | `itemId`, `fromIndex`, `toIndex`, `x`, `y`           | non-blocking |
| Dialog, Alert dialog           | `backdrop`          | Overlay                                     | presence: `enter`, `exit`                           | —                                                    | blocking     |
| Drawer, Side panel             | `backdrop`          | Overlay                                     | presence: `enter`, `exit`                           | —                                                    | blocking     |
| Drawer, Side panel             | `surface`           | Surface or Content                          | presence: `enter`, `exit`                           | —                                                    | blocking     |
| Popover, Preview card, Tooltip | `surface`           | Content                                     | presence: `enter`, `exit`                           | `placement`                                          | blocking     |
| Select                         | `select.presence`   | Content                                     | presence: `enter`, `exit`                           | —                                                    | blocking     |
| Navigation panel               | `collapse`          | Panel                                       | state: `change`                                     | —                                                    | non-blocking |
| Navigation panel               | `compact-surface`   | Panel                                       | state: `change`                                     | —                                                    | non-blocking |
| Switch                         | `track`             | Track presentation target                   | state: `change`                                     | —                                                    | non-blocking |
| Switch                         | `thumb`             | Thumb                                       | state: `change`                                     | —                                                    | non-blocking |
| Tabs                           | `indicator`         | Indicator, when composed                    | state: `change`                                     | `activationDirection`                                | non-blocking |
| Carousel                       | `track`             | Track                                       | state: `change`                                     | —                                                    | non-blocking |
| Carousel                       | `transition`        | Viewport (effects only)                     | state: `change`                                     | —                                                    | non-blocking |
| Progress                       | `value`             | Indicator                                   | state: `change`                                     | `minimum`, `maximum`, `percentage`, `fromPercentage` | non-blocking |
| Progress                       | `indeterminate`     | Indicator                                   | ambient: `start`, `stop`                            | —                                                    | non-blocking |
| Spinner                        | `rotation`          | Indicator or Root                           | ambient: `start`, `stop`                            | —                                                    | non-blocking |
| Card                           | `interaction`       | Root                                        | state: `change`                                     | `input`                                              | non-blocking |
| Skeleton                       | `loading`           | Placeholder                                 | ambient: `start`, `stop`                            | —                                                    | non-blocking |
| Marker                         | `shimmer`           | Content                                     | ambient: `start`, `stop`                            | —                                                    | non-blocking |
| Status dot                     | `attention`         | Indicator                                   | ambient: `start`, `stop`                            | `motion`                                             | non-blocking |
| Image                          | `reveal`            | Root                                        | state: `change`                                     | `effect`                                             | non-blocking |
| Text motion                    | `reveal`            | Root                                        | state: `change`                                     | `effect`, `unit`, `count`                            | non-blocking |
| Cursor                         | `state`             | Surface                                     | state: `change`                                     | `state`, `previousState`, `zone`, `stuck`            | non-blocking |
| Text editor selection toolbar  | `surface`           | `text-editor-selection-toolbar` part        | presence: `enter`, `exit`                           | `placement`                                          | blocking     |

State and ambient roles are non-blocking. Presence roles above are blocking, so their actual playback completion controls the stable open/closed completion notification. Driver errors, rejected finite playback, missing targets, duplicate claims, and bounded-completion failures emit `tp-diagnostic` and cannot leave lifecycle completion pending forever.
