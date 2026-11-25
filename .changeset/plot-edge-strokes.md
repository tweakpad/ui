---
'@tweakpad/ui': patch
---

Plot keeps a line's whole stroke inside the plot when its values reach the y domain's bounds: a fixed domain no longer cuts the peaks and troughs flat. Fills, guides, the grid and inspection follow the same mapping; `getSummary()` still reports the configured domain.
