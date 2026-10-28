---
name: tweakpad-docs
description: 'Write, merge, change or review the documentation page of a Tweakpad component or widget: the single page in docs/components/<slug>.mdx or docs/widgets/<slug>.mdx that Storybook and tweakpad.com/docs both render, its previews, its story pairing, the JSDoc that feeds its API Reference, and the website/Storybook renderings of it. Enforces the fixed page structure, the website-first minimal merge, the shared writing style and the checks that fail a non-conforming page. Applies to the library and the tweakpad.github.io site.'
---

# Tweakpad documentation pages

Every published component and widget has exactly one documentation page. It is written once in
the library and rendered by two systems, each in its own style:

- **Storybook** (internal developer docs) renders it with Storybook's own blocks.
- **The website** (`tweakpad.github.io`, served at tweakpad.com/docs) renders it with library
  components.

The page is the single source of truth for content. Rendering is never shared. A page that
breaks a rule below fails `npm test`, `npm run build` or `check-docs.mjs`. A failing page is an
unfinished task, whatever else was done.

## Where things live

| What                                   | Where                                                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| The page (authored)                    | `docs/components/<slug>.mdx`, `docs/widgets/<slug>.mdx` (library)                                                                             |
| API Reference data (generated)         | JSDoc on the element → Custom Elements Manifest → `elementApi` (`src/docs/api.ts`)                                                            |
| Related data (generated, website only) | manifest `renders` → `relatedPages` → `dist/docs.json`, plus pattern frontmatter `components`                                                 |
| Storybook rendering                    | `.storybook/docs-page.mdx`, `.storybook/docs-library.mdx`, `src/stories/<slug>.stories.ts`                                                    |
| Website rendering                      | `src/pages/docs/[...slug].astro`, `src/components/{Preview,Code,Keys,ApiTable}.astro` (site repo)                                             |
| Design tokens list (both systems)      | `src/docs/token-catalog.ts` → `dist/docs.json` `tokens`; Storybook's Design tokens page, the website's Design tokens page (`TokenList.astro`) |
| Merge sources (frozen)                 | `plans/docs/sources/website/…` (A), `plans/docs/sources/storybook/…` (B)                                                                      |
| Merge ledger                           | `plans/docs/ledger/<section>/<slug>.md`                                                                                                       |

The website never authors component or widget pages. It reads them from the installed
`@tweakpad/ui` package (`docs/**/*.mdx` and `dist/docs.json`), the same package its API tables
come from, so content and API always describe one version. To change a page, edit it in the
library. The site picks it up on the next release and dependency bump; use `npm link` to preview
it locally.

## The structure (mandatory, both systems)

1. **Header:** name, description, tag, from the frontmatter `title`, `description` and `tag`.
2. **Main use case:** the hero `<Preview>`, a minimal demo placed before any heading.
3. **Usage:** `## Usage`, with its `###` sections presenting variants, attributes and
   configuration options as short examples. Keyboard is a `###` section of Usage (or `## Keyboard`)
   only when the element handles keys beyond native behavior.
4. **API Reference** (generated, never authored), in this order:
   1. Attributes
   2. Properties
   3. Events
   4. Methods, Slots, CSS parts and CSS custom properties, each only when the element has rows
      for it.

   The same tables repeat for every tag in the frontmatter `parts`.

5. **Related** (generated, **website only**): the components and widgets that render this element,
   and the patterns built from it. At most four cards show; the rest open from a library
   Collapsible labelled "Show more". When nothing uses the element, the section, its heading and
   its table-of-contents entry are left out entirely. Storybook never shows Related.

[references/structure.md](references/structure.md) has the page grammar, the allowed elements and
how each system renders each section.

## Rendering is not shared

The two systems share **content and DOM-free data only**: the page text and preview code, and the
rows from `elementApi` and `docs.json`. Never one HTML template, component or stylesheet for both.

- **Storybook** renders with Storybook blocks and Storybook styling:
  - `Title` and `Description`, with the tag in a code chip.
  - `Primary`: the Default story with its `Controls`. Its source is the hero code, and its
    default args render the hero markup.
  - `Canvas` for every other preview, and the `Source` block for `<Code>`.
  - Storybook-styled API tables (`.tp-docs-api`).
  - **No library elements** (`tp-table`, `tp-code-block`, …) in the docs chrome. Library elements
    appear only inside previews, and in the key hints inside the Keyboard `<Keys>` cells.
