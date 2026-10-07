# Contributing

Requires Node 24 (see `.nvmrc`).

## Commands

```sh
npm run dev
npm run storybook
npm run format
npm test
npm run test:browser
npm run test:stories
npm run test:package
npm run verify:phase-1
npm run lint
npm run build
npm run build-storybook
```

`npm run lint` checks Prettier formatting, TypeScript and Lit templates, Lit accessibility, standalone CSS, and CSS embedded in Lit `css` templates. `npm run test:package` packs the library and checks the tarball as a consumer would install it.

The Storybook overview renders every public catalog identity. The browser smoke suite checks registration, interaction, native form behavior, keyboard navigation, console errors, and Axe accessibility results.

## Tree-shaking rules

- Each component imports its own presentation family (`src/presentation/families/<name>.ts`): its definition, part bindings, structure and default appearance, built from the recipe modules it uses. No component reads a library-wide registry.
- A class's `elementDependencies` lists the library elements its templates render. `defineElement` defines those recursively.
- `componentDefinitions` and `defaultPresentationDictionary` aggregate every family; they are opt-in exports for tooling and full-library themes.

`src/presentation/families.test.ts` guards these rules.

## Releases

Add a changeset (`npx changeset`) describing user-facing changes in your pull request. Merging to `development` opens a "Version Packages" pull request; merging that publishes to npm from CI with provenance.
