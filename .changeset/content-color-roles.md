---
'@tweakpad/ui': minor
---

Add content color roles to the default token set: `--tp-content-<hue>` and `--tp-content-<hue>-foreground` for gray, brown, orange, yellow, green, blue, purple, pink and red, in light and dark. The surface role paints highlights and table cell backgrounds and the foreground role paints colored text; they are meant for colors that user content names and the swatches that offer them, never for interface controls. `TOKEN_FAMILIES` gains a `content` family, so `REQUIRED_TOKEN_ROLES`, `TokenSet` and `assertCompleteTokenSet` now include the 18 roles: complete replacement themes must define them.
