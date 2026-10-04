# Spinner

`tp-spinner` shows indeterminate activity. Its existing size variants use shared
icon-size theme roles and scale with base spacing.

| Property / attribute | Values | Default |
| --- | --- | --- |
| `size` | sm, default, lg | default |
| `label` | status text; empty for decorative usage | Loading |
| `motionPolicy` / `motion-policy` | inherit, normal, reduce | inherit |

```html
<tp-spinner size="sm" label="Loading projects"></tp-spinner>
<tp-spinner size="default" label="Loading projects"></tp-spinner>
<tp-spinner size="lg" label="Loading projects"></tp-spinner>
```

Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css`. A standalone spinner
needs a meaningful label. Empty label renders no status announcement. For loading
buttons, use the existing Button composition, which hides its internal spinner
from assistive technology:

```html
<tp-button loading-position="leading" disabled>Saving</tp-button>
```

Parts: `spinner` and `spinner-accessible-label`. Use the shared theme, dictionary
or `partPresentation` for presentation. The shared `rotation` ambient motion role
and reduced-motion policy own playback. No progress value is implied. Spinner has
no form state, imperative actions or value events. Export: `TpSpinner`.

Docs includes all sizes and compositions with Button, Badge, Input Group, and Empty
State. Button's loading presentation uses its existing Spinner owner. Indicators
inside already named content use an empty label; standalone indicators retain a
named status.
