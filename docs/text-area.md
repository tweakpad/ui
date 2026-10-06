# Text area

`tp-text-area` binds a native textarea to the same value, editing, Field and form owner as Input. It preserves newlines, selection, composition and scrolling.

```ts
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
```

```html
<tp-field label="Message" description="Include any details we should know.">
  <tp-text-area name="message" rows="4" default-value="Hello" required></tp-text-area>
</tp-field>
```

## Properties

| Property / attribute                                       | Type                                          | Default            | Behavior                                                                                                                                                                                                                                           |
| ---------------------------------------------------------- | --------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                                                    | text; number/list coerces to text             | omitted; empty     | Controlled when supplied before the first update; proposals require owner publication.                                                                                                                                                             |
| `defaultValue` / `default-value`                           | text; number/list coerces to text             | empty              | Uncontrolled initial/reset text; do not combine with value.                                                                                                                                                                                        |
| `rows`                                                     | positive integer                              | native default `2` | Initial visible line count.                                                                                                                                                                                                                        |
| `resize`                                                   | none, block, inline, both                     | block              | Logical resize direction; follows writing mode.                                                                                                                                                                                                    |
| `name`, `label`, `placeholder`, `autocomplete`             | string                                        | empty              | Native form key, standalone name, hint and autocomplete. A Field name overrides local name.                                                                                                                                                        |
| `noAutofill` / `no-autofill`                               | boolean                                       | false              | Opts the native editor out of browser and password-manager autofill (`autocomplete="off"` plus Bitwarden, 1Password, LastPass and Dashlane hints). Also inherited from an enclosing Field or Form. Leave off for fields autofill should help with. |
| `minLength` / `minlength`, `maxLength` / `maxlength`       | number                                        | `-1`, omitted      | Native length constraints.                                                                                                                                                                                                                         |
| `disabled`, `readOnly` / `readonly`, `required`, `invalid` | Boolean                                       | false              | Disabled prevents editing and serialization; read-only remains selectable and serializes.                                                                                                                                                          |
| `formOwner` / `form`                                       | form ID or HTMLFormElement                    | nearest form       | Form association.                                                                                                                                                                                                                                  |
| `onValueChange`                                            | `(event: TpValueChangeEvent<string>) => void` | absent             | Cancelable proposal callback.                                                                                                                                                                                                                      |
| `hostProperties`                                           | record                                        | `{}`               | Native host capabilities, such as spellcheck and wrapping.                                                                                                                                                                                         |
| `inputElementReference`                                    | callback or `{ current }`                     | absent             | Receives native textarea and null on cleanup.                                                                                                                                                                                                      |
| `partContracts`, `partPresentation`                        | records                                       | `{}`               | Rendering and presentation hooks.                                                                                                                                                                                                                  |
| `motionPolicy` / `motion-policy`                           | inherit, normal, reduce                       | inherit            | Shared motion preference.                                                                                                                                                                                                                          |

## Methods and state

`focus`, `blur`, `select`, `setSelectionRange`, `setRangeText`, `selectionStart`, `selectionEnd` and `selectionDirection` expose native text selection. `setValue(value)` proposes a programmatic update; `clear(sourceEvent?)` proposes a permitted clear. `setCustomValidity`, `checkValidity` and `reportValidity` expose validation. Read-only channels include `inputElement`, `form`, `labels`, `validity`, `validationMessage`, `controlled`, `effectiveDisabled`, `effectiveName` and `effectiveInvalid`.

Controlled mode stays fixed for a lifetime; rejected edits restore committed text without unnecessary selection changes. Composition remains one edit. Enter inserts a newline and does not trigger the Input submission bridge. Resizing does not change the value or accessible relationships. Uncontrolled reset uses `form-reset`, while controlled reset preserves owner text without a synthetic proposal. Form restoration restores uncontrolled strings.

## Events

`tp-value-change` is bubbling, composed and cancelable; detail includes proposed `value`, `previousValue`, semantic `reason`, original `sourceEvent`, optional `trigger`, `cancelled`, `allowPropagation` and optional `metadata`. Reasons are `input`, `input-clear`, `input-paste`, `programmatic` and `form-reset`. Callback or listener cancellation stops commitment. Passive `tp-field-value` coordinates accepted values with Field; native input/change remain native events.

## Anatomy and customization

Native textarea publishes `text-area`, `text-area-resize-affordance` and `focusable`. Resize affordance is the host-native corner handle. Shared Field markers expose disabled/read-only/required, valid/invalid, dirty, touched, filled and focused where meaningful.

`partContracts['text-area']` supports `renderDelegate`, `hostProperties`, `classHook`, `styleHook`, `elementReference` and `content`. Apply the supplied `bind` directive to a compatible native textarea. Consumer initiating handlers run first and may call `preventComponentHandling()` independently from native default cancellation.

As in Base UI, the native `<textarea>` renders into the Text Area's light DOM (`tp-text-area > textarea`), shares its form owner and submits natively. Use semantic tokens, dictionary replacement, `partPresentation['text-area']`, or style `tp-text-area > textarea` directly; `::part(text-area)` no longer applies. Preserve scrolling, selection, resize affordance and visible error/focus indication. The canonical Storybook example is controlled and accepts changes; standalone uncontrolled usage remains the default.

Native fixed sizing preserves rows by default. To opt into content sizing where supported, set `hostProperties = { style: { fieldSizing: "content" } }`; wrapping, writing mode and native selection properties use the same native channel. Native properties use a leading dot (for example `.inputMode`), attributes use their HTML names, and native event handlers use `@input`.
