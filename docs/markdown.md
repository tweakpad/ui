# Markdown

`tp-markdown` renders a markdown document as readable content. Prose becomes native
semantic elements; fenced code, tables, rules, task items, alerts and keys compose the
library's Code block, Table, Separator, Checkbox, Alert and Key hint. The source is parsed by
a built-in CommonMark and GitHub Flavored Markdown parser and rendered through the
component, never injected as HTML. Two extension points add your own elements: an
**element policy** for raw HTML and **renderers** for individual node types.

```html
<tp-markdown>
  <script type="text/markdown">
    ## Hello

    Markdown with **strong** text, `code` and a [link](https://example.com).
  </script>
</tp-markdown>
```

The source comes from `source` or, when that property is unset, from a
`<script type="text/markdown">` child or the element's text content (dedented). A script
child keeps `<` and `&` literal; plain text content is parsed by the browser first, so tags
in it would become real elements. Set `source` from script for dynamic content.

## Syntax

CommonMark blocks and inlines, plus GitHub Flavored Markdown tables (with column
alignment), task list items, strikethrough, `www.`/URL/email autolinks and footnotes.
Blockquotes that start with `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or
`[!CAUTION]` become alerts. Numeric character references and the HTML 4 named references
decode; other names stay literal.

| Markdown                             | Renders                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| Fenced or indented code              | `tp-code-block`; see [Code](#code)                                                  |
| Table                                | `tp-table` around a native table that keeps column alignment                        |
| `---`, `***`                         | non-decorative `tp-separator`                                                       |
| `- [x] task`                         | read-only `tp-checkbox` labelled by the item text                                   |
| `> [!NOTE]` … `> [!CAUTION]`         | `tp-alert` (note and important informational, tip success, warning, caution danger) |
| `<kbd>`                              | `tp-key-hint`                                                                       |
| Headings, lists, quotes, links, etc. | native elements with `markdown-*` parts                                             |

### Code

The first word of a fence's info string is the language. The rest of the line can set
Code block options: `title="file.ts"` (the label), `{1,3-5}` (highlighted lines) and
`showLineNumbers`. Set `highlighter` to forward a highlighter, such as the Shiki adapter
from `@tweakpad/ui/code`, to every block.

````md
```ts title="greeting.ts" {2} showLineNumbers
export function greet(name: string) {
  return `Hello, ${name}!`;
}
```
````

## Properties

| Property / attribute               | Values                                                   | Default                   |
| ---------------------------------- | -------------------------------------------------------- | ------------------------- |
| `source`                           | markdown; unset reads a script child or the text content | `undefined`               |
| `streaming`                        | boolean; the source is still growing                     | `false`                   |
| `size`                             | `default`, `sm`                                          | `default`                 |
| `headingOffset` / `heading-offset` | `0` to `5`; added to every heading level, capped at 6    | `0`                       |
| `idPrefix` / `id-prefix`           | prefix for heading and footnote identifiers              | `''`                      |
| `elements`                         | `MarkdownElementPolicy` (property only)                  | default policy            |
| `renderers`                        | `MarkdownRenderers` (property only)                      | `{}`                      |
| `urlPolicy`                        | `{ links?, images? }` protocol lists (property only)     | see [Security](#security) |
| `parser`                           | `MarkdownParser` or `null` (property only)               | built-in parser           |
| `highlighter`                      | `CodeHighlighter` or `null` (property only)              | built-in tokenizer        |
| `messages`                         | `MarkdownMessages` (property only)                       | English                   |

Messages: `footnotes` (the footnotes section name), `backReference` (each back-link name,
followed by the footnote number), `table` (composed table name) and the alert titles
`note`, `tip`, `important`, `warning` and `caution`.

Use `size="sm"` inside chat bubbles and dense panels, and `heading-offset` when the
document sits under page headings (for example `heading-offset="2"` turns `#` into `h3`).

## Methods, properties and events

- `append(text)` adds text to the end of the source.
- `headings` lists the rendered headings as `{ element, id, label, depth }`, the scroll spy
  target shape, with `depth` the rendered level.
- `ast` is the resolved tree of the current source.

| Event                | Detail                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `tp-markdown-render` | `headings`, after every render                                                                                                             |
| `tp-diagnostic`      | `markdown-url` (blocked link, image or attribute URL), `markdown-element` (tag outside the policy), `markdown-parser`, `markdown-renderer` |

Links to a heading or footnote of the same document (`#section`, footnote references and
back-links) scroll to it and update the URL fragment. A URL that already names one of
them scrolls there on the first render.

## Custom elements

