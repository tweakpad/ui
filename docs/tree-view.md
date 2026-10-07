# Tree view

`tp-tree-view` presents a hierarchy that the reader expands, collapses, selects and activates:
file explorers, outlines, permission pickers. Contract: `ucl20-tree-view`; behavior: Foundation
§17.8 Tree, §19.24 Virtual list window and the tree reorder profile of §19.19 Drag-and-drop.

```html
<tp-tree-view label="Files" default-expanded='["src"]' default-value='["index.ts"]'>
  <tp-tree-item value="src">
    <tp-icon slot="leading" .icon="${folderIcon}"></tp-icon>src
    <tp-tree-item value="button.ts">button.ts</tp-tree-item>
    <tp-tree-item value="index.ts">index.ts</tp-tree-item>
  </tp-tree-item>
  <tp-tree-item value="package.json">package.json</tp-tree-item>
</tp-tree-view>
```

## Two ways to supply items

Both share selection, expansion, keyboard, typeahead, lazy loading, motion, events and styling.

- **Markup.** Nest `tp-tree-item` elements. Text and unnamed elements form the label; elements
  with `slot="leading"`, `slot="trailing"` or `slot="indicator"` go to those positions; nested
  items are the children. Your nodes are never moved or rewritten. Every authored item is in the
  DOM, so markup trees are not virtualized or reordered — use records for those.
- **Records.** Set `items` (controlled) or `defaultItems` (uncontrolled). The default record shape
  is `{ id, label, children?, hasChildren?, disabled? }`; any other shape works through
  `getItemId`, `getItemLabel`, `getItemChildren`, `isItemDisabled` and `itemHasChildren`.
  `renderItem(record, state)` returns the content of each row (it is placed inside the item, so
  `slot="leading"` and `slot="trailing"` work). Records mode renders flat rows with
  `aria-level`, `aria-setsize` and `aria-posinset`, which is what makes virtualization possible.

```js
tree.defaultItems = [
  { id: 'src', label: 'src', children: [{ id: 'index.ts', label: 'index.ts' }] },
  { id: 'remote', label: 'Remote', hasChildren: true },
];
tree.renderItem = (item, state) => html`
  <tp-icon slot="leading" .icon=${state.expandable ? folderIcon : fileTextIcon}></tp-icon>
  ${item.label}
`;
```

Identifiers are strings, unique within the tree. A repeated identifier keeps its first item and
raises one `tp-diagnostic` (`tree-view-duplicate:<id>`).

## Selection

`selection-mode` is `single` (default), `multiple` or `none`. The selection lane is a list of
identifiers: `value` (controlled) or `default-value` (a JSON array or space-separated ids).

- Single: pressing an item, Space or Enter selects only it.
- Multiple: pressing or Space toggles; Shift extends from the anchor; Control/Command toggles
  without moving the anchor; Shift+Arrow extends while moving; Shift+Space selects the range;
  Control+Shift+Home/End selects to an end; Control+A selects every visible enabled item.
- Disabled items stay focusable but are never selected by user input.

`checkbox-selection` shows a checked indicator in every row and exposes `aria-checked` on the
item itself (the indicator is not a second control). `selection-propagation` (multiple mode)
cascades: selecting an item selects its enabled descendants — including ones loaded later — and
parents derive checked, unchecked or `mixed` from their descendants.

## Expansion

The expansion lane is `expanded` (controlled) or `default-expanded`. Identifiers of items that
do not exist yet are kept and take effect when the items appear, so a default can name items
that load lazily.

With `expansion-trigger="item"` (default) pressing a row toggles it; with `indicator` only the
chevron does. `expandAll()` expands every known expandable item in one proposal;
`expandAll({ load: true })` also loads and expands their descendants, breadth-first.
`collapseAll()` collapses everything.

## Preselection

Defaults and controlled values are applied before the first render: the tree appears already
expanded and selected, without change events. The tab stop starts on the first visible selected
item. A virtualized tree scrolls its first window to that item. `revealItem(id, { focus,
select })` expands ancestors and scrolls an item into view later.

## Lazy loading

Mark items with `hasChildren` (records) or `has-children` (markup) and set `loadChildren`:

```js
tree.loadChildren = async (item, { signal }) => {
  const response = await fetch(`/api/folders/${item.id}`, { signal });
  return response.json(); // child records; markup trees append elements and return nothing
};
```

The first expansion starts one request per item. While it runs the item is `aria-busy` and a
loading line with a Spinner appears; a failure shows a Retry button (Enter on the item also
retries). Requests are aborted when the tree disconnects or the item is removed. A load that
returns no children leaves the item expandable but empty. `tp-loading-status-change` reports
`{ itemId, status, error }` with `status` `idle`, `loading`, `loaded` or `error`;
`loadingStatus(id)` reads it and `reloadChildren(id)` loads again.

## Virtualization

`virtualized` (records mode) mounts only the rows near the viewport, plus `overscan` rows on
each side (default 4). Give the tree a height (`block-size`, or a flex/grid track); without one
it uses the nearest scrolling ancestor. `item-size` is the row estimate in pixels (default: the
first measured row, which includes the separation between rows); rows are measured as they mount, so variable heights work. The focused row
stays mounted, and keyboard navigation and `focusItem()` mount a row before focusing it.

