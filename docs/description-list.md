# Description list

`tp-description-list` presents label–value pairs, such as the properties of a record, the details of an order or the settings of a project. Each `tp-description-list-item` names its value with a `label` and holds the value as content. Set `limit` to show only the first items; a Show more button below the list reveals the rest and turns into Show less while they show.

```html
<tp-description-list limit="3">
  <tp-description-list-item label="Plot">B-14, east terrace</tp-description-list-item>
  <tp-description-list-item label="Gardener">Mara Lindqvist</tp-description-list-item>
  <tp-description-list-item label="Status">
    <tp-badge variant="success">Active</tp-badge>
  </tp-description-list-item>
  <tp-description-list-item label="Size">3 × 4 m</tp-description-list-item>
  <tp-description-list-item label="Water access">Shared tap, row C</tp-description-list-item>
</tp-description-list>
```

## Items

An item's `label` is its visible label, and the item's content is the value: text, links, or other components such as a Badge, a Time or a Copy button. Changing `label`, or adding, removing or moving items, updates the list.

Only items are shown. Place `tp-description-list-item` elements directly inside the list, in the order they should read; other children are not shown, and the list reports a `tp-diagnostic` event with the code `description-list-child`.

## Layout

Three attributes arrange the list:

- `orientation` sets the direction of the pairs. `vertical` (the default) stacks them; `horizontal` places them side by side and wraps them onto further lines, which suits a summary row above a record.
- `layout` sets each pair. `inline` (the default) places the label beside its value; `stacked` places it above. Set `layout` on an item to change one pair, such as a long note that should run under its label.
- `align="center"` aligns each label toward its value. In an inline list the labels align to the end of their column so they meet the values in the middle, and Show more starts with the values; stacked pairs center, and so does Show more.

In a vertical list, inline labels share one column whose width follows the widest label, up to 40% of the list, so values line up. Long labels and values wrap, and the layout follows the writing direction.

```html
<tp-description-list orientation="horizontal" layout="stacked">
  <tp-description-list-item label="Status">Active</tp-description-list-item>
  <tp-description-list-item label="Type">Premium</tp-description-list-item>
  <tp-description-list-item label="Owner">Mara</tp-description-list-item>
  <tp-description-list-item label="Created">Jan 15, 2026</tp-description-list-item>
</tp-description-list>
```

## Show more

`limit` is the number of items shown while the list is closed. When there are more items, the rest are hidden and a link-style Show more button follows the list. Activating it opens the list: the hidden items expand into place below the visible ones, the button reads Show less, and its chevron turns up. Activating it again closes the list. Without a `limit`, with a `limit` below one, or with no more items than the limit, every item shows and there is no button.

Hidden items are not shown, focusable or announced. In a vertical list they keep their place in the layout below the visible ones, so their labels count toward the label column and opening the list never moves the values above. In a horizontal list they take no space until the list opens.

The list is closed by default. Set `default-open` to start open, or control `open` yourself. The button proposes each change through a cancelable `tp-open-change` event; call `preventDefault()` to keep the current state, or update `open` from `onOpenChange`. `tp-open-change-complete` follows once the items finish expanding or collapsing. `disabled` keeps the button from changing the state.

Change the button text with `messages`. Each text is a string or a function that receives the number of hidden items and the total:

```js
list.messages = {
  showMore: ({ hidden }) => `Show ${hidden} more`,
  showLess: 'Show fewer',
};
```

Set `hidden-until-found` to let the browser's find in page search hidden items: a match opens the list. While the list is closed, the browser does not lay hidden items out, so with this option their labels size the label column only once the list opens.

## Accessibility

The list renders one native description list: each item's label is a term and the item itself is the description. The Show more button is a native button named by its text, with an expanded state and a control relationship to the hidden items. Focus stays on the button when it opens or closes the list; the newly shown items come before it in reading and tab order. Use `messages` to name the button more specifically when a page has several lists, for example "Show more plot details".

## API

### `tp-description-list`

