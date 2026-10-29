---
'@tweakpad/ui': patch
---

Table cells take their layout from ordinary CSS on the Table and its parts:

- `white-space` reaches the cells from the Table, a row or a cell. Cells still keep their text on one line by default; `white-space: normal` wraps a prose column.
- `inline-size`, `min-inline-size`, `max-inline-size`, `vertical-align` and `text-align` set on a `tp-table-head` or `tp-table-cell` reach its native cell, so `style="inline-size:8rem"` sizes the column.
- The Table is a focusable region named by `label` only while it scrolls; a Table that fits is no longer a Tab stop or a landmark, and the table keeps its name.
- `styles.css` lays out a Table and its parts as a table before the elements are defined, so server-rendered tables no longer show as inline text until the script loads.
