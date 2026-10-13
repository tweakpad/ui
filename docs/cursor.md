# Cursor

`tp-cursor` replaces the native pointer with a decorative cursor that trails the real pointer with
a spring. Wrap any part of the page in `tp-cursor-zone` to give the cursor a state, a look, content
or attraction while the pointer is inside it. The cursor serves mouse and pen users only: touch
never engages it, and under reduced motion it follows instantly.

```html
<tp-cursor></tp-cursor>

<tp-cursor-zone state="view" style="--tp-cursor-size: 4rem">
  <template><tp-badge>View</tp-badge></template>
  <tp-button>Open the gallery</tp-button>
</tp-cursor-zone>
```

Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css`, or define the two elements yourself
with `defineElement(TpCursor.tagName, TpCursor)` and `defineElement(TpCursorZone.tagName, TpCursorZone)` from `@tweakpad/ui`. Place one `tp-cursor` anywhere in the document; it occupies no
space. The cursor surface lives in the top layer, so dialogs, menus and popovers never cover it.

## Following

The cursor engages when the device reports a hovering fine pointer and a mouse or pen moves. The
host pointer is hidden over the scope while the cursor follows (`hide-native="false"` keeps it, for
an overlay look), and comes back the moment the pointer leaves the window, a touch arrives, the
cursor is disabled or removed. The spring is tuned with `stiffness`, `damping` and `mass`; the
follower settles once it moves slower than `rest-speed` and closer than `rest-delta`, and the frame
loop stops until the pointer moves again.

`scope="region"` limits following to one element: the element named by `region`, or the cursor's
parent element. Outside it the surface hides and the host pointer returns.

## Zones

A zone is a layout-neutral wrapper (`display: contents`): wrapping content never changes its box.
While the pointer is inside the innermost zone that addresses a cursor, that zone is active:

- `state` is published on the cursor as `data-cursor-state="<name>"` and reported through
  `tp-cursor-state-change`, so CSS and scripts can react.
- `--tp-cursor-size`, `--tp-cursor-color`, `--tp-cursor-blend`, `--tp-cursor-opacity` and
  `--tp-cursor-radius` set on the zone are adopted by the surface while the zone is active and
  restored on exit. Zones never infer a look from the controls they wrap.
- A `<template>` child is imported into the cursor content in place of the resting content: a
  label, a badge, an icon or an image. Interactive content inside a template is presented inert and
  reported.
- `stiffness`, `damping` and `mass` on the zone override the cursor's physics while active; the
  follower keeps its position and velocity across the swap.
- `for="<cursor id>"` addresses one cursor; without it a zone addresses every cursor of the
  document, so a dot and a lagging ring can share zones or have their own.

Nested zones work; the innermost wins. Zones inside shadow roots work too. While the page or any scroll container scrolls under a still pointer, including one inside a
shadow root such as Scroll area, the zones under the pointer are resolved again in every frame, so
the state never waits for the browser's own hover update at the end of the scroll; `refresh()` does
the same on demand.

## Sticking

`stick="center"` pulls the cursor to the center of the zone through the same spring.
`stick="bounds"` also publishes the zone's width and height as `--tp-cursor-stuck-width` and
`--tp-cursor-stuck-height` with `data-stuck`, and the default ring morphs into the zone's rectangle
with the medium radius. Bounds come from the zone's own box, or from the union of its element
children when the zone has none; resizes and scrolling re-measure them.

## Native passthrough

Put `native` on a zone around text entry, embedded documents, players or anything else that needs
the real pointer. Inside it the host pointer returns, shadow parts included, and the surface hides
with `data-native` on the cursor.

## Properties

### `tp-cursor`

| Property / attribute             | Values                                | Default    |
| -------------------------------- | ------------------------------------- | ---------- |
| `stiffness`                      | number, 1 to 1000                     | `170`      |
| `damping`                        | number, 0 to 100                      | `26`       |
| `mass`                           | number, 0.1 to 10                     | `1`        |
| `restSpeed` / `rest-speed`       | pixels per second                     | `1`        |
| `restDelta` / `rest-delta`       | pixels                                | `0.1`      |
| `scope`                          | `document`, `region`                  | `document` |
| `region`                         | element id for `scope="region"`       | `''`       |
| `hideNative` / `hide-native`     | boolean (`"false"` keeps the pointer) | `true`     |
| `disabled`                       | boolean                               | `false`    |
| `motionPolicy` / `motion-policy` | `inherit`, `normal`, `reduce`         | `inherit`  |

Values outside the spring ranges are clamped and reported with `cursor-invalid-physics`.

Read-only: `following`, `state`, `zone`, `position` (`{ x, y }` in client pixels), `velocity`
(`{ x, y }` in pixels per second), `pointer`, `pressed`, `stuck`. Methods: `setState(name | null)`
sets a state that persists until cleared or a later zone entry replaces it; `refresh()` re-resolves
the zones under the pointer, re-measures attraction and re-enters the top layer.

### `tp-cursor-zone`

| Property / attribute           | Values                          | Default |
| ------------------------------ | ------------------------------- | ------- |
| `state`                        | token                           | `''`    |
| `for`                          | id of the cursor it addresses   | `''`    |
| `native`                       | boolean                         | `false` |
| `stick`                        | `none`, `center`, `bounds`      | `none`  |
| `stiffness`, `damping`, `mass` | number, or unset for the root's | unset   |
| `disabled`                     | boolean                         | `false` |

Read-only: `hovered`, `template`, `cursor` (the cursor resolved from `for`).

## Events

| Event                     | Detail                                                          | When                                                                                                                                          |
| ------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `tp-cursor-state-change`  | `{ value, previousValue, zone, reason, sourceEvent }`           | Before the state changes; `reason` is `hover` for zone entry, exit and removal, `programmatic` for `setState()`. Cancel it to keep the state. |
| `tp-cursor-follow-change` | `{ value, previousValue, reason, sourceEvent }`                 | When the cursor starts or stops following: `pointer` for input and device changes, `disabled`, `programmatic`.                                |
| `tp-motion-request`       | role `state`, context `state`, `previousState`, `zone`, `stuck` | Before the content transitions on a state change; a driver may claim it.                                                                      |
| `tp-diagnostic`           | `{ code, message }`                                             | `cursor-invalid-physics`, `cursor-zone-no-root`, `cursor-interactive-template`, `cursor-top-layer-unavailable`.                               |

### External drivers

The state change is a non-blocking state role named `state` on the surface. A listener for
`tp-motion-request` can claim it with `respondWith` to morph the content with an animation library;
the default presentation transitions size, radius, border color, opacity and scale. The per-frame
follow is pointer-coupled positioning and is never offered to drivers.

## Accessibility

The surface is `aria-hidden`, never focusable and never a hit target, so the page's accessibility
tree, focus order and activation are unchanged. The host pointer is hidden only while a visible
replacement is drawn for a mouse-like pointer; keyboard and touch users keep their pointer. Under
reduced motion (`prefers-reduced-motion` or `motion-policy="reduce"`) the cursor stays but snaps to
the pointer and every zone transition is instant.

## Styling

Parts: `cursor` (the host, paints nothing), `cursor-surface` (the fixed box in the top layer:
opacity, blend, color), `cursor-content` (the resting content, the default ring or the zone
content; it scales down in place while pressed) and `cursor-zone` (the zone host). Slot the resting look into `tp-cursor` to
replace the default ring.

| Custom property                                       | Default                 | Purpose                                                      |
| ----------------------------------------------------- | ----------------------- | ------------------------------------------------------------ |
| `--tp-cursor-size`                                    | `var(--tp-space-6)`     | Default ring size; adopted from the active zone.             |
| `--tp-cursor-color`                                   | `var(--tp-foreground)`  | Ring and content color; adopted from the active zone.        |
| `--tp-cursor-blend`                                   | `normal`                | Surface `mix-blend-mode`; `difference` inverts over content. |
| `--tp-cursor-opacity`                                 | `1`                     | Surface opacity while shown.                                 |
| `--tp-cursor-radius`                                  | `var(--tp-radius-full)` | Default ring radius.                                         |
| `--tp-cursor-x`, `--tp-cursor-y`                      | published               | Follower position in pixels, on the host (read-only).        |
| `--tp-cursor-velocity-x`, `--tp-cursor-velocity-y`    | published               | Velocity in pixels per second, unitless (read-only).         |
| `--tp-cursor-stuck-width`, `--tp-cursor-stuck-height` | published               | The zone extents while stuck to bounds (read-only).          |

Markers on the cursor host: `data-following`, `data-outside`, `data-cursor-state`, `data-pressed`,
`data-moving`, `data-native`, `data-stuck`, `data-disabled`. On a zone: `data-hovered`. Transitions
scale with the motion policy.

## Limits

Touch and coarse pointers never engage the cursor. Pointer lock is not supported. No events arrive
while the pointer is over an embedded document, so the cursor rests at the last point until the
pointer leaves or moves. Hiding the host pointer reaches library shadow parts;
third-party shadow roots that set their own `cursor` keep it, and the custom cursor draws on top.
The cursor is not printed. A zone measures its element children for attraction, so a zone that
wraps only text sticks to nothing.
