# Easing editor

`tp-easing-editor` edits one easing curve: the progression of an animated value over normalized
time. Its value is an easing string in the canonical notation of the curve kind; internally the
widget keeps a parsed record whose parameters are never rounded before serialization. The graph
shows the curve with its Bézier handles or custom points, the preset picker offers named curves
with thumbnails, parameter Sliders and fields edit springs and parametric families, an optional
duration Slider sets the time, a preview shape replays the motion behind the graph, a frames bar
shows where the frames fall, and adapters export the result, CSS first.

```html
<script type="module">
  import '@tweakpad/ui/styles.css';
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/register/widgets';
</script>
<tp-easing-editor label="Motion" name="easing" default-value="ease-out"></tp-easing-editor>
```

Supply `value` for a controlled editor or `defaultValue` for an uncontrolled one; the mode stays
fixed for the element's lifetime. The same rule applies to the `duration`, `adapter` and
`presetsOpen` lanes.

## Value and kinds

| Kind         | Notation                                                       | Parameters                                                            |
| ------------ | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| `bezier`     | `cubic-bezier(x1, y1, x2, y2)` (CSS)                           | x in 0–1; y free on input, edited within −1 to 2                      |
| `spring`     | `spring(mass stiffness damping)`, optional velocity (not CSS)  | mass 0.1–10, stiffness 1–1000, damping 0–100, velocity −10 to 10      |
| `parametric` | `sine(out)`, `power(in-out 3)`, `back(out 1.702)`, … (not CSS) | family, direction (`in`, `out`, `in-out`, `out-in`) and family values |
| `parametric` | `steps(4, jump-end)` (CSS)                                     | count 1–50; the position follows the direction                        |
| `custom`     | `linear(0, 0.3 20%, 1.15 60%, 1)` (CSS)                        | ordered points, inputs 0–1, outputs within −1 to 2                    |

The widget accepts every notation above plus the CSS keywords `linear`, `ease`, `ease-in`,
`ease-out`, `ease-in-out`, `step-start` and `step-end`, which parse to their records. Whatever an
owner supplies, `value` reads back as the canonical text: lowercase, numbers with at most three
decimals, `, ` between CSS arguments and single spaces inside the non-CSS functions. An
unparsable string empties the editor (`data-empty`) and reports a `tp-diagnostic`. The read-only
`curve` holds the record, `kind` its kind and `easingFunction` its progression function.

Springs and the classic easing families (`sine`, `power`, `expo`, `circ`, `back`, `elastic`, `bounce`)
have no CSS notation of their own; the CSS adapter samples them into `linear()`. A spring's
progression is normalized to its own settle time (shown under its controls, capped at 10 s); the
exported and previewed time is the `duration` lane.

Progression is never clamped to 0–1, so curves overshoot: the graph extends its range in quarter
steps to hold the curve and the handles, and the frames bar, the thumbnails and the exports keep
the overshoot.

## Categories and the Tabs

The kind is read from the value, not set separately; the Tabs in the header only switch the
category: Ease (Bézier, parametric and custom curves) or Spring. Switching to Spring converts the
curve to the default spring, switching to Ease fits a cubic Bézier to it, both as a proposal on the
value lane with `conversion: true` in the metadata; a rejected conversion keeps the tab where it
was. An empty editor starts from `ease` or `spring(1 100 10)`. Custom is not a tab: the badge over
the graph names the matching preset and reads Custom as soon as a handle, point or parameter
leaves every preset. A sine, power, expo, circ or back curve shows the handles of its Bézier fit
from the start: dragging or stepping one converts the curve into that Bézier, and a press beside
them edits nothing. A press on an elastic, bounce or steps curve converts it into a point curve
and drags the nearest point.

## Graph and overshoot

