# Table fixture

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP. Append
`?built` to load the built package.

1. Navigate to `http://localhost:5173/tests/fixtures/components/table/` and wait for
   `html[data-ready]`.
2. `await tableContract.nativeTableStyle()`: the authored native `<table>` keeps its element
   identity and its cells receive the shared cell padding.

## layout.html (cell layout from parts, conditional region, pre-definition)

Navigate to `http://localhost:5173/tests/fixtures/components/table/layout.html` on a fresh load and
wait for `html[data-ready]`. `window.tableLayout` exposes the checks; each throws with the failing
keys.

1. `tableLayout.preDefinition()`: before registration (recorded by an inline script) the undefined
   Table is a block and its parts take table display values, laid out as rows and cells.
2. `await tableLayout.wrapping()`: `white-space: normal` on the Table and on one cell wraps those
   cells; other cells stay `nowrap`; the caption wraps.
3. `await tableLayout.partLayout()`: `inline-size: 8rem` on a head renders a 128 px column,
   `min-inline-size` and `vertical-align: top` on a cell reach it, the default stays `middle`.
   Chrome ignores `max-inline-size` on table cells, so only its computed value is checked.
4. `await tableLayout.conditionalRegion()`: only the Table that scrolls is a named region with
   `tabindex="0"`; resizing switches both, and the fitting Table stays named.
5. Keyboard: from the top of the page, `Tab` lands on the scrolling Table only.
