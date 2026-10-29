---
'@tweakpad/ui': patch
---

A Drawer swipe no longer restyles the drawer's content on every frame. Its per-frame swipe values (progress, strength, movement and snap offset) now use private property names, which the Drawer registers as non-inherited and writes only on the elements that read them. With large slotted content, a swipe move's style work drops from about 9 ms to under 1 ms in Chrome. On iOS Safari, the style data those frames produced is behind the memory growth in issue 14. Public outputs are unchanged, including `tp-drawer-indent`'s `--drawer-swipe-progress`. The library gains an internal `registerProperty` helper, so components register their own private properties without depending on `styles.css`.
