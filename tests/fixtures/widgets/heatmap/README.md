# Heatmap fixture

Browser verification of `tp-heatmap`, driven only through the Chrome DevTools MCP tools (never
another driver). The record lives in `plans/widgets/heatmap/implementation-checklist.md`.

1. `npm run dev` (Vite on port 5173), then open `http://localhost:5173/tests/fixtures/widgets/heatmap/`
   with `new_page` or `navigate_page`; `?built` loads `dist/` after `npm run build`.
2. `wait_for` the text `After heatmaps`; `html[data-fixture-ready]` marks the bootstrap. Data is
   deterministic and `today` is fixed at 2026-11-13.
3. Heatmaps:
   - `#year`: the default arrangement (week columns by weekday rows), stretched; the cell four days
     before today carries the hint `Release Atlas shipped`.
   - `#separated`: `groups="separated"` with Monday-first weeks: one block of columns per month,
     one cell apart; a week across a month's start splits into the days before the 1st and the days
     from it, and arrows cross the split without a stop.
   - `#separated-trim`, `#separated-scroll`: the same blocks trimmed to the latest whole widths
     and scrolling; `#separated-vertical` separates week rows into months.
   - `#vertical`: months by day of the month for 2026; February 29–31, April 31 and the other
     missing dates have no cell; at 18rem the month labels take their narrow form.
   - `#scroll`, `#scroll-vertical`: `fit="scroll"` across and down; both open at the latest data,
     and `heatmapAPI.scroll(id)` shows `left` at `maxLeft` (or `top` at `maxTop`).
     `heatmapAPI.append(id)` adds a day: a viewport resting at the end stays there; scroll away
     first and it keeps its place. The Scroll area's edges shade only where cells lie beyond.
   - `#trim`: only the latest weeks that fit, ending with 2026-11-13.
   - `#hours`: weekdays by hour of the day, cells combining two weeks (ids `column:row`).
   - `#square`: sixteen columns of circles over 256 index keys, without labels.
   - `#range`: `selection-mode="range"`; `#rtl` mirrored; `#loading` pulsing level-0 cells.
4. `take_snapshot` lists each grid, its row headers and its cells by name. Use `click`, `hover` and
   `press_key` for real input:
   - hovering or focusing a cell opens the tooltip with its value, date and hint;
   - arrows move a week (columns) or a day (rows), skipping missing cells, mirrored in `#rtl`;
     Home and End reach the row ends, Control+Home and Control+End the first and last cell,
     PageUp and PageDown a month, Shift with them a year; Escape closes the tooltip;
   - in `#range`, two presses (or Enter on two cells) select a range: the cells between them carry
     `data-range-middle` and `heatmapAPI.events` records `tp-value-change` and `tp-value-commit`.
5. `window.heatmapAPI` exposes `events` (lane, inspection and activation events by element id),
   `clear()`, `get(id)`, `scroll(id)` and `append(id)`.
6. Inject `/node_modules/axe-core/axe.min.js` with `evaluate_script` and run `axe.run(document)`.
