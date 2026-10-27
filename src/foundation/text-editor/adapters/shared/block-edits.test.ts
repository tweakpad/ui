/**
 * Block edits over the portable model (Widgets `uwg-te-tab-actions` r2, `uwg-te-req-blocks-1`,
 * `uwg-te-req-parity-1`, `uwg-te-req-key-3`, `uwg-te-tab-input-rules`).
 */
import { describe, expect, it, vi } from 'vitest';
import type * as Portable from '../../content/portable.js';
import { canonicalize, type TextEditorPortableDocument } from '../../content/portable.js';
import {
  applyBlockRule,
  indentItems,
  listTab,
  outdentItems,
  planAlign,
  planBlockType,
  setBlockAttrs,
  setBlockType,
  textblockTargets,
  touchedItems,
} from './block-edits.js';
import {
  editContext,
  NESTED_LIST,
  readHtml,
  ROW_SPAN_TABLE,
  writeHtml,
} from './test-helpers.test.js';

/** The aligned document, or `null` when no block takes the alignment. */
const alignBlocks: (...args: Parameters<typeof planAlign>) => TextEditorPortableDocument | null = (
  ...args
) => planAlign(...args)?.build() ?? null;

// Counts canonicalizations; the edits behave as with the original.
vi.mock('../../content/portable.js', async (importOriginal) => {
  const original = await importOriginal<typeof Portable>();
  return { ...original, canonicalize: vi.fn(original.canonicalize) };
});

describe('uwg-te-req-perf-1: planned block edits', () => {
  it('V-588: a plan settles whether set-type and align apply without canonicalizing, and builds once', () => {
    const doc = readHtml('<p data-id="p1">one</p><pre data-id="c1"><code>x</code></pre>');
    const context = editContext();
    vi.mocked(canonicalize).mockClear();
    const type = planBlockType(doc, ['p1'], { kind: 'quote' }, context);
    const align = planAlign(doc, ['p1'], 'center', context);
    // Refused exactly as the edits refuse: an unknown block, no alignable block, no heading level.
    expect(planBlockType(doc, ['p1', 'missing'], { kind: 'quote' }, context)).toBeNull();
    expect(planAlign(doc, ['c1'], 'center', context)).toBeNull();
    expect(planBlockType(doc, ['p1'], { kind: 'heading' }, context)).toBeNull();
    expect(setBlockType(doc, ['p1'], { kind: 'heading' }, context)).toBeNull();
    expect(canonicalize).not.toHaveBeenCalled();
    const built = type!.build();
    expect(type!.build()).toBe(built);
    expect(canonicalize).toHaveBeenCalledTimes(1);
    expect(writeHtml(built)).toBe(writeHtml(setBlockType(doc, ['p1'], { kind: 'quote' }, context)));
    expect(writeHtml(align!.build())).toBe(
      writeHtml(planAlign(doc, ['p1'], 'center', context)!.build()),
    );
  });
});

