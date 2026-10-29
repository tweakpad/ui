# Text stroke checks (Chrome DevTools MCP)

Open `/tests/fixtures/components/mo-text-stroke/` on the Vite server (`npm run dev`); append `?built` after `npm run build` to load the built package. `window.sample(id)` returns each animated piece's fill color, outline opacity and dash offset; `window.textLog` holds the reveal events and `window.layoutShifts` the layout shifts.

1. On load, each piece's outline draws in the text color (dash offset from the dash length to 0), the fill fades in over the second half and the outline fades out at the end, in stagger order. When settled, `sample(id)` reports the text color as fill, outline opacity `0` and dash `0px`. `layoutShifts` is empty.
2. With the fill set to half opacity, the outlines lie exactly on the glyphs (screenshot comparison), including bold and italic runs and the link.
3. Resize the words box: lines rewrap as the original text would, outlines are rebuilt on the moved pieces, and the paragraph below never moves.
4. The custom-property case draws a thicker outline over 2.4 s.
5. Press Hide: the outline returns, the fill fades and the outline undraws, in stagger order; both reveal events fire. Press Reveal: it draws again.
6. Scroll the scrubbed case through the viewport and back: the outlines draw and the fill follows the scroll position in both directions.
7. Accessibility tree: each text is read once; outlines are `aria-hidden`. Under emulated reduced motion the text is filled immediately and the events still fire.
8. Light and dark themes, and a 400px viewport: outlines and fill follow the text color.
