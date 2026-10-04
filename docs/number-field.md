# NumberField Foundation composition

`NumberFieldController` adds numeric entry to an existing `tp-input`. It is a
Foundation capability, with no separate custom element or catalog entry. Compose
the existing Field, InputGroup, Button and Icon controls; their theme, parts,
spacing and rendering stay authoritative.

```html
<tp-field label="Quantity" name="quantity">
  <div id="quantity">
    <tp-input-group>
      <tp-input></tp-input>
      <tp-button slot="action" aria-label="Decrease quantity">−</tp-button>
      <tp-button slot="action" aria-label="Increase quantity">+</tp-button>
    </tp-input-group>
  </div>
</tp-field>
```

```ts
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
import { NumberFieldController } from '@tweakpad/ui';

const root = document.querySelector('#quantity')!;
const input = root.querySelector('tp-input')!;
await input.updateComplete;
const number = new NumberFieldController(root, input, {
  defaultValue: 1,
  minimum: 0,
  maximum: 100,
});
const [decrease, increase] = root.querySelectorAll('tp-button');
number.registerDecrement(decrease!);
number.registerIncrement(increase!);
// On permanent composition teardown:
// number.dispose();
```

Root must contain exactly one actual Input. Optional actions use actual Buttons.
Do not bind the same Input to another editing owner, or the same Button to another
composite focus owner. The composition must retain its registered elements under
Root; dispose their registrations before replacing them. Input remains the native
editing, ElementInternals, Field association and presentation owner.

## Root options

Pass options to the constructor or `update(partialOptions)`.

| Option                             | Type                                        | Default / behavior                                                                                       |
| ---------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `value`                            | `number \| null`                            | Omitted: uncontrolled; numeric or null at construction: controlled for that lifetime                     |
| `defaultValue`                     | `number \| null`                            | `null`; uncontrolled initial/reset value                                                                 |
| `onValueChange`                    | Numeric `TpValueChangeEvent` callback       | Cancellable proposal; synchronous `update({value})` accepts a controlled proposal                        |
| `onValueCommitted`                 | Numeric `TpValueCommitEvent` callback       | Reports a changed stored number at the gesture boundary                                                  |
| `minimum`, `maximum`               | finite number                               | No authored bound or ARIA bound; interactive arithmetic is limited to the safe-integer extent by default |
| `allowOutOfRange`                  | boolean                                     | `false`; direct entry can retain out-of-range numbers when true; stepping always clamps                  |
| `step`                             | positive finite number or `'any'`           | `1`; `'any'` removes step validity while ordinary stepping uses 1                                        |
| `smallStep`, `largeStep`           | positive finite number                      | `0.1`, `10`; Alt and Shift modifiers respectively                                                        |
| `snapOnStep`                       | boolean                                     | `false`; snaps around minimum, otherwise zero                                                            |
| `locale`                           | locale string or string array               | Closest owner language, document language, then owner-window locale                                      |
| `format`                           | `Intl.NumberFormatOptions`                  | Locale defaults; explicit rounding options normalize stored numbers                                      |
| `allowWheelScrub`                  | boolean                                     | `false`; requires both native input focus and pointer hover                                              |
| `disabled`, `readOnly`, `required` | boolean                                     | `false`; combine with Input and Field/native form context                                                |
| `name`                             | string                                      | Input/Field's existing name; supplied value uses Input's public name channel                             |
| `formOwner`                        | form ID, `HTMLFormElement`, or null         | Input's existing native association                                                                      |
| `identifier`                       | string                                      | Generated native editor ID                                                                               |
| `inputElement`                     | existing `ElementReference` callback/object | Input's existing native-element reference channel                                                        |
| `roleDescription`                  | string                                      | `Number field`                                                                                           |

`number.value` is the stored `number | null`; `number.text` is its editable
representation. `setValue(numberOrNull)` proposes a programmatic value and returns
whether the stored number changed. Keep the initial controlled/uncontrolled mode;
use `setValue` for uncontrolled programmatic proposals. A controlled consumer must
publish through `update({value})`. `disabled` and `readOnly` getters include context.
Invalid configuration throws before replacing the current options.

