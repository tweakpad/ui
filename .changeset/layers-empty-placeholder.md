---
'@tweakpad/ui': patch
---

Layers: an empty stack shows a "No layers" Empty state in a dashed frame (`messages.empty`) when the `empty` slot is unfilled, and the app's own `empty` content gets the same frame. Documentation previews run their script only for the mount still on the page, so a preview mounted twice no longer wires its controls twice (a demo's Remove removed a layer and then its group).
