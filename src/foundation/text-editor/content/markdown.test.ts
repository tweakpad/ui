import { describe, expect, it } from 'vitest';
import type { MarkdownInline } from '../../markdown/types.js';
import type {
  TextEditorBlockDefinition,
  TextEditorInlineDefinition,
  TextEditorNodeDefinition,
} from '../nodes.js';
import { readMarkdown, writeMarkdown, type TextEditorMarkdownReadOptions } from './markdown.js';
import type {
  TextEditorPortableBlock,
  TextEditorPortableDocument,
  TextEditorPortableInline,
  TextEditorPortableMarks,
} from './portable.js';

/** Identifiers `n1`, `n2`, … in the order they are asked for. */
const sequence = () => {
  let next = 0;
  return () => `n${(next += 1)}`;
};

const text = (value: string, marks?: TextEditorPortableMarks): TextEditorPortableInline =>
  marks ? { type: 'text', text: value, marks } : { type: 'text', text: value };
const br: TextEditorPortableInline = { type: 'hard-break' };
const p = (id: string, content: readonly TextEditorPortableInline[]): TextEditorPortableBlock => ({
  type: 'paragraph',
  id,
  content,
});

const read = (source: string, options: TextEditorMarkdownReadOptions = {}) =>
  readMarkdown(source, { createId: sequence(), ...options });
const markdown = (
  document: TextEditorPortableDocument,
  nodes?: readonly TextEditorNodeDefinition[],
) => writeMarkdown(document, { nodes }).markdown;

const withoutIds = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutIds);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'id')
      .map(([key, item]) => [key, withoutIds(item)]),
  );
};

// Definitions local to these tests (the shipped examples are documentation, not library code).
const callout: TextEditorBlockDefinition = {
  kind: 'block',
  name: 'callout',
  content: 'inline',
  element: 'aside',
  attrs: { tone: { type: 'enum', values: ['note', 'warning'], default: 'note' } },
  markdown: {
    serialize: ({ attrs, markdown: body }) =>
      [`[!${String(attrs.tone).toUpperCase()}]`, ...body.split('\n')]
        .map((line) => `> ${line}`)
        .join('\n'),
    parse: (node) => {
      if (node.type !== 'alert' || (node.kind !== 'note' && node.kind !== 'warning')) return null;
      const content: MarkdownInline[] = [];
      for (const block of node.children)
        if (block.type === 'paragraph') content.push(...block.children);
      return { attrs: { tone: node.kind }, content };
    },
  },
  tool: { label: 'Callout' },
};
const chart: TextEditorBlockDefinition = {
  kind: 'block',
  name: 'chart',
  content: 'none',
  element: 'figure',
  attrs: { series: { type: 'string', default: '' } },
  markdown: { serialize: ({ attrs }) => `Chart of ${String(attrs.series)}` },
  tool: { label: 'Chart' },
};
const sketch: TextEditorBlockDefinition = {
  kind: 'block',
  name: 'sketch',
  content: 'none',
  element: 'figure',
  attrs: { title: { type: 'string', default: '' } },
  text: ({ attrs }) => `Sketch: ${String(attrs.title)}`,
  tool: { label: 'Sketch' },
};
const faulty: TextEditorBlockDefinition = {
  kind: 'block',
  name: 'faulty',
  content: 'inline',
  element: 'section',
  attrs: {},
  markdown: {
    serialize: () => {
      throw new Error('serialize fails');
    },
    parse: () => {
      throw new Error('parse fails');
    },
  },
  tool: { label: 'Faulty' },
};
const mention: TextEditorInlineDefinition = {
  kind: 'inline',
  name: 'mention',
  element: 'span',
  attrs: { label: { type: 'string', default: '' } },
  text: (attrs) => `@${String(attrs.label)}`,
};
const tag: TextEditorInlineDefinition = {
  kind: 'inline',
  name: 'tag',
  element: 'span',
  attrs: { name: { type: 'string', default: '' } },
  text: (attrs) => `#${String(attrs.name)}`,
  markdown: { serialize: (attrs) => `**#${String(attrs.name)}**` },
};
const nodes: readonly TextEditorNodeDefinition[] = [faulty, callout, chart, sketch, mention, tag];

