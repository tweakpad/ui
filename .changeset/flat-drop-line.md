---
'@tweakpad/ui': patch
---

The landing line of a Drag drop list or Tree view (and so Layers) drag stays visible under `appearance="flat"`, also when the whole document is flat: it is drawn from the page's foreground and background, which no appearance changes, instead of the control edge a flat region clears.
