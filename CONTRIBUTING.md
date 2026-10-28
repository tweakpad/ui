# Contributing

Requires Node 24 (see `.nvmrc`).

## Commands

```sh
npm run dev
npm run storybook
npm run format
npm test
npm run typecheck
npm run test:package
npm run size:report
npm run lint
npm run build
npm run build-storybook
```

`npm run lint` checks Prettier formatting, TypeScript and Lit templates, Lit accessibility, standalone CSS, and CSS embedded in Lit `css` templates. `npm run typecheck` type-checks `src` with its tests and stories, `.storybook` and the configs, which the build's `tsconfig.build.json` leaves out. `npm run test:package` packs the library and checks the tarball as a consumer would install it. `npm run size:report` measures each catalog component and widget as published and guards tree-shaking.

Browser verification runs through Google Chrome DevTools MCP against the fixtures in `tests/fixtures/components/<component>/` and `tests/fixtures/widgets/<widget>/` (served by `npm run dev`; append `?built` or `?package` where a fixture documents it to load the built package). Each fixture folder's `README.md` lists its checks. Storybook's accessibility addon reports Axe results per story.

## Sections

Foundational components live in `src/components/<name>/` and ship through `@tweakpad/ui` and `@tweakpad/ui/register`. Widgets, the specialized controls, live in `src/widgets/<name>/`, share the Foundation, presentation recipes and `src/components/shared` with components, and ship only through `@tweakpad/ui/widgets` and `@tweakpad/ui/register/widgets`; the main entries never reach a widget module. [Adding a widget](#adding-a-widget) lists every file a new widget adds.

## Adding a widget

1. `src/widgets/<name>/index.ts` and `<name>.ts`: `static tagName = 'tp-<name>'`, `static get elementDependencies()`, `static override presentation` imported from `../../presentation/families/<name>.js`, and the element's own `HTMLElementTagNameMap` entry. Import foundation and component modules directly, never a barrel.
2. One tuple in `src/widgets/catalog.ts`; one `export * from './<name>/index.js'` in `src/widgets/index.ts`; the import and `defineElement` call in `src/register/widgets.ts`.
3. The family in `src/presentation/families/<name>.ts`, its recipe in `src/presentation/recipes/<name>.ts`, and the entry in `src/presentation/families/widgets.ts`.
4. `docs/widgets/<name>.md`, `src/stories/widgets/<name>.stories.ts` (title `Widgets/<Name>`, first story `Default`), `src/stories/widgets/<name>.examples.ts` and an entry in `src/stories/widgets/examples.ts`; list the widget under Published widgets in `docs/widgets/README.md`.
5. Browser fixtures under `tests/fixtures/widgets/<name>/` and the implementation record under `plans/widgets/<name>/implementation-checklist.md`.
6. For a companion entry `@tweakpad/ui/<name>`, which publishes the widget's model, engine contract or data layer for use without the element (as `@tweakpad/ui/emoji` and `@tweakpad/ui/flow` do): `src/foundation/<name>/index.ts`, whose modules import only relative modules and `lit` and touch no DOM when imported, with export names that stay unique across `@tweakpad/ui/widgets`; the `./<name>` export in `package.json` beside the other companion entries (`types` from `./dist/foundation/<name>/index.d.ts`, `import` and `default` from `./dist/<name>.js`); the `<name>` entry in `vite.config.ts`; in `scripts/pack-smoke.mjs` the consumer import, its `used` entry and a Node run of the entry; and the folder in the companion patterns of `src/widgets/catalog.test.ts`, `scripts/size-report.mjs` and `scripts/pack-smoke.mjs`. The widget's `index.ts` re-exports the entry (`export * from '../../foundation/<name>/index.js'`); `src/foundation/index.ts` never does. An adapter for a third-party engine ships as its own sub-entry `@tweakpad/ui/<name>/adapters/<engine>` from `src/foundation/<name>/adapters/<engine>/index.ts`, exporting only that adapter's factory and types: the `./<name>/adapters/<engine>` export (`types` from `./dist/foundation/<name>/adapters/<engine>/index.d.ts`, `import` and `default` from `./dist/<name>/adapters/<engine>.js`), the `<name>/adapters/<engine>` Vite entry, the consumer import and a single-engine bundle check in `scripts/pack-smoke.mjs`; the companion entry and the widget's `index.ts` never re-export an adapter.

The tests enforce this structure: `src/widgets/catalog.test.ts` (catalog, families, folders, registration, that widget sources import only Lit and relative modules, and that the main entries never reach a widget or a companion entry), the extended source scanners, and `src/stories/stories.test.ts`. `node scripts/size-report.mjs` measures each widget from `@tweakpad/ui/widgets` and fails if `@tweakpad/ui/register` ships a widget or companion module; `npm run test:package` checks the same boundaries in the packed files.

## Stories

Every component has one `src/stories/<name>.stories.ts` with a `Default` story and `Controls`; `.storybook/preview.ts` tags every story file for Docs (`autodocs`) and sets the padded layout, so story files only declare what differs. Additional stories demonstrate distinct compositions or use cases, not attribute values. Copyable documentation examples live in `src/stories/<name>.examples.ts`; their authored `*-example.js` modules (with `.d.ts` stubs) are imported both as modules and as `?raw` source. Widget stories follow the same rules under `src/stories/widgets/<name>.stories.ts` with the title `Widgets/<Name>`; `src/stories/widgets/overview.mdx` is the section's overview page.

## Tree-shaking rules

- Each component imports its own presentation family (`src/presentation/families/<name>.ts`): its definition, part bindings, structure and default appearance, built from the recipe modules it uses. No component reads a library-wide registry.
- A class's `elementDependencies` lists the library elements its templates render. `defineElement` defines those recursively.
- `componentDefinitions` and `defaultPresentationDictionary` aggregate every component family; `widgetDefinitions` and `defaultWidgetPresentationDictionary` (from `@tweakpad/ui/widgets`) aggregate every widget family. They are opt-in exports for tooling and full-library themes.

`src/presentation/families.test.ts` and `src/widgets/catalog.test.ts` guard these rules.

## Releases

Add a changeset (`npx changeset`) describing user-facing changes in your pull request. Merging to `development` opens a "Version Packages" pull request; merging that publishes to npm from CI with provenance.