describe('Markdown import (uwg-te-req-content-4)', () => {
  it('V-124: reads CommonMark and the GitHub extensions, brings in what the model lacks as its content and keeps disallowed HTML as text', () => {
    const source = [
      '# Harbor notes',
      'Calm *water*, **clear** sky, ~~fog~~,',
      'and a soft line break.',
      '- [x] Nets mended',
      '- [ ] Hull painted',
      '',
      '| Boat | Crew | Note |',
      '| :-: | --: | :-- |',
      '| Gull | 3 | fast |',
      '',
      '```js title="tide.js"',
      'let tide = 2;',
      '```',
      '',
      'Visit www.harbor.example or crew@harbor.example.',
      '',
      'The pier[^long] is long, really[^long].',
      '',
      '> [!NOTE]',
      '> Mind the gap.',
      '',
      '<u>under</u> x<sup>2</sup> <span data-color="red">red</span> <mark data-color="blue">blue</mark> <kbd>K</kbd> <script>alert(1)</script>',
      '',
      '[^long]: Built in the old days.',
      '[^unused]: Never referenced.',
    ].join('\r\n');
    const { document, diagnostics } = read(source);
    expect(document.blocks).toEqual([
      { type: 'heading', id: 'n1', level: 1, content: [text('Harbor notes')] },
      p('n2', [
        text('Calm '),
        text('water', { italic: true }),
        text(', '),
        text('clear', { bold: true }),
        text(' sky, '),
        text('fog', { strike: true }),
        text(', and a soft line break.'),
      ]),
      { type: 'list-task', id: 'n3', checked: true, content: [text('Nets mended')], children: [] },
      {
        type: 'list-task',
        id: 'n4',
        checked: false,
        content: [text('Hull painted')],
        children: [],
      },
      {
        type: 'table',
        id: 'n5',
        headerRow: true,
        headerColumn: false,
        rows: [
          {
            cells: [
              { align: 'center', paragraphs: [{ content: [text('Boat')] }] },
              { align: 'end', paragraphs: [{ content: [text('Crew')] }] },
              { paragraphs: [{ content: [text('Note')] }] },
            ],
          },
          {
            cells: [
              { align: 'center', paragraphs: [{ content: [text('Gull')] }] },
              { align: 'end', paragraphs: [{ content: [text('3')] }] },
              { paragraphs: [{ content: [text('fast')] }] },
            ],
          },
        ],
      },
      { type: 'code', id: 'n6', language: 'js', text: 'let tide = 2;' },
      p('n7', [
        text('Visit '),
        text('www.harbor.example', { link: 'http://www.harbor.example' }),
        text(' or '),
        text('crew@harbor.example', { link: 'mailto:crew@harbor.example' }),
        text('.'),
      ]),
      p('n8', [
        text('The pier'),
        text('1', { superscript: true }),
        text(' is long, really'),
        text('1', { superscript: true }),
        text('.'),
      ]),
      { type: 'quote', id: 'n9', content: [text('Mind the gap.')] },
      p('n10', [
        text('under', { underline: true }),
        text(' x'),
        text('2', { superscript: true }),
        text(' '),
        text('red', { textColor: 'red' }),
        text(' '),
        text('blue', { highlight: 'blue' }),
        text(' K <script>alert(1)</script>'),
      ]),
      { type: 'list-ordered', id: 'n11', content: [text('Built in the old days.')], children: [] },
    ]);
    expect(diagnostics).toEqual([]);
  });

  it('V-124: an alert that a custom block parses becomes that block; the others are quotes', () => {
    const source = '> [!WARNING]\n> Low **tide**\n\n> [!TIP]\n> Bring boots';
    expect(read(source, { nodes }).document.blocks).toEqual([
      {
        type: 'custom',
        id: 'n1',
        name: 'callout',
        attrs: { tone: 'warning' },
        content: [text('Low '), text('tide', { bold: true })],
      },
      { type: 'quote', id: 'n2', content: [text('Bring boots')] },
    ]);
    expect(read(source).document.blocks[0]).toEqual({
      type: 'quote',
      id: 'n1',
      content: [text('Low '), text('tide', { bold: true })],
    });
  });

  it('fits Markdown to the content model: quote paragraphs join, nested blocks leave, an image splits its paragraph, a mixed list splits by kind', () => {
    const source = [
      '> one',
      '>',
      '> two',
      '> > nested',
      '',
      '- a',
      '',
      '  b',
      '  ```',
      '  code',
      '  ```',
      '- [ ] task',
      '- plain',
      '',
      'before ![dock](/dock.png) after',
    ].join('\n');
    expect(read(source).document.blocks).toEqual([
      { type: 'quote', id: 'n1', content: [text('one'), br, text('two')] },
      { type: 'quote', id: 'n2', content: [text('nested')] },
      { type: 'list-bullet', id: 'n3', content: [text('a'), br, text('b')], children: [] },
      { type: 'code', id: 'n4', text: 'code' },
      { type: 'list-task', id: 'n5', checked: false, content: [text('task')], children: [] },
      { type: 'list-bullet', id: 'n6', content: [text('plain')], children: [] },
      p('n7', [text('before ')]),
      { type: 'image', id: 'n8', src: '/dock.png', alt: 'dock' },
      p('n9', [text(' after')]),
    ]);
  });

  it('reads an empty source as one empty paragraph and never restores inline nodes', () => {
    expect(read('').document).toEqual({ blocks: [p('n1', [])] });
    expect(read('\r\n\r\n').document).toEqual({ blocks: [p('n1', [])] });
    expect(read('Ask @Ada about **#tides**', { nodes }).document.blocks).toEqual([
      p('n1', [text('Ask @Ada about '), text('#tides', { bold: true })]),
    ]);
  });

  it('ignores a custom parse that throws', () => {
    expect(read('> [!NOTE]\n> Kept', { nodes }).document.blocks).toEqual([
      {
        type: 'custom',
        id: 'n1',
        name: 'callout',
        attrs: { tone: 'note' },
        content: [text('Kept')],
      },
    ]);
  });
});

