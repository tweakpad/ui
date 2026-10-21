---
'@tweakpad/ui': minor
---

Adds `ResizeSeparatorController`, the separator behavior of the resizable panel group for one extent that its owner controls, such as a table column outside a panel group. The owner supplies the value, its limits and the key steps (base, Shift and Alt) and receives live and settled proposals from pointer drags and key presses; the separator exposes its role, orientation and values, mirrors the inline arrows in right-to-left content, jumps to the limits with Home and End, restores the start value on Escape or pointer cancellation and releases pointer capture, the resize cursor and its listeners on every end of a drag. `resizeSeparatorTargetCss` gives the enlarged pointer target, which reads `--tp-resize-target-fine` and `--tp-resize-target-coarse` with 10 and 20 pixel fallbacks, so a separator outside a group gets it too. The resizable panel group now runs on it, with its behavior unchanged.
