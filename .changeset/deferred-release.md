---
'@tweakpad/ui': minor
---

Add `deferRelease(view, release)`, which runs `release` two animation frames later on the given window or frame source, or after two 16 ms timeouts where there is no `requestAnimationFrame`, and returns a cancel function, so an element that is moved and reconnects within that window keeps what it would otherwise release. `deferMediaDestroy` is removed from `@tweakpad/ui` and `@tweakpad/ui/media`.
