# Navigation Menu fixture

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP. Append
`?built` to load the built package. Geometry checks live in `../navigation-menu-geometry/`.

1. Navigate to `http://localhost:5173/tests/fixtures/components/navigation-menu/` and wait for
   `html[data-ready]`.
2. Click the `Products` trigger with the click tool, then evaluate
   `navigationMenuContract.disclosure()`: `value` is `products`, the content is visible and the
   trigger reports `aria-expanded="true"`.
3. `navigationMenuContract.nativeLinks()`: every `<a>` keeps native semantics (no `role`, in
   the tab order).
4. Click the `Product` link area to focus it (or press `Tab` into the content), press `Escape`
   with the key tool, then evaluate `navigationMenuContract.escapeRestored()`: the menu closes
   and focus returns to the trigger.

`navigationMenuContract.state()` returns the raw values for recording evidence.
