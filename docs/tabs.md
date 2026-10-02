Tabs show one panel from a set of peers. Native tab buttons are the component's
same-tree ARIA anatomy; panel actions and content use library components.

```js
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
```

```html
<tp-tabs default-value="account" label="Settings">
  <button slot="tab" value="account">Account</button>
  <button slot="tab" value="password">Password</button>
  <span slot="indicator" aria-hidden="true"></span>
  <section slot="panel" value="account" keep-mounted>
    <tp-card>
      <span slot="header">Account</span>
      <tp-input label="Display name"></tp-input>
      <tp-button slot="footer">Save changes</tp-button>
    </tp-card>
  </section>
  <section slot="panel" value="password">Password preferences</section>
</tp-tabs>
```

### Root properties

| Property / attribute                                  | Type                                           | Default      | Behavior                                                                                                         |
| ----------------------------------------------------- | ---------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------- |
| `value` / `value`                                     | comparable value or `null`                     | omitted      | Supplying a value initially makes selection controlled. Attribute values are strings. `null` means no selection. |
| `defaultValue` / `default-value`                      | comparable value or `null`                     | numeric `0`  | Initial uncontrolled selection. If the implicit `0` is absent or disabled, the first enabled tab is selected.    |
| `onValueChange`                                       | `(event: TpValueChangeEvent<unknown>) => void` | unset        | Callback before the DOM change event; property only.                                                             |
| `variant`                                             | `enclosed` or `underline`                      | `enclosed`   | Presentation treatment.                                                                                          |
| `orientation`                                         | `horizontal` or `vertical`                     | `horizontal` | Layout, ARIA orientation and arrow axis.                                                                         |
| `activation`                                          | `manual` or `automatic`                        | `manual`     | Whether navigation focus also requests selection.                                                                |
| `activateOnFocus` / `activate-on-focus`               | boolean                                        | `false`      | Alias of automatic activation. Set one activation API.                                                           |
| `loopFocus` / `loop-focus`                            | boolean                                        | `true`       | Wrap arrow movement at the ends. Set the property to `false` to disable wrapping.                                |
| `label`                                               | string                                         | empty        | Accessible name for the tab list.                                                                                |
| `disabled`                                            | boolean                                        | `false`      | Disable user activation and remove the list's sequential tab stop.                                               |
| `renderBeforeActivation` / `render-before-activation` | boolean                                        | `false`      | Show the optional zero-size indicator before a measurable selection exists.                                      |

Do not supply both `value` and `defaultValue`, or change controlled mode after
initialization. Programmatic controlled assignments do not emit change proposals.
A controlled missing value selects nothing; the first enabled tab remains the
keyboard entry. Programmatic selection may select a disabled tab, but disabled
tabs are never the sequential tab stop or user-activated.

An explicit disabled `defaultValue` is honored initially. If a selected tab is
removed, renamed or subsequently disabled, uncontrolled selection falls forward
to the nearest enabled successor, then backward to a predecessor, then to `null`.
Structural repairs cannot be canceled. Later duplicate values are excluded and
emit a diagnostic.

### Constituents and composition

