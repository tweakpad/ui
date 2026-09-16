# Motion

Tweakpad components provide CSS motion by default and publish semantic hooks for consumers that need Web Animations, GSAP, Motion One, or another tween runtime. The hook describes what is changing and supplies the current target; it does not expose a selector or transfer component state, focus, presence, or mounting to the animation library.

## Default CSS motion

Default transitions use `--tp-duration-fast`, `--tp-duration-normal`, and `--tp-easing-standard`. Their effective duration is multiplied by the inherited motion scale. Ambient animations use the inherited play state.

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
    const animation = request.target.animate(
      request.phase === 'enter'
        ? [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }]
        : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-4px)' }],
      { duration: 220, easing: 'cubic-bezier(.2, 0, 0, 1)', fill: 'both' },
    );

    return {
      finished: animation.finished.then(() => undefined),
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

The library does not split text, construct timelines, or define choreography between arbitrary descendants. A consumer may do that inside `play()` using its own light-DOM content. The Accordion **External line-by-line motion** story demonstrates this boundary by claiming only each Item's `content` role and staggering its paragraphs; panel measurement and presence remain owned by Accordion.

## Current role inventory

| Component | Roles |
| --- | --- |
| Accordion Item | `disclosure` (blocking presence), `content` (blocking presence, no default visual motion), `indicator` (state) |
| Dialog, Alert dialog | `backdrop` (blocking presence) |
| Drawer, Side panel | `backdrop`, `surface` (blocking presence) |
| Popover, Preview card, Tooltip | `surface` (blocking presence) |
| Navigation panel | `collapse`, `compact-surface` (state) |
| Switch | `track`, `thumb` (state) |
| Carousel | `track` (state) |
| Progress | `value` (state), `indeterminate` (ambient) |
| Spinner | `rotation` (ambient) |
| Card | `interaction` (state) |
| Skeleton | `loading` (ambient) |

State and ambient roles are non-blocking. Presence roles above are blocking, so their actual playback completion controls the stable open/closed completion notification. Driver errors, rejected finite playback, missing targets, duplicate claims, and bounded-completion failures emit `tp-diagnostic` and cannot leave lifecycle completion pending forever.
