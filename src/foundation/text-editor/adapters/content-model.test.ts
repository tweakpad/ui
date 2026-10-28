/**
 * The full content model on both engine adapters (node environment; Widgets
 * `uwg-te-req-content-1`, `uwg-te-tab-content-model`, `uwg-te-req-engine-12`).
 *
 * One generated document holds every node and mark of the portable model in the combinations the
 * corpus documents do not spell out one by one: headings 1–6, paragraphs, quotes and list items of
 * each kind at every alignment; lists nested across kinds four levels deep with an ordered start
 * and checked and unchecked tasks; code blocks with and without a language; dividers; images with
 * and without alternative text and width, a relative source included; tables with each header
 * arrangement, spans, widths, every background and aligned cells; every mark alone, each with a
 * link, every palette name as text color and highlight, and the marks combined; custom blocks
 * (a textblock and an atom) and a custom inline node inside headings, list items, quotes, cells
 * and custom textblocks.
 *
 * Each engine maps the document to its native JSON and back unchanged, loads it from HTML and
 * from its own JSON and writes it back as the same HTML, and both engines write the same HTML,
 * Markdown and text.
 */
import { describe, expect, it } from 'vitest';
import { corpusNodes } from '../content/corpus.test.js';
import { serializeHtml } from '../content/html.js';
import {
  canonicalize,
  isAtomOrTable,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableInline,
  type TextEditorPortableListItem,
  type TextEditorPortableMarks,
  type TextEditorPortableTableCell,
} from '../content/portable.js';
import type { TextEditorAlign, TextEditorHeadingLevel } from '../model.js';
import { TEXT_EDITOR_COLORS } from '../palette.js';
import { CONTENT_ENGINES, idSequence as sequence, tiptapContent } from './content-engines.test.js';

const NODES = corpusNodes;

const ALIGNS: readonly (TextEditorAlign | undefined)[] = [undefined, 'center', 'end', 'justify'];
const LEVELS: readonly TextEditorHeadingLevel[] = [1, 2, 3, 4, 5, 6];

const text = (value: string, marks?: TextEditorPortableMarks): TextEditorPortableInline =>
  marks ? { type: 'text', text: value, marks } : { type: 'text', text: value };
const mention = (label: string): TextEditorPortableInline => ({
  type: 'custom',
  name: 'mention',
  attrs: { person: label.toLowerCase(), label },
});
const align = (value: TextEditorAlign | undefined) => (value ? { align: value } : {});

/** Every mark alone, each also inside a link, then the marks combined. */
function markRuns(): TextEditorPortableInline[] {
  const single: readonly TextEditorPortableMarks[] = [
    { bold: true },
    { italic: true },
    { underline: true },
    { strike: true },
    { superscript: true },
    { subscript: true },
    { code: true },
  ];
  return [
    ...single.flatMap((marks, index) => [
      text(`mark ${index} `, marks),
      text(' plain '),
      text(`linked ${index}`, { ...marks, link: `https://marks.example/${index}` }),
      text(' then '),
    ]),
    text('all of them', {
      link: '/relative/page',
      textColor: 'purple',
      highlight: 'yellow',
      bold: true,
      italic: true,
      underline: true,
      strike: true,
      superscript: true,
    }),
    text(' and '),
    text('mail', { link: 'mailto:desk@marks.example' }),
  ];
}

/** Every palette name as a text color, a highlight and both over different names. */
function colorRuns(): TextEditorPortableInline[] {
  return TEXT_EDITOR_COLORS.flatMap((hue, index) => {
    const other = TEXT_EDITOR_COLORS[(index + 3) % TEXT_EDITOR_COLORS.length]!;
    return [
      text(`${hue} text`, { textColor: hue }),
      text(' '),
      text(`${hue} marker`, { highlight: hue }),
      text(' '),
      text(`${hue} on ${other}`, { textColor: hue, highlight: other, italic: true }),
      text(' '),
    ];
  });
}

