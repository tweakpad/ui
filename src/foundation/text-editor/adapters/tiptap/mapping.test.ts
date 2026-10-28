import { describe, expect, it } from 'vitest';
import {
  canonicalize,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
} from '../../content/portable.js';
import type { TextEditorTextPoint } from '../../model.js';
import {
  fromTiptapJson,
  holderIndex,
  pointToPos,
  posToPoint,
  rangeToPositions,
  toTiptapJson,
  holderAtPos,
} from './mapping.js';
import { blockTree } from '../shared/blocks.js';
import { CORPUS_ENTRIES, corpusFile, corpusGolden } from '../../content/corpus.test.js';
import { headlessTiptap, html, mountTiptap, TIPTAP_MODULES } from './tiptap-stubs.test.js';

const text = (value: string, marks?: Record<string, unknown>) =>
  marks ? { type: 'text' as const, text: value, marks } : { type: 'text' as const, text: value };

/** A document of every block kind, list nesting, spans and atoms. */
const SAMPLE: TextEditorPortableBlock[] = [
  {
    type: 'paragraph',
    id: 'p1',
    align: 'center',
    content: [
      text('Swell 🌊 at ', { bold: true }),
      text('dawn', { link: 'https://harbor.example/', code: true }),
      { type: 'hard-break' },
      text('blue', { textColor: 'blue', highlight: 'yellow', italic: true }),
    ],
  },
  { type: 'heading', id: 'h3', level: 3, align: 'end', content: [text('Tides')] },
  { type: 'quote', id: 'q1', content: [text('Fair'), { type: 'hard-break' }, text('winds')] },
  { type: 'code', id: 'c1', language: 'ts', text: 'const knots = 12;\nreturn;' },
  {
    type: 'list-ordered',
    id: 'o1',
    start: 3,
    content: [text('Moor')],
    children: [
      {
        type: 'list-task',
        id: 't1',
        checked: true,
        content: [text('Check 🪢 lines')],
        children: [{ type: 'list-bullet', id: 'b1', content: [text('Coil')], children: [] }],
      },
    ],
  },
  { type: 'list-ordered', id: 'o2', content: [text('Cast off')], children: [] },
  { type: 'divider', id: 'd1' },
  { type: 'image', id: 'i1', src: 'https://harbor.example/buoy.png', alt: 'Buoy', width: 120 },
  {
    type: 'table',
    id: 'tb1',
    headerRow: true,
    headerColumn: true,
    widths: [80, 96, 120],
    rows: [
      {
        cells: [
          { paragraphs: [{ content: [text('Pier')] }] },
          { colSpan: 2, background: 'green', paragraphs: [{ content: [text('Depth')] }] },
        ],
      },
      {
        cells: [
          {
            rowSpan: 2,
            align: 'center',
            paragraphs: [{ content: [text('North')] }, { content: [] }],
          },
          { paragraphs: [{ content: [text('4 m')] }] },
          { paragraphs: [{ content: [] }] },
        ],
      },
      { cells: [{ paragraphs: [{ content: [] }] }, { paragraphs: [{ content: [text('x')] }] }] },
    ],
  },
  { type: 'paragraph', id: 'p2', content: [] },
];

const sample = (): TextEditorPortableDocument => canonicalize({ blocks: SAMPLE }).document;

describe('Tiptap native JSON mapping (uwg-te-req-content-1, uwg-te-tab-engine r5)', () => {
  it('maps every block kind to native JSON and back without change', () => {
    const document = sample();
    expect(document.blocks).toEqual(SAMPLE);
    const json = toTiptapJson(document);
    expect(canonicalize(fromTiptapJson(json)).document).toEqual(document);
    // Through the engine: its own JSON maps back to the same document.
    const { editor } = headlessTiptap(document);
    expect(canonicalize(fromTiptapJson(editor.getJSON())).document).toEqual(document);
  });

  it('keeps colors as palette names and a link href only', () => {
    const json = toTiptapJson(sample()) as unknown as { content: { content?: unknown[] }[] };
    expect(json.content[0]!.content).toContainEqual({
      type: 'text',
      text: 'blue',
      marks: [
        { type: 'textColor', attrs: { color: 'blue' } },
        { type: 'highlight', attrs: { color: 'yellow' } },
        { type: 'italic' },
      ],
    });
    const { editor } = headlessTiptap(sample());
    const linked = JSON.stringify(editor.getJSON());
    expect(linked).toContain('{"type":"link","attrs":{"href":"https://harbor.example/"}}');
    expect(linked).not.toMatch(/"target"|"rel"|"title"|"class"/u);
  });

  it('reads JSON of another schema loosely: container quotes, unknown nodes, foreign marks', () => {
    const draft = fromTiptapJson({
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'b' }] },
          ],
        },
        { type: 'embed', attrs: { id: 'e1', url: 'https://x.example/' } },
        { type: 'paragraph', content: [{ type: 'text', text: 'c', marks: [{ type: 'mystery' }] }] },
      ],
    });
    expect(canonicalize(draft).document.blocks).toMatchObject([
      { type: 'quote', content: [text('a'), { type: 'hard-break' }, text('b')] },
      { type: 'custom', id: 'e1', name: 'embed', attrs: { url: 'https://x.example/' } },
      { type: 'paragraph', content: [text('c')] },
    ]);
  });

  it('V-048 unit part: JSON that is no Tiptap document is a DataError', () => {
    const cases: unknown[] = [
      { root: { children: [], type: 'root' } },
      null,
      'doc',
      { type: 'doc', content: 'x' },
      { type: 'doc', content: [{ text: 'no type' }] },
      { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text' }] }] },
      {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a', marks: 'b' }] }],
      },
    ];
    for (const json of cases)
      expect(() => fromTiptapJson(json)).toThrow(expect.objectContaining({ name: 'DataError' }));
  });
});

