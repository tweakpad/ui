/**
 * `content.insert` over the portable model (Widgets `uwg-te-tab-actions` r5,
 * `uwg-te-req-content-6`, `uwg-te-req-content-7`).
 */
import { describe, expect, it } from 'vitest';
import { BASE_CAPABILITIES } from '../../capabilities.js';
import type { TextEditorPortableFragment } from '../../content/portable.js';
import { selectionAfterBlock } from './structure-edits.js';
import {
  cellParagraphs,
  insertFragmentAtPoint,
  prepareFragment,
  replaceBlocksWithFragment,
} from './fragment-insert.js';
import { corpusNodes, editContext, readHtml, textRun, writeHtml } from './test-helpers.test.js';

describe('uwg-te-tab-actions r5, uwg-te-req-content-6: content.insert of a fragment', () => {
  const text = (value: string) => ({ type: 'text' as const, text: value });

  it('a text range merges its first and last paragraphs into the surrounding text', () => {
    const fragment: TextEditorPortableFragment = {
      kind: 'range',
      blocks: [
        { type: 'paragraph', content: [text('deep ')] },
        { type: 'heading', level: 2, content: [text('Tides')] },
        { type: 'paragraph', content: [text('blue ')] },
      ],
    };
    const result = insertFragmentAtPoint(
      readHtml('<p data-id="p1">calm sea</p>'),
      { block: 'p1', offset: 5 },
      fragment,
      editContext(),
    );
    expect(writeHtml(result?.document).replace(/data-id="new\d+"/g, 'ID')).toBe(
      '<p data-id="p1">calm deep&nbsp;</p>\n<h2 ID>Tides</h2>\n<p ID>blue sea</p>',
    );
    expect(result?.caret).toEqual({ block: result!.document.blocks[2]!.id, offset: 5 });
  });

  it('whole blocks follow the block or replace an empty one; a code block takes the text', () => {
    const blocks: TextEditorPortableFragment = {
      kind: 'blocks',
      blocks: [{ type: 'divider', id: 'p1' }],
    };
    const doc = readHtml(
      '<p data-id="p1">a</p><p data-id="e1"></p><pre data-id="c1"><code>xy</code></pre>',
    );
    expect(
      writeHtml(
        insertFragmentAtPoint(doc, { block: 'p1', offset: 1 }, blocks, editContext())?.document,
      ),
    ).toContain('<p data-id="p1">a</p>\n<hr data-id="new001">\n<p data-id="e1"></p>');
    expect(
      writeHtml(
        insertFragmentAtPoint(doc, { block: 'e1', offset: 0 }, blocks, editContext())?.document,
      ),
    ).toContain('<p data-id="p1">a</p>\n<hr data-id="new001">\n<pre');
    const lines: TextEditorPortableFragment = {
      kind: 'range',
      blocks: [
        { type: 'paragraph', content: [text('1')] },
        { type: 'paragraph', content: [text('2')] },
      ],
    };
    expect(
      writeHtml(
        insertFragmentAtPoint(doc, { block: 'c1', offset: 1 }, lines, editContext())?.document,
      ),
    ).toContain('<pre data-id="c1"><code>x1\n2y</code></pre>');
    expect(insertFragmentAtPoint(doc, { block: 'p1', offset: 9 }, lines, editContext())).toBeNull();
  });

  it('a fragment is filtered by the URL policy as a load is: javascript: links and images', () => {
    const fragment: TextEditorPortableFragment = {
      kind: 'blocks',
      blocks: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'click', marks: { link: 'javascript:alert(1)', bold: true } },
          ],
        },
        { type: 'image', src: 'javascript:alert(2)', alt: 'Trap' },
        { type: 'image', src: 'https://x.example/ok.png', alt: 'Ok' },
      ],
    };
    expect(prepareFragment(fragment, editContext()).blocks).toMatchObject([
      { type: 'paragraph', content: [{ type: 'text', text: 'click', marks: { bold: true } }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Trap' }] },
      { type: 'image', src: 'https://x.example/ok.png' },
    ]);
    const result = insertFragmentAtPoint(
      readHtml('<p data-id="p1">a</p>'),
      { block: 'p1', offset: 1 },
      fragment,
      editContext(),
    );
    expect(writeHtml(result?.document)).not.toMatch(/javascript:/);
    expect(cellParagraphs(prepareFragment(fragment, editContext()).blocks, editContext())).toEqual([
      { content: [{ type: 'text', text: 'click', marks: { bold: true } }] },
      { content: [{ type: 'text', text: 'Trap' }] },
      { content: [{ type: 'text', text: 'Ok' }] },
    ]);
  });

  it('kinds the mount cannot represent are converted first, with one converted diagnostic', () => {
    const fragment: TextEditorPortableFragment = {
      kind: 'blocks',
      blocks: [
        {
          type: 'table',
          headerRow: false,
          headerColumn: false,
          rows: [{ cells: [{ paragraphs: [{ content: [text('cell')] }] }] }],
        },
        { type: 'paragraph', content: [text('tail')] },
      ],
    };
    const reduced = editContext(corpusNodes, BASE_CAPABILITIES);
    const prepared = prepareFragment(fragment, reduced);
    expect(prepared.blocks.map((block) => block.type)).toEqual(['paragraph', 'paragraph']);
    expect(prepared.diagnostics).toEqual([
      expect.objectContaining({ code: 'text-editor-content-converted' }),
    ]);
    const result = insertFragmentAtPoint(
      readHtml('<p data-id="p1">a</p>'),
      { block: 'p1', offset: 1 },
      fragment,
      editContext(corpusNodes, BASE_CAPABILITIES),
    );
    expect(writeHtml(result?.document)).not.toContain('<table');
    expect(result?.diagnostics).toHaveLength(1);
    // With tables the same fragment keeps its table and reports nothing.
    const full = insertFragmentAtPoint(
      readHtml('<p data-id="p1">a</p>'),
      { block: 'p1', offset: 1 },
      fragment,
      editContext(),
    );
    expect(writeHtml(full?.document)).toContain('<table');
    expect(full?.diagnostics).toEqual([]);
  });

  it('the selection after inserted blocks: caret at the end, an atom block-selected', () => {
    const doc = readHtml('<p data-id="p1">a</p><p data-id="p2">bc</p>');
    const divider: TextEditorPortableFragment = { kind: 'blocks', blocks: [{ type: 'divider' }] };
    const atom = insertFragmentAtPoint(doc, { block: 'p1', offset: 1 }, divider, editContext());
    expect(atom?.selection).toEqual({ kind: 'blocks', ids: ['new001'] });
    const last = replaceBlocksWithFragment(doc, ['p1', 'p2'], divider, editContext());
    expect(last?.selection).toEqual({ kind: 'blocks', ids: ['new001'] });
    const paragraph: TextEditorPortableFragment = {
      kind: 'blocks',
      blocks: [{ type: 'paragraph', content: [text('x')] }],
    };
    // Over a block selection the fragment replaces the selected blocks.
    const over = replaceBlocksWithFragment(doc, ['p1'], paragraph, editContext());
    expect(writeHtml(over?.document)).toBe('<p data-id="new001">x</p>\n<p data-id="p2">bc</p>');
    expect(over?.selection).toEqual({ kind: 'caret', block: 'new001', position: 'end' });
    const list = readHtml(
      '<ul><li data-id="l1"><p>a</p><ul><li data-id="l2"><p>b</p></li></ul></li></ul><p data-id="p3">c</p>',
    );
    expect(
      writeHtml(replaceBlocksWithFragment(list, ['l1', 'p3'], paragraph, editContext())?.document),
    ).toBe('<p data-id="new001">x</p>');
    expect(replaceBlocksWithFragment(doc, [], paragraph, editContext())).toBeNull();
    const table = readHtml(
      '<table data-id="t1"><tbody><tr><td><p>a</p></td><td colspan="2"><p>b</p></td></tr></tbody></table>',
    );
    expect(selectionAfterBlock(table, 't1')).toEqual({
      kind: 'caret',
      block: 't1',
      cell: { row: 0, column: 1 },
      position: 'end',
    });
  });
});

