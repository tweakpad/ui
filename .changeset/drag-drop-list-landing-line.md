---
'@tweakpad/ui': minor
---

Drag and drop list: `drop-indicator="line"` keeps the items still during a pointer drag and marks where the item lands with a line between two items (the new `drop-indicator` part, restyled with `--tp-drag-drop-list-drop-indicator-color` and `-size`); on release the items make room and the item glides into place, and the dragged item is the translucent one while it follows the pointer. Keyboard moves still show the new order. `reorder-mode` and its swap mode are removed: moves always insert. The item under a drag is no longer outlined (it read as dropping inside it), a shown stand-in (`feedback: 'clone'`) is translucent next to the solid dragged row, and in horizontal lists the dragged item and its stand-in keep their width instead of collapsing.

Tree view and Layers: the landing line is the same dim 2px line in the control-edge color, restyled with `--tp-tree-view-drop-indicator-color` and `-size`.
