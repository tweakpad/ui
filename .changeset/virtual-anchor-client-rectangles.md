---
'@tweakpad/ui': minor
---

A `VirtualAnchor` may supply `getClientRectangles()`, its client rectangles in order, such as the lines of a text range. With two or more of them, positioning picks the reference rectangle among them: a surface above attaches to the first line, one below to the last line, one at a side to the lines that reach furthest to that side, and the new `inline` option of `positionSurface` (`{ x, y, padding }`) selects the line that holds a pointer point instead. When collision handling moves the surface to another side, it is placed again at that side's line. `inlineFragmentRect()` returns that reference rectangle. Anchors without client rectangles position as before.