Raw HTML is never inserted as markup. Tags in the element policy become real elements
with only the attributes the policy lists; everything else shows as literal text. The
default policy admits `abbr`, `b`, `br`, `del`, `details`, `em`, `i`, `ins`, `kbd`,
`mark`, `s`, `small`, `strong`, `sub`, `summary`, `sup` and `u`, with `title`, `lang` and
`dir` on every tag and `open` on `details`. Your policy adds to it; `false` removes a tag.

```js
markdown.elements = {
  'tp-badge': ['variant'],
  'my-chart': ['data-series'],
  '*': ['title', 'lang', 'dir', 'class'],
  u: false,
};
```

```md
Status <tp-badge variant="secondary">Beta</tp-badge>

<my-chart data-series="sales">

Markdown **content** between an open and a close tag becomes the element's children.

</my-chart>
```

Event-handler attributes, `style` and `srcdoc` are always removed, and URL attributes
(`href`, `src`, …) must pass the URL policy. Elements are created in the element's
document, so custom elements upgrade once they are defined.

## Renderers

A renderer replaces the rendering of one node type. It receives the node (an mdast node)
and a context with `children()` (the rendered children), `fallback()` (the default
rendering) and `markdown` (the element). Return `undefined` to keep the default; return
Lit `nothing` to render nothing. A renderer that throws falls back to the default and
reports `markdown-renderer`.

```js
markdown.renderers = {
  code: (node) => (node.lang === 'mermaid' ? renderDiagram(node.value) : undefined),
  link: (node, { children }) =>
    node.url.startsWith('/') ? html`<app-link to=${node.url}>${children()}</app-link>` : undefined,
};
```

Node types: `heading`, `paragraph`, `blockquote`, `list`, `listItem`, `code`, `table`,
`thematicBreak`, `alert`, `footnotes`, `text`, `emphasis`, `strong`, `delete`,
`inlineCode`, `break`, `link`, `image`, `footnoteReference` and `element` (admitted raw
HTML, with `tagName` and `attributes`).

## Streaming

For replies that arrive in chunks, set `streaming` and call `append()`. While streaming,
unfinished emphasis, strong, strikethrough, inline code and links in the last block are
completed before parsing, so their markers never flash. Blocks whose text did not change
keep their DOM, and spacing only flows from each block's start edge, so new content never
restyles what is already on screen. Clear `streaming` when the source is complete.

```js
markdown.streaming = true;
for await (const chunk of reply) markdown.append(chunk);
markdown.streaming = false;
```

## Parser adapters

The `parser` property accepts any `{ name?, parse(source) }` that returns an mdast root,
for example a configured remark processor. The library never imports a parser package.
Reference links and definitions in the returned tree are resolved; a parser that throws or
returns something other than a root falls back to the built-in parser and reports
`markdown-parser`. The built-in parser is also available as `parseMarkdown` from
`@tweakpad/ui/markdown`, with `resolveMarkdown` and `completeMarkdown`.

## Security

Links allow `http:`, `https:`, `mailto:`, `tel:`, relative references and fragments;
images allow `http:`, `https:` and relative references. A blocked link renders its text
and a blocked image its alternative text, and both report `markdown-url`. Change the lists
with `urlPolicy`:

```js
markdown.urlPolicy = { links: ['https:'], images: ['https:', 'data:'] };
```

## Theming

Parts: `markdown` (the flow root), `markdown-heading` (with `data-level`),
`markdown-paragraph`, `markdown-list` (`data-task-list` when every item is a task),
`markdown-list-item` (`data-task` for tasks), `markdown-blockquote`, `markdown-code`,
`markdown-link`, `markdown-image`, `markdown-emphasis`, `markdown-strong`,
`markdown-delete`, `markdown-footnotes`, `markdown-footnote-reference` and
`markdown-footnote-back-reference`. Composed controls keep their own parts and tokens.

Block spacing comes from `--_tp-markdown-flow` (and `--_tp-markdown-heading-flow` above
headings), set on the `markdown` part:

```css
tp-markdown::part(markdown) {
  --_tp-markdown-flow: var(--tp-space-6);
}
```

`size` selects body text (`text-base` or `text-sm`) and the heading scale (`text-2xl` to
`text-base`, one step smaller at `sm`), all from the typography roles.

## Accessibility

Headings, lists, quotations, emphasis, links and images keep their native semantics;
`heading-offset` keeps the document outline consistent with the page. An image without
alternative text is decorative. Task checkboxes are read-only and named by their item
text. The footnotes section is a region named by the `footnotes` message, and each
back-link is named by the `backReference` message and number. The element adds no
landmark or tab stop of its own; composed tables and overflowing code blocks become
focusable only to scroll.
