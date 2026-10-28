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
## Usage                           2. the first heading, always
                                      optional prose on what it is for and when to pick it
<Preview … />                         previews may sit directly under Usage
### <Section>                      3. one section per variant set, configuration, state or
### <Section>                         composition worth showing: short prose + small preview(s)
### Keyboard                          only when the element handles keys beyond native behavior
## Keyboard                        (alternative placement, after Usage)
                                   4. API Reference and 5. Related are generated; never write them
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
| Main use case | `Primary` (Default story, source = hero code) + `Controls`                 | `Preview.astro` of the hero                                       | hero `<Preview>` + story args               |
| Usage         | the page through `LibraryDoc`: `Canvas` per preview, `Source` per `<Code>` | the page through `<Content components={{ Preview, Code, Keys }}>` | the page                                    |
| API Reference | `.tp-docs-api` tables                                                      | `tp-table`s                                                       | `elementApi` (manifest, JSDoc)              |
| Related       | never                                                                      | component/widget cards, then pattern cards                        | `docs.json` `related`, pattern `components` |

The Default story's default args render the hero's markup, and `libraryDocs()` sets the hero code
as its source. Interactive Controls are a Storybook feature: they stay under the Default story and
never become page content.

## API data

`elementApi(manifest, tag)` (`src/docs/api.ts`) is the only filter. Both systems print its groups
in the order:

1. `attributes`: name, property, type, default, description.
2. `properties`: own public properties without an attribute, with readonly.
3. `events`: name, detail type, description.
4. `methods`, `slots`, `cssParts`, `cssProperties`.

A group with no rows is omitted. Rows come from JSDoc:

- the class summary;
- a doc comment on every public reactive field and method;
- `@fires {DetailType} tp-name - …`;
- `@slot - …` for the default slot and `@slot name - …` for named slots;
- `@cssprop`;
- `PartDefinition.description` for each shadow part in the family.

The build fails on an undescribed row of a documented tag or part.

## Vocabulary

- **Variant:** a value of the axis named `variant`. It is a visual treatment only. `size` and
  `orientation` are sibling axes, not variants.
- **Part:** a constituent element with its own tag (listed in `parts`, with its own API tables), or
  a shadow part (`::part(name)`, a generated API row).
- **Configuration:** an attribute or property that modulates the element. A Usage section shows it
  with a small example; the API table explains every value.
