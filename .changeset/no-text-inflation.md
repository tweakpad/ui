---
'@tweakpad/ui': patch
---

Phones no longer enlarge library text, Code block lines in particular. `styles.css` sets `text-size-adjust: 100%` on the document root, and `tp-code-block` sets it on its host, so pages without the stylesheet keep the authored size too.