describe('Markdown URL policy (uwg-te-req-content-4, mdf-urls)', () => {
  it('V-126: a disallowed link becomes its text and an image its alternative text, with markdown-url diagnostics; mailto is kept', () => {
    const { document, diagnostics } = read(
      '[x](javascript:alert(1)) ![a](data:image/png;base64,AA) [y](mailto:a@b.example)',
    );
    expect(document.blocks).toEqual([
      p('n1', [text('x a '), text('y', { link: 'mailto:a@b.example' })]),
    ]);
    expect(diagnostics).toEqual([
      { code: 'markdown-url', message: 'Blocked link destination "javascript:alert(1)".' },
      { code: 'markdown-url', message: 'Blocked image source "data:image/png;base64,AA".' },
    ]);
  });

  it('V-126: the export writes no destination outside the policy', () => {
    const urls = { links: ['https:'], images: ['https:'] };
    const document: TextEditorPortableDocument = {
      blocks: [
        p('a', [
          text('plain', { link: 'http://plain.example/' }),
          text(' and '),
          text('secure', { link: 'https://secure.example/' }),
        ]),
        { type: 'image', id: 'b', src: 'http://plain.example/i.png', alt: 'Old image' },
        { type: 'image', id: 'c', src: 'http://plain.example/j.png', alt: '' },
        { type: 'image', id: 'd', src: 'https://secure.example/i.png', alt: 'New image' },
      ],
    };
    const written = writeMarkdown(document, { urls });
    expect(written.markdown).toBe(
      'plain and [secure](https://secure.example/)\n\nOld image\n\n![New image](https://secure.example/i.png)\n',
    );
    expect(written.markdown).not.toContain('http:');
    expect(written.diagnostics).toEqual([
      { code: 'markdown-url', message: 'Blocked link destination "http://plain.example/".' },
      { code: 'markdown-url', message: 'Blocked image source "http://plain.example/i.png".' },
      { code: 'markdown-url', message: 'Blocked image source "http://plain.example/j.png".' },
    ]);
    // The same document under the default policy keeps every destination.
    expect(writeMarkdown(document).diagnostics).toEqual([]);
  });
});

