---
'@tweakpad/ui': patch
---

An inline number Input (`variant="inline"` with `type="number"`) shows its value centered between a decrement and an increment arrow, `‹ 2 ›`, instead of the browser's spin buttons, which were tiny, ignored the theme and pushed the value away from the end of the row. The arrows and the Arrow keys step by `step` onto its grid within `min` and `max`, keep stepping while held, and move ten steps with Shift on the keyboard; the arrows stay out of the tab order and point away from the value in either writing direction. The new `precision` property sets how many decimals a number value keeps and shows (it defaults to the decimals of `step`): stepped values and typed values committed on blur or Enter round to it, so `step="0.25"` steps 1.00, 1.25, 1.50 without floating-point noise. Input now renders Button and Icon, so it defines them too.
