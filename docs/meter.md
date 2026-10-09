# Meter Foundation capability

Meter represents a scalar measurement, such as storage or temperature. It is
exposed through `MeterController` and `meterState`, without a separate catalog
element. Task completion uses `tp-progress`. Their numerical normalization and
formatting share one Foundation owner; nonfinite measurement values clamp to a
bound, whereas nonfinite Progress values remain indeterminate.

```html
<span id="capacity-label">Storage used</span>
<meter id="capacity"></meter>
<span id="capacity-value"></span>
<script type="module">
  import { MeterController } from '@tweakpad/ui';
  const meter = new MeterController(document.querySelector('#capacity'), {
    value: 30,
    minimum: 20,
    maximum: 40,
  });
  meter.registerPart('label', document.querySelector('#capacity-label'));
  meter.registerPart('value', document.querySelector('#capacity-value'));
  meter.update({ value: 35 });
  // On owner teardown:
  // meter.dispose();
</script>
```

The native meter appearance in this example belongs to the browser. The Foundation
controller supplies semantics and geometry; it does not add component-specific
paint or spacing. An authored noninteractive HTML root may be used instead; it
receives `role="meter"`. Registered constituents can live across open shadow
boundaries; the label relationship uses an element reference.

| Constructor option / update option                 | Default / meaning                                                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `value`                                            | Required number; no default. NaN uses minimum, negative/positive infinity use the respective bound.             |
| `minimum`, `maximum`                               | 0, 100. Must be finite and strictly ordered with finite extent.                                                 |
| `locale`                                           | Nearest rendered `lang` owner; string or locale list can override it.                                           |
| `format`                                           | Without an explicit format, display localized percentage of range. With a format, format the clamped scalar.    |
| `valueText`                                        | Explicit accessible text, otherwise resolver or formatted value.                                                |
| `getAccessibleValueText(formattedValue, rawValue)` | Optional accessible-text resolver; receives the original value even when clamped.                               |
| `diagnostic(code, message)`                        | Optional callback for invalid range/format; root also emits a bubbling/composed `tp-diagnostic`, once per code. |

`meterState(options)` returns an immutable snapshot without binding DOM. The
controller's read-only `state` is that same snapshot for every registered part:
`value`, `rawMinimum`, `rawMaximum`, `minimum`, `maximum`, `clampedValue`,
`normalizedPercentage` (0–1), `percentage` (0–100), `formattedValue`,
`accessibleValueText`, and `invalidRange`. An invalid range uses the safe0–100
range with zero geometry and emits a diagnostic. Invalid locale/format falls back
to localized percentage and emits a diagnostic.

`update(partialOptions)` changes configuration synchronously; explicitly setting
an optional option to `undefined` restores its default. `refresh()` recomputes
state and bindings. Owner language changes are observed automatically.

`registerPart(name, element, options?)` supports one each of:

- `label`: accessible name, generated identifier when needed, presentation role.
- `value`: formatted text, `aria-hidden=true`; optional `content(formatted, raw)`
  returns Lit content, including intentionally empty content.
- `track`: a context-bearing structural element; no imposed paint or geometry.
- `indicator`: logical `inline-size` from the normalized percentage.

Each call returns a release function. Replacing a constituent releases the old
registration. `getMeterState(element)` returns the current Root snapshot for the
root or any registered constituent. The controller does not install keyboard,
pointer, form submission or live-region behavior.

`dispose()` disconnects observation and restores owned attributes, indicator
geometry, original Value nodes and label association. Consumer attribute changes
made after the last controller write are retained. Do not retain an active binding
after its owner is removed; dispose it, then create a new controller when that
owner reconnects. Duplicate registration of an already owned element is rejected.
