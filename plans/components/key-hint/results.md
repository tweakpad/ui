# Key Hint normalization results — 2026-10-05

The existing Key now represents an individual native kbd. The new parent Group owns ordered chord/sequence spacing, including nested groups. Shared recipes provide 20px key geometry, 12px default Icon size, muted colors and logical spacing. Explicit Icon sizes remain effective. No demo-specific repair CSS or runtime dependencies were introduced.

Source authority and revision details are in implementation-checklist.md. Reference: shadcn Base Kbd/KbdGroup, local ui revision 63c1308d112b6b1205d86244a156cca1abef5087, Nova presentation. The live specification's two reversed containment cells were corrected through direct MCP to reflect the requested parent Group. The candidate is not committed: validation retains 47 unrelated pre-existing project issues and canCommit=false.

## Executed evidence

- Chrome DevTools MCP page102, source and built-package fixture: 28 API/geometry assertions each. Covers default/explicit platform, localization, all separators, nested sequences, hidden/reordered/moved children, reconnect, Key/Group style hooks, render delegate, dictionary replacement, spacing token scaling, RTL, 12px default icons and retained16px explicit icons. Built exports and element registration checked independently.
- Light1280px and dark375px rendered compositions inspected: standalone, groups, icons, Button, Tooltip, Input Group, RTL, nested sequences, Menu and Command Palette. No horizontal overflow at375px. Real mouse hover opens Tooltip; keycaps use inverted contextual colors. Adding a key while open adopts those colors; moving it outside restores the normal palette.
- Real click on Accept followed by Tab moves to Print, skipping passive keys. Tooltip has descriptive accessible text. Real Menu click, ArrowDown and Enter retain menu interaction with grouped shortcut. Native kbd semantics, generated readable modifier names and icon labels inspected in the accessibility tree. This is not a screen-reader test.
- axe-core: zero violations in tested source light/dark compositions, including visible Tooltip.
- Storybook Docs loaded through Chrome; all seven curated usages, constituent API, real controls and copyable markup inspected. Default symbols and all three icon definitions render. No local keycap/spacing/icon substitute styles.
- Questionnaire's existing24 browser API checks passed, including first-line/wrapped label/shortcut alignment. Command Palette preserves its string shortcut API and renders conventional modifier prefixes as individual Key children without splitting opaque multiword key names.
- Unit suite:73 files,521 tests passed. TypeScript passed. Library and Storybook builds passed. git diff --check passed. Focused ESLint and Stylelint passed for changed component/fixture files.

## Repository checks outside this change

Repository-wide ESLint reports existing Badge fixture browser globals and Questionnaire fixture explicit-any errors. Repository-wide Stylelint reports the existing Questionnaire comment-spacing error. Repository formatting reports existing src/components/field/field.ts formatting. These files are unchanged by this task. Library build emits its existing dynamic-import warning; Storybook reports chunk-size warnings.

## Evidence locations and replay

Checked-in fixture: tests/fixtures/components/key-hint/ (API assertions and browser steps).
Local artifacts: tmp/component-verification/key-hint/2026-10-05/source-api.json, built-api.json, light-compositions.jpg. Dark/narrow, tooltip and Storybook screenshots were inspected inline in Chrome tool results. Local tmp files are not portable repository artifacts.

No in-scope implementation gaps remain. Broader component conformance is not claimed by these shared-consumer checks.
