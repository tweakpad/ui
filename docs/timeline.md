# Timeline

`tp-timeline` arranges an ordered, finite sequence of `tp-timeline-item` elements along a vertical
or horizontal axis. Each item has a marker on the axis, connectors to its neighbours, content on
one side and optional opposite content on the other. One `value` marks the current item: earlier
items are complete and later ones upcoming. It is the backbone for step trackers, order and
pipeline status, roadmaps, phase lists, activity logs, conversations and changelogs. Item content
comes from other library components.

```html
<tp-timeline value="shipped" aria-label="Order status">
  <tp-timeline-item value="placed"><strong>Placed</strong> Mar 18</tp-timeline-item>
  <tp-timeline-item value="shipped"><strong>Shipped</strong> Mar 19</tp-timeline-item>
  <tp-timeline-item value="delivered"><strong>Delivered</strong> Mar 21</tp-timeline-item>
</tp-timeline>
```

The normative contracts are UI Foundation §18.20 and UI Component Library §21.19 (Timeline).
Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css`. To bundle only the timeline, call
`defineElement(TpTimeline.tagName, TpTimeline)`. That defines the items and the Separator used
for connector tracks.

## Status

With `value` set to an item's `value`, that item is `current`, earlier items are `complete` and
later items `upcoming`. With no `value`, or one that matches no item, items have no status. Their
dots and connectors stay neutral, which suits logs and changelogs. An item's own `status`
overrides only its own derived status. Use it for a skipped step, or for statuses set item by item
without a `value`. Duplicate non-empty values dispatch one `tp-diagnostic` warning; the first
matching item is current.

The connector between two items is complete when the earlier item is complete. It fills along
the axis. Timeline is display-only: it adds no focus stop, keyboard handling or selection, and
dispatches no change events. Links, buttons and Collapsibles inside items keep their own behavior.

## Sides and orientation

`align` places content on the `end` side of the axis (default), on the `start` side, or on
alternating sides (`alternate` starts on the end side, `alternate-reverse` on the start side).
An item's own `align` overrides its position-based side. Use it when the side follows meaning, as
in a conversation where each author has a side. For per-item sides, use `align="alternate"` on
the timeline so that both sides get equal space.

Sides are logical. In a vertical timeline, start and end are the inline start and end and mirror
in right-to-left text. In a horizontal timeline, start is above the axis and end below, and
items run in the inline direction, so a right-to-left timeline runs right to left.

`orientation="responsive"` is vertical below a 40rem inline size and horizontal above it. A
vertical alternating timeline puts every item on the end side below 40rem. Both use a container
query on the timeline. Horizontal items share the width equally, down to
`--tp-timeline-item-min-size`. A narrower container overflows, so wrap the timeline in a
horizontal [Scroll area](scroll-area.md) to scroll it.

Every marker stays on one axis track. In alternating and opposite layouts, the root grid's three
tracks (start, axis, end) are shared by every item through subgrid, so content length never moves
the axis. Content that grows, such as a Collapsible opening, lengthens the adjoining connectors.

## Markers and alignment

The `marker` slot replaces the default dot with any content: an Icon, a number, an Avatar or a
short label. The marker box is at least one line tall and centers its content, so a dot, an icon
or a number sits on the first line of the item's content. Larger markers, such as an Avatar,
align with the start of the content. When the first line of content is inset, add the inset to
`--tp-timeline-marker-offset`. A Collapsible pads its trigger by `--tp-space-2-5`:

```html
<tp-timeline value="foundation" style="--tp-timeline-marker-offset: var(--tp-space-2-5)">
  <tp-timeline-item value="foundation">
    <tp-collapsible
      ><span slot="label">Foundation and concrete</span>Footings poured.</tp-collapsible
    >
  </tp-timeline-item>
