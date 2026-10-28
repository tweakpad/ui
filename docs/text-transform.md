Text transform presents one value as text: changed case, a readable label from an identifier, or a localized number, price, percentage, unit, byte size or duration. It can also shorten the text at its start, middle or end, to a number of characters or words or to the width it has, and shows the full text in a tooltip while shortened.

```html
<tp-text-transform preset="currency" currency="EUR" value="1234.5"></tp-text-transform>
<tp-text-transform preset="capitalize">northern lights ferry tour</tp-text-transform>
<tp-text-transform truncate="middle">harbor-webcam-2026-10-14-dawn-panorama.jpg</tp-text-transform>
```

## Input

`value` accepts a number, a bigint or text. When it is unset, the element's trimmed text content is the input, so server-rendered text such as `<tp-text-transform preset="uppercase">gate b</tp-text-transform>` upgrades in place, and edits to the content update the text. Empty input presents nothing.

Numeric presets read a finite number, a bigint, or text in decimal form (`-12.5`, `1e3`, `.5`). Decimal text is formatted exactly, so `12345678901234567890.25` keeps every digit. Grouped or localized text such as `1,234` is not read as a number: it stays as written, the element sets `invalid` / `data-invalid`, and a `tp-diagnostic` reports the input. `bytes` and `duration` also reject negative values.

## Presets

`preset` names the transform. The default, `text`, presents the input unchanged.

| `preset`     | Input              | en-US example                                                         |
| ------------ | ------------------ | --------------------------------------------------------------------- |
| `text`       | anything           | the input as text                                                     |
| `uppercase`  | text               | `dock four` → DOCK FOUR                                               |
| `lowercase`  | text               | `DOCK FOUR` → dock four                                               |
| `capitalize` | text               | `northern lights tour` → Northern Lights Tour                         |
| `sentence`   | text               | `quiet harbor at dawn` → Quiet harbor at dawn                         |
| `camel`      | text               | `return trip discount` → returnTripDiscount                           |
| `pascal`     | text               | `return trip discount` → ReturnTripDiscount                           |
| `kebab`      | text               | `ReturnTripDiscount` → return-trip-discount                           |
| `snake`      | text               | `ReturnTripDiscount` → return_trip_discount                           |
| `constant`   | text               | `returnTripDiscount` → RETURN_TRIP_DISCOUNT                           |
| `humanize`   | text               | `returnTripDiscount` → Return trip discount                           |
| `number`     | number             | `1234.567` → 1,234.567                                                |
| `integer`    | number             | `1234.567` → 1,235                                                    |
| `decimal`    | number             | `3` → 3.00 (`decimals`, 2 by default)                                 |
| `percent`    | number, a ratio    | `0.25` → 25%                                                          |
| `currency`   | number             | `1234.5` with `currency="EUR"` → €1,234.50                            |
| `compact`    | number             | `15300` → 15K, read as "15 thousand"                                  |
| `scientific` | number             | `15300` → 1.53E4                                                      |
| `unit`       | number             | `42` with `unit="kilometer-per-hour"` → 42 km/h                       |
| `bytes`      | bytes, 0 or more   | `2516582` → 2.4 MB (binary units, 1 KB = 1024 B), read as "megabytes" |
| `duration`   | seconds, 0 or more | `3725` → 1:02:05, read as "1 hour, 2 minutes, 5 seconds"              |

Case changes follow the locale: `uppercase` maps `istanbul` to `İSTANBUL` under `lang="tr"`. `capitalize` and `sentence` change only the first character of a word and leave the rest as written. Identifier presets split words at spaces, `-`, `_` and `.`, where a lowercase letter or digit meets an uppercase letter, and between an acronym and the next word (`XMLHttpRequest` → xml, http, request); letters and digits next to each other stay one word (`base64Encode` → base64-encode).

Numeric presets format through `Intl.NumberFormat` for the locale and show tabular figures. Dates and times belong to Time.

### Options

