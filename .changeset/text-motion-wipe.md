---
'@tweakpad/ui': minor
---

Text motion has a `wipe` reveal effect, and a revealed text can now hide in reverse:

- `wipe` cuts each line at the middle of its own text and slides both halves out of that seam to their places, behind masks that stay put. It needs `lines` in `split`, works with any text alignment, combines with the other effects and follows `stagger` line by line. Once the reveal settles, each line shows whole, so links and selection behave as in the original text.
- Setting `reveal-hold` on a revealed text hides it, playing the reveal backwards with the same duration and stagger; `wipe` lines slide back into their seam. Removing `reveal-hold` reveals the text again.
