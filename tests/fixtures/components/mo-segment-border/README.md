# Segment border checks (Chrome DevTools MCP)

Open `/tests/fixtures/components/mo-segment-border/` on the Vite server (`npm run dev`); append `?built` after `npm run build` to load the built package. The fixture defines every surface first, then the segment and the border, and exposes:

- `geometry(id)`: the ring box against the surface's border box, its radius, the surface's own border, and the line's stroke;
- `profile(id, count)`: the glow canvas's alpha and color at `count` even points along the line;
- `sampleSegments(id, count, every)`: each plain segment line's visibility, dasharray and dashoffset, `count` times `every` ms apart;
- `borderLog`, `beforeDefinition`, `flowPositions()`, `borderShifts()`.

1. Every case: `geometry(id)` reports the ring box equal to the surface box (segment children are never the surface). `flowPositions()` equals `beforeDefinition`; `borderShifts()` is empty.
2. Hover the button: its two pieces run from the top-left corner in opposite directions and meet at the far corner, the second 60 ms later; leaving mid-run plays them back from where they are.
3. `#seg-wrap` lights across the top-left corner at rest. `#seg-round` shows no dot at rest. `#seg-invalid` emits `mo-border-segment-invalid`.
4. `#seg-leave` lights half the border from the top center while hovered and on leave runs to the bottom center, then rests; `profile()` is lit only along the span, white at its ends in the dark scheme. `#seg-scanner` loops.
5. `#seg-focus` draws the whole line while focused and returns on blur.
6. Drawn in: scroll until the cards below the spacer are just below the viewport; they stay undrawn. Scroll them into view; they draw in, the second 300 ms later, over a transparent line.
7. Reduced motion, switched on the live page: a hover shows the end state at once and leaving shows rest; switching back animates again. A listener that claims the `segments` role gets `rest → active` and `active → rest` with `count`, and the pieces jump.
8. axe reports no violations; every drawing is `aria-hidden` and every segment is `display: none`.
