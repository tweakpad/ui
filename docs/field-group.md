# Field group

`<tp-field-group>` arranges value editors that belong together, such as width and height, X/Y/Z coordinates or color channels, as one joined set. Each editor stays the same control with its own value, name, label, disabled or read-only state, form participation and validation; the group owns only the layout, the seams and the group name. It is the editor counterpart of [Button group](button-group.md) and shares its seam treatment through the same owner.

Field group is distinct from Field's `group` slot: Field stacks peer Fields with spacing (`field-field-group`), whereas Field group joins the editors of one related value and never owns a value of its own.

## Properties

| Property      | Attribute     | Values                     | Default      |
| ------------- | ------------- | -------------------------- | ------------ |
| `orientation` | `orientation` | `horizontal`, `vertical`   | `horizontal` |
| `joined`      | `joined`      | Boolean                    | `true`       |
| `label`       | `label`       | Accessible group name text | `Values`     |

`orientation` changes the layout and joined-seam axis only; it never reorders editors or changes their behavior. `joined` removes the internal corner radii and one boundary from each seam without overlapping hit targets or focus rings. Set the JavaScript property to `false` to keep every editor's own corners with the standard theme gap.

## Base example

```html
<tp-field-group label="Size">
  <tp-input-group>
    <span slot="prefix">W</span>
    <tp-input label="Width" name="width" default-value="1280" inputmode="numeric"></tp-input>
    <span slot="suffix">px</span>
  </tp-input-group>
  <tp-input-group>
    <span slot="prefix">H</span>
    <tp-input label="Height" name="height" default-value="720" inputmode="numeric"></tp-input>
    <span slot="suffix">px</span>
  </tp-input-group>
</tp-field-group>
```

Use Input group prefixes for the per-editor markers (`W`, `H`, `X`, `Y`, `R`, `G`, `B`) and keep each editor's accessible `label` complete, because the marker is visual shorthand. The group name (`label`, or an authored `aria-label` / `aria-labelledby`) names the tuple: "Size", "Position", "RGB".

## Members

Input, Input group, Text area, Select and Native select are editor members. Button and Toggle can join beside them, for example a lock toggle next to a width/height pair, and Menu or Popover participate through their slotted trigger; popup content is never a member. The group applies seams to each existing control's public boundary and does not touch values, focus, validation or form participation. Use the existing `<tp-separator>` between editors; the group supplies the perpendicular orientation when the separator has no authored orientation and restores it when the separator leaves.

Hidden members (`hidden`) do not participate. Reordering, removing or replacing a member updates the seams and part registrations without replacing other controls. Content that is not a member splits the group into independent seam runs.

## Sizing

The group fills its container and gives each editor an equal share of the main axis. An editor that declares its own `inline-size` or `flex` keeps it. Vertical groups stretch every editor to the widest one. Inside a container with a definite inline size the editors shrink below their intrinsic width; an ancestor that is sized by its content (a grid auto track, `fit-content`) keeps each native input's intrinsic minimum, so give such containers an inline size. Put long tuples in a vertical group or in two groups when the editors would become unreadable.

## Forms and states

Every editor submits its own `name`; the group has no form value and no `name`. Disable or make read-only the editors individually (`disabled`, `readonly`), or wrap the group in a disabled fieldset through Field. The group adds no selection state: it never implies that one member is chosen.

## Semantics and styling

The shadow root exposes `field-group`; the internal container uses `role="group"` and the `label` as its accessible name unless `aria-label` or `aria-labelledby` is authored. Each member boundary receives the `field-group-control` alias and each Separator host the `field-group-separator` alias through the shared part registration, so root `partPresentation` can address them; a member's own terminal presentation still wins. Appearance follows the theme tokens of the members (`--tp-radius-lg` outer corners, `--tp-input` seam and separator color, `--tp-space-2` unjoined gap); the dictionary keys are `field-group`, `field-group-control`, `field-group-separator` and their `-orientation-horizontal` / `-orientation-vertical` variants.

## In widgets

The color picker composes a Field group for its channel editors (R/G/B, H/S/L, …, or the single hex editor) and keeps the alpha editor apart with the row gap, so every format reads as one tuple plus opacity.