describe('Tiptap addressing (uwg-te-req-engine-3)', () => {
  it('V-029: every text point maps to a position and back exactly', () => {
    const { doc } = headlessTiptap(sample());
    const points: TextEditorTextPoint[] = [];
    for (const [block, length] of [
      ['p1', 'Swell 🌊 at '.length + 4 + 1 + 4],
      ['h3', 5],
      ['q1', 'Fair'.length + 1 + 'winds'.length],
      ['c1', 'const knots = 12;\nreturn;'.length],
      ['o1', 4],
      ['t1', 'Check 🪢 lines'.length],
      ['b1', 4],
      ['p2', 0],
    ] as const)
      for (let offset = 0; offset <= length; offset += 1) points.push({ block, offset });
    for (const point of points) {
      const pos = pointToPos(doc, point, TIPTAP_MODULES.tables);
      expect(pos, JSON.stringify(point)).not.toBeNull();
      expect(posToPoint(doc, pos!, TIPTAP_MODULES.tables)).toEqual(point);
    }
    // A surrogate pair counts two units; a hard break counts one.
    const emoji = pointToPos(
      doc,
      { block: 'p1', offset: 'Swell 🌊'.length },
      TIPTAP_MODULES.tables,
    )!;
    expect(doc.textBetween(emoji - 2, emoji)).toBe('🌊');
    const afterBreak = pointToPos(doc, { block: 'q1', offset: 5 }, TIPTAP_MODULES.tables)!;
    expect(doc.textBetween(afterBreak, afterBreak + 5)).toBe('winds');
    // Offsets past the end and unknown blocks do not resolve.
    expect(pointToPos(doc, { block: 'h3', offset: 6 }, TIPTAP_MODULES.tables)).toBeNull();
    expect(pointToPos(doc, { block: 'zz', offset: 0 }, TIPTAP_MODULES.tables)).toBeNull();
    expect(pointToPos(doc, { block: 'd1', offset: 0 }, TIPTAP_MODULES.tables)).toBeNull();
  });

  it('V-029: cell points address the anchor cell of a span and its paragraph', () => {
    const { doc } = headlessTiptap(sample());
    const tables = TIPTAP_MODULES.tables;
    const north = { block: 'tb1', cell: { row: 1, column: 0, paragraph: 1 }, offset: 0 };
    const pos = pointToPos(doc, north, tables)!;
    expect(posToPoint(doc, pos, tables)).toEqual(north);
    // Row 2, column 0 lies under the row span of North: it maps to the anchor cell.
    const covered = pointToPos(
      doc,
      { ...north, cell: { row: 2, column: 0, paragraph: 1 } },
      tables,
    );
    expect(covered).toBe(pos);
    // Column 2 of row 0 lies under the column span of Depth.
    const depth = pointToPos(
      doc,
      { block: 'tb1', cell: { row: 0, column: 2, paragraph: 0 }, offset: 5 },
      tables,
    )!;
    expect(posToPoint(doc, depth, tables)).toEqual({
      block: 'tb1',
      cell: { row: 0, column: 1, paragraph: 0 },
      offset: 5,
    });
    expect(
      pointToPos(doc, { ...north, cell: { row: 1, column: 0, paragraph: 2 } }, tables),
    ).toBeNull();
    expect(
      pointToPos(doc, { ...north, cell: { row: 9, column: 0, paragraph: 0 } }, tables),
    ).toBeNull();
    const cell = { row: 1, column: 1, paragraph: 0 };
    const start = pointToPos(doc, { block: 'tb1', cell, offset: 0 }, tables)!;
    expect(rangeToPositions(doc, { block: 'tb1', cell, from: 0, to: 3 }, tables)).toEqual({
      from: start,
      to: start + 3,
    });
  });

  it('indexes holders: list items flattened with their parents, depths and indexes', () => {
    const { doc } = headlessTiptap(sample());
    expect(
      holderIndex(doc).list.map(({ id, parentId, depth, index }) => [id, parentId, depth, index]),
    ).toEqual([
      ['p1', null, 0, 0],
      ['h3', null, 0, 1],
      ['q1', null, 0, 2],
      ['c1', null, 0, 3],
      ['o1', null, 0, 4],
      ['t1', 'o1', 1, 0],
      ['b1', 't1', 2, 0],
      ['o2', null, 0, 5],
      ['d1', null, 0, 6],
      ['i1', null, 0, 7],
      ['tb1', null, 0, 8],
      ['p2', null, 0, 9],
    ]);
  });

  it('builds the block tree of a revision from the portable model', () => {
    const tree = blockTree(sample(), 4);
    expect(tree.version).toBe(4);
    expect(tree.roots).toEqual(['p1', 'h3', 'q1', 'c1', 'o1', 'o2', 'd1', 'i1', 'tb1', 'p2']);
    expect(tree.get('t1')).toMatchObject({
      kind: 'list-task',
      attrs: { checked: true, align: null },
      parentId: 'o1',
      depth: 1,
      index: 0,
      children: ['b1'],
      textblock: true,
    });
    expect(tree.get('tb1')).toMatchObject({
      kind: 'table',
      attrs: { rows: 3, columns: 3, headerRow: true, headerColumn: true },
      textblock: false,
    });
    expect(tree.get('p2')).toMatchObject({ empty: true, textblock: true });
  });
});

