# Marker

`tp-marker` combines optional decorative icon content with text or other content.
Use `variant="separator"` for a label between decorative rules and `variant="border"`
for a label above a rule. The default treatment has no boundary.

```html
<tp-marker variant="separator">Conversation compacted</tp-marker>
```

Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css` once.

| Property / attribute | Values                                                        | Default |
| -------------------- | ------------------------------------------------------------- | ------- |
| `variant`            | default, separator, border                                    | default |
| `label`              | Text fallback when the default slot is empty                  | empty   |
| `tone`               | neutral, accent, danger, success; compatibility color mapping | neutral |

The default slot supplies content; the optional `icon` slot accepts an existing
Icon or decorative Spinner. The icon region is hidden from accessibility, so its
meaning must also appear in content. The Marker adds no status, separator, action,
or link role automatically. A caller may supply `role="status"` when content is a
live status update. Decorative rules remain outside the accessibility tree.

Public parts are `marker`, `marker-icon` and `marker-content`. They support the
shared `partPresentation` and `partContracts` interfaces, including native root
render delegation. A delegated link or button must preserve `bind` and `content`,
supply its native attributes and have an accessible name. Marker adds no events,
action state, methods or form participation; the application owns its actions.

Spacing, colors, typography and boundaries inherit the shared theme. Use public
part styling for application layout, such as centered or vertical content.
`TpMarker` remains exported from the library and its existing grouped entrypoint.
