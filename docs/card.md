# Card

`<tp-card>` groups related content in a token-based surface. The Card owns the outer surface, header, body, and trailing action footer; its slotted content remains consumer-owned.

## Properties

| Property        | Attribute        | Values      | Default |
| --------------- | ---------------- | ----------- | ------- |
| `elevated`      | `elevated`       | Boolean     | `false` |
| `borders`       | `borders`        | `on`, `off` | `on`    |
| `sectionColors` | `section-colors` | `on`, `off` | `on`    |
| `interactive`   | `interactive`    | Boolean     | `false` |

`elevated` is a shared, opt-in presentation property, not a Card variant. When true, the Card uses the shared medium shadow role and softens its border; when false, it uses the shared no-shadow role. It does not change Card semantics or interaction. The elevation property and shadow-role mapping are reusable by other bounded surfaces and buttons that explicitly expose elevation, without defining new `elevated` variants.

`borders` controls the outer outline and both section dividers, while `sectionColors` controls whether header, content, and footer have distinct solid fills or share the base surface fill. Both are `on` by default, and all four combinations work with or without elevation.

The three section fills derive from the shared card and muted color roles. There are no new hard-coded colors. With `section-colors="off"`, all sections use the Card's base fill. With `borders="off"`, the outer line and dividers have zero width, not merely a transparent color.

```html
<tp-card borders="off" section-colors="on">…</tp-card>
<tp-card borders="on" section-colors="off">…</tp-card>
<tp-card borders="off" section-colors="off">…</tp-card>
<tp-card elevated>…</tp-card>
```

## Slots and parts

| Slot          | Purpose                                              | Shadow part |
| ------------- | ---------------------------------------------------- | ----------- |
| `header`      | Heading content, ideally a heading element           | `header`    |
| `description` | Muted supporting text in the header                  | `header`    |
| default       | Main content                                         | `content`   |
| `footer`      | Actions in reading order, aligned to the logical end | `footer`    |

The surface exposes `root`. Empty header and footer sections are omitted from layout. Card does not create actions or alter Button variants; use `<tp-button>` in the footer when actions are needed.

```html
<tp-card>
  <h2 slot="header">Project access</h2>
  <p slot="description">Review your team’s permissions.</p>
  <p>Invited teammates can view shared project files.</p>
  <tp-button slot="footer" variant="outline">Not now</tp-button>
  <tp-button slot="footer">Continue</tp-button>
</tp-card>
```

`interactive` preserves the existing focus and hover motion treatment for a selectable surface. It does not turn the Card into a button or replace the semantics of actions inside it.
