---
'@tweakpad/ui': patch
---

The custom elements manifest no longer lists an attribute that an element switches off for a property it inherits. `tp-file-upload` lists no `value` attribute, and its `value` property has the type `readonly File[]`; `tp-switch` lists no `indeterminate`, `parent` or `keep-mounted` attribute. The elements never observed these attributes, so their behavior is unchanged.
