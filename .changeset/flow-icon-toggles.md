---
'@tweakpad/ui': patch
---

Flow's lock, node library and tool Toggles use the icon size: they are square like the controls bar's icon Buttons, and a vertical controls bar of icon controls is as wide as one of them. The tool Toggle group is announced once, as the group named by its label, and its Toggles move with the bar's arrow keys. In a controls bar that lists the node library or the zoom field with other actions, the node library Toggle and the zoom menu trigger join the bar's single tab stop and its arrow-key sequence instead of adding tab stops. In a vertical controls bar, ArrowDown and ArrowUp on the zoom menu trigger open its menu, so list `zoom` last or use Home and End to reach the controls after it.
