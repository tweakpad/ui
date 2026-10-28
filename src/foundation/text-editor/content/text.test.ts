import { describe, expect, it } from 'vitest';
import type { TextEditorBlockDefinition, TextEditorInlineDefinition } from '../nodes.js';
import type { TextEditorPortableDocument, TextEditorPortableInline } from './portable.js';
import { readText, writeText } from './text.js';

// Definitions local to these tests.
const embed: TextEditorBlockDefinition = {
  kind: 'block',
  name: 'embed',
  content: 'none',
  element: 'figure',
  attrs: { url: { type: 'string', default: '' } },
  text: ({ attrs }) => String(attrs.url),
  tool: { label: 'Embed' },
};
const note: TextEditorBlockDefinition = {
  kind: 'block',
  name: 'note',
  content: 'inline',
  element: 'aside',
  attrs: {},
  tool: { label: 'Note' },
};
const mention: TextEditorInlineDefinition = {
  kind: 'inline',
  name: 'mention',
  element: 'span',
  attrs: { label: { type: 'string', default: '' } },
  text: (attrs) => `@${String(attrs.label)}`,
};
const nodes = [embed, note, mention];

const text = (value: string, marks?: Record<string, unknown>): TextEditorPortableInline =>
  (marks ? { type: 'text', text: value, marks } : { type: 'text', text: value }) as never;
const br: TextEditorPortableInline = { type: 'hard-break' };
const sequence = () => {
  let next = 0;
  return () => `n${(next += 1)}`;
};
const cell = (value: string, extra: Record<string, unknown> = {}) => ({
  ...extra,
  paragraphs: [{ content: value ? [text(value)] : [] }],
});

/** Corpus-like content of every block kind (original sample text). */
const garden: TextEditorPortableDocument = {
  blocks: [
    { type: 'heading', id: 'h', level: 1, content: [text('Field notes')] },
    {
      type: 'paragraph',
      id: 'p',
      align: 'center',
      content: [text('First '), text('line', { bold: true }), br, text('second line')],
    },
    {
      type: 'list-bullet',
      id: 'l1',
      content: [text('Ferns')],
      children: [{ type: 'list-bullet', id: 'l2', content: [text('Maidenhair')], children: [] }],
    },
    { type: 'list-task', id: 'l3', checked: true, content: [text('Water the moss')], children: [] },
    { type: 'divider', id: 'd' },
    { type: 'code', id: 'c', language: 'sh', text: 'ls -la\n\n\tcd ..' },
    { type: 'image', id: 'i', src: 'fern.png', alt: 'A fern frond', width: 320 },
    { type: 'image', id: 'i2', src: 'blank.png', alt: '' },
    {
      type: 'table',
      id: 't',
      headerRow: true,
      headerColumn: false,
      rows: [
        { cells: [cell('Plant'), cell('Light'), cell('Water')] },
        { cells: [cell('Moss', { colSpan: 2 }), cell('Often', { rowSpan: 2 })] },
        {
          cells: [
            cell('Fern'),
            {
              paragraphs: [
                { content: [text('Part')] },
                { content: [] },
                { content: [text('shade')] },
              ],
            },
          ],
        },
      ],
    },
    { type: 'quote', id: 'q', content: [text('Slow growth'), br, text('is still growth')] },
    { type: 'paragraph', id: 'e', content: [] },
    { type: 'custom', id: 'x', name: 'embed', attrs: { url: '' } },
    {
      type: 'paragraph',
      id: 'm',
      content: [text('Ask '), { type: 'custom', name: 'mention', attrs: { label: 'Ada' } }],
    },
    { type: 'custom', id: 'n', name: 'note', attrs: {}, content: [text('Shade cloth')] },
  ],
};

const gardenText = [
  'Field notes',
  'First line\nsecond line',
  'Ferns\nMaidenhair\nWater the moss',
  'ls -la\n\n\tcd ..',
  'A fern frond',
  'Plant\tLight\tWater\nMoss\t\tOften\nFern\tPart shade\t',
  'Slow growth\nis still growth',
  '',
  'Ask @Ada',
  'Shade cloth',
].join('\n\n');