The graph is a square SVG plot with a dotted grid marking the unit box (a dot at every tenth,
no outline, clipped to the graph box and its rounded corners; outside the unit box the graph keeps
its background and paints no dots). The plot sits inset inside the box by the editor's spacing
step (8 px at the `sm` size and in the compact layout, 12 px by default, 16 px at `lg`), so the
curve's ends and the corner handles clear its rounded corners. The curve clips to the box edges,
not to the inset, so an overshoot into the inset stays visible; only the Bézier handles, their
lines and the custom points may reach past the box. A Badge in its bottom-right corner names the
matching preset or reads Custom. Bézier curves show two handles
with their lines; custom curves show one point per entry. While a handle, point or Slider is
dragged the progression range holds still; when the drag settles (or the value changes otherwise)
the plot and the frames bar ease to the re-quantized range through the motion role `range`
(instant under reduced motion), so the graph never jumps under the pointer.
A press inside a handle keeps the pointer's offset from its center for the whole gesture, so the
handle moves with the pointer instead of jumping under it; a press elsewhere never moves a Bézier
handle. On a custom curve a press on the empty graph adds a point there and drags it. Escape or
pointer cancellation restores the pre-drag value without a commit; a lost capture settles at the
last position.

## Custom curves

Custom curves are CSS `linear()` point lists. Points stay between their neighbours on the time
axis; the first and last points keep 0% and 100%. Delete or Backspace on a focused point removes
it, and the Add point and Remove point Buttons do the same from the keyboard: Add inserts a point
halfway between the focused point and the next, Remove drops the focused inner point.

## Parameters

Spring rows (mass, stiffness, damping, velocity) and parametric rows (power exponent, back
overshoot, elastic amplitude and period, steps count) show a Label, a Slider and a value field
under the NumberField behavior; the Bézier control points have no rows: they are edited on the
graph and in the expression field. The family and direction themselves come
from the presets. Slider drags propose once per frame and commit on release; Escape during a
Slider drag restores the pre-drag value, as the graph does.

## Presets

The preset picker lists the built-in table (Basic, Spring, and one group per easing family with
its four directions) or the groups supplied through `presets`. Each tile is a Toggle with a
thumbnail of the curve and its name; the tile whose canonical value equals the current value is
pressed, `presetId` names it and the graph's badge shows its label. Pressing a tile proposes and commits
with `item-press` (`keyboard` from the keyboard) and `presetId` in the metadata, and restarts
the preview from the start, also when the tile is already the current one.

## Layouts

The header holds the category Tabs at the inline start and, together at the inline end, the outlined
play Button, the preview mode Button and (compact layout) the presets Toggle.

`layout="extended"` (default) places the presets in a column beside the graph, scrolling vertically
inside it with a scrollbar that shows while hovering or scrolling; long preset names wrap between
words and every tile of a group shares one height. `layout="compact"`
hides them behind an icon-only presets Toggle (named "Show presets") in the header: they overlay the graph on a translucent surface
and scroll inside it, a pick closes them, Escape closes them and returns focus to the Toggle, and
`presetsOpen` / `defaultPresetsOpen` form a lane with `tp-open-change`. The compact layout suits a
Dialog. `size` (`sm`, `default`, `lg`) changes the root spacing variable and the derived graph
side (288, 384 and 480 px), handle, thumbnail and presets extents. The graph is square. In the extended layout the editor is no wider than the graph side plus the
presets column, so it never stretches across a wide host; the compact layout fills its container
(a Dialog, a Popover) up to 32rem and the graph follows its width. The graph box carries a muted
tint so its limits read on white surfaces.

## Duration

`duration` / `defaultDuration` (seconds, default 0.7) is the time the preview, the frames bar and
the adapters use. `timing` (default true) shows the duration row: a Slider and a field whose range
and step come from `durationMin`, `durationMax` and `durationStep` (0, 3 and 0.01 by default);
the lane clamps and steps every value. Changes propose through the cancelable
`tp-duration-change`. With `timing="false"` the row disappears, the lane stays readable and the
CSS adapter omits the time.

## Preview

A square animates behind the graph at low opacity. `preview` picks its mode: `scale` (default),
`scale-x` and `scale-y` grow it from the center from 0 to 1 (uniformly, horizontally or
vertically); the square at 1 is sized so the graph's shown range fits the area, so an overshoot
grows past it and stays visible; `rotation` turns a square sized to stay inside the area;
`none` hides the preview, the play Button and the mode Button. With `previewControls` (default
true) a Button in the header shows the current mode and cycles to the next one on each press,
replaying the preview. The preview replays on every settled change (a release, a key, a field
commit, a preset, a conversion) and on the play Button, running for the duration with the CSS
easing through the motion role `preview`. Under reduced motion it completes without
motion and the frames bar remains the timing reference.