/** Lists of every kind at every alignment, nested across kinds four levels deep. */
function lists(): TextEditorPortableListItem[] {
  const flat: TextEditorPortableListItem[] = ALIGNS.flatMap((value, index) => [
    {
      type: 'list-bullet',
      ...align(value),
      content: [text(`bullet ${index}`)],
      children: [],
    },
  ]);
  const ordered: TextEditorPortableListItem[] = ALIGNS.map((value, index) => ({
    type: 'list-ordered',
    ...align(value),
    ...(index === 0 ? { start: 7 } : {}),
    content: [text(`step ${index}`, { bold: true })],
    children: [],
  }));
  const tasks: TextEditorPortableListItem[] = ALIGNS.map((value, index) => ({
    type: 'list-task',
    ...align(value),
    checked: index % 2 === 0,
    content: [text(`task ${index} for `), mention('Ines')],
    children: [],
  }));
  const nested: TextEditorPortableListItem = {
    type: 'list-bullet',
    content: [text('outer'), { type: 'hard-break' }, text('second line')],
    children: [
      {
        type: 'list-ordered',
        start: 4,
        content: [text('ordered under bullet')],
        children: [
          {
            type: 'list-task',
            checked: true,
            content: [text('task under ordered', { link: 'https://lists.example' })],
            children: [
              { type: 'list-bullet', content: [text('bullet at depth four')], children: [] },
              { type: 'list-ordered', content: [text('then ordered')], children: [] },
            ],
          },
          { type: 'list-task', checked: false, content: [text('open task')], children: [] },
        ],
      },
      { type: 'list-bullet', align: 'end', content: [text('aligned child')], children: [] },
    ],
  };
  // A paragraph separates each list kind, so consecutive items of one kind stay one list.
  return [...flat, ...ordered, ...tasks, nested];
}

function cell(
  content: readonly TextEditorPortableInline[],
  extra: Partial<TextEditorPortableTableCell> = {},
): TextEditorPortableTableCell {
  return { paragraphs: [{ content }], ...extra };
}

/** Tables with each header arrangement, spans, widths, backgrounds and aligned cells. */
function tables(): TextEditorPortableBlock[] {
  const arrangements = [
    { headerRow: true, headerColumn: false },
    { headerRow: false, headerColumn: true },
    { headerRow: true, headerColumn: true },
    { headerRow: false, headerColumn: false },
  ];
  const plain = arrangements.map(({ headerRow, headerColumn }, index): TextEditorPortableBlock => ({
    type: 'table',
    headerRow,
    headerColumn,
    rows: [
      { cells: [cell([text(`r0c0 ${index}`)]), cell([text('r0c1')])] },
      { cells: [cell([text('r1c0')]), cell([text('r1c1'), mention('Odo')])] },
    ],
  }));
  const painted: TextEditorPortableBlock = {
    type: 'table',
    headerRow: true,
    headerColumn: false,
    widths: [140, 90, 90],
    rows: [
      {
        cells: TEXT_EDITOR_COLORS.slice(0, 3).map((hue, index) =>
          cell([text(hue)], { background: hue, ...align(ALIGNS[index + 1]) }),
        ),
      },
      {
        cells: [
          cell([text('spans two rows')], { rowSpan: 2, background: 'gray' }),
          cell([text('spans two columns', { bold: true })], { colSpan: 2, align: 'center' }),
        ],
      },
      {
        cells: [
          {
            paragraphs: [
              { content: [text('first paragraph')] },
              { content: [text('second', { textColor: 'red', highlight: 'blue' })] },
            ],
            background: 'pink',
            align: 'justify',
          },
          cell([text('end')], { align: 'end', background: 'brown' }),
        ],
      },
      {
        cells: TEXT_EDITOR_COLORS.slice(3, 6).map((hue) => cell([text(hue)], { background: hue })),
      },
      {
        cells: TEXT_EDITOR_COLORS.slice(6, 9).map((hue) => cell([text(hue)], { background: hue })),
      },
    ],
  };
  return [...plain, painted];
}

/** The generated document, canonical, with identifiers `m000000001`, … */
function modelDocument(): TextEditorPortableDocument {
  const separator = (label: string): TextEditorPortableBlock => ({
    type: 'paragraph',
    content: [text(label)],
  });
  const blocks: TextEditorPortableBlock[] = [
    ...LEVELS.flatMap((level) =>
      ALIGNS.map((value): TextEditorPortableBlock => ({
        type: 'heading',
        level,
        ...align(value),
        content: [text(`Heading ${level} `), mention('Ada'), text(' end', { italic: true })],
      })),
    ),
    ...ALIGNS.map((value, index): TextEditorPortableBlock => ({
      type: 'paragraph',
      ...align(value),
      content: [text(`Paragraph ${index}`)],
    })),
    { type: 'paragraph', content: [] },
    { type: 'paragraph', content: markRuns() },
    { type: 'paragraph', content: colorRuns() },
    ...ALIGNS.map((value, index): TextEditorPortableBlock => ({
      type: 'quote',
      ...align(value),
      content: [
        text(`Quote ${index}`),
        { type: 'hard-break' },
        text('with a mention of '),
        mention('Bo'),
      ],
    })),
    separator('Lists follow.'),
    ...lists().slice(0, 4),
    separator('Ordered items follow.'),
    ...lists().slice(4, 8),
    separator('Tasks follow.'),
    ...lists().slice(8, 12),
    separator('Nested lists follow.'),
    lists()[12]!,
    {
      type: 'code',
      language: 'typescript',
      text: 'const crate = pack({ fragile: true });\n\treturn',
    },
    { type: 'code', text: 'no language\n\nblank line above' },
    { type: 'code', language: 'shell', text: '' },
    { type: 'divider' },
    { type: 'image', src: 'https://images.example/kiln.png', alt: 'A kiln at dusk', width: 320 },
    { type: 'image', src: 'shelf/plate.svg', alt: '' },
    { type: 'divider' },
    ...tables(),
    {
      type: 'custom',
      name: 'callout',
      attrs: { tone: 'warning' },
      content: [
        text('Mind the '),
        text('hot shelf', { bold: true }),
        text(' near '),
        mention('Kai'),
      ],
    },
    { type: 'custom', name: 'callout', attrs: { tone: 'tip' }, content: [] },
    {
      type: 'custom',
      name: 'embed',
      attrs: { url: 'https://video.example/firing', caption: 'Firing walkthrough' },
    },
    separator('The end.'),
  ];
  const result = canonicalize({ blocks }, { nodes: NODES, createId: sequence() });
  expect(result.diagnostics).toEqual([]);
  return result.document;
}

