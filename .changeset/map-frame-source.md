---
'@tweakpad/ui': patch
---

`windowFrameSource` and the `TweenFrameSource` type are removed from `@tweakpad/ui` and `@tweakpad/ui/map`; the map runs on the library's shared window frames. `tweenCamera` and `MapControllerHost.frames` still take any object with `requestAnimationFrame`, `cancelAnimationFrame` and `now`.