- **The website** renders with library components for every part:
  - `Preview.astro` for the canvas, its toolbar (`tp-toggle-group`, `tp-button`, `tp-tooltip`)
    and its code (`tp-code-block`);
  - `Code.astro` (`tp-code-block`);
  - API and Markdown tables as `tp-table`;
  - `Keys.astro` (`tp-key-hint-group`);
  - Related cards.

  No native `<table>`, `<pre>` or `<button>` appears in the page chrome.

## Writing

Follow [references/writing-style.md](references/writing-style.md). In short:

- The register sits between a tutorial and a technical reference. A reader learns everything the
  component can do through small, focused examples, each in a short section.
- Never write a step-by-step walkthrough or a full-page scenario. Never write prose that walks the
  API.
- Length follows complexity: a primitive gets a few sections, a rich component or widget gets
  many.

## Merging the two former sources (minimal diff, never a rewrite)

Follow [references/merge.md](references/merge.md) for every page that still has a website page (A)
or Storybook material (B) not yet merged. The rules:

- **A is moved, not rewritten.** Its frontmatter, hero, headings, previews and prose are copied
  byte for byte.
- **B extends A verbatim** where A lacks something.
- **Overlaps keep A's wording** and gain only B's missing sentences or previews.
- **Changing wording is not the goal.** Never rephrase, reorder, shorten or "improve" text from
  either side.
- **Never invent** a use case, a demo or sample content.
- **Every B item and every forced edit is a ledger row.**

## Workflow

1. **Read first.**
   - The page, if it exists.
   - The element's source and JSDoc, and its family's part descriptions
     (`src/presentation/families/<slug>.ts`).
   - When merging: the frozen A and B sources under `plans/docs/sources/`.
2. **Write or change the page.**
   - Keep the structure.
   - Fill missing JSDoc instead of writing API prose: a class summary, one line per public
     attribute, property and method, `@fires {Type} tp-name - …`, `@slot`, `@cssprop`, and
     `PartDefinition.description` per part.
3. **Pair the story.**
   - `src/stories/<slug>.stories.ts` declares `parameters: { docs: libraryDocs('<section>/<slug>') }`.
   - It has one `Default` story with real Controls.
   - Every other story is a fixture tagged `!autodocs`.
   - No `docs/<slug>.md?raw`, `examples:` or `*.examples.ts` for documentation.
4. **Check.** Run these in the library:
   ```sh
   node .agents/skills/tweakpad-docs/scripts/check-docs.mjs <section>/<slug>   # or --all
   npm test && npm run build
   ```
   `check-docs.mjs` runs:
   - the page grammar and the skeleton;
   - A parity: every A heading, preview and paragraph is unchanged and in order, except listed
     forced edits;
   - ledger completeness: every captured B item has a disposition;
   - API completeness: no undescribed Attribute, Property or Event row.
5. **Read it rendered.**
   - Open both renderings in Chrome through the `chrome-devtools` MCP server, never headless and
     never `claude-in-chrome`:
     - Storybook on a static build (`npm run build-storybook`, then serve `storybook-static`);
     - the website (`npm link` the library, then `npm run dev` in the site).
   - Read the page as a developer would. Check that:
     - the sections are in order;
     - frontmatter is not printed as text;
     - every preview runs at full width and its script works;
     - Keyboard tables render;
     - API tables carry descriptions;
     - Storybook has no Related and no `tp-*` chrome;
     - the website has Related.
   - Use one tab, reload between pages, and close the tabs you opened.

**Done** means:

- `check-docs.mjs`, `npm test` and `npm run build` pass in the library, and `npm run build`
  passes in the site.
- Both renderings were read in Chrome.
- The ledger is complete.

A page that passes only the build is not done.

## Never

- Author a component or widget page, or an API or Related section, in the website repo.
- Put Related in Storybook.
- Use library elements in Storybook's docs chrome.
- Share a rendering component or HTML between the two systems.
- Reword, reorder or trim existing A text, or invent previews or samples during a merge.
- Restate API rows in prose, or name third-party reference libraries, specifications, `plans/`
  records, Storybook or design rationale in a page (see writing-style.md).
- Leave a captured B item without a ledger row, or a forced edit unlisted.
