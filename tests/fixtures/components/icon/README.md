# Icon fixtures

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP.

- `index.html` + `fixture.ts`: every definition of the text-editing icon modules (`@tweakpad/ui/icons/text-formatting`, `text-blocks`, `text-align`, `link`, `table-editing`, `arrows`, `ellipsis`, `image-plus`, `at-sign` and `ban`) in `tp-icon` at 16, 24 and 48 pixels, grouped by module with a label per row; the sided pairs (text alignment, column insertion, left and right arrows) side by side; and labelled and decorative icons for the accessibility tree.
- `?package` loads the built package (`/dist/register/icon.js` and `/dist/icons/<module>.js`) after `npm run build`.
- `?scheme=light` or `?scheme=dark` pins one theme for screenshots.

## index.html through Chrome DevTools MCP

1. Open `http://localhost:<port>/tests/fixtures/components/icon/` in a new tab and wait for `html[data-fixture-ready]`.
2. Evaluate `await iconFixture.assertGeometry()`. Every path has a length and lies inside the 24×24 view box (one unit of slack for round caps), and every host measures its size. The promise resolves with the definition, icon and path counts and rejects with the failing definitions.
3. Evaluate `await iconFixture.assertSemantics()`. Icons without a label are `aria-hidden="true"` with no role; labelled icons are `role="img"` named by their label.
4. `take_snapshot`: the three labelled icons appear as images with their names; no decorative icon appears.
5. `take_screenshot` with `?scheme=light`, then with `?scheme=dark`, and inspect one theme at a time: strokes follow the text color, round caps and joins, no clipped artwork, and the sided pairs point to opposite sides.
6. Repeat steps 1 to 3 with `?package` after `npm run build`.
