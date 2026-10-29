---
'@tweakpad/ui': minor
---

New `tp-mo-text-mirror` reveals text line by line from the middle out. Each line is cut at the middle of its own text, whatever the alignment, and both halves slide out of that seam to their places.

- `orientation="vertical"` cuts each line across the middle of its text instead, so its upper and lower halves slide apart; the default `horizontal` slides them sideways. Neither changes where the text sits.
- It follows `stagger` and `stagger-from` line by line, and `reveal-repeat`.
- Setting `reveal-hold` on a revealed text slides the halves back into the seam; removing it reveals the text again.
- A scrubbing Scroll trigger slides the halves with the scroll.
- Once the reveal settles, each line shows whole, so links and selection behave as in the original text.
- `--tp-mo-text-mirror-duration`, `--tp-mo-text-mirror-easing` and `--tp-mo-text-mirror-mask-bleed` tune it.
