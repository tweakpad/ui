# Bubble

Use `tp-bubble-group` to order messages and `tp-bubble` for each message. The
application owns message delivery, sender information and reaction counts.

```html
<tp-bubble-group>
  <tp-bubble>Can you send the updated design?</tp-bubble>
  <tp-bubble align="end" variant="tinted">
    The updated design is ready for review.
    <tp-button slot="reactions" size="xs" aria-label="Like this message; 2 likes">Like · 2</tp-button>
  </tp-bubble>
</tp-bubble-group>
```

Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css` before rendering.

| Property / attribute | Values | Default |
| --- | --- | --- |
| `variant` | default, secondary, subdued, tinted, outline, ghost, destructive | secondary |
| `align` | start, end; logical sender alignment | start |
| `reactionSide` / `reaction-side` | block-start, block-end | block-end |
| `reactionsAlign` / `reactions-align` | start, end | end |
| `label` | text describing the message container | Message |

The default slot accepts rich message content; `reactions` accepts named controls or
plain counts. Empty reactions have no visible surface. Reaction side and alignment
are independent. Grouping adds no conversation state or announcements.

Public presentation parts: `bubble` on the group; `bubble-root`, `bubble-content`
and `bubble-reactions` on messages. Use the shared presentation dictionary or
`partPresentation` for theme integration. `partContracts['bubble-content']` also
supports content and render delegation for a native interactive content host;
delegates must retain the supplied binding and give interactive hosts a name.
Theme spacing, typography, colors and radius roles govern the default appearance.
Bubble has no value-change events, imperative actions or form participation.

Exported classes: `TpBubble`, `TpBubbleGroup`. The group accepts Bubbles in its
default slot and exposes the `bubble` presentation part.

Canonical rendered regions support the shared `partContracts` interface, including
render delegates, element references, host properties, and class/style hooks. A
render delegate must apply its supplied `bind` directive to the semantic host and
render the supplied `content`; this preserves component state and slot behavior.

## Usage examples

The rendered Docs demonstrate all reference treatments, content lengths, grouped messages, expandable content, reaction placement, interactive reactions, sender alignment, and native button/link bodies. Examples compose existing public controls and are not extra catalog variants.
