---
'@tweakpad/ui': patch
---

Tree view (and so Layers) drags through the same drag feedback as Drag drop list: the row is lifted and follows the pointer on both axes from where it was taken hold of, no longer moving only up and down inside the list, while its ghost holds its place and the feedback settles it on the drop. An element the drag feedback lifts into the top layer keeps its own borders, padding and background instead of the platform's popover frame.
