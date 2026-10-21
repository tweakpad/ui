---
'@tweakpad/ui': patch
---

Keyboard shortcuts of the media player (including `tp-media-hotkey` bindings), the navigation panel shortcut, the carousel and the Flow widget match two more keyboard-layout cases. On Apple platforms a shortcut with Alt also matches its physical letter or digit key, because Option types another character there: `Mod+Alt+1` fires for Cmd+Option+1 and `Mod+Alt+C` for Cmd+Option+C. On every platform, while AltGraph is held, a shortcut with Mod and without Alt no longer matches, so characters typed with AltGraph, such as brackets and the backslash on many layouts, are typed instead of firing `Mod+[`, `Mod+]` or `Mod+\`. Shortcuts with both Mod and Alt still match while AltGraph is held.
