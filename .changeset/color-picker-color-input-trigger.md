---
'@tweakpad/ui': minor
---

The popup Color picker (`picker="popup"`) opens from a Color input swatch instead of a swatch Button, so its trigger looks like a standalone Color input. A Color input in its `trigger` slot shows the picker's color and opens the popup instead of the browser's picker; an inline one shows the color as a row with its text, and a color typed there becomes the picker's value. An authored trigger now carries the popup's expanded state for assistive technology. The color model behind the picker (parsing, conversion and serialization) moved into the shared foundation, and `@tweakpad/ui/widgets` exports the same names as before.
