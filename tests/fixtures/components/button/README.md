# Button fixtures

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP.

- `index.html` + `fixture.ts`: part-contract verification (`window` records).
- `contract.html` + `contract-checks.js`: the browser contract ported from the former Playwright
  smoke script. Append `?built` to load the built package (`npm run build` first).

## contract.html through Chrome DevTools MCP

Navigate to `http://localhost:5173/tests/fixtures/components/button/contract.html` and wait for
`html[data-ready]`. `window.buttonContract` exposes the checks; every `verify*`/`runAll` call
throws with the failing keys.

1. Evaluate-only contract: `await buttonContract.runAll()` (form semantics in native and
   `tp-form` forms, icon/loading marks, slot restoration, RTL, spinner color, link semantics,
   reduced-motion transitions).
2. Keyboard activation (tool-driven): `buttonContract.armActivationCounter()`, press `Enter`
   then `Space` with the key tool, then `buttonContract.activations()` must be `2`.
3. Pressed displacement: `buttonContract.controlTop()` at rest; while the pointer is held down on
   `#default` the value is `rest + 1`, and it returns to `rest` on release. MCP has no held
   pointer tool, so record this scenario as blocked unless a drag with zero travel can hold it.
4. Hover colors: `selectors = await buttonContract.prepareHover()`; for each selector
   (`[data-color-case="<case>"] tp-button[data-hover-variant="<variant>"]`), evaluate
   `buttonContract.sampleHover(case, variant, 'before')`, hover it with the hover tool, wait
   350ms, evaluate `sampleHover(case, variant, 'after')`. Finish with
   `buttonContract.verifyHover()` (contrast, transitions, overlay parity, token responsiveness).
5. Disabled hover: `await buttonContract.prepareDisabledHover()`, then per variant
   `sampleDisabled(variant, 'before')`, hover, `sampleDisabled(variant, 'after')`, and
   `verifyDisabledHover()`.
6. Link hover and focus: `await buttonContract.prepareLinkHover()`, `sampleLink('before')`,
   hover `[data-link-hover-case]`, `sampleLink('after')`, `verifyLinkHover()`; move the pointer
   away, press `Tab` until the link control has keyboard focus, then `verifyLinkFocus()`.
7. State combinations (former configuration stories) render in `#states` for visual review:
   loading leading/trailing with focusable disabled, disabled, focusable disabled, synthetic
   action.

Repeat in light and dark color schemes through emulation where the check does not already
create its own color regions.
