# Popover

`tp-popover` presents interactive content anchored to a real Trigger or independent
Anchor. It uses the same surface/portal/focus infrastructure as Tooltip while
keeping explicit interactive Popover behavior.

The default placement is `block-end center`: below the anchor in horizontal writing,
to its left in `vertical-rl`, and to its right in `vertical-lr`. Use `bottom center`
for an explicitly physical bottom placement.

```html
<script type="module">
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/styles.css';
</script>
<tp-popover label="Document settings">
  <tp-button slot="trigger" variant="outline">Document settings</tp-button>
  <span slot="title">Document settings</span>
  <span slot="description">Update the document name.</span>
  <tp-field><label slot="label">Name</label><tp-input default-value="Notes"></tp-input></tp-field>
  <tp-button slot="close">Done</tp-button>
</tp-popover>
```

The complete [shared anchored surface API](anchored-surfaces.md) documents
open/defaultOpen ownership, controlled acceptance and cancellation, events,
methods, handle/trigger association and payloads, all positioning options,
Portal/Arrow/Backdrop/Viewport and generic part contracts.

| Popover option / attribute                           | Type                | Default | Behavior                                                                |
| ---------------------------------------------------- | ------------------- | ------- | ----------------------------------------------------------------------- |
| `modal`                                              | boolean             | false   | Optional focus containment, outside inertness and scroll-lock leases.   |
| `openOnHover / open-on-hover`                        | boolean             | false   | Optional interactive hover opening.                                     |
| `openDelay / open-delay`, `closeDelay / close-delay` | number              | 300, 0  | Hover delays; press-to-open remains available.                          |
| `preserveOnTriggerHover / preserve-on-trigger-hover` | boolean             | false   | Preserve an open popup when leaving focused content toward its Trigger. |
| `initialFocus`                                       | shared focus target | none    | Set first/index/element/resolver when opening should move focus.        |
| `finalFocus`                                         | shared focus target | trigger | Restore after applicable dismissal without overriding outside focus.    |
| `label`                                              | string              | empty   | Fallback accessible popup name when no Title is supplied.               |
| `showViewport / show-viewport`                       | boolean             | false   | Optional payload viewport across trigger transfers.                     |

Popover's Foundation contract permits modal and hover configurations. The default
is nonmodal and explicit activation. Optional hover does not make focus alone
open the Popover; a press can pin a hover-open popup. Outside press/focus, Escape,
Close actions and imperative close all use the same cancelable owner. Nested
portaled overlays remain in the owning branch, including for modal allowances.

## Slots and parts

| Slot          | Public part / role                                                                           |
| ------------- | -------------------------------------------------------------------------------------------- |
| `trigger`     | `popover-trigger`; actual Button/native action owner.                                        |
| `anchor`      | `popover-anchor`; independent authored anchor geometry.                                      |
| `header`      | `popover-header`; optional authored header replacing the generated Title/Description layout. |
| `title`       | `popover-title`; h2 labelled-by relationship.                                                |
| `description` | `popover-description`; descriptive relationship.                                             |
| default       | Content, inside `popover-content`.                                                           |
| `close`       | Actual Button/native action, explicitly wired to the shared close proposal.                  |

The complete public parts are `popover`, `popover-trigger`, `popover-anchor`,
`popover-content`, `popover-header`, `popover-title`, `popover-description`,
`popover-positioner`, `popover-portal`. Hidden `arrow`, `backdrop` and `viewport`
contracts configure the flattened constituents. Close uses the authored Button's
own rendering contract; it is independently present from title/header/footer
content and never inferred from text.

Title and Description are optional when the popup has an adequate accessible
name and description. Explicitly label controls inside interactive content using
real Field/Input components. Native form ownership remains with those controls.
An Anchor is not an activation substitute; detached Trigger registration uses
`registerTrigger` or SurfaceHandle as described in the shared API.

`partContracts` configures Root-rendered parts and `partPresentation` reaches the
current Trigger/Anchor/content targets. Portal placement preserves projected node
and reference identity; changing content, theme, placement or Arrow does not
recreate the controlling state owner. Popover exposes the shared
`surface` motion role with enter/exit phases and reversible presence completion.
