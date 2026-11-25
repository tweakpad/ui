---
'@tweakpad/ui': patch
---

A Data view row's drag carries the data `dragAndDrop.source` returns as the drag starts, not as the row first rendered, so a selection changed since then reaches the drag.
