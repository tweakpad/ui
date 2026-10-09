# Menu fixtures

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP.

- `index.html` + `fixture.ts` + `api.ts`: the Menu family API fixture; `browser-steps.md`
  lists its pointer/keyboard handoff.
- `regressions.html` + `regression-checks.js`: checks ported from the former Playwright repair
  smoke script. Append `?built` to load the built package.

## regressions.html through Chrome DevTools MCP

1. Navigate to `http://localhost:5173/tests/fixtures/components/menu/regressions.html` and wait
   for `html[data-ready]`.
2. `await menuRegressions.commands()`: closed by default, a `menuitemcheckbox` activation keeps
   the menu open and toggles `aria-checked`, a cancelled `tp-action` keeps the checked state and
   the open menu, and a command closes the menu.
3. `await menuRegressions.menubarAtomicCancellation()`: with menu A open, a vetoed open proposal
   on menu B leaves A open and the menubar value `a`.
4. Keyboard (tool-driven) on `#actions`: click the trigger, press `End`; `menuRegressions.state()`
   reports `active: "link"`. Press `Escape`; `state()` reports `open: false` and
   `triggerFocused: true`.
5. Submenu (tool-driven): `await menuRegressions.openParent()`, press `ArrowRight` with focus on
   the Child trigger (`ArrowDown` first to reach it); `menuRegressions.submenuState()` reports
   both menus open and `active: "child-command"`. Press `ArrowLeft`: child closed, parent open,
   focus on the child trigger. Open the child again and press `Escape`: only the child closes.
6. Hover paint: hover `First` in the open parent; `menuRegressions.state('parent').highlighted`
   contains `first` and its computed background is not transparent.
