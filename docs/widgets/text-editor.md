# Text editor

`tp-text-editor` edits one rich-text document: paragraphs, headings, quotes, code blocks, lists,
dividers, images and tables, holding text with marks, links and hard breaks. An editing engine
that your application supplies owns the document, the editing commands, input handling and
history. The editor renders the fixed toolbar itself; every other control is a feature you import
and assign, so a page bundles only what it uses. There is no controlled value: `defaultValue`
supplies the initial content, and the content is serialized only when you ask for it.

## Setup

The library does not depend on an engine. Install the packages of one engine; the code of every
example passes their modules to that engine's adapter factory and assigns the engine it returns to
`engine`. The table modules are optional; without them the editor offers no table tools.

```sh
npm install @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extension-list @tiptap/extension-table
```

```sh
npm install lexical @lexical/extension @lexical/rich-text @lexical/history @lexical/selection @lexical/list @lexical/link @lexical/markdown @lexical/code @lexical/a11y @lexical/html @lexical/table
```

Each adapter is its own entry, `createTiptapEngine` in `@tweakpad/ui/text-editor/adapters/tiptap`
and `createLexicalEngine` in `@tweakpad/ui/text-editor/adapters/lexical`, so an application
bundles only the adapter it imports; the engine contract, the tools and the node helpers stay in
`@tweakpad/ui/text-editor`. Both give the editor the same properties, events, keyboard and
appearance. Each factory call returns a new engine, so every editor needs its own; assigning
another engine remounts the editor with its content kept.

## Features

Features are plain objects that the factories of `@tweakpad/ui/widgets` create and that you assign
to `features`. Your bundler drops the code of every feature you do not import, the library
components it renders included. Without any, the editor is its core: the fixed toolbar with
history, block kinds, marks, colors and alignment, the placeholder and the status.

| Factory                                             | Adds                                                                                  | Tools                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `textEditorLinks()`                                 | The link popover and the link editor.                                                 | `link`                                                                 |
| `textEditorTables({ stickyHeaders })`               | The size picker, the row, column and cell menus, column resize and the sticky header. | `table` and the `table-*` tools, `cell-background`, `table-cell-align` |
| `textEditorImages({ upload, accept, maxFileSize })` | Image upload, pasted and dropped image files and the alternative text field.          | `image`                                                                |
| `textEditorSelectionToolbar()`                      | The toolbar that floats over a text selection or a cell range.                        | none of its own                                                        |
| `textEditorBlocks()`                                | The block gutter, block mode, the block menu and block drag.                          | `duplicate-block`, `copy-block-link`, `move-block-*`, `delete-block`   |
| `textEditorSuggestions()`                           | The slash menu and the suggestion lists of custom inline nodes.                       | `slash`                                                                |

A feature's tools exist only while the feature is assigned: the default layouts leave them out
silently, and a layout of yours that places one reports `text-editor-layout-unknown` naming the
feature. The tables feature also needs the engine's table modules. Assigning another `features`
list replaces the previous features; a list with two features of one name keeps the first and
reports `text-editor-feature-duplicate`. Adding or removing a feature never remounts the engine.

### Links

