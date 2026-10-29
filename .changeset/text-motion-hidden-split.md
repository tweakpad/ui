---
'@tweakpad/ui': patch
---

Text split with `lines` in its `split` now reveals line by line inside panels that open and close, such as an Accordion, Collapsible, tab panel or dialog:

- Text split while hidden measures its lines again when it appears, before its reveal starts. Before, each paragraph stayed one line that overflowed its box.
- Hiding the text no longer re-splits it. Before, closing a panel collapsed every paragraph to a single line, and on reopening it revealed as one block instead of line by line.
