# Menu

`tp-menu` presents commands, checks, radio choices and nested submenus. Use
Navigation Menu for real site navigation. Use the actual Menu constituents for
stateful command semantics; native anchors remain valid link interoperability.

```html
<script type="module">
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/styles.css';
</script>
<tp-menu label="Document actions">
  <tp-button slot="trigger" variant="outline">Document actions</tp-button>
  <tp-menu-item value="new">New document</tp-menu-item>
  <tp-menu-checkbox-item default-checked>Word wrap</tp-menu-checkbox-item>
  <tp-menu-radio-group aria-label="Density">
    <tp-menu-radio-item value="compact">Compact</tp-menu-radio-item>
    <tp-menu-radio-item value="comfortable">Comfortable</tp-menu-radio-item>
  </tp-menu-radio-group>
  <tp-separator></tp-separator>
  <tp-menu label="Share document">
    <tp-button slot="trigger" variant="ghost">Share</tp-button>
    <tp-menu-item value="email">Email</tp-menu-item>
    <tp-menu-item value="link">Copy link</tp-menu-item>
  </tp-menu>
</tp-menu>
```

## Root

The complete [anchored surface API](anchored-surfaces.md) defines open/default
ownership, events, focus, handles, payloads, positioning, portal, Arrow, Backdrop,
Viewport, methods and customization. Menu's defaults and additional properties are:

| Property / attribute                                 | Type                  | Default            | Meaning                                                                                    |
| ---------------------------------------------------- | --------------------- | ------------------ | ------------------------------------------------------------------------------------------ |
| `value`                                              | string                | empty              | Standalone legacy last-command value; inside Menubar this is the Menu's stable identifier. |
| `itemVariant / item-variant`                         | ghost / destructive   | ghost              | Default visual treatment for Items without their own variant.                              |
| `orientation`                                        | horizontal / vertical | vertical           | Direction of list navigation.                                                              |
| `loopFocus / loop-focus`                             | boolean               | true               | Wrap enabled command navigation.                                                           |
| `highlightItemOnHover / highlight-item-on-hover`     | boolean               | true               | Highlight enabled commands on pointer movement.                                            |
| `modal`                                              | boolean               | true               | Root owns outside inertness and scroll lock; nested menus participate in its branch.       |
| `closeParentOnEscape / close-parent-on-escape`       | boolean               | false              | Also close parent on Escape; closeParentOnEsc is the legacy property alias.                |
| `openOnHover / open-on-hover`                        | boolean               | false; nested true | Enable hover opening.                                                                      |
| `openDelay / open-delay`, `closeDelay / close-delay` | number                | 100, 0             | Hover timing.                                                                              |

Trigger Enter/Space or pointer press opens. ArrowDown/ArrowUp opens at the first/
last enabled item. Inside, arrows, Home/End and locale-aware typeahead navigate;
Enter/Space activates. Repeated-character cycling follows the shared Typeahead
contract. Inline-forward opens a submenu; inline-backward returns to its parent.
Escape closes the top applicable branch; Tab closes and continues outside rather
than trapping command focus. Disabled entries are excluded. Pointer highlighting
never selects a check or radio by itself.

## Command constituents

| Element / property                     | Type                            | Default / behavior                                                                                 |
| -------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `tp-menu-item`                         | command                         | Generic Item.                                                                                      |
| `value`                                | unknown; string attribute       | undefined; command payload, not selection state.                                                   |
| `label`                                | string                          | empty; accessible/typeahead override for rich content.                                             |
| `disabled`                             | boolean                         | false; also respects nearest Menu disabled state.                                                  |
| `variant`                              | ghost / destructive / undefined | inherit Root itemVariant.                                                                          |
| `nativeAction / native-action`         | boolean                         | false; default semantic div uses the shared synthetic press owner. True uses a native button.      |
| `closeOnClick / close-on-click`        | boolean                         | true for Item; false for checks/radios and native links.                                           |
| `onClick`                              | `(event: Event) => void`        | Consumer activation hook before component handling.                                                |
| `activate(event)`                      | method                          | Propose activation through the owning Menu; no effect when unregistered/disabled/closed.           |
| `focus(options?)`, `click()`           | methods                         | Forward to the current actual semantic host.                                                       |
| `controlElement`                       | HTMLElement or null             | Current semantic Item host.                                                                        |
| `highlighted`                          | read-only boolean               | Committed collection highlight.                                                                    |
| `tp-menu-checkbox-item.checked`        | optional boolean                | Controlled checked state.                                                                          |
| `defaultChecked / default-checked`     | boolean                         | false for uncontrolled initialization.                                                             |
| `onCheckedChange`                      | Boolean value event callback    | Same cancelable proposal as tp-value-change.                                                       |
| Checkbox `keepMounted / keep-mounted`  | boolean                         | false; retain the inactive Indicator only.                                                         |
| `tp-menu-radio-group.value`            | unknown                         | Optional controlled selection; values use Object.is identity.                                      |
| RadioGroup `defaultValue`              | unknown property                | undefined; uncontrolled initial selection.                                                         |
| RadioGroup `disabled`, `onValueChange` | boolean, value event callback   | false; group proposal callback.                                                                    |
| `tp-menu-radio-item.value`             | unknown; string attribute       | Required, unique in nearest RadioGroup. Missing/later duplicate values are diagnosed and excluded. |
| RadioItem `checked`                    | read-only boolean               | Derived from RadioGroup; activating the selected choice does not clear it.                         |
| RadioItem `keepMounted / keep-mounted` | boolean                         | false; retain its inactive Indicator.                                                              |

Checkbox and RadioGroup controlled owners accept `event.detail.value`
synchronously. Details include previousValue/reason/sourceEvent/cancelled;
`preventDefault()` or `detail.cancelled = true` vetoes. `tp-action` is a separate
cancelable Menu event with `{value, item, sourceEvent}` emitted before selection
commit. Canceling it prevents the command and close. Indicator presence is
independent from Item mounting. No checkbox/radio here is a standalone form field.

`slot="trigger"` uses a real Button or native action host; default content holds
the command tree. Native `role="group"` plus an authored accessible name groups
commands. A child with `data-menu-label` is Label, `data-menu-shortcut` is Shortcut,
and the existing `tp-separator` is Separator. A nested `tp-menu` supplies the
SubTrigger/SubContent binding. Label text does not invent a keyboard shortcut.
Native `[value]`/menuitem-role children remain a compatibility adapter; prefer the
public constituents for controlled state and generic render contracts.

## Parts and state

Public parts: `menu`, `menu-trigger`, `menu-content`, `menu-item`,
`menu-checkbox-item`, `menu-radio-group`, `menu-radio-item`, `menu-group`,
`menu-label`, `menu-sub-trigger`, `menu-sub-content`, `menu-separator`,
`menu-shortcut`. Item contracts live on the respective constituent; Root
partPresentation reaches the current target. Checkbox/Radio Indicator is the
constituent's hidden `indicator` contract. Item hooks include data-highlighted,
data-focus-visible, data-disabled, data-checked/data-unchecked and data-variant;
Indicators also publish presence markers. See the shared reference for delegate,
reference, theme and positioning hooks.

Popup menus use an 8px side offset by default to separate the surface from its anchor. Set `side-offset="0"` on the Menu/Context Menu (or participating Menu inside Menubar) for a flush popup, or supply a custom offset through the existing positioning API.
