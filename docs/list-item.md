# List item

`tp-list-item` arranges media, a title, supporting text, independent actions and
optional full-width header/footer content. It adds no selection or action state
machine. `tp-list-item-group` is its list constituent; use `tp-list-item-separator` children to divide rows. This constituent composes
the existing decorative Separator.

```html
<tp-list-item-group aria-label="Documents">
  <tp-list-item variant="outline" description="Updated today">
    Project notes
    <tp-button slot="actions" variant="outline">Open</tp-button>
  </tp-list-item>
</tp-list-item-group>
```

Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css` once.

| Property / attribute | Values | Default |
| --- | --- | --- |
| `variant` | ghost, outline, subdued | ghost |
| `size` | xs, sm, default | default |
| `mediaTreatment` / `media-treatment` | plain, icon, image | plain |
| `description` | Supporting text fallback | empty |
| `selected` | Compatibility current-item metadata, reflected as `aria-current` | false |
| `value` | Application-owned identity; no selection behavior | empty |

Slots: default supplies the title; `title` replaces that fallback. `description`
replaces the text property. `media` accepts Icon, Avatar or image content (`leading`
is its compatibility fallback). `actions` accepts independently operable controls
(`trailing` is its compatibility fallback). `header` and `footer` each span the row.
Empty optional regions collapse, including when their content changes dynamically.
Media aligns to the first content line when a description is present.

Row parts are `list-item-root`, `list-item-media`, `list-item-content`,
`list-item-title`, `list-item-description`, `list-item-actions`, `list-item-header`
and `list-item-footer`. Group exposes `list-item`; Separator exposes `list-item-separator`. Every rendered
part supports the shared
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

For a rich command, place a presentational List Item directly inside `tp-menu-item`.
Menu Item owns command semantics, keyboard navigation, highlighting and the outer
inset. Its shared composition removes the inner row's padding and restores it if
the row leaves the command. Do not add a second link or button inside that row.
Avatar groups, square image headers and metadata use the existing Avatar Group,
Aspect Ratio and public content rendering contracts, as shown in the examples.

Group owns a list role and supplies `listitem` to direct rows without an authored
role. Detaching a row or group releases only its owned roles. Authored roles are
preserved. Group does not implement selection, roving focus or keyboard navigation;
links and buttons retain their native tab order. List Item Separator is decorative
and horizontal. Ordinary `tp-separator` children are also supported; Group registers
their presentation as `list-item-separator`, while their rendering contract remains
on the actual Separator component.

Spacing, shape, media extents and typography use shared theme tokens and the
presentation dictionary. There are no per-row spacing properties. The component
emits no bespoke events, provides no additional methods and does not participate
in forms. Actions keep their own public APIs.
