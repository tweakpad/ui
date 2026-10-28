# Toolbar Foundation composition

`ToolbarController` coordinates one roving tab stop among real controls. It is a
Foundation export, with no `tp-toolbar` tag or separate visual recipe. ButtonGroup
continues to provide visual grouping and independent tab stops unless explicitly
composed into a Toolbar. Child controls retain their values, action handlers,
native editing, validation, form ownership, parts and presentation.

```ts
import { ToolbarController } from '@tweakpad/ui';
import '@tweakpad/ui/register';

// Existing markup:
// <div id="tools" aria-label="Document tools">
//   <tp-button id="save">Save</tp-button>
//   <tp-input id="find" label="Find in document"></tp-input>
//   <tp-button id="help" href="/help" variant="link">Help</tp-button>
// </div>
const root = document.getElementById('tools')!;
const save = document.getElementById('save')!;
const find = document.getElementById('find')!;
const help = document.getElementById('help')!;
await customElements.whenDefined('tp-button');
await customElements.whenDefined('tp-input');
const toolbar = new ToolbarController(root);
toolbar.registerItem(save, { kind: 'button' });
toolbar.registerItem(find, { kind: 'input' });
toolbar.registerItem(help, { kind: 'link' });
// Dispose when the owning composition disconnects; recreate on reconnection.
// toolbar.dispose();
```

The author provides a label and ordinary layout, using the shared spacing tokens.
Use actual Button, Toggle, Toggle group, Input/TextArea, Separator and ButtonGroup
controls. Native buttons, anchors and editable controls may also be registered for
interoperability. A custom action control uses its own native/non-native action policy;
Toolbar never replaces it or introduces another activation event.

Register a Toggle as a `button` item. A disabled Toggle stays a focusable stop that
keeps its pressed state and does not activate. A Toggle group inside a toolbar root
registers itself: its group part becomes a toolbar group and its Toggles join the
toolbar's arrow-key sequence, with no tab stop or arrow keys of the group's own. Its
selection mode and values are unchanged. Its disabled Toggles, and every Toggle of a
disabled group, stay focusable stops that do not activate. Do not register the group
or its Toggles yourself. A Toggle group inside a popup or dialog placed within the
toolbar stays independent.

