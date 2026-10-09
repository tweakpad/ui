# Accordion fixture

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP. Append
`?built` to load the built package. The page renders the configurations that were previously
Storybook stories (variants, disabled item, disabled root, mixed indicator positions, multiple,
retained, find-in-page, external line-by-line motion, reduced motion); Storybook keeps only the
Default, PositionalContent and ExternalLineByLineMotion compositions.

## Through Chrome DevTools MCP

1. Navigate to `http://localhost:5173/tests/fixtures/components/accordion/` and wait for
   `html[data-ready]`.
2. `await accordionContract.runAll()` runs the evaluate-only checks ported from the former
   Playwright scripts: variant chrome expectations, disabled-item isolation, the external
   line-by-line driver (claimed content requests, staggered paragraph animations,
   `data-tp-motion-driven`), reduced-motion skipping the driver, a root `partPresentation`
   override reaching the cross-shadow trigger part, reconnection keeping the open item, and
   closed content retained / `hidden="until-found"`.
3. Tool-driven: click the Billing trigger inside `#disabled-item`, then evaluate
   `await accordionContract.billingOpened()` (value `billing`, Account hidden, animations
   settled). Click the disabled Security trigger: `accordionContract.value('disabled-item')`
   stays unchanged.
4. Keyboard: Tab into `#plain`, use ArrowDown/ArrowUp/Home/End between triggers and Enter/Space
   to toggle; the disabled Security trigger in `#disabled-item` is skipped (`tabindex="-1"`).
5. Screenshots of `#plain`, `#line`, `#outline`, `#separated` and `#mixed-indicators` in light
   and dark color schemes document the appearance; run the Storybook a11y panel on the
   Accordion Default story for Axe results.
