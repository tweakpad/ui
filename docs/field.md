# Field

`tp-field` owns one logical value's visible name, descriptions, errors, validation and state. Input and Text Area reuse the Field control owner; compatible selection and composite controls register through the same context and association channels.

```ts
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
```

```html
<tp-field label="Email" description="Used for receipts">
  <tp-input name="email" type="email" required></tp-input>
</tp-field>
```

## Root properties

| Property / attribute                               | Type                                             | Default                           | Meaning                                                                                                                               |
| -------------------------------------------------- | ------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `label`, `description`, `error`, `title`, `legend` | text                                             | empty                             | Text fallbacks for independently authored parts. Slots take precedence.                                                               |
| `errors`                                           | ordered strings or `{ message }` records         | `[]`                              | Errors are deduplicated in order and rendered as a list when multiple remain.                                                         |
| `orientation`                                      | vertical, horizontal, responsive                 | vertical                          | Responsive changes follow the Field's container extent.                                                                               |
| `legendScale` / `legend-scale`                     | section, field                                   | section                           | Legend type scale.                                                                                                                    |
| `name`                                             | text                                             | registered control name           | Field name takes precedence while preserving authored control name.                                                                   |
| `disabled`, `invalid`                              | Boolean                                          | false                             | Context disability and explicit invalidity; neither replaces authored control state. Explicit false clears only its own invalid lane. |
| `dirty`, `touched`                                 | optional Boolean                                 | derived                           | Overrides corresponding observable state when supplied.                                                                               |
| `validator`                                        | `(value, formValues) => error or Promise<error>` | absent                            | Lit binding for Foundation's custom validator; `validate()` remains the imperative action.                                            |
| `validationMode` / `validation-mode`               | on-submit, on-blur, on-change                    | nearest Form, otherwise on-submit | Validation trigger policy.                                                                                                            |
| `validationDebounce` / `validation-debounce`       | nonnegative milliseconds                         | 0                                 | Applies only to change validation.                                                                                                    |
| `nativeLabel` / `native-label`                     | Boolean                                          | true                              | Enables label activation forwarding; false keeps naming while avoiding double activation of popup triggers.                           |
| `errorMatch`                                       | Boolean or validity key                          | aggregate invalid                 | False suppresses errors; true forces authored messages; a key matches that validity flag.                                             |
| `validityContent`                                  | `(state: FieldValidity) => Lit content`          | absent                            | Elementless validity renderer.                                                                                                        |
| `partContracts`, `partPresentation`                | records                                          | `{}`                              | Common part and presentation contracts.                                                                                               |
| `motionPolicy` / `motion-policy`                   | inherit, normal, reduce                          | inherit                           | Shared motion preference.                                                                                                             |

## Constituents, slots and parts

The default/control slot contains the registered control, including through a native layout wrapper. Nested Fields isolate their controls. Field's native input participant remains optional when another compatible component owns the value.

| Slot                | Published part           | Constituent options                                                                                                                                      |
| ------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `legend`            | `field-legend`           | Optional group caption; legendScale chooses section/field presentation.                                                                                  |
| `group`             | `field-field-group`      | Peer Field layout.                                                                                                                                       |
| `label`             | `field-label`            | Rich name content; native-label=false suppresses forwarding.                                                                                             |
| `title`             | `field-title`            | Grouped choice name.                                                                                                                                     |
| default / `control` | `field-control-region`   | Compatible value participant; retain its own public API.                                                                                                 |
| `description`       | `field-description`      | Mounted descriptions contribute in document order.                                                                                                       |
| `error`             | `field-error`            | Conditional error content, independent of fallback strings.                                                                                              |
| `item`              | logical Field Item scope | An item wrapper's disabled state scopes its nested member.                                                                                               |
| `separator`         | `field-separator`        | Optional centered caption over a library Separator line. Rich slot content or the part contract `content` supplies the caption; hooks style the wrapper. |

The root also publishes `field` and `field-field`. Labels and separators reuse the library Label and Separator. Other wrappers are ordinary layout and descriptive content. Descriptions and error relationships are projected into a native control's own shadow root; ID references do not point across an inaccessible root.

## Validation and observation

`validate()` and `actions.validate()` return a `ValidationRun`: generation, pending/valid/invalid/failed/cancelled status, ordered fieldResults and completion. `validationRun` retains the newest run. `control`, `value`, `effectiveName`, `mode` and `validityState` are read-only channels.

`validityState` contains value, immutable initialValue, ordered errors/error, full native validity flags and aggregate valid, dirty, touched, filled, focused and pending. New validation supersedes earlier runs; stale results and disconnected Fields cannot publish. No registered control leaves value-dependent validation pending and diagnoses the absence.

Custom validation receives the current value and all named Fields in the same form. Duplicate names preserve ordered values, including nested list values; unnamed Fields are omitted. Explicit/server errors, custom validation and native constraints remain distinct lanes. Rejected or malformed validation fails the run. Change debounce is canceled on value replacement, control replacement and disconnection.

Submission touches fields and prevents synchronous invalid submission. Async validation does not retroactively cancel native submission; cancel the submit event explicitly when awaiting async outcomes is required. Failed on-submit validation revalidates later edits. Reset compares current values with the original registration snapshot rather than replacing it.

`tp-validation` bubbles and is composed with `{ run, state }` after current validation settles. Error uses shared Presence starting/ending markers and emits `tp-presence-complete` with `{ present }`. Tree, keyboard and automated accessibility checks are separate from assistive-technology testing.

## Customization

Every published part supports `partContracts[part]`: renderDelegate, hostProperties, classHook, styleHook, elementReference and content. Delegates apply their supplied bind directive to retain shared semantics and initiating events. Consumer handlers may call preventComponentHandling() independently from native preventDefault(). Part contracts do not replace value/validation ownership.

Use semantic tokens, presentation dictionary replacement, `partPresentation` or public `::part()` boundaries. Disabled/valid/invalid/dirty/touched/filled/focused/pending markers propagate across applicable parts and compatible controls. Canonical Docs contains one working base example; exhaustive validation and layout fixtures stay outside Docs.
