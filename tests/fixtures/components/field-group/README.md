# Field group fixture

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP. Append
`?built` to load the built package.

- `index.html`: the compositions used for visual and interaction review (size pair, X/Y/Z,
  RGB with the alpha editor apart, vertical, separator, mixed members with Select, Native
  select, Toggle and a Menu trigger, read-only/disabled editors, a form, a narrow container
  and RTL) plus an empty `#host` for the contract.
- `contract-checks.js`: the joined-geometry contract (`fieldGroupContract.run()`) and a
  `geometry(id)` helper for the fixture groups.

## Through Chrome DevTools MCP

1. Navigate to `http://localhost:5173/tests/fixtures/components/field-group/` and wait for
   `html[data-ready]`.
2. Evaluate `await fieldGroupContract.run()`. It builds a three-editor group in `#host` and
   checks the joined corners and seams, equal editor widths, `role="group"` naming, the
   `field-group-control` alias on each member boundary, independent values, vertical corners
   and seams with unchanged DOM order, the unjoined gap and corners, and seam updates after a
   member is removed. The promise rejects with the failing keys.
3. Evaluate `fieldGroupContract.geometry('rgb')` (or any fixture id) to read member boxes,
   radii, borders and part tokens.
4. Tool-driven: click into the Width editor of `#size`, type a value, Tab to Height; press the
   Lock toggle and open the More menu in `#mixed`; submit `#form` and read `#form-output`
   (`x=4 y=-2`): each editor keeps its own name and value.
5. Take screenshots of the page in light and dark color schemes and at a 420px viewport; run
   axe through `evaluate_script` for the accessibility result.