describe('Tiptap content through the shared glue (uwg-te-req-content-1, uwg-te-tab-engine r5)', () => {
  it('reads the initial content into the root and writes each portable format', () => {
    const { instance } = mountTiptap({
      content: html('<h2 data-id="h1">Log</h2><p data-id="p1">calm <strong>sea</strong></p>'),
    });
    expect(instance.getContent('html')).toBe(
      '<h2 data-id="h1">Log</h2>\n<p data-id="p1">calm <strong>sea</strong></p>',
    );
    expect(instance.getContent('markdown')).toBe('## Log\n\ncalm **sea**\n');
    expect(instance.getContent('text')).toBe('Log\n\ncalm sea');
    expect(instance.getContent('json')).toMatchObject({ type: 'doc' });
    expect(() => instance.getContent('rtf' as 'html')).toThrow(
      expect.objectContaining({ name: 'NotSupportedError' }),
    );
  });

  it('getContent limits each format to block subtrees, json through the adapter mapping', () => {
    const { instance } = mountTiptap({
      content: html(
        '<p data-id="p1">a</p><ul><li data-id="l1"><p>b</p><ul><li data-id="l2"><p>c</p></li></ul></li></ul><p data-id="p2">d</p>',
      ),
    });
    expect(instance.getContent('text', { blocks: ['l1'] })).toBe('b\nc');
    expect(instance.getContent('json', { blocks: ['p2'] })).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { id: 'p2', align: null },
          content: [{ type: 'text', text: 'd' }],
        },
      ],
    });
  });

  it('keeps the empty paragraph after a final table or atom block, which the formats omit', () => {
    const { instance } = mountTiptap({ content: html('<p data-id="p1">a</p><hr data-id="d1">') });
    const json = instance.getContent('json') as { content: { type: string }[] };
    expect(json.content.map((node) => node.type)).toEqual([
      'paragraph',
      'horizontalRule',
      'paragraph',
    ]);
    expect(instance.getContent('html')).toBe('<p data-id="p1">a</p>\n<hr data-id="d1">');
  });

  it('setContent reset replaces the content and clears the history; push adds one undo step', () => {
    const { instance, context } = mountTiptap({ content: html('<p data-id="p1">one</p>') });
    instance.setContent('<p data-id="p2">two</p>', 'html', {
      history: 'push',
      reason: 'imperative-action',
    });
    expect(instance.getContent('html')).toBe('<p data-id="p2">two</p>');
    expect(instance.getState().history.undo).toBe(true);
    expect(context.changes.at(-1)).toEqual({ cause: 'content', reason: 'imperative-action' });
    instance.setContent('<p data-id="p3">three</p>', 'html', { history: 'push' });
    expect(instance.execute([{ type: 'history.undo' }], { reason: 'hotkey' })).toBe(true);
    expect(instance.getContent('html')).toBe('<p data-id="p2">two</p>');
    instance.setContent('four', 'text');
    expect(instance.getContent('text')).toBe('four');
    expect(instance.getState().history).toEqual({ undo: false, redo: false });
    expect(context.changes.at(-1)).toEqual({ cause: 'content', reason: 'engine' });
    const versions = instance.getState();
    // Equal content notifies state only.
    instance.setContent(instance.getContent('json'), 'json');
    expect(context.calls.at(-1)).not.toBe('content');
    expect(instance.getState().contentVersion).toBe(versions.contentVersion);
  });

  it('V-048 unit part: foreign and malformed JSON reject with DataError, an unknown format with NotSupportedError, content unchanged', () => {
    const { instance, context } = mountTiptap({ content: html('<p data-id="p1">keel</p>') });
    const before = instance.getContent('html');
    const calls = context.calls.length;
    expect(() => instance.setContent({ root: { children: [] } }, 'json')).toThrow(
      expect.objectContaining({ name: 'DataError' }),
    );
    expect(() => instance.setContent('{bad', 'json')).toThrow(
      expect.objectContaining({ name: 'DataError' }),
    );
    expect(() => instance.setContent('x', 'rtf' as 'html')).toThrow(
      expect.objectContaining({ name: 'NotSupportedError' }),
    );
    expect(instance.getContent('html')).toBe(before);
    expect(context.calls.length).toBe(calls);
  });

  it('a snapshot serializes its revision lazily, also after later changes', () => {
    const { instance } = mountTiptap({ content: html('<p data-id="p1">mast</p>') });
    const snapshot = instance.snapshot();
    expect([snapshot.revision, snapshot.empty]).toEqual([1, false]);
    instance.setContent('', 'text', { history: 'push' });
    expect(snapshot.getContent('html')).toBe('<p data-id="p1">mast</p>');
    expect(instance.snapshot()).toMatchObject({ revision: 2, empty: true });
    expect(snapshot.getContent('json')).toMatchObject({ type: 'doc' });
  });

  it('reports the diagnostics of a load once the content applied', () => {
    const { context } = mountTiptap({
      content: html('<p data-id="same">a</p><p data-id="same">b</p>'),
      tables: false,
    });
    expect(context.calls).toEqual(['diagnostic:text-editor-block-id', 'ready']);
    const converted = mountTiptap({
      content: html('<table><tbody><tr><td>c</td></tr></tbody></table>'),
      tables: false,
    });
    expect(converted.context.diagnostics.map((entry) => entry.code)).toEqual([
      'text-editor-content-converted',
    ]);
  });
});

