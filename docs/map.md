# Map

`tp-map` presents an interactive geographic viewport. The basemap comes from a
**map engine** that you supply; the map itself owns the camera, pins, selection,
the selected pin's overlay, controls, events and theming, identically for every
engine. Pins are declarative children whose visual is your own markup (for example
an inline SVG); selecting a pin opens its `tp-map-overlay`, and `tp-map-control`
buttons can live anywhere on the page.

```html
<tp-button-group label="Map view">
  <tp-map-control map="sights" action="zoom-in"></tp-map-control>
  <tp-map-control map="sights" action="zoom-out"></tp-map-control>
  <tp-map-control map="sights" action="reset"></tp-map-control>
</tp-button-group>

<tp-map
  id="sights"
  label="Lisbon sights"
  default-bounds="38.685,-9.235,38.77,-9.085"
  reveal="always"
>
  <tp-map-pin value="castle" latitude="38.7139" longitude="-9.1335" label="São Jorge Castle">
    <svg viewBox="0 0 32 40" width="32" height="40" aria-hidden="true">…</svg>
    <tp-map-overlay>
      <span slot="title">São Jorge Castle</span>
      <span slot="description">R. de Santa Cruz do Castelo</span>
    </tp-map-overlay>
  </tp-map-pin>
</tp-map>

<script type="module">
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/styles.css';
  import * as maplibregl from 'maplibre-gl';
  import maplibreCss from 'maplibre-gl/dist/maplibre-gl.css?raw';
  import { createMapLibreEngine } from '@tweakpad/ui/map';

  document.getElementById('sights').engine = createMapLibreEngine(maplibregl, { css: maplibreCss });
</script>
```

## Engines

The library has no engine dependency. Adapters in `@tweakpad/ui/map` receive the
engine namespace you import, and every adapter produces the same public behavior.

