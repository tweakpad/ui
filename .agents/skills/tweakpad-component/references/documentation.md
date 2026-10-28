# Component documentation

One page per published component or widget, written once in the library and rendered by both
Storybook and the website. This is a guide: the skeleton below and the few terms that must stay
precise are what the tests check; everything else is direction for writing a page a developer
can use.

## One source, two renderings

- The page is `docs/components/<slug>.mdx` (widgets: `docs/widgets/<slug>.mdx`), shipped in the
  package. Storybook renders it through the component's story (`parameters: { docs:
libraryDocs('components/<slug>') }` in `src/stories/<slug>.stories.ts`); the website reads
  the same file from the installed package.
- The API and Related sections are never written: they come from the Custom Elements Manifest
  (`npm run cem`, JSDoc on the element) and from each element's `elementDependencies`.
- `npm run build` writes `dist/docs.json`, the index of every page, and fails on a page the
  renderings would show wrong (a tag the catalog does not list, a title that is not the catalog
  name, an undescribed API row). `npm test` checks the skeleton (`src/docs/docs.test.ts`,
  `src/stories/stories.test.ts`). `scripts/docs/pending.json` lists the tags whose pages are
  not written yet; writing the page takes the tag off the list.

| Section                          | Storybook                                         | Website           | Source                                     |
| -------------------------------- | ------------------------------------------------- | ----------------- | ------------------------------------------ |
| Title, description, tag chips    | Title block, intro                                | Header            | Frontmatter                                |
| Hero preview                     | The `Default` story (its source is the hero code) | First preview     | The page                                   |
| Usage, use cases, Variants, Keys | The page                                          | The page          | The page                                   |
| Attributes and properties        | Controls, described from the manifest             | API table         | Manifest (JSDoc on the element)            |
| Methods, events, slots, parts    | API block                                         | API tables        | Manifest (JSDoc, part descriptions)        |
| Constituent tags' API            | API block                                         | API tables        | Manifest                                   |
| Related                          | Renders / Used by                                 | Renders / Used by | `elementDependencies` (manifest `renders`) |
| Tokens                           | Design tokens page                                | Tokens group      | `src/docs/token-catalog.ts`                |

Storybook keeps its internal pages (catalog, size report, fixtures); the website keeps getting
started, patterns and kits. Neither is part of a component page.

## Vocabulary

- **Presentation axis**: a declared, reflected, enumerated host property in the family's
  `ComponentDefinition.axes` (`variant`, `size`, `orientation`, `align`, part-scoped ones like
  `itemVariant`). Axis values are Controls and API rows.
- **Variant**: a value of the axis named `variant`. Visual treatment only; it changes no
  behavior. `size` and `orientation` are sibling axes, not variants. A component without a
  `variant` axis has no Variants section and never calls its options variants.
- **Part**: a constituent element with its own tag (`tp-table-row`) or a shadow part
  (`::part(badge)`). Constituent tags go in the frontmatter `parts` list and get their own API
  block; shadow parts are rows of the generated API, described in the family definition
  (`PartDefinition.description`), and never prose.
- **Use case**: a scenario a developer recognizes (a status column in a task list, a settings
  dialog, a filter bar), shown by one preview. A feature or an attribute is not a use case: it
  is a row of the API table and, at most, a sentence inside a use case.
- **Configuration**: an attribute or property that modulates a use case. Named in the use
  case's prose when it matters there; explained only by the API table.

## Skeleton

```
---
title: Select                      the catalog name
description: One sentence: what it is and what it is for (the intro).
tag: tp-select
parts: [tp-select-option]          constituent tags, when the component has them
---
<Preview … />                      1. hero: the canonical base example, before any heading
## Usage                           2. what it is for, its main characteristics, when to pick
                                      it over a sibling; prose, no attribute list
### <Use case>                     3. one section per major use case: a preview of the
### <Use case>                        component in a typical scenario plus a short paragraph on
                                      why it is shaped that way; other configurations get a
                                      sentence naming the attribute, nothing more
