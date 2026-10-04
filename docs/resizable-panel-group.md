# Resizable panel group

One group owns the layout of its direct panels and interactive handles. All pointer, keyboard and imperative changes use the same constraint solver and atomic size proposal. The resize handle is independent of the decorative `tp-separator` component.

```html
<tp-resizable-panel-group style="height:18rem">
  <tp-resizable-panel id="sidebar" default-size="25%" min-size="15%" collapsible>Sidebar</tp-resizable-panel>
  <tp-resizable-handle label="Resize sidebar" with-handle></tp-resizable-handle>
  <tp-resizable-panel id="content" min-size="30%">Content</tp-resizable-panel>
</tp-resizable-panel-group>
```

Panels and handles must be direct children in logical order. Nest another group inside a panel for a second axis. For compatibility, ordinary direct-child elements also serve as panels; omitted handles are generated between adjacent panels and use the same implementation. Stable authored panel IDs are required when saving a layout across page loads. Missing IDs are generated for the current document lifetime.

## Group

| Property / attribute | Type | Default | Meaning |
| --- | --- | --- | --- |
| `orientation` | `horizontal` / `vertical` | horizontal | Layout and keyboard axis. Horizontal operation honors direction. |
| `sizes` | readonly array of extents | uncontrolled | Controlled sizes in current panel order. Assign before first connection. Numbers mean pixels; strings without units mean percentages. |
| `defaultSizes` | readonly array of extents | undefined | Initial uncontrolled sizes in panel order. |
| `defaultLayout` | record of panel ID to percentage number | undefined | Identity-based initial uncontrolled layout. |
| `disabled` | boolean | false | Disables all resize commands and cancels active pointer capture. |
| `keyboardStep` / `keyboard-step` | positive finite number | 1 | Arrow movement in native length units. Invalid values use 1. |
| `resizeTargetMinimumSize` | `{fine, coarse}` | `{fine:10, coarse:20}` | Functional pointer target minimums; independent of the thin visual separator. |
| `disableCursor` / `disable-cursor` | boolean | false | Prevents installing a document-wide drag cursor. |
| `disableDoubleClickReset` / `disable-double-click-reset` | boolean | false | Disables double-click restoration of the associated panel default. |
| `withHandle` / `with-handle` | boolean | false | Decoration on generated handles. Authored handles configure this independently. |
| `persistenceKey` / `persistence-key` | string | empty | Key passed to the injected persistence adapter. |
| `persistenceAdapter` | `{load(key), save(key, layout)}` | undefined | Sync or async consumer storage. No built-in localStorage policy. Restore precedes the first uncontrolled commit; controlled sizes are never restored or saved. |
| `min` | number | undefined | Legacy group-wide minimum percentage, used only when a panel has no explicit minimum. |

`getLayout()` returns a record of panel IDs to current percentages. `setLayout(record)` proposes an identity-based percentage layout and returns the actual committed layout. Invalid/missing entries fall back to current values. Bounds and disabled sizes are normalized before publication. Infeasible bounds preserve valid panel sizes and expose overflow or unused space instead of violating constraints.

`onSizesChange(event)` and `tp-value-change` expose the shared cancelable proposal protocol. `detail.value` and `previousValue` contain ordered pixel sizes; `reason`, `sourceEvent`, and cancellation follow the common library contract. A controlled owner must synchronously publish the accepted `sizes`. A veto or absence of acknowledgment retains the entire previous layout.

`onLayoutChange(layout)` / `tp-layout-change` run after each committed layout. `onLayoutChanged(layout)` / `tp-layout-changed` run once when a resize interaction settles, with the final committed layout. Event details contain `{layout, sizes}`. Save persistent state from the settled callback; the injected adapter does this automatically for uncontrolled groups. `tp-diagnostic` reports `{code, message}` for infeasible bounds, invalid composition, missing relative preservation, or persistence failures.

## Panel

| Property / attribute | Type | Default |
| --- | --- | --- |
| `defaultSize` / `default-size` | extent | auto-assigned from remaining space |
| `minSize` / `min-size` | extent | 0 |
| `maxSize` / `max-size` | extent | 100% |
| `collapsible` | boolean | false |
| `collapsedSize` / `collapsed-size` | extent | 0 |
| `disabled` | boolean | false |
| `resizeBehavior` / `resize-behavior` | `relative` / `preserve-pixel-size` | relative |

Extents accept a number (pixels) or a string in `%`, `px`, `em`, `rem`, `vh`, or `vw`; a unitless string means percent. At least one panel must preserve relative size. A disabled panel retains its pixel size even during an indirect resize. A collapsed size is the declared exception to an ordinary minimum and is normalized between zero and that minimum.

Methods: `collapse()`, `expand()`, `resize(extent)`, `getSize()` → `{inPixels, asPercentage}`, and `isCollapsed()`. Expansion restores the most recent valid expanded size, then the default or minimum. `onResize(size, id, previousSize)` and `tp-panel-resize` report actual committed changes; event details are `{size, previousSize, id}`.

## Handle

| Property / attribute | Type | Default |
| --- | --- | --- |
| `label` | string | Resize panels |
| `target` | adjacent panel ID | preceding panel |
| `withHandle` / `with-handle` | boolean | false |
| `disabled` | boolean | false |
| `disableDoubleClickReset` / `disable-double-click-reset` | boolean | false |

The target selects the panel described by accessible values, keyboard commands and reset. Pointer dragging follows the physical boundary. An enabled handle is a focusable separator with native orientation, values and a relationship to the controlled panel. Its separator orientation is perpendicular to the group axis. `separatorElement` exposes the focusable element.

Axis arrows adjust by `keyboardStep`; Home/End reach allowed extremes; Enter toggles a collapsible target. F6 and Shift+F6 cycle enabled handles. Double-click restores the target's declared default size when available. Pointer capture, temporary text-selection prevention and the drag cursor are released on completion, cancellation, disabling or removal.

## Presentation

Group, Panel and Handle expose their own standard `partContracts` and `partPresentation`. Canonical parts are `resizable-panel-group`, `resizable-panel-group-panel`, `resizable-panel-group-separator`, and `resizable-panel-group-handle-decoration`. Generated handles consume the group’s `withHandle`; authored constituents retain independent customization. Native legacy panels are registered with the group’s panel presentation part.

The group exposes `data-infeasible`; panels expose `data-collapsed`; handle separator parts expose `data-disabled`, `data-dragging` and `data-orientation`. Hairline, decoration, radius, focus and spacing use common theme tokens. Measured panel extents and coarse/fine hit targets are behavioral geometry, not component spacing overrides.


An application can inject its existing storage policy before connecting an uncontrolled group:

```js
group.persistenceKey = 'workspace-panels';
group.persistenceAdapter = {
  load: key => JSON.parse(localStorage.getItem(key) ?? 'null'),
  save: (key, layout) => localStorage.setItem(key, JSON.stringify(layout)),
};
```
