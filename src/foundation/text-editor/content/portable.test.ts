import { describe, expect, it } from 'vitest';
import { deepFreeze } from '../../freeze.js';
import { BASE_CAPABILITIES, type TextEditorCapability } from '../capabilities.js';
import type {
  TextEditorBlockDefinition,
  TextEditorInlineDefinition,
  TextEditorNodeDefinition,
} from '../nodes.js';
import {
  blockText,
  canonicalize,
  convertedDiagnostic,
  convertUnsupported,
  definitionAttributes,
  inlineText,
  inlineTree,
  outputBlocks,
  selectPortableBlocks,
  tableGrid,
  textToInline,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableDraft,
  type TextEditorPortableInline,
  type TextEditorPortableListItem,
  type TextEditorPortableTable,
} from './portable.js';

// Definitions local to these tests (the shipped examples are documentation, not library code).
const callout: TextEditorBlockDefinition = {
  kind: 'block',
  name: 'callout',
  content: 'inline',
  element: 'aside',
  attrs: {
    tone: { type: 'enum', values: ['note', 'warning'], default: 'note' },
    level: { type: 'number', default: null },
    open: { type: 'boolean', default: false },
  },
  text: ({ attrs, text }) => `${String(attrs.tone)}: ${text}`,
  tool: { label: 'Callout' },
};
const embed: TextEditorBlockDefinition = {
  kind: 'block',
  name: 'embed',
  content: 'none',
  element: 'figure',
  attrs: { url: { type: 'string', default: '' } },
  text: ({ attrs }) => String(attrs.url),
  tool: { label: 'Embed' },
};
const mention: TextEditorInlineDefinition = {
  kind: 'inline',
  name: 'mention',
  element: 'span',
  attrs: { person: { type: 'string', default: null }, label: { type: 'string', default: '' } },
  text: (attrs) => `@${String(attrs.label)}`,
};
const nodes: readonly TextEditorNodeDefinition[] = [callout, embed, mention];

/** Identifiers `n1`, `n2`, … in the order they are asked for. */
const sequence = () => {
  let next = 0;
  return () => `n${(next += 1)}`;
};

const text = (value: string, marks?: Record<string, unknown>): TextEditorPortableInline =>
  (marks ? { type: 'text', text: value, marks } : { type: 'text', text: value }) as never;
const br: TextEditorPortableInline = { type: 'hard-break' };
const p = (content: readonly TextEditorPortableInline[], id?: string) =>
  ({ type: 'paragraph', ...(id ? { id } : {}), content }) as const;

/** The document without identifiers, for structural comparisons. */
function withoutIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutIds);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'id')
      .map(([key, item]) => [key, withoutIds(item)]),
  );
}

const fit = (draft: TextEditorPortableDraft, imported = false) =>
  withoutIds(canonicalize(draft, { nodes, imported, createId: sequence() }).document);