### Variants                       4. only when the family declares a `variant` axis: one
                                      preview with every value, in axis order; never a use case
## Keyboard                        5. optional: only when the component handles keys beyond
                                      native behavior; a `Key | Action` table with `<Keys />`
(API, Related)                     6. generated; never authored
```

Headings are `##` and `###` only; the two `##` sections are Usage and Keyboard. A page uses two
elements, `<Preview />` and `<Keys />`, and no import or export: the renderings supply both.

`<Preview title="…" code={`…`} />` takes `script={`…`}` for behavior markup cannot express,
`align` (`center` for one control, `start` or `stretch` for a composition), `viewport` (the block
size of a scrolling example's own viewport), `language` and `codeOnly` (a hero with nothing
visual, such as Visually hidden). `code` and `script` are template literals that escape only
backticks, dollar signs and backslashes, with no interpolation; the code is both what renders
and what a reader copies.

`<Keys keys="mod+shift+z" />` draws a shortcut with Key hints inside a Keyboard table.

## Writing use cases

The component stays the subject. The scenario exists to show the component doing its job in a
setting a developer will recognize, with the smallest surrounding markup that makes the setting
real:

- Not a bare control: a select with three fruit options proves nothing. Put it in a field with a
  real label and real data.
- Not a buried control: no whole screens, no multi-step flows, no second component that draws
  more attention than the one documented. If a reader has to hunt for the tag the page is
  about, the scenario is too big. Full compositions are patterns on the website, not component
  documentation.
- Nested roles are library components (`tp-icon`, `tp-badge`, `tp-button`, `tp-spinner`),
  never inline SVG or styled spans. An icon is set from a script that imports
  `@tweakpad/ui/icons/<name>`.
- One preview per use case, two when a contrast matters (single and multiple selection). Four
  to eight use cases is the usual range for a rich component; one or two for a primitive.
- A use case is warranted by a different intent or composition, not by a different attribute.
  Other configurations are a sentence in the nearest use case: "`searchable` filters the list
  as people type."
- Scripts are short and specific to the scenario; they select elements by ids that are unique on
  the page and in the preview's own code. They import with named or namespace imports from the
  library, its subpath entries, `lit`, one icon module per icon, and the engine packages the
  text editor runs on; a script never registers elements (the page does).

## What prose is for

Prose explains intent and choice: when to use the component, why a use case is shaped that way,
what to prefer over what. "`variant` is visual emphasis only. Use `destructive` for failures and
blocking problems" is the register.

Prose never walks the API: no sentence that lists values with their defaults, no paragraph of
inherited properties, no list of what the component has no API for, no restated default. If a
sentence could be a table row, it is a table row, and the row's text is JSDoc on the element so
the table carries it.

Prose never mentions Storybook, the examples themselves, specifications, third-party libraries,
class names, presentation dictionary keys, `data-*` markers or private custom properties. Those
belong to JSDoc, `docs/styling.md` and `docs/conventions.md`.

## The API that the page relies on

The generated API is only as good as the element's JSDoc: a summary on the class, one `@slot`
per slot (the default slot as `@slot - …`), `@fires {Type} tp-name - …` per event, `@cssprop`
per consumed custom property, a line on every public reactive field and method, and a
`description` on each part in the family definition. The build lists every undescribed row of a
documented element and its constituent tags.

## Checklist

- `docs/components/<slug>.mdx` follows the skeleton; the story renders it through
  `libraryDocs()`; the former `docs/<slug>.md`, `src/stories/<slug>.examples.ts` and
  `<slug>-example.js` are gone; the tag is off `scripts/docs/pending.json`.
- `npm test` passes (page skeleton, story pairing).
- `npm run build` passes (manifest completeness, index).
- `npm run storybook`: the Docs page shows Default with the hero as its source, Controls with
  descriptions, every use case's preview running its script, Variants complete, API with slots and
  parts, Related.
