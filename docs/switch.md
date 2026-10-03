# Switch

`tp-switch` represents an immediately applied binary setting. It shares its checked state, action transaction, native form participant and validation owner with Checkbox, while exposing switch semantics and an always-mounted Thumb.

```js
import '@tweakpad/ui/styles.css';
import '@tweakpad/ui/register';
import { TpSwitch } from '@tweakpad/ui';
```

```html
<tp-field orientation="horizontal" label="Notifications" description="Receive project updates.">
  <tp-switch name="notifications" default-checked></tp-switch>
</tp-field>
```

Use actual Field or Label for names and descriptions. Legacy text in the default slot remains a visible label through the actual library Label component; authored host `aria-label` and Field association can supply the name instead.
Native HTML labels also work: a wrapping label or `for` matching the Switch host's `id` activates the existing Boolean owner. Their text supplies a fallback name, updates when label text changes, and clears when the association changes. Field and authored host names retain priority.

| Property / attribute                 | Type                                         | Default / behavior                                                                                                                                              |
| ------------------------------------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checked`                            | optional Boolean property; Boolean attribute | Omitted chooses uncontrolled false. An authored value chooses a controlled lifetime.                                                                            |
| `defaultChecked` / `default-checked` | Boolean                                      | false; initial uncontrolled state and latest reset default.                                                                                                     |
| `onCheckedChange`                    | callback                                     | Receives the same cancelable `TpValueChangeEvent<boolean>` as `tp-value-change`.                                                                                |
| `size`                               | `sm` or `default`                            | default; one internal spacing value uses four theme units (three for small). Track width is twice that value, height 1.15 times it, and Thumb uses it directly. |
| `nativeAction` / `native-action`     | Boolean                                      | false; focusable span with switch role, or a native button with the same role when true.                                                                        |
| `name`                               | string                                       | empty; Field name context has priority without destroying the authored value.                                                                                   |
| `value`                              | serializable string                          | `on`, submitted when checked. This is the submitted payload; `checked` is the logical value.                                                                    |
| `uncheckedValue` / `unchecked-value` | optional string                              | omitted; unchecked Switch otherwise submits no entry.                                                                                                           |
| `disabled`                           | Boolean                                      | false; combines authored, Field and native fieldset/form-disabled lanes.                                                                                        |
| `readOnly` / `readonly`              | Boolean                                      | false; remains focusable and submitted but rejects user changes.                                                                                                |
| `required`                           | Boolean                                      | false; unchecked is value-missing and blocks native/Form submission.                                                                                            |
| `invalid`                            | Boolean                                      | false; combines authored, Field and native validity state.                                                                                                      |
| `identifier`                         | optional string                              | generated; identifies the actual semantic Control.                                                                                                              |
| `formOwner` / `form`                 | identifier or actual HTMLFormElement         | nearest form; explicit ownership can move submission to another form.                                                                                           |
| `inputElement`                       | readonly HTMLInputElement or null            | Actual hidden native checkbox reference.                                                                                                                        |
| `inputElementReference`              | callback or `{current}`                      | Native input mount/replacement/disconnect/reconnect channel.                                                                                                    |
| `motionPolicy` / `motion-policy`     | inherit, normal, reduce                      | inherit; uses the involved owner window and composed policy ancestry.                                                                                           |
| `partContracts`, `partPresentation`  | shared part contract / appearance maps       | empty; the two canonical parts can be customized independently.                                                                                                 |

An authored `checked` value freezes controlled mode; accepted proposals must be returned synchronously. The callback runs before the cancelable DOM event. A later DOM veto rolls back a synchronous owner return, so read the committed getter after the transaction when publishing outside state.

```js
switchControl.checked = false;
switchControl.onCheckedChange = (event) => {
  if (!event.defaultPrevented && !event.detail.cancelled) {
    switchControl.checked = event.detail.value;
  }
};
```

Press, Space and Enter activate once with reason `trigger-press`, carrying the actual source event and modifier properties. Repeats and native button defaults do not duplicate the toggle. `setChecked(value, reason = 'programmatic', sourceEvent?)` proposes an imperative change. `focus(options?)`, `blur()` and `activateFromLabel()` target the actual Control. Required `checkValidity()` and `reportValidity()` use the existing form owner. A canceled callback/DOM proposal preserves checked, native checked, ARIA and FormData together.
Read-only channels include `controlElement`, `form`, `labels`, `validity`, `validationMessage`, `effectiveDisabled`, `effectiveName`, `effectiveInvalid`, and inherited `direction`. The global `dir` attribute follows composed writing direction. Field uses the shared `setFieldContext()` and `setFieldAssociation()` interfaces.

Uncontrolled reset restores the latest declared default with `form-reset`; controlled reset keeps the owner value. Platform string restoration restores uncontrolled checked state. Native and explicit forms submit exactly one value; disabled controls submit none, readonly controls retain their entry. Field supplies Boolean dirty/filled/touched/focused state, descriptions, errors and change/blur/submit validation without a second validation implementation.

Switch has no indeterminate or CheckboxGroup aggregate state. Assigning a truthy inherited `indeterminate` compatibility property is rejected with a diagnostic and remains false. Checkbox-only `parent` and `keepMounted` do not affect Switch policy or submission. A Switch placed beside a CheckboxGroup keeps its independent name, value and checked owner.

| Part           | Default host / content                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| `switch`       | Semantic span or native button; role switch, checked state, action/focus/form binding and Thumb composition. |
| `switch-thumb` | Presentational span; always mounted through on/off changes, no input or focus.                               |

Both parts accept `renderDelegate({state, properties, content, bind})`, `hostProperties`, `classHook` string/resolver, `styleHook` record/resolver, `elementReference` callback/object and static/resolver `content`. Put `${bind}` on the correct semantic host. Root delegation retains switch role, focus, native-action semantics and required initiating handlers; Thumb delegation must remain presentational. State is an immutable committed snapshot including checked, disabled, readOnly, required, invalid, focusVisible, Field touched/dirty/filled/focused, size and direction. Thumb markers match Control markers. References clear on removal and reconnect/adopt with the involved owner document.

```js
import { html, nothing } from 'lit';
import { plusIcon } from '@tweakpad/ui/icons/plus';

