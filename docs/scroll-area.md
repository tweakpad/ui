# Scroll area

`tp-scroll-area` keeps a native scroll viewport and adds custom proportional scrollbars. Wheel, touch, keyboard, focus and scroll anchoring remain native. Give the host a constrained height or width; its contents determine the scroll extent.

```html
<tp-scroll-area label="Project history" style="height: 18rem">
  <!-- Ordinary document content or library components. -->
</tp-scroll-area>
```

| Property / attribute                           | Type                                                    | Default     | Behavior                                                                                                                                                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orientation`                                  | `vertical` / `horizontal`                               | `vertical`  | Default scrollbar orientation. Native viewport can still scroll both axes.                                                                                                                                                                                 |
| `axis`                                         | `x` / `y` / `both` / undefined                          | undefined   | Compatibility option: chooses tracks and restricts native overflow for a single axis.                                                                                                                                                                      |
| `label`                                        | string                                                  | empty       | Optional accessible name; a named viewport is a region.                                                                                                                                                                                                    |
| `scrollbarVisibility` / `scrollbar-visibility` | `automatic` / `always` / `while-scrolling` / `on-hover` | `automatic` | Automatic shows each overflowing axis, matching the Base/shadcn default; on-hover and while-scrolling are explicit opt-in visibility policies. Changes presentation only.                                                                                  |
| `keepMounted` / `keep-mounted`                 | boolean                                                 | false       | Retains tracks without overflow. Retained tracks are hidden unless visibility is `always`.                                                                                                                                                                 |
| `scrollbars`                                   | `ScrollbarOptions[]` / undefined                        | undefined   | Independent track configuration; each descriptor has `orientation`, optional `keepMounted` and optional `visibility`. Replaces orientation/axis track selection; at most one track per axis. An empty array leaves native scrolling without custom tracks. |
| `overflowEdgeThreshold`                        | number / `{xStart?, xEnd?, yStart?, yEnd?}`             | 0           | Each edge marker appears only past its threshold. Missing, nonpositive and nonfinite values become zero. Property only.                                                                                                                                    |
| `showCorner` / `show-corner`                   | boolean                                                 | true        | Renders the intersection of visible horizontal and vertical tracks. Set the property to false to omit it.                                                                                                                                                  |
| `disabled`                                     | boolean                                                 | false       | Disables direct scrollbar manipulation and releases any active capture. Does not replace native viewport scrolling.                                                                                                                                        |

`viewportElement` and `contentElement` are read-only element references (null before rendering). Use the viewport's standard `scrollTo`, `scrollBy`, `scrollTop`, `scrollLeft` and `scroll` event APIs. No second scroll position or component change event is maintained. Horizontal offsets follow the native RTL model.

The default slot is the content. Canonical parts are `scroll-area`, `scroll-area-viewport`, `scroll-area-content`, `scroll-area-scrollbar`, `scroll-area-thumb`, and `scroll-area-corner`. Every generated region supports the common `partContracts` and `partPresentation` APIs. Both tracks share a contract; its state supplies `orientation` for independent customization. A delegate must bind the provided behavior bundle.

Root, viewport and content expose `data-has-overflow-x/y`, `data-overflow-x-start/end`, `data-overflow-y-start/end`, and `data-scrolling`. Tracks additionally expose `data-orientation`, `data-hovering`, `data-visible` and `data-disabled`; thumbs expose orientation and scrolling. Programmatic scrolling also sets scrolling state, which clears after 500 ms without another offset change.

Measured outputs are `--tp-scroll-area-overflow-x-start/end` and `--tp-scroll-area-overflow-y-start/end` on the viewport, `--tp-scroll-area-corner-width/height` on the host, and `--tp-scroll-area-thumb-width/height` on each track. These are geometry outputs, not spacing controls. Track padding and thickness, thumb radius, focus and motion consume the shared theme. A thumb never exceeds its usable track; the Foundation's 16-unit minimum is a functional drag bound when enough track space exists.

The native viewport is keyboard focusable. Tracks, thumbs and the corner are accessibility-hidden mirrors. A scrollbar contract may explicitly override `aria-hidden`; doing so makes the consumer responsible for complete scrollbar semantics. Track clicks and drags preserve keyboard focus, temporarily suspend scroll snapping, and restore it on release, cancellation, disabling, removal or disconnection. Track wheel input leaves reached edges unconsumed for ancestor scrolling; control-wheel zoom is untouched.

The canonical example shows a vertical release list with shared Separators. Docs
also includes the reference portrait-artwork gallery and a two-axis region. Both
use the same markup for the preview and code explorer. Gallery photographs use the
reference's public image URLs; image loading does not change the reserved 3:4
Aspect Ratio region or replace the native viewport.
