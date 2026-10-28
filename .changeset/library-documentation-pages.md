---
'@tweakpad/ui': minor
---

Documentation pages ship with the package: one `docs/components/<slug>.mdx` per component (widgets under `docs/widgets/`), read by both Storybook and the website, with the tooling behind them at `@tweakpad/ui/docs` (page reader, API rows from the Custom Elements Manifest, Related from `elementDependencies`, preview runtime), the Vite plugin at `@tweakpad/ui/docs/vite` and the built index at `@tweakpad/ui/docs.json`. The manifest now carries each element's `renders` (the tags it renders) and its shadow parts with the descriptions declared in its presentation family, and Badge is the first component documented this way.
