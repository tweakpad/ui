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

## Mixed controls and text

Input, Text area, Select, Native select, Input group and Toggle can be members alongside Button. The group applies seams to each existing control's public boundary. Menu, Popover and Tooltip participate through their slotted trigger; their popup content is not a member. Each editor keeps its value, form participation and validation behavior.

```html
<tp-button-group label="Transfer">
  <tp-button-group-text>$</tp-button-group-text>
  <tp-input label="Amount" name="amount" inputmode="decimal"></tp-input>
  <tp-button variant="outline" type="submit">Send</tp-button>
</tp-button-group>
```

`tp-button-group-text` is a noninteractive constituent, exported as `TpButtonGroupText` and registered by `@tweakpad/ui/register`. Its default slot accepts text and existing Icon or Label components. For an associated label, put `<tp-label for="amount">Amount</tp-label>` inside it and give the editor the matching ID. It exposes `button-group-text-segment` and uses the Button Group presentation dictionary; it has no independent variant or spacing property.

Use the existing `<tp-separator>` between members. The group supplies a perpendicular orientation when the separator has no authored orientation. An explicitly configured orientation is preserved, and removing the separator restores its previous default. The existing `decorative` property controls separator semantics; it never becomes an adjustable divider.

Nested Button Groups remain separate sets with the standard theme gap. Each nested group owns its own orientation and seams. Hidden members do not participate. Reordering, removing, reconnecting or replacing a Button's native button with a link updates group membership without replacing other controls.

The group exposes `button-group-control` on actual interactive boundaries and `button-group-separator` on actual Separator hosts through the shared part registration system. Root `partPresentation` can address those aliases; each member's own terminal presentation overrides remain authoritative. `aria-label` and `aria-labelledby` on the group supply authored naming; `label` is the fallback. Grouping adds no roving focus or selection state.
