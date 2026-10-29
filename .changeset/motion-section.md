---
'@tweakpad/ui': minor
---

Text motion is now `tp-mo-text-split` (Text split), the first element of a new Motion section beside Components and Widgets, grouped by what moves. Its Text group holds Text split, Text mirror (`tp-mo-text-mirror`) and Text stroke (`tp-mo-text-stroke`).

- `TpTextMotion` is now `TpMoTextSplit`, its custom properties are `--tp-mo-text-split-*`, and its diagnostic for joined scripts is `text-split-joined-script`.
- Pages ship as `docs/motion/text/<slug>.mdx`; Text split's page moves there from `docs/components/text-motion.mdx`.
- `src/catalog.ts` exports `catalogFolder` and `motionGroups`.
- The elements ship from `@tweakpad/ui` and `@tweakpad/ui/register`.
- In a shrink-to-fit container (a flex or grid item sized by its content), split text now lays out its lines at the width the text takes instead of breaking after every word.
