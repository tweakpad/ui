Overflow list wraps a set of items, such as tags, labels or people, and keeps it within a number of items or rows. The items that do not fit are replaced by one count of the omitted items, `+3` by default, at the end or at the start.

```html
<tp-overflow-list limit="3">
  <tp-badge variant="outline">Stoneware</tp-badge>
  <tp-badge variant="outline">Matte glaze</tp-badge>
  <tp-badge variant="outline">Hand-thrown</tp-badge>
  <tp-badge variant="outline">Food-safe</tp-badge>
  <tp-badge variant="outline">Speckled</tp-badge>
</tp-overflow-list>
```

## Items

The items are the element children of the list, in document order, except elements with the `hidden` attribute and the element in the `count` slot. Adding, removing, moving or hiding a child updates the list in place. Text directly inside the list is not shown; wrap it in an element.

Items keep their own markup and attributes. The list does not add roles, names or focus behavior to them, so interactive items keep their own semantics.

## Limits

`limit` shows at most that many items. Fractions are dropped, and a value below one means no limit.

`max-rows` fits as many items as the available width allows within that many wrapped rows, with the count beside them. An item wider than a row takes a row of its own. With nothing to omit, every item shows and no count renders; when not even one item fits beside the count, the count shows alone.

The two combine: with both, the fit never shows more than `limit` items.

`collapse-from` chooses which items are omitted. `end` (default) keeps the first items and places the count after them. `start` keeps the last items and places the count before them.

## Fitting rows

A list with `max-rows` takes its width from its container and refits when the container resizes, an item or the count changes size, fonts load, items change, or `limit`, `max-rows` or `collapse-from` change. Many lists that refit together share one layout pass.

The list never changes height for a partition that has not been refitted yet, so the content below it only moves when the number or height of its fitted rows changes.

In a table cell, a flex row or a grid track, the list asks for the width of its items on one row (the first `limit` items when there is a limit) and can shrink down to the width of the count, so the track sizes as if nothing were omitted. The list itself is a block that fills the width it is given; in a flex row, give it room to grow, for example `flex: 1`.

Items should keep their own width: an item that grows to fill its row (`flex-grow`) or that generates no box (`display: contents`) cannot be measured as one item and emits a `tp-diagnostic`.

## Omitted items

Omitted items stay in the document. They are not shown, cannot be focused or clicked, and are hidden from assistive technology. A focused item that becomes omitted loses focus, as any content that becomes inert does.

`hiddenItems` returns the omitted items in document order and `hiddenCount` their number. Use them to show the omitted items elsewhere, for example their labels in a popover. Leave the items in the list: moving them out changes the list and triggers a refit.

## The count

The default count is a secondary Badge. It shows `+N` with tabular figures, and assistive technology hears "N more" instead. `messages` replaces both texts:

```js
list.messages = {
  count: (hidden) => `+${hidden}`,
  countLabel: (hidden, total) => `${hidden} of ${total} skills hidden`,
};
```

Each message is text or a function of the omitted and the total item counts.

### Custom count

An element in the `count` slot replaces the default count while items are omitted and is not shown otherwise. It gets no generated content: update it from `tp-overflow-change`.

```html
<tp-overflow-list max-rows="1">
  <tp-badge variant="outline">First aid</tp-badge>
  <tp-badge variant="outline">Forklift</tp-badge>
  <tp-badge variant="outline">Sound desk</tp-badge>
  <span slot="count">
    <tp-popover label="More skills">
      <tp-button slot="trigger" variant="outline" size="xs"></tp-button>
      <ul></ul>
    </tp-popover>
  </span>
</tp-overflow-list>
```

```js
list.addEventListener('tp-overflow-change', () => {
  button.textContent = `+${list.hiddenCount}`;
  button.setAttribute('aria-label', `${list.hiddenCount} more skills`);
});
```

The count element needs a box of its own: wrap components whose host has no box, such as Popover, in an element. A custom count must state the number of omitted items in text, visibly or through its accessible name. Only the first element in the `count` slot is used; further ones are not shown and emit a `tp-diagnostic`.

## Accessibility

The list adds no role, name or landmark. Omitted items are absent from the accessibility tree and the focus order, and the default count is plain text that is not focusable, read as "N more". When the items form a list, give the list `role="list"` and each item `role="listitem"`.

## API — `tp-overflow-list`

| Property / attribute             | Type; default                          | Behavior                                                                                              |
| -------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `limit`                          | number; unset                          | Most items shown. Fractions are dropped; below one means no limit.                                    |
| `maxRows` / `max-rows`           | positive integer; unset                | Most rows of the available width; the items that do not fit are omitted.                              |
| `collapseFrom` / `collapse-from` | `end \| start`; `end`                  | Side whose items are omitted; the count takes their place. Reflected.                                 |
| `messages`                       | `OverflowListMessages` (property only) | `count` (visible, `+N`) and `countLabel` (accessible, `N more`): text or `(hidden, total) => string`. |
| `hiddenCount` (read only)        | number                                 | The number of omitted items.                                                                          |
| `hiddenItems` (read only)        | `Element[]`                            | The omitted items, in document order.                                                                 |

The host reflects `data-overflowing` while at least one item is omitted.

### Slots

| Slot      | Content                                                             |
| --------- | ------------------------------------------------------------------- |
| (default) | The items: element children that are not `hidden`.                  |
| `count`   | An element that replaces the default count while items are omitted. |

### Events

| Event                | Detail                                          | When                                                                                                                                                                                 |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tp-overflow-change` | `{ value, previousValue, reason, sourceEvent }` | The omitted items changed, after the list settled. `value` is the omitted count; `reason` is `initial` for the first partition after connecting, otherwise `layout`. Not cancelable. |
| `tp-diagnostic`      | `{ code, message, severity }`                   | An invalid `limit` or `max-rows`, text children, an item that cannot be measured, or a second count element; once per case.                                                          |

A list that is not rendered, for example inside a closed panel, waits until it renders before it fits or emits `tp-overflow-change`.

## Composition and presentation

Use Badge for tags and labels, and Button with Popover, Menu or Dialog in the `count` slot when the omitted items should be reachable. The list paints no surface and separates items with the shared chip gap.

Parts: `overflow-list` (the wrapping row of items and the count) and `overflow-list-count` (the default count Badge). Customize through `partContracts`, `::part(overflow-list)` (for example its `gap`) or `::part(overflow-list-count)`.

Exported class: `TpOverflowList`. Exported types: `OverflowListMessages`, `OverflowListMessage`, `OverflowCollapseFrom`. Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css`.
