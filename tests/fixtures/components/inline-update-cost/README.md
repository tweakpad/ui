# Inline control update cost

What one value change of an inline control costs, for a panel that updates many controls per
frame. `index.html` mounts 40 instances of one kind (slider, number and text input, select,
checkbox, switch, color input) with `variant="inline"` and a controlled value, in one shadow root.
Instance 0 carries a `partPresentation` class and style hook on a part rendered through
`renderPart`. Driven only through the Chrome DevTools MCP tools.

## Serving and opening

1. Build the package (`npm run build`) and start Vite with Lit's production build, in the
   background: `NODE_ENV=production ./node_modules/.bin/vite --port 5180 --strictPort`.
2. To compare against another revision, build it and copy its `dist` to
   `tmp/inline-update-cost/dist-baseline` (gitignored).
3. Open your own tab at
   `http://127.0.0.1:5180/tests/fixtures/components/inline-update-cost/index.html?package`
   (`?package=baseline` loads the copy; without the parameter the sources load). Keep it in the
   foreground: a background tab pauses `requestAnimationFrame`.
4. Wait for `html[data-fixture-ready]`, then call the API through `evaluate_script`, racing each
   awaited call against a timeout under 5 s.

## API (`window.inlineUpdateCost`)

- `mount(kind)`: replaces the stage with 40 instances of `kind` (`kinds` lists them).
- `counters(changes = 20)`: real value changes, one instance at a time, each followed by every
  update and frame it causes. Returns per-change averages: Lit updates, presentation `refresh()`
  calls, style text writes, `querySelectorAll` calls, mutation records in every shadow root, and
  the no-op records (an attribute or text set to the value it already had), by attribute.
- `startTiming(rounds = 5, frames = 45)` and `timingResult()`: each frame changes 30 instances
  and flushes each with `performUpdate()`. Reports the median synchronous µs per update and the
  frame work (from the frame's timestamp to the first task after it) as median and p95. The
  first 5 frames of each round are dropped.
- `safety()`: forces `refresh()` on every library element and reports the differences in adopted
  sheets, `part`, `class`, `style` and `data-tp-presentation-*`. It also checks that the probe
  hook is on every target of its part. A skipped presentation pass that lost something shows up
  here.
- `hookIntact()`: the hook check alone, without a forced refresh.

## Expected

- `safety()` reports 0 differences and `hookIntact: true` for every kind, after `counters()`
  and after timing.
- A value change runs no presentation `refresh()`, no style text write and no
  `querySelectorAll` beyond the controls' own, and few no-op records.
