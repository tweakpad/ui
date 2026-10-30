# Border checks (Chrome DevTools MCP)

Open `/tests/fixtures/components/mo-border/` on the Vite server (`npm run dev`); append `?built` after `npm run build` to load the built package. The fixture defines every surface first and the border last, then exposes:

- `geometry(id)`: the ring box against the surface's border box, its radius, the surface's own border, and the line's stroke, dashes and animations;
- `profile(id, count)`: the glow canvas's alpha and color at `count` even points along the line;
- `peaks(id, count, floor)`: positions (fractions of the border) of the brightest point of each lit run, for comet spacing;
- `stage(entries, { columns, width })` and `unstage()`: large cards over the page for design review;
- `borderLog`, `beforeDefinition`, `flowPositions()`, `borderShifts()`.
- `sampleSegments(id, count, every)`: each plain segment line's visibility, dasharray and dashoffset, `count` times `every` ms apart.

1. Every surface case: `geometry(id)` reports the ring box equal to the surface box and the surface border transparent at its own width. `flowPositions()` equals `beforeDefinition`; `borderShifts()` is empty.
2. Pointer glow: hover the glow card near an edge. The line nearest the pointer is white (dark scheme), the colors of the list show further along it, the bloom glows around it and the wash tints the inside; past `track-reach` it fades out.
3. Comets: sample `peaks('comets-2')` and `peaks('comets-3')` every 60 ms for 2 s. There are always two and three peaks, `0.5` and `0.333` apart; the total of `profile('comets-2')` alpha stays within a few percent, including when a comet crosses the top-left corner.
4. Sweep turns its colors, pulse breathes, glint crosses once in the first 45% of each lap, `sweep pulse` does both.
5. Triggers: the hover card lights while hovered and fades after; the focus field lights while focused; `none` never lights.
6. Fade: with the light near the slow-fade card, move it away. The lit total holds for 600 ms, then eases out; bringing the light back inside the delay never dims.
7. Touch: a touch `pointermove` near the glow card leaves it unlit; a pen lights it.
8. Dashes run in view (`trigger` always by default), hold still with `trigger="none"`; the hover draw draws while hovered; the reveal draw draws in once with both events; Hide draws it out; the scrubbed draw follows the scroll both ways.
9. Reduced motion: comets and glint are dark, sweep is still, pulse is steady, dashes have no animation, the draw is drawn.
10. A claimed `loop` driver turns the glow motion off (`data-tp-motion-driven="loop"`).
11. Light and dark schemes, `dir="rtl"` on `main` and a 400px viewport: rings stay on their surfaces; colors stay vivid.
12. axe reports no violations; the accessibility tree shows only the surfaces.
13. Defaults from `motion` (Storybook Default story, driven through its controls): naming `comets`, `sweep`, `pulse` or `glint` alone lights the glow with `trigger` always; naming `march`, `breathe` or `draw` alone switches to dashes; `draw` animates from 0 to 1 when it is chosen, and after switching to `trigger="hover"` it stays undrawn until hovered; `effect="glow"` with `march` emits a `mo-border-motion-ignored` diagnostic.
14. Segments (`#case-segments`): the hover button's two pieces run from the top-left corner in opposite directions and meet at the far corner, the second 60 ms later; leaving mid-run plays them back from where they are. `#seg-wrap` lights across the top-left corner at rest. `#seg-leave` lights half the border from the top center while hovered and on leave runs to the bottom center, then rests; `profile()` is lit only along the span, white at its ends. `#seg-scanner` loops. `#seg-focus` draws the whole line while focused and returns on blur. `#seg-invalid` emits `mo-border-segment-invalid`. `#seg-round` shows no dot at rest.
15. Segments under reduced motion, switched on the live page: a hover shows the end state at once and leaving shows rest; switching back animates again. A listener that claims the `segments` role (`respondWith` on `tp-motion-request`) gets `rest → active` and `active → rest` with `count`, and the pieces jump.
