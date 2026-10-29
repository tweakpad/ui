---
'@tweakpad/ui': minor
---

New `tp-mo-text-stroke` draws the outline of every glyph in the text color, then fills the text in and lets the outline fade.

- The browser draws the outlines from the same font, so they sit exactly on the glyphs, and every glyph draws at once.
- `split` sets the pieces that draw in turn (words, or `chars`), and it follows `stagger`.
- Setting `reveal-hold` on a revealed text plays it backwards; a scrubbing Scroll trigger draws it with the scroll.
- `--tp-mo-text-stroke-width` and `--tp-mo-text-stroke-length` tune the outline, and `--tp-mo-text-stroke-duration` and `--tp-mo-text-stroke-easing` its timing. The length is the dash that draws one outline, so longer outlines draw faster.
