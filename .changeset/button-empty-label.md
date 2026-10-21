---
'@tweakpad/ui': patch
---

`tp-button` in a text size (`xs`, `sm`, `default`, `lg`) hides its `button-label` part when the label has no text, no element and no `content` contract. A Button that shows only an `icon-start` icon and an `icon-end` chevron then has one gap between its marks and the icon padding at both edges; name it with `aria-label`. Content added to the label later shows it again. Labelled Buttons and the `icon-*` sizes are unchanged. The Button owns the `hidden` attribute of the label, as it does for the marks, so a `hidden` value in the label's `hostProperties` no longer applies.
