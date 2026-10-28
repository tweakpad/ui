---
'@tweakpad/ui': patch
---

Radio Group items and Slider thumbs no longer carry ARIA states their roles do not allow, Resizable Panel Group handles and Map pins and viewports omit `aria-disabled`/`aria-busy` while false, Calendar and Time honour the closest `lang` (Time also sets `lang` on its value when `locale` is explicit), and File Upload keeps keyboard focus on a neighbouring Remove Button or its input after an item is removed or the list is cleared.
