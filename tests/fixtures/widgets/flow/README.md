# Flow fixture

Browser verification of `tp-flow`, driven only through the Chrome DevTools MCP tools (never
another driver). The record lives in `plans/widgets/flow/implementation-checklist.md`.

1. `npm run dev` (Vite on port 5173), then open
   `http://localhost:5173/tests/fixtures/widgets/flow/` with `new_page` or `navigate_page`;
   `?built` loads `dist/` instead of `src/` after `npm run build`. Never open the page with the
   `#large` instance already generated at 1000 nodes in a tab you keep: generate, measure, then
   close the tab (`close_page`) to keep the browser's memory low.
2. `wait_for` the text `After flow`; `html[data-fixture-ready]` marks the bootstrap.
3. `take_snapshot` lists every flow as an application region named by its `label`, its nodes as
   groups (roledescription "node"), the ports as buttons named "Node: Port input/output", the
   edge focus proxies as groups ("Edge from A to B, label"), the controls toolbar, the minimap
   image with its pan buttons, the palette, the inspector tabs and fields, and the context menu
   items while one is open. Use `click`, `drag` (node, port, waypoint, resizer handle, pane),
   `press_key` and `fill` on those uids for real input; use `evaluate_script` only for the
   helpers and for synthetic mid-gesture steps (`PointerEvent` on the pane for Escape or
   `pointercancel` during a drag, two-pointer sequences for pinch) and record them as synthetic.
   Vite reloads the page on source edits: browser calls first, file edits last, and a fresh
   snapshot after every reload (uids change).
4. `window.flowAPI` exposes `api` (the widgets module), `samples` (schemas, documents,
   `sampleRun`, `sampleTrace`, `generateDocument`), `flows` (the instances by id), `events`
   (lane events recorded on the flows), `leaked` (constituent events that reached the document),
   `clear()`, `settle()`, `generate(count, kind?)` (fills `#large`), `create(attributes)` (a
   dynamic instance under `#dynamic`) and the assertion helpers of `api.ts`: `assertValueLane`,
   `assertControlledOwners`, `assertLateAndNeverOwners`, `assertNestedEventBoundary`,
   `assertDeclarativeAdoption`,
   `assertViewport`, `assertWheelLatching` (dispatched wheel streams over the pane, a node and
   scrollable node content; the MCP has no wheel input), `assertNodeDrag`, `assertConnection`, `assertEdgeHandles` (hit-tested
   presses on a selected edge's handles), `assertMarquee`,
   `assertSelectionAndDelete`, `assertClipboard`, `assertUndoRedo`, `assertRouting`,
   `assertLayout`, `assertVirtualization`, `assertRunState`, `assertInspector` (schema placement,
   double press, follow and close), `assertContextMenuDismiss`, `assertToolbars` (eight panel
   positions, authored bars, zoom field, Shift+digit shortcuts, history events), `assertPaletteSidebar`
   (the "+" trigger, category sections, chips, search, keyboard insert, click-to-place, drop, fit),
   `assertPaletteMenu` (the "Add node" Dialog, columns, keyboard insert and focus, placement and
   Escape, dispatched drag, drop and cancel), `assertDeleteConfirmation`, `assertModes`, `assertForms`,
   `assertCleanup`, `assertPerformance`. Each helper returns `{ checks, records, passed }`. Run
   them in file order on a fresh load: several helpers mutate the instance they target and later
   helpers read the state the earlier ones leave behind.
5. `take_screenshot` for visual evidence under `tmp/component-verification/flow/<run>/`;
   `emulate` for color scheme, reduced motion, viewport size and coarse pointers. Run
   `performance_start_trace` / `performance_stop_trace` around a pan of `#large` after
   `generate(1000)` for the frame budget (p95 ≤ 16.7 ms, hosts ≤ the visible set plus overscan).
   Run axe through the Storybook a11y page
   (`http://localhost:6006/?path=/story/widgets-flow--default`, Accessibility tab) and keep the
   accessibility-tree, keyboard and automated results as separate evidence.

Instances: `#monitor` (workflow schema, card nodes, `sampleRun` bound), `#material` (panel nodes
with Select, Slider, Color picker, Checkbox and NumberField controls, port labels, palette),
`#declarative` (authored `tp-flow-node` / `tp-flow-edge` children and a `top-end` corner
Button), `#pipeline` (vertical compact nodes, orthogonal edges, palette,
`inspector-commit="explicit"`), `#rtl`, `#large` (empty until `generate()`; minimap),
`#controlled` (owner write-back; set `window.rejectControlled = true` to veto proposals),
`#late-owner` (writes every accepted proposal back 40 ms later; `lateWrites` lists them),
`#never-owner` (accepts proposals and never writes them back),
`#readonly`, `#view` (`mode="view"`), `#disabled`, `#narrow` (320 px, `size="sm"`), `#field`
inside `tp-field` within `#form` (`required`; the `#reset` button and the `#submitted` output),
plus `#before` / `#after` focus stops.
