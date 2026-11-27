---
'@tweakpad/ui': patch
---

`on…` callback properties (`onValueChange`, `onOpenChange`, `onClick` and the rest) are no longer reactive: an element only calls its callback, so a new function no longer re-renders it. A parent that re-renders with inline handlers, as React and Vue applications usually write them, now updates only the elements whose own properties changed. The Carousel still hands its controller to an `onControllerChange` set later, without a render.
