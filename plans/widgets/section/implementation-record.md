# Widgets section: implementation record

Tooling and structure pass that opens the `widgets` section (specialized controls such as
color pickers, curve editors and audio graphs) beside the foundational components. No widget
is implemented here; the full skill checklist (`assets/component-checklist.md`, run through
`check-gates.mjs`) starts with the first widget under `plans/widgets/<widget>/`.

## Delivery and source record

- Scope source: the user, 2026-10-09: open a new widgets section handled separately in
  Storybook and the file layout, foundational controls unchanged. Decisions: sibling tree
  `src/widgets/<name>/`; separate entries `@tweakpad/ui/widgets` and
  `@tweakpad/ui/register/widgets`; structure plus an overview page only; a new Spec Blocks
  document as authority.
- Repository baseline: `development` at `2a041f2`, clean tree; all seven gates green before
  the change (see V-00). No git commits (user rule).
- Live authority: project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, now 0.13.0. New document
  "UI Widgets Specification" `doc_0d98facc-5a5d-4de2-bccb-7317abea0b9f`, created and outlined
  through direct Spec Blocks MCP tools; committed as `8b83ffee` (0.12.1, document) and
  `5d0659f6` (0.13.0, minor bump). Sections: 1 Status and authority, 2 Scope and relationships
  (anchors to Foundation §5.3, B.8.3, appendix D.2 and Component Library §8.2), 3 Terminology,
  4 Packaging and naming, 5 Shared widget contracts (5.1 value model, 5.2 input, 5.3 rendering,
  5.4 accessibility, 5.5 theming, 5.6 performance), 6 Widget definitions (empty), appendices A
  (upstream references) and B (conformance map). No managed terms were created.
- Upstream reference registered for widgets: tweakpane 4.0.5 at
  `../specification/external/tweakpane` plus `../specification/research/tweakpane/`.
- Evidence directory: `tmp/component-verification/widgets-section/run-1/` (local only).

## Changed files

- New: `src/widgets/catalog.ts`, `src/widgets/index.ts`, `src/widgets/catalog.test.ts`,
  `src/register/widgets.ts`, `src/presentation/families/widgets.ts`,
  `src/presentation/widgets.ts`, `src/stories/widgets/examples.ts`,
  `src/stories/widgets/overview.mdx`, `docs/widgets/README.md`,
  `tests/fixtures/widgets/README.md`.
- Build and package: `vite.config.ts` (entries `widgets`, `register/widgets`), `package.json`
  (exports `./widgets`, `./register/widgets`; `sideEffects`; MDX in the Prettier globs),
  `custom-elements-manifest.config.mjs`, `scripts/pack-smoke.mjs` (widget imports and the
  "main entries never import widgets" check), `scripts/size-report.mjs` (widgets measured from
  `@tweakpad/ui/widgets`, `section` per row, `fullWidgets`, `register-all` widget-leak violation),
  `src/stories/size-report/size-report.ts` (Widgets card and tab), `src/stories/size-report.json`.
- Tests extended to both trees: `src/presentation/families.test.ts`, `src/conventions.test.ts`,
  `src/presentation/fill-layer.test.ts`, `src/presentation/presentation.test.ts`,
  `src/stories/stories.test.ts`.
- Storybook: `.storybook/main.ts` (MDX glob), `.storybook/preview.ts` (widgets register import,
  `storySort` order Tweakpad UI, Components, Widgets).
- Process and docs: `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `docs/conventions.md`,
  `.agents/skills/tweakpad-component/SKILL.md`, `references/architecture.md`,
  `references/verification.md`, `references/skill-regressions.md`,
  `assets/component-checklist.md`.

## Verification

| ID   | Check | Command / tool | Result | Status |
| ---- | ----- | -------------- | ------ | ------ |
| V-00 | Baseline gates at `2a041f2` | tsc (both configs), vitest, lint, build, pack-smoke, size-report | all green; 149 files / 1455 tests | passed |
| V-01 | Type-check after the change | `tsc -p tsconfig.json --noEmit`, `tsc -p tsconfig.build.json --noEmit` | clean | passed |
| V-02 | Unit and source-rule tests | `npx vitest run` | 150 files / 1460 tests (new `src/widgets/catalog.test.ts`: 4 tests) | passed |
| V-03 | Lint | `npm run lint` | Prettier (now including `src/**/*.mdx`), ESLint, Stylelint clean | passed |
| V-04 | Build and entries | `npm run build` | `dist/widgets.js`, `dist/widgets/index.d.ts`, `dist/widgets/catalog.js`, `dist/register/widgets.{js,d.ts}` emitted; `dist/index.js` and `dist/register.js` contain no `widgets` import | passed |
| V-05 | Package smoke | `node scripts/pack-smoke.mjs` | 2030 files; consumer type-check passes with `@tweakpad/ui/register/widgets` and `{ widgetEntries }` from `@tweakpad/ui/widgets`; boundary check passes | passed |
| V-06 | Size report | `node scripts/size-report.mjs` | 73 components, 0 widgets; widgets register 0.42 kB (gzip 0.19 kB); no tree-shaking or widget-leak violation | passed |
| V-07 | Static Storybook index | `npm run build-storybook` | `storybook-static/index.json` contains `widgets-overview--docs` | passed |
| V-08 | Sidebar order and overview page | Chrome DevTools MCP on the static build served at :6007 | roots `Tweakpad UI`, `Components`, `Widgets`; overview renders the README headings and "No widgets are published yet"; no console errors; `widgets-overview-static.png` | passed |
| V-09 | Bundle-size story | Chrome DevTools MCP on the dev server :6006 | Widgets card `0.19 kB (@tweakpad/ui/register/widgets, 0 published)`, `Widgets (0)` tab with the empty state; `register/widgets` module loaded; no console errors; `bundle-size-dev-server.png` | passed |
| V-10 | Component Docs unchanged | Chrome DevTools MCP, Button docs on :6006 and on the static build | Default, Public properties and Examples sections render with defined `tp-button` elements; no console errors; `button-docs-static.png` | passed |

Note: the dev server on :6006 reads the `stories` glob at startup, so the `Widgets` root and the
overview page appear there only after the user restarts Storybook; the preview changes
(widgets register import, `storySort`) are already live. During verification `npm run build`
deleted `storybook-static` (the clean script removes it), so the static build was regenerated
before V-10.

Defect found and fixed on the way (pre-existing): the static Storybook build never defined the
custom elements. The project's own `package.json` `sideEffects` list named only
`dist/register.js`, so Vite tree-shook the bare `import '../src/register.js'` out of the
production preview (the dev server does not tree-shake, which is why it was never visible
there). `sideEffects` now also lists `./src/register.ts`, `./src/register/icon.ts` and
`./src/register/widgets.ts`; after the rebuild the static assets contain the element classes
and the Button docs page renders defined elements (V-10 was re-run on that build).

## Gaps and follow-ups

- No widget exists yet; `widgetCatalog`, `widgetPresentationFamilies` and the widget examples are
  empty by design. The first widget (color picker planned) follows `docs/widgets/README.md` and
  the skill checklist under `plans/widgets/<widget>/`.
- Widget catalog kinds reuse the five Component Library kinds until the Widgets specification
  defines its own.
- `src/catalog.stories.ts` `published()` rewrites no `widgets/` import yet; add the rewrite when
  the workspace demo composes a widget.
