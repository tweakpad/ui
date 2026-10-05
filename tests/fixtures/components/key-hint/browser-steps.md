# Key Hint checks (Chrome DevTools MCP)

1. Open `/tests/fixtures/components/key-hint/` on the existing Vite server. Run `await (await import('/tests/fixtures/components/key-hint/api.ts')).verifyKeyHints()` through MCP evaluation. Expect28 assertions. Repeat with `?package` after `npm run build`; exports/registration must use dist.
2. Inspect standalone, plus/none/then and nested groups. Default keys are20px high/minimum width, default icons12px; explicit16px icon stays16px. Group owns gaps and has no keycap paint. Use light/dark, RTL and a375px viewport; no document horizontal overflow.
3. Click Accept and press Tab: focus moves to Print, not a Key. Hover Print: both keys remain legible in the tooltip. Add a key to the open Group through its public children API; it receives the contextual palette. Move it outside; it returns to normal colors. Run local axe through the MCP-controlled page.
4. Click Menu, ArrowDown, Enter. Menu behavior remains intact with a real Group in data-menu-shortcut. Inspect Command Palette's Ctrl/Shift/O as separate keycaps; its label and focus remain owned by Command Palette.
5. Open Storybook `components-key-hint--docs`: verify Default, Group prose, Button, Tooltip, Input Group, RTL, sequences and Icon keys; rendered markup must match copyable source. Platform/separator Controls affect the parent Group.
6. Shared Questionnaire regression: `await (await import('/tests/fixtures/components/questionnaire/api.ts')).runQuestionnaireChecks()` from this source fixture. Expect24 assertions, including shortcut/label alignment.
