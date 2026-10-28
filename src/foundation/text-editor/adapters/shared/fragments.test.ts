/**
 * The portable fragment of a selection (Widgets `uwg-te-req-content-6`, `uwg-te-req-engine-4`;
 * `uwg-te-req-engine-11`).
 */
import { describe, expect, it } from 'vitest';
import { htmlSource } from '../../content/html-source.test.js';
import { importHtml, serializeHtml, writeClipboardHtml } from '../../content/html.js';
import type { TextEditorPortableDocument } from '../../content/portable.js';
import {
  blocksFragment,
  cellsFragment,
  clipboardPayload,
  documentFragment,
  rangeFragment,
  selectionFragment,
} from './fragments.js';
import { writeText } from '../../content/text.js';

const read = (html: string): TextEditorPortableDocument => importHtml(htmlSource(html)).document;
const write = (blocks: TextEditorPortableDocument['blocks'] | undefined) =>
  blocks ? serializeHtml({ blocks }) : 'null';

describe('uwg-te-req-content-6: the fragment of a text selection', () => {
  it('one textblock gives that block with the selected text, in either order', () => {
    const doc = read('<h2 data-id="h1">calm sea</h2>');
    const forward = rangeFragment(doc, { block: 'h1', offset: 2 }, { block: 'h1', offset: 6 });
    expect(forward?.kind).toBe('range');
    expect(write(forward?.blocks)).toBe('<h2 data-id="h1">lm s</h2>');
    expect(rangeFragment(doc, { block: 'h1', offset: 6 }, { block: 'h1', offset: 2 })).toEqual(
      forward,
    );
  });

  it('several blocks: the outer two trimmed, list items nested as far as their parents are selected', () => {
    const doc = read(
      '<p data-id="p1">alpha</p><ul><li data-id="a"><p>one</p><ul><li data-id="b"><p>two</p></li><li data-id="c"><p>three</p></li></ul></li></ul><p data-id="p2">omega</p>',
    );
    const toB = rangeFragment(doc, { block: 'p1', offset: 3 }, { block: 'b', offset: 1 });
    expect(write(toB?.blocks)).toBe(
      '<p data-id="p1">ha</p>\n<ul><li data-id="a"><p>one</p><ul><li data-id="b"><p>t</p></li></ul></li></ul>',
    );
    const fromC = rangeFragment(doc, { block: 'p2', offset: 2 }, { block: 'c', offset: 2 });
    expect(write(fromC?.blocks)).toBe(
      '<ul><li data-id="c"><p>ree</p></li></ul>\n<p data-id="p2">om</p>',
    );
    expect(rangeFragment(doc, { block: 'zz', offset: 0 }, { block: 'p2', offset: 0 })).toBeNull();
  });

  it('text in one cell paragraph gives a paragraph; a code block gives its text', () => {
    const doc = read(
      '<table data-id="t1"><tbody><tr><td><p>ab</p><p>cdef</p></td></tr></tbody></table><pre data-id="c1"><code>x\ny</code></pre>',
    );
    const cell = { row: 0, column: 0, paragraph: 1 };
    expect(
      rangeFragment(doc, { block: 't1', cell, offset: 1 }, { block: 't1', cell, offset: 3 })
        ?.blocks,
    ).toEqual([{ type: 'paragraph', content: [{ type: 'text', text: 'de' }] }]);
    expect(
      rangeFragment(doc, { block: 'c1', offset: 0 }, { block: 'c1', offset: 3 })?.blocks,
    ).toEqual([{ type: 'code', id: 'c1', text: 'x\ny' }]);
  });
});