describe('uwg-te-req-content-7: identifiers of a block split by a pasted range', () => {
  it('at offset 0 the part holding the first character keeps the identifier', () => {
    const doc = readHtml('<p data-id="p1">Hello</p>');
    const range: TextEditorPortableFragment = {
      kind: 'range',
      blocks: [
        { type: 'paragraph', content: [textRun('A')] },
        { type: 'paragraph', content: [textRun('B')] },
      ],
    };
    const atStart = insertFragmentAtPoint(doc, { block: 'p1', offset: 0 }, range, editContext());
    expect(writeHtml(atStart?.document)).toBe(
      '<p data-id="new003">A</p>\n<p data-id="p1">BHello</p>',
    );
    expect(atStart?.caret).toEqual({ block: 'p1', offset: 1 });
    expect(atStart?.selection).toEqual({ kind: 'text', anchor: { block: 'p1', offset: 1 } });
    // Away from the start, the head part holds the first character and keeps the identifier.
    const inside = insertFragmentAtPoint(doc, { block: 'p1', offset: 2 }, range, editContext());
    expect(writeHtml(inside?.document)).toBe(
      '<p data-id="p1">HeA</p>\n<p data-id="new003">Bllo</p>',
    );
    // An empty block: the first part keeps it.
    const empty = insertFragmentAtPoint(
      readHtml('<p data-id="p1"></p>'),
      { block: 'p1', offset: 0 },
      range,
      editContext(),
    );
    expect(writeHtml(empty?.document)).toBe('<p data-id="p1">A</p>\n<p data-id="new003">B</p>');
  });
});