## Reordering

`reorderable` (records mode) adds a drag handle (a library Button) to every row.

- Pointer: drag the handle. Rows move as you drag; moving sideways changes the level by one
  indentation step per `--tp-tree-view-indent`.
- Keyboard: on a focused item press Control+Enter (Command+Enter). Up/Down move it, Left/Right
  change its level, Space or Enter drop, Escape cancels. Each step is announced with the level
  and parent.

An item can land before, after or inside any item, never inside itself. `canDrop(move)` vetoes
moves (for example to keep files out of files). Every move is proposed through the cancelable
`tp-items-change` with `detail.metadata.move = { itemId, fromParentId, fromIndex, toParentId,
toIndex }` and the next records in `detail.value`; with `items` controlled, apply them yourself.
Parents whose children change are rebuilt with `withItemChildren(record, children)` (default:
`{ ...record, children }`); every other record keeps its identity. `moveItem(id, { parentId,
index })` proposes a move from code.

## Keyboard

| Key        | Action                                             |
| ---------- | -------------------------------------------------- |
| Down / Up  | Next / previous visible item                       |
| Right      | Expand; on an expanded item, go to its first child |
| Left       | Collapse; otherwise go to the parent               |
| Home / End | First / last visible item                          |
| `*`        | Expand all siblings                                |
| Enter      | Activate (`tp-action`); selects in single mode     |
| Space      | Select (single) or toggle (multiple)               |
| Letters    | Typeahead over visible labels                      |

Right and Left swap in right-to-left documents. Keys typed into editable content inside an item
are left alone, and controls placed in an item (a Button in `trailing`, for example) keep their own
presses, Enter and Space.

The tree is one tab stop: the last focused item, else the first selected item, else the first
enabled item. When the focused item is hidden by a collapse, focus moves to the collapsed
ancestor; when it is removed, focus moves to the next visible item, else the previous one.

## API

### `tp-tree-view`

| Property                                                                            | Attribute               | Type                                         | Default                                                   | Description                                            |
| ----------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| `items`                                                                             | —                       | `T[]`                                        | —                                                         | Controlled records (records mode).                     |
| `defaultItems`                                                                      | —                       | `T[]`                                        | —                                                         | Uncontrolled records (records mode).                   |
| `value`                                                                             | `value`                 | `readonly string[]`                          | —                                                         | Controlled selection.                                  |
| `defaultValue`                                                                      | `default-value`         | `readonly string[]`                          | `[]`                                                      | Initial selection.                                     |
| `expanded`                                                                          | `expanded`              | `readonly string[]`                          | —                                                         | Controlled expansion.                                  |
| `defaultExpanded`                                                                   | `default-expanded`      | `readonly string[]`                          | `[]`                                                      | Initial expansion.                                     |
| `selectionMode`                                                                     | `selection-mode`        | `'none' \| 'single' \| 'multiple'`           | `'single'`                                                | Selection behavior.                                    |
| `selectionPropagation`                                                              | `selection-propagation` | `boolean`                                    | `false`                                                   | Multiple mode: cascade to descendants, derive parents. |
| `checkboxSelection`                                                                 | `checkbox-selection`    | `boolean`                                    | `false`                                                   | Checked indicator in every row.                        |
| `expansionTrigger`                                                                  | `expansion-trigger`     | `'item' \| 'indicator'`                      | `'item'`                                                  | What toggles expansion on press.                       |
| `loadChildren`                                                                      | —                       | `(item, { signal }) => Promise<T[] \| void>` | `null`                                                    | Loader for items with unloaded children.               |
| `virtualized`                                                                       | `virtualized`           | `boolean`                                    | `false`                                                   | Records mode: mount only nearby rows.                  |
| `itemSize`                                                                          | `item-size`             | `number \| null`                             | `null`                                                    | Estimated row extent in pixels.                        |
| `overscan`                                                                          | `overscan`              | `number`                                     | `4`                                                       | Rows mounted beyond each edge.                         |
| `reorderable`                                                                       | `reorderable`           | `boolean`                                    | `false`                                                   | Records mode: drag handles and keyboard reordering.    |
| `canDrop`                                                                           | —                       | `(move: TreeMove) => boolean`                | `null`                                                    | Consumer veto for moves.                               |
| `size`                                                                              | `size`                  | `'sm' \| 'default'`                          | `'default'`                                               | Row size.                                              |
| `guides`                                                                            | `guides`                | `'line' \| 'none'`                           | `'line'`                                                  | Indent guide lines.                                    |
| `label`                                                                             | `label`                 | `string \| null`                             | `null`                                                    | Accessible name (or use `aria-label`).                 |
| `messages`                                                                          | —                       | `TreeViewMessages`                           | `{}`                                                      | Loading, error, retry, handle and reorder texts.       |
| `getItemId`, `getItemLabel`, `getItemChildren`, `isItemDisabled`, `itemHasChildren` | —                       | accessors                                    | read `id`, `label`, `children`, `disabled`, `hasChildren` | Map records onto the tree.                             |
| `withItemChildren`                                                                  | —                       | `(item, children) => item`                   | `{ ...item, children }`                                   | Rebuilds a parent after a reorder.                     |
| `renderItem`                                                                        | —                       | `(item, state) => content`                   | `null`                                                    | Row content in records mode.                           |
| `name`, `form`, `required`, `disabled`, `readonly`                                  |                         |                                              |                                                           | Form participation; `readonly` allows expansion only.  |
| `visibleItems`                                                                      | —                       | `readonly string[]`                          | —                                                         | Read-only: visible rows in order.                      |

