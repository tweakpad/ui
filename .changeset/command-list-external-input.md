---
'@tweakpad/ui': minor
---

Command palette items take an optional `description`, a secondary line after the label in the new `command-palette-item-description` part, which is the item's accessible description. `tp-command-list` takes an external input: with `queryOwner` set to an editing element that keeps focus, the list renders no input, takes its query from `inputValue` and its keys from `handleQueryKey(event)` and `activateHighlighted(event)`, each reporting whether it consumed the key, never moves focus, also when an item is pressed, and aborts a pending `source` call when it closes; with `inline` false it shows its list in a popup at `anchor`. `activeDescendantReference()` returns the element that forwards `aria-activedescendant` to the highlighted item. Lists and Selects without an external input are unchanged.