## Frames bar

`frames` (default true) renders a fixed 40 ticks at the eased positions over the graph's range,
whatever the duration, so ticks bunch where the motion is slow. The bar sits directly under the
graph at the graph's width and is an image named with its tick count.

## Export adapters

`adapters` lists the serializers offered in the footer; the built-in CSS adapter is the default.
An adapter is `{ id, label, format(curve, context) }` where the context carries the `duration`
(or null without a time control), the CSS timing function and a `samples(count)` function. The
active adapter is the `adapter` / `defaultAdapter` lane with `tp-adapter-change`; `output` is its
text, shown in an Input group whose leading addon names the format (CSS by default) and whose
trailing addon is the Copy button. The field itself is the expression editor: its numbers are
highlighted in the accent color; typing commits on Enter or blur (any notation the value model
accepts, with an optional leading time such as `500ms` that sets the duration) and Escape reverts;
Up and Down step the number at the caret by 0.01 (Shift, Control or Meta 0.1, Alt 0.001;
milliseconds by 10) and commit at once, keeping the number selected; text that is not an easing is
flagged and reverts on blur. The CSS adapter emits
`cubic-bezier()`, `steps()` and `linear()` verbatim, samples springs and parametric families into
`linear()` (at most 100 points, three decimals), and prefixes the duration (`700ms …`) when the
time control is on.

## Events

`tp-value-change` is a cancelable proposal for every change, with `value`, `previousValue`,
`reason`, the source event and a `metadata` record (`curve`, `kind` and, when they apply,
`surface`, `parameter`, `handle`, `point`, `presetId`, `conversion`); `tp-value-commit` follows
when the interaction settles. Reasons:
`track-press` and `drag` on handles, points and Sliders (one commit on release), `keyboard` for
keys, `item-press` for presets, tabs, the preview mode Button and the point Buttons, the
NumberField reasons for fields, `escape-key` and `pointer` for restores, `form-reset` and
`programmatic`. `tp-duration-change`, `tp-adapter-change` and `tp-open-change` carry the other
lanes. Events of the composed Sliders, Selects, Tabs, Toggle groups, Inputs and the Copy button
never leave the widget's shadow root; a rejected widget proposal reverts the nested control.

## Keyboard

Every handle and point has a Time and a Progression range input: arrows step by 0.01, Shift,
Control or Meta with an arrow and Page Up or Page Down by 0.1, Alt with an arrow by 0.001, Home
and End reach the bounds of the focused axis (0–1 for time, −1 to 2 for progression). The time
axis does not mirror in right-to-left writing. Keyboard changes commit immediately. The Tabs,
Toggle groups, Selects, Sliders and fields keep their own keyboard contracts.

## Constituents and accessibility

The root is a group named by `label` (default "Easing"). Handle and point inputs are sliders named
`Label: Control point 1 Time` or `Label: Point 2 Progression` with three-decimal value text; the
graph is a group, the frames bar an image, the preview shape hidden. Presets are toggles named by
the preset, one roving stop per group. Focus order: header (Tabs, play, preview mode Button, presets Toggle), presets in the
extended layout, graph inputs, controls, duration, footer (adapter, output, Copy). `strings` overrides every visible and accessible name; `locale` formats the fields.

## Forms and Field

The widget is a form control: `name` submits the canonical string (nothing when empty or
disabled), `required` reports "Please choose an easing.", `form.reset()` restores the default
with `form-reset`, and a restored form state applies non-cancelably. Inside `tp-field` the label
activates the first graph input. `disabled` disables every nested control; `readOnly` keeps the
inputs focusable and ignores edits.

## Parts and customization