While bound, use the controller's numeric callback. Input retains its text-facing
selection, focus, `select`, `setSelectionRange`, `setRangeText`, `setValue` and
`clear` APIs; editing through them delegates to the numeric owner. Input's ordinary
string callback is dormant. `input.fieldValue` and Field's `value` expose the
number, while `input.value` exposes editable text. Disposal restores standalone
Input behavior and its prior string state.

## Optional constituents

- `registerIncrement(button)` and `registerDecrement(button)` return independent
  `{dispose()}` registrations. Both preserve Button's existing `nativeAction`
  property (default true), accessible-label and public part APIs. They are outside
  the Tab order; the editor provides keyboard stepping. Own disabled, read-only,
  root disabled and the reachable bound prevent activation. Pointer activation
  focuses the editor; holds repeat and commit at release.
- `registerGroup(element)` registers one native semantic group, including an
  existing InputGroup's public `input-group` part after it renders. It mirrors
  state and restores authored attributes when disposed. InputGroup already owns
  its group semantics; registration is optional.
- `registerScrubArea(element, options)` registers one authored, unstyled drag
  region. Options: `direction: 'horizontal' | 'vertical'` (horizontal),
  `pixelSensitivity` (positive finite number, 2), and `teleportDistance` (optional
  nonnegative finite number). These describe pointer geometry, not theme spacing.
  Its registration has `update(options)`, `dispose()`, and
  `registerCursor(element, {retain?: boolean})`.
- Cursor must initially be a direct child of ScrubArea. Use an actual Icon for
  icon content. The shared portal preserves that node and inherited theme tokens;
  it mounts only during dragging unless `retain: true`. Cursor registration
  returns `{dispose()}`. Disposal restores its authored position and attributes.

Scrubbing captures the pointer, converts accumulated movement divided by
sensitivity into step units, and commits on release. Vertical upward movement
increases. Teleport distance bounds the virtual cursor around the area; otherwise
the owner viewport bounds it. Cancellation, removal, disabled/read-only changes
and disposal release capture and transient portal/timer/listener work. There is
no duplicate numeric state or independently painted drag control.

## Editing, events and forms

Locale digits, decimal/group separators, sign and configured format decorations
are recognized. Incomplete text such as `-` or `1.` stays editable. Invalid blur
restores the stored number. No-edit blur preserves numeric precision even when
the display formatter rounds it. Explicit formatting precision can normalize it.
ArrowUp/Down step; Alt uses smallStep, Shift uses largeStep; Home/End select
authored minimum/maximum. Wheel preserves horizontal and pinch/zoom gestures.

Numeric `tp-value-change` proposals bubble from the actual Input through Root.
They use the existing cancellation protocol and reasons `input`, `input-clear`,
`input-paste`, `input-blur`, `keyboard`, `increment`, `decrement`, `wheel`, `scrub`,
`programmatic`, plus shared native `form-reset`. The callback runs before the
bubbling event. Synchronous owner writes inside a canceled proposal do not publish.
`tp-value-commit` fires on changed stored values: blur, step release, scrub release,
or immediately for keyboard/wheel. Unchanged or canceled steps do not commit.

Input's existing form participant submits a canonical numeric string, independent
of localized display, and the empty string for null. Disabled values are omitted;
read-only values remain successful. Required empty, bad input, range and step
validity use ElementInternals; custom validity remains supported. Native reset
restores uncontrolled defaults, and state restore reads the canonical number.
Field validation sees the number rather than formatted text.

Root and registered Group expose `data-disabled`, `data-readonly`, `data-required`,
`data-valid`, `data-invalid`, `data-dirty`, `data-touched`, `data-filled`,
`data-focused`, and `data-scrubbing`. Existing controls retain their own markers and
parts. No component-specific spacing tokens or appearance attributes are added.

Verification record: `plans/components/library-completion/number-field/implementation-checklist.md`.
That record distinguishes real Chrome interactions from unsupported wheel, held
pointer, touch and IME evidence; implementation availability is not a claim that
every native input path has been verified.
