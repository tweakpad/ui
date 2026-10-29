# Tree view fixtures

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP. Append
`?package` to load the built package (`npm run build` first).

- `index.html`: markup, RTL, form, virtualized, disabled/read-only and empty trees; events in
  `window.treeFixture.events`.
- `markup-motion.html` + `markup-motion.ts`: expand/collapse motion of markup items.
- `standalone.html`: registering `tp-tree-view` alone defines its constituents (`window.standalone`).
- `page-focus-rule.html`: page-level `:focus` and `:focus-visible` outlines (both `!important`).

## page-focus-rule.html

A focused item shows only the library ring on its row, never a page ring around the item host.

1. Click `Before`, press `Tab`, then `ArrowDown`. `focusRings()` must return `focusVisible: true`,
   `host: "none"` and a `solid` row outline; the screenshot shows one ring on `Alpha one`.
2. Click `Beta`. `focusRings()` must return `focusVisible: false`, `host: "none"`; the screenshot
   shows no dashed page ring around the item.
