# Copy button

`<tp-copy-button>` writes a value to the clipboard and confirms the result in place: its icon
turns into a check, its accessible name becomes the copied message for a short time, and the
result is announced politely. It composes one [Button](button.md) with an [Icon](icon.md), so
variants, sizes, focus and disabled treatment are the Button's. It is the library's one copy
control; [Code block](code-block.md) and the color picker compose it instead of owning clipboard
logic.

## Properties

| Property      | Attribute      | Values                                                            | Default       |
| ------------- | -------------- | ----------------------------------------------------------------- | ------------- |
| `value`       | `value`        | Text written to the clipboard                                     | `""`          |
| `label`       | `label`        | Accessible name at rest; visible text when `showLabel` is true    | `Copy`        |
| `copiedLabel` | `copied-label` | Name, visible text and announcement after a successful copy       | `Copied`      |
| `failedLabel` | `failed-label` | Announcement after a failed copy                                  | `Copy failed` |
| `showLabel`   | `show-label`   | Boolean; renders the label beside the icon                        | `false`       |
| `variant`     | `variant`      | `default`, `secondary`, `destructive`, `outline`, `ghost`, `link` | `ghost`       |
| `size`        | `size`         | `xs`, `sm`, `default`, `lg`                                       | `sm`          |
| `duration`    | `duration`     | Milliseconds the copied state lasts                               | `2000`        |
| `disabled`    | `disabled`     | Boolean                                                           | `false`       |

Icon-only buttons (the default) use the matching Button icon size (`icon-xs`, `icon-sm`, `icon`,
`icon-lg`) and carry the label as `aria-label`; with `showLabel` the Button renders the icon in
its start slot and the label as text.

## Base example

```html
<tp-copy-button value="npm install @tweakpad/ui" label="Copy install command"></tp-copy-button>
```

Set `value` to the exact text to copy. For a visible action next to a read-only value, put the
button in an Input group action:

```html
<tp-input-group>
  <tp-input label="API key" readonly default-value="sk_live_4f2…"></tp-input>
  <tp-copy-button slot="action" value="sk_live_4f2…" label="Copy API key"></tp-copy-button>
</tp-input-group>
```

## Methods and events

- `copy()` runs the same sequence as a click and resolves to whether the clipboard accepted the
  value (`false` when disabled, cancelled or failed).
- `copied` is true while the check icon and the copied message are shown.
- `focus()` moves focus to the composed Button.

| Event           | Cancelable | Detail                                         |
| --------------- | ---------- | ---------------------------------------------- |
| `tp-copy`       | yes        | `value`; preventing it skips the write         |
| `tp-copied`     | no         | `value`, after a successful write              |
| `tp-copy-error` | no         | `value`, after a failed write (also announced) |

Copying uses the Clipboard API and falls back to a selection-based copy where it is unavailable
or denied; success is reported only after the write succeeded.

## Semantics and styling

The composed Button keeps its native button semantics, Enter and Space activation and focus
ring. While copied the host and the Button carry `data-copied`. Public parts: `copy-button` (the
host, with the `variant` and `size` keys), `copy-button-button`, `copy-button-icon` and
`copy-button-label`; `partPresentation` on the host reaches them, and the Button and Icon recipes
own the appearance. In a [Button group](button-group.md) or [Field group](field-group.md) the
composed Button is the member boundary.
