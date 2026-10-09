# Card fixture

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP.
`index.html` renders the presentation configurations that were previously Storybook stories
(elevated, borders off, section colors off, both off, small) next to the default card. Append
`?built` to load the built package.

## Through Chrome DevTools MCP

1. Navigate to `http://localhost:5173/tests/fixtures/components/card/` and wait for
   `html[data-ready]`.
2. `await cardContract.shadowOnly()`: toggling `elevated` on `#default` adds a box shadow and
   leaves border, fill and width unchanged (ported from the former repair smoke).
3. `await cardContract.partialPaddingOverride()`: a `partPresentation` style hook on
   `card-content` changes only `padding-inline-start`.
4. `cardContract.configurations()` returns each card's border width, shadow, header/content
   fills and content padding for comparing the configurations with the Default card; take
   screenshots in light and dark color schemes.
