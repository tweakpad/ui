---
'@tweakpad/ui': minor
---

Add `tp-status-dot`, a small colored dot that marks a status. `variant` picks the color from the theme status roles (`default`, `secondary`, `success`, `warning`, `destructive`) and `--tp-status-dot-color` takes any other color; `--tp-status-dot-size` sets the diameter. `label` is the status text: `show-label` shows it beside the dot, otherwise it is the dot's accessible name and appears in a tooltip on hover and keyboard focus (`tooltip="false"` keeps the name without the tooltip). `motion="pulse"` fades the dot and `motion="ping"` grows a fading ring from it, without moving any content and resting under reduced motion; both run the ambient `attention` motion role.
