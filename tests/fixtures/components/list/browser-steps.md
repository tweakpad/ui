# List checks (Chrome DevTools MCP)

1. Open `/tests/fixtures/components/list/` on the existing Vite server. Run `await (await import('/tests/fixtures/components/list/api.ts')).verifyList()` through MCP evaluation. Expect 15 assertions. Repeat with `?package` after `npm run build`.
2. Inspect the accessibility tree: a list named `Recent files` with two list items, and the standalone row outside any list.
3. Compare the Storybook Components/List docs with the List item docs captured before the rename: every example list keeps its size and row geometry; Separators and People keep their dividers.
4. Regressions: the Flow inspector Wiring tab lists Incoming and Outgoing connections as named lists; Menu rows composed from list items keep zero row padding; workspace overview, Map and Marker lists are named lists.
