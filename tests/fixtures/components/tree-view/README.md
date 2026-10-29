# Tree view fixtures

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP. Append
`?package` to load the built package (`npm run build` first).

- `index.html`: markup, RTL, form, virtualized, disabled/read-only and empty trees; events in
  `window.treeFixture.events`.
- `markup-motion.html` + `markup-motion.ts`: expand/collapse motion of markup items.
  `assertMarkupMotion()` checks the first render, a collapse and an expand on a fresh load;
  `assertMove()` moves an expanded tree in a scrolled column (`moveBefore`, then `append`) and
  checks that no open group replays its entry and that `moveBefore` keeps the scroll position.
- `standalone.html`: registering `tp-tree-view` alone defines its constituents (`window.standalone`).
- `page-focus-rule.html`: page-level `:focus` and `:focus-visible` outlines (both `!important`).

## page-focus-rule.html

A focused item shows only the library ring on its row, never a page ring around the item host.

1. Click `Before`, press `Tab`, then `ArrowDown`. `focusRings()` must return `focusVisible: true`,
   `host: "none"` and a `solid` row outline; the screenshot shows one ring on `Alpha one`.
2. Click `Beta`. `focusRings()` must return `focusVisible: false`, `host: "none"`; the screenshot
   shows no dashed page ring around the item.
