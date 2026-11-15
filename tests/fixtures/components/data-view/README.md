# Data view fixture

Browser verification of `tp-data-view`, driven only through the Chrome DevTools MCP tools (never
another driver). The record lives in `plans/components/data-view/implementation-checklist.md`.

1. `npm run dev` (Vite on port 5173), then open `http://localhost:5173/tests/fixtures/components/data-view/`;
   `?built` loads `dist/` after `npm run build`.
2. `wait_for` the text `After data views`; `html[data-fixture-ready]` marks the bootstrap.
3. Views:
   - `#many`: 10,000 rows at `sm`, cell navigation, single selection. `dataViewAPI.window('many')`
     reports the mounted rows (about the visible rows plus twice the overscan) and the scroll state;
     Control+End reaches the last row and PageDown moves by a viewport.
   - `#rows`: row navigation; Up from the first row reaches the sortable headers, Left and Right
     rove among them, Enter or Space sorts.
   - `#manual`: `sorting="manual"`; the owner reorders with `sortDataViewRows` on `tp-sort-change`.
   - `#controlled`: a controlled selection whose owner refuses offline stations.
   - `#links`: a renderer with links; a press on a link does not select, Enter on the cell moves
     into the link and Escape returns to the cell.
   - `#wide`: more columns than width; the header scrolls with the rows.
   - `#rtl`: right to left at `lg`; arrows mirror.
   - States: `#loading` (placeholder rows), `#loading-rows` (busy with rows), `#empty`,
     `#empty-slot`, `#error` (Retry fires `tp-retry`).
   - `#table`: a Table beside the views, to compare the shared look.
4. `take_snapshot` shows each grid's headers, rows and cells. Use `click` and `press_key` for real input.
5. `window.dataViewAPI` exposes `events` (lane, activation and retry events by element id),
   `clear()`, `get(id)`, `window(id)` and `mountedIds(id)`.
6. Inject `/node_modules/axe-core/axe.min.js` with `evaluate_script` and run `axe.run(document)`.