Public parts: `easing-editor`, `-label`, `-header`, `-tabs`, `-tab`, `-badge`, `-play`,
`-presets-toggle`, `-presets`, `-preset-group`, `-preset-grid`, `-preset-item`, `-preset-thumb`,
`-graph`, `-graph-grid`, `-graph-curve`, `-graph-handle`, `-graph-handle-line`, `-graph-point`,
`-graph-preview`, `-controls`, `-parameter`, `-slider`, `-slider-track`, `-slider-range`,
`-slider-thumb`, `-field`, `-add-point`, `-remove-point`, `-duration`, `-preview-mode`, `-frames`,
`-frames-tick`, `-adapter`, `-output-group`, `-output`, `-output-token`, `-copy` and `-footer` (the `footer` slot). Axes: `size` and
`layout`. Markers on the host and root: `data-kind`, `data-layout`, `data-timing`,
`data-preview`, `data-empty`, `data-dragging`, `data-playing`, `data-presets-open`,
`data-disabled`, `data-readonly`; handles and points carry `data-dragging`, `data-focused` and
`data-focus-visible`. Every color resolves through tokens (`--tp-primary` paints the curve, the
handles, the ticks and the preview); the curve geometry, thumbnails and tick positions are content
the widget supplies as SVG. `partPresentation` hooks reach the widget parts and the registered
Slider and Toggle parts.

## API reference

| Property                                     | Attribute                                       | Type                                                        | Default                         |
| -------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------- | ------------------------------- |
| `value` / `defaultValue`                     | `value` / `default-value`                       | `string`                                                    | `''`                            |
| `duration` / `defaultDuration`               | `duration` / `default-duration`                 | `number` (seconds)                                          | `0.7`                           |
| `durationMin`, `durationMax`, `durationStep` | `duration-min`, `duration-max`, `duration-step` | `number`                                                    | `0`, `3`, `0.01`                |
| `timing`                                     | `timing`                                        | `boolean`                                                   | `true`                          |
| `adapter` / `defaultAdapter`                 | `adapter` / `default-adapter`                   | `string`                                                    | `'css'`                         |
| `adapters`                                   | —                                               | `EasingAdapter[]`                                           | `[cssEasingAdapter]`            |
| `presets`                                    | —                                               | `EasingPresetGroup[]`                                       | built-in table                  |
| `presetPicker`                               | `preset-picker`                                 | `boolean`                                                   | `true`                          |
| `layout`                                     | `layout`                                        | `'extended' \| 'compact'`                                   | `'extended'`                    |
| `presetsOpen` / `defaultPresetsOpen`         | `presets-open` / `default-presets-open`         | `boolean`                                                   | `false`                         |
| `size`                                       | `size`                                          | `'sm' \| 'default' \| 'lg'`                                 | `'default'`                     |
| `preview`                                    | `preview`                                       | `'none' \| 'scale' \| 'scale-x' \| 'scale-y' \| 'rotation'` | `'scale'`                       |
| `previewControls`                            | `preview-controls`                              | `boolean`                                                   | `true`                          |
| `frames`                                     | `frames`                                        | `boolean`                                                   | `true`                          |
| `label`, `locale`, `strings`                 | `label`, `locale`, —                            | `string`, `string`, `Partial<EasingEditorStrings>`          | `''`, `''`, `{}`                |
| `name`, `disabled`, `readOnly`, `required`   | `name`, `disabled`, `readonly`, `required`      | `string`, `boolean`, `boolean`, `boolean`                   | `''`, `false`, `false`, `false` |
| `onValueChange`, `onValueCommitted`          | —                                               | callbacks                                                   | `undefined`                     |

Read-only: `curve`, `kind`, `category`, `easingFunction`, `output`, `presetId`, `controlled`, `dragging`,
`playing`. Methods: `setValue(value, reason?, sourceEvent?)`, `play()`,
`setPresetsOpen(open, reason?, event?)`, `focus()`. Events: `tp-value-change`, `tp-value-commit`,
`tp-duration-change`, `tp-adapter-change`, `tp-open-change`, `tp-field-value`, `tp-diagnostic`.
The curve model is exported from `@tweakpad/ui/widgets`: `parseEasingCurve`,
`serializeEasingCurve`, `easingFunction`, `sampleEasing`, `toCssEasing`, `convertEasingCurve`,
`springSettleTime` and the record types.
