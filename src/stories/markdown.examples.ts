import { interactiveMarkupExample, markupExample } from './documentation-examples.js';
import {
  setupMarkdownExtensions,
  setupMarkdownOutline,
  setupMarkdownStreaming,
} from './markdown-example.js';
import setupSource from './markdown-example.js?raw';

/** Markdown authored inside a script child keeps `<` and `&` literal. */
const markdownMarkup = (attributes: string, source: string) =>
  `<tp-markdown${attributes ? ` ${attributes}` : ''}>\n<script type="text/markdown">\n${source}\n</script>\n</tp-markdown>`;
const setupScript = (name: string, id: string) =>
  `${setupSource}\n${name}(document.getElementById('${id}'));`;

export const markdownSample = `# A Small Markdown Specimen

*An editorial sample for quickly testing typography and basic Markdown rendering.*

Good Markdown should feel like a document first and a syntax demonstration second. A renderer needs to handle **emphasis**, *italics*, [links](https://commonmark.org/), \`inline code\`, and ordinary prose without disturbing the reading rhythm.

## Structure and Rhythm

Headings should establish hierarchy without overwhelming the page. Paragraphs should remain comfortable to read, with enough spacing to make sections distinct.

> Typography gives structure to information before decoration ever enters the picture.

A short list is often enough to expose spacing and alignment:

- Clear hierarchy
- Consistent vertical rhythm
- Comfortable line length
- Distinct links and emphasis

### Code

\`\`\`js
const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));
\`\`\`

Tables introduce another layout constraint:

| Element | Purpose |
|---|---|
| Heading | Hierarchy |
| Paragraph | Reading |
| Quote | Emphasis |
| Code | Literal content |

The important test is whether all of these elements still feel like parts of the same document.`;