describe('uwg-te-tab-actions r2: block.set-type, block.set-attrs, block.align', () => {
  it('turns textblocks into kinds keeping identifiers, and toggles back to paragraphs', () => {
    const doc = readHtml('<p data-id="p1">one</p><p data-id="p2">two</p>');
    const heading = setBlockType(
      doc,
      ['p1'],
      { kind: 'heading', attrs: { level: 3 } },
      editContext(),
    );
    expect(writeHtml(heading)).toBe('<h3 data-id="p1">one</h3>\n<p data-id="p2">two</p>');
    const listed = setBlockType(doc, ['p1', 'p2'], { kind: 'list-task' }, editContext());
    expect(writeHtml(listed)).toBe(
      '<ul data-type="task"><li data-id="p1" data-checked="false"><p>one</p></li><li data-id="p2" data-checked="false"><p>two</p></li></ul>',
    );
    expect(
      writeHtml(
        setBlockType(listed!, ['p1', 'p2'], { kind: 'list-task', toggle: true }, editContext()),
      ),
    ).toBe('<p data-id="p1">one</p>\n<p data-id="p2">two</p>');
    expect(
      writeHtml(
        setBlockType(doc, ['p1'], { kind: 'code', attrs: { language: 'ts' } }, editContext()),
      ),
    ).toBe('<pre data-id="p1"><code class="language-ts">one</code></pre>\n<p data-id="p2">two</p>');
    expect(
      writeHtml(
        setBlockType(doc, ['p1'], { kind: 'callout', attrs: { tone: 'tip' } }, editContext()),
      ),
    ).toContain('data-id="p1"');
    expect(setBlockType(doc, ['missing'], { kind: 'quote' }, editContext())).toBeNull();
    expect(
      setBlockType(readHtml('<hr data-id="d1">'), ['d1'], { kind: 'quote' }, editContext()),
    ).toBeNull();
  });

  it('uwg-te-req-blocks-1: a list item turned into another kind splits the outermost list at its place', () => {
    expect(
      writeHtml(setBlockType(readHtml(NESTED_LIST), ['b'], { kind: 'paragraph' }, editContext())),
    ).toBe(
      '<ul><li data-id="a"><p>a</p></li></ul>\n<p data-id="b">b</p>\n<ul><li data-id="c"><p>c</p></li><li data-id="d"><p>d</p></li></ul>',
    );
    // The converted item's own nested items become top-level items of the second list.
    expect(
      writeHtml(
        setBlockType(
          readHtml(NESTED_LIST),
          ['a'],
          { kind: 'heading', attrs: { level: 2 } },
          editContext(),
        ),
      ),
    ).toBe(
      '<h2 data-id="a">a</h2>\n<ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li><li data-id="d"><p>d</p></li></ul>',
    );
  });

  it('sets the attributes a kind takes and refuses others; image sources follow the image policy', () => {
    const doc = readHtml(
      '<h2 data-id="h1">H</h2><img data-id="i1" src="https://x.example/a.png" alt="A">',
    );
    expect(
      writeHtml(setBlockAttrs(doc, 'h1', { level: 5, align: 'center' }, editContext())),
    ).toContain('<h5 data-id="h1" style="text-align: center">H</h5>');
    expect(setBlockAttrs(doc, 'h1', { checked: true }, editContext())).toBeNull();
    expect(setBlockAttrs(doc, 'h1', { level: 7 }, editContext())).toBeNull();
    expect(setBlockAttrs(doc, 'i1', { src: 'javascript:alert(1)' }, editContext())).toBeNull();
    expect(writeHtml(setBlockAttrs(doc, 'i1', { width: 40 }, editContext()))).toContain(
      'width="40"',
    );
  });

  it('aligns the blocks that take an alignment; start and null restore the default', () => {
    const doc = readHtml('<p data-id="p1">a</p><pre data-id="c1"><code>x</code></pre>');
    const centered = alignBlocks(doc, ['p1', 'c1'], 'center', editContext());
    expect(writeHtml(centered)).toBe(
      '<p data-id="p1" style="text-align: center">a</p>\n<pre data-id="c1"><code>x</code></pre>',
    );
    expect(writeHtml(alignBlocks(centered!, ['p1'], 'start', editContext()))).toBe(writeHtml(doc));
    expect(alignBlocks(doc, ['c1'], 'end', editContext())).toBeNull();
  });
});

describe('uwg-te-req-parity-1: block.indent and block.outdent', () => {
  const flat = readHtml(
    '<ul><li data-id="a"><p>a</p></li><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li></ul>',
  );

  it('nests items under their previous sibling; a first item does not nest', () => {
    expect(indentItems(flat, ['a'], editContext())).toBeNull();
    expect(writeHtml(indentItems(flat, ['b', 'c'], editContext()))).toBe(
      '<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li></ul></li></ul>',
    );
  });

  it('unnests with the following siblings as children; a top-level item becomes a paragraph', () => {
    const nested = indentItems(flat, ['b', 'c'], editContext())!;
    expect(writeHtml(outdentItems(nested, ['b'], editContext()))).toBe(
      '<ul><li data-id="a"><p>a</p></li><li data-id="b"><p>b</p><ul><li data-id="c"><p>c</p></li></ul></li></ul>',
    );
    expect(writeHtml(outdentItems(readHtml(NESTED_LIST), ['a'], editContext()))).toBe(
      '<p data-id="a">a</p>\n<ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li><li data-id="d"><p>d</p></li></ul>',
    );
    expect(outdentItems(readHtml('<p data-id="p1">x</p>'), ['p1'], editContext())).toBeNull();
  });
});

