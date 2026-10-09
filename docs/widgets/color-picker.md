# Color picker

`tp-color-picker` edits one CSS color. Its value is a CSS Color 4 string serialized in the active
format; internally the widget keeps a floating-point color in the working space of that format,
so switching formats or dragging never accumulates rounding. The default composition is the
saturation/brightness area with hue and alpha Sliders, a format Select and numeric fields.
Further views (channel sliders, harmony wheel, hue ring with HSV triangle, swatches, schemes)
render inline or inside a popup.

```html
<script type="module">
  import '@tweakpad/ui/styles.css';
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/register/widgets';
</script>
<tp-color-picker label="Accent" name="accent" default-value="#6d5dfc"></tp-color-picker>
```

Supply `value` for a controlled picker or `defaultValue` for an uncontrolled one; the mode stays
fixed for the element's lifetime. The same rule applies to the `format`, `view`, `harmony` and
`open` lanes.

## Value and formats

| Format  | Serialization                          | Working space | Fields                         |
| ------- | -------------------------------------- | ------------- | ------------------------------ |
| `hex`   | `#rrggbb`, `#rrggbbaa` below alpha 1   | sRGB          | hex text                       |
| `rgb`   | `rgb(0 128 255 / 0.5)`                 | sRGB          | red, green, blue (0–255)       |
| `hsl`   | `hsl(242 66% 39%)`                     | HSL           | hue (°), saturation, lightness |
| `hwb`   | `hwb(242 20% 10%)`                     | HWB           | hue, whiteness, blackness      |
| `hsv`   | `hsv(242 63% 99%)` (not CSS)           | HSV           | hue, saturation, brightness    |
| `lab`   | `lab(48.4 40.2 -78.9)`                 | CIE Lab (D50) | lightness, a, b                |
| `oklab` | `oklab(0.586 0.045 -0.222)`            | OKLab         | lightness, a, b                |
| `oklch` | `oklch(0.586 0.227 281.3)`             | OKLCH         | lightness, chroma, hue         |
| `cmyk`  | `device-cmyk(57% 63% 0% 1%)` (not CSS) | device CMYK   | cyan, magenta, yellow, key     |

