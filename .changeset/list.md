---
'@tweakpad/ui': minor
---

List item is now List. The container `tp-list-item-group` is renamed `tp-list` (`TpList`) and the divider `tp-list-item-separator` is renamed `tp-list-separator` (`TpListSeparator`); `tp-list-item` keeps its name and still works on its own. The host of `tp-list` now carries the `list` role and its `aria-label`, so the inner stack no longer has a role; direct `tp-list-item` members still become list items unless they set their own role. Part names follow the tags: the container part `list-item` is now `list`, the row part `list-item-root` is now `list-item`, and `list-item-separator` is now `list-separator`; update `partPresentation` keys and `::part()` selectors to match. The old names have no aliases.
