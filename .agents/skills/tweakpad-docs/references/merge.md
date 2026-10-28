# Merging the website page (A) and Storybook material (B)

**The goal is one page with minimal modifications. It is never a rewrite. Changing wording is not
what this is for.** The user's priorities, in order:

1. A, the website page, takes precedence. Its demos, colors, text, headings and order stay
   exactly as they are.
2. B, Storybook, extends A only with what A lacks: a use case, a preview or an explanation.
3. Where A and B cover the same thing, the result keeps A's wording and adds only B's missing
   facts.

## Sources

`capture-sources.mjs` froze both sides once, before either was deleted:

- `plans/docs/sources/website/<section>/<slug>.mdx` holds A: the website page byte for byte.
- `plans/docs/sources/storybook/<section>/<slug>.json` holds B, as a list of items:
  - `md: <heading path>`: one per section of the former `docs/<slug>.md`, plus `md: (intro)` for
    the text before its first heading.
  - `example: <title>`: one per entry of `src/stories/<slug>.examples.ts`. Each comes in Preview
    form: `title`, `description`, `code`, and `script` without the registration and stylesheet
    imports.
  - `story: <ExportName>`: one per story other than `Default`, with its description and source.

Always work from these files, not from memory of the old pages.

## Procedure for one page

1. **Move A.** Copy `plans/docs/sources/website/<section>/<slug>.mdx` to
   `docs/<section>/<slug>.mdx`. Then make only these mechanical edits; the checker applies the
   same ones to its baseline, so they need no ledger row:
   - delete the `import … from '…astro'` lines;
   - delete the frontmatter fields `reference`, `members` and `order`.
2. **Classify every B item** in order. Exactly one disposition each:
   - **`in-A`:** A already shows or says it. Nothing changes.
   - **`merged`:** it overlaps an A section and adds a fact or a preview A lacks.
     - Insert B's sentences **verbatim** after the A paragraph they extend. Only the smallest
       grammatical join is allowed, such as a pronoun the new position needs.
     - Insert B's preview verbatim after A's preview in that section, only when it shows
       something A's previews don't.
     - A's own text is untouched. Name the A section in the ledger's Target.
   - **`appended`:** A has nothing like it. Add a new `###` section at the end of `## Usage`, after
     all of A's sections, using B's own title as the heading and B's description and preview
     verbatim. Several appended sections keep B's order.
   - **`dropped-api`:** it restates API rows (lists of attributes, values, defaults, events or
     parts). The generated API Reference covers it. If JSDoc lacks the row's description, add it
     there.
   - **`dropped-storybook`:** it is Storybook-only or fixture material. This covers verification
     stories, Controls notes, catalog and fixture setup, and text about Storybook, plans,
     specifications or third-party references.
3. **Forced edits to A.** These are allowed only when a rule makes A impossible to keep as is.
   Each one gets a Forced edits row:
   - an inline `<svg>` icon becomes a `tp-icon` with the same icon, set from the preview's script
     (library reuse);
   - a heading named like a generated section (API, Related) is renamed;
   - prose that names a third-party reference library loses that name.
   - an import a preview's script makes from an entry that no longer exports it moves to the
     entry that does (the text editor's engine factories live under
     `@tweakpad/ui/text-editor/adapters/<engine>`);
   - an attribute the element does not read is replaced by the one it does, keeping the same
     text (`aria-label` on `tp-menu-radio-group` becomes `label`).

   Anything else is not a forced edit. If a check fails on A content for another reason, stop and
   report it. Do not edit A to make the check pass.

4. **Never:**
   - rephrase, reorder, shorten, merge or "improve" A's or B's sentences;
   - restyle previews or change their colors, labels or data;
   - invent new previews, use cases or sample data;
   - move an A section;
   - fill gaps with your own explanations, except JSDoc for an undescribed API row.
5. **JSDoc.** Take descriptions from commit `83070e6` first (`git show 83070e6:<path>`). Write a new
   one only for a row that commit leaves empty, in one plain sentence.
6. **Story.**
   - Switch `src/stories/<slug>.stories.ts` to `libraryDocs('<section>/<slug>')`.
   - Make the Default story's default args render the hero markup.
   - Delete B's documentation-only files (`docs/<slug>.md`, `<slug>.examples.ts`,
     `<slug>-example.js`/`.d.ts`) once nothing else imports them. Fixtures and the catalog keep
     theirs; check with `grep -r <module> src tests .storybook`.
   - Tag remaining extra stories `!autodocs`.
   - Remove the tag from `scripts/docs/pending.json`.

## The ledger

`plans/docs/ledger/<section>/<slug>.md` takes exactly this shape, which the checker reads:

```markdown
# components/badge

## B items

| Item                  | Disposition       | Target                |
| --------------------- | ----------------- | --------------------- |
| md: (intro)           | in-A              | ## Usage              |
| md: Accessibility     | merged            | ### Buttons and links |
| example: Filter chips | appended          | ### Filter chips      |
| story: Interactive    | dropped-storybook | fixture               |

## Forced edits

| Kind    | A text     | Reason                                                |
| ------- | ---------- | ----------------------------------------------------- |
| preview | With marks | inline svg icons become tp-icon (check, circle-alert) |
```

- **Item** is the B item id exactly as captured. Every captured item has one row.
- **Kind** is `preview` (A text = the preview title), `prose` (A text = the paragraph's first
  words) or `heading` (A text = the heading).
- When a page has no forced edits, keep the section with the header row only.

## What the checker verifies

`check-docs.mjs <section>/<slug>` fails when any of the following is true:

- A's frontmatter `title`, `description` or `tag` differs.
- A's headings are not the first headings of the page, in A's order.
- A's previews do not appear in order with an identical title, code, script and align, unless a
  `preview` forced-edit row lists them.
- An A paragraph is missing or altered, unless a `prose` forced-edit row lists it. A paragraph
  that only gained B sentences after it still passes.
- A captured B item has no ledger row, or a ledger row names an item that was never captured.
- A disposition is unknown.
- The page grammar or skeleton fails, or an Attribute, Property or Event row is undescribed. The
  last check needs `npm run build` (for `dist/`).
