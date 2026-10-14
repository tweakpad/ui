# Emoji picker fixture

Browser verification of `tp-emoji-picker`, driven only through the Chrome DevTools MCP tools
(never another driver). The record lives in `plans/widgets/emoji-picker/implementation-checklist.md`.

1. `npm run dev` (Vite on port 5173), then open
   `http://localhost:5173/tests/fixtures/widgets/emoji-picker/` with `new_page` or
   `navigate_page`; `?built` loads `dist/` instead of `src/` after `npm run build`, and
   `?only=<id>` keeps one instance for small accessibility snapshots and focused input.
2. `wait_for` the text `After picker`; `html[data-fixture-ready]` marks the bootstrap.
3. `take_snapshot` lists each picker's category tabs, the search combobox, the options of the
   mounted window and the skin tone Button (its menu of tone radio items once opened);
   `verbose: true` also shows the named groups (root, one per listed category). Use `click`,
   `hover`, `type_text` and `press_key` on those uids for real input: typing filters, arrows move
   in the grid (Left and Right follow the reading direction), Home and End reach the ends, Enter
   picks.
4. `window.emojiPickerAPI` exposes `events` (lane events on the pickers), `leaked` (constituent
   events that reached the document), `clear()`, `settle()`, `create(attributes)` (a dynamic
   instance under `#dynamic`), `windowStats(id)`, `revealState(id)`, `syntheticDataset()` and
   the assertion helpers of `api.ts`: `assertDefaults`, `assertValueLanes`, `assertQueryAndTone`,
   `assertDataSources`, `assertFormsAndStates`. Each returns `{ checks, passed }`; run them in
   that order after a fresh load.
5. Inject `/node_modules/axe-core/axe.min.js` with `evaluate_script` and run `axe.run(document)`.
6. Measure typing on `#large` with an Event Timing observer and compare the handler time
   (`processingEnd - processingStart`) against a bare `<input>` on the same page: keys sent by
   the tools carry a fixed delivery delay in `duration`.
7. `take_screenshot` for visual evidence under `tmp/component-verification/emoji-picker/<run>/`;
   `emulate` for color scheme and viewport.

Instances: `#default` (inline, built-in dataset), `#popup` (trigger and Popover), `#required`
(popup inside `tp-field`), `#custom` (custom group with a duplicate id, application-supplied
`recent`), `#sm`, `#lg` (seven columns), `#disabled`, `#readonly`, `#plain` (no category bar,
preview, skin tone selector or sticky labels), `#fill` (consumer block size), `#rtl`,
`#adapter` (the dataset adapter over the local `emojibase/` sample, no network), `#failing` (a
source that rejects; Retry), `#large` (1,824 synthetic glyphs with `emoji-version="100"`), plus
`#before` / `#after` focus stops and the `#reset` button of the surrounding form.
