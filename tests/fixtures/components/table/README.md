# Table fixture

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP. Append
`?built` to load the built package.

1. Navigate to `http://localhost:5173/tests/fixtures/components/table/` and wait for
   `html[data-ready]`.
2. `await tableContract.nativeTableStyle()`: the authored native `<table>` keeps its element
   identity and its cells receive the shared cell padding (ported from the former repair smoke).
