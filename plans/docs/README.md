# Documentation merge records

- `sources/website/<section>/<slug>.mdx`: the website page (A), frozen byte for byte on 2026-10-28
  before the website stopped authoring component pages.
- `sources/storybook/<section>/<slug>.json`: the Storybook material (B) for the same tag, frozen at
  the same time. It holds reference markdown sections, `*.examples.ts` entries in Preview form, and
  stories besides Default.
- `ledger/<section>/<slug>.md`: one disposition per B item, plus the forced edits to A.

Written by `.agents/skills/tweakpad-docs/scripts/capture-sources.mjs` and checked by
`check-docs.mjs`. Never edit the sources; they are the baseline the checker compares against.
