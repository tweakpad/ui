# List

`tp-list` presents a collection of rows. Each `tp-list-item` arranges media, a title,
supporting text, independent actions and optional full-width header/footer content.
`tp-list-separator` divides adjacent rows with the decorative Separator. The list adds no
selection or action state machine, and a `tp-list-item` also works on its own, outside a list.

```html
<tp-list aria-label="Documents">
  <tp-list-item variant="outline" description="Updated today">
    Project notes
    <tp-button slot="actions" variant="outline">Open</tp-button>
  </tp-list-item>
  <tp-list-separator></tp-list-separator>
  <tp-list-item variant="outline" description="Updated yesterday">Launch checklist</tp-list-item>
</tp-list>
```

Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css` once.

## List

| Property / attribute       | Values                      | Default |
| -------------------------- | --------------------------- | ------- |
| `ariaLabel` / `aria-label` | Accessible name of the list | none    |

Slot: the default slot takes `tp-list-item` rows and `tp-list-separator` (or `tp-separator`)
dividers. The list exposes the `list` part.

## List item

| Property / attribute                 | Values                                                           | Default |
| ------------------------------------ | ---------------------------------------------------------------- | ------- |
| `variant`                            | ghost, outline, subdued                                          | ghost   |
| `size`                               | xs, sm, default                                                  | default |
| `mediaTreatment` / `media-treatment` | plain, icon, image                                               | plain   |
| `description`                        | Supporting text fallback                                         | empty   |
| `selected`                           | Compatibility current-item metadata, reflected as `aria-current` | false   |
| `value`                              | Application-owned identity; no selection behavior                | empty   |

Slots: default supplies the title; `title` replaces that fallback. `description`
replaces the text property. `media` accepts Icon, Avatar or image content (`leading`
is its compatibility fallback). `actions` accepts independently operable controls
(`trailing` is its compatibility fallback). `header` and `footer` each span the row.
Empty optional regions collapse, including when their content changes dynamically.
Media aligns to the first content line when a description is present.

Row parts are `list-item`, `list-item-media`, `list-item-content`,
`list-item-title`, `list-item-description`, `list-item-actions`, `list-item-header`
and `list-item-footer`. The list exposes `list`; the separator exposes `list-separator`. Every
rendered part supports the shared
`partContracts` and `partPresentation` APIs. Row contract state exposes `variant`,
`size`, `mediaTreatment`, `selected`, `value` and inherited `disabled`.

A standalone whole-row link or button may use the root's native `renderDelegate`.
Preserve `bind`, `content`, native attributes, accessible naming and native disabled
behavior. Actions renders as a sibling of Root, keeping its controls independently
operable when Root is a link or button. Put independent controls in `actions` (or
`trailing`), not in the title, description, media, header or footer of an interactive
Root. Native Tab order reaches Root before its actions; activating an action does
not activate Root. The default row is presentational and has no activation handler.
Decorative `tp-icon` content in Actions lets pointer input reach the native Root;
real action controls retain their own pointer targets.

For a rich command, place a presentational List item directly inside `tp-menu-item`.
Menu Item owns command semantics, keyboard navigation, highlighting and the outer
inset. Its shared composition removes the inner row's padding and restores it if
the row leaves the command. Do not add a second link or button inside that row.
Avatar groups, square image headers and metadata use Avatar Group,
Aspect Ratio and the public content rendering contracts, as shown in the examples.

## Accessibility

The list host has the `list` role, named by `aria-label`, and supplies `listitem` to direct
rows without an authored role. A row that leaves the list, or a list that leaves the page,
releases only the roles the list set; authored roles are preserved, and a standalone
`tp-list-item` has no list item role. The list does not implement selection, roving focus or
keyboard navigation; links and buttons keep their native tab order.

## List separator

`tp-list-separator` is decorative and horizontal. Ordinary `tp-separator` children are also
supported; the list registers their presentation as `list-separator`, while their rendering
contract remains on the Separator component.

Spacing, shape, media extents and typography use shared theme tokens and the
presentation dictionary. There are no per-row spacing properties. The component
emits no bespoke events, provides no additional methods and does not participate
in forms. Actions keep their own public APIs.