| Property / attribute                      | Type                                                                                       | Default     | Meaning                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------- |
| `limit`                                   | number \| null                                                                             | `null`      | Items shown while closed. Unset, below one or not a number shows every item. |
| `open`                                    | boolean                                                                                    | `false`     | Whether the items beyond the limit show. Reflects.                           |
| `defaultOpen` / `default-open`            | boolean                                                                                    | `false`     | Initial open state when `open` is not set.                                   |
| `hiddenUntilFound` / `hidden-until-found` | boolean                                                                                    | `false`     | Lets find in page search hidden items and open the list on a match.          |
| `orientation`                             | `vertical`, `horizontal`                                                                   | `vertical`  | Pairs stack, or sit side by side and wrap.                                   |
| `layout`                                  | `inline`, `stacked`                                                                        | `inline`    | Each label beside its value, or above it.                                    |
| `align`                                   | `start`, `center`                                                                          | `start`     | `center` aligns each label toward its value.                                 |
| `disabled`                                | boolean                                                                                    | `false`     | Keeps the Show more button from changing the state.                          |
| `messages`                                | `{ showMore?: DescriptionListMessage; showLess?: DescriptionListMessage }` (property only) | English     | Button text: `Show more` and `Show less`.                                    |
| `onOpenChange`                            | `(event) => void` (property only)                                                          | `undefined` | Called with each accepted `tp-open-change` event.                            |
| `items`                                   | read-only: `tp-description-list-item[]`                                                    | —           | The items, in document order.                                                |
| `hiddenCount`                             | read-only: number                                                                          | —           | Number of items beyond the limit.                                            |
| `triggerElement`                          | read-only: `HTMLButtonElement \| null`                                                     | —           | The native button of Show more, when it renders.                             |
| `listElement`                             | read-only: `HTMLElement \| null`                                                           | —           | The native `dl`.                                                             |
| `viewportElement`                         | read-only: `HTMLElement \| null`                                                           | —           | The region that clips the list to the visible items while it is closed.      |

`DescriptionListMessage` is a string or a function `({ hidden, total }) => string`.

| Event                     | Detail                                                      | Meaning                                                                   |
| ------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| `tp-open-change`          | `{ value, previousValue, reason, sourceEvent }`, cancelable | Proposes a new open state; `reason` is `trigger-press` or `programmatic`. |
| `tp-open-change-complete` | `{ open }`                                                  | The items finished expanding or collapsing.                               |
| `tp-diagnostic`           | `{ code: 'description-list-child', message, severity }`     | A child that is not an item is not shown.                                 |

Slot: the default slot takes `tp-description-list-item` elements.

### `tp-description-list-item`

| Property / attribute | Type                       | Default | Meaning                                                |
| -------------------- | -------------------------- | ------- | ------------------------------------------------------ |
| `label`              | string                     | `''`    | Label text, presented as the term. Reflects.           |
| `layout`             | `inline`, `stacked`, unset | unset   | Layout of this pair; unset follows the list. Reflects. |

Slot: the default slot takes the value.

## Styling

Labels use the muted foreground and values the foreground, both at the small text size. The Show more button is a composed link Button in the muted foreground, so Button tokens and dictionary entries apply. Public parts:

| Part                             | Element                                            |
| -------------------------------- | -------------------------------------------------- |
| `description-list-viewport`      | The region that clips the list while it is closed. |
| `description-list`               | The list (`dl`).                                   |
| `description-list-item`          | One label–value pair (`div`).                      |
| `description-list-label`         | A label (`dt`).                                    |
| `description-list-value`         | A value (`dd`), holding the item.                  |
| `description-list-trigger`       | The composed `tp-button` of Show more.             |
| `description-list-trigger-label` | The button text.                                   |
| `description-list-indicator`     | The button chevron, a `tp-icon`.                   |

The list sets `data-open` or `data-closed` and `data-disabled` on its host and on the viewport, list, button text and chevron parts, and `data-limited` on its host while items are beyond the limit. Pairs carry `data-layout` (`inline` or `stacked`), pairs beyond the limit `data-overflow`, and `data-concealed` while hidden; the host carries `data-inline` while any pair is inline. While the list opens and closes, the viewport's height moves between `--description-list-collapsed-height` (the visible items) and `--description-list-height` (every item). Use `partPresentation`, `partContracts` or the presentation dictionary to change a part; for example, `partContracts = { 'description-list-trigger-label': { content: ({ open, hidden }) => (open ? 'Hide' : hidden + ' more') } }` replaces the button text.
