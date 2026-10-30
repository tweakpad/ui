# Glow border checks (Chrome DevTools MCP)

Open `/tests/fixtures/components/mo-glow-border/` on the Vite server (`npm run dev`); append `?built` after `npm run build` to load the built package. The fixture defines every surface first and the border last, then exposes:

- `geometry(id)`: the ring box against the surface's border box, its radius, the surface's own border, and the line's stroke;
- `profile(id, count)`: the glow canvas's alpha and color at `count` even points along the line;
- `peaks(id, count, floor)`: positions (fractions of the border) of the brightest point of each lit run, for comet spacing;
- `stage(entries, { columns, width })` and `unstage()`: large cards over the page for design review;
- `borderLog`, `beforeDefinition`, `flowPositions()`, `borderShifts()`.

1. Every case: `geometry(id)` reports the ring box equal to the surface box and the surface border transparent at its own width. `flowPositions()` equals `beforeDefinition`; `borderShifts()` is empty.
2. Pointer glow: hover the glow card near an edge. The line nearest the pointer is white (dark scheme), the list's colors show further along it, the bloom glows around it and the wash tints the inside; past `track-reach` it fades out.
3. Comets: sample `peaks('comets-2')` and `peaks('comets-3')` every 60 ms for 2 s. There are always two and three peaks, `0.5` and `0.333` apart (none during the pause of the three-comet case).
4. Sweep turns its colors, pulse breathes, glint crosses once in the first 45% of each lap, `sweep pulse` does both.
5. Triggers: the hover card lights while hovered and fades after; the focus field lights while focused; `none` never lights.
6. Fade: with the light near the slow-fade card, move it away. The lit total holds for 600 ms, then eases out; bringing the light back inside the delay never dims.
7. Touch: a touch `pointermove` near the glow card leaves it unlit; a pen lights it.
8. Reduced motion: comets and glint are dark, sweep is still, pulse is steady. A listener that claims the `loop` role stops the glow's motion and sets `data-tp-motion-driven="loop"`.
9. Light and dark schemes, `dir="rtl"` on `main` and a 400px viewport: rings stay on their surfaces; colors stay vivid.
10. axe reports no violations; the accessibility tree shows only the surfaces.
