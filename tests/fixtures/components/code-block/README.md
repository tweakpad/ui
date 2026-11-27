# Code block fixture

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP. Append
`?built` to load the built package.

- `index.html`: collapsible blocks with and without a title, shorter than the collapsed height,
  with line numbers and long lines, with wrapped lines, starting expanded, right to left, and one
  whose first `tp-value-change` proposal the page cancels (`#log` shows each proposal).
- `contract-checks.js`: `codeBlockContract.run()` checks that the Expand control fills its row
  (inline and block, up to the figure's end edge) while collapsed and expanded, its name,
  `aria-expanded` and controlled viewport, and the `trigger-press` proposals.

## Through Chrome DevTools MCP

1. Navigate to `http://localhost:5173/tests/fixtures/components/code-block/` and wait for
   `html[data-ready]`.
2. Evaluate `await codeBlockContract.run()`; the promise rejects with the failing keys.
3. Tool-driven: hover the Expand control of `#titled` and take a screenshot (the hover fill covers
   the whole row, rounded end corners included); click it and read `Collapse`; Tab to it and take
   a screenshot (the focus ring follows the row inside the figure); press Enter to collapse.
4. Click the Expand control of `#vetoed` twice and read `#log` (`vetoed`, then `accepted`).
5. Take light and dark screenshots.
