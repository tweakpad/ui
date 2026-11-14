# Page structure

## The file

```
---
title: Select                      the component name, as the website page names it
description: One sentence: what it is and what it is for.
tag: tp-select
parts: [tp-select-option]          constituent tags with their own API tables, when any
---
<Preview … />                      1. main use case (hero): before any heading, minimal
                                      (the generated Properties table renders right after it)
## Usage                           2. the first heading, always
                                      optional prose on what it is for and when to pick it
<Preview … />                         previews may sit directly under Usage
### <Section>                      3. one use case per section: a familiar scenario showing a
### <Section>                         feature, simple to complex; short prose + small preview(s)
### Keyboard                          only when the element handles keys beyond native behavior
## Keyboard                        (alternative placement, after Usage)
                                   Properties, API Reference and Related are generated
```

Rules the checks enforce:

- **Frontmatter.** It has `title`, `description` and `tag` (a `tp-` element), plus optionally
  `parts`, as a one-line `[a, b]` list or a YAML block list. Nothing else is allowed.
- **Hero.** The first preview comes before the first heading.
- **Headings.**
  - `## Usage` is the first heading.
  - The only `##` headings are `## Usage` and `## Keyboard`.
  - Everything else is `###` or deeper.
  - No heading is named API, API Reference, Attributes, Properties, Events, Methods, Slots,
    CSS parts or Related. Those sections are generated.
- **Elements.** Only `<Preview />`, `<Code />` and `<Keys />`, all self-closing. No `import` or
  `export` lines: each rendering supplies the elements.
- **Literals.** Multi-line attribute values are template literals (`code={`…`}`). They escape
  only `` \` ``, `\$` and `\\`, and never interpolate.

## Elements

`<Preview title="…" code={`…`} />` is a live example. Its `code` is both what renders and what a
reader copies. Optional attributes:

- `script={`…`}`: behavior that markup cannot express. The script:
  - runs as a module after the markup;
  - imports only from `@tweakpad/ui`, its exported subpaths, `lit` and the text editor's engine
    packages, with named or namespace imports;
  - never registers elements, because the page does;
  - selects its elements by ids that are unique on the page.
- `align`: `center` (default) for one control, `start` or `stretch` for a composition.
- `viewport`: the block size of a scrolling example's own viewport.
- `language`.
- `codeOnly`: the preview has nothing visual, so only its source shows.

`<Code code={`…`} language="typescript" label="…" />` is a standalone code sample with no live
preview, such as install commands or engine setup.

`<Keys keys="mod+shift+z" />` draws a shortcut inside a Keyboard Markdown table (`| Key | Action |`).

## How each system renders each section

| Section       | Storybook (Storybook blocks, no `tp-*` chrome)                             | Website (library components)                                      | Source                                      |
| ------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------- |
| Header        | `Title`, `Description`, tag chip                                           | `h1`, description, tag chip                                       | frontmatter                                 |
| Main use case | `Primary` (Default story, source = hero code)                              | `Preview.astro` of the hero                                       | hero `<Preview>`                            |
| Properties    | `Controls` args table (its rows from `members`, controls from story args)  | `ApiTable` `tp-table` of `members`                                | `elementApi().members`                      |
| Usage         | the page through `LibraryDoc`: `Canvas` per preview, `Source` per `<Code>` | the page through `<Content components={{ Preview, Code, Keys }}>` | the page                                    |
| API Reference | Storybook args tables                                                      | `tp-table`s                                                       | `elementApi` (manifest, JSDoc)              |
| Related       | never                                                                      | component/widget cards, then pattern cards                        | `docs.json` `related`, pattern `components` |

The Default story's default args render the hero's markup, and `libraryDocs()` sets the hero code
as its source.

## Properties table and API Reference

`elementApi(manifest, tag)` (`src/docs/api.ts`) is the only filter.

- **`members`** feeds the Properties table: one row per own public property, an attribute-backed
  row (named by its property, with its attribute) before JavaScript-only ones, a `default…`
  setting folded into its property. A member the element redeclares (`override orientation`) is
  its own.
- **Columns:** name (+ attribute), description, type, default, and in Storybook a control.
  - **Type** shows the signature exactly as TypeScript declares it, on one line: a choice list
    as its values (`'line' | 'displace'`), a callback as its signature, otherwise the named type.
    Each project type name in it is a token a click opens; no code block or declaration ever
    renders inside the table, so the table keeps its width.
    - **A click opens the type's card**, as an editor's hover does: a popover anchored to the token
      with the type's declaration (pretty-printed, highlighted), its doc comment, and the import
      that gives it (`import type { X } from '@tweakpad/ui/drag-drop'`). Type names in the card
      open their own cards, and the card keeps a back step. Platform and third-party types end the
      chain as plain names.
    - **Generated, never authored.** Signatures and cards are read from the TypeScript compiler
      when `npm run cem` runs (`dist/api-types.json`). It fails when a public signature names a
      project type that does not resolve, is not exported from a package entry, or has no doc
      comment: fix the source (export it, or add one JSDoc line), never the docs.
    - Storybook draws the card with its own components (no `tp-*` in the docs chrome); the website
      with the library Popover and Code block styling. Methods' and events' signatures in the API
      Reference use the same tokens and cards.
  - **Control** exists only for a choice, boolean, string or number value that is not read-only.
    Callbacks, objects and read-only state have no control (never "Set object").
- **API Reference** prints `events`, `methods`, `slots`, `cssParts`, `cssProperties`, in that
  order, each only when it has rows. Attributes and properties of the page's tag never appear
  there. A tag in `parts` gets its own Properties table, then its API groups.

Rows come from JSDoc: the class summary; one line per public reactive field and method saying
what it does (never restating its values or default, which the row shows);
`@fires {DetailType} tp-name - …`; `@slot`; `@cssprop`; `PartDefinition.description` per shadow
part. The build fails on an undescribed row of a documented tag or part.

## Vocabulary

- **Variant:** a value of the axis named `variant`. It is a visual treatment only. `size` and
  `orientation` are sibling axes, not variants.
- **Part:** a constituent element with its own tag (listed in `parts`, with its own API tables), or
  a shadow part (`::part(name)`, a generated API row).
- **Configuration:** an attribute or property that modulates the element. Its table row explains
  it; a Usage section shows it only as part of a feature's use case.