| Slot / constituent | Options                                                                                                   | Contract                                                                                                                                                                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tab`              | required `value`; `disabled` or `aria-disabled="true"`; `nativeAction` property / `native-action="false"` | One or more direct children with unique non-null values. Prefer native `<button>`; Tabs supplies `type="button"`, role, roving tabindex and selection relationships. `nativeAction` defaults to `true`; set it to `false` for non-native hosts needing Enter/Space activation. |
| `panel`            | required `value`; `keepMounted` property / `keep-mounted`                                                 | Every panel matches exactly one tab; a tab may have no panel. `keepMounted` defaults to `false`.                                                                                                                                                                               |
| `indicator`        | optional decorative element                                                                               | One measured selection indicator. Omit it to use each tab's selected recipe instead.                                                                                                                                                                                           |

Tab labels may include `tp-icon`, `tp-badge`, or other noninteractive content.
Do not nest interactive controls inside a tab. Use `tp-button`, `tp-input`,
`tp-card` and other library components inside panels. Nested Tabs own only their
direct members. `dir="rtl"` follows the surrounding direction and reverses
horizontal navigation; vertical navigation remains Up/Down.

Native `disabled` buttons cannot receive focus. Use `aria-disabled="true"` when
the disabled tab should remain discoverable through arrow navigation. Both forms
prevent activation. Disabled tabs never receive `tabindex="0"`.

Native button values are strings. For object or numeric member values, use a
non-native tab host with `native-action="false"` and assign its `.value` before
connection. Values use identity equality. After changing non-reactive member
properties such as `.value`, `.keepMounted`, `.disabled` or `.nativeAction`, call `refresh()`.
String attributes are observed automatically.

### Mounting and motion

An inactive default panel is detached after its exit motion, retaining the exact
authored node in component-owned storage. Activation restores it at its original
placeholder. Custom elements inside it receive disconnect/connect callbacks.
`keep-mounted` retains the panel in the DOM, hidden and inert. The public `panels`
getter includes retained and detached nodes. Keep application references to panels
that need updating while detached; a host `querySelector` cannot find them.
Remove a panel by calling `remove()` on that node, including while detached.
Disconnecting Tabs restores its authored children and releases observers and
owned attributes. Do not replace or move internal comment placeholders.

No panel animation is imposed. Author motion through the selected/starting/ending
state hooks; the shared presence owner waits for actual running animations and
transitions with a bounded fallback. Exiting panels are inert and hidden from
accessibility immediately. Reopening reverses an in-progress exit. Tabs is
non-dismissible and exposes no modal close/unmount methods.

### Methods and events

| API                              | Meaning                                                                                                                                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setValue(value): boolean`       | Request selection, with reason `programmatic`. Returns whether the proposal was accepted; a controlled owner must still assign `value`. Use this method for uncontrolled programmatic changes. |
| `refresh(): void`                | Reconcile non-reactive member properties and membership.                                                                                                                                       |
| `panels: readonly HTMLElement[]` | All registered panels, including detached panels.                                                                                                                                              |
| `tp-value-change`                | Bubbling, composed event. Cancel a user/programmatic proposal with `preventDefault()` or `detail.cancelled = true`.                                                                            |
| `tp-presence-complete`           | Panel lifecycle notification with `{ present: boolean }`. Listen on the panel itself because an absent panel is detached.                                                                      |
| `tp-diagnostic`                  | Invalid composition/mode diagnostic with code, message and severity.                                                                                                                           |

Change details include `value`, `previousValue`, `reason`, `sourceEvent`, optional
`trigger`, `cancelled`, `allowPropagation`, and `metadata.activationDirection`
(`left`, `right`, `up`, `down`, or `none`). Reasons are `pointer`, `keyboard`,
`programmatic`, `initial`, `missing`, and `disabled`. The last three describe
noncancelable structural repairs emitted after the commit. Equal selections are
no-ops. Filter bubbled events by `event.target` when panels contain other controls.

```js
const tabs = document.createElement('tp-tabs');
// Set before connecting the element to choose controlled ownership.
tabs.value = 'account';
tabs.onValueChange = (event) => {
  if (event.detail.value === 'password' && hasUnsavedChanges()) {
    event.preventDefault();
    return;
  }
  tabs.value = event.detail.value;
};
```

### Keyboard and accessibility

Tab enters the list at its roving entry; another Tab reaches the active panel and
its content. Left/Right navigate horizontal lists, Up/Down vertical lists, and
Home/End move to the ends. Wrong-axis and modified arrows do not change selection.
Manual activation requires Enter or Space. Automatic activation requests a change
when keyboard focus moves. `loopFocus=false` clamps movement. External selection
does not steal focus or replace the focused tab's roving entry while focus is in
the list. Tabs use `aria-selected`/`aria-controls`; panels use `aria-labelledby`
and are sequentially focusable only while selected. Author IDs are preserved.

### Presentation and state hooks

The dictionary keys and parts are `tabs`, `tabs-list`, `tabs-trigger`,
`tabs-indicator`, and `tabs-content`. Internal root/list parts accept `::part()`;
authored light-DOM constituents can be targeted with their `[part~="..."]`
selectors. Theme tokens and scoped dictionary replacement apply to all five
parts without changing selection or focus. Variant names are `enclosed` and
`underline`; no size axis is defined.

Root/list/constituents expose `data-orientation` and
`data-activation-direction`. Tabs expose `data-selected`, `data-active`, and
`data-disabled`; panels expose `data-index`, `data-selected`, `data-hidden`,
`data-starting-style` and `data-ending-style`. Indicator `data-active` means a
measurable selection exists. The root's `data-has-indicator` prevents a second
selected background or underline.

The list and indicator receive `--tp-active-tab-left`, `--tp-active-tab-right`,
`--tp-active-tab-top`, `--tp-active-tab-bottom`, `--tp-active-tab-width` and
`--tp-active-tab-height` in pixels. They are measured layout outputs for custom
indicator styling, refreshed for selection, member resize and list scrolling.
