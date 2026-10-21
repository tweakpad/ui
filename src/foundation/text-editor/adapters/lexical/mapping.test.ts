/**
 * The pure mapper between Lexical's native JSON and the portable model, and text points
 * (Widgets `uwg-te-req-content-1`, `uwg-te-req-engine-3`, `uwg-te-req-content-2`).
 */
import * as lexical from 'lexical';
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_DOCUMENTS,
  CORPUS_ENTRIES,
  corpusFile,
  corpusGolden,
  corpusNodes,
} from '../../content/corpus.test.js';
import { canonicalize } from '../../content/portable.js';
import {
  $tablePlacement,
  $pointOfText,
  $textblockOf,
  $textblockLength,
  $textPointOf,
} from './points.js';
import { headlessLexical } from './lexical-stubs.test.js';
import {
  LEXICAL_FORMAT,
  LEXICAL_HEADER,
  lexicalToPortable,
  portableToLexical,
  type LexicalJsonNode,
} from './mapping.js';
import type { LexicalElementLike } from './modules.js';
import { $selectText } from './selection.js';

const text = (value: string, extra: Record<string, unknown> = {}) => ({
  type: 'text',
  version: 1,
  text: value,
  ...extra,
});
const node = (type: string, extra: Record<string, unknown> = {}) => ({
  type,
  version: 1,
  ...extra,
});
const state = (children: unknown[]) => ({ root: node('root', { children }) });

describe('uwg-te-req-content-1: native JSON to the portable model', () => {
  it('maps every block kind, marks in format bits, colors in NodeState and drops link attributes', () => {
    const json = state([
      node('paragraph', {
        format: 'center',
        $: { 'tp-id': 'p1' },
        children: [
          text('bold', {
            format: LEXICAL_FORMAT.bold | LEXICAL_FORMAT.italic,
            $: { 'tp-color': 'blue' },
          }),
          text('mark', { format: LEXICAL_FORMAT.highlight, $: { 'tp-highlight': 'green' } }),
          text('plain mark', { format: LEXICAL_FORMAT.highlight }),
          node('link', {
            url: 'https://harbor.example/',
            target: '_blank',
            rel: 'noopener',
            title: 'Harbor',
            children: [text('dock', { format: LEXICAL_FORMAT.code })],
          }),
          node('linebreak'),
          node('tp-inline-mention', { attrs: { person: 'ana', label: 'Ana' } }),
        ],
      }),
      node('heading', { tag: 'h3', $: { 'tp-id': 'h1' }, children: [text('Tides')] }),
      node('quote', {
        $: { 'tp-id': 'q1' },
        children: [text('one'), node('linebreak'), text('two')],
      }),
      node('code', {
        language: 'ts',
        $: { 'tp-id': 'c1' },
        children: [
          text('let a'),
          node('linebreak'),
          node('tab', { text: '\t' }),
          node('code-highlight', { text: 'b' }),
        ],
      }),
      node('list', {
        listType: 'number',
        start: 3,
        children: [
          node('listitem', { $: { 'tp-id': 'o1' }, children: [text('first')] }),
          node('listitem', {
            children: [
              node('list', {
                listType: 'check',
                children: [
                  node('listitem', {
                    checked: true,
                    $: { 'tp-id': 't1' },
                    children: [text('done')],
                  }),
                ],
              }),
            ],
          }),
          node('listitem', { $: { 'tp-id': 'o2' }, children: [text('second')] }),
        ],
      }),
      node('horizontalrule', { $: { 'tp-id': 'd1' } }),
      node('tp-image', {
        src: 'https://harbor.example/buoy.png',
        alt: 'Buoy',
        width: 120,
        $: { 'tp-id': 'i1' },
      }),
      node('table', {
        colWidths: [80, 90],
        $: { 'tp-id': 'tb1' },
        children: [
          node('tablerow', {
            children: [
              node('tablecell', {
                headerState: LEXICAL_HEADER.both,
                colSpan: 2,
                children: [node('paragraph', { children: [text('Pier')] })],
              }),
            ],
          }),
          node('tablerow', {
            children: [
              node('tablecell', {
                headerState: LEXICAL_HEADER.column,
                $: { 'tp-background': 'green' },
                children: [
                  node('paragraph', { format: 'end', children: [text('North')] }),
                  node('paragraph', { children: [] }),
                ],
              }),
              node('tablecell', {
                headerState: 0,
                children: [node('paragraph', { children: [text('4 m')] })],
              }),
            ],
          }),
        ],
      }),
      node('tp-block-callout', {
        attrs: { tone: 'tip' },
        $: { 'tp-id': 'k1' },
        children: [text('Note')],
      }),
    ]);
    const { document } = canonicalize(lexicalToPortable(json), { nodes: corpusNodes });
    expect(document.blocks).toEqual([
      {
        type: 'paragraph',
        id: 'p1',
        align: 'center',
        content: [
          { type: 'text', text: 'bold', marks: { textColor: 'blue', bold: true, italic: true } },
          { type: 'text', text: 'mark', marks: { highlight: 'green' } },
          { type: 'text', text: 'plain mark', marks: { highlight: 'yellow' } },
          { type: 'text', text: 'dock', marks: { link: 'https://harbor.example/', code: true } },
          { type: 'hard-break' },
          { type: 'custom', name: 'mention', attrs: { person: 'ana', label: 'Ana' } },
        ],
      },
      { type: 'heading', id: 'h1', level: 3, content: [{ type: 'text', text: 'Tides' }] },
      {
        type: 'quote',
        id: 'q1',
        content: [
          { type: 'text', text: 'one' },
          { type: 'hard-break' },
          { type: 'text', text: 'two' },
        ],
      },
      { type: 'code', id: 'c1', language: 'ts', text: 'let a\n\tb' },
      {
        type: 'list-ordered',
        id: 'o1',
        start: 3,
        content: [{ type: 'text', text: 'first' }],
        children: [
          {
            type: 'list-task',
            id: 't1',
            checked: true,
            content: [{ type: 'text', text: 'done' }],
            children: [],
          },
        ],
      },
      { type: 'list-ordered', id: 'o2', content: [{ type: 'text', text: 'second' }], children: [] },
      { type: 'divider', id: 'd1' },
      { type: 'image', id: 'i1', src: 'https://harbor.example/buoy.png', alt: 'Buoy', width: 120 },
      {
        type: 'table',
        id: 'tb1',
        headerRow: true,
        headerColumn: true,
        widths: [80, 90],
        rows: [
          { cells: [{ colSpan: 2, paragraphs: [{ content: [{ type: 'text', text: 'Pier' }] }] }] },
          {
            cells: [
              {
                background: 'green',
                align: 'end',
                paragraphs: [{ content: [{ type: 'text', text: 'North' }] }, { content: [] }],
              },
              { paragraphs: [{ content: [{ type: 'text', text: '4 m' }] }] },
            ],
          },
        ],
      },
      {
        type: 'custom',
        id: 'k1',
        name: 'callout',
        attrs: { tone: 'tip' },
        content: [{ type: 'text', text: 'Note' }],
      },
    ]);
  });

  it('a wrapper item without a previous item gives its items to the list', () => {
    const json = state([
      node('list', {
        listType: 'bullet',
        children: [
          node('listitem', {
            children: [
              node('list', {
                listType: 'bullet',
                children: [node('listitem', { children: [text('x')] })],
              }),
            ],
          }),
        ],
      }),
    ]);
    expect(lexicalToPortable(json).blocks).toMatchObject([
      { type: 'list-bullet', content: [{ type: 'text', text: 'x' }] },
    ]);
  });

  it('V-048: foreign or malformed JSON is a DataError', () => {
    const cases: unknown[] = [
      null,
      'root',
      [],
      { type: 'doc', content: [{ type: 'paragraph' }] },
      { root: { type: 'paragraph', children: [] } },
      { root: { type: 'root' } },
      { root: { type: 'root', children: [3] } },
      { root: { type: 'root', children: [{ type: 'paragraph', children: 'x' }] } },
    ];
    for (const value of cases)
      expect(() => lexicalToPortable(value), JSON.stringify(value)).toThrow(
        expect.objectContaining({ name: 'DataError' }),
      );
  });
});