const outlineSource = `# The Shape of a Quiet Interface

*A short editorial specimen for testing Markdown typography, rhythm, hierarchy, and extended syntax.*

**By Mara Bell**  
October 7, 2026 · 8 min read

---

Good interfaces rarely announce themselves. They establish a rhythm, present information with enough structure to be understood, and then disappear behind the thing the reader actually came to see.

Markdown works for much the same reason.

It provides just enough structure to express hierarchy without turning writing into layout code. A document can contain **emphasis**, *subtle emphasis*, [references](https://commonmark.org/), \`inline code\`, and even ~~ideas that should probably have been edited out~~ without losing the shape of ordinary prose.

The interesting question is not whether Markdown can represent these things. It can.

The interesting question is what happens when all of them coexist on the same page.

> Good typography does not decorate information.  
> It gives information a shape.

## Reading Has a Geometry

A paragraph is not merely a sequence of characters. On screen it becomes a physical object: a block with width, height, density, rhythm, and position.

A comfortable reading column might contain somewhere around sixty to eighty characters per line. Make it significantly wider and the eye has to travel farther before finding the beginning of the next line. Make it too narrow and the reader is forced into constant horizontal resets.

This means even plain Markdown exposes design decisions:

- How wide should the reading column be?
- How much space belongs between paragraphs?
- Should headings interrupt the rhythm or participate in it?
- How visible should links be?
- Should emphasis change only weight, or also color?
- What happens to long words, URLs, and inline code?

The source document says none of this explicitly. The renderer does.

### Hierarchy Without Noise

Headings are one of the simplest structures Markdown provides, but they reveal a surprising amount about a design system.

A second-level heading should clearly begin a new section. A third-level heading usually belongs to the section above it. Lower levels should remain distinguishable without turning the document into a staircase of increasingly tiny labels.

#### A Fourth-Level Heading

At this depth, hierarchy is often better communicated through spacing and weight than through dramatic changes in size.

##### A Fifth-Level Heading

This level is uncommon in editorial writing, but useful in technical documentation.

###### A Sixth-Level Heading

If this looks indistinguishable from body text, the hierarchy has effectively collapsed.

---

## Notes in the Margin

Not every idea deserves the same visual weight.

A blockquote can interrupt the main argument while remaining part of the document:

> The first responsibility of a renderer is not to make Markdown look impressive. It is to preserve the relationships already present in the text.

Nested quotations introduce another level:

> A document establishes its own visual grammar.
>
> > The renderer should reveal that grammar rather than replace it.
>
> The distinction is subtle, but important.

A short quote behaves differently from a long one. Both should remain readable without looking like unrelated interface components dropped into the article.

## Lists Are Small Layout Systems

Lists are deceptively demanding because indentation, marker alignment, wrapping, and vertical rhythm all become visible at once.

A useful interface might prioritize:

1. Legibility before ornament.
2. Relationships before individual components.
3. Consistency before novelty.
4. Exceptions only when they communicate something meaningful.

An unordered list introduces a different rhythm:

- Typography establishes hierarchy.
- Spacing establishes grouping.
- Color establishes emphasis.
- Borders establish boundaries.
- Motion establishes continuity.

Nested lists make alignment more obvious:

- Documents
  - Articles
  - Essays
  - Reports
- References
  - Footnotes
  - Citations
- Technical material
  - Code
  - Tables
  - Diagrams

And task lists, where supported, add interface semantics directly into the text:

- [x] Establish the reading column
- [x] Define heading hierarchy
- [ ] Test long-form code
- [ ] Test unusually wide tables
- [ ] Test content on a narrow viewport

## Code Changes the Texture

Inline technical language such as \`font-size\`, \`line-height\`, \`max-width\`, or \`display: grid\` should remain distinct without breaking the surrounding sentence.

Longer code creates an entirely different visual region:

\`\`\`css
.article {
  width: min(100% - 2rem, 72ch);
  margin-inline: auto;
}

.article p {
  line-height: 1.65;
}

.article :where(h2, h3) {
  text-wrap: balance;
}
\`\`\`

Code should not feel detached from the document, but neither should it be mistaken for prose.

A JavaScript example tests different punctuation and indentation patterns:

\`\`\`js
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const readingProgress = clamp(
  scrollY / (document.body.scrollHeight - innerHeight),
  0,
  1
);
\`\`\`

And a shell command tests another common case:

\`\`\`bash
git clone https://example.com/specimen.git
cd specimen
npm install
npm run dev
\`\`\`

## Data Has Its Own Rhythm

Tables are one of the places where Markdown leaves typography and enters layout.

| Element | Primary role | Typical visual signal |
|---|---|---|
| Heading | Hierarchy | Size, weight, spacing |
| Paragraph | Narrative | Measure, leading |
| Link | Navigation | Color, underline |
| Quote | Aside | Indent, rule, contrast |
| Code | Literal content | Monospace, background |
| Table | Comparison | Alignment, separators |

Numeric alignment becomes especially noticeable:

| Measure | Narrow | Comfortable | Wide |
|---|---:|---:|---:|
| Characters per line | 42 | 68 | 104 |
| Base font size | 14 px | 17 px | 21 px |
| Line height | 1.35 | 1.6 | 1.9 |

A renderer should also survive unusually long content inside a cell without destroying the entire page.

## Images Belong to the Narrative

An image should participate in the same reading flow as text rather than behaving like an unrelated card.

![A fictional landscape used as a Markdown image specimen](https://picsum.photos/1200/675)

*Figure 1. Images, captions, and surrounding spacing should feel like part of the same editorial system.*

Different renderers may treat captions differently because Markdown itself does not formally define them. That ambiguity is useful when testing an implementation.

## Small Details Matter

Markdown contains several structures that occupy very little space but reveal a lot about polish.

A thematic break:

---

An automatic URL:

<https://commonmark.org/>

A link with a title:

[CommonMark](https://commonmark.org/ "CommonMark specification")

Escaped characters:

\\*This text is surrounded by literal asterisks.\\*

Keyboard-like notation may appear as plain HTML when HTML is permitted:

Press <kbd>⌘</kbd> + <kbd>K</kbd> to open search.

Superscripts, subscripts, highlighted text, and other extensions vary between Markdown implementations, which is why a specimen should distinguish between **core Markdown** and renderer-specific features.

## Footnotes and References

Good interfaces allow secondary information to remain accessible without competing with the primary narrative.

Markdown implementations that support footnotes often use syntax like this.[^1]

A second note can contain more substantial information.[^design]

[^1]: Footnote syntax is an extension rather than part of original Markdown.

[^design]: Footnotes are particularly useful for testing smaller typography, backlink styling, spacing, and how the renderer handles content that sits outside the main narrative flow.

## The Long Paragraph Test

Most demonstrations contain paragraphs that are too short.

A real article eventually produces a block of text long enough to expose the actual character of the typeface and layout. The eye begins to notice whether line endings form distracting shapes, whether the leading is generous enough, whether bold text creates dark interruptions in the page, whether links become visual noise, and whether the width of the column remains comfortable after several consecutive sentences. These are difficult qualities to judge from isolated UI components because typography behaves as a system. A heading may look excellent by itself and still feel wrong when followed by six paragraphs, a quotation, a list, and a code block. The purpose of a specimen is therefore not simply to prove that every Markdown element renders correctly. It is to make those elements interact long enough for the design of the renderer to reveal itself.

That is where a Markdown page becomes more than a syntax demonstration.

It becomes an editorial system.

---

## Appendix: Extended Markdown

The following section intentionally concentrates several commonly supported extensions.

### Definition-style content

**Measure**  
The horizontal length of a line of text.

**Leading**  
The vertical distance between lines of text.

**Rhythm**  
The recurring spatial relationships that make a document feel coherent.

### Strikethrough

The original spacing was ~~24 pixels~~ **20 pixels**.

### Task list

- [x] Typography
- [x] Links
- [x] Lists
- [x] Tables
- [x] Code
- [x] Images
- [x] Quotes
- [x] Footnotes
- [ ] Renderer-specific extensions

### Raw HTML

<details>
<summary>Optional disclosure</summary>

Markdown may continue **inside this block**, depending on the renderer.

</details>

---

*End of specimen.*`;