The widget accepts every CSS Color 4 absolute notation (hex with 3, 4, 6 or 8 digits, legacy and
modern `rgb()` / `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, `color()` in the sRGB,
linear sRGB and XYZ spaces, named colors, `transparent`, `none`) plus the non-CSS `hsv()` and
`device-cmyk()` notations. Whatever notation an owner supplies, `value` reads back as the
canonical serialization of the active format: modern space-separated syntax, lowercase, alpha
appended as `/ a` only when it is below 1 after rounding to two decimals. An empty or
unparsable string is the empty state (`data-empty`); the surfaces then show black.

`format` never follows the value notation; it defaults to `hex` unless `defaultFormat` or
`format` says otherwise. The `formats` list (space-separated attribute) limits the format Select.
Changing the format proposes `tp-format-change` (cancelable); once accepted, the widget publishes
the re-serialized value through a non-cancelable `tp-value-change` followed by `tp-value-commit`
with `metadata.formatChange: true`. The color itself is invariant across formats.

`alpha` (default true) adds the alpha Slider and field and keeps alpha in the value. With
`alpha="false"` alpha is dropped on read and every published value is opaque. The read-only
`color` property exposes the floating-point `{ space, coords, alpha }` record; `hsv()` and
`device-cmyk()` strings are not parsable by the browser, so consumers that need CSS read `color`
or pick another format.

## Views and layout

| View       | Surface and controls                                                                   |
| ---------- | -------------------------------------------------------------------------------------- |
| `area`     | Saturation/brightness plane, eyedropper, hue and alpha Sliders                         |
| `sliders`  | One labeled Slider with a numeric value box per channel of the format, plus alpha      |
| `wheel`    | Hue/saturation disc with harmony handles, Harmony Select, brightness and alpha Sliders |
| `triangle` | Hue ring around an HSV triangle (canvas), alpha Slider                                 |
| `swatches` | Saved colors (flat list or labeled groups) and recent colors as Toggle Group grids     |
| `schemes`  | Generated scheme strips (tints, shades, tones, analogous, …) or consumer templates     |

`views` (space-separated) lists the available views in order; more than one view renders a
`tp-tabs` strip above the panel and `view` / `defaultView` select the active tab. The fields row
(`fields`), format Select (`formatSelect`), preview swatch (`preview`) and eyedropper
(`eyedropper`, rendered only where the platform `EyeDropper` API exists) are independent toggles.
`size` (`sm`, `default`, `lg`) scales the area, tracks, thumbs and swatches; `shape` (`square`,
`round`) shapes the preview and swatches.

`picker="popup"` renders the panel inside a `tp-popover` opened from an icon Button that shows
the preview. Author `slot="trigger"` content to replace the default trigger. `open` /
`defaultOpen`, `setOpen(open, reason?)` and `close()` forward to the Popover, which remains the
state owner; its `tp-open-change` and `tp-open-change-complete` events are re-dispatched from
the widget with the Popover's reasons. Opening moves focus to the first dimension of the active
view and closing returns it to the trigger. The popup renders in place through the native top
layer so it keeps the widget's structure and presentation.

The `footer` slot renders below the panel (for example an action row), hidden while empty.

## Harmony and schemes

The wheel view derives up to five handles from the base color under `harmony`: `complementary`,
`analogous`, `triad`, `compound` or `custom` (Adobe-like tables in HSV; `none` shows the base
handle only). Derived handles follow the base; under `custom` every handle is its own hue and
saturation pair, seeded from the previous rule so the layout does not jump. The polyline connects
the handles in wheel order. `harmony` / `defaultHarmony` form a lane with `tp-harmony-change`
(`item-press` from the Harmony Select, `programmatic` otherwise), and the read-only
`harmonyColors` lists the base color first, then the derived colors, serialized in the active
format. In markup use `default-harmony="triad"` (as with `default-format` and `default-view`): a
`harmony` attribute or property makes the lane controlled, so the Harmony Select only proposes
and the rule changes once the owner writes the proposal back.

The schemes view shows strips of related colors. Without consumer data the widget generates
tints, shades, tones, analogous, complementary, triad and tetrad rows in OKLab/OKLCH from the
current color, every entry gamut-mapped to sRGB; the rows stay pinned to the color they were
generated from until the "Generate schemes" wand is pressed, so strips never move under a press.
Supply `schemes` (`{ label, palettes: [{ label, colors }] }[]`) to replace generation with
templates chosen through the Template Select. Pressing a scheme or saved swatch proposes that
color (`item-press`, or `keyboard` when selected from the keyboard); pressing the selected swatch
again proposes nothing.

`swatches` accepts strings or `{ label, colors }` groups. Every interactive commit pushes the
color (hex identity) to the front of `recentColors`, de-duplicated and capped at `recentLimit`
(default 8; 0 disables); `clearRecentColors()` empties the list.

## Interaction and events

| Event                     | Detail                                                        | Reasons                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tp-value-change`         | `value`, `previousValue`, `reason`, `sourceEvent`, `metadata` | `track-press`, `drag`, `keyboard`, `wheel`, `item-press`, `trigger-press`, `input`, `input-blur`, `input-paste`, `increment`, `decrement`, `scrub`, `escape-key`, `pointer`, `form-reset`, `programmatic` |
| `tp-value-commit`         | same                                                          | the settling reason                                                                                                                                                                                       |
| `tp-format-change`        | `TpValueChangeEvent<ColorFormat>`                             | `item-press`, `programmatic`                                                                                                                                                                              |
| `tp-view-change`          | `TpValueChangeEvent<ColorPickerView>`                         | `pointer`, `keyboard`, `programmatic`                                                                                                                                                                     |
| `tp-harmony-change`       | `TpValueChangeEvent<HarmonyRule>`                             | `item-press`, `programmatic`                                                                                                                                                                              |
| `tp-open-change`          | `TpOpenChangeEvent` (popup)                                   | the Popover's reasons (`trigger-press`, `escape-key`, `outside-press`, …)                                                                                                                                 |
| `tp-open-change-complete` | `{ open }`                                                    | —                                                                                                                                                                                                         |

`metadata` carries the floating-point `color` of the proposal and, when known, the edited
`channel`, the `surface` (`area`, `wheel`, `triangle`, `slider`, `field`, `swatch`, `scheme`,
`eyedropper`) and `formatChange`. `tp-value-change` is cancelable: a cancelled proposal leaves the
value, every surface, the fields and the form state unchanged, and the nested control that
proposed it reverts. Only the widget's own events cross its boundary; the Sliders, Inputs,
Selects, Tabs, Toggle Groups and Popover inside never leak their lane events.

Commit policy: surface and Slider drags publish `track-press` on press and `drag` proposals while
moving, then commit once on release. Escape during a drag restores the pre-press value
(`escape-key`); pointer cancellation and lost capture restore it as well (`pointer`); neither
commits. Keyboard steps, wheel scrubbing (opt-in through `allowWheelScrub`), swatches, the
eyedropper, hex Enter and blur, and `setValue()` commit immediately (a paste the Input reports
as `input-paste` commits at once; the current Input reports it as typing, so it commits on Enter
or blur). Numeric fields commit when the Number field commits (Enter or blur).

```js
picker.value = '#6d5dfc';
picker.onValueChange = (event) => {
  if (!event.defaultPrevented && !event.detail.cancelled) picker.value = event.detail.value;
};
```

`setValue(value, reason = 'programmatic', sourceEvent?)` accepts a string or a color record and
returns proposal acceptance. `pickFromScreen()` opens the platform eyedropper and resolves `true`
when a color was picked and accepted (`trigger-press`, surface `eyedropper`); it resolves `false`
where the API is unavailable (`supportsEyeDropper`). `dragging` and `controlled` are read-only
observations.

## Keyboard and pointer

Every editable dimension is a hidden native range input inside its thumb or handle.

| Surface / control        | Keys                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Area, triangle           | Left/Right saturation, Up/Down brightness on either input; Page Up/Down, Home, End act on the focused dimension            |
| Hue ring, wheel hue      | Left/Right/Up/Down step the hue; it wraps past 0 and 360                                                                   |
| Wheel saturation         | arrows step saturation; Home/End reach the bounds                                                                          |
| Hue and alpha Sliders    | the Slider keyboard model; the hue Slider wraps past 0 and 360 instead of clamping                                         |
| Channel Sliders / fields | Slider and Number field models (arrows, Page keys, Home/End, Shift/Control/Meta for the large step, Alt for the small one) |
| Swatches, schemes        | Toggle Group roving focus; Space/Enter select                                                                              |
| Popup                    | Enter/Space on the trigger opens; Escape closes and returns focus                                                          |

Arrow steps use the channel step; Shift, Control or Command and the Page keys use the large step,
Alt the small step. Horizontal arrows follow the writing direction on the area and Sliders;
angular axes (wheel, ring) do not flip. Pointer presses capture the pointer, coalesce movement to
one proposal per frame and release once; Shift snaps coarsely and Alt moves finely on Sliders.

## Constituents and accessibility

Every dimension exposes the slider role with an accessible name of the form `${label}: ${name}`
(Hue, Saturation, Brightness, Lightness, Red, …, Alpha) and value text in display precision with
its unit (`242°`, `66%`, `0.628`). The area and triangle inputs sit in a group named
"Saturation and brightness", the wheel in "Hue and saturation"; custom harmony handles expose
"Harmony color N: Hue/Saturation". The root is a group named by `label` (or `aria-label`).
Tab order per view: tabs, surface inputs, eyedropper, hue, alpha, format Select, fields, alpha
field, then one roving stop per swatch group. `strings` overrides every name (`hue`, `alpha`,
`eyedropper`, `savedColors`, `viewWheel`, `formatOklch`, `harmonyTriad`, `schemeTints`, …) for
localization; `locale` formats the numeric fields.

Nested controls are the library's `tp-slider`, `tp-input` in `tp-input-group` with the Number
field controller, `tp-select`, `tp-button` with `tp-icon`, `tp-tabs`, `tp-toggle-group` with
`tp-toggle`, `tp-label` and `tp-popover`. The three render surfaces (`tp-color-picker-area`,
`tp-color-picker-wheel`, `tp-color-picker-triangle`) are widget constituents; the triangle
rasterizes through the shared canvas surface owner at the device pixel ratio and repaints only on
hue, size, pixel-ratio and theme changes, recovering from context loss.

## Forms and Field

The widget is form-associated: `name` submits the value string, uncontrolled reset restores the
default (`form-reset`), `required` reports a missing value with `strings.valueMissing`, and
restoration updates uncontrolled state. `disabled` prevents focus and submission; `readonly`
keeps focus and submission but blocks every edit. Place the picker inside `tp-field` for a label,
description and error; the Field names the root group and label activation focuses the first
dimension.

## Parts and customization

Public parts: `color-picker`, `color-picker-label`, `color-picker-tabs`, `color-picker-tab`,
`color-picker-area`, `color-picker-area-thumb`, `color-picker-controls`, `color-picker-toolbar`,
`color-picker-eyedropper`, `color-picker-generate`, `color-picker-template`,
`color-picker-harmony`, `color-picker-slider`, `color-picker-slider-track`,
`color-picker-alpha-track`, `color-picker-slider-range`, `color-picker-slider-thumb`,
`color-picker-channel`, `color-picker-preview`, `color-picker-fields`, `color-picker-field`,
`color-picker-format`, `color-picker-swatches`, `color-picker-swatch-grid`,
`color-picker-swatch-item`, `color-picker-swatch`, `color-picker-schemes`,
`color-picker-scheme`, `color-picker-wheel`, `color-picker-wheel-handle`,
`color-picker-wheel-line`, `color-picker-ring`, `color-picker-ring-thumb`,
`color-picker-triangle`, `color-picker-triangle-thumb`, `color-picker-trigger`,
`color-picker-popup` and `color-picker-footer`. Parts that live inside a nested component
(`-slider-track`, `-alpha-track`, `-slider-range`, `-slider-thumb`, `-swatch-grid`,
`-swatch-item`, `-scheme`) are registered on that component's elements, so dictionary keys reach
them; the surfaces forward their parts through `exportparts`.

| Marker / variable                                              | Element                    | Meaning                                                     |
| -------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------- |
| `data-view`, `data-picker`                                     | host, root                 | Active view; `inline` or `popup`                            |
| `data-format`, `data-alpha`                                    | host, root                 | Active format; alpha enabled                                |
| `data-harmony`, `data-eyedropper`                              | host                       | Harmony rule; eyedropper rendered                           |
| `data-open`, `data-dragging`                                   | host, root                 | Popup open; a drag in progress                              |
| `data-empty`                                                   | host, root                 | No color                                                    |
| `data-focused`, `data-focus-visible`                           | surface, thumbs            | A dimension input has focus / keyboard focus                |
| `data-primary`, `data-selected`, `data-editable`, `data-index` | wheel handle               | The base handle; the pressed custom handle; editable; order |
| `--_tp-color-picker-paint`                                     | surfaces, tracks, swatches | Value-domain gradient supplied inline by the widget         |
| `--_tp-color-picker-thumb-paint`                               | thumbs, handles            | The thumb's color                                           |
| `--_tp-color-picker-dim`                                       | wheel                      | Brightness dim overlay                                      |

The family axes are `size`, `picker` and `shape`; the recipe derives every dimension from one
spacing variable (`--_tp-color-picker-space` with `-area`, `-track`, `-thumb`, `-swatch`,
`-checker`, `-ring`, `-popup`) and paints only through tokens: the checkerboard mixes
`--tp-background` and `--tp-muted`, thumbs use the background and foreground roles with
`--tp-ring` for focus, and value-domain color arrives as the inline paint variables. Dictionary
keys follow `color-picker-<part>` plus the `-size-sm` / `-size-lg` and `-shape-round` keys.
Every root part accepts the shared `partContracts` (`hostProperties`, `content`, `classHook`,
`styleHook`, `elementReference`, `renderDelegate`); `partPresentation` composes into the nested
components as well.

## Upstream reference

The behavior follows tweakpane's color input (`packages/core/src/input-binding/color/`): the
saturation/brightness plane, hue and alpha palettes, text fields per channel, hex editing that
keeps alpha unless alpha digits are typed, invalid text reverting to the current color, and hue
text that keeps 360. The widget extends it with CSS Color 4 parsing and spaces, modern
serialization, HWB, Lab, OKLab, OKLCH and device CMYK, the wheel and triangle surfaces, harmony
and schemes, swatches and recents, pointer capture with Escape and cancellation restore, Home,
End and Page keys, controlled mode, form participation and the eyedropper. It deviates by
keeping the last chromatic hue and saturation when a drag passes through black, white or gray.

## Usage guide

| Use case                    | Composition / API                                                           |
| --------------------------- | --------------------------------------------------------------------------- |
| Compact inline picker       | `default-value`; defaults to the area view with fields                      |
| Popup in a form             | `picker="popup"` inside `tp-field` and `tp-form`; `name` submits the string |
| Channel editing             | `views="sliders"` with `default-format="oklch"` or any format               |
| Color harmonies             | `views="wheel" default-harmony="triad"`; read `harmonyColors`               |
| HSV triangle                | `views="triangle"`                                                          |
| Saved and recent colors     | `views="area swatches"`, `swatches`, `recent-limit`                         |
| Palette templates           | `views="area schemes"`, generated rows or `schemes`                         |
| Controlled owner            | `value`, synchronous `onValueChange` acceptance                             |
| Rejecting proposals         | cancel `tp-value-change`; observe `tp-value-commit`                         |
| Alpha off / limited formats | `alpha="false"`, `formats="hex rgb oklch"`                                  |
| Localization                | `strings`, `locale`                                                         |
| RTL                         | `dir="rtl"`; the area and Sliders mirror, angular surfaces stay unchanged   |
