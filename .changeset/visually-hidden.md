---
'@tweakpad/ui': minor
---

Add `tp-visually-hidden`, which keeps its content in the accessibility tree while hiding it on screen: names for icon-only controls, status regions that announce changes, and context for repeated actions. It has no styling options, and page or theme styles cannot reveal it. Assigned focusable content raises a `visually-hidden-focusable-content` diagnostic. In icon sizes, Button now hides its label visually instead of removing it, so the label text names an icon-only Button without `aria-label`.