describe('Tiptap corpus round trip (uwg-te-req-content-1, uwg-te-req-engine-12)', () => {
  it.each(CORPUS_ENTRIES)(
    '$name: the corpus through the engine and back equals the converters output',
    (entry) => {
      const golden = corpusGolden(`${entry.name}.html`);
      const { instance } = mountTiptap({ nodes: entry.nodes ?? [], content: html(golden) });
      expect(instance.getContent('html')).toBe(golden);
      expect(instance.getContent('markdown')).toBe(corpusFile(`${entry.name}.md`));
      expect(instance.getContent('text')).toBe(corpusGolden(`${entry.name}.txt`));
      // The native JSON maps back to the same content.
      const json = instance.getContent('json');
      instance.setContent(json, 'json', { history: 'push' });
      expect(instance.getContent('html')).toBe(golden);
    },
  );
});

describe('uwg-te-req-blocks-4: the block holding a position', () => {
  it("a holder's end position is exclusive", () => {
    const { doc } = headlessTiptap({
      blocks: [
        {
          type: 'list-bullet',
          id: 'a',
          content: [{ type: 'text', text: 'one' }],
          children: [{ type: 'list-bullet', id: 'c', content: [{ type: 'text', text: 'two' }] }],
        },
        { type: 'divider', id: 'd1' },
        { type: 'paragraph', id: 'p2', content: [] },
      ],
    });
    const { byId } = holderIndex(doc);
    const nested = byId.get('c')!;
    expect(holderAtPos(doc, nested.pos + nested.node.nodeSize)?.id).toBe('a');
    const divider = byId.get('d1')!;
    expect(holderAtPos(doc, divider.pos)?.id).toBe('d1');
    expect(holderAtPos(doc, divider.pos + divider.node.nodeSize)?.id).toBe('p2');
  });
});
