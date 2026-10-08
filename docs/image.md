# Image

`tp-image` shows a responsive image. It can sit in a fixed-ratio frame, shows a placeholder while
it loads and a fallback if it fails, and can add hover zoom, scroll parallax and a reveal when
it scrolls into view. The browser picks and loads the resource. Image passes your request
attributes and `<source>` children to a native `<picture>` and reads the loading status from
that image, so native lazy loading keeps working and nothing is downloaded twice.

```html
<tp-image
  ratio="1.7777777778"
  src="/photos/office-1280.jpg"
  srcset="/photos/office-640.jpg 640w, /photos/office-1280.jpg 1280w"
  alt="A bright open-plan office"
></tp-image>
```

Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css`. To bundle only Image, call
`defineElement(TpImage.tagName, TpImage)`; it also defines the Aspect Ratio, Skeleton,
Spinner and Icon elements it renders.

## Properties

| Property / attribute | Values | Default |
| --- | --- | --- |
| `src` | URL | `''` |
| `srcSet` / `srcset` | srcset candidate list (`w` or `x` descriptors) | `''` |
| `sizes` | sizes list | derived (see [Responsive images](#responsive-images)) |
| `alt` | text; empty marks the image decorative | `''` |
| `loading` | `lazy`, `eager` | `lazy` |
| `fetchPriority` / `fetchpriority` | `high`, `low`, `auto` | host default |
| `crossOrigin` / `crossorigin` | `anonymous`, `use-credentials` | none |
| `referrerPolicy` / `referrerpolicy` | referrer policy | host default |
| `width`, `height` | intrinsic pixel dimensions | none |
| `ratio` | finite number greater than zero (width ÷ height) | none: intrinsic geometry |
| `fit` | `cover`, `contain`, `fill`, `none`, `scale-down` | `cover` |
| `placeholder` | `skeleton`, `spinner`, `none` | `skeleton` |
| `zoom` | `none`, `in`, `out` | `none` |
| `zoomed` | boolean | `false` |
| `parallax` | `none`, or space-separated: one of `up`, `down`, `left`, `right` and/or one of `zoom-in`, `zoom-out` | `none` |
| `parallaxDepth` / `parallax-depth` | number from 0 to 1 | `0.3` |
| `parallaxSmoothing` / `parallax-smoothing` | number from 0 to 1 (clamped to 0.98) | `0` (locked to the scroll) |
| `reveal` | space-separated `fade`, `up`, `down`, `left`, `right`, `zoom-in`, `zoom-out` | `''` |
| `revealRepeat` / `reveal-repeat` | boolean: reveal on every entry instead of only the first | `false` |
| `revealHold` / `reveal-hold` | boolean: a ready reveal waits in its start state until cleared | `false` |

Read-only: `imageLoadingStatus` (`idle`, `loading`, `loaded`, `error`), `currentSrc` (the
candidate the browser chose) and `revealed`. Exports: `TpImage`, `TpImageGroup`,
`imageMotionRoles`.

All events bubble and are composed:

| Event | Detail | When |
| --- | --- | --- |
| `tp-loading-status-change` | `{ status }` | After every loading status change. |
| `tp-reveal-change` | `{ revealed, effect }` | When a reveal starts (`true`) or a repeating reveal resets (`false`). |
| `tp-reveal-change-complete` | `{ revealed }` | When that motion has settled, including any delay. Under reduced motion it fires at once. |

Setting an invalid `ratio` throws `RangeError` and keeps the previous value. Without `ratio`,
the image keeps its own proportions. Give `width` and `height` (or set them on the selected
`<source>`) so the space is reserved before the image loads. When the host has an explicit
block size, `fit` applies within it.

## Responsive images

Image uses the browser's standard rules for choosing a file. It never rewrites or preloads a
candidate.

- **Density (`x`)**: the browser picks the candidate that matches the device pixel ratio.
- **Width (`w`)**: the browser picks by `sizes`. If `sizes` is omitted, the image is lazy and
  `srcset` has width descriptors, Image sets `sizes="auto, 100vw"`. The browser then picks by
  the image's actual laid-out width, and browsers without `auto` fall back to the viewport
  width. An explicit `sizes` is passed through unchanged. An eager image without `sizes` keeps
  the browser default (`100vw`).
- **Attribute order**: `loading`, `decoding` (always `async`), `fetchpriority`, policies,
  `width`, `height` and `sizes` are set before `srcset`, and `srcset` before `src`. A browser
  never starts a request with defaults you didn't choose.
- **Art direction and formats**: `<source>` children are mirrored, in order, into the image's
  `<picture>`. Use `media` to switch crops between layouts and `type` for AVIF or WebP with a
  fallback. The authored `<source>` elements never request anything themselves. Adding,
  removing or editing a source reloads the image.

```html
<tp-image ratio="1.5" src="/hero-1280.jpg" alt="Mountain ridge at dawn">
  <source media="(max-width: 600px)" type="image/avif" srcset="/hero-tall-400.avif 400w, /hero-tall-800.avif 800w" />
  <source media="(max-width: 600px)" srcset="/hero-tall-400.jpg 400w, /hero-tall-800.jpg 800w" />
  <source type="image/avif" srcset="/hero-640.avif 640w, /hero-1280.avif 1280w" />
