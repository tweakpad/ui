# Easing editor fixture

Browser verification of `tp-easing-editor`, driven only through the Chrome DevTools MCP tools
(never another driver). The record lives in `plans/widgets/easing-editor/implementation-checklist.md`.

1. `npm run dev` (Vite on port 5173), then open
   `http://localhost:5173/tests/fixtures/widgets/easing-editor/` with `new_page` or
   `navigate_page`; `?built` loads `dist/` instead of `src/` after `npm run build`.
2. `wait_for` the text `After editor`; `html[data-fixture-ready]` marks the bootstrap.
3. `take_snapshot` lists every handle and point input (slider role, "Label: Control point 1
   Time" / "Label: Point 2 Progression"), parameter Slider, field (spinbutton), Select, Toggle,
   Button, tab and the frames image. Use `click`, `drag`, `press_key` and `fill` on those uids
   for real input, and `evaluate_script` for synthetic pointer sessions (`PointerEvent` on the
   graph's `.surface` element) when a mid-gesture step such as Escape or `pointercancel` is
   needed.
4. `window.easingEditorAPI` exposes `events` (lane events recorded on the editors), `leaked`
   (constituent events that reached the document), `clear()`, `settle()`, `create(attributes)`
   (a dynamic instance under `#dynamic`) and the assertion helpers of `api.ts`
   (`assertValueLanes`, `assertNestedEventBoundary`, `assertForms`, `assertKinds`,
   `assertPresets`, `assertCompact`, `assertDuration`, `assertAdapters`, `assertGraph`,
   `assertPoints`, `assertFrames`, `assertPreview`, `assertCleanup`). Each helper returns
   `{ checks, records, passed }`.
5. `take_screenshot` for visual evidence under `tmp/component-verification/easing-editor/<run>/`;
   `emulate` for color scheme, viewport and reduced motion.

Instances: `#extended` (ease-out, presets beside the graph), `#compact` (overshoot Bézier,
presets overlay), `#spring`, `#parametric` (no preset picker), `#custom` (no time control,
scale preview with a square), `#field` inside `tp-field` (required), `#narrow-editor` (300 px,
`size="sm"`), `#disabled`, `#readonly`, `#rtl`, plus `#before` / `#after` focus stops and the
`#reset` button of the surrounding form.