export const markdownExamples = [
  markupExample(
    'Authored content',
    markdownMarkup(
      '',
      `A \`<script type="text/markdown">\` child keeps \`<tags>\` and \`&amp;\` as written, while allowed HTML such as <kbd>Ctrl</kbd> + <kbd>K</kbd> becomes elements.

1. Ordered lists keep their start
2. Code spans, **strong** and *emphasis* nest`,
    ),
    'Without source, the element reads its text content, or a script child of type text/markdown, and dedents it.',
  ),
  interactiveMarkupExample(
    'Custom elements and renderers',
    `<div id="markdown-extensions">\n${markdownMarkup(
      '',
      `Status <tp-badge variant="secondary">Beta</tp-badge> — raw HTML outside the policy, such as <span onclick="x">this</span>, stays text.

\`\`\`steps
Draft
Review
Publish
\`\`\``,
    )}\n</div>`,
    setupMarkdownExtensions,
    setupScript('setupMarkdownExtensions', 'markdown-extensions'),
    'elements admits tags and attributes from raw HTML (event handlers, style and unsafe URLs are always removed); renderers replace the rendering of one node type and return undefined to keep the default.',
  ),
  interactiveMarkupExample(
    'Streaming in a bubble',
    `<div id="markdown-streaming">
  <tp-bubble variant="ghost"><tp-markdown size="sm"></tp-markdown></tp-bubble>
  <tp-button variant="outline" size="sm">Replay</tp-button>
</div>`,
    setupMarkdownStreaming,
    setupScript('setupMarkdownStreaming', 'markdown-streaming'),
    'streaming completes unfinished syntax in the last block while chunks arrive through append(); blocks that did not change keep their DOM.',
  ),
  interactiveMarkupExample(
    'Outline with a table of contents',
    `<tp-scroll-area id="markdown-outline" style="block-size: 36rem">
  <div style="display: grid; grid-template-columns: minmax(0, 1fr) 13rem; gap: 2.5rem; padding: 1.5rem; align-items: start">
${markdownMarkup('id-prefix="guide-"', outlineSource)}
    <aside style="position: sticky; top: 1.5rem; max-block-size: 33rem; overflow: auto">
      <tp-table-of-contents label="On this page"></tp-table-of-contents>
    </aside>
  </div>
</tp-scroll-area>`,
    setupMarkdownOutline,
    setupScript('setupMarkdownOutline', 'markdown-outline'),
    'tp-markdown-render reports the rendered headings in the scroll spy target shape, so Table of contents items bind to them; the table of contents stays sticky beside the document inside the scroll area it tracks.',
  ),
];

/** Copyable source of the default story. */
export const markdownDefaultSource = markdownMarkup('', markdownSample);
