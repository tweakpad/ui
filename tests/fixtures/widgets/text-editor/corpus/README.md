# Text editor content corpus

Round-trip corpus of `tp-text-editor`'s portable formats. The record lives in
`plans/widgets/text-editor/implementation-checklist.md` (C-103, V-111, V-113 to V-127, V-544).
The unit tests in `src/foundation/text-editor/content.test.ts` read every file here, through the
loader of `src/foundation/text-editor/content/corpus.test.ts` and the custom node definitions of
`nodes.ts` (a callout, an embed and a mention), which the browser fixtures import too; the parity
page `../engines.html` loads the canonical documents into both engines.

## Files

Each document `NN-name` has:

- `NN-name.input.html` (`NN-name.input.md` for document 8): the content as it is pasted, set or
  typed in, with the constructs the document covers;
- `NN-name.html`: its canonical HTML, the golden of the portable profile; reading it and writing
  it again gives it back unchanged;
- `NN-name.md` and `NN-name.txt`: its Markdown and text exports, with exactly the losses that the
  content model declares for each format.

| Document      | Covers                                                                                                                                                                                                                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-marks`    | every mark alone and combined, code inside a link, bold code, nested superscript and subscript, every palette name as text color and highlight, a mark without a name, runs of spaces and leading spaces, Markdown syntax characters as text, right-to-left text and emoji                                      |
| `02-blocks`   | every block kind with alignment, empty paragraphs, quotes with line breaks and with two paragraphs, code with blank lines, tabs and backticks, images with and without alternative text and width                                                                                                               |
| `03-lists`    | lists three levels deep, mixed kinds under one item, an ordered start, checked and unchecked task items, adjacent lists, a line break and an alignment in an item                                                                                                                                               |
| `04-tables`   | a 1×1 table, header row and column, column widths, row and column spans, backgrounds, alignment, multi-paragraph cells, a table without a header row and one of 20 columns                                                                                                                                      |
| `05-custom`   | a callout, an embed and a mention, with the definitions of `nodes.ts`, and an element whose `data-type` names no definition                                                                                                                                                                                     |
| `06-ids`      | missing, invalid, duplicate and too long block identifiers, and identifiers on list items, tables, cell paragraphs and dividers                                                                                                                                                                                 |
| `07-hostile`  | scripts and styles, event handlers, script and data URLs, frames, office suite spans and a bold wrapper of normal weight, nested quotes, `div` soup, aliases, unnamed and foreign marks, colors outside the palette, bold code, superscript inside subscript, and an editing root's DOM in the class vocabulary |
| `08-markdown` | CommonMark and the GitHub extensions: soft and hard line breaks, task items, an aligned table, fenced code with an info string, an alert, a nested quote, extended autolinks, a footnote, raw HTML inside and outside the element policy, a titled image, a reference link                                      |
| `portable`    | `portable.html` is a canonical document holding every block kind, marks, colors and a table with spans and widths; `portable.md` is its Markdown export                                                                                                                                                         |

The parity page also loads four canonical documents that have no input and no Markdown or text
golden: their HTML is the golden, every block carries a fixed identifier, and reading one and
writing it again gives it back unchanged (`corpus.test.ts`, "canonical parity documents").

| Document     | Covers                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tables`     | a paragraph; `tables0001`, a 2×3 table `a1 a2 a3 / b1 b2 b3` with a header row; a paragraph; `tables0002`, a 3×3 table with a header row; `tables0003`, a table with a header row and a header column, a 2×2 merged cell, column widths, `green` backgrounds and alignment; a paragraph; `tables0004`, a 2×2 table `Item Borrower / Field recorder Tove` with a header row and text in every cell; a closing paragraph |
| `addressing` | a paragraph `a😀b c` with a mention and a hard break (read with `nodes.ts`), a 3×3 table whose cell (1,1) spans two columns, and a paragraph                                                                                                                                                                                                                                                                           |
| `state`      | bold, blue and yellow-highlighted runs, a centered paragraph followed by a start-aligned one with the link `docs`, an empty paragraph, a 2×2 table with a header row and a merged cell, a code block, a level-2 heading and a bullet list                                                                                                                                                                              |
| `lists`      | bullet and ordered lists three levels deep, an ordered `start`, checked and unchecked task items nested two levels, a table, an image whose relative source `pantry-shelf.svg` resolves beside the page and a callout (read with `nodes.ts`)                                                                                                                                                                           |

## Rules

- Content is original sample content.
- The tests read HTML in Node through a structural tree builder
  (`src/foundation/text-editor/content/html-source.test.ts`), which is no HTML tree builder: an
  input closes every non-void element and nests elements only where a browser's parser keeps
  them, for example no block inside `p`. The real `DOMParser` path runs in the browser.
- Blocks without a valid identifier receive `te00000001`, `te00000002`, … in document order, so
  the goldens are stable; generated identifiers in an editor are random.
- A golden ends with one line feed. The HTML and text serializations write none, so the tests
  compare a golden without its last line feed; the Markdown serialization ends with its own.
- Goldens hold no trailing whitespace. The documents avoid trailing spaces at the end of a line
  and table rows that end in an empty or spanned cell, which the text format writes as a trailing
  tab; the unit tests of the converters cover those cases.
- A golden changes only with a deliberate change of a format, reviewed against the specification
  of the content formats; copy the new value from the failing test.
