---
'@tweakpad/ui': patch
---

The Emoji picker's list no longer paints over the page's sticky headers when it scrolls under them. An inline Select list kept the popup's `z-index: 1000`, which applies to it as a flex or grid item even though it is not positioned; it now layers with the page, and its sticky group labels and scroll arrows stay inside it.
