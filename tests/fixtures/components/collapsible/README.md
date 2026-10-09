# Collapsible fixture

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP. Append
`?built` to load the built package. The page renders the state configurations that were
previously Storybook stories (open, disabled, retained, find-in-page, leading indicator,
label-aligned content with leading content, external line-by-line motion); Storybook keeps the
Default, LeadingContent, TrailingContent and ExternalLineByLineMotion compositions.

## Through Chrome DevTools MCP

1. Navigate to `http://localhost:5173/tests/fixtures/components/collapsible/` and wait for
   `html[data-ready]`.
2. `await collapsibleContract.runAll()` runs the evaluate-only checks ported from the former
   Playwright script: the closed contract (`aria-expanded`, `aria-controls`/`aria-labelledby`
   association, hidden content), label alignment in LTR and RTL with Leading content, retained
   and `hidden="until-found"` content, the disabled trigger, and the external line-by-line
   driver on exit and enter.
3. Tool-driven: click the `#default` trigger, then evaluate
   `await collapsibleContract.openedContract()` (expanded, `data-open` markers, visible content,
   baseline inset, label/paragraph alignment). Press `Space`/`Enter` on a focused trigger to
   toggle again.
4. Keyboard: Tab reaches each enabled trigger and skips `#disabled`.
5. Screenshots of every section in light and dark color schemes document the configurations;
   run the Storybook a11y panel on the Collapsible Default story for Axe results.
