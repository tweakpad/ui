# Color picker fixture

Browser verification of `tp-color-picker`, driven only through the Chrome DevTools MCP tools
(never another driver). The record lives in `plans/widgets/color-picker/implementation-checklist.md`.

1. `npm run dev` (Vite on port 5173), then open
   `http://localhost:5173/tests/fixtures/widgets/color-picker/` with `new_page` or
   `navigate_page`; `?built` loads `dist/` instead of `src/` after `npm run build`.
2. `wait_for` the text `After picker`; `html[data-fixture-ready]` marks the bootstrap.
3. `take_snapshot` lists every dimension input (slider role), field (spinbutton), Select,
   Button, tab and tabpanel with its accessible name. Use `click`, `drag`, `press_key` and `fill`
   on those uids for real input, and `evaluate_script` for synthetic pointer sessions
   (`PointerEvent` on a surface's `.surface` element) when a mid-gesture step such as Escape or
   `pointercancel` is needed.
4. `window.colorPickerAPI` exposes `events` (lane events recorded on the pickers),
   `leaked` (constituent events that reached the document), `clear()`, `settle()`,
   `create(attributes)` (a dynamic instance under `#dynamic`), `snapshotState(id)` and the
   assertion helpers of `api.ts` (`assertValueLanes`, `assertNestedEventBoundary`,
   `assertForms`, `assertField`, `assertSwatches`, `assertRecent`, `assertHarmony`,
   `assertPalette`, `assertHandlePress`, `assertTriangleMapping`, `assertPopup`, `assertPopupHeader`, `assertCleanup`). Each helper
   returns `{ checks, records, passed }`.
5. `take_screenshot` for visual evidence under `tmp/component-verification/color-picker/<run>/`;
   `emulate` for color scheme, viewport and device pixel ratio.

Instances: `#inline` (area), `#popup` (five application-supplied `recent` colors), `#sliders` (HSL), `#wheel` (triad), `#triangle`,
`#schemes` (area, swatches, schemes with saved swatches), `#field` inside `tp-field`,
`#narrow-picker` (240px), `#rtl`, plus `#before` / `#after` focus stops and the `#reset` button
of the surrounding form.
