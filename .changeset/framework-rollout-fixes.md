---
'@tweakpad/ui': patch
---

Fixes found while verifying every React and Vue binding:

- Navigation menu no longer schedules a second render while it opens, no longer reports a ResizeObserver loop error when its panel opens or its content resizes, and no longer re-registers its items in an update that runs after it is removed. Popup viewports measure their content at its exact sub-pixel size.
- Carousel no longer schedules a second render when a framework changes one of its properties.
- List reflects `aria-label` to the attribute, so a label set as a property names the list.
- Input group treats an editor marked `data-field-control` as its control, and the Easing editor's expression editor carries that marker, so an Easing editor inside an Input group no longer reports a composition diagnostic.