describe('uwg-te-tab-input-rules r1–r7: block rules applied to the portable document', () => {
  it('turns the paragraph into the rule kind keeping its identifier and the rest of its text', () => {
    const doc = readHtml('<p data-id="p1"># Tides</p><p data-id="p2">x</p>');
    const heading = applyBlockRule(doc, 'p1', 2, { kind: 'heading', level: 1 }, editContext());
    expect(writeHtml(heading?.document)).toBe('<h1 data-id="p1">Tides</h1>\n<p data-id="p2">x</p>');
    expect(heading?.selection).toEqual({ kind: 'caret', block: 'p1', position: 'start' });
    const typed = (value: string): TextEditorPortableDocument => ({
      blocks: [{ type: 'paragraph', id: 'p1', content: [{ type: 'text', text: value }] }],
    });
    const code = applyBlockRule(
      typed('```js '),
      'p1',
      6,
      { kind: 'code', language: 'js' },
      editContext(),
    );
    expect(writeHtml(code?.document)).toBe(
      '<pre data-id="p1"><code class="language-js"></code></pre>',
    );
  });

  it('a list item joins the list of its kind that precedes it', () => {
    const doc = readHtml('<ul><li data-id="a"><p>one</p></li></ul><p data-id="p1">- two</p>');
    const listed = applyBlockRule(doc, 'p1', 2, { kind: 'list-bullet' }, editContext());
    expect(writeHtml(listed?.document)).toBe(
      '<ul><li data-id="a"><p>one</p></li><li data-id="p1"><p>two</p></li></ul>',
    );
    const task = applyBlockRule(
      { blocks: [{ type: 'paragraph', id: 'p1', content: [{ type: 'text', text: '[x] ' }] }] },
      'p1',
      4,
      { kind: 'list-task', checked: true },
      editContext(),
    );
    expect(writeHtml(task?.document)).toBe(
      '<ul data-type="task"><li data-id="p1" data-checked="true"><p></p></li></ul>',
    );
  });

  it('the divider keeps the identifier; the caret goes to the next textblock or a new paragraph', () => {
    const before = readHtml('<p data-id="p1">---</p><p data-id="p2">x</p>');
    const divided = applyBlockRule(before, 'p1', 3, { kind: 'divider' }, editContext());
    expect(writeHtml(divided?.document)).toBe('<hr data-id="p1">\n<p data-id="p2">x</p>');
    expect(divided?.selection).toEqual({ kind: 'caret', block: 'p2', position: 'start' });
    const last = applyBlockRule(
      readHtml('<p data-id="p1">---</p>'),
      'p1',
      3,
      { kind: 'divider' },
      editContext(),
    );
    expect(last?.document.blocks.map((block) => [block.type, block.id])).toEqual([
      ['divider', 'p1'],
      ['paragraph', 'new001'],
    ]);
    expect(last?.selection).toEqual({ kind: 'caret', block: 'new001', position: 'start' });
    expect(
      applyBlockRule(
        readHtml('<h1 data-id="h1"># x</h1>'),
        'h1',
        2,
        { kind: 'quote' },
        editContext(),
      ),
    ).toBeNull();
  });
});

