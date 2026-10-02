# Input

`tp-input` binds one native input to shared Field control behavior. Labels, descriptions and errors belong to `tp-field`; optional prefix and suffix content belongs to `tp-input-group`.

```ts
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
```

```html
<tp-field label="Email" description="Used for receipts">
  <tp-input name="email" type="email" default-value="hello@example.com" required></tp-input>
</tp-field>
```

## Properties

| Property / attribute                                       | Type                                                     | Default             | Behavior                                                                                                                              |
| ---------------------------------------------------------- | -------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `value` / `value`                                          | string, number or string list; getter is serialized text | omitted; empty text | Supplying it before the first update establishes controlled state. Owner acceptance or rewriting commits the returned value.          |
| `defaultValue` / `default-value`                           | string, number or string list                            | empty               | Uncontrolled initial and reset value. Supply either value or defaultValue.                                                            |
| `type`                                                     | host-supported input type                                | `text`              | Preserves native editing, type affordances and validation.                                                                            |
| `name`                                                     | string                                                   | empty               | Form data key; an owning Field's name takes precedence.                                                                               |
| `placeholder`                                              | string                                                   | empty               | Hint, never an accessible label.                                                                                                      |
| `label`                                                    | string                                                   | empty               | Standalone accessible name; Field naming participates when registered.                                                                |
| `autocomplete`                                             | string                                                   | empty               | Native autocomplete policy.                                                                                                           |
| `min`, `max`, `step`, `pattern`                            | string                                                   | empty               | Native constraints for applicable types.                                                                                              |
| `minLength` / `minlength`, `maxLength` / `maxlength`       | number                                                   | `-1`, omitted       | Native text length constraints.                                                                                                       |
| `disabled`, `readOnly` / `readonly`, `required`, `invalid` | Boolean                                                  | false               | Disabled omits form data; read-only preserves selection and serialization. Explicit invalidity remains separate from native validity. |
| `formOwner` / `form`                                       | form ID or HTMLFormElement                               | nearest form        | External form association.                                                                                                            |
| `onValueChange`                                            | `(event: TpValueChangeEvent<string>) => void`            | absent              | Change proposal callback before DOM notification.                                                                                     |
| `hostProperties`                                           | record                                                   | `{}`                | Native autocomplete, selection and host properties; state-owned value/name/type remain governed by their public properties.           |
| `inputElementReference`                                    | callback or `{ current }`                                | absent              | Receives native input and null on cleanup.                                                                                            |
| `partContracts`, `partPresentation`                        | records                                                  | `{}`                | Shared rendering, host, reference and presentation hooks.                                                                             |
| `motionPolicy` / `motion-policy`                           | inherit, normal, reduce                                  | inherit             | Shared motion preference.                                                                                                             |

Controlled examples accept proposals explicitly:

```ts
input.value = 'Owner value';
input.onValueChange = (event) => {
  input.value = event.detail.value;
};
```

Mode stays fixed for an instance lifetime. A rejected or canceled edit restores committed text and preserves selection within its bounds. Composition keeps the native draft until composition ends.

## Methods and native channels

`focus(options)`, `blur()`, `select()`, `setSelectionRange(start, end, direction?)`, and `setRangeText(replacement, start?, end?, mode?)` retain native selection behavior. Read/write `selectionStart`, `selectionEnd` and `selectionDirection` are native channels; unavailable types return null.

`setValue(value)` proposes a programmatic change. `clear(sourceEvent?)` proposes `input-clear` and respects disabled/read-only state. `setCustomValidity(message)`, `checkValidity()` and `reportValidity()` expose native validation. `inputElement`, `form`, `labels`, `validity`, `validationMessage`, `controlled`, `effectiveDisabled`, `effectiveName` and `effectiveInvalid` are read-only channels. Field integration uses shared `setFieldContext()` and `setFieldAssociation()`.

Native form reset restores an uncontrolled default with `form-reset`; controlled reset does not propose or replace owner state. State restoration restores uncontrolled strings. Enter uses the associated form's default submitter; composition does not submit. File input retains its native file list and serializes files without duplicate participants.

## Events

`tp-value-change` bubbles, is composed and cancelable. Its detail includes `value`, `previousValue`, `reason`, `sourceEvent`, optional `trigger`, `cancelled`, `allowPropagation` and optional `metadata`. Callback or listener cancellation prevents commitment. Reasons are `input`, `input-clear`, `input-paste` (the original paste event), `programmatic` and `form-reset`. Accepted owner publication emits passive `tp-field-value` for Field coordination. Native input/change events retain native behavior.

## Anatomy and customization

The native control publishes `input` and `focusable`. Prefix/suffix slots are supplied by Input Group. Field-aware markers include disabled, read-only, required, valid/invalid, dirty, touched, filled and focused where meaningful.

`partContracts.input` supports `renderDelegate`, `hostProperties`, `classHook`, `styleHook`, `elementReference` and `content`. A delegate must apply its supplied `bind` directive to a compatible native editable input. Consumer initiating handlers run before component handling; `preventComponentHandling()` skips the component handler independently from native `preventDefault()`.

Customize semantic tokens, the presentation dictionary, `partPresentation.input`, or `::part(input)`. Keep caret, selection, autofill and type-specific affordances visible. The Storybook example is controlled and accepts edits; its empty value is example setup, not a requirement to control every Input.

Native form serialization follows the editable input's current representation, including type sanitization, while the controlled owner value remains its supplied value. An empty named file input submits the native empty File; unnamed inputs do not contribute data. `hostProperties` uses HTML attribute names, dot-prefixed native properties (such as `.inputMode`), `@event` handlers and object style declarations.