The link tool opens a popover at the selection to set or remove the destination. While the caret
or the selection sits inside a link, the link editor shows the destination in the context bar just
below the toolbar, with its apply, open and remove actions; Enter applies and Escape returns to the
text. Destinations follow the URL policy of [Links and image sources](#links-and-image-sources).

### Tables

The table tool opens a size picker: point at its grid, or type the number of rows, up to 100, and
of columns, up to 20, then press Enter or Insert. In a table, Tab and Shift+Tab move to the next
and the previous cell, and Tab in the last cell adds a row. A table wider than the editor scrolls
sideways and keeps the cell with the caret in view.

Grips beside the current row and column open the row and column menus (`layout.tableRow` and
`layout.tableColumn`): move, insert, duplicate or delete, the cell background and alignment, and
the header row or column. Selecting across cells outlines the range; its handle extends the range
by dragging and opens the cell menu (`layout.tableCell`): merge, split, background, alignment and
clearing. Buttons past the last row and the last column add one. Dragging a column boundary
resizes the column, down to 48 pixels; on the focused boundary the arrow keys resize it by 8
pixels (32 with Shift, 1 with Alt), and Home and End set its minimum and maximum width.

Alt+F10 in a table moves focus to its controls: the cell handle when cells are selected, else the
column grip. Tab and Shift+Tab move through the grips, the handle, the boundary and the add
buttons, and Escape returns to the text with its selection. `stickyHeaders: true` keeps a copy of
the header row in view while the rest of a long table scrolls.

### Images

The image tool inserts an image block without a source yet, which shows a File upload in its
place: drop an image on it or click it to choose one. The file is checked against `accept`
(`image/*` by default, in File upload's `accept` forms) and `maxFileSize` (bytes, or text with a
unit such as `'10MB'`; no limit by default), then passed to `upload` with an abort signal and a
progress callback, its progress shown. Once the hook resolves the image's source, the block
becomes the image; a source outside the image policy, such as a `data:` URL, is reported and
leaves the block waiting.

A failed upload shows its error with a Retry button, and a refused file shows why. Deleting the
block cancels its upload, and a block still waiting for its image is left out of the content.
Pasted or dropped image files take the same limits and insert such a block at the paste or drop
point for each accepted file; a refused file is reported through `tp-diagnostic` with the code
`text-editor-upload-rejected` and announced. Without `upload` the image tool is disabled and
pasted or dropped files are ignored. An image with a known source is inserted with
`run('image', { src, alt })`.

Selecting an uploaded image block (a grip click, or Escape from a caret in the text beside it)
shows an alternative text field in the context bar, centered just below the toolbar and in view
whatever the viewport scrolls; an image still waiting for its upload shows its File upload alone.
Enter or the apply button saves the text; Escape returns to the text with the block still
selected.

### Selection toolbar

Selecting text, or a range of table cells, shows a toolbar over the selection with the tools of
`layout.selectionToolbar`. It shows at once and follows the selection without animating.

### Blocks

A gutter with two buttons appears beside the block under the pointer. **Insert** adds a block
below it (Alt+click: above) and types `/` there, which opens the slash menu; in an empty paragraph
or list item it types `/` in place, and beside a list item the new block is an item of the same
list. The **grip** drags the block, or opens the block menu when clicked. The gutter hides while
you type and comes back when the pointer moves; on touch, it appears beside the block holding the
caret. It never shows while the editor is read-only or disabled, or when `layout.gutter` is
`false`.

Clicking a grip selects its block: the editor is then in block mode, which selects whole blocks
with their nested items. Escape also enters block mode on the blocks the selection touches; a
second Escape leaves it, and the next one is left to the page, so that an enclosing dialog closes.

| Keys in block mode      | Action                                                |
| ----------------------- | ----------------------------------------------------- |
| Up, Down                | Select the block before or after                      |
| Shift+Up, Shift+Down    | Extend the selection                                  |
| Shift+click on a block  | Extend the selection to that block                    |
| Enter                   | Edit: the caret goes to the end of the selected block |
| Backspace, Delete       | Delete the selected blocks                            |
| A character, or a paste | Replace the selected blocks and continue typing       |
| Shift+F10, ContextMenu  | Open the block menu                                   |

The block menu (`layout.blockMenu`) turns the selected blocks into another kind, colors them,
duplicates, moves or deletes them, and copies a link to the first one: the page address with `#`
and the block identifier. When the page opens with such a fragment, or the fragment changes, the
editor scrolls that block into view and selects it, without moving focus. These keys act on the
block selection, or else on the blocks the caret or the selection touches:

| Action                      | Keys                             |
| --------------------------- | -------------------------------- |
| Open the block menu         | `Mod+/`                          |
| Move up; move down          | `Mod+Shift+Up`; `Mod+Shift+Down` |
| Duplicate                   | `Mod+D`                          |
| Indent; outdent a list item | `Mod+]`; `Mod+[`                 |

Dragging a grip by more than 4 pixels moves its block, or the whole block selection when the block
belongs to it; a list item moves with its nested items. A line marks where the blocks drop, before
or after the block under the pointer; moving the pointer sideways nests a list item under the list
item above it or brings it out again. Only list items nest. Escape cancels the drag. A drop is one
`tp-text-editor-request` with reason `drag`; cancel it to keep the document as it is.

### Slash menu

Typing `/` opens the slash menu with the tools of `layout.slash`: block kinds, lists, tables,
images and dividers by default, then every tool that joins the `*` entry. The trigger of a custom
inline node opens its own list once `layout.suggestions` names it. The lists leave focus in the
text: the arrow keys move through their items, and Enter or Tab inserts the highlighted one.

## Layout and tools

Every control of the editor runs a tool. The fixed toolbar, the selection toolbar, the slash menu,
the turn-into menu, the block menu and the row, column and cell menus of tables each place tools
by identifier, and `layout` says which tools each of them shows, as groups of identifiers:
`toolbar`, `selectionToolbar`, `slash`, `turnInto`, `blockMenu`, `tableRow`, `tableColumn` and
`tableCell`. A key you leave out keeps its default groups and an empty list turns the surface off.
`suggestions` names the suggestion lists that typing opens, only `slash` by default, and
`gutter: false` hides the block gutter. Reading `layout` returns the effective layout, a good
starting point for your own:

```js
editor.layout = {
  toolbar: [
    ['undo', 'redo'],
    ['bold', 'italic', 'link'],
    ['table', 'image'],
  ],
  selectionToolbar: [],
};
```

A fixed toolbar without room for every group moves the last ones into a More menu. A tool that
cannot act at the selection shows disabled, and a tool that the engine cannot run, such as the
table tools without the table modules, is left out. While focus is outside the editor, every
control of the toolbar, the More menu's trigger included, shows disabled, since no selection shows
what it would act on; focus anywhere in the editor enables them again. An unknown identifier is
skipped and reported through `tp-diagnostic` with the code `text-editor-layout-unknown`.

`tools` adds your own tools to the built-in ones, and a tool with the identifier of a built-in one
replaces it. Define a tool with `defineTextEditorTool` from `@tweakpad/ui/text-editor`: an `id`, a
`kind` (`button`, `toggle`, `menu`, `radio-menu`, `color`, `link`, `image`, `table-size`,
`suggestion` or `custom`), a `label`, an optional `icon`, `shortcut` and `keywords`, and the
`action` it runs: one or more actions, or a function of the tool context that returns them. A
`shortcut` is a key pattern or a list of them; an entry `{ pattern, platforms }` binds on the
listed platforms only (`windows`, `linux`, `mac`), resolved against the editor's configured
platform. `isActive`, `isEnabled` and `isVisible` refine the state that the editor derives. A tool
appears where the layout names it; with `surfaces`, it also joins the `*` entry that ends the
default slash menu, turn-into menu and block menu. In the fixed toolbar, a tool that `isVisible`
hides keeps its place, empty, so the other controls never move; the block tools hide this way
while the selection is in a table.

```js
import { defineTextEditorTool } from '@tweakpad/ui/text-editor';

const insertDate = defineTextEditorTool({
  id: 'insert-date',
  kind: 'button',
  label: 'Insert date',
  action: () => ({ type: 'text.insert', text: new Date().toLocaleDateString() }),
});
editor.tools = [insertDate];
editor.layout = { toolbar: [...editor.layout.toolbar, ['insert-date']] };
```

`strings` replaces any of the English labels, names, hints and announcements of
`textEditorStrings`, from which the built-in tools also take their labels.

## Custom blocks and inline nodes

`defineTextEditorBlock()` defines a block, a textblock (`content: 'inline'`) or an atom
(`content: 'none'`), and `defineTextEditorInline()` an inline atom inside text. Assign the
definitions to `nodes`; a change remounts the engine and keeps the content. The library exports no
ready-made nodes: the Custom blocks and Mentions examples are definitions to adapt.

In HTML a custom node is its definition's `element` with `data-type="<name>"` and one
`data-<attribute>` per attribute; in Markdown it is what its `markdown.serialize` writes, else its
text, and reading Markdown never restores an inline node; in text it is what `text` returns. Each
engine renders a custom block with the class `tp-te-block-<name>` and an inline node with
`tp-te-inline-<name>`, beside `data-type` and the attributes.

The `css` string of a definition styles its nodes. The editor adopts it into its shadow root,
nested under the content part, so its selectors are relative to the content part and reach the
document only. Rules that a style rule cannot hold, such as `@keyframes`, `@font-face` and
`@import`, have no effect, and a `css` that leaves a brace, comment or string open is rejected
with a `TypeError`. A callout needs no paint of its own: `presents: 'callout'` adds the class
`tp-te-callout`, and the editor paints the block as it paints alerts. A `tone` attribute tints it
like an alert of the same kind: `tip` or `success` as a success, `warning` as a warning, `caution`
or `danger` as a danger; `note`, `important` and any other tone keep the neutral paint.

An atom renders through its `view(host, attrs)`, which may return a cleanup function. An embed
that shows a page in a frame keeps the frame sandboxed, loads https or same-origin sources only
and gives the frame a title. Every custom block gets the gutter, the block menu, block selection,
drag and a slash menu entry; a textblock also appears in the turn-into menu.

An inline node with `suggest` opens a list when its `trigger` character is typed. Its `source`
receives `{ query, signal }` and returns the matching items, or a promise of them; a newer query,
or the list closing, aborts the previous call through its signal. `label` names an item in the
list and `attrs` turns the chosen item into the node's attributes.

## Content and formats

`format` is `html` (the default), `markdown`, `text` or `json`: the format of `defaultValue` and of
the form value, and the default format of `getContent()` and `setContent()`. HTML, Markdown and
text are portable: the library's converters produce them identically for every engine. `json` is
the engine's own format; it keeps everything the engine stores, and only that engine reads it.

- HTML keeps everything the editor holds.
- Markdown keeps paragraphs, headings, quotes, code blocks with their language, bullet, ordered
  and task lists with their nesting and checked state, dividers, links, and images without their
  width. Underline, superscript, subscript, text color and highlight stay as inline HTML. Tables
  become pipe tables that keep the cell text and the header row, which is added when missing;
  spanned cells become empty cells, and widths, cell backgrounds and the header column are lost.
  Alignment is lost, except a center or end alignment that a whole table column shares, and so
  are block identifiers and empty paragraphs.
- Text keeps only the text: a blank line between blocks, one line per list item and per table row
  with tabs between cells, and an image's alternative text; dividers, marks, list markers,
  checked state and links are lost.

`defaultValue` is applied when the engine mounts, without a change event; a later change only
sets what form reset restores. Until the engine is ready, HTML, Markdown and text content shows as
an inert preview, which the editing root replaces without changing the editor's height; `json`
content shows once the engine is ready. `getContent(format)` serializes the current document;
`value` is a snapshot of the last committed document whose `getContent(format)` serializes that
revision. `setContent(content, format)` replaces the document through a cancelable
`tp-text-editor-request` and resolves with its outcome. A paste becomes one cancelable
`tp-text-editor-request` with reason `input-paste`, its HTML, or else its text, read by the
library's converters.

### The HTML profile

HTML from `getContent('html')` uses semantic elements only: `p`, `h1` to `h6`, `blockquote`, `pre`
with a `code` element whose class is `language-<name>`, `ul`, `ol` with `start`, task lists as
`ul data-type="task"` with `data-checked` on each item, `hr`, `img` with `src`, `alt` and an
optional `width`, and tables with a `thead` header row, `th scope="row"` for a header column,
`rowspan`, `colspan` and `col` widths. Marks nest in a fixed order: `a`, `span data-color`,
`mark data-color`, `strong`, `em`, `u`, `s`, `sup` or `sub`, `code`. Every block carries its
identifier in `data-id`. The only inline styles are a logical `text-align` (`center`, `end` or
`justify`) and column widths. No engine class or attribute appears in it.

Reading HTML maps foreign markup onto that profile: `b`, `i` and `del` read as bold, italic and
strike, unknown elements are unwrapped with their text kept, scripts, styles, frames, event
handlers and unknown attributes are dropped, and a color name outside the palette is dropped.

Copy and cut write `text/html` in this profile and `text/plain` in the text format, the same on
both engines. The HTML records whether it holds part of the text or whole blocks: pasted back into
an editor, part of the text joins the text at the paste point, and whole blocks, such as a block
selection or a table, are inserted as blocks with fresh identifiers. HTML from other applications
pastes as text.

### Links and image sources

Link destinations and image sources pass one URL policy on every path into the document: initial
content, `setContent()` in every format, paste and drop, the link and image tools, `run()` actions
and typed input rules. Links allow `http`, `https`, `mailto` and `tel` URLs, relative references
and fragments; images allow `http`, `https` and `blob` URLs (object URLs the page itself created)
and relative references.

- A link outside the policy keeps its text and loses the link.
- An image outside the policy becomes a paragraph of its alternative text, which keeps the image's
  identifier, or is removed when it has none.
- The link and image tools, and the `link.set`, `blocks.insert` and `block.set-attrs` actions,
  refuse a destination outside the policy, and the request fails.
- Typing `[text](url)`, or a URL followed by a space or Enter, links only a destination inside the
  policy, and so does pasting a single URL over selected text.

### Colors

Text color and highlight take one of nine palette names, `gray`, `brown`, `orange`, `yellow`,
`green`, `blue`, `purple`, `pink` and `red`, also exported as `TEXT_EDITOR_COLORS`; table cells
take the same names as backgrounds. The document stores the names, never color values: HTML
writes `span data-color`, `mark data-color` and `data-background` on cells, and the theme paints
them through the content color tokens `--tp-content-<name>` (highlight and cell fill) and
`--tp-content-<name>-foreground` (text). Override those tokens to restyle every document the same
way on both engines. A text color over a highlight or a cell background of another name shows
both, and colored link text keeps its color.

### Alignment and direction

Alignment is logical: `start` (the default), `center`, `end` and `justify`, written as
`text-align` with the same value, never `left` or `right`. Each block takes its direction from its
own first strong character, so a right-to-left paragraph aligned `start` sits on the right, and
`end` follows it. Lists, tables and their markers are laid out in the editor's direction, which
the host's `dir` sets, and so is the preview before the engine is ready. HTML whose elements name
`left` or `right` reads them in the direction those elements set, else in the editor's direction:
in a right-to-left editor `right` is the start.

## Events

Every change that the editor makes, from a tool, a shortcut, a paste or a drop, `run()` or
`setContent()`, is first proposed as a cancelable `tp-text-editor-request`. Its detail names the
`actions`, the `tool` and the `surface` it comes from, the `reason`, the source event and the
control that triggered it; call `preventDefault()` to keep the document as it is. A request that
cannot apply, such as any change while the editor is read-only, is reported by
`tp-text-editor-request-failed`, and the promise of `run()` and `setContent()` resolves with the
outcome.

Typing goes straight to the engine, without a request. Every committed change, typed or requested,
is reported by `tp-value-change`, which cannot be canceled; its `metadata.origin` is `request` or
`engine`. `tp-value-commit` follows each applied request that changed the document, and the moment
focus leaves the editor after typing, which suits saving. `tp-text-editor-ready` reports the
mounted engine, `tp-text-editor-error` a failed mount, and `tp-diagnostic` the `text-editor-*`
codes named on this page.

## Keyboard

`Mod` is Command on Apple platforms and Control elsewhere.

| Action                        | Keys                                                        |
| ----------------------------- | ----------------------------------------------------------- |
| Undo; redo                    | `Mod+Z`; `Mod+Shift+Z`, or `Ctrl+Y` outside Apple platforms |
| Bold, italic, underline       | `Mod+B`, `Mod+I`, `Mod+U`                                   |
| Strikethrough; inline code    | `Mod+Shift+S`; `Mod+E`                                      |
| Superscript; subscript        | `Mod+.`; `Mod+,`                                            |
| Clear formatting              | `Mod+\`                                                     |
| Yellow highlight              | `Mod+Shift+H`                                               |
| Paragraph; heading 1, 2 or 3  | `Mod+Alt+0`; `Mod+Alt+1`, `Mod+Alt+2`, `Mod+Alt+3`          |
| Bullet, ordered and task list | `Mod+Shift+8`, `Mod+Shift+7`, `Mod+Shift+9`                 |
| Quote; code block             | `Mod+Shift+B`; `Mod+Alt+C`                                  |

These shortcuts work in the editing root and on the toolbar's controls, also for a tool the
toolbar does not show. A shortcut whose tool cannot act at the selection, such as Bold in a code
block, does nothing, and the browser applies none of its own formatting. Chords that the engine
reserves for itself are consumed without effect. Every other key, typing, Enter, Backspace,
Delete, the arrow keys, copy and cut, and `Mod+A` while the editor is editable included, stays
with the engine; while the editor is read-only, `Mod+A` selects its content.

A shortcut with Shift and a digit also matches by its physical digit key, so the list shortcuts
work on layouts that type a symbol with Shift and that digit. On Apple platforms, a shortcut with
Option also matches by its physical letter or digit key, because Option types another character
there. While AltGraph is held, no shortcut with `Mod` and without Alt matches, so characters typed
with AltGraph, such as brackets and the backslash on many layouts, reach the editor and its input
rules. Physical matching follows a key's position, not its label: on a layout that moves letters,
such as Dvorak, Command+Option with the key in the QWERTY position of C applies a code block.

### Focus

The fixed toolbar is one tab stop before the editing root. The arrow keys, Home and End move
between its controls, and pressing a control keeps the selection in the document. With focus on a
toolbar control, Escape first closes the control's open tooltip, and otherwise it is left to the
page, so that an enclosing dialog closes.

Alt+F10 moves focus from the text to the controls that apply at the selection, in this order: the
selection toolbar, the link editor or the alternative text field in the context bar, a table's
controls, and the gutter of the current block. Alt+F10 again moves on to the next of them, and
Escape returns to the text with its selection. In a list item, a code block or a table cell, Tab
stays in the text; move the caret out with the arrow keys, or press Escape to select the block,
and Tab then leaves the editor.

### Input rules

Typed Markdown turns into formatting:

| Typed                                                  | Result                               |
| ------------------------------------------------------ | ------------------------------------ |
| `#` to `######`, then a space                          | Heading of that level                |
| `-`, `*` or `+`, then a space                          | Bullet list                          |
| A number and `.`, then a space                         | Ordered list starting at that number |
| `[ ]` or `[x]`, then a space                           | Task list item, unchecked or checked |
| `>`, then a space                                      | Quote                                |
| Three backticks and an optional language, then a space | Code block in that language          |
| `---` in an empty paragraph                            | Divider                              |
| `**text**` or `__text__`                               | Bold                                 |
| `*text*` or `_text_`                                   | Italic                               |
| Text between single backticks                          | Inline code                          |
| `~~text~~`                                             | Strikethrough                        |
| `==text==`                                             | Yellow highlight                     |
| `[text](address)`                                      | Link                                 |
| An address, then a space or Enter                      | Link to that address                 |

Block rules apply at the start of a top-level paragraph, never in code or a table cell. Formatting
rules apply when the closing delimiter is typed, outside code, when the opening delimiter starts
the line or follows a space or a line break, and when the text inside neither starts nor ends with
a space. Undo right after a rule restores the text as typed; Backspace does not.

## Forms, read-only and disabled

With `name` and a form owner (an ancestor form or the `form` attribute), the editor submits its
document serialized in `format`, refreshed at every commit and when the form is submitted. It
performs no validation, and Enter never submits the form. Form reset restores `defaultValue`
through a request with reason `form-reset`, and a restored form state replaces the content before
the first edit.

Inside a `tp-field`, the Field's label names the editing root, its description and error describe
it, and a press on the label focuses the editing root. Without a Field label, `label` names the
editing root; without `label`, the host's `aria-label` does, and without either, `strings.label`.

`readOnly` keeps the editing root focusable and its content selectable and copyable, keeps its
links in the tab order and followable, and rejects every document change except `setContent()`,
a paste included; the toolbar's controls stay focusable with disabled semantics. `disabled`, set
on the editor or inherited from a disabled fieldset or Field, makes nothing in the editor
focusable, keeps its links from being followed, hides every tooltip and menu, rejects every change
except `setContent()` and submits nothing; the editing root and the toolbar's controls stay
exposed as disabled.

## Accessibility

The editing root is a multi-line text box, named as Forms, read-only and disabled describes, with
`aria-placeholder`, `aria-readonly` and `aria-disabled` following the editor's state. While the
editor is editable or read-only the root is a tab stop, so that a scrolled document stays
reachable from the keyboard; a disabled editor leaves the tab order. While the editor is editable
and its layout offers the slash menu, the root's description ends with short instructions
(`strings.instructions`): the slash menu and Alt+F10.

`placeholder` shows in the first block whenever the document is empty, also before the engine is
ready and while the editor is read-only or disabled. While the editor is focused and editable, an
empty block that holds the caret shows `strings.emptyBlockHint`.

Menus and popovers take focus when they open and give it back when they close. The suggestion
lists leave focus in the text, and the editing root points at the highlighted item. The File
upload of an image block waiting for its image, and the alternative text field of a selected
image, follow the editing root in the tab order; the File upload takes focus when the image tool
inserts the block, and Escape in either returns to the text.

A live region announces what the screen alone shows: the size of a block selection, moved,
duplicated and deleted blocks, each step of a block drag, the highlighted suggestion, inserted,
moved and deleted table rows and columns, merged and split cells, the size of a cell range and a
copied block link. The highlights of selected blocks and cells, the drop line and the sticky table
header are presentation only.

## Styling

The editor's chrome is styled through its [parts](#parts), elements of the editor's own shadow
root that `::part()`, `partPresentation` and a presentation dictionary reach. The Buttons,
Toggles, Menus, Popovers and other library controls inside the editor keep their own presentation,
and the editor's `partPresentation` is composed into each of them, so one dictionary on the editor
styles its controls by their own part names. Assigning a new dictionary replaces the previous one
everywhere, without re-rendering the controls or moving focus.

```js
editor.partPresentation = {
  'text-editor-toolbar': { styleHook: { background: 'var(--tp-muted)' } },
  button: { styleHook: { 'border-radius': 'var(--tp-radius-sm)' } },
};
```

The document itself has no parts, since the engine renders it: style it through the theme tokens,
the [content color tokens](#colors) included, which apply the same way on both engines and in the
preview, and style custom nodes through the `css` of their definitions.

When the editor grows with its content, the fixed toolbar stays at the top of the scrolling page
on the editor's background; on a surface of another color, give `::part(text-editor-toolbar)`
that surface's background.

The selection toolbar enters and exits with the motion role `surface`, and the context bar's link
editor and alternative text field slide down from under the toolbar with the presence role
`context-bar` (`textEditorMotionRoles`). Before each phase the editor dispatches a
`tp-motion-request` that a listener may claim with `respondWith`: phase `enter` or `exit`, with
the context `placement` for the selection toolbar and `editor` (`image-alt` or `link`) for the
context bar. A claimed phase replaces the built-in motion, and the surface stays mounted until a
claimed exit settles. `motionPolicy` `reduce` shows and hides every surface at once.

## Engine details

The adapters are verified with Tiptap 3.32 and Lexical 0.52; a Lexical version outside 0.52 is
reported through `tp-diagnostic` with the code `text-editor-engine-version`. A factory never
throws: the adapter checks the modules when the editor mounts, and a missing or incompatible
module, or modules from two copies of one engine, fail the mount with `tp-text-editor-error`.
`native` returns the engine's own editor object while the editor is ready, an escape hatch outside
the editor's contract.

Content that the engine cannot represent is converted, never dropped: a table without the table
modules becomes a paragraph with one line per row and tabs between cells, a custom block that the
engine does not support or that `nodes` no longer lists becomes a paragraph of its text, and such
an inline node becomes its text. One `tp-diagnostic` with the code
`text-editor-content-converted` names the converted kinds per load, and the same applies to the
content that a new engine or a `nodes` change carries over.

Moving the editor within its document, even into another shadow root, keeps the engine, the
document, the selection and the undo history; removing it releases the engine two animation
frames later. A move into another document, such as a same-origin frame, remounts the engine with
the content kept and an empty undo history, and moves no focus. The editor works inside open
shadow roots; under a closed shadow root the engines cannot read their selection, and the editor
reports `tp-diagnostic` with the code `text-editor-closed-root` when it connects there.

Under a strict content-security policy, the engine styles follow the library's
`ContentSecurityService`: by default they are constructed sheets adopted by the editor's shadow
root, which a policy without `'unsafe-inline'` allows; with a `nonce` they are `style` elements
carrying it; with `disableStyleElements` none are generated and the editor still edits correctly.
Neither engine renders a `style` attribute in markup: alignment and sizes are written through the
CSSOM, which such a policy allows.

The editor needs Chrome or Edge 137 or later, Firefox 142 or later, or Safari 17.5 or later.

## API reference

### Properties

| Property           | Attribute       | Type                                  | Default             | Description                                                                                                                                                                                                                                                                |
| ------------------ | --------------- | ------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engine`           | none            | `TextEditorEngine \| null`            | `null`              | The editing engine, built by an adapter factory (see Setup). Another engine remounts the editor with its content kept.                                                                                                                                                     |
| `defaultValue`     | `default-value` | `string \| object \| null`            | `null`              | Initial content in `format`; for `json`, the engine's JSON as an object or text.                                                                                                                                                                                           |
| `format`           | `format`        | `TextEditorFormat`                    | `'html'`            | `html`, `markdown`, `text` or `json`. An unknown value acts as `html` and reports `text-editor-format-invalid`.                                                                                                                                                            |
| `placeholder`      | `placeholder`   | `string`                              | `''`                | Shown while the document is empty; also the editing root's `aria-placeholder`.                                                                                                                                                                                             |
| `label`            | `label`         | `string`                              | `''`                | Accessible name of the editing root when no Field labels it.                                                                                                                                                                                                               |
| `measure`          | `measure`       | `number \| null`                      | `65`                | The longest line of text, in characters (`ch` of the content font). The editing root and the preview sit centered in a wider viewport, with the gutter and the table controls beside the text; the root's insets lie outside the measure. `null` or `0` removes the limit. |
| `name`             | `name`          | `string`                              | `''`                | Name of the form entry.                                                                                                                                                                                                                                                    |
| `formOwner`        | `form`          | `HTMLFormElement \| null`             | `null`              | The form owner, when it is not an ancestor.                                                                                                                                                                                                                                |
| `readOnly`         | `readonly`      | `boolean`                             | `false`             | See Forms, read-only and disabled.                                                                                                                                                                                                                                         |
| `disabled`         | `disabled`      | `boolean`                             | `false`             | See Forms, read-only and disabled.                                                                                                                                                                                                                                         |
| `features`         | none            | `readonly TextEditorFeature[]`        | `[]`                | The features in use, created by their factories (see Features).                                                                                                                                                                                                            |
| `tools`            | none            | `readonly TextEditorTool[]`           | `[]`                | Tools added to the built-in ones; an equal identifier replaces a built-in tool.                                                                                                                                                                                            |
| `layout`           | none            | `Partial<TextEditorLayout> \| null`   | the default layouts | Where tools appear. Reading it returns the effective layout.                                                                                                                                                                                                               |
| `nodes`            | none            | `readonly TextEditorNodeDefinition[]` | `[]`                | Custom blocks and inline nodes; a change remounts with the content kept.                                                                                                                                                                                                   |
| `strings`          | none            | `Partial<TextEditorStrings> \| null`  | `null`              | Replacements for the English `textEditorStrings`.                                                                                                                                                                                                                          |
| `invalid`          | `invalid`       | `boolean`                             | `false`             | No effect on the editor.                                                                                                                                                                                                                                                   |
| `required`         | `required`      | `boolean`                             | `false`             | No effect on the editor.                                                                                                                                                                                                                                                   |
| `motionPolicy`     | `motion-policy` | `MotionPolicy`                        | `'inherit'`         | Motion of the editor's own surfaces.                                                                                                                                                                                                                                       |
| `partPresentation` | none            | object                                | `{}`                | Presentation of the nested controls.                                                                                                                                                                                                                                       |

### Read-only members

| Member   | Type                         | Description                                                                                 |
| -------- | ---------------------------- | ------------------------------------------------------------------------------------------- |
| `value`  | `TextEditorSnapshot \| null` | Snapshot of the last committed document, `null` before the engine is ready. Not assignable. |
| `state`  | `TextEditorEngineState`      | The current editor state: selection, active marks and blocks, focus, emptiness and history. |
| `native` | `unknown`                    | The engine's own editor object while ready, otherwise `null`.                               |

### Methods

| Method                                                                                                | Description                                                                                                                    |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `getContent(format?: TextEditorFormat): unknown`                                                      | Serializes the current document, in `format` by default; `json` returns the engine's object.                                   |
| `setContent(content: string \| object, format?: TextEditorFormat): Promise<TextEditorRequestOutcome>` | Replaces the document through one request, as one undoable step. Before the engine is ready, the last call applies once it is. |
| `run(target, options?): Promise<TextEditorRequestOutcome>`                                            | Runs a tool by identifier, or one or more actions, through one request.                                                        |
| `subscribe(selector, callback): () => void`                                                           | Calls `callback` when the selected part of `state` changes; returns the unsubscribe function.                                  |
| `focus(options?: TextEditorFocusOptions): void`                                                       | Focuses the editing root at `position`: `restore` (the default), `start` or `end`.                                             |
| `blur(): void`                                                                                        | Removes focus from the editing root.                                                                                           |

### Events

| Event                           | Cancelable | Detail                                                                                                                                   |
| ------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `tp-text-editor-request`        | yes        | `{ actions, tool, surface, value, reason, sourceEvent, trigger }`: a change the editor is about to apply.                                |
| `tp-text-editor-request-failed` | no         | The request detail plus `error`.                                                                                                         |
| `tp-value-change`               | no         | `{ value, previousValue, reason, sourceEvent, metadata }`: every committed document change.                                              |
| `tp-value-commit`               | no         | `{ value, previousValue, reason, sourceEvent }`: after an applied request that changed the document, and when focus leaves after typing. |
| `tp-text-editor-ready`          | no         | `{ native }`: the engine has mounted.                                                                                                    |
| `tp-text-editor-error`          | no         | `{ error }`: the engine failed to mount.                                                                                                 |
| `tp-diagnostic`                 | no         | `{ code, message, severity }`, with `text-editor-*` codes.                                                                               |

### Markers

| Marker          | Description                                                        |
| --------------- | ------------------------------------------------------------------ |
| `data-status`   | `idle`, `loading`, `ready` or `error`.                             |
| `data-focused`  | Present while the editing root has focus.                          |
| `data-filled`   | Present while the document is not empty.                           |
| `data-readonly` | Present while `readOnly` is set.                                   |
| `data-disabled` | Present while the editor is disabled, also by a fieldset or Field. |
| `data-dragging` | Present while blocks are being dragged.                            |

### Parts

| Part                            | Description                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| `text-editor`                   | The field boundary and its focus ring.                                                |
| `text-editor-toolbar`           | The toolbar above the content.                                                        |
| `text-editor-viewport`          | The scroll container.                                                                 |
| `text-editor-content`           | The container of the document.                                                        |
| `text-editor-overlay`           | The layer above the content.                                                          |
| `text-editor-placeholder`       | The placeholder in the first block.                                                   |
| `text-editor-gutter`            | The block gutter beside the hovered block.                                            |
| `text-editor-insert`            | The gutter's insert button.                                                           |
| `text-editor-grip`              | The gutter's block grip.                                                              |
| `text-editor-drop-indicator`    | The line where dragged blocks drop.                                                   |
| `text-editor-block-selection`   | The highlight of selected blocks.                                                     |
| `text-editor-selection-toolbar` | The toolbar over selected text.                                                       |
| `text-editor-suggestions`       | The popup of slash commands and mentions.                                             |
| `text-editor-link-popover`      | The link popover.                                                                     |
| `text-editor-alt-input`         | The alternative text field of a selected image, in the context bar below the toolbar. |
| `text-editor-link-editor`       | The link editor shown while the selection is inside a link, in the context bar.       |
| `text-editor-table-picker`      | The table size picker.                                                                |
| `text-editor-swatch`            | A color swatch of the color menus.                                                    |
| `text-editor-status`            | The loading or error status.                                                          |
| `text-editor-row-grip`          | A table row grip.                                                                     |
| `text-editor-column-grip`       | A table column grip.                                                                  |
| `text-editor-cell-handle`       | The table cell handle.                                                                |
| `text-editor-add-row`           | The button that adds a table row.                                                     |
| `text-editor-add-column`        | The button that adds a table column.                                                  |
| `text-editor-resize-handle`     | A table column resize handle.                                                         |
| `text-editor-table-selection`   | The outline of selected table cells.                                                  |
| `text-editor-sticky-header`     | The table header that stays in view.                                                  |