</tp-timeline>
```

## API — `tp-timeline`

| Property / attribute | Type                                                   | Default    | Behavior                                                  |
| -------------------- | ------------------------------------------------------ | ---------- | --------------------------------------------------------- |
| `orientation`        | `vertical` \| `horizontal` \| `responsive`             | `vertical` | Axis direction; responsive switches at 40rem.             |
| `align`              | `start` \| `end` \| `alternate` \| `alternate-reverse` | `end`      | Side of the axis holding item content.                    |
| `value`              | `string \| null`                                       | `null`     | Value of the current item; drives derived statuses.       |
| `messages`           | `TimelineMessages` (property only)                     | see below  | Localized status text: `complete`, `current`, `upcoming`. |
| `items`              | `readonly TpTimelineItem[]` (read-only)                | —          | Member items in order.                                    |

The host has the `list` role (set as an attribute unless you supply one), so `aria-label` and `aria-labelledby` name it directly. The default
messages are `Completed`, `Current` and `Not started` (`DEFAULT_TIMELINE_MESSAGES`).

Events: `tp-diagnostic` (`{ code: 'timeline-duplicate-value', message, severity: 'warning' }`).

## API — `tp-timeline-item`

| Property / attribute | Type                                          | Default | Behavior                                                  |
| -------------------- | --------------------------------------------- | ------- | --------------------------------------------------------- |
| `value`              | `string`                                      | `''`    | Identity matched by the timeline `value`.                 |
| `status`             | `complete` \| `current` \| `upcoming` \| `''` | `''`    | Overrides the derived status.                             |
| `align`              | `start` \| `end` \| `''`                      | `''`    | Places this item on one side; empty follows the timeline. |
| `index`              | `number` (read-only)                          | `-1`    | Position among the timeline's items.                      |
| `resolvedStatus`     | `TimelineStatus` (read-only)                  | `none`  | Own status when set, otherwise the derived one.           |
| `side`               | `start` \| `end` (read-only)                  | `end`   | Side holding the content.                                 |

Slots: default (content), `marker` (replaces the dot), `opposite` (content on the other side, such
as a date, time or version).

The timeline sets `role="listitem"` on each item, and `aria-current="step"` on the first current
item. Items with a status start with visually hidden status text, so status is never carried by
color alone. The dot and connectors are hidden from assistive technology. Supplied markers keep
their own semantics: give an Avatar its `alt`, and hide a visible step number with
`aria-hidden="true"`, since the list already conveys position.

State attributes on each item: `data-index`, `data-first`, `data-last`, `data-side`,
`data-orientation`, `data-alternate` (alternating timeline), `data-custom-marker`, and
`data-status` when the status is not `none`. Connector and dot parts carry `data-status`.

## Parts and customization

| Part                             | Element                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `timeline`                       | The root grid.                                                     |
| `timeline-item`                  | An item's subgrid row (vertical) or column (horizontal).           |
| `timeline-item-marker`           | The marker box around the slotted marker or the dot.               |
| `timeline-item-dot`              | The default marker.                                                |
| `timeline-item-connector-before` | Segment from the previous item to the marker; hidden on the first. |
| `timeline-item-connector-after`  | Segment from the marker to the next item; hidden on the last.      |
| `timeline-item-connector-fill`   | The fill drawn over a connector's Separator track when complete.   |
| `timeline-item-content`          | The content region (default slot).                                 |
| `timeline-item-opposite`         | The opposite region (`opposite` slot).                             |

Connector tracks are decorative [Separator](separator.md) instances and keep the Separator's
border color. The dot is a muted outline for upcoming and neutral items, a filled foreground
mark when complete, and a foreground ring with a muted halo when current. A complete connector
fill uses the foreground color. Timeline paints no surface.

| Custom property               | Default        | Meaning                                                     |
| ----------------------------- | -------------- | ----------------------------------------------------------- |
| `--tp-timeline-gap`           | `--tp-space-6` | Space between items along the axis.                         |
| `--tp-timeline-rail-gap`      | `--tp-space-3` | Space between the axis and the content or opposite content. |
| `--tp-timeline-item-min-size` | `8rem`         | Minimum size of a horizontal item.                          |
| `--tp-timeline-dot-size`      | `0.625rem`     | Size of the default dot.                                    |
| `--tp-timeline-marker-offset` | `0px`          | Extra block inset of a vertical marker.                     |

To align content toward the axis on the start side, style the part from the item's state, for
example `tp-timeline-item[data-side='start']::part(timeline-item-content) { text-align: end }`.

## Motion

When a connector becomes complete, its fill grows along the axis through the `connector` motion
role (state, phase `change`, context `status`, `index`, `connector`, non-blocking). A claiming
driver replaces the default transform transition. Under reduced motion the final state is
immediate. Status, side and membership changes never change an item's size.

Exported classes: `TpTimeline`, `TpTimelineItem`. Exported values: `DEFAULT_TIMELINE_MESSAGES`,
`timelineMotionRoles`. Exported types: `TimelineMessages`, `TimelineAlign`, `TimelineSide`,
`TimelineStatus`.
