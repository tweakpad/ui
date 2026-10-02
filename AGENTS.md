# Tweakpad library agent instructions

For component implementation, refactoring, fixes, conformance reviews, and changes
to component documentation or demo compositions, read and follow the repository
[tweakpad-component skill](.agents/skills/tweakpad-component/SKILL.md).
Apply it to every existing and future component; examples do not restrict scope.

- Fresh live Foundation and Component Library specifications govern contracts.
  Access Spec Blocks through registered direct MCP tools; report unavailable tools
  instead of substituting shell, JSON-RPC, curl, scripts or bridges.
- Investigate the supplied local references in `../specification/external/`.
  Implement with LitElement and shared internal infrastructure, without React or
  upstream runtime dependencies.
- Use Google Chrome DevTools MCP exclusively for browser verification. Existing
  Playwright smoke scripts do not override this requirement.
- Reuse existing library components in demos, stories, documentation examples,
  copyable snippets and fixtures. Do not create local visual substitutes such as
  a styled badge span when the library Badge provides the role.
- Preserve unrelated work. Record evidence and gaps through the skill's checklist;
  a build, default story or accessibility pass alone does not prove completeness.