const tiptap = tiptapContent;
const ENGINES = CONTENT_ENGINES;

/** The document an engine holds: an empty paragraph after a final atom or table. */
function held(document: TextEditorPortableDocument): TextEditorPortableDocument {
  const last = document.blocks.at(-1);
  if (!last || !isAtomOrTable(last)) return document;
  return { blocks: [...document.blocks, { type: 'paragraph', id: 't000000001', content: [] }] };
}

describe.each(ENGINES)('$name: the full content model (uwg-te-tab-content-model)', (engine) => {
  const document = modelDocument();
  const html = serializeHtml(document, { nodes: NODES });

  it('maps the document to native JSON and back unchanged', () => {
    expect(engine.fromNative(engine.toNative(document), NODES)).toEqual(held(document));
  });

  it('loads the HTML and writes it back unchanged, with no conversion', () => {
    const instance = engine.mount({ content: html, format: 'html' }, { nodes: NODES });
    expect(instance.getContent('html')).toBe(html);
  });

  it('loads its own JSON and writes the same HTML', () => {
    const json = engine
      .mount({ content: html, format: 'html' }, { nodes: NODES })
      .getContent('json');
    const again = engine.mount(
      { content: JSON.parse(JSON.stringify(json)), format: 'json' },
      { nodes: NODES },
    );
    expect(again.getContent('html')).toBe(html);
  });

  it('loads its Markdown and text exports as the formats read them', () => {
    const instance = engine.mount({ content: html, format: 'html' }, { nodes: NODES });
    for (const format of ['markdown', 'text'] as const) {
      const written = instance.getContent(format) as string;
      const reloaded = engine.mount({ content: written, format }, { nodes: NODES });
      expect(reloaded.getContent(format), format).toBe(written);
    }
  });
});

describe('the full content model across engines (uwg-te-req-engine-12)', () => {
  it('covers every node, mark, alignment, heading level and palette name', () => {
    const html = serializeHtml(modelDocument(), { nodes: NODES });
    for (const level of LEVELS) expect(html).toContain(`<h${level} `);
    for (const tag of ['blockquote', 'pre', 'hr', 'img', 'table', 'aside', 'figure'])
      expect(html).toContain(`<${tag}`);
    for (const tag of ['strong', 'em', 'u', 's', 'sup', 'sub', 'code', 'a', 'mark', 'br'])
      expect(html).toContain(`<${tag}`);
    for (const value of ['center', 'end', 'justify'])
      expect(html).toContain(`text-align: ${value}`);
    for (const hue of TEXT_EDITOR_COLORS) {
      expect(html).toContain(`<span data-color="${hue}">`);
      expect(html).toContain(`<mark data-color="${hue}">`);
      expect(html).toContain(`data-background="${hue}"`);
    }
    expect(html).toContain('<ol start="7">');
    expect(html).toContain('<ul data-type="task">');
    expect(html).toContain('data-type="mention"');
  });

  it('writes the same HTML, Markdown and text on both engines', () => {
    const html = serializeHtml(modelDocument(), { nodes: NODES });
    const [first, second] = ENGINES.map((engine) =>
      engine.mount({ content: html, format: 'html' }, { nodes: NODES }),
    );
    for (const format of ['html', 'markdown', 'text'] as const)
      expect(first!.getContent(format), format).toBe(second!.getContent(format));
  });

  it("loads either engine's Markdown on the other with the same result", () => {
    const html = serializeHtml(modelDocument(), { nodes: NODES });
    const markdown = tiptap
      .mount({ content: html, format: 'html' }, { nodes: NODES })
      .getContent('markdown');
    const [first, second] = ENGINES.map((engine) =>
      engine.mount({ content: markdown, format: 'markdown' }, { nodes: NODES }),
    );
    for (const format of ['html', 'markdown', 'text'] as const)
      expect(first!.getContent(format), format).toBe(second!.getContent(format));
  });
});
