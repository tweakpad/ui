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
| `reveal` | space-separated `fade`, `up`, `down`, `left`, `right`, `zoom-in`, `zoom-out` | `''` |

Read-only: `imageLoadingStatus` (`idle`, `loading`, `loaded`, `error`) and `currentSrc` (the
candidate the browser chose). After every status change, Image dispatches a bubbling, composed
`tp-loading-status-change` event with `detail.status`. Export: `TpImage`, `imageMotionRoles`.

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
  devices that can hover. Zooming never changes layout or the clipping frame.
- **Parallax**: the image moves inside its frame as the page, or the nearest container that
  actually scrolls, scrolls past it. Progress follows that container's scroll axis. A strip
  that scrolls only sideways measures it horizontally (mirrored for right-to-left), and
  everything else measures it vertically. Any direction works with either axis; `left` or
  `right` suit a horizontal strip.
- **Scroll zoom**: `parallax="zoom-in"` scales the image from natural size up to
  `1 + parallax-depth` as it scrolls through. `zoom-out` goes from enlarged back to natural
  size. Combine it with a direction, for example `parallax="up zoom-in"`, to drift and zoom at
  once. Scroll zoom scales the picture inside the moving layer, so it also combines with hover
  `zoom`, and it only ever enlarges, so the frame edges never show. Clipping wrappers that don't scroll, such as a card with
  `overflow: hidden`, are skipped. It is enlarged by `1 + parallax-depth` and travels up to half
  the depth either way, so the frame edges never show. Directions are physical and don't flip
  for right-to-left text. When a CSS scroll-driven timeline would follow that same container,
  parallax runs entirely in CSS. Otherwise, for example under a clipping wrapper or in browsers
  without scroll timelines, it updates once per frame, only for images on screen. Parallax only
  moves while the page actually scrolls past the image.
- **Reveal**: combine tokens, for example `reveal="fade up zoom-in"`. The image waits in its
  start state and animates to rest the first time it enters the viewport. It runs once and
  stays revealed. Stagger a grid with `--tp-image-reveal-delay`.

Reveal publishes the `reveal` motion role (state `change`, from `pending` to `revealed`,
context `effect`, non-blocking) on the Root, so an external motion driver can replace the CSS
transition (see [Motion](./motion.md)). With reduced motion, from `motion-policy="reduce"` or
the system preference, Image appears already revealed, parallax and scroll zoom rest, zoom is instant and
placeholders stop animating.

## Performance

Image is built for pages with hundreds of images:

- All Images share one IntersectionObserver.
- An Image observes visibility only while it is waiting to reveal, showing an animated
  placeholder or running parallax. It stops after it reveals and loads.
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

| Custom property | Default |
| --- | --- |
| `--tp-image-position` | `50% 50%` (object position) |
| `--tp-image-zoom-scale` | `1.1` |
| `--tp-image-reveal-distance` | `var(--tp-space-6)` |
| `--tp-image-reveal-scale` | `0.08` (scale offset for `zoom-in`/`zoom-out`) |
| `--tp-image-reveal-delay` | `0s` |

Markers on the host: `data-status`; `data-in-view` (`true`/`false`, only while visibility is
observed); `data-revealed`.