describe('uwg-te-req-content-1: the portable model to native JSON', () => {
  it('writes lists with wrapper items, positional header bits and states', () => {
    const { document } = canonicalize({
      blocks: [
        {
          type: 'list-bullet',
          id: 'b1',
          content: [
            { type: 'text', text: 'a', marks: { textColor: 'red', highlight: 'blue', bold: true } },
          ],
          children: [{ type: 'list-task', id: 't1', checked: false, content: [], children: [] }],
        },
        {
          type: 'table',
          id: 'tb1',
          headerRow: false,
          headerColumn: true,
          rows: [
            {
              cells: [
                { paragraphs: [{ content: [] }] },
                { background: 'pink', paragraphs: [{ content: [] }] },
              ],
            },
          ],
        },
      ],
    });
    const json = portableToLexical(document);
    const [list, table] = json.root['children'] as LexicalJsonNode[];
    expect(list).toMatchObject({
      type: 'list',
      listType: 'bullet',
      children: [
        {
          type: 'listitem',
          $: { 'tp-id': 'b1' },
          children: [
            {
              type: 'text',
              text: 'a',
              format: LEXICAL_FORMAT.bold | LEXICAL_FORMAT.highlight,
              $: { 'tp-color': 'red', 'tp-highlight': 'blue' },
            },
          ],
        },
        {
          type: 'listitem',
          children: [
            { type: 'list', listType: 'check', children: [{ type: 'listitem', checked: false }] },
          ],
        },
      ],
    });
    expect(table).toMatchObject({
      type: 'table',
      $: { 'tp-id': 'tb1' },
      children: [
        {
          children: [
            { headerState: LEXICAL_HEADER.column },
            { headerState: 0, backgroundColor: null, $: { 'tp-background': 'pink' } },
          ],
        },
      ],
    });
    expect(lexicalToPortable(json)).toMatchObject({ blocks: document.blocks });
  });
});