`currency` (an ISO 4217 code), `unit` (a unit identifier such as `kilometer`, `liter` or `megabyte-per-second`) and `decimals` (0 to 20; sets both the minimum and the maximum fraction digits) cover the common choices as attributes. `format` takes the full options record as a property and wins over them:

```js
const fare = document.querySelector('tp-text-transform');
fare.format = { currencyDisplay: 'name', maximumFractionDigits: 0 };
```

Options resolve in this order, each overriding the previous: the preset's defaults, then `currency`, `unit` and `decimals`, then `format`. Numeric presets take `Intl.NumberFormatOptions`; `duration` takes `{ style, guide }`, where `style` is `digital` (default), `long`, `short` or `narrow` and `guide` is a reference length in seconds that keeps the digital fields stable. Setting `format` with the `text` preset formats a number.

A `currency` preset without a currency, or a `unit` preset without a unit, formats a plain number. Options that `Intl` rejects fall back to the preset's defaults. Each case emits one `tp-diagnostic`.

## Custom presets and formatters

`defineTextPreset(name, definition)` names a preset for the page and returns a function that removes it. A definition is either a built-in preset with options, or a formatter:

```js
import { defineTextPreset } from '@tweakpad/ui';

defineTextPreset('fare', { preset: 'currency', format: { currency: 'EUR' } });
defineTextPreset('berth', ({ value }) => ({
  text: `B-${String(value).padStart(3, '0')}`,
  accessibleText: `Berth ${value}`,
}));
```

```html
<tp-text-transform preset="fare" value="36"></tp-text-transform>
<tp-text-transform preset="berth" value="7"></tp-text-transform>
```

Built-in names are reserved. Defining, replacing or removing a preset updates every element that uses its name; an element that names a preset before it is defined presents its input as text, emits one `tp-diagnostic`, and switches once the preset exists. A preset with options sits between the base preset's defaults and the element's own `currency`, `unit`, `decimals` and `format`.

`formatter` replaces the preset for one element:

```js
seatsLeft.formatter = (context) => `${context.apply('percent')} of seats left`;
```

A formatter receives a `TextFormatContext` and returns text, or `{ text, accessibleText }` when assistive technology should hear something else:

| Context member                 | Meaning                                                       |
| ------------------------------ | ------------------------------------------------------------- |
| `value`                        | The input as supplied.                                        |
| `text`                         | The input as text.                                            |
| `locale`                       | The resolved locale.                                          |
| `preset`                       | The element's preset name.                                    |
| `format`                       | The element's `format` options.                               |
| `apply(preset, value, format)` | Applies any preset to `value` (the input when omitted); text. |

Formatter output is always text, never markup. A formatter that throws or returns something else emits one `tp-diagnostic` and the preset presents instead.

## Truncation

`truncate` shortens the text to one line that fits the element's width, placing the omission (`…`) at the `end`, the `middle` or the `start`. Start and end are logical: in right-to-left text the start is on the right. `truncate-by` chooses what is removed: `chars` (default) removes whole characters, so emoji and accented letters are never split; `words` removes whole words, so the text never ends in half a word. If not even one word fits, the first word is cut by characters rather than showing only `…`. Whitespace next to the omission is dropped, and line breaks become spaces.

A truncating element is an inline block that shrinks with its container: inside a flex or grid track it can become narrower than its full text, and it never changes height or moves the content after it. The text refits when the container resizes, fonts load, or the text, locale or truncation settings change. Measuring is done once per text and font, so resizing many values stays cheap.

`max-length` caps the number of characters or words kept. With `truncate`, the cap applies on top of the width; without it, the text is cut at the end and wraps normally. A middle cut splits the kept units between both ends, the beginning taking the extra one.

While the text is shortened, the value can be focused and a tooltip shows the full text on hover or focus. `tooltip="false"` removes the tooltip and the tab stop. A value that stops being shortened while focused keeps focus until it is left.

## Accessibility