describe('uwg-te-req-parity-1, uwg-te-req-key-3: Tab and Shift+Tab with list items', () => {
  const doc = readHtml(
    '<p data-id="p">x</p><ul><li data-id="a"><p>a</p></li><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li></ul><p data-id="q">y</p><pre data-id="k"><code>z</code></pre>',
  );

  it('the touched items are those from the anchor block to the head block', () => {
    expect(touchedItems(doc, 'p', 'b')).toEqual(['a', 'b']);
    expect(touchedItems(doc, 'q', 'b')).toEqual(['b', 'c']);
    expect(touchedItems(doc, 'p', 'p')).toEqual([]);
    expect(touchedItems(readHtml(NESTED_LIST), 'a', 'a')).toEqual(['a']);
    expect(touchedItems(readHtml(NESTED_LIST), 'a', 'c')).toEqual(['a', 'b', 'c']);
    expect(touchedItems(doc, 'p', 'missing')).toEqual([]);
  });

  it('Tab nests the touched items that can nest, whichever end lies in a paragraph', () => {
    const fromParagraph = listTab(doc, 'p', 'b', false, editContext());
    expect(fromParagraph?.consumed).toBe(true);
    expect(writeHtml(fromParagraph?.document)).toContain(
      '<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li></ul></li><li data-id="c"><p>c</p></li></ul>',
    );
    const intoParagraph = listTab(doc, 'b', 'q', false, editContext());
    expect(writeHtml(intoParagraph?.document)).toContain(
      '<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li></ul></li></ul>',
    );
    // Shift+Tab unnests every touched item; top-level items become paragraphs.
    expect(writeHtml(listTab(doc, 'p', 'b', true, editContext())?.document)).toContain(
      '<p data-id="p">x</p>\n<p data-id="a">a</p>\n<p data-id="b">b</p>\n<ul><li data-id="c"><p>c</p></li></ul>',
    );
  });

  it('no touched item is no list key; none that can nest is consumed only with the head in an item', () => {
    expect(listTab(doc, 'q', 'k', false, editContext())).toBeNull();
    expect(listTab(doc, 'p', 'p', true, editContext())).toBeNull();
    expect(listTab(doc, 'k', 'k', false, editContext())).toBeNull();
    expect(listTab(doc, 'a', 'a', false, editContext())).toEqual({
      consumed: true,
      document: null,
    });
    expect(listTab(doc, 'p', 'a', false, editContext())).toEqual({
      consumed: true,
      document: null,
    });
    expect(listTab(doc, 'a', 'p', false, editContext())).toBeNull();
    const table = readHtml(`${ROW_SPAN_TABLE}<ul><li data-id="a"><p>a</p></li></ul>`);
    expect(listTab(table, 't1', 'a', false, editContext())).toBeNull();
  });
});

describe('uwg-te-tab-actions r2: the textblocks a text selection targets', () => {
  const doc = readHtml(
    `<p data-id="p1">one</p><hr data-id="d1">${ROW_SPAN_TABLE}` +
      '<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li></ul></li></ul>' +
      '<pre data-id="k"><code>z</code></pre><p data-id="p2">two</p>',
  );
  const at = (block: string, offset: number) => ({ block, offset });

  it('are the textblocks from the first point to the last in document order; atoms and tables are skipped', () => {
    const all = ['p1', 'a', 'b', 'k', 'p2'];
    expect(textblockTargets(doc, at('p1', 1), at('p2', 0))).toEqual(all);
    expect(textblockTargets(doc, at('p2', 0), at('p1', 1))).toEqual(all);
    expect(textblockTargets(doc, at('p1', 3), at('p1', 3))).toEqual(['p1']);
    // A range in an item's own text does not reach its nested items.
    expect(textblockTargets(doc, at('a', 0), at('a', 1))).toEqual(['a']);
    expect(textblockTargets(doc, at('b', 0), at('k', 1))).toEqual(['b', 'k']);
  });

  it('are none for a point in a table cell or naming no block', () => {
    const cell = { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 };
    expect(textblockTargets(doc, cell, at('p2', 1))).toEqual([]);
    expect(textblockTargets(doc, at('p1', 0), at('missing', 0))).toEqual([]);
  });
});
