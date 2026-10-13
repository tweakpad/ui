# Contributing

Requires Node 24 (see `.nvmrc`).

## Commands

```sh
npm run dev
npm run storybook
npm run format
npm test
npm run test:package
npm run size:report
npm run lint
npm run build
npm run build-storybook
```

`npm run lint` checks Prettier formatting, TypeScript and Lit templates, Lit accessibility, standalone CSS, and CSS embedded in Lit `css` templates. `npm run test:package` packs the library and checks the tarball as a consumer would install it. `npm run size:report` measures each catalog component and widget as published and guards tree-shaking.

Browser verification runs through Google Chrome DevTools MCP against the fixtures in `tests/fixtures/components/<component>/` and `tests/fixtures/widgets/<widget>/` (served by `npm run dev`; append `?built` or `?package` where a fixture documents it to load the built package). Each fixture folder's `README.md` lists its checks. Storybook's accessibility addon reports Axe results per story.

## Sections

Foundational components live in `src/components/<name>/` and ship through `@tweakpad/ui` and `@tweakpad/ui/register`. Widgets, the specialized controls, live in `src/widgets/<name>/`, share the Foundation, presentation recipes and `src/components/shared` with components, and ship only through `@tweakpad/ui/widgets` and `@tweakpad/ui/register/widgets`; the main entries never reach a widget module. [Adding a widget](#adding-a-widget) lists every file a new widget adds.

## Adding a widget

1. `src/widgets/<name>/index.ts` and `<name>.ts`: `static tagName = 'tp-<name>'`, `static get elementDependencies()`, `static override presentation` imported from `../../presentation/families/<name>.js`, and the element's own `HTMLElementTagNameMap` entry. Import foundation and component modules directly, never a barrel.
2. One tuple in `src/widgets/catalog.ts`; one `export * from './<name>/index.js'` in `src/widgets/index.ts`; the import and `defineElement` call in `src/register/widgets.ts`.
3. The family in `src/presentation/families/<name>.ts`, its recipe in `src/presentation/recipes/<name>.ts`, and the entry in `src/presentation/families/widgets.ts`.
4. `docs/widgets/<name>.md`, `src/stories/widgets/<name>.stories.ts` (title `Widgets/<Name>`, first story `Default`), `src/stories/widgets/<name>.examples.ts` and an entry in `src/stories/widgets/examples.ts`; list the widget under Published widgets in `docs/widgets/README.md`.
5. Browser fixtures under `tests/fixtures/widgets/<name>/` and the implementation record under `plans/widgets/<name>/implementation-checklist.md`.

The tests enforce this structure: `src/widgets/catalog.test.ts` (catalog, families, folders, registration, and that the main entries never reach a widget), the extended source scanners, and `src/stories/stories.test.ts`. `node scripts/size-report.mjs` measures each widget from `@tweakpad/ui/widgets` and fails if `@tweakpad/ui/register` ships a widget module.

## Stories

Every component has one `src/stories/<name>.stories.ts` with a `Default` story and `Controls`; `.storybook/preview.ts` tags every story file for Docs (`autodocs`) and sets the padded layout, so story files only declare what differs. Additional stories demonstrate distinct compositions or use cases, not attribute values. Copyable documentation examples live in `src/stories/<name>.examples.ts`; their authored `*-example.js` modules (with `.d.ts` stubs) are imported both as modules and as `?raw` source. Widget stories follow the same rules under `src/stories/widgets/<name>.stories.ts` with the title `Widgets/<Name>`; `src/stories/widgets/overview.mdx` is the section's overview page.

## Tree-shaking rules

- Each component imports its own presentation family (`src/presentation/families/<name>.ts`): its definition, part bindings, structure and default appearance, built from the recipe modules it uses. No component reads a library-wide registry.
- A class's `elementDependencies` lists the library elements its templates render. `defineElement` defines those recursively.
- `componentDefinitions` and `defaultPresentationDictionary` aggregate every component family; `widgetDefinitions` and `defaultWidgetPresentationDictionary` (from `@tweakpad/ui/widgets`) aggregate every widget family. They are opt-in exports for tooling and full-library themes.

`src/presentation/families.test.ts` and `src/widgets/catalog.test.ts` guard these rules.

## Releases

Add a changeset (`npx changeset`) describing user-facing changes in your pull request. Merging to `development` opens a "Version Packages" pull request; merging that publishes to npm from CI with provenance.
