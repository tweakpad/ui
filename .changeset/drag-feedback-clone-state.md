---
'@tweakpad/ui': patch
---

Drag feedback copies keep the state nested custom elements got through properties: an icon, a relative time or an image in a dragged row or tile shows in the copy left in its place instead of rendering empty. A lifted element also keeps its owner's drag look (a Data view row lifts onto the page surface instead of staying transparent).
