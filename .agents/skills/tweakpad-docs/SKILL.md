---
name: tweakpad-docs
description: 'Write, merge, change or review the documentation page of a Tweakpad component or widget: the single page in docs/components/<slug>.mdx or docs/widgets/<slug>.mdx that Storybook and tweakpad.com/docs both render, its previews, its story pairing, the JSDoc that feeds its Properties table and API Reference, and the website/Storybook renderings of it. Enforces the page purpose, the fixed structure, the parity rule against churn, the shared writing style and the checks that fail a non-conforming page. Applies to the library and the site repo.'
---

# Tweakpad documentation pages

## Purpose: a guide and a reference, never a dump

A page is what a developer reads while building an app: it teaches the component through the
scenarios they will actually meet, and it is the reference they come back to. Every addition must
make the page easier to learn from or to look things up in, or it does not go in.

- **The page is not a garbage bin.** Adding a feature or a property never adds a use case by
  itself: the property gets one JSDoc line, which becomes its row in the Properties table. A new
  section is justified only by a prominent capability that changes behavior substantially, or
  when the user asks for one.
- **Existing sections are not churned.** Never reword, re-illustrate or reorder a section because
  something new was added. A page changes only where it is wrong, broken or bloated.
- **Use cases are familiar scenarios,** the most common ones a developer needs, ordered from simple
  to complex. Each showcases a feature, several properties working together, never one property
  at a time like a machine. A section never re-introduces what the hero or an earlier section
  already shows.

## One page, two renderings

Every published component and widget has exactly one page, written once in the library:

- **Storybook** renders it with Storybook's own blocks.
- **The website** (site repo, served at tweakpad.com/docs) renders it with library components.

The page is the single source of truth for content; rendering is never shared. A page that breaks
a rule below fails `npm test`, `npm run build` or `check-docs.mjs`, and a failing page is an
unfinished task.

| What                                   | Where                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| The page (authored)                    | `docs/components/<slug>.mdx`, `docs/motion/<group>/<slug>.mdx`, `docs/widgets/<slug>.mdx`               |
| Properties and API data (generated)    | JSDoc → Custom Elements Manifest → `elementApi` (`src/docs/api.ts`)                                     |
| Type signatures and cards (generated)  | TypeScript compiler → `scripts/manifest/api-types.mjs` → `dist/api-types.json`                          |
| Related data (generated, website only) | manifest `renders` → `dist/docs.json`, plus pattern frontmatter `components`                            |
| Storybook rendering                    | `.storybook/docs-page.mdx`, `.storybook/docs-library.mdx`, `src/stories/<slug>.stories.ts`              |
| Website rendering                      | site repo `src/pages/docs/[...slug].astro`, `src/components/{Preview,Code,Keys,ApiTable}.astro`         |
| Frozen sources and ledgers             | `plans/docs/sources/…`, `plans/docs/ledger/<section>/<slug>.md`                                         |

The website never authors component pages; it reads them and the manifest from the installed
`@tweakpad/ui` package. Preview site changes with `npm link`.

## The structure (both systems)

1. **Header:** frontmatter `title`, `description`, `tag`.
2. **Main use case:** the hero `<Preview>`, before any heading.
3. **Properties** (generated): one table, one row per property, right under the hero. A row names
   the property (and its attribute, when it has one), says what it does, shows its type and its
   default, and, in Storybook, a control when the value is controllable. Attribute-backed rows
   come first, JavaScript-only rows after. No sections.
4. **Usage:** `## Usage` and its `###` use cases. Keyboard is a `###` (or `## Keyboard`) only when
   the element handles keys beyond native behavior.
5. **API Reference** (generated): only what the Properties table does not cover — Events,
   Methods, Slots, CSS parts and CSS custom properties, each only when it has rows. Every tag in
   frontmatter `parts` gets its own Properties table and API groups here. Attributes and
   properties are never repeated.
6. **Related** (generated, website only).

[references/structure.md](references/structure.md) has the grammar, the elements, the table and
type rules, and how each system renders each section.

## Parity: one source of truth, no churn

89 pages came from a website page (A). The checker compares each against its frozen A: headings,
paragraphs and previews stay unchanged and in order. That rule exists to stop churn, not to
freeze mistakes: a change to A content is allowed only as a **forced edit** with a ledger row and
its reason, from the closed list in [references/merge.md](references/merge.md):

- a preview that does not work is repaired;
- an API that no longer exists is removed from text and previews;
- **`removed`:** a section or preview that duplicates the hero or an earlier section, or exists
  only to introduce one non-prominent property that the Properties table documents;
- the mechanical cases of the merge (icons, renamed tags, generated-section names, stale imports).

Nothing else rewrites A. Never rephrase, reorder or "improve" it.

## Writing

Follow [references/writing-style.md](references/writing-style.md): the register sits between a
tutorial and a reference, prose explains intent and choice, and a sentence that could be a table
row belongs in JSDoc.

## Workflow

1. **Read first:** the page, the element's source and JSDoc, its family's part descriptions, and
   its ledger.
2. **Write the least change.** Prefer a JSDoc line over prose, prose over a new section, and an
   existing section over a new one. Fill missing JSDoc instead of writing API prose.
3. **Pair the story:** `src/stories/<slug>.stories.ts` declares
   `parameters: { docs: libraryDocs('<section>/<slug>') }`, has one `Default` story whose default
   args render the hero and whose Controls are real, and tags every other story `!autodocs`.
4. **Check:**
   ```sh
   node .agents/skills/tweakpad-docs/scripts/check-docs.mjs <section>/<slug>   # or --all
   npm test && npm run build
   ```
5. **Read it rendered** in Chrome through the `chrome-devtools` MCP server (never headless):
   Storybook, and the website through `npm link` and the site's dev server. Read it as a developer
   would: sections in order, previews run, the Properties table has a description, type and
   default on every row, type names open their cards (and the names inside them) without widening
   the table, the API Reference repeats nothing. Use one tab
   and close the tabs you opened.

**Done** means the checks pass in the library, `npm run build` passes in the site, both renderings
were read, and every forced edit is a ledger row.

## Never

- Add a use case, a preview or a paragraph just because a property or feature was added.
- Reword, reorder or trim existing text outside the forced-edit list.
- Restate a Properties or API row in prose, or repeat attributes and properties in the API
  Reference.
- Print a type declaration inside the table, or rewrite one by hand: types are the compiler's
  signatures with clickable cards. Never give a callback or object a "Set object" control.
- Author a page, a Properties table or an API section in the website repo, or put Related in
  Storybook.
- Use library elements in Storybook's docs chrome, or share a rendering between the two systems.
- Name third-party reference libraries, specifications, `plans/` records, Storybook or design
  rationale in a page.
