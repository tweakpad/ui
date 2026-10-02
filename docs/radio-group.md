# Radio Group

`tp-radio-group` owns one optional comparable selection and one form value. Compose it with `tp-radio-group-item` constituents, which are Radios within the existing Radio Group catalog identity.

```html
<tp-field label="Delivery" description="Choose a delivery speed">
  <tp-radio-group name="delivery" default-value="standard" required>
    <tp-radio-group-item value="standard">Standard</tp-radio-group-item>
    <tp-radio-group-item value="express">Express</tp-radio-group-item>
  </tp-radio-group>
</tp-field>
```

## Group properties

| Property / attribute                                       | Type                          | Default           | Meaning                                                                        |
| ---------------------------------------------------------- | ----------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| `value`                                                    | comparable value or undefined | uncontrolled none | Controlled property, strict identity comparison; attribute values are strings. |
| `defaultValue` / `default-value`                           | comparable value              | none              | Uncontrolled initial/reset selection.                                          |
| `onValueChange`                                            | change callback               | absent            | Accept/rewrite/veto selection.                                                 |
| `name`                                                     | string                        | empty             | Single submission key, or Field's inherited key.                               |
| `label`                                                    | string                        | empty             | Accessible group name; Field label also participates.                          |
| `orientation`                                              | horizontal or vertical        | vertical          | Chooses arrow axis and layout.                                                 |
| `disabled`, `readOnly` / `readonly`, `required`, `invalid` | Boolean                       | false             | Group state inherited without overwriting authored member flags.               |
| `formOwner` / `form`                                       | form ID or HTMLFormElement    | nearest form      | External association.                                                          |
| `inputElementReference`                                    | callback or mutable reference | absent            | Selected eligible constituent's native input.                                  |
| `partContracts`, `partPresentation`                        | records                       | empty             | Group rendering and root/member/indicator appearance.                          |

## Item properties

`TpRadioGroupItem` / `tp-radio-group-item` requires a `value`, with no default. `nativeAction` / `native-action` defaults false (span; true renders button). Both expose radio semantics. `disabled`, `readOnly` / `readonly`, `required`, and `invalid` default false and inherit group/Field state. `keepMounted` / `keep-mounted` defaults false and retains a hidden unchecked Indicator. `inputElementReference` receives the native input and null on cleanup. Default slot content supplies its label. `checked`, `radioDisabled`, `radioReadOnly`, and `controlElement` are read-only.

## Interaction, forms and methods

Press/Space selects; pressing the selected item does not clear it. Enter does not select. Arrow keys follow orientation and writing direction, wrap and skip disabled items, and select the focused Radio. Home/End choose the first/last eligible Radio. Every user selection proposal reports `item-press`, including arrow selection. One selected enabled Radio is the tab stop, otherwise the first enabled Radio is; Tab leaves the group. A group requires an accessible name.

The group submits once only while a matching eligible Radio is mounted. String/number/Boolean values stringify; object values use JSON serialization while selection uses identity. Unmatched values remain stored, render no selection and fail required validity; matching remounts restore the checked presentation. Reset restores uncontrolled defaults with `form-reset`. Read-only retains submission; disabled omits it.

`setValue(value, reason?, sourceEvent?)`, `focus(options?)`, `blur()`, `checkValidity()` and `reportValidity()` are public. Shared form channels include `form`, `inputElement`, `validity`, `validationMessage`, and effective name/disabled/invalid state. Item focus and label activation forward to its semantic host.

Nested groups isolate registration. Duplicate or missing values are composition errors; later duplicate members are excluded. Native `button[value]` and `input[type=radio][value]` children retain compatibility: their original attributes are restored on removal, native names are suppressed while owned to avoid duplicate form serialization. New compositions should use the complete Item constituent.

## Anatomy and customization

`radio-group` is the Group part. Each Item owns `radio-group-item` and optional `radio-group-indicator`. Set Group's container contract on `group.partContracts['radio-group']`; set Item/Indicator contracts on that Item's `partContracts`. Group `partPresentation` contributions reach constituent parts, before each Item's terminal consumer hooks. Native compatibility children have the shared Group appearance registration; a full Item supplies delegated anatomy and Indicator options.

Indicators use shared Presence and beginning/ending/retained markers. Roots expose checked/unchecked, disabled, read-only, required, invalid and focus-visible markers. The selected dot remains decorative. Scoped tokens, dictionaries and delegates retain group ownership and native form state.

## Ownership and notifications

The first update fixes controlled versus uncontrolled ownership. Supply either the controlled property or its default. A controlled callback accepts or rewrites a proposal by assigning the controlled property; without an owner return, committed state remains unchanged. Cancel with `event.preventDefault()` or `event.detail.cancelled = true`. Callbacks run before the composed, bubbling `tp-value-change` notification. Reentrant requests are queued after the current transaction.

Event detail includes `value`, `previousValue`, `reason`, `sourceEvent`, optional `trigger`, `cancelled`, `allowPropagation`, and optional `metadata`. Programmatic proposals use `programmatic`; an external controlled assignment publishes state without fabricating a proposal. Invalid ownership/composition emits `tp-diagnostic`.

## Shared customization

`partContracts` maps a public part to `renderDelegate`, `hostProperties`, `classHook`, `styleHook`, `elementReference`, and `content`. Class, style and content may resolve from the same committed state used for ARIA and markers. References accept a callback or `{ current }` and clear on replacement/disconnection. A delegate must bind the supplied `bind` directive to its semantic element and render `content`. Required roles, native state and ARIA remain protected. Consumer initiating handlers run first; `preventComponentHandling(event)` suppresses component handling independently from native `preventDefault()`.

`partPresentation`, `::part(...)`, semantic CSS tokens, and `setPresentationDictionary()` customize appearance without replacing state owners. `direction` / `dir` follows inherited writing direction; `motionPolicy` / `motion-policy` defaults to `inherit` (also `normal`, `reduce`). Defaults and documentation examples use the library's shared recipes.

## Registration

```ts
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
```
