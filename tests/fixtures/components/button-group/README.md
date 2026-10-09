# Button Group fixtures

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP.

- `index.html`: integration compositions (mixed controls, separator, popup trigger, nested
  groups, Input Group, Select, text label, Toggle Group) for visual and interaction review.
- `contract.html` + `contract-checks.js`: the joined-geometry contract ported from the former
  Playwright button smoke script. Append `?built` to load the built package.

## contract.html through Chrome DevTools MCP

1. Navigate to `http://localhost:5173/tests/fixtures/components/button-group/contract.html`
   and wait for `html[data-ready]`.
2. Evaluate `await buttonGroupContract.run()`. It builds a three-member group (button, disabled
   button, link) and checks joined corners and seams, native member semantics, single typography
   resolution, the focused disabled member's raised z-index, paired text/icon size geometry,
   vertical corners and seams with unchanged DOM order, the unjoined gap and `role="group"`
   labelling. The promise rejects with the failing keys.
