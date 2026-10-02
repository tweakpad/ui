# Native Select

`tp-native-select` preserves the browser picker, native option groups, keyboard navigation and typeahead. Use Select when the popup requires custom item anatomy. Native Select uses the same form and value owners as Input and Text Area.

```ts
import '@tweakpad/ui/styles.css';
import '@tweakpad/ui/register';
import { TpNativeSelect } from '@tweakpad/ui';
```

```html
<tp-native-select name="food" label="Favorite food" default-value="apple">
  <optgroup label="Fruit">
    <option value="apple">Apple</option>
    <option value="banana">Banana</option>
  </optgroup>
  <optgroup label="Vegetables">
    <option value="carrot">Carrot</option>
    <option value="spinach" disabled>Spinach</option>
  </optgroup>
</tp-native-select>
```

Direct child native `option` and `optgroup` markup is the source registry. Option text, `value`, `label`, `disabled`, `selected` defaults, group labels and disabled state update the real shadow select. Insert, remove or reorder the authored nodes to update the picker. Each authored option maps to an actual native option; groups remain actual native optgroups. A selected disabled option or option in a disabled group is omitted from FormData as in native HTML.

| Property / attribute             | Type                        | Default / behavior                                                                                                        |
| -------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `value` / `value`                | string or readonly string[] | Omitted means uncontrolled. Attribute values are strings; use a property array for multiple.                              |
| `defaultValue` / `default-value` | string or readonly string[] | Initial and latest reset default. Otherwise selected authored options, then the first enabled option for a single picker. |
| `multiple`                       | boolean                     | false; native multiple-selection listbox when true. Native option order determines submitted repeated entries.            |
| `size`                           | sm or default               | default; seven/eight spacing units (28/32px with 4px spacing), independent of the native row count.                       |
| `placeholder`                    | string                      | empty; creates a disabled empty option for single selection.                                                              |
| `label`                          | string                      | Options; accessible fallback. Prefer a meaningful name or an enclosing Field.                                             |
| `onValueChange`                  | callback                    | Receives the same cancelable `TpValueChangeEvent<NativeSelectValue>` as `tp-value-change`.                                |
| `hostProperties`                 | record                      | Native Control attributes, properties and handlers.                                                                       |

Supply `value` for a controlled lifetime and synchronously return the accepted value from `onValueChange`. Leaving it unchanged rejects a proposal; assigning another value rewrites it. Canceling the event restores the committed native selection and FormData even if an owner returned a proposal first. Native `change` uses reason `input` with the actual browser event as `sourceEvent`; `setValue()` uses `programmatic`, reset uses `form-reset`. Controlled values absent from the options have no native selection and no submitted entry. Uncontrolled removal of the committed option falls back to current authored default/first eligible option through the same transaction owner; consumers may veto the reconciliation. Changing mode after the first native mount emits a diagnostic and preserves the original mode.

```ts
select.multiple = true;
select.value = ['apple', 'carrot'];
select.onValueChange = (event) => {
  if (!event.defaultPrevented && !event.detail.cancelled) select.value = event.detail.value;
};
```

`name`, `disabled`, `readOnly` (`readonly`), `required`, `invalid`, `formOwner` (`form`), `inputElementReference`, Field association, and `checkValidity()` / `reportValidity()` come from `TpFormElement`. A Field supplies its context without destroying authored state. `formOwner` accepts an identifier or the actual form element. Native Select submits each enabled selected value exactly once, with repeated keys in multiple mode; reset restores latest uncontrolled defaults, and platform restoration accepts the saved string/array state or FormData. Controlled reset/restoration retain the owner value.

Native select has no HTML readonly state, so `readOnly` blocks initiating pointer and keyboard changes, restores any attempted native change, and keeps the committed value enabled for submission. Tab remains available. The readonly control uses the existing muted background and foreground tokens with a default cursor to distinguish a preserved value from an editable picker. `setCustomValidity(message)` forwards to the native validity owner; clear with an empty string. Native required/disabled/selected-option validity is forwarded to ElementInternals.

`inputElement` exposes the actual `HTMLSelectElement`; the callback/object `inputElementReference` tracks mount, replacement, disconnect and reconnect. `options`, `selectedOptions` and `selectedIndex` expose the current native collection/selection. Assigning `selectedIndex` proposes a programmatic change through the shared owner. `setValue(value): boolean`, `focus(options?)`, `blur()` and `activateFromLabel()` keep native focus and selection behavior. Change source option markup to persist option mutations across future renders.

Use an actual Field for richer labels and descriptions:

```html
<tp-field label="Destination" description="Choose the shipping region.">
  <tp-native-select name="region" default-value="eu">
    <option value="eu">Europe</option>
    <option value="na">North America</option>
  </tp-native-select>
</tp-field>
```

All five parts use the common `partContracts` surface:

| Part                         | Default host / content                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `native-select`              | Wrapper div; Control and Indicator composition.                                                                    |
| `native-select-control`      | Native select; projected options/groups.                                                                           |
| `native-select-option-group` | Native optgroup; projected native option children.                                                                 |
| `native-select-option`       | Native option; text, explicit native label and value.                                                              |
| `native-select-indicator`    | Decorative span containing the actual TpIcon; `indicator` slot accepts consumer content. Omitted in multiple mode. |

Every contract accepts `renderDelegate({state,properties,content,bind})`, `hostProperties`, `classHook` (string or resolver), `styleHook` (record or resolver), `elementReference` (callback or `{current}`), and `content` (static or state resolver). `state` includes committed value, multiple, disabled, readOnly, required, invalid, filled and size. Repeated Option/Group state additionally includes its source element, label, optionValue, optionDisabled and selected. Use callbacks for repeated references; an object ref represents the last mounted instance.

Delegates must retain the correct native select/optgroup/option host and place `${bind}` on that host. Required native state, semantics and component handlers survive the merge. Wrapper/Control content replacement assumes responsibility for the complete native child anatomy. When Control content supplies native options, their `selected` defaults establish the initial uncontrolled value after mount and the latest reset default; the same form and transaction owner reconciles later native option removal. Initial native default discovery emits only passive `tp-field-value` bookkeeping for Field, without a public value-change proposal. Omitting Control removes its form entry and native validity until it mounts again; the committed value, defaults and custom validity message survive restoration. Option content is native text; arbitrary icons are not supported by traditional native pickers. Rich content belongs in Field or the decorative Indicator.

```ts
import { nothing } from 'lit';

select.hostProperties = { '.size': 5, autocomplete: 'country-name' };
select.partContracts = {
  'native-select-control': { classHook: 'shipping-select', styleHook: { maxInlineSize: '24rem' } },
  'native-select-indicator': { renderDelegate: () => nothing },
};
```

Native `.size` is the listbox row count, independent of the component visual `size`. If a delegate omits the decorative Indicator, native arrow appearance is restored from actual rendered anatomy. Consumer event handlers run before component handlers. `preventDefault()` affects native defaults; `preventComponentHandling(event)` explicitly suppresses component handling and rolls the native selection back to the committed model.

Nova paint layers native size, logical paddings, muted 16px arrow and Canvas option colors over the shared Input boundary recipe. Shared theme/token roles govern border, focus ring, foreground, dark input surface and radius; small size also adjusts padding and radius. Wrapper geometry, native ownership and decorative pointer exclusion remain structural through full dictionary replacement. Use scoped `--tp-*` tokens, `partPresentation`, presentation dictionaries or the part hooks to customize paint while retaining the native picker. Inherited RTL moves the decorative arrow to the logical trailing side.
