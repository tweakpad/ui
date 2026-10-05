# Bubble

Use `tp-bubble-group` to order messages and `tp-bubble` for each message. The
application owns message delivery, sender information and reaction counts.

```html
<tp-bubble-group>
  <tp-bubble>Can you send the updated design?</tp-bubble>
  <tp-bubble align="end" variant="tinted">
    The updated design is ready for review.
    <tp-button slot="reactions" size="xs" aria-label="Like this message; 2 likes"
      >Like · 2</tp-button
    >
  </tp-bubble>
</tp-bubble-group>
```

Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css` before rendering.

| Property / attribute                 | Values                                                           | Default   |
| ------------------------------------ | ---------------------------------------------------------------- | --------- |
| `variant`                            | default, secondary, subdued, tinted, outline, ghost, destructive | secondary |
| `align`                              | start, end; logical sender alignment                             | start     |
| `reactionSide` / `reaction-side`     | block-start, block-end                                           | block-end |
| `reactionsAlign` / `reactions-align` | start, end                                                       | end       |
| `label`                              | text describing the message container                            | Message   |

The default slot accepts rich message content; `reactions` accepts named controls or
plain counts. Empty reactions have no visible surface. Reaction side and alignment
are independent. Grouping adds no conversation state or announcements.
The named message container has `role="group"`; setting `label=""` removes both
the name and role, leaving an ordinary noninteractive content container.

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

## Compositions

The rendered Docs include seven treatments, short/wrapping/multiparagraph bodies, separate sender groups, reaction summaries and actions, logical alignment, and native button/link bodies with quick replies. The expandable example replaces its preview with the full message using Collapsible and an existing link Button, with Show more/Show less derived from the shared disclosure state. Examples compose existing public controls and are not extra catalog variants.
