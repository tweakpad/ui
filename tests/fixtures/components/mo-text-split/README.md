# Text split checks (Chrome DevTools MCP)

Open the pages on the Vite server (`npm run dev`); append `?built` after `npm run build` to load the built package.

## `index.html`

`window.textLog` holds the split and reveal events, `window.layoutShifts` the layout shifts, and `flowPositions()` against `beforeDefinition` compares the page before and after definition.

1. On load, nothing moves (`layoutShifts` empty, `flowPositions()` equal to `beforeDefinition`) and the cases in view reveal; the joined-script case reports `text-split-joined-script`.
2. Resize the nested-formatting box: lines rewrap as the original text would, the link stays one element, and the paragraph below never moves.

## `scrub.html`: every Motion › Text element under one scrubbing trigger

One `tp-scroll-trigger scrub scrub-range="cover"` holds Text split with each effect (`fade`, `up`, `down`, `left`, `right`, `zoom-in`, `zoom-out`, `blur`, masked lines, characters from the center), Text mirror in both orientations and Text stroke with characters and with words and lines. `await scrubTo(progress)` scrolls the trigger to that progress and returns each member's first piece: opacity, translate, scale and filter for Text split, the slide translate for Text mirror, and fill, outline opacity and dash offset for Text stroke.

1. `scrubTo(0.02)`: every member is at or near its start state. `scrubTo(0.35)` and `scrubTo(0.5)`: members are mid-motion or at rest in stagger order. `scrubTo(0.98)`: every member is at rest.
2. Scrolling back to the same progress gives the same values (`scrubTo(0.35)` after `scrubTo(0.98)`).
3. With `motion-policy="reduce"` on the trigger, every member is at rest at any progress.
4. With `reveal-hold` on the trigger, every member shows its start state; removing it shows the scrubbed state again.
5. `trigger.scrub = false` returns every member to a timed reveal (revealed, no `data-tp-scrub`); setting it again resumes scrubbing at the same values.
