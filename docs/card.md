# Card

`<tp-card>` groups related content in a token-based surface. The Card owns the outer surface, header, body, and trailing action footer; its slotted content remains consumer-owned.

## Properties

| Property        | Attribute        | Values          | Default   |
| --------------- | ---------------- | --------------- | --------- |
| `elevated`      | `elevated`       | Boolean         | `false`   |
| `borders`       | `borders`        | `on`, `off`     | `on`      |
| `sectionColors` | `section-colors` | `on`, `off`     | `on`      |
| `size`          | `size`           | `sm`, `default` | `default` |

`elevated` changes only the shadow: medium when true, none when false. Borders, colors, spacing, dimensions, and semantics do not change. Card is the only control exposing this property in this pass.

`borders` controls the outer outline and both section dividers, while `sectionColors` controls whether header, content, and footer have distinct solid fills or share the base surface fill. Both are `on` by default, and all four combinations work with or without elevation.

The three section fills derive from the shared card and muted color roles. There are no new hard-coded colors. With `section-colors="off"`, all sections use the Card's base fill. With `borders="off"`, the outer line and dividers have zero width, not merely a transparent color.

```html
<tp-card borders="off" section-colors="on">…</tp-card>
<tp-card borders="on" section-colors="off">…</tp-card>
<tp-card borders="off" section-colors="off">…</tp-card>
<tp-card elevated>…</tp-card>
```

## Slots and parts

| Slot          | Purpose                                                                | Shadow part        |
| ------------- | ---------------------------------------------------------------------- | ------------------ |
| `header`      | Heading content, ideally a heading element                             | `card-title`       |
| `description` | Muted supporting text in the header                                    | `card-description` |
| `action`      | Consumer-owned header action                                           | `card-action`      |
| default       | Main content                                                           | `card-content`     |
| `footer`      | Secondary metadata or actions in reading order, from the logical start | `card-footer`      |

The surface exposes `card`; the header exposes `card-header`. Empty header, content and footer sections are omitted from layout. Card does not create actions or alter Button variants; use `<tp-button>` in the footer when actions are needed.

```html
<tp-card>
  <h2 slot="header">Project access</h2>
  <p slot="description">Review your team’s permissions.</p>
  <p>Invited teammates can view shared project files.</p>
  <tp-button slot="footer" variant="outline">Not now</tp-button>
  <tp-button slot="footer">Continue</tp-button>
</tp-card>
```

Card has no `interactive` shortcut or whole-card activation delegation. Compose semantic links and buttons inside it. `size="sm"` uses shared space-3 section padding; `default` preserves space-5.

Use inherited tokens for theming, the shared presentation dictionary for reusable recipes, and `.partPresentation` for instance overrides:

```js
card.partPresentation = {
  'card-content': { styleHook: { 'padding-inline-start': 'var(--tp-space-8)' } },
};
```