describe('uwg-te-req-content-1: corpus round trips through the engine', () => {
  it.each(CORPUS_ENTRIES)(
    "$name: HTML, Markdown and text through the Lexical editor equal the converters'",
    (entry) => {
      const html = corpusGolden(`${entry.name}.html`);
      const { instance, recording } = headlessLexical({ html, nodes: entry.nodes ?? [] });
      expect(recording.of('error')).toEqual([]);
      expect(instance.getContent('html')).toBe(html);
      expect(instance.getContent('markdown')).toBe(corpusFile(`${entry.name}.md`));
      expect(instance.getContent('text')).toBe(corpusGolden(`${entry.name}.txt`));
      // Native JSON back in gives the same document.
      const native = instance.getContent('json');
      const again = headlessLexical({
        initialContent: { content: native, format: 'json' },
        nodes: entry.nodes ?? [],
      });
      expect(again.instance.getContent('html')).toBe(html);
    },
  );

  it.each(CANONICAL_DOCUMENTS)('$name.html loads and writes back unchanged', (entry) => {
    const html = corpusGolden(`${entry.name}.html`);
    const { instance, recording } = headlessLexical({ html, nodes: entry.nodes ?? [] });
    expect(recording.of('diagnostic')).toEqual([]);
    expect(instance.getContent('html')).toBe(html);
  });
});

describe('uwg-te-req-engine-3: text points', () => {
  const html = [
    '<p data-id="p1">a😀b<br>c<span data-type="mention" data-person="ana" data-label="Ana">@Ana</span>d</p>',
    '<ul><li data-id="l1"><p>one <a href="https://x.example/">two</a> three</p><ul><li data-id="l2"><p>deep</p></li></ul></li></ul>',
    '<table data-id="t1"><tbody><tr><th colspan="2"><p>wide</p></th></tr><tr><td><p>x</p><p>y😀</p></td><td><p>z</p></td></tr></tbody></table>',
    '<p data-id="p2"></p>',
  ].join('');

  it('V-029: every offset of every textblock maps to a Lexical point and back', () => {
    const { editor, rt } = headlessLexical({ html, nodes: corpusNodes });
    editor.read(() => {
      const points = [
        { block: 'p1' },
        { block: 'l1' },
        { block: 'l2' },
        { block: 'p2' },
        { block: 't1', cell: { row: 0, column: 0, paragraph: 0 } },
        { block: 't1', cell: { row: 1, column: 0, paragraph: 1 } },
        { block: 't1', cell: { row: 1, column: 1, paragraph: 0 } },
      ];
      const lengths: number[] = [];
      for (const point of points) {
        const block = $textblockOf(rt, point)!;
        const length = $textblockLength(rt, block);
        lengths.push(length);
        for (let offset = 0; offset <= length; offset += 1)
          for (const bias of ['backward', 'forward'] as const) {
            const spec = $pointOfText(rt, { ...point, offset }, bias)!;
            const selection = lexical.$createRangeSelection();
            selection.anchor.set(spec.key, spec.offset, spec.type);
            expect(
              $textPointOf(rt, selection.anchor),
              `${JSON.stringify(point)}@${offset}/${bias}`,
            ).toEqual({ ...point, offset });
          }
        expect($pointOfText(rt, { ...point, offset: length + 1 })).toBeNull();
      }
      // A surrogate pair counts 2, a hard break and an inline node 1 each.
      expect(lengths).toEqual([8, 13, 4, 0, 4, 3, 1]);
    });
  });

  it('V-029: a covered cell maps to its anchor', () => {
    const { editor, rt } = headlessLexical({ html });
    editor.update(
      () => {
        expect(
          $selectText(rt, { block: 't1', cell: { row: 0, column: 1, paragraph: 0 }, offset: 2 }),
        ).toBe(true);
        const selection = lexical.$getSelection();
        if (!lexical.$isRangeSelection(selection)) throw new Error('no range');
        expect($textPointOf(rt, selection.anchor)).toEqual({
          block: 't1',
          cell: { row: 0, column: 0, paragraph: 0 },
          offset: 2,
        });
        const table = $textblockOf(rt, { block: 't1', cell: { row: 0, column: 0 } })!
          .getParent()!
          .getParent()!
          .getParent() as LexicalElementLike;
        const placement = $tablePlacement(rt, table);
        expect(placement.at(0, 1)?.is(placement.at(0, 0))).toBe(true);
        expect([placement.rows, placement.columns]).toEqual([2, 2]);
      },
      { discrete: true },
    );
  });
});
