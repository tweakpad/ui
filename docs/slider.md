# Slider

`tp-slider` controls a number or an ordered list of numbers. Supply either `value` for a controlled slider or `defaultValue` for an uncontrolled slider. The mode stays fixed for the lifetime of the element. Each value has a native range input inside a visual Thumb.

```html
<script type="module">
  import '@tweakpad/ui/styles.css';
  import '@tweakpad/ui/register';
</script>
<tp-slider label="Volume" name="volume" default-value="40"></tp-slider>
```

The default composition generates one Thumb per value. Author `tp-slider-thumb` children when you need independent labels, disabled values, native input references or Thumb customization. A multi-thumb composition requires a unique, non-negative `index` on each Thumb.

```html
<script type="module">
  import '@tweakpad/ui/styles.css';
  import '@tweakpad/ui/register';
</script>
<tp-slider
  label="Budget"
  name="budget"
  default-value="20 60"
  min-steps-between-values="5"
  thumb-alignment="edge"
>
  <tp-slider-thumb index="0"></tp-slider-thumb>
  <tp-slider-thumb index="1"></tp-slider-thumb>
</tp-slider>
```

## State and constraints

| Property                           | Default                       | Meaning                                                     |
| ---------------------------------- | ----------------------------- | ----------------------------------------------------------- |
| `value` / `defaultValue`           | undefined                     | A number or ordered number list; supply one source          |
| `minimum`, `maximum`               | 0, 100                        | Bounds; an empty or non-finite domain is indeterminate      |
| `min`, `max`                       | aliases                       | Compatibility aliases for the same bounds                   |
| `step`                             | 1                             | Positive finite lattice step, measured from minimum         |
| `largeStep`                        | 10                            | Positive finite Page/modifier adjustment                    |
| `minStepsBetweenValues`            | 0                             | Non-negative integer number of steps between neighbors      |
| `thumbCollisionBehavior`           | `push`                        | `push`, `swap` or `none`                                    |
| `thumbAlignment`                   | `center`                      | `center`, `edge` or `delayed-edge`                          |
| `orientation`                      | `horizontal`                  | `horizontal` or `vertical`                                  |
| `disabled`, `readOnly`, `required` | false                         | Shared form-control states                                  |
| `label`                            | empty                         | Optional visible label and accessible name                  |
| `locale`, `format`                 | owner locale / default format | Locale and `Intl.NumberFormatOptions` for value output/text |
| `buffered`                         | `[]`                          | Non-semantic `[start, end]` ranges in value units           |
| `segments`                         | `[]`                          | Non-semantic `{ start, end, label? }` chapter segments      |
| `indeterminateText`                | empty                         | Accessible value text while the domain is indeterminate     |
| `formAssociatedValue`              | `true`                        | `false` opts out of form value, validity, reset and Field   |

