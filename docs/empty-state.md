# Empty State

`tp-empty-state` groups an optional illustration, a textual title and description,
and recovery controls. Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css`.

```html
<tp-empty-state title="No results">
  <span slot="description">Try a different query.</span>
  <tp-button slot="actions">Clear filters</tp-button>
</tp-empty-state>
```

| Property / attribute | Values | Default |
| --- | --- | --- |
| `title` | fallback title text | Nothing here |
| `description` | fallback description text | empty |
| `mediaTreatment` / `media-treatment` | plain, icon | plain |

Slots: `media` (with `icon` retained as a compatible fallback), `title`,
`description`, default content, `content` and `actions`. A slotted description works
without the description attribute. Empty media, descriptions and action regions
collapse. Use public Icon, Avatar and Button components when those roles are needed.
Decorate repeated illustrations with `aria-hidden`; give meaningful images alt text.
Omit recovery actions when the empty state is terminal.

Public parts: `empty-state`, `empty-state-header`, `empty-state-media`,
`empty-state-title`, `empty-state-description`, `empty-state-content`. Existing
`root`, `title`, `description` and `actions` part aliases remain available.
The shared theme/dictionary and `partPresentation` control appearance; there are no
per-instance spacing attributes. Export: `TpEmptyState`. No value, action events,
imperative methods or form state are owned by this presentational component.

Canonical rendered regions support the shared `partContracts` interface, including
render delegates, element references, host properties, and class/style hooks. A
render delegate must apply its supplied `bind` directive to the semantic host and
render the supplied `content`; this preserves component state and slot behavior.

Docs includes first-project actions, muted and bordered surfaces, search recovery,
icon media, and a Card composition. Examples use public component parts and shared
theme variables for surface customization. Input, Input Group, Key Hint, Icon and
Button retain their existing implementations and default spacing.
