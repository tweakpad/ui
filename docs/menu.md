# Menu

`tp-menu` presents commands, checks, radio choices and nested submenus. Trigger and context invocation use the same component. Use
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
| `invocation` | trigger / context | trigger | Choose ordinary trigger activation or context invocation. |
| `for` | string | empty | Context target ID; otherwise the trigger slot, then parent region. |
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

## Context invocation

Use `<tp-menu invocation="context">` with the same command tree shown above.
The trigger slot becomes a context target: ordinary clicks retain the target's
behavior and no button role or expanded state is added. An external target can
be associated with `for="target-id"`. The target must be keyboard-focusable when
keyboard invocation is required; Menu does not change its native semantics.

Secondary pointer invocation opens at the pointer. ContextMenu or Shift+F10
opens at the target's lower start corner and focuses the first enabled command.
A single-touch hold opens after 500 ms; movement beyond 10 coordinate units,
a second touch, release, or cancellation cancels the hold. Those thresholds
belong to the interaction policy, not theme spacing.

Opening uses the same cancelable `tp-open-change` proposal with reason
`trigger-press`. The native context action is prevented only after acceptance.
Another context invocation moves the anchor without closing and reopening.
Escape restores the invoking target only for keyboard opening when focus is in
the menu. Removing/replacing the target closes its anchored menu and cleans up
listeners. Detached handles and registered triggers apply only to trigger mode.

There is no separate `tp-context-menu` element or presentation namespace. Migrate
it to `tp-menu invocation="context"`; its commands, groups, shortcuts, separators,
checks, radio choices and any number of nested Menu levels remain unchanged.
Each nested Menu retains its own ordinary submenu trigger and chevron.

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
| RadioGroup `defaultValue / default-value`              | unknown property; string attribute | undefined; uncontrolled initial selection.                                                         |
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
commands. A child with `data-menu-label` is Label, `tp-key-hint data-menu-shortcut` is Shortcut,
and the existing `tp-separator` is Separator. Use `tp-icon` for icons; nested trigger icons use Button's `icon-start` slot. A nested `tp-menu` supplies the
SubTrigger/SubContent binding. Label text does not invent a keyboard shortcut.
Native `[value]`/menuitem-role children remain a compatibility adapter; prefer the
public constituents for controlled state and generic render contracts.

## Parts and state

Public parts: `menu`, `menu-trigger`, `menu-target`, `menu-content`, `menu-item`,
`menu-checkbox-item`, `menu-radio-group`, `menu-radio-item`, `menu-group`,
`menu-label`, `menu-sub-trigger`, `menu-sub-content`, `menu-separator`,
`menu-shortcut`. Item contracts live on the respective constituent; Root
partPresentation reaches the current target. Checkbox/Radio Indicator is the
constituent's hidden `indicator` contract. Item hooks include data-highlighted,
data-focus-visible, data-disabled, data-checked/data-unchecked and data-variant;
Indicators also publish presence markers. See the shared reference for delegate,
reference, theme and positioning hooks.

Popup menus derive their default anchor separation from three `--tp-spacing` units. Set `side-offset="0"` on the Menu (or participating Menu inside Menubar) for a flush popup, or supply a custom offset through the existing positioning API.

Menu, Menubar, Navigation Menu and selection lists share `--tp-space-2` popup padding on every edge. Menu item gaps use `--tp-space-3`; these defaults scale with the theme.

Menu popups are at least as wide as their anchor, within the available viewport width. Longer content can widen the popup through the existing intrinsic layout.

Pointer highlighting preserves the current scroll position. Keyboard navigation brings the active item into the nearest scroll container without scrolling outer documentation or application regions.
