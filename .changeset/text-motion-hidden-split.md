---
'@tweakpad/ui': patch
---

Text motion with `lines` in its `split` now measures its lines again when it first appears. Before, text split while hidden, in a closed Accordion, Collapsible, tab panel or dialog, measured nothing, then kept each paragraph on a single line that overflowed its box once shown.