</tp-image>
```

When the browser switches candidates after loading, for example when you resize across a
`media` breakpoint, `currentSrc` updates and the status stays `loaded`. For a hero image that
is the largest content on first paint, use `loading="eager"` and `fetchpriority="high"`.

## Loading, placeholder and fallback

While loading, Image shows a pulsing Skeleton (`placeholder="skeleton"`), a static Skeleton
with a Spinner (`spinner`), or nothing (`none`). Content in the `placeholder` slot replaces
it, for example a tiny blurred preview. Once loaded, the image fades in. A cached image appears
without a loading phase or fade. If loading fails, or there is no source, Image shows a static
Skeleton with a broken-image icon, or your `fallback` slot content. The image stays hidden
until it loads, so a broken-image glyph never appears.

## Zoom, parallax and reveal

- **Zoom**: `zoom="in"` scales the image up while the pointer hovers it. `zoom="out"` starts
  scaled up and settles to natural size on hover. Set `zoomed` to apply the hover state from
  elsewhere, for example while a surrounding card is hovered. Hover zoom applies only to
  devices that can hover, and it never changes layout or the clipping frame. By default it
  takes twice the normal duration (560ms) and eases out. Tune it with `--tp-image-zoom-duration`
  and `--tp-image-zoom-easing`.
- **Parallax**: the image moves inside its frame as the page, or the nearest container that
  actually scrolls, scrolls past it. Clipping wrappers that don't scroll, such as a card with
  `overflow: hidden`, are skipped. Progress follows that container's scroll axis: a strip that
  scrolls only sideways measures it horizontally (mirrored for right-to-left), and everything
  else measures it vertically. The image is enlarged by `1 + parallax-depth` and travels up to
  half the depth either way, so the frame edges never show. Directions are physical and don't
  flip for right-to-left text, and any direction works with either axis; `left` and `right`
  suit a horizontal strip. Parallax only moves while the container actually scrolls past the
  image.
- **Scroll zoom**: `parallax="zoom-in"` scales the image from natural size up to
  `1 + parallax-depth` as it scrolls through. `zoom-out` goes from enlarged back to natural
  size. Combine it with a direction, for example `parallax="up zoom-in"`, to drift and zoom at
  once. Scroll zoom scales the picture inside the moving layer, so it also combines with hover
  `zoom`, and it only ever enlarges, so the frame edges never show.
- **Smoothing**: by default parallax and scroll zoom are locked to the scroll.
  `parallax-smoothing` (0 to 1) makes them trail behind and ease into place after scrolling
  stops. The value is the share of the remaining distance still left after one 60 fps frame:
  `0.5` trails slightly, `0.9` glides slowly. It is clamped to 0.98, and it behaves the same at
  any frame rate.
- **How it runs**: locked parallax runs entirely in CSS when a scroll-driven timeline would
  follow the real scroller. Smoothed parallax, parallax under a clipping wrapper, and browsers
  without scroll timelines update from one shared scroll subscription per container, once per
  frame and only for images on or near the screen. An image is measured and placed shortly
  before it scrolls into view, so it never jumps when it appears. Frames that only finish
  trailing motion read no layout, and they stop once everything has settled.
- **Reveal**: combine tokens, for example `reveal="fade up zoom-in"`. The image waits in its
  start state and animates to rest the first time it enters the viewport, then stays revealed.
  The reveal never starts before the image is ready. An image that enters while still loading
  stays in its start state until it has loaded and decoded, then reveals if it is still in view.
  An image that fails to load reveals its fallback, and one with no source reveals at once.
  Add `reveal-repeat` to play it again on every entry: once the image is fully out of view, it
  returns to its start state instantly, out of sight, and reveals again when it is back at
  least 10% inside the viewport. That margin stops it flickering at an edge. Tune the timing
  with `--tp-image-reveal-duration` and `--tp-image-reveal-easing`, stagger a grid with
  `--tp-image-reveal-delay`, and set them on a container to apply to every image inside.

Reveal publishes the `reveal` motion role (state `change`, from `pending` to `revealed`,
context `effect`, non-blocking) on the Root, so an external motion driver can replace the CSS
transition (see [Motion](./motion.md)). With reduced motion, from `motion-policy="reduce"` or
the system preference, Image appears already revealed, parallax and scroll zoom rest, zoom is instant and
placeholders stop animating.

## Groups and coordination

Wrap images in `tp-image-group` to treat them as a set. The group starts fetching every member
once it is within 25% of the viewport, so lazy members don't hold the set back. It reveals
nothing until every member has settled (loaded and decoded, or failed and showing its fallback).
Then it reveals the members together, in document order, `stagger` milliseconds apart. Members
that have no `reveal` of their own use the group's `reveal`. Inside a group, members never
trigger their own reveal; the group owns their timing. Lay the group out like any block, for
example as a grid.

```html
<tp-image-group reveal="fade up" stagger="120" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px">
  <tp-image ratio="1" src="/a.jpg" alt=""></tp-image>
  <tp-image ratio="1" src="/b.jpg" alt=""></tp-image>
  <tp-image ratio="1" src="/c.jpg" alt=""></tp-image>
