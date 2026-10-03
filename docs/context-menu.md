# Context menu

`tp-context-menu` uses the same command, checkbox, radio and nested Menu owners
as [Menu](menu.md), with a context-invocation target instead of an ordinary
press-to-open Trigger.

```html
<script type="module">
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/styles.css';
</script>
<tp-context-menu label="Document context actions">
  <tp-button slot="trigger" variant="outline">Right-click or press Shift+F10</tp-button>
  <tp-menu-item value="inspect">Inspect</tp-menu-item>
  <tp-menu-checkbox-item>Pin</tp-menu-checkbox-item>
  <tp-separator></tp-separator>
  <tp-menu-item value="delete" variant="destructive">Delete</tp-menu-item>
</tp-context-menu>
```

`for` is an optional target ID. Without it, the slotted trigger is the target,
then the parent element. The target retains its original Button/link/native
semantics; Context Menu does not turn it into a menu trigger or change its name.
Right-click opens at the pointer; ContextMenu/Shift+F10 opens from the target.
Touch holds for 500ms at a 10-by-10 virtual anchor. Movement beyond 10px on either
axis, a second pointer, release, cancellation, disable or disconnect cancels a
pending hold. The native context menu is prevented only after acceptance.
Repeated invocation while already open updates the anchor without a close/reopen.
Keyboard opening restores target focus only when focus moved into menu content.

The [Menu constituent APIs](menu.md#command-constituents), Root itemVariant,
orientation, loopFocus, highlightItemOnHover, disabled, value compatibility,
closeParentOnEscape, open/defaultOpen callbacks and command cancellation apply.
The [shared positioning, portal, presence and part APIs](anchored-surfaces.md)
also apply. Context Menu is modal by its owning policy; it has no independent
public modal toggle, detached handle/trigger association or hover-open policy.
Inherited implementation helpers do not add those unsupported policies.

The default slot holds commands. The public parts are `context-menu`,
`context-menu-target`, `context-menu-content`, `context-menu-item`,
`context-menu-checkbox-item`, `context-menu-radio-item`, `context-menu-radio-group`,
`context-menu-group`, `context-menu-label`, `context-menu-sub-trigger`,
`context-menu-sub-content`, `context-menu-separator`, `context-menu-shortcut`.
The same TpMenuItem/Checkbox/Radio constituents automatically resolve the
Context Menu family of presentation keys from their nearest actual owner.
Configure constituent partContracts on those constituent instances. Target
customization uses its actual Button/native owner; Root partPresentation projects
Context target presentation to that target.

Popup menus derive their default anchor separation from three theme spacing units. Set `side-offset="0"` on the Menu/Context Menu (or participating Menu inside Menubar) for a flush popup, or supply a custom offset through the existing positioning API.
