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

`npm run lint` checks Prettier formatting, TypeScript and Lit templates, Lit accessibility, standalone CSS, and CSS embedded in Lit `css` templates. `npm run test:package` packs the library and checks the tarball as a consumer would install it. `npm run size:report` measures each catalog component's gzipped bundle and guards tree-shaking.

Browser verification runs through Google Chrome DevTools MCP against the fixtures in `tests/fixtures/components/<component>/` (served by `npm run dev`; append `?built` or `?package` where a fixture documents it to load the built package). Each fixture folder's `README.md` lists its checks. Storybook's accessibility addon reports Axe results per story.

## Stories

Every component has one `src/stories/<name>.stories.ts` with a `Default` story and `Controls`; `.storybook/preview.ts` tags every story file for Docs (`autodocs`) and sets the padded layout, so story files only declare what differs. Additional stories demonstrate distinct compositions or use cases, not attribute values. Copyable documentation examples live in `src/stories/<name>.examples.ts`; their authored `*-example.js` modules (with `.d.ts` stubs) are imported both as modules and as `?raw` source.

## Tree-shaking rules

- Each component imports its own presentation family (`src/presentation/families/<name>.ts`): its definition, part bindings, structure and default appearance, built from the recipe modules it uses. No component reads a library-wide registry.
- A class's `elementDependencies` lists the library elements its templates render. `defineElement` defines those recursively.
- `componentDefinitions` and `defaultPresentationDictionary` aggregate every family; they are opt-in exports for tooling and full-library themes.

`src/presentation/families.test.ts` guards these rules.

## Releases

Add a changeset (`npx changeset`) describing user-facing changes in your pull request. Merging to `development` opens a "Version Packages" pull request; merging that publishes to npm from CI with provenance.
