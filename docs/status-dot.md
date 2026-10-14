Status dot marks the state of something, such as a service, a person or a job, with a small colored dot and a text label. The label is shown beside the dot, or kept hidden and presented in a tooltip when the dot is hovered or focused. A looping pulse or ping draws attention to live or changing states.

```html
<tp-status-dot variant="success" label="Running" show-label motion="ping"></tp-status-dot>
<tp-status-dot variant="warning" label="Delayed"></tp-status-dot>
```

## Color

`variant` picks the color from the theme's status roles:

| Variant             | Color role              | Typical meaning                   |
| ------------------- | ----------------------- | --------------------------------- |
| `default` (default) | `--tp-primary`          | Active, selected or informational |
| `secondary`         | `--tp-muted-foreground` | Neutral, paused, offline          |
| `success`           | `--tp-success`          | Running, available, healthy       |
| `warning`           | `--tp-warning`          | Degraded, delayed, attention      |
| `destructive`       | `--tp-destructive`      | Stopped, failed, unavailable      |

For any other color, set `--tp-status-dot-color` on the dot or on an ancestor, for example `--tp-status-dot-color: var(--tp-chart-2)`. It replaces the variant color. `--tp-status-dot-size` sets the diameter; the default is the `--tp-space-2` step.

## Label

`label` is the status text. The color alone never carries the meaning, so give every dot a label unless nearby text already states the status.

- **Beside the dot.** `show-label` renders the label as text after the dot. The text takes the font and color of its context, wraps when space runs out, and keeps the dot centered on its first line.
- **In a tooltip.** Without `show-label`, the label is the accessible name of the dot and appears in a tooltip on hover and keyboard focus. The dot joins the tab order for that, with the focus ring, and its hover target reaches the small icon size around the dot. Escape closes the tooltip and keeps focus.
- **Name only.** `tooltip="false"` keeps the hidden label as the accessible name without a tooltip or a tab stop, for dots in dense layouts where the status is also stated elsewhere.

When `show-label` is turned on while the dot has focus, the dot keeps focus until it is left, then leaves the tab order.

A dot with an empty label is decorative: it is hidden from assistive technology and never focusable.

## Motion

`motion="pulse"` fades the dot out and in; `motion="ping"` grows a ring from the dot that fades out. Both repeat at the library's slow ambient cadence and never move the dot, its label or the content around it; the ping ring paints over its surroundings without taking space. Under reduced motion (`motion-policy="reduce"` on the dot or an ancestor, or the `prefers-reduced-motion` media feature) the dot rests without a ring.

Status dot declares the ambient `attention` motion role on its `status-dot-indicator` part. A request starts when a moving dot connects or `motion` changes to `pulse` or `ping`, and stops when it changes to `none`; its context carries `motion`. A claimed driver replaces only the default pulse or ping. See [Motion](motion.md).

## Accessibility

The label is exposed once: as text when it is shown, otherwise as the name of the dot, which has an image role. The tooltip repeats that name visually and adds no description. Status dot adds no live region: wrap dots whose changes must be announced in an element with `role="status"`.

## API — `tp-status-dot`

| Property / attribute       | Type; default                                                          | Behavior                                                                     |
| -------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `variant`                  | `default \| secondary \| success \| warning \| destructive`; `default` | Dot color. Reflected.                                                        |
| `label`                    | string; `''`                                                           | Status text: shown beside the dot, or the dot's accessible name and tooltip. |
| `showLabel` / `show-label` | boolean; `false`                                                       | Shows the label beside the dot instead of in a tooltip. Reflected.           |
| `tooltip`                  | boolean; `true`                                                        | Presents a hidden label in a tooltip. Set `tooltip="false"` to turn it off.  |
| `motion`                   | `none \| pulse \| ping`; `none`                                        | Looping motion of the dot. Reflected.                                        |

The host reflects `data-label-shown` while the label is shown beside the dot.

### Custom properties

| Property                | Default             | Effect                              |
| ----------------------- | ------------------- | ----------------------------------- |
| `--tp-status-dot-color` | the variant color   | Dot color; inherits from ancestors. |
| `--tp-status-dot-size`  | `var(--tp-space-2)` | Dot diameter.                       |

### Parts

| Part                     | Element                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| `status-dot-indicator`   | The dot. Carries the `focusable` token while it is in the tab order. |
| `status-dot-label`       | The label beside the dot, while it is shown.                         |
| `status-dot-description` | The tooltip popup presenting a hidden label, once it has opened.     |

The host is the `status-dot` presentation part. Customize through `partContracts`, `partPresentation` or `::part()`; part state carries `variant`, `motion` and `showLabel`.

Exported class: `TpStatusDot`, with `statusDotMotionRoles`. Exported types: `StatusDotVariant`, `StatusDotMotion`. Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css`.
