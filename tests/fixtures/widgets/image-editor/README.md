# Image editor fixture

Browser verification of `tp-image-editor`, driven only through the Chrome DevTools MCP tools (never
another driver). The record lives in `plans/widgets/image-editor/implementation-checklist.md`.

1. `npm run dev` (Vite on port 5173), then open
   `http://localhost:5173/tests/fixtures/widgets/image-editor/` with `new_page` or
   `navigate_page`; `?built` loads `dist/` after `npm run build`. The images are the original
   samples under `src/stories/assets/images/`.
2. `wait_for` the text `After image editors`; `html[data-fixture-ready]` marks the bootstrap.
3. Editors:
   - `#inspect`: the whole harbor contained, with the zoom, fit, actual-size, rotate and reset
     controls. The wheel zooms toward the pointer, a sideways wheel pans, a drag pans; `1` shows
     100% (`zoom` 1) and `0` fits again.
   - `#avatar`: a fixed circle with `fit="cover"`: the image never leaves a gap inside the circle,
     at any zoom or pan; outside the circle is dimmed.
   - `#adjustable`: a 16:9 region with handles and guides. A drag inside moves it, outside pans;
     every handle keeps 16:9; the region stays on the image (cover). Escape during a drag puts it
     back.
   - `#pan-drag`: `region-drag="pan"`: a drag inside the region pans the image; only handles change
     the region.
   - `#free`: a free region with minimums 80×60 over a transparent sticker (the checker shows);
     Shift keeps the shape while resizing; `pinch-rotate`.
   - `#none`: `fit="none"` with `min-zoom="4rem"` (the longer side never under 64px) and
     `wheel="pan"`.
   - `#controlled`: an owner writes every proposal back rounded to whole pixels; commits arrive
     after the write-back.
   - `#rtl`: mirrored text direction; image space stays physical, the controls mirror.
   - `#error`: a missing image shows the fallback message; `tp-error` is recorded.
   - `#disabled`: no gestures, keys or control presses.
   - `#form-editor` in `#form`: `name="crop"` submits the value as JSON; the reset button restores
     the initial value.
   - `#cooperative` inside `#scroller`: plain wheels scroll the box; Control or Meta wheels zoom.
4. `take_snapshot` lists each editor as a group with its role description, its value text and, when
   adjustable, the crop region group. Use `click`, `press_key` and `hover` for real input:
   arrows pan (Shift coarse, Alt fine), `+`/`-` zoom, `0` fits, `1` shows 100%, Home/End reach the
   zoom bounds, `[`/`]` turn a quarter. On a focused region, arrows move it and Alt with an arrow
   resizes it.
5. Mobile: `emulate` with `viewport: '400x800x2,mobile,touch'`. One-finger pans are real touch input
   through the drag tool's single move only (`drag`); pinches and twists use
   `imageEditorAPI.pinch(id, scale, twist)`, which dispatches synthetic touch pointers and proves
   the gesture logic, not the device. Under a coarse pointer the handles' hit area grows to 20px
   around the 12px marker. A real-device pass opens the Storybook stories on a phone.
6. `window.imageEditorAPI` exposes `events` (lane and load events by element id), `clear()`,
   `get(id)`, `pinch(id, scale, twist)`, `region(id)`, `exported(id, maxSize)` and `formData()`.
7. Inject `/node_modules/axe-core/axe.min.js` with `evaluate_script` and run `axe.run(document)`.
