import type { TpMarkdown, MarkdownHeadingTarget } from '../../../../src/index.js';

const built = new URLSearchParams(location.search).has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel=stylesheet]')!.href = '/dist/styles.css';
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
const {
  defineElement,
  TpMarkdown: Markdown,
  TpBubble,
  TpBadge,
  TpTableOfContents,
  TpTableOfContentsItem,
} = api;
// Only these definitions: Markdown must define the controls it composes itself.
for (const element of [Markdown, TpBubble, TpBadge, TpTableOfContents, TpTableOfContentsItem])
  defineElement(element.tagName, element);

const base = `# Markdown surface

A paragraph with **strong**, *emphasis*, ~~deleted~~, \`inline code\`, a [link](https://example.com "Example"), an autolink www.example.com and a footnote.[^1]
Line one with a hard break\\
line two.

## Lists

- Tight item
- Item with a [link](#base-tables)
  - Nested item
    1. Ordered
    2. Ordered

1. Loose item

2. Loose item with a second paragraph

   Second paragraph.

### Tasks

- [x] Done task with \`code\`
- [ ] Open task

## Quote and alerts

> A blockquote with **markdown** inside.
>
> Second paragraph.

> [!NOTE]
> Useful information.

> [!WARNING]
> Critical content.

## Code

\`\`\`ts title="greeting.ts" {2} showLineNumbers
export function greet(name: string) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Tables

| Syntax | Result | Aligned |
| :----- | :----: | ------: |
| \`**bold**\` | **bold** | 1 |
| \`*italic*\` | *italic* | 22 |

---

Press <kbd>Ctrl</kbd> + <kbd>K</kbd>. <details><summary>Inline details</summary>hidden</details>

<details>
<summary>Block details</summary>

Content with *markdown*.

</details>

![Placeholder](https://placehold.co/120x60/png)

#### Heading four
##### Heading five
###### Heading six

[^1]: The footnote text, with a [link](https://example.com).
`;

const element = <T extends HTMLElement = TpMarkdown>(id: string) =>
  document.getElementById(id) as T;
const diagnostics: { id: string; code: string; message: string }[] = [];
const renders: { id: string; headings: string[] }[] = [];
for (const markdown of document.querySelectorAll('tp-markdown')) {
  markdown.addEventListener('tp-diagnostic', (event) =>
    diagnostics.push({
      id: markdown.id,
      ...(event as CustomEvent<{ code: string; message: string }>).detail,
    }),
  );
  markdown.addEventListener('tp-markdown-render', (event) =>
    renders.push({
      id: markdown.id,
      headings: (event as CustomEvent<{ headings: MarkdownHeadingTarget[] }>).detail.headings.map(
        (h) => h.id ?? '',
      ),
    }),
  );
}

element('base').source = base;

const extension = element('extension');
extension.elements = { 'tp-badge': ['variant'] };
extension.renderers = {
  code: (node) =>
    node.lang === 'diagram'
      ? Object.assign(document.createElement('pre'), {
          className: 'diagram',
          textContent: `diagram: ${node.value}`,
        })
      : undefined,
  link: (node, context) =>
    node.url.startsWith('/docs')
      ? Object.assign(document.createElement('a'), {
          href: `#routed${node.url}`,
          textContent: `→ ${node.url}`,
        })
      : context.fallback(),
  emphasis: () => {
    throw new Error('renderer failure');
  },
};
extension.source = `Status <tp-badge variant="secondary">New</tp-badge> and <tp-badge onclick="alert(1)" style="color:red">Plain</tp-badge>.

\`\`\`diagram
a -> b
\`\`\`

\`\`\`ts
const fallback = true;
\`\`\`

A [routed](/docs/start) link, a [normal](https://example.com) link, and *emphasis that throws*.`;

element('security').source =
  `[script link](javascript:alert(1)) ![data image](data:image/png;base64,AAAA) <span onclick="x">span</span> <img src=x onerror=alert(1)> <script>alert(1)</script>`;

element('rtl').source = `# Heading at level 3

نص عربي مع **تشديد** و\`code\`.

| A | B |
| - | - |
| a very long cell value that wraps | b |

\`\`\`js
const longLine = "a long line of code that must scroll horizontally rather than wrap in the narrow layout";
\`\`\``;

const docs = element('docs');
docs.source = Array.from(
  { length: 4 },
  (_, index) =>
    `## Section ${index + 1}\n\n${'Paragraph text that makes the section tall enough to scroll. '.repeat(12)}`,
).join('\n\n');
const toc = element('toc');
docs.addEventListener('tp-markdown-render', (event) => {
  const { headings } = (event as CustomEvent<{ headings: MarkdownHeadingTarget[] }>).detail;
  toc.replaceChildren(
    ...headings.map((heading) => {
      const item = document.createElement('tp-table-of-contents-item') as HTMLElement & {
        target: Element;
      };
      item.target = heading.element;
      item.textContent = heading.label;
      return item;
    }),
  );
});

/** Streams `text` into the streaming element in chunks of `size` characters. */
async function stream(text: string, size = 4, delay = 16): Promise<void> {
  const markdown = element('stream');
  markdown.source = '';
  markdown.streaming = true;
  for (let index = 0; index < text.length; index += size) {
    markdown.append(text.slice(index, index + size));
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  markdown.streaming = false;
}

Object.assign(window, {
  markdownAPI: api,
  markdownDiagnostics: diagnostics,
  markdownRenders: renders,
  stream,
  element,
});
await Promise.all(
  [...document.querySelectorAll('tp-markdown')].map(
    (markdown) => (markdown as TpMarkdown).updateComplete,
  ),
);
document.documentElement.dataset.ready = '';
