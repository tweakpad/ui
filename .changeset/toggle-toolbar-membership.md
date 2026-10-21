---
'@tweakpad/ui': patch
---

Inside a toolbar, a Toggle registered as an item now takes its tab stop from the toolbar, so it no longer adds a second Tab stop, and a disabled Toggle stays a focusable stop with `aria-disabled="true"` that does not activate, as other toolbar controls do. A Toggle group inside a toolbar root now joins the toolbar by itself: its group part becomes the toolbar group and its Toggles join the toolbar's arrow-key sequence, with no tab stop or arrow keys of the group's own, while its selection mode and values are unchanged. Register Toggles as toolbar items, and leave Toggle groups and their Toggles unregistered.