describe('uwg-te-req-content-6: block, cell and whole-document fragments', () => {
  it('a block selection copies its blocks with their nested items', () => {
    const doc = read(
      '<ul><li data-id="a"><p>one</p><ul><li data-id="b"><p>two</p></li></ul></li></ul><hr data-id="d1">',
    );
    const fragment = blocksFragment(doc, ['a', 'd1']);
    expect(fragment.kind).toBe('blocks');
    expect(writeClipboardHtml(fragment)).toBe(
      '<div data-text-editor-fragment="blocks"><ul><li data-id="a"><p>one</p><ul><li data-id="b"><p>two</p></li></ul></li></ul><hr data-id="d1"></div>',
    );
  });

  it('a cell range copies a table of its rectangle, grown over merged cells', () => {
    const doc = read(
      '<table data-id="t1"><thead><tr><th><p>h0</p></th><th><p>h1</p></th><th><p>h2</p></th></tr></thead><tbody><tr><td colspan="2"><p>wide</p></td><td data-background="blue"><p>c</p></td></tr></tbody></table>',
    );
    const table = doc.blocks[0]!;
    if (table.type !== 'table' || !table.id) throw new Error('no table');
    const fragment = cellsFragment(
      { ...table, id: table.id },
      { anchor: { row: 1, column: 1 }, head: { row: 1, column: 2 } },
    );
    expect(fragment?.kind).toBe('blocks');
    const copy = fragment?.blocks[0];
    expect(copy).toMatchObject({ type: 'table', headerRow: false, headerColumn: false });
    expect(copy?.type === 'table' && copy.rows).toEqual([
      {
        cells: [
          { colSpan: 2, paragraphs: [{ content: [{ type: 'text', text: 'wide' }] }] },
          { background: 'blue', paragraphs: [{ content: [{ type: 'text', text: 'c' }] }] },
        ],
      },
    ]);
    const header = cellsFragment(
      { ...table, id: table.id },
      { anchor: { row: 0, column: 0 }, head: { row: 0, column: 0 } },
    );
    expect(header?.blocks[0]).toMatchObject({ headerRow: true, rows: [{ cells: [{}] }] });
  });

  it('a whole-document selection copies every written block as a text range', () => {
    const doc = read('<p data-id="p1">a</p><hr data-id="d1"><p data-id="e1"></p>');
    expect(documentFragment(doc)).toEqual({ kind: 'range', blocks: doc.blocks.slice(0, 2) });
  });
});

describe('uwg-te-req-content-6: the fragment and clipboard payload of the selection', () => {
  const doc = read(
    '<p data-id="p1">alpha</p><table data-id="t1"><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr></tbody></table><p data-id="p2">omega</p>',
  );
  const at = (block: string, offset: number) => ({ block, offset });

  it('a text selection gives its range, a caret nothing; blocks, cells and the whole document theirs', () => {
    const text = { kind: 'text', anchor: at('p1', 1), head: at('p2', 2), empty: false } as const;
    expect(selectionFragment(doc, text, false)).toEqual(rangeFragment(doc, text.anchor, text.head));
    const caret = { kind: 'text', anchor: at('p1', 1), head: at('p1', 1), empty: true } as const;
    expect(selectionFragment(doc, caret, false)).toBeNull();
    expect(selectionFragment(doc, { kind: 'blocks', ids: ['p2'] }, false)).toEqual(
      blocksFragment(doc, ['p2']),
    );
    const range = { anchor: { row: 0, column: 1 }, head: { row: 0, column: 1 } };
    const table = doc.blocks[1]!;
    expect(selectionFragment(doc, { kind: 'cells', table: 't1', range }, false)).toEqual(
      table.type === 'table' ? cellsFragment({ ...table, id: 't1' }, range) : null,
    );
    expect(selectionFragment(doc, { kind: 'cells', table: 'p1', range }, false)).toBeNull();
    expect(selectionFragment(doc, { kind: 'none' }, false)).toBeNull();
    expect(selectionFragment(doc, caret, true)).toEqual(documentFragment(doc));
  });

  it('the payload is the clipboard HTML and the text of the fragment, nothing for none', () => {
    const fragment = blocksFragment(doc, ['p1', 'p2']);
    expect(clipboardPayload(fragment, [])).toEqual({
      html: writeClipboardHtml(fragment, { nodes: [] }),
      text: writeText({ blocks: fragment.blocks }, { nodes: [] }),
    });
    expect(clipboardPayload(null, [])).toBeNull();
    expect(clipboardPayload({ kind: 'range', blocks: [] }, [])).toBeNull();
  });
});