describe('text format (uwg-te-req-content-5)', () => {
  it('V-127: joins blocks with a blank line, list items with one break and cells with tabs', () => {
    // Dividers and textless atoms are omitted, code is verbatim, an image gives its alternative
    // text, a span's covered positions are empty cells and a cell's paragraphs join with a space.
    expect(writeText(garden, { nodes })).toBe(gardenText);
  });

  it('V-127: list items are consecutive only when no block lies between them', () => {
    const item = (type: 'list-bullet' | 'list-ordered', id: string) =>
      ({ type, id, content: [text(id)], children: [] }) as const;
    expect(
      writeText({
        blocks: [item('list-bullet', 'a'), item('list-ordered', 'b'), { type: 'divider', id: 'd' }],
      }),
    ).toBe('a\nb');
    expect(
      writeText({
        blocks: [item('list-bullet', 'a'), { type: 'divider', id: 'd' }, item('list-bullet', 'b')],
      }),
    ).toBe('a\n\nb');
  });

  it('omits the empty paragraph after a final atom block or table (uwg-te-req-blocks-1)', () => {
    const trailing = { type: 'paragraph', id: 'z', content: [] } as const;
    expect(
      writeText({ blocks: [{ type: 'image', id: 'i', src: 'a.png', alt: 'Moss' }, trailing] }),
    ).toBe('Moss');
    expect(writeText({ blocks: [{ type: 'divider', id: 'd' }, trailing] })).toBe('');
    expect(writeText({ blocks: [trailing] })).toBe('');
    expect(
      writeText({
        blocks: [{ type: 'paragraph', id: 'a', content: [text('a')] }, trailing],
      }),
    ).toBe('a\n\n');
  });

  it('writes a custom block and an inline node without a definition as their own text, or nothing', () => {
    // Without definitions the mention gives nothing, the note its inline text, the embed nothing.
    expect(writeText(garden)).toBe(gardenText.replace('\n\nAsk @Ada', '\n\nAsk '));
  });

  it('V-127: reads pairs of line breaks from the start; each further pair is an empty paragraph', () => {
    const paragraphs = (value: string) =>
      readText(value, { createId: sequence() }).blocks.map((block) =>
        block.type === 'paragraph' ? block.content : null,
      );
    expect(paragraphs('a\n\n\n\nb')).toEqual([[text('a')], [], [text('b')]]);
    expect(paragraphs('a\nb')).toEqual([[text('a'), br, text('b')]]);
    expect(paragraphs('a\n\n\nb')).toEqual([[text('a')], [br, text('b')]]);
    expect(paragraphs('a\n')).toEqual([[text('a'), br]]);
    expect(paragraphs('\n\n')).toEqual([[], []]);
    expect(paragraphs('')).toEqual([[]]);
    expect(paragraphs('a\r\nb\r\rc')).toEqual([[text('a'), br, text('b')], [text('c')]]);
    expect(paragraphs('x\u00a0\ty')).toEqual([[text('x\u00a0\ty')]]);
  });

  it('gives every paragraph it reads a fresh identifier', () => {
    expect(readText('a\n\nb', { createId: sequence() })).toEqual({
      blocks: [
        { type: 'paragraph', id: 'n1', content: [text('a')] },
        { type: 'paragraph', id: 'n2', content: [text('b')] },
      ],
    });
    const [first] = readText('a').blocks;
    expect(first?.id).toMatch(/^[a-z0-9]{10}$/u);
  });

  it('V-127: the second export equals the first, code with blank lines included', () => {
    const first = writeText(garden, { nodes });
    const second = writeText(readText(first), { nodes });
    expect(second).toBe(first);
    for (const value of ['a\n\n\n\nb', 'a\nb', 'line\n\n\n', '\n', 'x\n\n\ty\n\n\n\n\nz'])
      expect(writeText(readText(value))).toBe(value);
  });

  it('writes no class vocabulary', () => {
    expect(writeText(garden, { nodes })).not.toContain('tp-te-');
  });
});