Assistive technology always hears the complete text once. Shortened text is hidden from it and the full text is exposed instead. Abbreviated forms are spelled out: compact numbers ("15 thousand"), short units ("42 kilometers per hour"), byte sizes ("2.4 megabytes") and digital durations ("1 hour, 2 minutes, 5 seconds"). The tooltip repeats the full text visually only, so it is not announced twice. Updates are never announced through a live region.

## Locale

`locale` sets the formatting and case-mapping locale; without it, the closest `lang` attribute applies. A change to `lang` anywhere in the document, or to the browser's languages, updates the text in place. A `locale` that is not a valid language tag emits a `tp-diagnostic` and the browser's default locale applies.

## API — `tp-text-transform`

| Property / attribute         | Type; default                                                         | Behavior                                                                    |
| ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `value`                      | number, bigint or string; text content                                | The input.                                                                  |
| `preset`                     | built-in or custom preset name; `text`                                | The transform. Reflected.                                                   |
| `format`                     | `TextFormatOptions` (property only)                                   | Preset options; win over the attributes below.                              |
| `formatter`                  | `(context: TextFormatContext) => TextFormatterResult` (property only) | Replaces the preset.                                                        |
| `currency`                   | string; `''`                                                          | Currency code of the `currency` preset.                                     |
| `unit`                       | string; `''`                                                          | Unit identifier of the `unit` preset.                                       |
| `decimals`                   | number 0–20; unset                                                    | Exact fraction digits (`decimal` defaults to 2).                            |
| `locale`                     | string; closest `lang`                                                | Formatting and case-mapping locale.                                         |
| `truncate`                   | `none \| start \| middle \| end`; `none`                              | Where the omission goes; any value but `none` fits one line. Reflected.     |
| `truncateBy` / `truncate-by` | `chars \| words`; `chars`                                             | What truncation removes.                                                    |
| `maxLength` / `max-length`   | non-negative integer; unset                                           | Most characters or words kept.                                              |
| `tooltip`                    | boolean; `true`                                                       | Full-text tooltip and tab stop while shortened. `tooltip="false"` disables. |
| `text` (read only)           | string                                                                | The complete presented text, before shortening.                             |
| `accessibleText` (read only) | string                                                                | The text assistive technology hears.                                        |
| `truncated` (read only)      | boolean                                                               | Whether the presented text is shortened.                                    |

The host reflects `data-truncated` while shortened and `invalid` / `data-invalid` when a numeric preset cannot read the input. The default slot holds the text content: the input when `value` is unset, and the presentation when the input is invalid.

### Events

| Event           | Detail              | When                                                                                                    |
| --------------- | ------------------- | ------------------------------------------------------------------------------------------------------- |
| `tp-diagnostic` | `{ code, message }` | Invalid input, a missing or rejected option, an undefined preset or a failing formatter; once per case. |

### Functions

| Export                                      | Behavior                                                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `defineTextPreset(name, definition)`        | Defines a page-wide preset (a formatter or `{ preset, format }`); returns a remove function.                |
| `transformText(input, options)`             | The same transform outside the DOM; returns `{ text, accessibleText, machineValue, invalid, diagnostics }`. |
| `TEXT_PRESETS`, `isBuiltInTextPreset(name)` | The built-in preset names.                                                                                  |

## Composition and presentation

Use Text transform wherever a value is shown as text: Table cells, List item footers, Card and Alert text, Badge or Citation labels, and file names in narrow sidebars. It paints no surface, inherits font and color from its context, and is isolated for bidirectional text like `<bdi>`, so a right-to-left value never reorders with the text around it.

Parts: `text-transform` (the host), `text-transform-value` (the presented text: a `data` element whose `value` is the raw number for numeric input, otherwise a `span`), and `text-transform-description` (the tooltip content). Customize through `partContracts` or `::part(text-transform-value)`. Focus uses the shared ring.

Exported class: `TpTextTransform`. Exported types: `TextFormatContext`, `TextFormatter`, `TextFormatterResult`, `TextFormatOptions`, `TextDurationOptions`, `TextPresetDefinition`, `TextTransformOptions`, `TextTransformResult`, `TruncatePosition`, `TruncateUnit`. Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css`.