describe('Markdown export (uwg-te-req-content-4, uwg-te-md-req-serializer)', () => {
  it('V-125: writes underline, superscript, subscript and colors as inline HTML, deterministically, and reads back as the source', () => {
    const document: TextEditorPortableDocument = {
      blocks: [
        p('a', [
          text('Plain, '),
          text('strong', { bold: true }),
          text(', '),
          text('em', { italic: true }),
          text(', '),
          text('gone', { strike: true }),
          text(', '),
          text('x < y', { code: true }),
          text(', '),
          text('link', { link: 'https://example.org/tides' }),
          text(', '),
          text('under', { underline: true }),
          text(', H'),
          text('2', { subscript: true }),
          text('O, e'),
          text('x', { superscript: true }),
          text(', '),
          text('red', { textColor: 'red' }),
          text(' and '),
          text('marked', { highlight: 'green', bold: true }),
          text('.'),
        ]),
      ],
    };
    const first = markdown(document);
    expect(first).toBe(
      'Plain, **strong**, *em*, ~~gone~~, `x < y`, [link](https://example.org/tides), <u>under</u>, H<sub>2</sub>O, e<sup>x</sup>, <span data-color="red">red</span> and <mark data-color="green">**marked**</mark>.\n',
    );
    expect(markdown(document)).toBe(first);
    const back = read(first).document;
    expect(withoutIds(back)).toEqual(withoutIds(document));
    expect(markdown(back)).toBe(first);
  });

  it('V-113: plain www and email text comes back as links, and a link whose text the autolinks read back is written as that text', () => {
    const plain: TextEditorPortableDocument = {
      blocks: [p('a', [text('Visit www.example.org or write to name@example.org')])],
    };
    const first = markdown(plain);
    expect(first).toBe('Visit www.example.org or write to name@example.org\n');
    const back = read(first).document;
    expect(back.blocks).toEqual([
      p('n1', [
        text('Visit '),
        text('www.example.org', { link: 'http://www.example.org' }),
        text(' or write to '),
        text('name@example.org', { link: 'mailto:name@example.org' }),
      ]),
    ]);
    expect(markdown(back)).toBe(first);
    // A link that reads back only from explicit syntax at its place stays a link.
    const glued: TextEditorPortableDocument = {
      blocks: [
        p('b', [
          text('See '),
          text('https://example.org/tides', { link: 'https://example.org/tides' }),
          text(', then x'),
          text('www.example.org', { link: 'http://www.example.org' }),
          text(' and '),
          text('www.example.org', { link: 'https://other.example/' }),
        ]),
      ],
    };
    expect(markdown(glued)).toBe(
      'See https://example.org/tides, then x[www.example.org](http://www.example.org) and [www.example.org](https://other.example/)\n',
    );
    expect(withoutIds(read(markdown(glued)).document)).toEqual(withoutIds(glued));
  });

  it('V-113: a quote whose first line would read as an alert marker reads back as a quote that keeps that line', () => {
    const document: TextEditorPortableDocument = {
      blocks: [
        { type: 'quote', id: 'a', content: [text('[!NOTE]'), br, text('keep this line')] },
        { type: 'quote', id: 'b', content: [text('[!warning]  ')] },
        { type: 'quote', id: 'c', content: [text('[!NOTE] inline is not a marker')] },
      ],
    };
    const first = markdown(document);
    expect(first).toBe(
      '> [<!---->!NOTE]\\\n> keep this line\n\n> [<!---->!warning] &#32;\n\n> [!NOTE] inline is not a marker\n',
    );
    const back = read(first, { nodes }).document;
    expect(withoutIds(back)).toEqual(withoutIds(document));
    expect(markdown(back)).toBe(first);
  });

  it('V-113: empty paragraphs and a hard break that ends a block are lost; a hard break in a heading changes form', () => {
    const document: TextEditorPortableDocument = {
      blocks: [
        p('a', []),
        p('b', [text('ends'), br]),
        p('c', [br]),
        { type: 'heading', id: 'd', level: 3, content: [text('one'), br, text('two')] },
        { type: 'heading', id: 'e', level: 2, content: [text('three'), br, text('four')] },
        { type: 'heading', id: 'f', level: 4, content: [] },
        { type: 'list-bullet', id: 'g', content: [], children: [] },
        { type: 'quote', id: 'h', content: [] },
      ],
    };
    const first = markdown(document);
    expect(first).toBe('ends\n\n### one<br>two\n\nthree\\\nfour\n---\n\n####\n\n-\n\n>\n');
    const back = read(first).document;
    expect(back.blocks).toEqual([
      p('n1', [text('ends')]),
      { type: 'heading', id: 'n2', level: 3, content: [text('one'), br, text('two')] },
      { type: 'heading', id: 'n3', level: 2, content: [text('three'), br, text('four')] },
      { type: 'heading', id: 'n4', level: 4, content: [] },
      { type: 'list-bullet', id: 'n5', content: [], children: [] },
      { type: 'quote', id: 'n6', content: [] },
    ]);
    expect(markdown(back)).toBe(first);
  });

  it('V-115, V-117: tables gain a header row when missing; spans become empty cells; a column marker only for a center or end every cell shares', () => {
    const cell = (value: string, extra: object = {}) => ({
      ...extra,
      paragraphs: [{ content: [text(value)] }],
    });
    const document: TextEditorPortableDocument = {
      blocks: [
        {
          type: 'table',
          id: 't',
          headerRow: false,
          headerColumn: true,
          widths: [80, 80, 80],
          rows: [
            {
              cells: [
                cell('a', { align: 'center' }),
                cell('b', { colSpan: 2, align: 'end', background: 'blue' }),
              ],
            },
            {
              cells: [
                cell('c', { align: 'center' }),
                cell('d', { align: 'end' }),
                {
                  align: 'justify',
                  paragraphs: [{ content: [text('e')] }, { content: [text('f')] }],
                },
              ],
            },
          ],
        },
      ],
    };
    const first = markdown(document);
    expect(first).toBe('|  |  |  |\n| :-: | --: | --- |\n| a | b |  |\n| c | d | e<br>f |\n');
    const back = read(first).document;
    const empty = (extra: object = {}) => ({ ...extra, paragraphs: [{ content: [] }] });
    expect(back.blocks).toEqual([
      {
        type: 'table',
        id: 'n1',
        headerRow: true,
        headerColumn: false,
        rows: [
          { cells: [empty({ align: 'center' }), empty({ align: 'end' }), empty()] },
          { cells: [cell('a', { align: 'center' }), cell('b', { align: 'end' }), empty()] },
          {
            cells: [
              cell('c', { align: 'center' }),
              cell('d', { align: 'end' }),
              { paragraphs: [{ content: [text('e'), br, text('f')] }] },
            ],
          },
        ],
      },
    ]);
    expect(markdown(back)).toBe(first);
  });

  it('writes custom blocks as their Markdown, else their text, and inline nodes as their Markdown, else their text', () => {
    const document: TextEditorPortableDocument = {
      blocks: [
        {
          type: 'custom',
          id: 'a',
          name: 'callout',
          attrs: { tone: 'warning' },
          content: [text('Low '), text('tide', { bold: true }), br, text('ahead')],
        },
        { type: 'custom', id: 'b', name: 'chart', attrs: { series: 'tides' } },
        { type: 'custom', id: 'c', name: 'sketch', attrs: { title: 'Pier' } },
        { type: 'custom', id: 'd', name: 'faulty', attrs: {}, content: [text('Faulty text')] },
        { type: 'custom', id: 'e', name: 'unknown', attrs: {}, content: [text('Unknown text')] },
        p('f', [
          text('Ask '),
          { type: 'custom', name: 'mention', attrs: { label: 'Ada' } },
          text(' about '),
          { type: 'custom', name: 'tag', attrs: { name: 'tides' } },
          text(' and '),
          { type: 'custom', name: 'unknown-inline', attrs: {} },
          text('nothing'),
        ]),
      ],
    };
    const first = markdown(document, nodes);
    expect(first).toBe(
      [
        '> [!WARNING]',
        '> Low **tide**\\',
        '> ahead',
        '',
        'Chart of tides',
        '',
        'Sketch: Pier',
        '',
        'Faulty text',
        '',
        'Unknown text',
        '',
        'Ask @Ada about **#tides** and nothing',
        '',
      ].join('\n'),
    );
    const back = read(first, { nodes }).document;
    expect(back.blocks[0]).toEqual({ ...document.blocks[0], id: 'n1' });
    expect(markdown(back, nodes)).toBe(first);
  });
});
