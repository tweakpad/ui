# Text mirror checks (Chrome DevTools MCP)

Open `/tests/fixtures/components/mo-text-mirror/` on the Vite server (`npm run dev`); append `?built` after `npm run build` to load the built package. `window.sample(id)` returns each line's seam, size and the translate of its two slides; `window.textLog` holds the reveal events and `window.layoutShifts` the layout shifts.

1. On load, every case's lines open from the middle of their own text: the seam of the centered heading sits at the center of each line's text, and that of the start-aligned and right-to-left paragraphs at the middle of their text, not of the box. When settled, `sample(id)` reports `0px 0px` for every slide, the host has `data-tp-at-rest` and each line shows whole (no start-window copy visible). `layoutShifts` is empty.
2. Resize the start-aligned box: lines rewrap as the original text would, seams follow each new line, and the paragraph below never moves. The link is one element, clickable on every line it wraps to.
3. Press Hide: lines slide back into their seams in stagger order, `tp-reveal-change` reports `revealed: false` and `tp-reveal-change-complete` follows. Press Reveal: they open again.
4. Scroll the scrubbed case through the viewport and back: the halves follow the scroll position in both directions, line after line.
5. Accessibility tree: each text is read once, with its link; the copies and pieces are hidden. Under emulated reduced motion every line is at rest immediately and the events still fire.
6. Light and dark themes, and a 400px viewport: inherited typography, no surface.
