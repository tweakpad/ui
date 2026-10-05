# Drawer

`tp-drawer` is the shared edge-attached Dialog for swipeable drawers and side panels. It shares Dialog's state, sections, focus, dismissal, portal and theme recipes. Set `swipe-enabled="false"` for a panel without gestures.

```html
<tp-drawer
  label="Workspace settings"
  description="Update your profile and preferences."
  show-swipe-handle
>
  <tp-button slot="trigger" variant="outline">Open settings</tp-button>
  <tp-field label="Display name"><tp-input value="Alex Morgan"></tp-input></tp-field>
  <tp-button slot="close" variant="outline">Done</tp-button>
</tp-drawer>
```

Import `@tweakpad/ui/styles.css` and `@tweakpad/ui/register` once. Use real library controls within sections. Spacing, colors, radius and motion come from the shared theme, with no instance spacing attributes.

| Property / attribute                                   | Type / default                                              | Behavior                                                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `edge`                                                 | block-start, block-end, inline-start, inline-end; block-end | Logical edge, resolved using the owner's direction and writing mode.                                         |
| `swipeDirection` / `swipe-direction`                   | up, down, left, right; resolved edge                        | Physical closing direction; a supplied direction normalizes to a logical edge.                               |
| `side`                                                 | top, bottom, left, right                                    | Compatibility input for the physical edge.                                                                   |
| `snapPoints`                                           | readonly array of numbers or CSS length strings; empty      | Ordered snap identifiers. Without usable points the surface opens fully. Property-only.                      |
| `snapPoint`                                            | number, string, null, or undefined                          | Controlled committed identifier. Supply before first render to select controlled mode.                       |
| `defaultSnapPoint`                                     | number, string, null, or undefined                          | Initial uncontrolled identifier; first listed point by default.                                              |
| `activeSnapPoint`                                      | same as snapPoint                                           | Alias of the same state owner.                                                                               |
| `snapToSequentialPoints` / `snap-to-sequential-points` | boolean, false                                              | Release advances at most one adjacent snap point.                                                            |
| `onSnapPointChange`                                    | callback(event), undefined                                  | Cancelable proposal; controlled owners accept synchronously.                                                 |
| `dismissible`                                          | boolean, true                                               | Allow outside, Escape, system close and swipe-past-minimum dismissal. Explicit Close still works when false. |
| `showSwipeHandle` / `show-swipe-handle`                | boolean, false                                              | Independent visual swipe handle; with multiple usable snaps it also supplies a keyboard slider.              |
| `showHeader` / `show-header`                           | boolean, true                                               | Show title and description; hiding preserves their accessible associations.                                  |
| `showFooter` / `show-footer`                           | boolean, true                                               | Show authored footer and close content.                                                                      |
| `showCloseControl` / `show-close-control`              | boolean, true                                               | Corner Close; hiding requires another reachable close action.                                                |

The [Dialog API](./dialog.md) is inherited, including controlled/default open state, triggers and handles, focus options, retention, portal targets, close policies, actions and lifecycle events. The `modality` property accepts `modal` (default), `non-modal`, and `trap-focus-only`. Non-modal and focus-trap-only modes hide the backdrop and preserve outside pointer interaction. Boolean properties use property bindings for false, except `swipe-enabled`, which explicitly accepts the attribute text "false".

Numbers from zero through one are viewport fractions; larger numbers are pixel lengths. Strings accept CSS length units resolved in the owner environment, including px, em, rem, viewport, logical and font-relative units. Invalid points are omitted, resolved extents clamp to the smaller of surface and viewport, and points within one pixel retain the last authored representative. A controlled identifier outside the list uses the nearest visual point without rewriting owner state.

`setSnapPoint(value, reason = 'programmatic', sourceEvent?)` proposes an exact identifier belonging to one list member. Invalid or ambiguous identifiers produce `tp-diagnostic` and do not propose a change. `tp-snap-point-change` bubbles, is composed and cancelable; its detail includes value, previousValue, reason, sourceEvent and cancelled. Prevent default to veto. Open and snap proposals commit atomically: listeners see the previous pair until every changed lane is accepted. Accepted closing resets the snap to the valid default or first member. Pointer movement publishes geometry without committing a snap; release chooses a snap or proposes closing with reason `swipe`. Interrupted gestures return to the committed geometry.

The swipe handle supports Arrow keys plus Home/End when multiple points exist. Input controls, selection and native content scrolling keep their normal behavior. Touch dismissing waits for the content scroll edge. Explicit triggers and Close remain available without gestures.

## Sections and customization

Slots: trigger, title, description, default body, footer, close and swipe-area. Footer content does not implicitly dismiss; use the close slot or `registerCloseAction`. Header, footer, handle and corner Close are independent.

