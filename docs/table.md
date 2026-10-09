# Table

Compose `tp-table` with `tp-table-header`, `tp-table-body`, `tp-table-footer`,
`tp-table-row`, `tp-table-head`, `tp-table-cell`, and `tp-table-caption`.
The components render native table elements internally and preserve their column
layout and accessible row/header relationships. Table does not own interactive-grid
state. Compose existing Input, Select, Menu, Button, Badge and Pagination controls.

```html
<tp-table label="Recent invoices">
  <tp-table-caption>Recent invoices</tp-table-caption>
  <tp-table-header
    ><tp-table-row>
      <tp-table-head scope="col">Invoice</tp-table-head>
      <tp-table-head scope="col">Amount</tp-table-head>
    </tp-table-row></tp-table-header
  >
  <tp-table-body
    ><tp-table-row>
      <tp-table-head scope="row">INV001</tp-table-head>
      <tp-table-cell>$250.00</tp-table-cell>
    </tp-table-row></tp-table-body
  >
  <tp-table-footer
    ><tp-table-row>
      <tp-table-head scope="row">Total</tp-table-head>
      <tp-table-cell>$250.00</tp-table-cell>
    </tp-table-row></tp-table-footer
  >
</tp-table>
```

Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css`.

## Properties

| Property / attribute                               | Type                 | Default      | Meaning                                                                                             |
| -------------------------------------------------- | -------------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| `label`                                            | string               | `Data table` | Name of the focusable overflow region. A native caption names/describes the table itself.           |
| `layout`                                           | `automatic`, `fixed` | `automatic`  | Native table layout algorithm.                                                                      |
| `selectionPresentation` / `selection-presentation` | `none`, `row`        | `none`       | Enables appearance for explicit application-owned row selection.                                    |
| `stickyHeader` / `sticky-header`                   | boolean              | `false`      | Pins the complete header, including multiple header rows, to the scrollport's block start.          |
| `stickyFooter` / `sticky-footer`                   | boolean              | `false`      | Pins the footer/totals to block end. Independent of the header.                                     |
| `stickyStartColumns` / `sticky-start-columns`      | nonnegative integer  | `0`          | Number of first logical columns pinned at inline start.                                             |
| `stickyEndColumns` / `sticky-end-columns`          | nonnegative integer  | `0`          | Number of last logical columns pinned at inline end. Start columns take priority if counts overlap. |

The default slot accepts the constituent regions above. Head and Cell expose
`colSpan`/`colspan` (default 1) and `rowSpan`/`rowspan` (default 1; zero spans the
remaining region). Head exposes `scope` (`col` by default, or `row`, `colgroup`,
`rowgroup`). Row exposes `selected` (false); enable root `selectionPresentation="row"`
to show application-owned selection. Hover never changes selection.

One authored native `table` is also supported; its selected rows carry
`data-selected`. Native and custom composition
share the same overflow, geometry and theme owner. Do not mix the two anatomies
within one Table or add interactive-grid roles.

## Sticky composition

Constrain the Table host with ordinary CSS, such as
`max-block-size: calc(var(--tp-spacing) * 72)`. Use normal table/column CSS for
content width. The component measures actual column geometry; it has no fixed
column-width or spacing attributes. Logical edges follow RTL automatically.
Header, footer and either group of columns can be enabled independently.

Rowspan/colspan relationships remain native. A cell spanning across a pinned/unpinned
boundary stays unpinned. Column offsets update after native layout changes,
resizing, inserted/removed rows or changed spans. Neither pointer movement nor
remeasurement resets the scroll position. Owned geometry is released on disconnect
or when the native table is replaced; author styles are restored.

## Parts and appearance

Canonical parts are `table`, `table-table`, `table-caption`, `table-header`,
`table-body`, `table-footer`, `table-row`, `table-column-header`, and `table-cell`.
Each constituent exposes its corresponding native part with the same Table recipes,
`partPresentation`, `partContracts`, and inherited theme/dictionary. Apply a cell
part override on that cell constituent. The root owns `table` (overflow container)
and `table-table`. Authored native-table descendants keep their existing root-level
part registration for compatibility.

The library theme controls type, spacing, borders, row emphasis and sticky
backgrounds. Geometry markers are `data-sticky` on pinned header/footer,
`data-sticky-column` on pinned cells and `data-last-row` on cells that reach the end of
a body or footer, which drop their bottom border. Table exposes no component-specific state
change events or imperative methods.

The examples cover every reference use case: basic table, totals footer, simple
rows, status badges, action menus, Select assignments and Input quantities. The
sticky example combines scrolling with pinned headers, logical edge columns and
totals. Its data and calculations are application-owned.

Constituent exports: `TpTableHeader`, `TpTableBody`, `TpTableFooter`, `TpTableRow`,
`TpTableHead`, `TpTableCell`, `TpTableCaption`. Their default slots accept the next
level of composition; cells/caption accept arbitrary content. `nativeElement` is a
read-only reference to the rendered native constituent. Usage examples live in Docs;
they are not extra Table variants or sidebar stories.