Methods: `expandAll({ load })`, `collapseAll()`, `expandItem(id)`, `collapseItem(id)`,
`toggleItem(id)`, `selectItem(id)`, `deselectItem(id)`, `selectAll()`, `clearSelection()`,
`revealItem(id, { focus, select })`, `focusItem(id)`, `reloadChildren(id)`,
`loadingStatus(id)`, `moveItem(id, { parentId, index })`. Lane changes from methods use reason
`imperative-action`. In multiple mode `selectItem` adds to the selection; in single mode it
replaces it.

Events:

| Event                      | Detail                                              | Cancelable                            | Reasons                                                                        |
| -------------------------- | --------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| `tp-value-change`          | `value`, `previousValue`, `reason`                  | yes                                   | `item-press`, `keyboard`, `imperative-action`, `form-reset`, `programmatic`    |
| `tp-expanded-change`       | `value`, `previousValue`, `reason`                  | yes                                   | `trigger-press`, `item-press`, `keyboard`, `imperative-action`, `programmatic` |
| `tp-items-change`          | `value`, `previousValue`, `reason`, `metadata.move` | yes                                   | `drag`, `keyboard`, `imperative-action`                                        |
| `tp-action`                | `value` (id), `item`, `sourceEvent`                 | yes: prevents selection and expansion | —                                                                              |
| `tp-loading-status-change` | `itemId`, `status`, `error`                         | no                                    | —                                                                              |

Forms: with `name`, each selected identifier is submitted as one entry, in tree order. Reset
restores the default selection; `required` is invalid while nothing is selected.

Slots: default (markup items), `empty` (shown when there are no items). Parts: `tree`,
`viewport`, `empty`, and in records mode `item` and `segment` (the region of rows entering or
leaving); item parts are exported from records rows.

### `tp-tree-item`

| Property      | Attribute      | Type             | Default           | Description                                 |
| ------------- | -------------- | ---------------- | ----------------- | ------------------------------------------- |
| `value`       | `value`        | `string`         | generated         | Item identifier.                            |
| `label`       | `label`        | `string \| null` | text of the label | Accessible label and typeahead text.        |
| `disabled`    | `disabled`     | `boolean`        | `false`           | Not selectable or expandable by user input. |
| `hasChildren` | `has-children` | `boolean`        | `false`           | Children are loaded by `loadChildren`.      |

Slots: default (label), `leading`, `trailing`, `indicator` (replaces the chevron; it still
follows expansion), nested items. Parts: `row` (`data-selected`, `data-expanded`,
`data-disabled`, `data-dragging`), `indent`, `indicator`, `checkbox` (`data-checked`,
`data-indeterminate`), `leading`, `label`, `trailing`, `handle`, `status`, `group`. The host
carries `role="treeitem"`, the ARIA states and `data-expanded`, `data-selected`, `data-loading`,
`data-error`.

## Accessibility

The root is a `tree` named by `label` (or `aria-label`), multiselectable in multiple mode. Each
item is a `treeitem` with level, position, set size, expanded, selected, checked and busy states.
There is one tab stop; arrows move focus. Indent, chevron and checked indicator are hidden from
assistive technology. Loading, errors and reorder steps are announced politely. Reorderable
items describe their keyboard shortcut.

## Customization

Rows use the navigation row recipe (Nova `SidebarMenuButton`): small text, medium control height
(`size="sm"`: small), accent fill on hover and when selected, medium weight when selected. Guides
use `--tp-border` under each ancestor's chevron. Tokens:

| Token                   | Default                                            |                      |
| ----------------------- | -------------------------------------------------- | -------------------- |
| `--tp-tree-view-indent` | `calc(var(--tp-space-2) + var(--tp-icon-size-md))` | One indentation step |

Style parts (`tp-tree-view::part(row)` in records mode, `tp-tree-item::part(row)` in markup),
replace presentation keys `tree-view-*` through a presentation dictionary, or replace whole
rows with `renderItem`.

## Motion

Expanding and collapsing use Collapsible's measured disclosure owner: the group (markup) or the
transient region of entering and leaving rows (records) animates its height through the
`disclosure` and `content` roles, and the chevron turns through `indicator`. Rapid reversal turns
around from the current height; bulk changes (`expandAll`, controlled updates with several items)
and very large expansions apply instantly. Reordered rows glide through the Drag-and-drop
`sort-displacement` role. Reduced motion makes all of it instant; external drivers can claim
every role through `tp-motion-request` (see [Motion](./motion.md)).