Public parts/dictionary keys: drawer, drawer-trigger, drawer-portal, drawer-overlay, drawer-viewport, drawer-surface, drawer-swipe-handle, drawer-content, drawer-header, drawer-title, drawer-description, drawer-footer and drawer-close. Generated regions support the shared `partContracts` (hostProperties, renderDelegate, elementReference) and `partPresentation` channels. Delegates must forward supplied properties/content and preserve semantic and top-layer hosts. Viewport is the clipping/top-layer frame; Surface is the single dialog; Content contains the common sections.

Open/closed, starting/ending, expanded, swiping, swipe-dismiss, swipe-direction, snap-point, nested and nested-drawer-open markers describe state. Surface geometry includes `--drawer-height`, `--drawer-frontmost-height`, `--drawer-snap-point-offset`, `--drawer-swipe-movement-x`, `--drawer-swipe-movement-y`, `--drawer-swipe-strength`, `--drawer-swipe-progress` and `--nested-drawers`. Viewport publishes `--drawer-keyboard-inset`. These are measured outputs, not spacing knobs. Nested Drawer presentation uses the same theme motion/radius recipe. Entry/exit respects reduced motion and the shared `tp-motion-request` channel.

## Optional constituents

- `tp-drawer-swipe-area`: a consumer-positioned opening region. Set `for` to a Drawer ID, `.owner` to a Drawer reference, or place it in that Drawer's swipe-area slot. `swipeDirection` defaults opposite the closing direction; `disabled` defaults false. It shares the owning gesture controller and exposes open/closed/swiping/disabled/direction markers. Native host class/style and the drawer-swipe-area part configure its region; no forced page-sized hit area is added.
- `tp-drawer-provider`: optional common ancestor tracking open descendant Drawers. Nested Drawer lifecycle still belongs to Dialog. Removing the last Drawer clears active geometry.
- `tp-drawer-indent` and `tp-drawer-indent-background`: optional native layout regions inside the nearest provider. They expose their correspondingly named parts, mutually exclusive data-active/data-inactive, normalized `--drawer-swipe-progress`, `--nested-drawers` and a positive `--drawer-height`. Their native host styles can use these geometry outputs. Detaching resets geometry and subscriptions. Indent does not invent a page transform by default.
- `tp-drawer-virtual-keyboard-provider`: optional ancestor that observes the real visual viewport, coalesces keyboard geometry and reveals an editable control inside the active descendant Drawer's existing scroll region. It restores geometry after keyboard dismissal and disconnects its observers when removed. It does not own focus or create a second scroller.

Provider and keyboard-provider render their children without layout boxes. Their composition APIs are services, not separate catalog controls. Native host attributes and styles customize these constituents; the Drawer dictionary owns generated Drawer parts.

## Side panels and backdrops

```html
<tp-drawer
  edge="inline-end"
  swipe-enabled="false"
  backdrop="blur"
  label="Workspace settings"
  description="Update your profile and preferences."
>
  <tp-button slot="trigger" variant="outline">Open settings</tp-button>
  <tp-field label="Display name"><tp-input value="Alex Morgan"></tp-input></tp-field>
  <tp-button slot="close" variant="outline">Done</tp-button>
</tp-drawer>
```

| Property / attribute             | Type                                    | Default | Behavior                                                                                                                                                                                                                                             |
| -------------------------------- | --------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `swipeEnabled` / `swipe-enabled` | Boolean; attribute `"false"` disables   | `true`  | Enables pointer and SwipeArea gestures. Disabling during a drag cancels capture and restores committed geometry. The swipe handle is hidden while disabled. Explicit actions and snap APIs remain available. Removing the attribute restores `true`. |
| `backdrop`                       | `dark` or `blur`                        | `dark`  | Selects a dark fill or the same fill with background blur. Invalid values use dark. Affects appearance only; modality controls whether the backdrop is shown.                                                                                        |
| `modality`                       | `modal`, `non-modal`, `trap-focus-only` | `modal` | Inherits Dialog's focus, outside-interaction and scroll policy.                                                                                                                                                                                      |

Backdrop blur is provided by the `drawer-overlay` presentation recipe, using `--tp-space-1` for its radius. The fill uses `--tp-opacity-backdrop` and remains visible where backdrop filtering is unsupported. Override the `drawer-overlay` dictionary entry or `::part(drawer-overlay)` for a custom treatment. Header, body and footer spacing uses the same section recipe as Dialog; no demo padding is required. Existing portal customization rules apply.

### Migrating Side Panel

Drawer replaces Side Panel in the catalog. Change `<tp-side-panel>` to `<tp-drawer edge="inline-end" swipe-enabled="false">`. Keep existing Dialog properties and slots. `TpSidePanel`, `PanelEdge`, and `tp-side-panel` remain deprecated compatibility bindings with those defaults, delegating to Drawer. Use `DrawerEdge` and Drawer parts/recipes; the old `side-panel-content` surface maps to `drawer-surface`, and the other old `side-panel-*` parts map to `drawer-*`.
