# Checkbox

`tp-checkbox` is a Boolean form control. Mixed state is independent of the submitted Boolean. Its Checkbox owner is also consumed by Switch.

```html
<tp-field label="Accept terms" description="Required to continue">
  <tp-checkbox name="terms" value="accepted" required></tp-checkbox>
</tp-field>
```

## Properties

| Property / attribute                                       | Type                          | Default            | Meaning                                                                                                                                |
| ---------------------------------------------------------- | ----------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `checked`                                                  | Boolean or undefined          | uncontrolled false | Supplying before first update establishes controlled ownership.                                                                        |
| `defaultChecked` / `default-checked`                       | Boolean                       | false              | Uncontrolled initial/reset state.                                                                                                      |
| `onCheckedChange`                                          | Boolean change callback       | absent             | Accept/rewrite/veto a proposal.                                                                                                        |
| `indeterminate`                                            | Boolean                       | false              | Mixed ARIA/indicator; a press proposes true. The consumer clears mixed state.                                                          |
| `name`                                                     | string                        | empty              | Form key, or inherited Field key.                                                                                                      |
| `value`                                                    | string                        | `on`               | Checked value; an explicitly empty string stays empty.                                                                                 |
| `uncheckedValue` / `unchecked-value`                       | string or undefined           | omitted            | Optional unchecked form value.                                                                                                         |
| `disabled`, `readOnly` / `readonly`, `required`, `invalid` | Boolean                       | false              | Authored flags retained when inherited Field/group state changes.                                                                      |
| `nativeAction` / `native-action`                           | Boolean                       | false              | Root is a span by default, button when true; both retain checkbox semantics.                                                           |
| `parent`                                                   | Boolean                       | false              | Aggregate checkbox inside a native-host CheckboxGroupController.                                                                       |
| `keepMounted` / `keep-mounted`                             | Boolean                       | false              | Retain hidden Indicator when unchecked and not mixed.                                                                                  |
| `identifier`                                               | string                        | generated          | Semantic root identifier; parent controls relationships use native element references to mounted child hosts across shadow boundaries. |
| `formOwner` / `form`                                       | form ID or HTMLFormElement    | nearest form       | External association.                                                                                                                  |
| `inputElementReference`                                    | callback or mutable reference | absent             | Native input ref; receives null on cleanup.                                                                                            |
| `partContracts`, `partPresentation`                        | records                       | empty              | Root/Indicator shared customization.                                                                                                   |

## Interaction, forms and methods

Pointer and Space propose `trigger-press`; Enter does not toggle. Read-only and disabled suppress interaction. Checked values serialize once; unchecked values serialize only when supplied. Disabled values and aggregate parents are omitted. Required validity requires checked true. Native reset restores the latest uncontrolled default with `form-reset`; controlled reset does not change or notify the owner.
Native HTML labels activate this same Boolean owner: use a wrapping label or a `for` matching the Checkbox host's `id`. Associated label text supplies a fallback accessible name, follows text updates, and clears when retargeted. Field and authored host names retain priority. Disabled and read-only label activation cannot change checked state.

`setChecked(boolean, reason?, sourceEvent?)` proposes a standalone change. `focus(options?)`, `blur()`, `activateFromLabel()`, `checkValidity()`, and `reportValidity()` are public methods. Read-only channels include `inputElement`, `controlElement`, `form`, `labels`, `validity`, `validationMessage`, `effectiveDisabled`, `effectiveName`, `effectiveInvalid`, and `checkboxDisabled`. Field uses shared `setFieldContext()` and `setFieldAssociation()`.

## Parts, content and state

Default slot content is the inline label; an empty Checkbox can receive its name from Field. `checkbox` is the semantic Root and `checkbox-indicator` the optional presentation Indicator. The internal native input is form anatomy and has its own reference channel. Root and Indicator share checked/mixed state; the Indicator uses shared Presence beginning/ending/retained markers and supports exit transitions. `keepMounted` keeps an unchecked Indicator hidden. Root markers expose checked, unchecked, indeterminate, disabled, read-only, required, invalid and focus-visible state. The parent host also reflects `parent`.

```ts
checkbox.checked = false;
checkbox.onCheckedChange = (event) => {
  checkbox.checked = event.detail.value;
};
```

## Native grouping host

Foundation grouping behavior is exported as `CheckboxGroupController`; it creates no additional catalog component or visual skin. Use an authored `fieldset`/legend or named native grouping host, with actual Checkbox children.

```ts
import { CheckboxGroupController } from '@tweakpad/ui';
const group = new CheckboxGroupController(fieldset, {
  defaultValue: ['read'],
  allValues: ['read', 'write'],
});
// fieldset contains <tp-checkbox parent>All</tp-checkbox> and valued Checkboxes.
group.onValueChange = (event) => {
  /* optional cancellation or observation */
};
// On framework teardown:
group.disconnect();
```

Options and writable properties are `value` (controlled string list), `defaultValue` (empty), `allValues`, `disabled` (false), and `onValueChange`. `setValue(list, reason?, event?)`, `reset(event?)`, `refresh()`, and `disconnect()` are public. `allValues` reports registered child values when omitted; parent aggregation is activated only by explicitly supplying it, as required by the Checkbox contract. Logical values may be unmounted. Mounted matching children submit individually; retained unmounted values do not submit. Children keep their form names and read-only/required flags. Parent `ariaControlsElements` references mounted matching child hosts. Native element references preserve the relationship across shadow boundaries; unresolved cross-shadow ID strings are not emitted.

Checking appends; unchecking removes. Parent activation selects or clears eligible logical children while preserving checked disabled children. Group changes are published once by the controller host; child callbacks can veto. Nested controller hosts isolate descendants. Later duplicate values are excluded with a diagnostic. Reset runs one group transaction. Disconnect clears member ownership, listeners and observations.

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

Field validation state `valid` is `true`, `false`, or `null` (unknown) in the shared immutable part snapshot. `data-valid` appears only for known-valid state; an independently authored invalid flag has priority. Unknown validity never creates a valid marker.
