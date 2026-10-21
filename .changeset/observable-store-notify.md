---
'@tweakpad/ui': patch
---

`ObservableStore` no longer calls a subscriber that another subscriber removed earlier in the same publication. An error thrown by a subscriber no longer stops the subscribers after it or propagates out of `set` and `update`: the store rethrows it in a microtask.
