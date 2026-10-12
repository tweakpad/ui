# Cursor fixture

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP. Append
`?built` to load the built package. The library dev server may listen only on the IPv6 loopback;
use `http://[::1]:5173/` when `localhost` resolves to another server.

- `index.html`: a document-scope cursor (`#base`), zones for every option (state with a template and
  adopted properties, blend, stick center and bounds, physics override, nested outer/inner, native
  passthrough around a Text area), a region-scope cursor inside a Card, a dot plus lagging ring pair
  with a zone addressing the ring, a Dialog with a zone inside it (top layer), a reduced-motion
  cursor, an empty `#host` and `#scratch` for the contract, and an event `#log`.
- `fixture.ts`: `cursorFixture` with `movePointer(x, y, type, target?)`, `press`, `release`, `leave`,
  `enterZone`, `leaveZone` (constructed pointer and boundary events: API evidence only),
  `sampleFollow(root, frames)`, `events`, `diagnostics`, `layoutShifts` and `$`.
- `contract-checks.js`: `cursorContract.run()` checks defaults and reflection, pointer gating (touch
  never engages, stops following), outside and region scope, the follower series and settlement,
  velocity across a reversal, reduced motion, the shared and optional native lease, the lease reaching
  shadow parts and a native zone restoring them, zone state and the cancelable notification, innermost
  resolution and `for`, adoption and template cloning, native passthrough, stick center and bounds
  with resize, zone physics override, pressed, programmatic state and veto, disabled, lifecycle,
  accessibility attributes, an interactive template and layout stability.

## Through Chrome DevTools MCP

1. Navigate to `http://[::1]:5173/tests/fixtures/components/cursor/` and wait for `html[data-ready]`.
2. Evaluate `await cursorContract.run()`; the promise rejects with the failing keys.
3. Real pointer: take a snapshot and `hover` the "View zone" button, the "Stick bounds" button, the
   Text area and the region card; after each, read `#base` markers (`data-following`,
   `data-cursor-state`, `data-stuck`, `data-native`) and the last `#log` line. `click` a zone button
   for `data-pressed` evidence.
4. Top layer: `click` "Open dialog", hover the button inside it and take a screenshot: the ring must
   paint above the dialog and its backdrop.
5. Screenshots in light and dark (`emulate` color scheme) over the View zone and a stuck button;
   the DevTools screenshot never contains the OS pointer, so `cursor: none` is verified through
   computed styles only.
6. Reduced motion: `motion-policy="reduce"` on `#reduced` (API). The OS preference cannot be emulated
   through the MCP; record it as blocked.
7. Inject `/node_modules/axe-core/axe.min.js` and run `axe.run(document.querySelector('main'))`.
8. Standalone tree-shaking:
   `http://[::1]:5173/tests/fixtures/components/standalone/?component=TpCursor` defines only Cursor and
   its zone; the Button in the markup stays undefined.
