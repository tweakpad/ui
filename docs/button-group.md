# Button group

`<tp-button-group>` arranges existing controls as one visual set without replacing or changing those controls. Use `<tp-button>` members to retain the complete Button contract, including variants, sizes, icons, loading marks, native action or link semantics, disabled handling, hover treatment, and pressed displacement.

## Properties

| Property      | Attribute     | Values                     | Default      |
| ------------- | ------------- | -------------------------- | ------------ |
| `orientation` | `orientation` | `horizontal`, `vertical`   | `horizontal` |
| `joined`      | `joined`      | Boolean                    | `true`       |
| `label`       | `label`       | Accessible group name text | `Actions`    |

`orientation` changes the layout and joined-seam axis only. It never reorders members or changes keyboard behavior. `joined` removes internal corner radii and one boundary from each seam without overlapping hit targets. Set the JavaScript property to `false` to preserve each Button's radius and add the standard group gap.

Button group does not force a shared Button size or variant. Apply the same `size` when controls should have equal extents, or mix Button APIs deliberately.

## Horizontal groups

```html
<tp-button-group label="Report actions">
  <tp-button variant="outline">Archive</tp-button>
  <tp-button variant="outline">Report</tp-button>
</tp-button-group>
```

Horizontal groups preserve the first Button's logical-start corners and the last Button's logical-end corners. The treatment follows writing direction.

## Vertical groups

```html
<tp-button-group orientation="vertical" label="Zoom controls">
  <tp-button variant="outline" size="icon" aria-label="Zoom in">+</tp-button>
  <tp-button variant="outline" size="icon" aria-label="Zoom out">−</tp-button>
</tp-button-group>
```

Vertical groups preserve the first Button's block-start corners and the last Button's block-end corners. Direct Button members stretch to the widest member while retaining their configured heights.

## Semantics and styling

The shadow root exposes `button-group`. The internal container uses `role="group"` and the `label` as its accessible name. Each member remains independently focusable and owns its own accessible name, disabled state, activation, or navigation. Button group does not imply selection; use a selection-group component when members represent one shared value.
