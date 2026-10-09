# Input Group fixture

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP. Append
`?built` to load the built package.

1. Navigate to `http://localhost:5173/tests/fixtures/components/input-group/` and wait for
   `html[data-ready]`.
2. `await inputGroupContract.actionInheritance()`: setting `actionVariant`/`actionSize` on the
   group updates the action without authored values and leaves the explicit `outline`/`sm`
   action untouched (ported from the former repair smoke).
3. `await inputGroupContract.singleBoundary()`: the grouped `tp-input`'s native input has a
   `0px` border, so the group paints one field boundary.
