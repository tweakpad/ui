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
Use actual Button, Input/TextArea, Separator and ButtonGroup controls. Native
buttons, anchors and editable controls may also be registered for interoperability.
A custom action control uses its own native/non-native action policy; Toolbar never
replaces it or introduces another activation event.

| Root option   | Default      | Behavior                                                                                |
| ------------- | ------------ | --------------------------------------------------------------------------------------- |
| `orientation` | `horizontal` | `horizontal` or `vertical`; controls arrows and exposed orientation                     |
| `loopFocus`   | `true`       | Whether navigation wraps at boundaries                                                  |
| `disabled`    | `false`      | Disables actions and editing while preserving focusable stops; links remain independent |

`new ToolbarController(root, options?)` binds one native semantic root. Its
read-only `host`, `orientation`, `loopFocus` and `disabled` accessors expose current
configuration. `update(partialOptions)` updates it in place; `refresh()` schedules
membership/visibility synchronization. `dispose()` removes listeners, observer,
registrations and owned semantics. It preserves later authored changes. A disposed
controller cannot be reused; create a fresh controller when reconnecting its owner.

| Registration                           | Options and defaults                                                                          | Semantics                                                                                                                                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registerItem(element, options)`       | Required `kind`: `button`, `link`, or `input`; `disabled=false`; `focusableWhenDisabled=true` | Registers an actual library control host or native interactive element. Own disabled state remains authoritative. Links do not inherit Toolbar/Group disabled state.                                                                    |
| `registerGroup(element, options?)`     | `disabled=false`                                                                              | Binds an authored native semantic group containing registered controls. Groups share the root's navigation sequence. For ButtonGroup, register its existing public `button-group` semantic part, without adding another role around it. |
| `registerSeparator(element, options?)` | Optional `orientation`, otherwise perpendicular to Root                                       | Uses actual Separator's orientation/decorative properties, or a native separator's role/ARIA. Explicit orientation stays independent of Root.                                                                                           |

Each registration returns `{ update(partialOptions), dispose() }`. Dispose it when
its constituent is permanently removed. Temporary removal excludes an item from
navigation and releases its composed state; reinsertion restores participation.
Register all items with their root, including those within groups. Do not register
one control with two Toolbar owners. Root and groups expose `data-disabled`; Root
also exposes `data-orientation` and toolbar orientation semantics. Each disabled
control exposes its own disabled semantics, without disabling descendant links
through an inherited group ARIA state. Separator and all controls retain their own
public presentation interfaces. Toolbar introduces no spacing, radius or color
attributes/tokens and no value-change event.

Arrow keys follow orientation and writing direction. Home/End reach the first/last
eligible item. Tab exits the composite. Disabled but focusable controls remain
navigation stops without accepting activation/editing; `focusableWhenDisabled=false`
skips them. Input arrows retain caret movement until its corresponding edge;
selection, modifiers, Home/End and composition remain editing operations. Native
numeric/date inputs retain their own arrow operations. TextArea vertical arrows
remain editing operations until the text boundary. Consumer `preventDefault()` or
`preventComponentHandling()` prevents Toolbar keyboard handling.

A pointer or focus change updates the single tab stop; hovering never moves focus.
Removing or fully disabling the focused item repairs focus to the nearest eligible
item without activating it. It does not steal focus back after the user has left.
Existing Button disabled guards and TextControl's native editing/form controller
consume the same composition state. Disabling an enrolled library Input excludes
its form value while retaining its authored `disabled` property for restoration.
For native controls, an explicit registration `disabled` option overrides the initially authored native disabled attribute while enrolled; update that option to change composed disabled state. Library control disabled properties remain authoritative. Native interoperability retains native form behavior (a readonly focusable native
input remains a successful form control); use the library Input for its integrated
form-disabled semantics.
