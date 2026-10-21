---
'@tweakpad/ui': minor
---

Toggle and Toggle group `size` gain `xs`, `icon-xs`, `icon-sm`, `icon` and `icon-lg` beside `sm`, `default` and `lg`, the same set as Button, with their `toggle-size-*`, `toggle-content-size-*`, `toggle-group-size-*` and `toggle-group-item-size-*` presentation keys and the exported `ToggleSize` type. The `icon-*` sizes are square at the height of the matching step, with no inline padding, also inside a zero-spacing Toggle group; use them for Toggles whose content is only an icon. The existing sizes are unchanged. The Theme switcher's `group` variant now renders its Toggles at `icon-sm` for `size="sm"` and at `icon` by default, so its items are square and narrower than before. A Toggle's host is now exactly the box of its size, as a Button's is: a surrounding line height taller than the size, or a Toggle without text such as a color picker swatch, no longer makes the host taller than the visible toggle.