| Root option            | Default      | Behavior                                                                                                                                                                   |
| ---------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orientation`          | `horizontal` | `horizontal` or `vertical`; controls arrows and exposed orientation                                                                                                        |
| `loopFocus`            | `true`       | Whether navigation wraps at boundaries                                                                                                                                     |
| `disabled`             | `false`      | Disables actions and editing while preserving focusable stops; links remain independent                                                                                    |
| `preserveFocusOnPress` | `false`      | A primary-button pointer press on a control or on the toolbar's own surface leaves focus and the text selection where they are; a pressed control still activates on click |

`new ToolbarController(root, options?)` binds one native semantic root. Its
read-only `host`, `orientation`, `loopFocus`, `disabled` and `preserveFocusOnPress`
accessors expose current configuration. `update(partialOptions)` updates it in place;
`refresh()` schedules membership/visibility synchronization. The controller watches
its root, the root's shadow tree and the shadow trees inside it. A control slotted in
from an outer tree is watched on its own element, so its own `hidden`, `inert` or
`disabled` change updates the order; after changing a wrapper element around such a
control, call `refresh()`. `dispose()` removes listeners, observer, registrations and
owned semantics. It preserves later authored changes. A disposed controller cannot be
reused; create a fresh controller when reconnecting its owner.

| Registration                           | Options and defaults                                                                                                                   | Semantics                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `registerItem(element, options)`       | Required `kind`: `button`, `link`, or `input`; `disabled=false`; `focusableWhenDisabled=true`; `preserveFocusOnPress` follows the root | Registers an actual library control host or native interactive element. Own disabled state remains authoritative. Links do not inherit Toolbar/Group disabled state. `preserveFocusOnPress` overrides the root option for this item: `false` suits a drag handle or another control whose own press must not be prevented. Input items are never held. |
| `registerGroup(element, options?)`     | `disabled=false`                                                                                                                       | Binds an authored native semantic group containing registered controls. Groups share the root's navigation sequence. For ButtonGroup, register its existing public `button-group` semantic part, without adding another role around it. A Toggle group registers itself.                                                                               |
| `registerSeparator(element, options?)` | Optional `orientation`, otherwise perpendicular to Root                                                                                | Uses actual Separator's orientation/decorative properties, or a native separator's role/ARIA. Explicit orientation stays independent of Root.                                                                                                                                                                                                          |

Each registration returns `{ update(partialOptions), dispose() }`. Dispose it when
its constituent is permanently removed. Temporary removal excludes an item from
navigation and releases its composed state; reinsertion restores participation.
Register all items with their root, including those within groups; the Toggles of a
Toggle group are the exception, because the group registers them. Do not register
one control with two Toolbar owners. Root and groups expose `data-disabled`; Root
also exposes `data-orientation` and toolbar orientation semantics. Each disabled
control exposes its own disabled semantics, without disabling descendant links
through an inherited group ARIA state. Separator and all controls retain their own
public presentation interfaces. Toolbar introduces no spacing, radius or color
attributes/tokens and no value-change event.

Arrow keys follow orientation and writing direction. Home/End reach the first/last
eligible item. Tab exits the composite. Disabled but focusable controls remain
navigation stops without accepting activation/editing; `focusableWhenDisabled=false`
skips them. Escape passes a disabled control unprevented, so an enclosing Dialog or
another dismissible layer can close; every other unmodified key except Tab is blocked
on it. Input arrows retain caret movement until its corresponding edge;
selection, modifiers, Home/End and composition remain editing operations. Native
numeric/date inputs retain their own arrow operations. TextArea vertical arrows
remain editing operations until the text boundary. Consumer `preventDefault()` or
`preventComponentHandling()` prevents Toolbar keyboard handling.

A Menu trigger registered as an item keeps ArrowDown and ArrowUp: they open its menu
with focus on its first or its last item. In a vertical toolbar these keys therefore
open the menu instead of moving to the next control, so place a Menu trigger last in
a vertical toolbar; Home and End still reach every control. A disabled Menu trigger
does not open, and the arrow keys move on.

With `preserveFocusOnPress`, pressing a control with the primary pointer button leaves
focus and the text selection on the editing target, such as an editor the toolbar acts
on. The control still activates on click and shows no focus indicator, and keyboard
activation is unchanged. A held press moves neither focus nor the tab stop. Input
items, secondary-button presses and presses made while focus is already inside the
toolbar move focus as usual. A press on the toolbar's own surface, such as the gap
between controls, a separator or a group, is held the same way and activates nothing.
Presses inside a popup or dialog within the toolbar, and presses on an unregistered
control that takes focus, keep their own behavior. The press is prevented before the
control's own handlers run, so a control that needs its press, such as a drag handle,
opts out with `preserveFocusOnPress: false` on its registration.

A focus change updates the single tab stop; hovering never moves focus.
Removing or fully disabling the focused item repairs focus to the nearest eligible
item without activating it. It does not steal focus back after the user has left.
When the focused item moves out of the root and keeps focus, as a `moveBefore()` move
does, focus stays on it and only the tab stop moves to the nearest eligible item.
Disabling an enrolled library Input excludes its form value while retaining its
authored `disabled` property for restoration.
For native controls, an explicit registration `disabled` option overrides the initially authored native disabled attribute while enrolled; update that option to change composed disabled state. Library control disabled properties remain authoritative. Native interoperability retains native form behavior (a readonly focusable native
input remains a successful form control); use the library Input for its integrated
form-disabled semantics.

## Contextual toolbar

`ContextualToolbarController` shows a toolbar from its owner's state, without a trigger, in a
non-modal surface anchored to an element or a virtual anchor, such as one over a text
selection. It hosts a `ToolbarController` (`controller.toolbar`) for the controls.

```js
import { ContextualToolbarController } from '@tweakpad/ui';
const contextual = new ContextualToolbarController(surface, {
  layer: 'top', // a manual popover in the top layer; 'inline' (default) keeps it in place
  placement: 'top-start',
  sequentialFocus: false,
  preserveFocusOnPress: true,
  finalFocus: () => {
    editor.focus();
    return false;
  },
});
contextual.toolbar.registerItem(boldButton, { kind: 'button' });
contextual.show(selectionAnchor); // never moves focus
contextual.reposition(); // after the anchor moved
contextual.hide();
```

`show(anchor)` positions the surface with flip and shift collisions and follows the anchor's
scrolling; `reposition()` and `setAnchor(anchor)` move it without a closed interval and mark
it `data-reanchored`, so no movement transition runs. A removed anchor hides it. `focus()`
moves focus to the first enabled control; bind it to the owner's key, such as Alt+F10. With
`finalFocus`, Escape inside the toolbar, and hiding it while it holds focus, return focus to
that target; with `sequentialFocus: false` the toolbar stays out of the Tab sequence and Tab or
Shift+Tab inside it return focus the same way. The focus model works without an anchor, for a
toolbar its owner positions. `dispose()` releases the positioning, the listeners and the
toolbar.

`ToolbarController` takes the same `sequentialFocus` option directly, and `focusFirst()`
focuses its first enabled item.
