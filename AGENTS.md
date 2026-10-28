# Tweakpad library agent instructions

For component implementation, refactoring, fixes, conformance reviews, and changes
to component documentation or demo compositions, read and follow the repository
[tweakpad-component skill](.agents/skills/tweakpad-component/SKILL.md).
Apply it to every existing and future component; examples do not restrict scope.

For any component or widget documentation work — the `docs/components/*.mdx` and
`docs/widgets/*.mdx` pages, their previews, story pairing, the JSDoc behind the API Reference,
or the Storybook and website renderings — read and follow the
[tweakpad-docs skill](.agents/skills/tweakpad-docs/SKILL.md). Its structure, merge and style
rules are mandatory and its checker must pass.

- Fresh live Foundation and Component Library specifications govern contracts;
  the UI Widgets Specification governs the widgets section. Access Spec Blocks
  through registered direct MCP tools; report unavailable tools instead of
  substituting shell, JSON-RPC, curl, scripts or bridges.
- Widgets (specialized controls such as color pickers, curve editors and audio
  graphs) follow the same skill under `src/widgets/<widget>/`, ship only through
  `@tweakpad/ui/widgets` and `@tweakpad/ui/register/widgets`, use the widget reference
  implementation under `../specification/external/` as parity evidence, and keep their records
  under `plans/widgets/<widget>/`. Never add a widget to the main index or `/register`.
- Investigate the supplied local references in `../specification/external/`.
  Implement with LitElement and shared internal infrastructure, without a UI framework
  or external runtime dependencies. Code, comments, tests, samples and docs never name
  the third-party libraries these references come from (license notice files excepted).
- Use Google Chrome DevTools MCP exclusively for browser verification; the fixtures
  under `tests/fixtures/components/` and `tests/fixtures/widgets/` are driven through
  it, never through another driver.
- Reuse existing component-family behavior, components and presentation recipes
  in implementations, demos, stories, documentation examples and fixtures. Trace
  reference imports/reexports and external styles before choosing local owners.
  Do not create parallel implementations or local visual substitutes.
- Pass the skill's source, capability and reuse gates before implementation, then
  its early integration checkpoint before exhaustive verification. Preserve the
  gate record and run its checker; recording gaps does not authorize reducing scope.
- Preserve unrelated work. Record evidence and gaps through the skill's checklist;
  a build, default story or accessibility pass alone does not prove completeness.
