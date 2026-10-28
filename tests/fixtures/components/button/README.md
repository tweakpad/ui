# Button fixtures

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP.

- `index.html` + `fixture.ts`: part-contract verification (`window` records).
- `contract.html` + `contract-checks.js`: the browser contract. Append `?built` to load the built package (`npm run build` first).

## contract.html through Chrome DevTools MCP

Navigate to `http://localhost:5173/tests/fixtures/components/button/contract.html` and wait for
`html[data-ready]`. `window.buttonContract` exposes the checks; every `verify*`/`runAll` call
throws with the failing keys.

1. Evaluate-only contract: `await buttonContract.runAll()` (form semantics in native and
   `tp-form` forms, icon/loading marks, slot restoration, RTL, spinner color, link semantics,
   reduced-motion transitions, the empty Label of step 9).
2. Keyboard activation (tool-driven): `buttonContract.armActivationCounter()`, press `Enter`
   then `Space` with the key tool, then `buttonContract.activations()` must be `2`.
3. Pressed displacement: `buttonContract.controlTop()` at rest; while the pointer is held down on
   `#default` the value is `rest + 1`, and it returns to `rest` on release. MCP has no held
   pointer tool, so record this scenario as blocked unless a drag with zero travel can hold it.
4. Hover colors: `selectors = await buttonContract.prepareHover()`; for each selector
   (`[data-color-case="<case>"] tp-button[data-hover-variant="<variant>"]`), evaluate
   `buttonContract.sampleHover(case, variant, 'before')`, hover it with the hover tool, wait
   350ms, evaluate `sampleHover(case, variant, 'after')`. Finish with
   `buttonContract.verifyHover()`. Every variant paints its hover on the control's `::before`
   fill layer: the layer keeps one color and its opacity goes from `0` to `1` through an
   opacity transition, while the control's own fill, foreground and border stay unchanged and
   `background-color` never transitions. Contrast (at least 4.5) is measured against the
   composited fill: the nearest opaque backdrop, the control's fill and the layer at its
   opacity. Outline and ghost share the layer color and foreground and differ in their border;
   each variant's hover differs across the light, dark and scoped regions. A failure lists every
   failing case and condition.
5. Disabled hover: `await buttonContract.prepareDisabledHover()`, then per variant
   `sampleDisabled(variant, 'before')`, hover, `sampleDisabled(variant, 'after')`, and
   `verifyDisabledHover()`.
6. Link hover and focus: `await buttonContract.prepareLinkHover()`, `sampleLink('before')`,
   hover `[data-link-hover-case]`, `sampleLink('after')`, `verifyLinkHover()`; move the pointer
   away, press `Tab` until the link control has keyboard focus, then `verifyLinkFocus()`.
7. State combinations (former configuration stories) render in `#states` for visual review:
   loading leading/trailing with focusable disabled, disabled, focusable disabled, synthetic
   action.
8. Icon and chevron triggers render in `#triggers`: a default and a `sm` outline Button, each
   with an `icon-start` icon, a chevron `icon-end` icon, an `aria-label` and no Label text.
   Measure the control's inline padding, its marks, the gaps between them and whether the
   `button-label` part takes space; `take_snapshot` shows the `aria-label` as each name. The
   empty `button-label` part is `hidden` (`display: none`), so each trigger measures the
   icon-edge padding, the icon, one gap, the chevron and the icon-edge padding.
9. Empty Label (evaluate-only, also in `runAll()`): `await buttonContract.emptyLabel()` builds
   its cases in `#host` and removes them. In each text size an empty Label with two marks is
   `hidden`, the marks sit one gap apart and both edges take the padding of a labelled Button
   with both marks. In each icon size the Label stays, visually hidden. White space between
   marks keeps it hidden; an element child shows it. Text set later, a white-space text node
   edited in place to text and back, a child moved to `icon-end`, a `content` contract set and
   removed, `hostProperties: { hidden: false }` and the `icon` property each give the expected
   state after one update. An empty `sm` Button without `aria-label` reports one
   `button-accessible-name-missing` diagnostic; one with `aria-label` reports none.

Repeat in light and dark color schemes through emulation where the check does not already
create its own color regions.
