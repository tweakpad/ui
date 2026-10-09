# Tooltip fixtures

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP.

- `index.html` + `fixture.ts`: provider delays, detached handles, clipping, scrolling and
  layered-surface regressions (`window.tooltipAPI`, `tooltipProvider`, `tooltipHandle`).
- `regressions.html` + `regression-checks.js`: ported from the former Playwright repair smoke
  script. Append `?built` to load the built package.

## regressions.html through Chrome DevTools MCP

1. Navigate to `http://localhost:5173/tests/fixtures/components/tooltip/regressions.html` and
   wait for `html[data-ready]`.
2. `await tooltipRegressions.triggerReplacement()`: with the tooltip open, replacing the trigger
   restores the old trigger's authored `aria-describedby`, describes the new trigger, and removing
   the tooltip releases the description again.