describe('portable model canonicalization (uwg-te-req-content-3)', () => {
  it('V-122: merges adjacent text with equal marks and drops empty runs and false marks', () => {
    expect(
      fit({
        blocks: [
          p([
            text('a', { bold: true }),
            text('b', { bold: true }),
            text(''),
            text('c'),
            text('d', {}),
            text('e', { bold: false, link: '' }),
          ]),
        ],
      }),
    ).toEqual({
      blocks: [{ type: 'paragraph', content: [text('ab', { bold: true }), text('cde')] }],
    });
  });

  it('V-122, V-365: inline code keeps only a link; superscript and subscript exclude each other', () => {
    expect(
      fit({
        blocks: [
          p([
            text('x', { code: true, bold: true, link: 'https://example.org', textColor: 'red' }),
            text('y', { superscript: true, subscript: true }),
            text('z', { textColor: 'teal', highlight: 'blue', italic: 'yes' }),
          ]),
        ],
      }),
    ).toEqual({
      blocks: [
        {
          type: 'paragraph',
          content: [
            text('x', { link: 'https://example.org', code: true }),
            text('y', { superscript: true }),
            text('z', { highlight: 'blue' }),
          ],
        },
      ],
    });
  });

  it('V-122: makes tables rectangular, clips spans and derives positional headers', () => {
    const cell = (value: string, extra: Record<string, unknown> = {}) => ({
      ...extra,
      paragraphs: [{ content: [text(value)] }],
    });
    const result = fit({
      blocks: [
        {
          type: 'table',
          rows: [
            {
              cells: [
                cell('a', { header: true }),
                cell('b', { header: true }),
                cell('c', { header: true }),
              ],
            },
            // The row span stops at the last row; `f` starts where the span leaves room.
            { cells: [cell('d', { header: true, rowSpan: 5 })] },
            { cells: [cell('e', { colSpan: 3 }), cell('f', { colSpan: 0 })] },
          ],
          widths: [100, 120, 140, 160, 180],
        },
      ],
    }) as TextEditorPortableDocument;
    const empty = { paragraphs: [{ content: [] }] };
    expect(result.blocks).toEqual([
      {
        type: 'table',
        headerRow: true,
        headerColumn: true,
        widths: [100, 120, 140, 160, 180],
        rows: [
          { cells: [cell('a'), cell('b'), cell('c'), empty, empty] },
          { cells: [cell('d', { rowSpan: 2 }), empty, empty, empty, empty] },
          { cells: [cell('e', { colSpan: 3 }), cell('f')] },
        ],
      },
    ]);
    // A span wider than the other rows widens the table, whose short rows get empty cells.
    const grid = tableGrid(result.blocks[0] as TextEditorPortableTable);
    expect([grid.rows, grid.columns, grid.grid]).toEqual([
      3,
      5,
      [
        [0, 1, 2, 3, 4],
        [5, 6, 7, 8, 9],
        [5, 10, 10, 10, 11],
      ],
    ]);
  });

  it('V-122: a column span stops at a position that a row span covers', () => {
    const cell = (value: string, extra: Record<string, unknown> = {}) => ({
      ...extra,
      paragraphs: [{ content: [text(value)] }],
    });
    const result = fit({
      blocks: [
        {
          type: 'table',
          headerRow: false,
          headerColumn: false,
          rows: [
            { cells: [cell('a'), cell('b', { rowSpan: 2 }), cell('c')] },
            { cells: [cell('d', { colSpan: 3 }), cell('e')] },
          ],
        },
      ],
    }) as TextEditorPortableDocument;
    expect((result.blocks[0] as TextEditorPortableTable).rows).toEqual([
      { cells: [cell('a'), cell('b', { rowSpan: 2 }), cell('c')] },
      { cells: [cell('d'), cell('e')] },
    ]);
  });

  it('V-122: keeps explicit header flags, drops mismatched widths and tables without cells', () => {
    const one = { paragraphs: [{ content: [text('x')] }] };
    expect(
      fit({
        blocks: [
          {
            type: 'table',
            headerRow: false,
            headerColumn: true,
            widths: [10],
            rows: [{ cells: [one, one] }],
          },
          { type: 'table', rows: [{ cells: [{ ...one, header: true }, one] }], widths: [0, 5] },
          { type: 'table', rows: [{ cells: [] }, { cells: [] }] },
        ],
      }),
    ).toEqual({
      blocks: [
        { type: 'table', headerRow: false, headerColumn: true, rows: [{ cells: [one, one] }] },
        { type: 'table', headerRow: false, headerColumn: true, rows: [{ cells: [one, one] }] },
      ],
    });
  });

  it('V-122: an empty document becomes one empty paragraph with a fresh identifier; a pending image (an empty source) is kept, an image without a source is not', () => {
    for (const blocks of [[], [{ type: 'image', alt: 'x' }]] as const) {
      const { document, diagnostics } = canonicalize(
        { blocks: blocks as unknown as TextEditorPortableBlock[] },
        { createId: sequence() },
      );
      expect([document, diagnostics]).toEqual([
        { blocks: [{ type: 'paragraph', id: 'n1', content: [] }] },
        [],
      ]);
    }
    const pending = canonicalize(
      { blocks: [{ type: 'image', src: '', alt: '' }] as unknown as TextEditorPortableBlock[] },
      { createId: sequence() },
    );
    expect(pending.document.blocks).toEqual([{ type: 'image', id: 'n1', src: '', alt: '' }]);
  });

  it('V-365: a paragraph in a list item joins its text with a hard break; a list in a cell becomes paragraphs', () => {
    expect(
      fit({
        blocks: [
          {
            type: 'list-bullet',
            content: [text('a')],
            children: [
              p([text('b')]),
              { type: 'list-ordered', content: [text('c')], children: [] },
            ],
          },
          {
            type: 'table',
            headerRow: false,
            headerColumn: false,
            rows: [
              {
                cells: [
                  {
                    blocks: [
                      {
                        type: 'list-bullet',
                        content: [text('x')],
                        children: [
                          { type: 'list-task', checked: true, content: [text('y')], children: [] },
                        ],
                      },
                      { type: 'heading', level: 2, content: [text('Title', { bold: true })] },
                      {
                        type: 'table',
                        headerRow: false,
                        headerColumn: false,
                        rows: [
                          {
                            cells: [
                              { paragraphs: [{ content: [text('1')] }] },
                              { paragraphs: [{ content: [text('2')] }] },
                            ],
                          },
                          {
                            cells: [
                              { paragraphs: [{ content: [text('3')] }] },
                              { paragraphs: [{ content: [text('4')] }] },
                            ],
                          },
                        ],
                      },
                      { type: 'divider' },
                      p([text('kept', { italic: true })]),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toEqual({
      blocks: [
        {
          type: 'list-bullet',
          content: [text('a'), br, text('b')],
          children: [{ type: 'list-ordered', content: [text('c')], children: [] }],
        },
        {
          type: 'table',
          headerRow: false,
          headerColumn: false,
          rows: [
            {
              cells: [
                {
                  paragraphs: [
                    { content: [text('x')] },
                    { content: [text('y')] },
                    { content: [text('Title')] },
                    { content: [text('1\t2'), br, text('3\t4')] },
                    { content: [text('kept', { italic: true })] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('a block inside a list item leaves it at its place and splits the outermost list', () => {
    const { document } = canonicalize(
      {
        blocks: [
          {
            type: 'list-bullet',
            id: 'A',
            content: [text('A')],
            children: [
              {
                type: 'list-bullet',
                id: 'B',
                content: [text('B')],
                children: [
                  { type: 'code', id: 'X', text: 'x' },
                  { type: 'list-bullet', id: 'C', content: [text('C')], children: [] },
                ],
              },
              { type: 'list-bullet', id: 'D', content: [text('D')], children: [] },
            ],
          },
          { type: 'list-bullet', id: 'E', content: [text('E')], children: [] },
        ],
      },
      { createId: sequence() },
    );
    const item = (id: string, children: unknown[] = []) => ({
      type: 'list-bullet',
      id,
      content: [text(id)],
      children,
    });
    expect(document.blocks).toEqual([
      item('A', [item('B')]),
      { type: 'code', id: 'X', text: 'x' },
      item('C'),
      item('D'),
      item('E'),
    ]);
  });

  it('after a split, text before nested items starts a part; text after them leaves the list', () => {
    const { document } = canonicalize(
      {
        blocks: [
          {
            type: 'list-bullet',
            id: 'a',
            content: [text('a')],
            children: [{ type: 'code', id: 'x', text: 'x' }, p([text('b')])],
          },
          {
            type: 'list-bullet',
            id: 'c',
            content: [text('c')],
            children: [
              { type: 'code', id: 'y', text: 'y' },
              { type: 'list-bullet', id: 'd', content: [text('d')], children: [] },
              p([text('e')]),
            ],
          },
        ],
      },
      { createId: sequence() },
    );
    const item = (id: string, content: string) => ({
      type: 'list-bullet',
      id,
      content: [text(content)],
      children: [],
    });
    expect(document.blocks).toEqual([
      item('a', 'a'),
      { type: 'code', id: 'x', text: 'x' },
      item('n1', 'b'),
      item('c', 'c'),
      { type: 'code', id: 'y', text: 'y' },
      item('d', 'd'),
      p([text('e')], 'n2'),
    ]);
  });

  it('a list item split by a block keeps its identifier and start on the first part it keeps', () => {
    const { document } = canonicalize(
      {
        blocks: [
          {
            type: 'list-ordered',
            id: 'keep',
            start: 3,
            children: [
              { type: 'image', id: 'img', src: 'a.png', alt: '' },
              p([text('b')]),
              { type: 'list-bullet', id: 'c', content: [text('c')], children: [] },
              p([text('after')]),
            ],
          },
          {
            type: 'list-task',
            id: 't',
            checked: true,
            content: [text('t')],
            children: [{ type: 'quote', id: 'q', content: [text('q')] }, p([])],
          },
        ],
      },
      { createId: sequence() },
    );
    expect(document.blocks).toEqual([
      { type: 'image', id: 'img', src: 'a.png', alt: '' },
      {
        type: 'list-ordered',
        id: 'keep',
        start: 3,
        content: [text('b')],
        children: [{ type: 'list-bullet', id: 'c', content: [text('c')], children: [] }],
      },
      p([text('after')], 'n1'),
      { type: 'list-task', id: 't', checked: true, content: [text('t')], children: [] },
      { type: 'quote', id: 'q', content: [text('q')] },
    ]);
  });

  it("a quote's paragraphs join with hard breaks; its other blocks leave it and empty parts are dropped", () => {
    const { document } = canonicalize(
      {
        blocks: [
          {
            type: 'quote',
            id: 'q',
            blocks: [
              p([text('a')]),
              p([]),
              p([text('b')]),
              { type: 'heading', id: 'h', level: 2, content: [text('h')] },
              p([text('c')]),
            ],
          },
          { type: 'quote', id: 'gone', blocks: [{ type: 'divider', id: 'hr' }] },
          { type: 'quote', id: 'empty', content: [] },
          {
            type: 'quote',
            blocks: [{ type: 'paragraph', align: 'center', content: [text('aligned')] }],
          },
        ],
      },
      { createId: sequence() },
    );
    expect(document.blocks).toEqual([
      { type: 'quote', id: 'q', content: [text('a'), br, br, text('b')] },
      { type: 'heading', id: 'h', level: 2, content: [text('h')] },
      { type: 'quote', id: 'n1', content: [text('c')] },
      { type: 'divider', id: 'hr' },
      { type: 'quote', id: 'empty', content: [] },
      { type: 'quote', id: 'n2', align: 'center', content: [text('aligned')] },
    ]);
  });

  it('keeps the start of an ordered list on its first item only; a list of mixed kinds splits', () => {
    expect(
      fit({
        blocks: [
          { type: 'list-ordered', start: 3, content: [text('a')], children: [] },
          { type: 'list-ordered', start: 7, content: [text('b')], children: [] },
          { type: 'list-task', checked: true, content: [text('c')], children: [] },
          { type: 'list-ordered', start: 0, content: [text('d')], children: [] },
          { type: 'list-ordered', start: 1, content: [text('e')], children: [] },
          p([]),
          { type: 'list-ordered', start: 1, content: [text('f')], children: [] },
          { type: 'list-ordered', start: -2, content: [text('g')], children: [] },
        ],
      }),
    ).toEqual({
      blocks: [
        { type: 'list-ordered', start: 3, content: [text('a')], children: [] },
        { type: 'list-ordered', content: [text('b')], children: [] },
        { type: 'list-task', checked: true, content: [text('c')], children: [] },
        { type: 'list-ordered', start: 0, content: [text('d')], children: [] },
        { type: 'list-ordered', content: [text('e')], children: [] },
        { type: 'paragraph', content: [] },
        { type: 'list-ordered', content: [text('f')], children: [] },
        { type: 'list-ordered', content: [text('g')], children: [] },
      ],
    });
  });

  it('V-365: checks kinds and attributes, leaving defaults out', () => {
    expect(
      fit({
        blocks: [
          { type: 'heading', level: 0 as never, align: 'start', content: [text('a')] },
          { type: 'heading', level: 9 as never, align: 'left' as never, content: [text('b')] },
          { type: 'heading', level: 2.6 as never, align: 'end', content: [text('c')] },
          { type: 'code', language: '  js ', text: 'x' },
          { type: 'code', language: 'not a language', text: 'y' },
          { type: 'code', language: '', text: 4 as never },
          { type: 'image', src: 'a.png', alt: 3 as never, width: -1 },
          { type: 'image', src: 'b.png', alt: 'B', width: 120 },
          { type: 'list-task', checked: 'yes' as never, content: [text('t')], children: [] },
          { type: 'nope' } as never,
        ],
      }),
    ).toEqual({
      blocks: [
        { type: 'heading', level: 1, content: [text('a')] },
        { type: 'heading', level: 6, content: [text('b')] },
        { type: 'heading', level: 3, align: 'end', content: [text('c')] },
        { type: 'code', language: 'js', text: 'x' },
        { type: 'code', text: 'y' },
        { type: 'code', text: '' },
        { type: 'image', src: 'a.png', alt: '' },
        { type: 'image', src: 'b.png', alt: 'B', width: 120 },
        { type: 'list-task', checked: false, content: [text('t')], children: [] },
      ],
    });
  });

  it('gives a defined custom node the content and attributes of its definition', () => {
    expect(
      fit({
        blocks: [
          {
            type: 'custom',
            name: 'callout',
            attrs: { tone: 'warning', level: '4', open: 'true', extra: 'x' },
            blocks: [
              p([text('a')]),
              p([
                text('b'),
                { type: 'custom', name: 'mention', attrs: { label: 'Ada', person: 7 } },
              ]),
            ],
          },
          { type: 'custom', name: 'callout', attrs: { tone: 'loud', level: 'x' }, content: [] },
          {
            type: 'custom',
            name: 'embed',
            attrs: { url: 'https://example.org' },
            content: [text('dropped')],
          },
          {
            type: 'custom',
            name: 'unknown',
            attrs: { a: 1, b: { nested: true } as never },
            content: [text('kept')],
          },
          { type: 'custom', name: '', attrs: {} },
        ],
      }),
    ).toEqual({
      blocks: [
        {
          type: 'custom',
          name: 'callout',
          attrs: { tone: 'warning', level: 4, open: true },
          content: [
            text('a'),
            br,
            text('b'),
            { type: 'custom', name: 'mention', attrs: { person: '7', label: 'Ada' } },
          ],
        },
        {
          type: 'custom',
          name: 'callout',
          attrs: { tone: 'note', level: null, open: false },
          content: [],
        },
        { type: 'custom', name: 'embed', attrs: { url: 'https://example.org' } },
        { type: 'custom', name: 'unknown', attrs: { a: 1 }, content: [text('kept')] },
      ],
    });
  });

  it('validates identifiers: the first of duplicates keeps its identifier, with one diagnostic', () => {
    const { document, diagnostics } = canonicalize(
      {
        blocks: [
          p([text('a')], 'ok'),
          p([text('b')], 'ok'),
          p([text('c')], 'not valid'),
          p([text('d')]),
          {
            type: 'list-bullet',
            id: 'ok',
            content: [text('e')],
            children: [{ type: 'list-bullet', id: 'n1', content: [text('f')], children: [] }],
          },
        ],
      },
      { createId: sequence() },
    );
    const ids: string[] = [];
    const visit = (block: TextEditorPortableBlock) => {
      ids.push(block.id!);
      if ('children' in block) block.children.forEach(visit);
    };
    document.blocks.forEach(visit);
    // `n1` is kept by the nested item, so the first fresh identifier is `n2`.
    expect(ids).toEqual(['ok', 'n2', 'n3', 'n4', 'n5', 'n1']);
    expect(diagnostics).toEqual([
      {
        code: 'text-editor-block-id',
        message: 'Replaced 3 invalid or duplicate block identifiers.',
      },
    ]);
  });

  it('imported content: a no-break space reads as a space and the break that ends a textblock is dropped', () => {
    const draft: TextEditorPortableDraft = {
      blocks: [
        p([text('a\u00a0b'), br]),
        p([text('c'), br, br, text('')]),
        { type: 'quote', blocks: [p([text('d'), br]), p([text('e')])] },
        { type: 'code', text: 'f\u00a0g\n' },
        { type: 'list-bullet', content: [text('h'), br], children: [] },
      ],
    };
    expect(fit(draft, true)).toEqual({
      blocks: [
        { type: 'paragraph', content: [text('a b')] },
        { type: 'paragraph', content: [text('c'), br] },
        { type: 'quote', content: [text('d'), br, text('e')] },
        { type: 'code', text: 'f\u00a0g\n' },
        { type: 'list-bullet', content: [text('h')], children: [] },
      ],
    });
    // Without `imported`, a final hard break and a no-break space are content.
    expect(fit(draft)).toEqual({
      blocks: [
        { type: 'paragraph', content: [text('a\u00a0b'), br] },
        { type: 'paragraph', content: [text('c'), br, br] },
        { type: 'quote', content: [text('d'), br, br, text('e')] },
        { type: 'code', text: 'f\u00a0g\n' },
        { type: 'list-bullet', content: [text('h'), br], children: [] },
      ],
    });
  });

  it('returns an equal document for a canonical one, never changes its input and never throws', () => {
    const draft = deepFreeze({
      blocks: [
        {
          type: 'quote',
          blocks: [p([text('a')]), { type: 'divider' }, p([text('b', { bold: true })])],
        },
        {
          type: 'list-ordered',
          start: 4,
          content: [text('c')],
          children: [p([text('d')]), { type: 'table', rows: [{ cells: [{ paragraphs: [] }] }] }],
        },
        { type: 'custom', name: 'callout', attrs: {}, content: [text('e')] },
      ],
    }) as unknown as TextEditorPortableDraft;
    const snapshot = JSON.stringify(draft);
    const first = canonicalize(draft, { nodes, createId: sequence() }).document;
    expect(JSON.stringify(draft)).toBe(snapshot);
    const second = canonicalize(first, { nodes, createId: sequence() });
    expect(second).toEqual({ document: first, diagnostics: [] });
    const garbage = {
      blocks: [
        null,
        1,
        'x',
        { type: 'nope' },
        { type: 'paragraph', content: 'x' },
        { type: 'table', rows: 'no' },
        { type: 'list-bullet', children: [null, { type: 'list-task' }] },
        {
          type: 'quote',
          blocks: [null, { type: 'paragraph', content: [null, { type: 'text', text: 5 }] }],
        },
      ],
    } as unknown as TextEditorPortableDraft;
    expect(withoutIds(canonicalize(garbage).document)).toEqual({
      blocks: [
        { type: 'paragraph', content: [] },
        {
          type: 'list-bullet',
          content: [],
          children: [{ type: 'list-task', checked: false, content: [], children: [] }],
        },
        { type: 'quote', content: [] },
      ],
    });
  });
});

describe('content an engine cannot represent (uwg-te-req-engine-8, uwg-te-tab-engine r8, r9)', () => {
  const withoutTables = new Set<TextEditorCapability>(BASE_CAPABILITIES);
  const table: TextEditorPortableTable = {
    type: 'table',
    id: 'tbl',
    headerRow: true,
    headerColumn: false,
    rows: [
      {
        cells: [
          { paragraphs: [{ content: [text('Name')] }] },
          { paragraphs: [{ content: [text('Role')] }] },
        ],
      },
      {
        cells: [
          { colSpan: 2, paragraphs: [{ content: [text('Ada')] }, { content: [text('Lovelace')] }] },
        ],
      },
    ],
  };

  it('uwg-te-req-engine-8: a table without block.table becomes one paragraph, a line per row and tab-separated cells', () => {
    const document = { blocks: [p([text('before')], 'p1'), table] };
    const result = convertUnsupported(document, { capabilities: withoutTables });
    expect(result).toEqual({
      document: {
        blocks: [
          p([text('before')], 'p1'),
          p([text('Name\tRole'), br, text('Ada Lovelace\t')], 'tbl'),
        ],
      },
      converted: ['table'],
    });
    expect(convertedDiagnostic(result.converted)).toEqual({
      code: 'text-editor-content-converted',
      message: 'Converted content that the engine cannot represent: table.',
    });
    expect(convertedDiagnostic([])).toBeNull();
  });

  it('uwg-te-req-engine-8: unsupported custom blocks and inline nodes become their text, or nothing without one', () => {
    const capabilities = new Set<TextEditorCapability>([...BASE_CAPABILITIES, 'block.embed']);
    const document: TextEditorPortableDocument = {
      blocks: [
        {
          type: 'custom',
          id: 'c',
          name: 'callout',
          attrs: { tone: 'warning', level: null, open: false },
          content: [
            text('Mind '),
            { type: 'custom', name: 'mention', attrs: { person: null, label: 'Ada' } },
          ],
        },
        {
          type: 'paragraph',
          id: 'p',
          content: [
            text('Hi '),
            { type: 'custom', name: 'mention', attrs: { person: null, label: 'Ada' } },
            text('!'),
            { type: 'custom', name: 'ghost', attrs: {} },
          ],
        },
        { type: 'custom', id: 'e', name: 'embed', attrs: { url: 'https://example.org' } },
      ],
    };
    expect(convertUnsupported(document, { capabilities, nodes })).toEqual({
      document: {
        blocks: [
          p([text('warning: Mind @Ada')], 'c'),
          p([text('Hi @Ada!')], 'p'),
          { type: 'custom', id: 'e', name: 'embed', attrs: { url: 'https://example.org' } },
        ],
      },
      converted: ['callout', 'mention', 'ghost'],
    });
  });

  it('uwg-te-req-engine-8: a converted list item becomes a paragraph and its nested items follow it', () => {
    const capabilities = new Set<TextEditorCapability>(
      [...BASE_CAPABILITIES].filter((capability) => capability !== 'block.list-task'),
    );
    const item = (type: string, id: string, children: unknown[] = []) =>
      ({
        type,
        id,
        ...(type === 'list-task' ? { checked: true } : {}),
        content: [text(id)],
        children,
      }) as never;
    const document: TextEditorPortableDocument = {
      blocks: [
        item('list-bullet', 'A', [
          item('list-task', 'B', [item('list-bullet', 'C')]),
          item('list-bullet', 'D'),
        ]),
        item('list-bullet', 'E'),
      ],
    };
    const result = convertUnsupported(document, { capabilities });
    expect(result.converted).toEqual(['list-task']);
    expect(result.document.blocks).toEqual([
      { type: 'list-bullet', id: 'A', content: [text('A')], children: [] },
      p([text('B')], 'B'),
      { type: 'list-bullet', id: 'C', content: [text('C')], children: [] },
      { type: 'list-bullet', id: 'D', content: [text('D')], children: [] },
      { type: 'list-bullet', id: 'E', content: [text('E')], children: [] },
    ]);
  });

  it('returns the document itself when the engine represents everything', () => {
    const document = { blocks: [table, p([text('x')], 'x')] };
    const capabilities = new Set<TextEditorCapability>([...BASE_CAPABILITIES, 'block.table']);
    const result = convertUnsupported(document, { capabilities });
    expect(result.document).toBe(document);
    expect(result.converted).toEqual([]);
  });
});

describe('portable model helpers', () => {
  it('selects block subtrees in document order, each list item with its nested items (uwg-te-tab-engine r5)', () => {
    const item = (
      id: string,
      children: TextEditorPortableListItem[] = [],
    ): TextEditorPortableListItem => ({ type: 'list-ordered', id, content: [text(id)], children });
    const document: TextEditorPortableDocument = {
      blocks: [
        p([text('intro')], 'p1'),
        item('i1', [item('i2', [item('i3')]), item('i4')]),
        p([text('outro')], 'p2'),
      ],
    };
    const ids = (selected: TextEditorPortableDocument) =>
      selected.blocks.map((block) => [block.id, 'children' in block ? block.children.length : 0]);
    expect(ids(selectPortableBlocks(document, ['p2', 'i1']))).toEqual([
      ['i1', 2],
      ['p2', 0],
    ]);
    // A nested item without its parent takes the top level; one inside a listed item comes with it.
    expect(ids(selectPortableBlocks(document, ['i3', 'i2', 'i4', 'missing']))).toEqual([
      ['i2', 1],
      ['i4', 0],
    ]);
    expect(selectPortableBlocks(document, ['missing'])).toEqual({ blocks: [] });
    expect(selectPortableBlocks(document, ['i1']).blocks[0]).toBe(document.blocks[1]);
  });

  it('omits only the empty paragraph that follows a final atom block or table (uwg-te-req-blocks-1)', () => {
    const trailing = p([], 't');
    const divider = { type: 'divider', id: 'd' } as const;
    expect(outputBlocks({ blocks: [divider, trailing] })).toEqual([divider]);
    expect(
      outputBlocks({
        blocks: [
          { type: 'table', id: 'x', headerRow: false, headerColumn: false, rows: [] },
          trailing,
        ],
      }),
    ).toHaveLength(1);
    expect(
      outputBlocks({ blocks: [{ type: 'custom', id: 'e', name: 'embed', attrs: {} }, trailing] }),
    ).toHaveLength(1);
    expect(outputBlocks({ blocks: [p([text('a')], 'a'), trailing] })).toHaveLength(2);
    expect(outputBlocks({ blocks: [divider, p([text('a')], 'a')] })).toHaveLength(2);
    expect(outputBlocks({ blocks: [trailing] })).toHaveLength(1);
  });

  it('nests marks in the profile order and lets adjacent runs share outer marks', () => {
    expect(
      inlineTree([
        text('a', { link: 'https://example.org', bold: true }),
        text('b', { link: 'https://example.org', italic: true }),
        br,
        text('c', { code: true, link: 'https://example.org' }),
      ]),
    ).toEqual([
      {
        type: 'mark',
        mark: 'link',
        value: 'https://example.org',
        children: [
          { type: 'mark', mark: 'bold', value: true, children: [{ type: 'text', text: 'a' }] },
          { type: 'mark', mark: 'italic', value: true, children: [{ type: 'text', text: 'b' }] },
        ],
      },
      br,
      {
        type: 'mark',
        mark: 'link',
        value: 'https://example.org',
        children: [
          { type: 'mark', mark: 'code', value: true, children: [{ type: 'text', text: 'c' }] },
        ],
      },
    ]);
    expect(
      inlineTree([
        text('x', { textColor: 'red', highlight: 'yellow', bold: true }),
        text('y', { textColor: 'blue' }),
      ]),
    ).toEqual([
      {
        type: 'mark',
        mark: 'textColor',
        value: 'red',
        children: [
          {
            type: 'mark',
            mark: 'highlight',
            value: 'yellow',
            children: [
              { type: 'mark', mark: 'bold', value: true, children: [{ type: 'text', text: 'x' }] },
            ],
          },
        ],
      },
      { type: 'mark', mark: 'textColor', value: 'blue', children: [{ type: 'text', text: 'y' }] },
    ]);
  });

  it('gives the text of blocks and inline content as the text format writes it', () => {
    expect(
      inlineText(
        [
          text('a', { bold: true }),
          br,
          { type: 'custom', name: 'mention', attrs: { label: 'Ada' } },
        ],
        nodes,
      ),
    ).toBe('a\n@Ada');
    expect(inlineText([{ type: 'custom', name: 'mention', attrs: { label: 'Ada' } }])).toBe('');
    expect(blockText({ type: 'code', id: 'c', text: 'x\n\ny' })).toBe('x\n\ny');
    expect(blockText({ type: 'divider', id: 'd' })).toBeNull();
    expect(blockText({ type: 'image', id: 'i', src: 'a.png', alt: '' })).toBeNull();
    expect(blockText({ type: 'image', id: 'i', src: 'a.png', alt: 'A cat' })).toBe('A cat');
    expect(
      blockText({ type: 'custom', id: 'e', name: 'embed', attrs: { url: '' } }, nodes),
    ).toBeNull();
    expect(blockText({ type: 'custom', id: 'e', name: 'embed', attrs: { url: 'u' } }, nodes)).toBe(
      'u',
    );
    expect(blockText({ type: 'custom', id: 'e', name: 'other', attrs: {}, content: [] })).toBe('');
    const throwing: TextEditorBlockDefinition = {
      ...callout,
      text: () => {
        throw new Error('no text');
      },
    };
    expect(
      blockText({ type: 'custom', id: 'c', name: 'callout', attrs: {}, content: [text('own')] }, [
        throwing,
      ]),
    ).toBe('own');
    expect(textToInline('a\n\nb')).toEqual([text('a'), br, br, text('b')]);
    expect(definitionAttributes(callout, { tone: 'warning', open: 'false', level: 2 })).toEqual({
      tone: 'warning',
      level: 2,
      open: false,
    });
  });
});
