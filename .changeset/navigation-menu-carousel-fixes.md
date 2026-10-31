---
'@tweakpad/ui': patch
---

- Navigation menu: a link at the top level of the list now matches the triggers beside it (their height, radius and weight) instead of looking like a row of the panel. Tab from an open trigger moves into its panel, and Shift+Tab from the panel's first link returns to the trigger, whether or not the panel is portaled. Items follow a change of `orientation` or `showViewport` after the menu first renders, so a menu switched to vertical stretches its triggers across the column.
- Carousel: clickable bullet indicators (`indicators: { type: 'bullets', clickable: true }`) are visible again. Their dots, and the content a `renderIndicator` returns, sat in the Button's label, which icon-size Buttons hide.