| Adapter                                          | Basemaps                                                         | Notes                                                                                                                                                                                                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createMapLibreEngine(maplibregl, options)`      | Vector styles: OpenFreeMap (default, no key), any MapLibre style | Pass the MapLibre stylesheet as `css` (or rely on the built-in minimal subset). `style` or `styles: { light, dark }` choose the style per scheme. Theme roles recolor matching style layers (`applyTheme`, default `true`).                      |
| `createGoogleMapsEngine(importLibrary, options)` | Google basemaps                                                  | Pass `importLibrary` from `@googlemaps/js-api-loader` or the inline bootstrap. `mapId` enables cloud styling (JSON styles and theme roles then do not apply); `styles: { light, dark }` are JSON styles. Camera animation uses the shared tween. |

OpenFreeMap serves vector tiles only. Google Maps renders Google basemaps, so an
OpenFreeMap basemap needs the MapLibre engine; pins, overlays, controls, events and
keyboard behavior do not change between engines. Implement `MapEngine` (`mount`
returning `getCamera`, `getBounds`, `jumpTo`, `project`, `unproject`,
`attachOverlay` and `destroy`, plus optional animation, fit, zoom-range,
interaction, appearance and resize capabilities) to add another engine.

## Map properties

| Property / attribute                           | Values                                            | Default                |
| ---------------------------------------------- | ------------------------------------------------- | ---------------------- |
| `engine`                                       | `MapEngine` or `null` (property only)             | `null`                 |
| `defaultCenter` / `default-center`             | `latitude,longitude` or `{ latitude, longitude }` | `null`                 |
| `defaultZoom` / `default-zoom`                 | zoom on the 256-pixel scale                       | `1`                    |
| `defaultBounds` / `default-bounds`             | `south,west,north,east` or bounds                 | `null`                 |
| `minZoom` / `min-zoom`, `maxZoom` / `max-zoom` | zoom range                                        | `0`, `20`              |
| `fitPadding` / `fit-padding`                   | CSS pixels                                        | `48`                   |
| `selectedPin` / `selected-pin`                 | pin value or `null` (controlled)                  | uncontrolled           |
| `defaultSelectedPin` / `default-selected-pin`  | pin value or `null`                               | `null`                 |
| `reveal`                                       | `none`, `if-hidden`, `always`                     | `if-hidden`            |
| `revealZoom` / `reveal-zoom`                   | zoom or `null`                                    | `null`                 |
| `interactive`                                  | boolean; `interactive="false"` turns gestures off | `true`                 |
| `cooperativeGestures` / `cooperative-gestures` | boolean                                           | `false`                |
| `theme`                                        | `MapTheme` (property only)                        | `null`                 |
| `label`                                        | viewport accessible name                          | `null` (message `Map`) |
| `messages`                                     | `MapMessages` (property only)                     | `{}`                   |
| `disabled`                                     | boolean                                           | `false`                |

The **home view** is `default-bounds`, else `default-center` with `default-zoom`,
else the fitted pins, else the whole world. The initial camera is the home view and
**reset** returns to it.

## Methods, state and events

`zoomIn(step?)`, `zoomOut(step?)`, `resetView()`, `flyTo({ center, zoom, bearing, pitch })`,
`fitBounds(bounds, { padding, maxZoom })`, `fitPins()`, `selectPin(value | null)` and
`revealPin(value, zoom?)` return promises that resolve `'completed'` or `'cancelled'` (a newer
camera request or a gesture interrupts an animation). `request(action, value, options)` is the
generic form. `project(position)` and `unproject(point)` convert between positions and viewport
pixels. `state` is a frozen snapshot (`status`, `camera`, `bounds`, `moving`, `canZoomIn`,
`canZoomOut`, `selectedPin`, `scheme`, `error`, `pinCount`); `subscribe(selector, callback)`
notifies only when the selected slice changes. `native` is the engine's own map object.

Camera requests made before the engine is ready update the pending camera and apply
at mount. With reduced motion (`motion-policy="reduce"` or the user preference), camera
moves apply immediately.

| Event                   | Cancelable | Detail                                                                       |
| ----------------------- | ---------- | ---------------------------------------------------------------------------- |
| `tp-map-request`        | yes        | `action`, `value`, `reason`, `sourceEvent`, `trigger`                        |
| `tp-map-request-failed` | no         | `action`, `value`, `reason`, `error`                                         |
| `tp-map-ready`          | no         | `native`                                                                     |
| `tp-map-error`          | no         | `error`                                                                      |
| `tp-map-camera-change`  | no         | `camera`, `bounds`, `reason`, `sourceEvent` (at most once per frame)         |
| `tp-map-camera-commit`  | no         | the same, once movement ends                                                 |
| `tp-map-press`          | no         | `position`, `point`, `sourceEvent` (basemap press outside pins and overlays) |
| `tp-value-change`       | yes        | selection proposal (`value`, `previousValue`, `reason`)                      |

Engine gestures use reason `engine`; controls use `trigger-press`; pin presses use
`item-press` or `keyboard`; overlay dismissal uses `escape-key` or `outside-press`;
methods use `imperative-action`.

## Pins

| Property / attribute    | Values                     | Default            |
| ----------------------- | -------------------------- | ------------------ |
| `value`                 | unique identity (required) | `''`               |
| `latitude`, `longitude` | decimal degrees (required) | —                  |
| `label`                 | accessible name (required) | message `Location` |
| `anchor`                | `bottom`, `center`         | `bottom`           |
| `disabled`              | boolean                    | `false`            |

Authored default-slot content replaces the default marker and stays your DOM; SVG
using `currentColor` follows the pin `color`. Pins form one tab stop: Tab reaches the
selected (or last focused, or first) pin, arrow keys move through pins in document
order, Home/End jump to the ends, Enter/Space select and Escape clears the selection.
Each pin is a button with `aria-pressed` reflecting selection.

## Overlay and controls

`tp-map-overlay` is a non-modal Popover anchored to its pin: every Popover slot
(`title`, `description`, `header`, `close`) and placement property applies (`side`
defaults to `block-start`, `side-offset` to 8). It follows the pin while the camera
moves, publishes `data-anchor-hidden` when the pin leaves the viewport, and clears the
selection on Escape or an outside press, returning focus to the pin.

`tp-map-control` (`action="zoom-in | zoom-out | reset | fit-pins"`) composes Button
and Icon (`variant` default `outline`, `size` default `icon`; default-slot content
replaces the icon). Use `map="id"` outside the map. Controls stay focusable and
become `aria-disabled` while the map is not ready or at a zoom limit. Controls join a
Button group's seams.

## Theming

Pins, overlays, controls and the status follow the presentation dictionary and
tokens (`map`, `map-viewport`, `map-pin`, `map-pin-visual`, `map-overlay`,
`map-control`, `map-status`). The basemap follows the map's computed `color-scheme`
(dark styles in a dark scope). `theme` assigns colors to ten roles per scheme —
`background`, `land`, `water`, `park`, `road`, `roadMajor`, `building`, `boundary`,
`label`, `labelHalo` — using any CSS color, including tokens; `tokenMapTheme` maps
them to the library tokens. Call `refreshAppearance()` after changing a scoped theme
that the map cannot observe.

Parts: `viewport`, `status`, `controls` on the map; `pin`, `pin-visual` on pins;
`button`, `icon` on controls; Popover parts on overlays.

## Accessibility

The viewport is a labelled region. Every gesture has a control or key equivalent,
and the map engine keeps its own keyboard pan and zoom. When pins carry essential
information, pair the map with a list of the same locations bound to the selection,
as in the examples.
