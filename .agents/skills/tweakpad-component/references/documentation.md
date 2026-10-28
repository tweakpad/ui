# Component documentation

One page per published component or widget, written once in the library and rendered by both
Storybook and the website. This is a guide: the skeleton and the few precise terms are what
the tests check; the rest is direction for writing a page a developer can use.

## One source, two renderings

- The page is `docs/components/<slug>.mdx` (widgets: `docs/widgets/<slug>.mdx`), shipped in the
  package. Storybook renders it through the story (`parameters: { docs:
libraryDocs('components/<slug>') }`); the website reads the same file from the package.
- API and Related are generated from the Custom Elements Manifest (JSDoc on the element, part
  descriptions in the family) and from `elementDependencies`. A table lists only what the
  element declares itself, never inherited members. `npm run build` fails on a catalog entry
  without a page or an undescribed API row.

| Section                                         | Storybook                                | Website           |
| ----------------------------------------------- | ---------------------------------------- | ----------------- |
| Title, description, tag chips                   | Title block, intro                       | Header            |
| Hero preview                                    | The `Default` story (hero as its source) | First preview     |
| Usage, use cases, Variants, Keyboard            | The page                                 | The page          |
| Attributes and properties                       | Controls, described from the manifest    | API table         |
| Methods, events, slots, parts; constituent tags | API block                                | API tables        |
| Related                                         | Renders / Used by                        | Renders / Used by |

## Vocabulary

- **Presentation axis**: a declared, reflected, enumerated host property in the family's
  `ComponentDefinition.axes` (`variant`, `size`, `orientation`, part-scoped ones like
  `itemVariant`). Axis values are Controls and API rows.
- **Variant**: a value of the axis named `variant`. Visual treatment only. `size` and
  `orientation` are sibling axes, not variants; a component without a `variant` axis has no
  Variants section and never calls its options variants.
- **Part**: a constituent element with its own tag (`tp-table-row`, listed in the frontmatter
  `parts`, with its own API block) or a shadow part (`::part(badge)`, a generated API row
  described in the family definition, never prose).
- **Use case**: a scenario a developer recognizes (a status column in a task list, a settings
  dialog, a filter bar), shown by one preview. A feature or attribute is not a use case; it is
  an API row and, at most, a sentence inside a use case.

## Skeleton

```
---
title: Select                      the catalog name
description: One sentence: what it is and what it is for (the intro).
tag: tp-select
parts: [tp-select-option]          constituent tags, when the component has them
---
<Preview … />                      hero: the canonical base example, before any heading
## Usage                           what it is for, when to pick it over a sibling; no attribute list
### <Use case>                     one section per major use case: the component in a typical
### <Use case>                        scenario, then a short paragraph on why it is shaped so;
                                      other configurations get a sentence naming the attribute
### Variants                       only for a `variant` axis: one preview with every value
## Keyboard                        only beyond native behavior: a `Key | Action` table with <Keys />
```

Headings are `##` (Usage, Keyboard) and `###` only. The page uses `<Preview />` and `<Keys />`,
nothing else from MDX, and no import or export.

`<Preview code={`…`} />` takes `script={`…`}` for behavior markup cannot express, `title` only
where a section shows several previews (single and multiple selection) so they can be told
apart, `align` (`stretch` for a composition that fills the width), `viewport` (block size of a
scrolling example), `language` and `codeOnly` (a hero with nothing visual). `code` and `script`
are template literals escaping only backticks, dollar signs and backslashes; the code is both
what renders and what a reader copies. `<Keys keys="mod+shift+z" />` draws a shortcut.

## Writing use cases

The component stays the subject: the smallest surrounding markup that makes the setting real.

- Not a bare control: a select with three fruit options proves nothing. Put it in a field with
  a real label and real data.
- Not a buried control: no whole screens or multi-step flows, no second component that draws
  more attention. If a reader has to hunt for the tag the page is about, the scenario is too
  big. Full compositions are patterns on the website.
- Nested roles are library components (`tp-icon`, `tp-badge`, `tp-spinner`), never inline
  SVG or styled spans; an icon is set from a script importing `@tweakpad/ui/icons/<name>`.
- A use case is warranted by a different intent or composition, not a different attribute;
  four to eight for a rich component, one or two for a primitive.
- Scripts are short and specific to the scenario, select by ids unique on the page and present
  in their own code, use named or namespace imports from the library, its entries, `lit`, icon
  modules and the text editor's engine packages, and never register elements.

## What prose is for

Prose explains intent and choice: when to use the component, why a use case is shaped that
way, what to prefer over what. It never walks the API (values with defaults, inherited
properties, what the component has no API for): if a sentence could be a table row, it is JSDoc
on the element and the table carries it. It never mentions Storybook, the examples themselves,
specifications, third-party libraries, class names, presentation keys or `data-*` markers.

## Read it as the developer

A page is done when its rendering reads well, not when the checks pass. Open the Docs page
(and the website page once it reads the package) and read it top to bottom as a developer
meeting the component: nothing is said twice (a caption that repeats its heading, a sentence
that restates the one before), each example is laid out for the canvas it is in (centering
and widths copied from the other rendering are the usual tell), every sentence earns its
place. A page ported from the website is edited for this, not pasted. Fix what reads badly
before calling the page done, and say what the read found.
