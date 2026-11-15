# File explorer fixture

Served by the Vite dev server, driven only through Chrome DevTools MCP. Append `?built` to load
the built package.

1. Navigate to `http://localhost:5173/tests/fixtures/widgets/file-explorer/` and wait for
   `html[data-fixture-ready]`.
2. `#full` is the whole explorer over a memory source with about two thousand plate scans, a
   details pane and an application column whose metadata loads lazily.
3. `#picker` is a single-folder, read-only compact list: no sidebar, no search, single selection.
4. `#slow` answers every operation after 900 ms, so loading, search and metadata states show.
5. `fileExplorerAPI.events` records the explorer's lane proposals and `tp-open`.