</tp-image-group>
```

| Group property / attribute | Values | Default |
| --- | --- | --- |
| `stagger` | milliseconds between consecutive member reveals | `0` (in sync) |
| `staggerFrom` / `stagger-from` | `first`, `last`, `center` | `first` |
| `reveal` | default effect tokens for members without their own | `''` |
| `revealRepeat` / `reveal-repeat` | replay the group reveal on every entry | `false` |
| `revealHold` / `reveal-hold` | hold the whole group; a member's own hold also holds it | `false` |

The group's read-only properties are `loadingStatus` (`idle`, `loading`, `loaded`), `images`
(the members in order) and `revealed`. It dispatches `tp-loading-status-change` with
`{ status, loaded, failed, total }` when the set's status changes, `tp-reveal-change` with
`{ revealed }` when the sequence starts or resets, and `tp-reveal-change-complete` when the last
member's reveal has settled. Members' events bubble through the group with the same names, so
check `event.target === group` to handle only the group's.

To sequence a group with text or other images, put them in a [Scroll trigger](scroll-trigger.md):
the trigger waits for every member (the group waits for its images) and reveals them in order.
An image belongs to its nearest group or trigger, and a group inside a trigger or another group
is one member of it, playing its own stagger after the delay it receives. Images added later
join the set and reveal as soon as they settle. For other motion, hold the group, wait for what
you need, then clear `reveal-hold`.

## Performance

Image is built for pages with hundreds of images:

- All Images share one IntersectionObserver.
- An Image observes visibility only while it is waiting to reveal (always, with
  `reveal-repeat`), showing an animated placeholder or running parallax. It stops after it reveals and loads.
- Placeholders that are off screen pause their animation.
- The parallax fallback keeps one scroll subscription per scrolling container. It measures
  every visible image before writing any of them, once per frame.
- A MutationObserver exists only on Images that have `<source>` children.
- No `will-change` is applied, so idle images create no compositing layers.

## Accessibility

`alt` names the image; `alt=""` marks it decorative. The placeholder and the default fallback
are hidden from assistive technology and never announce anything, so a gallery doesn't create
dozens of live regions. The frame reports `aria-busy` while loading. Fallback content you
supply stays exposed, so it can describe the missing image.

## Styling

Image paints no surface of its own. The placeholder and fallback surfaces are the composed
Skeleton, so theme tokens such as `--tp-muted` apply. Set `border-radius` on the host to round
the frame.

| Part | Element |
| --- | --- |
| `frame` (`image-frame`) | the clipping frame (an Aspect Ratio box when `ratio` is set) |
| `media` (`image-media`) | the layer that zoom and parallax move |
| `picture` (`image-picture`) | the native image |
| `placeholder` (`image-placeholder`) | the loading surface |
| `fallback` (`image-fallback`) | the failure surface |
| `image-group` | the `tp-image-group` host |

| Custom property | Default |
| --- | --- |
| `--tp-image-position` | `50% 50%` (object position) |
| `--tp-image-zoom-scale` | `1.1` |
| `--tp-image-zoom-duration` | `calc(var(--tp-duration-normal) * 2)`; always scaled by the motion policy |
| `--tp-image-zoom-easing` | `ease-out` |
| `--tp-image-reveal-distance` | `var(--tp-space-6)` |
| `--tp-image-reveal-scale` | `0.08` (scale offset for `zoom-in`/`zoom-out`) |
| `--tp-image-reveal-delay` | `0s` |
| `--tp-image-reveal-duration` | `calc(var(--tp-duration-normal) * 2)`; always scaled by the motion policy |
| `--tp-image-reveal-easing` | `var(--tp-easing-standard)`; any CSS easing |

Markers on the host: `data-status`; `data-in-view` (`true`/`false`, only while visibility is
observed); `data-revealed`.