switchControl.partContracts = {
  switch: {
    classHook: (state) => (state.checked ? 'setting-on' : 'setting-off'),
    hostProperties: { 'data-consumer-setting': 'notifications' },
  },
  'switch-thumb': {
    content: html`<tp-icon .icon=${plusIcon} size="100%"></tp-icon>`,
    elementReference: (element) => {
      /* mounted Thumb or null */
    },
  },
};
// Explicitly omit the optional Thumb independently of checked state:
switchControl.partContracts = { 'switch-thumb': { renderDelegate: () => nothing } };
```

Consumer handlers run before component handlers. `preventDefault()` controls platform defaults; `preventComponentHandling(event)` explicitly stops the initiating component action. Shared merge bookkeeping prevents stale held Space state after a canceled handler.

Nova paint uses existing primary/input/background/foreground/ring/destructive roles. Scoped `--tp-*` roles, dictionary replacement, `partPresentation` and independent part hooks customize paint. Mandatory Control hit geometry and two Thumb rest positions remain structural; container-relative translation adapts to actual Control and Thumb widths, including RTL. Thumb transitions only `transform`; track transitions only background color. Shared Motion `track` and `thumb` roles support driver replacement, rapid interruption, explicit normal/reduce and owner-window preference. Reduced motion reaches the final rest immediately. No presence exit delay applies to the always-mounted Thumb.

Field validation state `valid` is `true`, `false`, or `null` (unknown) in the shared immutable part snapshot. `data-valid` appears only for known-valid state; an independently authored invalid flag has priority. Unknown validity never creates a valid marker.