Values clamp to bounds and snap to the minimum-based step lattice. Invalid or infeasible configuration emits `tp-diagnostic` and disables adjustment. An empty or non-finite domain (`minimum >= maximum`, `NaN` or an infinite bound) is not a configuration error; it is the declared indeterminate state described under [Media extensions](#media-extensions). `push` moves adjacent enabled Thumbs while preserving separation; reversing the active Thumb retains values already pushed. `none` stops at neighbors. `swap` exchanges logical Thumb identities and retains focus/drag ownership. Disabled Thumbs are barriers and cannot be selected or pushed.

The legacy `thumbCrossing` property maps explicitly authored `prevent` to `none`, and `swap` to `swap`. It has no implicit default that overrides canonical `push`. An explicitly authored canonical collision policy takes precedence when both channels are supplied.

`values`, `controlled`, `activeThumbIndex`, `dragging`, `indeterminate`, `pointing`, `pointerValue`, `pointerRatio` and `thumbMetadata` are read-only observations. Idle `activeThumbIndex` is `-1`. Metadata identifies each actual native input with `inputId`, logical `index`, current `value`, normalized `percentage` and `disabled`. Public part state contains committed values, min/max, step, separation, orientation and interaction/form state.

## Interaction and events

Click the track to choose the nearest eligible Thumb. Dragging preserves the grab offset and commits once on release. Pointer cancellation, lost capture, removal and disconnect release the interaction without a delayed commit.

Arrow keys adjust by `step`; horizontal Left/Right respect RTL. Up/Down adjust normally. Shift, Control or Command use `largeStep`. Page Up/Down use `largeStep`; Home/End request the bounds under the collision policy. Keyboard changes commit immediately. Read-only inputs remain focusable and serialize their values.

`onValueChange` and `tp-value-change` receive a cancelable proposal. Controlled owners publish an accepted value back to `slider.value`; an owner may normalize it. Cancellation preserves the committed value and native input state. `onValueCommitted` and `tp-value-commit` describe the actual accepted value. Details contain `value`, `previousValue`, `reason`, the original `sourceEvent`, and `metadata.activeThumbIndex`. No-op or canceled proposals produce no commit notification.

```js
slider.value = 40;
slider.onValueChange = (event) => {
  if (!event.defaultPrevented && !event.detail.cancelled) {
    slider.value = event.detail.value;
  }
};
```

`setValue(value, sourceEvent?)` preserves the legacy method and returns proposal acceptance. `setValue(value, reason, sourceEvent?)` additionally accepts the shared reason channel. Programmatic proposals use the same state owner and cancellation rules.

## Media extensions

Slider carries the optional media capabilities required by the Foundation Slider contract (`mp-slider-media`). Media sliders compose `tp-slider` with these APIs; there is no separate media slider implementation.

**Buffer ranges.** `buffered` accepts `readonly [start, end][]` in value units (property only). Ranges are clamped to the domain, ordered and merged; empty, inverted and non-finite ranges are dropped. Each remaining range renders one `slider-buffer` part inside the aria-hidden Track, below the Range. The Root publishes `--tp-slider-buffer`: the percentage position of the end of the range containing the current value (the last value of a range slider), or else of the last range; `0%` when nothing is buffered. Draw a single buffer bar from that variable, or style the per-range parts.

**Chapter segments.** `segments` accepts `readonly { start, end, label? }[]` (property only). Segments are clamped, ordered and empty ones dropped; the media layer owns gap filling and overlap trimming. Each renders an aria-hidden `slider-chapter` part above the Range with `data-index`, `data-orientation`, `data-active` (the value is inside; a shared boundary belongs to the later segment and the maximum to the last) and `data-highlighted` (the hovered pointer value is inside). Each chapter publishes `--tp-slider-segment-start`, `--tp-slider-segment-width` (domain percentages), `--tp-slider-segment-fill` and `--tp-slider-segment-buffer` (percent of that segment below the value or buffer end). The part state contains the segment's `label`.

**Hover pointer.** While a pointer is over the Control without a drag, `pointing` is true, `pointerRatio` is the 0–1 domain position and `pointerValue` is the corresponding unsnapped value. The Root and host carry `data-pointing`, and the Root publishes `--tp-slider-pointer` (the last hovered domain percentage, retained after leaving so exit motion does not jump). Horizontal RTL mirrors the axis; vertical grows upward; measured edge alignment of the first Thumb is respected. Movement publishes at most once per animation frame. Leaving the Control, starting a drag, disabling the Slider or entering the indeterminate state clears pointing immediately. Each change dispatches the non-cancelable, bubbling, composed `tp-slider-pointer-change` event with `detail: { value, ratio }` (`null` when cleared). Pointer values are presentation input, not value proposals; they never produce `tp-value-change`.

**Indeterminate domain.** When the domain is empty or non-finite, Slider is indeterminate: `indeterminate` is true, the host and Root carry `data-indeterminate` and `data-disabled`, the Root has `aria-disabled="true"`, and every Thumb is disabled with `data-indeterminate`. The native inputs remain present and named; they receive finite native bounds, omit non-finite `aria-valuenow`/`aria-valuemin`/`aria-valuemax`, and use `indeterminateText` as `aria-valuetext` when supplied. No configuration diagnostic or validity error is reported. Values are not normalized against an indeterminate domain, and fill, buffer and segment geometry collapse to `0%`.

**Silent bounds.** Changing `minimum`, `maximum`, `step`, `minStepsBetweenValues`, `buffered` or `segments` never emits `tp-value-change`, `tp-value-commit` or their callbacks. An uncontrolled value outside new bounds is reconciled silently; Field still observes the new form value. Controlled values remain owner-normalized as before.

**Form opt-out.** `formAssociatedValue = false` (or `form-associated-value="false"`) makes the Slider submit and restore no value, report no validity, ignore form reset and emit no `tp-field-value`. Value-change and commit events are unchanged. The element class stays form-associated for platform purposes, so an ancestor disabled fieldset still disables it.

```js
const seek = document.querySelector('tp-slider');
seek.formAssociatedValue = false;
seek.indeterminateText = 'Time unknown';
seek.maximum = Number.NaN; // before metadata: indeterminate, no diagnostic
seek.addEventListener('tp-slider-pointer-change', (event) => {
  preview.hidden = event.detail.value === null;
});
// later
seek.maximum = video.duration;
seek.buffered = [[0, 42]];
seek.segments = [
  { start: 0, end: 60, label: 'Intro' },
  { start: 60, end: video.duration, label: 'Main' },
];
```

## Constituents and accessibility

Each `tp-slider-thumb` accepts `index`, `disabled`, `valueText`, `getAccessibleLabel(index)`, `getAccessibleValueText(formattedValue, value, index)` and `tabIndex`. Root-level label/value-text resolvers remain available as defaults; a Thumb resolver takes precedence. Use distinct names such as “Minimum budget” and “Maximum budget” for ranges. `inputElement` and `inputElementReference` expose the actual native input. The Thumb's value is derived from its Root; it has no independent value or form transaction.

The Label and Output are optional. A `label` string, `slot="label"` content or a `slider-label` part contract enables the Label. A `slot="value"` or a `slider-output` part contract enables Output. Output has `aria-live="off"` and references every Thumb input ID. Its state supplies `formattedValues` and raw `values`; custom content can include actual `tp-icon` or `tp-key-hint` elements.

```js
slider.partContracts = {
  'slider-output': { content: (state) => state.formattedValues.join(' – ') },
};
```

Center alignment lets the Thumb center reach the track edge. Edge alignment insets travel by the measured half-size of each visual Thumb. Delayed-edge starts centered and adopts measured edge alignment after activation. Range geometry follows the committed minimum-to-value span for one value, or the outer selected values for a range. Structural hit-target expansion preserves the shared `target-size-min` even when the visible Thumb is smaller.

## Forms and Field

The Root is the only form participant. Named enabled Thumb values serialize under the same name in logical index order. Disabled Thumb values are omitted. `formOwner` accepts a form ID or actual `HTMLFormElement`, matching the shared form infrastructure. Uncontrolled reset restores the declared default; controlled reset leaves the owner authoritative. Restoration updates only uncontrolled state.

Use the actual `tp-field` component and its `label`, `description` and `error` properties or named slots for validation and descriptions. Root context propagates to every native input using the shared Field association and same-shadow description/error mirrors. Thumb internals always contribute a null form value. Moving focus between Thumbs keeps the slider focused; leaving the entire control marks it touched.

Removing an authored Thumb normalizes the uncontrolled list. A controlled list/Thumb count mismatch preserves owner values and disables ambiguous interaction. Once an explicit composition is authored, removing its last Thumb does not silently generate replacement Thumbs.

## Parts and customization

The public parts are `slider`, `slider-track`, `slider-range`, `slider-thumb`, `slider-label`, `slider-output`, `slider-buffer` (0..n) and `slider-chapter` (0..n), with their horizontal/vertical orientation keys. The structural Control and hidden input do not create additional paint identities.

| Marker / variable            | Element           | Meaning                                                   |
| ---------------------------- | ----------------- | --------------------------------------------------------- |
| `data-indeterminate`         | host, Root, Thumb | Empty or non-finite domain                                |
| `data-pointing`              | host, Root        | Pointer over the Control without a drag                   |
| `data-active`                | `slider-chapter`  | The value lies in the segment                             |
| `data-highlighted`           | `slider-chapter`  | The hovered pointer value lies in the segment             |
| `--tp-slider-pointer`        | Root              | Last hovered domain percentage                            |
| `--tp-slider-buffer`         | Root              | Buffer end percentage (containing range, else last range) |
| `--tp-slider-segment-start`  | `slider-chapter`  | Segment start, percent of the domain                      |
| `--tp-slider-segment-width`  | `slider-chapter`  | Segment size, percent of the domain                       |
| `--tp-slider-segment-fill`   | `slider-chapter`  | Percent of the segment below the value                    |
| `--tp-slider-segment-buffer` | `slider-chapter`  | Percent of the segment below the buffer end               |

The default buffer paint is a 35% `--tp-muted-foreground` layer (`color-mix(in oklab, …)`) over the muted Track. Chapters are separated by a `--tp-background` gap, and a highlighted chapter receives a 20% `--tp-muted-foreground` layer. Buffer and chapter geometry are domain percentages and do not apply the edge-alignment inset.

Every public part accepts the shared `renderDelegate`, `hostProperties`, `content`, `classHook`, `styleHook` and `elementReference` contract. A delegate places the supplied `bind` directive on its semantic host and retains supplied content. Required semantics, native state and committed markers remain behavior-owned. Consumer initiating handlers run first and may call `event.preventComponentHandling()`; this differs from native `preventDefault()`.

Thumb focus, blur, keydown and tabIndex host properties target the native input. Neutral properties, pointer handlers, class/style hooks and `elementReference` target the visual Thumb; `inputElementReference` targets its input. The native input remains present when Thumb content is customized. A Root Thumb contract supplies defaults; a constituent contract can override them.

Presentation uses the existing dictionary, part composition and token system. The default appearance follows the local shadcn Base + Nova Slider styles. Nova's white Thumb fill resolves through the shared background role: it is white in the default light theme and follows the consumer's background token in alternate themes. Geometry and native input binding remain independent of paint overrides. Motion respects the shared motion policy and reduced-motion tokens.

## Usage guide

The live examples cover scalar, range, multiple-thumb, vertical, controlled, disabled and RTL usage, plus the library's additional composition and form features. Each example includes registration and complete setup code.

| Use case                    | Composition / API                                                    |
| --------------------------- | -------------------------------------------------------------------- |
| One value                   | `default-value="40"`; automatic Thumb                                |
| Fine-grained adjustment     | `step="0.1"`, `large-step="1"`; 1,000 intervals across 0–100         |
| Range / multiple values     | `default-value="25 50"` or `"10 20 70"`; one Thumb per value         |
| Label and live readout      | `label` with `partContracts['slider-output']`                        |
| Compact inline readout      | Output without a visible Label; name through `aria-label` or Field   |
| Vertical / vertical range   | `orientation="vertical"`; same constituents and value model          |
| Controlled decimal range    | `value`, synchronous `onValueChange` acceptance, `step`, `largeStep` |
| Currency / percentage       | `locale`, `format`; raw numbers remain unchanged                     |
| Disabled / read-only        | `disabled` prevents focus and submission; `readonly` preserves both  |
| Independent thumbs          | `tp-slider-thumb` with index, disabled state and accessible text     |
| Neighbor interaction        | `thumbCollisionBehavior`: push, swap, none; `minStepsBetweenValues`  |
| Endpoint geometry           | `thumbAlignment`: center, edge, delayed-edge                         |
| RTL                         | `dir="rtl"`; logical layout and horizontal arrow mapping             |
| Field / submit / reset      | `tp-field` and `tp-form`, named Slider, actual Button actions        |
| Rejecting changes / commits | Cancel `tp-value-change`; observe `tp-value-commit`                  |
| Dynamic composition         | Add/remove authored Thumbs; update values through the Root           |

### Step size and drag smoothness

The Thumb follows accepted stepped values during dragging. With a 0–100 range and the default `step="1"`, it has 100 intervals: on a 1,000px travel distance, each interval spans 10px. A wide track can therefore feel jumpy even when updates reach the next frame. Choose a smaller positive step when the value domain permits finer precision; `step="0.1"` gives 1,000 intervals and about 1px movement at that width. The numeric value, Output and Thumb remain synchronized. Slider does not animate between discrete values or accept `step="any"`.

```html
<tp-slider
  label="Fine level"
  default-value="40"
  minimum="0"
  maximum="100"
  step="0.1"
  large-step="1"
></tp-slider>
```

For controlled sliders, accept proposals synchronously through `value`, as shown above. Debouncing that acceptance introduces an actual delay; defer expensive work separately or use `tp-value-commit` for work needed only after release.

### Label and output spacing

Use Slider's existing parts for both the label and formatted value. With a Label, the readout shares a header above the Track. Without a visible Label, horizontal Slider places Output beside the Track with endpoint clearance. Vertical Slider retains a stacked header. Slider owns this layout; its active presentation dictionary supplies the gaps. No sibling output, local margin, or demo gap is required.

```html
<tp-slider aria-label="Previous context" minimum="64" maximum="128" default-value="64"></tp-slider>
```

```js
const slider = document.querySelector('tp-slider');
slider.partContracts = {
  'slider-output': { content: (state) => `${state.values[0]}px` },
};
```

Static `slot="value"` content remains consumer-owned and is not automatically rewritten. Use a content resolver when the displayed value must follow the Thumb. `aria-label` names the control without enabling the visible Label. A wrapping Field supplies naming and descriptions.

### Attribute and property channels

| JavaScript property                                | HTML attribute / channel                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| `value`, `defaultValue`                            | `value`, `default-value`; scalar or space/comma-separated numbers              |
| `largeStep`                                        | `large-step`                                                                   |
| `minStepsBetweenValues`                            | `min-steps-between-values`                                                     |
| `thumbAlignment`                                   | `thumb-alignment`                                                              |
| `thumbCollisionBehavior`                           | `thumb-collision-behavior`                                                     |
| `thumbCrossing`                                    | `thumb-crossing`; legacy compatibility                                         |
| `readOnly`                                         | `readonly`                                                                     |
| `formOwner`                                        | `form`; ID or element via property                                             |
| `format`                                           | Property only; `Intl.NumberFormatOptions`                                      |
| `onValueChange`, `onValueCommitted`                | Callback properties; DOM events also available                                 |
| `getAccessibleLabel`, `getAccessibleValueText`     | Resolver properties; Root defaults or per-Thumb overrides                      |
| `buffered`, `segments`                             | Property only                                                                  |
| `indeterminateText`                                | `indeterminate-text`                                                           |
| `formAssociatedValue`                              | `form-associated-value`; only `"false"` opts out                               |
| Thumb `valueText`, `tabIndex`                      | `value-text`, `tabindex`; tab index forwards to the native input               |
| `partContracts`, `partPresentation`, motion policy | Inherited customization; see [Styling](./styling.md) and [Motion](./motion.md) |

`minimum`, `maximum`, `min`, `max`, `step`, `orientation`, `disabled`, `required`, `label`, `name` and `locale` use their same-spelled attributes. Root `inputElement` exposes the first Thumb input; `thumbMetadata` and each Thumb's `inputElement` expose all inputs. Do not assign independent values to Thumbs.
