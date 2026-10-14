# Marker

`tp-marker` combines optional decorative icon content with text or other content.
Use `variant="separator"` for a label between decorative rules and `variant="border"`
for a label above a rule. The default treatment has no boundary.

```html
<tp-marker variant="separator">Conversation compacted</tp-marker>
```

Set `shimmer` to sweep a highlight across the content text while a status streams or
is in progress. It works with every variant and leaves the icon and rules unchanged.

```html
<tp-marker role="status" shimmer>
  <tp-spinner slot="icon" size="sm"></tp-spinner>Drafting a summary
</tp-marker>
```

Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css` once.

| Property / attribute | Values                                         | Default |
| -------------------- | ---------------------------------------------- | ------- |
| `variant`            | default, separator, border                     | default |
| `shimmer`            | Boolean; sweeps a highlight across the content | false   |
| `label`              | Text fallback when the default slot is empty   | empty   |
| `tone`               | neutral, accent, danger, success               | neutral |

The default slot supplies content; the optional `icon` slot accepts an
Icon or decorative Spinner. The icon region is hidden from accessibility, so its
meaning must also appear in content. The Marker adds no status, separator, action,
or link role automatically. A caller may supply `role="status"` when content is a
live status update. Decorative rules remain outside the accessibility tree.

## Shimmer

The highlight is derived from the text color: in a light color scheme the band fades
the text, in a dark scheme it brightens it, so it follows `tone` and inherited colors.
The band sweeps in the reading direction, right to left in a right-to-left context,
and repeats every eight times `--tp-duration-normal` (2.24 s by default). Clearing
`shimmer` restores ordinary text; setting it again restarts the sweep, also when it
was cleared in the same frame. Under reduced motion (`motion-policy="reduce"` or the
`prefers-reduced-motion` media feature) the text renders normally.

Tune the effect with custom properties on the Marker or on any ancestor; they inherit,
so one container can adjust every shimmer inside it.

| Custom property           | Default                                                              |
| ------------------------- | -------------------------------------------------------------------- |
| `--tp-shimmer-color`      | Derived from the text color                                          |
| `--tp-shimmer-duration`   | `calc(var(--tp-duration-normal) * 8)`, one sweep                     |
| `--tp-shimmer-spread`     | `calc(3ch + var(--tp-spacing) * 10)`, half the band width            |
| `--tp-shimmer-angle`      | `20deg`, the tilt of the band                                        |
| `--tp-shimmer-iterations` | `infinite`; `1` plays a single sweep, such as a reveal on completion |
| `--tp-shimmer-direction`  | `normal` follows the reading direction; `reverse` runs against it    |

```html
<tp-marker shimmer style="--tp-shimmer-iterations: 1">Summary ready</tp-marker>
```

The shimmer paints the text through the content's background, so it suits text and
inline phrasing such as `strong` or a link. A control placed in shimmering content
loses its text paint. Shimmer changes no role, name or announcement.

Marker declares the ambient `shimmer` motion role on its `marker-content` part, with
the `start` and `stop` phases, no context and non-blocking completion. A driver that
claims it replaces the sweep; the gradient paint stays on the content for the driver
to move through `background-position`. See [Motion](motion.md).

## Parts and customization

Public parts are `marker`, `marker-icon` and `marker-content`. They support the
shared `partPresentation` and `partContracts` interfaces, including native root
render delegation. Hooks that resolve from state receive `variant` and `shimmer`. A
delegated link or button must preserve `bind` and `content`, supply its native
attributes and have an accessible name. Marker adds no events, action state, methods
or form participation; the application owns its actions.

Spacing, colors, typography and boundaries inherit the shared theme. Use public
part styling for application layout, such as centered or vertical content.
`TpMarker` and `markerMotionRoles` are exported from the library and its grouped
entrypoint.
