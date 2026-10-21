---
'@tweakpad/ui': minor
---

Add `ContextualToolbarController`, a toolbar that its owner shows and hides from its own state, without a trigger, in a non-modal surface anchored to an element or a virtual anchor, in place or in the top layer. Showing never moves focus; `focus()` moves focus to the first enabled control; Escape inside it, and hiding it while it holds focus, return focus to its `finalFocus` target; and with `sequentialFocus: false` it stays out of the Tab sequence while Tab and Shift+Tab inside it return focus as Escape does. It follows a moved anchor without closing and hides when the anchor is removed. `ToolbarController` gains the `sequentialFocus` option and `focusFirst()`. The flow node toolbar now uses the contextual toolbar, with no change to its behavior.
