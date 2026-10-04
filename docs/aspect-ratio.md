# Aspect Ratio Box

`tp-aspect-ratio` derives its height from its available width. Slotted content fills
the resulting rectangle and cannot enlarge it with intrinsic dimensions.

```html
<tp-aspect-ratio ratio="1.7777777778">
  <div style="inline-size:100%;block-size:100%;background:var(--tp-muted)"></div>
</tp-aspect-ratio>
```

Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css`.

| Property / attribute | Values | Default |
| --- | --- | --- |
| `ratio` | finite number greater than zero; width divided by height | 16 / 9 for compatibility |
| `fit` | fill, contain, cover, none | fill |

Supply a ratio explicitly for new usages. Invalid property assignments throw
`RangeError` and preserve the previous valid ratio. Invalid attribute values also
report the validation error instead of silently clamping geometry. `fit` controls
native replaced content such as images; it does not change the box's ratio.

The default slot accepts content. Parts are `aspect-ratio-box` (also `root`) and
`aspect-ratio-box-content`. Appearance can be customized through the shared
presentation dictionary and `partPresentation`. The component does not create
image semantics or alternative text for its content. Export: `TpAspectRatio`.
No component events, form state or imperative methods are defined.

Canonical rendered regions support the shared `partContracts` interface, including
render delegates, element references, host properties, and class/style hooks. A
render delegate must apply its supplied `bind` directive to the semantic host and
render the supplied `content`; this preserves component state and slot behavior.

## Ratio and size examples

The rendered Docs include all four ratios from the Base shadcn reference: **16:9**,
**21:9**, **1:1**, and **9:16**. The different-container-sizes example keeps 16:9
while changing the available width. These are usage examples, not component
variants. All examples use a solid muted theme color. Widths, spacing, and rounded
corners use shared theme variables, with no image dependency or size attribute.
