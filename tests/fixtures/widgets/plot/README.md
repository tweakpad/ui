# Plot verification

Serve the library with Vite and open `/tests/fixtures/widgets/plot/` through Chrome DevTools MCP.
No samples or benchmark timers run automatically after the initial data setup.

- `fixture.push(1)` appends one frame to both signed graphs; `fixture.replace(95)` revises the tail.
- `fixture.compare()` compares the displayed Canvas pixels and returns incremental counters.
  Compare at equal canvas sizes and decoration settings. Integer alignment should match;
  fractional presentation has normal antialias differences (record mean and >24-channel fraction).
- Set both plots' `series` to line/area/signed/multiseries/linear/step configurations and compare
  ordinary push, latest retraction, gaps, wraparound and a jump beyond the window.
- Optional axes, background, guides, legend and interaction are properties on each plot.
  Use real MCP clicks/hover and keys for inspection. End/Left/Home and Escape must leave data intact.
- Set `maxFrameRate=0`: writes, theme and resize remain dirty without painting; `renderNow()` paints.
  `paused` and default offscreen suspension also stop paints. Reconnect after detaching to check cleanup.
- Inspect light/dark and scoped chart tokens, RTL, narrow containers, DPR 1/1.25/2/high-cap,
  zero layout, context restoration, missing data and all four reference styles.
- `await fixture.benchmark(1, 'incremental', 1024)` measures twenty explicit paint updates; a
  seventh argument `true` paints the area as a gradient.
- `await fixture.hover(2000, 60)` moves the pointer sixty times over an inspected static plot and
  reports the full redraws hovering caused (none: hover only moves the overlay) and the cost of an
  explicit full redraw; `fixture.dashboard()` measures 32 plots on a shared scheduler.
  Repeat with capacity 16384, `full`, then count 32. Run separately, while builds/tests are idle.
  This is an opt-in paint stress test, not a claim about total GPU cost or a 10 Hz scheduler.
  Use a Chrome trace for raster/composite/GC and separate scheduling checks at the intended rate.
- Framework props/smoke rows live under `tests/fixtures/frameworks/{react,vue}/`.

Record actual results under `plans/widgets/plot/`, with local logs under `tmp/component-verification/plot/`.

- `verifyPlotRaster` in `raster-check.ts` accepts `sliding` (default true), `updates` (default 40)
  and `gradient` (default false), which turns both fills into gradient areas.
  Compare the two-viewport atlas with the legacy linear cache and full renderer; 400 sparse updates
  exercise repeated atlas compaction. This fixture uses readback-friendly test canvases only.
- `await verifySmoothPlot()` from `smooth-check.ts` compares the real element's clock-follow
  composition with full rendering through 30 seconds of simulated timestamps, fractional shifts,
  repeated atlas compaction and capacity wrap. It yields each display frame and releases both plots.
  It is an opt-in raster check, not a performance benchmark.
