---
'@tweakpad/ui': patch
---

Text editor: the built-in `redo` tool scopes its `Ctrl+Y` shortcut to Windows and Linux through the key-binding owner's platform instead of reading the host machine's platform when the module loads, so an editor configured for Apple platforms never binds it and the behavior is the same on every machine. Key-binding patterns accept `{ pattern, platforms }` entries.
