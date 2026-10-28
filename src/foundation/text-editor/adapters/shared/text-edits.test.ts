/**
 * Text edits across blocks over the portable model (Widgets `uwg-te-req-content-7`,
 * `uwg-te-req-parity-1`, `uwg-te-lis-up-i2`).
 */
import { describe, expect, it } from 'vitest';
import {
  blockBesideKey,
  codeJoinEdit,
  deleteRange,
  insertionMarks,
  joinBlocks,
  listBoundaryEdit,
  replaceRange,
} from './text-edits.js';
import type { TextEditorPortableDocument } from '../../content/portable.js';
import {
  editContext,
  NESTED_LIST,
  readHtml,
  ROW_SPAN_TABLE,
  textRun,
  writeHtml,
} from './test-helpers.test.js';

describe('uwg-te-req-content-7, uwg-te-req-parity-1: Backspace and Delete at list boundaries', () => {
  const caret = (block: string, offset: number) => ({ block, offset });

  it('Backspace at the start of a list item unnests it, keeping its identifier', () => {
    const items =
      '<p data-id="b">calm</p><ul><li data-id="a"><p>one</p></li><li data-id="c"><p>two</p></li></ul>';
    const first = listBoundaryEdit(readHtml(items), 'backspace', caret('a', 0), editContext());
    expect(writeHtml(first?.document)).toBe(
      '<p data-id="b">calm</p>\n<p data-id="a">one</p>\n<ul><li data-id="c"><p>two</p></li></ul>',
    );
    expect(first?.caret).toEqual(caret('a', 0));
    expect(
      writeHtml(
        listBoundaryEdit(readHtml(items), 'backspace', caret('c', 0), editContext())?.document,
      ),
    ).toBe(
      '<p data-id="b">calm</p>\n<ul><li data-id="a"><p>one</p></li></ul>\n<p data-id="c">two</p>',
    );
    const nested =
      '<ul><li data-id="a"><p>one</p><ul><li data-id="c"><p>two</p></li><li data-id="d"><p>three</p></li></ul></li></ul>';
    expect(
      writeHtml(
        listBoundaryEdit(readHtml(nested), 'backspace', caret('d', 0), editContext())?.document,
      ),
    ).toBe(
      '<ul><li data-id="a"><p>one</p><ul><li data-id="c"><p>two</p></li></ul></li><li data-id="d"><p>three</p></li></ul>',
    );
    expect(
      writeHtml(
        listBoundaryEdit(readHtml(nested), 'backspace', caret('c', 0), editContext())?.document,
      ),
    ).toBe(
      '<ul><li data-id="a"><p>one</p></li><li data-id="c"><p>two</p><ul><li data-id="d"><p>three</p></li></ul></li></ul>',
    );
    const emptyFirst =
      '<p data-id="x">x</p><ul><li data-id="b"><p></p></li><li data-id="c"><p>three</p></li></ul>';
    expect(
      writeHtml(
        listBoundaryEdit(readHtml(emptyFirst), 'backspace', caret('b', 0), editContext())?.document,
      ),
    ).toBe('<p data-id="x">x</p>\n<p data-id="b"></p>\n<ul><li data-id="c"><p>three</p></li></ul>');
    const emptyMiddle =
      '<ul><li data-id="a"><p>one</p></li><li data-id="b"><p></p></li><li data-id="c"><p>three</p></li></ul>';
    expect(
      writeHtml(
        listBoundaryEdit(readHtml(emptyMiddle), 'backspace', caret('b', 0), editContext())
          ?.document,
      ),
    ).toBe(
      '<ul><li data-id="a"><p>one</p></li></ul>\n<p data-id="b"></p>\n<ul><li data-id="c"><p>three</p></li></ul>',
    );
  });

  it('joins across list boundaries; the block holding the first character keeps its identifier', () => {
    const siblings = '<ul><li data-id="a"><p>one</p></li><li data-id="c"><p>two</p></li></ul>';
    const joined = listBoundaryEdit(readHtml(siblings), 'delete', caret('a', 3), editContext());
    expect(writeHtml(joined?.document)).toBe('<ul><li data-id="a"><p>onetwo</p></li></ul>');
    expect(joined?.caret).toEqual(caret('a', 3));
    const after =
      '<ul><li data-id="a"><p>one</p><ul><li data-id="c"><p>two</p></li></ul></li></ul><p data-id="b">calm</p>';
    const deepest =
      '<ul><li data-id="a"><p>one</p><ul><li data-id="c"><p>twocalm</p></li></ul></li></ul>';
    const back = listBoundaryEdit(readHtml(after), 'backspace', caret('b', 0), editContext());
    expect(writeHtml(back?.document)).toBe(deepest);
    expect(back?.caret).toEqual(caret('c', 3));
    expect(
      writeHtml(
        listBoundaryEdit(readHtml(after), 'delete', caret('c', 3), editContext())?.document,
      ),
    ).toBe(deepest);
    const before =
      '<p data-id="b">calm</p><ul><li data-id="a"><p>one</p><ul><li data-id="c"><p>two</p></li></ul></li></ul>';
    expect(
      writeHtml(
        listBoundaryEdit(readHtml(before), 'delete', caret('b', 4), editContext())?.document,
      ),
    ).toBe('<p data-id="b">calmone</p>\n<ul><li data-id="c"><p>two</p></li></ul>');
    const firstChild =
      '<ul><li data-id="a"><p>one</p><ul><li data-id="c"><p>two</p></li></ul></li></ul>';
    expect(
      writeHtml(
        listBoundaryEdit(readHtml(firstChild), 'delete', caret('a', 3), editContext())?.document,
      ),
    ).toBe('<ul><li data-id="a"><p>onetwo</p></li></ul>');
  });

  it('the next item’s nested items follow, keeping their depth; an empty earlier block goes', () => {
    const withChildren =
      '<ul><li data-id="a"><p>one</p></li><li data-id="c"><p>two</p><ul><li data-id="d"><p>three</p></li></ul></li></ul>';
    expect(
      writeHtml(
        listBoundaryEdit(readHtml(withChildren), 'delete', caret('a', 3), editContext())?.document,
      ),
    ).toBe('<ul><li data-id="a"><p>onetwo</p><ul><li data-id="d"><p>three</p></li></ul></li></ul>');
    const nestedFirst =
      '<ul><li data-id="a"><p>one</p><ul><li data-id="b"><p>x</p><ul><li data-id="e"><p>y</p></li></ul></li><li data-id="c"><p>z</p></li></ul></li></ul>';
    expect(
      writeHtml(
        listBoundaryEdit(readHtml(nestedFirst), 'delete', caret('a', 3), editContext())?.document,
      ),
    ).toBe(
      '<ul><li data-id="a"><p>onex</p><ul><li data-id="e"><p>y</p></li><li data-id="c"><p>z</p></li></ul></li></ul>',
    );
    const emptyLast =
      '<ul><li data-id="a"><p>one</p></li><li data-id="e"><p></p></li></ul><p data-id="b">calm</p>';
    const removed = listBoundaryEdit(
      readHtml(emptyLast),
      'backspace',
      caret('b', 0),
      editContext(),
    );
    expect(writeHtml(removed?.document)).toBe(
      '<ul><li data-id="a"><p>one</p></li></ul>\n<p data-id="b">calm</p>',
    );
    expect(removed?.caret).toEqual(caret('b', 0));
    // Both empty: the earlier block stays.
    const bothEmpty = '<ul><li data-id="a"><p></p></li></ul><p data-id="b"></p>';
    expect(
      writeHtml(
        listBoundaryEdit(readHtml(bothEmpty), 'backspace', caret('b', 0), editContext())?.document,
      ),
    ).toBe('<ul><li data-id="a"><p></p></li></ul>');
  });

  it('code text joining an item becomes hard breaks; text joining code becomes its text', () => {
    const intoItem =
      '<ul><li data-id="a"><p>one</p></li></ul><pre data-id="k"><code>x\ny</code></pre><p data-id="z">z</p>';
    expect(
      writeHtml(
        listBoundaryEdit(readHtml(intoItem), 'delete', caret('a', 3), editContext())?.document,
      ),
    ).toBe('<ul><li data-id="a"><p>onex<br>y</p></li></ul>\n<p data-id="z">z</p>');
    const intoCode =
      '<pre data-id="k"><code>x</code></pre><ul><li data-id="a"><p><strong>one</strong></p></li></ul>';
    expect(
      writeHtml(
        listBoundaryEdit(readHtml(intoCode), 'delete', caret('k', 1), editContext())?.document,
      ),
    ).toBe('<pre data-id="k"><code>xone</code></pre>');
  });

  it('a key at no list boundary is the engine’s', () => {
    const doc = readHtml(
      '<p data-id="p">calm</p><ul><li data-id="a"><p>one</p></li></ul><h2 data-id="h">sea</h2><hr data-id="d"><p data-id="q">x</p>',
    );
    expect(listBoundaryEdit(doc, 'backspace', caret('h', 0), editContext())).toBeNull();
    expect(listBoundaryEdit(doc, 'backspace', caret('a', 1), editContext())).toBeNull();
    expect(listBoundaryEdit(doc, 'backspace', caret('p', 0), editContext())).toBeNull();
    expect(listBoundaryEdit(doc, 'delete', caret('a', 2), editContext())).toBeNull();
    expect(listBoundaryEdit(doc, 'delete', caret('h', 3), editContext())).toBeNull();
    expect(listBoundaryEdit(doc, 'backspace', caret('q', 0), editContext())).toBeNull();
    expect(listBoundaryEdit(doc, 'delete', caret('missing', 0), editContext())).toBeNull();
    const table = readHtml(`<ul><li data-id="a"><p>one</p></li></ul>${ROW_SPAN_TABLE}`);
    expect(listBoundaryEdit(table, 'delete', caret('a', 3), editContext())).toBeNull();
    // joinBlocks needs the second block right after the first.
    expect(joinBlocks(doc, 'p', 'h', editContext())).toBeNull();
    expect(joinBlocks(doc, 'a', 'p', editContext())).toBeNull();
  });
});

describe('uwg-te-req-engine-9: the block that Backspace or Delete selects beside a textblock', () => {
  const caret = (block: string, offset: number) => ({ block, offset });
  const ATOMS = [
    ['a divider', '<hr data-id="x">'],
    ['an image', '<img data-id="x" src="https://example.com/a.png" alt="">'],
    ['a table', '<table data-id="x"><tbody><tr><td><p>c</p></td></tr></tbody></table>'],
  ] as const;
  const TEXTBLOCKS = [
    ['a paragraph', '<p data-id="a">ab</p>', 2],
    ['an empty paragraph', '<p data-id="a"></p>', 0],
    ['a heading', '<h2 data-id="a">ab</h2>', 2],
    ['a quote', '<blockquote data-id="a"><p>ab</p></blockquote>', 2],
    ['a code block', '<pre data-id="a"><code>a\nb</code></pre>', 3],
    ['a list item', '<ul><li data-id="a"><p>ab</p></li></ul>', 2],
    [
      'a nested list item',
      '<ul><li data-id="p"><p>p</p><ul><li data-id="a"><p>ab</p></li></ul></li></ul>',
      2,
    ],
  ] as const;

  it('Delete at the end of a textblock, an empty one included, selects the atom block or table after it', () => {
    for (const [label, atom] of ATOMS)
      for (const [kind, textblock, end] of TEXTBLOCKS) {
        const document = readHtml(`${textblock}${atom}<p data-id="z">z</p>`);
        expect(blockBesideKey(document, 'delete', caret('a', end)), `${kind}, ${label}`).toBe('x');
        if (end > 0) expect(blockBesideKey(document, 'delete', caret('a', end - 1))).toBeNull();
      }
  });

  it('Backspace at the start of a textblock, an empty one included, selects the atom block or table before it', () => {
    for (const [label, atom] of ATOMS)
      for (const [kind, textblock] of TEXTBLOCKS.slice(0, 6)) {
        const document = readHtml(`<p data-id="z">z</p>${atom}${textblock}`);
        expect(blockBesideKey(document, 'backspace', caret('a', 0)), `${kind}, ${label}`).toBe('x');
        expect(blockBesideKey(document, 'backspace', caret('a', 1))).toBeNull();
      }
  });

  it('beside a textblock, in a table cell or beside nothing it selects nothing', () => {
    const document = readHtml(
      '<p data-id="a">ab</p><p data-id="b">cd</p>' +
        '<ul><li data-id="p"><p>p</p><ul><li data-id="c"><p>c</p></li></ul></li></ul><hr data-id="x">',
    );
    expect(blockBesideKey(document, 'delete', caret('a', 2))).toBeNull();
    expect(blockBesideKey(document, 'backspace', caret('b', 0))).toBeNull();
    expect(blockBesideKey(document, 'backspace', caret('a', 0))).toBeNull();
    // The item before its nested items: Delete at its end reaches its first nested item.
    expect(blockBesideKey(document, 'delete', caret('p', 1))).toBeNull();
    expect(blockBesideKey(document, 'backspace', caret('c', 0))).toBeNull();
    expect(blockBesideKey(document, 'delete', caret('c', 1))).toBe('x');
    expect(blockBesideKey(document, 'delete', caret('x', 0))).toBeNull();
    expect(blockBesideKey(document, 'delete', caret('missing', 0))).toBeNull();
    const table = readHtml(`${ROW_SPAN_TABLE}<hr data-id="x">`);
    expect(
      blockBesideKey(table, 'delete', {
        block: 't1',
        cell: { row: 0, column: 0, paragraph: 0 },
        offset: 1,
      }),
    ).toBeNull();
  });
});

describe('uwg-te-req-content-5, uwg-te-req-content-7: a textblock joined into a code block', () => {
  const caret = (block: string, offset: number) => ({ block, offset });
  const MENTION = '<span data-type="mention" data-person="u1" data-label="Ann">@Ann</span>';

  it('Delete at the end of a code block joins the next textblock as its text, each inline node as the text the text format writes', () => {
    const cases: [string, number, string][] = [
      [`<p data-id="b">${MENTION}</p><p data-id="e">e</p>`, 3, 'a\nb@Ann'],
      [`<p data-id="b"><strong>x</strong>${MENTION}y<br>z</p>`, 3, 'a\nbx@Anny\nz'],
      ['<h2 data-id="b">cd</h2>', 3, 'a\nbcd'],
      ['<pre data-id="b"><code>c\nd</code></pre>', 3, 'a\nbc\nd'],
    ];
    for (const [next, end, text] of cases) {
      const document = readHtml(`<pre data-id="a"><code>a\nb</code></pre>${next}`);
      const edit = codeJoinEdit(document, 'delete', caret('a', end), editContext());
      expect(edit?.document.blocks[0], next).toEqual({ type: 'code', id: 'a', text });
      expect(edit?.document.blocks.map((block) => block.id)).not.toContain('b');
      expect(edit?.caret).toEqual(caret('a', end));
    }
  });

  it('Backspace at the start of a paragraph or a custom textblock after a code block joins it into the code block', () => {
    const cases: [string, string][] = [
      [`<p data-id="b">${MENTION} y</p>`, 'ab@Ann y'],
      [`<aside data-type="callout" data-id="b" data-tone="note">${MENTION}</aside>`, 'ab@Ann'],
    ];
    for (const [next, text] of cases) {
      const document = readHtml(`<pre data-id="a"><code>ab</code></pre>${next}`);
      const edit = codeJoinEdit(document, 'backspace', caret('b', 0), editContext());
      expect(writeHtml(edit?.document), next).toBe(`<pre data-id="a"><code>${text}</code></pre>`);
      expect(edit?.caret).toEqual(caret('a', 2));
    }
  });

  it('an empty code block goes instead, the textblock keeping its inline nodes', () => {
    const document = readHtml(`<pre data-id="a"><code></code></pre><p data-id="b">${MENTION}</p>`);
    const edit = codeJoinEdit(document, 'delete', caret('a', 0), editContext());
    expect(writeHtml(edit?.document)).toBe(`<p data-id="b">${MENTION}</p>`);
    expect(edit?.caret).toEqual(caret('b', 0));
  });

  it('every other key, point or pair is no join into a code block', () => {
    const document = readHtml(
      '<p data-id="z">z</p><pre data-id="a"><code>ab</code></pre><h2 data-id="h">h</h2>' +
        '<pre data-id="k"><code>k</code></pre><ul><li data-id="i"><p>i</p></li></ul>' +
        '<pre data-id="m"><code>m</code></pre><hr data-id="x"><pre data-id="n"><code>n</code></pre>',
    );
    const none: [string, Parameters<typeof codeJoinEdit>[1], { block: string; offset: number }][] =
      [
        // A heading at the caret turns into a paragraph first; a list item unnests.
        ['heading after code', 'backspace', caret('h', 0)],
        ['list item after code', 'backspace', caret('i', 0)],
        // Delete before a list item is the list boundary rule.
        ['code before a list item', 'delete', caret('k', 1)],
        ['not at the end', 'delete', caret('a', 1)],
        ['not at the start', 'backspace', caret('h', 1)],
        ['a paragraph before a code block', 'delete', caret('z', 1)],
        ['a code block at its start', 'backspace', caret('a', 0)],
        ['code before an atom', 'delete', caret('m', 1)],
        ['the last block', 'delete', caret('n', 1)],
        ['a missing block', 'delete', caret('missing', 0)],
      ];
    for (const [label, key, point] of none)
      expect(codeJoinEdit(document, key, point, editContext()), label).toBeNull();
    const table = readHtml(`<pre data-id="a"><code>ab</code></pre>${ROW_SPAN_TABLE}`);
    expect(
      codeJoinEdit(
        table,
        'backspace',
        { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 },
        editContext(),
      ),
    ).toBeNull();
  });
});

describe('uwg-te-req-content-7: deleting and replacing a range across blocks', () => {
  const point = (block: string, offset: number) => ({ block, offset });

  it('covered list items go and their nested items are lifted', () => {
    const doc = readHtml(
      '<p data-id="p0">intro</p><ul><li data-id="a"><p>alpha</p><ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li></ul></li><li data-id="d"><p>d</p></li></ul>',
    );
    const typed = replaceRange(doc, point('p0', 5), point('a', 2), 'Z', editContext());
    expect(writeHtml(typed?.document)).toBe(
      '<p data-id="p0">introZpha</p>\n<ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li><li data-id="d"><p>d</p></li></ul>',
    );
    expect(typed?.caret).toEqual(point('p0', 6));
    // A start item keeps its nested items the range does not cover.
    const start = deleteRange(readHtml(NESTED_LIST), point('a', 0), point('b', 1), editContext());
    expect(writeHtml(start?.document)).toBe(
      '<ul><li data-id="a"><p></p><ul><li data-id="c"><p>c</p></li></ul></li><li data-id="d"><p>d</p></li></ul>',
    );
    // The end item's nested items keep their depth under the item before it.
    const end = deleteRange(
      readHtml(
        '<ul><li data-id="a"><p>one</p></li><li data-id="c"><p>two</p><ul><li data-id="d"><p>three</p></li></ul></li></ul>',
      ),
      point('c', 1),
      point('a', 1),
      editContext(),
    );
    expect(writeHtml(end?.document)).toBe(
      '<ul><li data-id="a"><p>owo</p><ul><li data-id="d"><p>three</p></li></ul></li></ul>',
    );
    expect(end?.caret).toEqual(point('a', 1));
  });

  it('blocks between the points go; code text gives hard breaks, text into code its plain text', () => {
    const between = readHtml(
      `<p data-id="a">one</p><hr data-id="d">${ROW_SPAN_TABLE}<h2 data-id="b">two</h2>`,
    );
    expect(
      writeHtml(deleteRange(between, point('a', 1), point('b', 1), editContext())?.document),
    ).toBe('<p data-id="a">owo</p>');
    const code = readHtml(
      '<p data-id="p0">intro</p><pre data-id="k"><code>ab\ncd\nef</code></pre>',
    );
    expect(
      writeHtml(deleteRange(code, point('p0', 5), point('k', 3), editContext())?.document),
    ).toBe('<p data-id="p0">introcd<br>ef</p>');
    const intoCode = readHtml(
      '<pre data-id="k"><code>ab</code></pre><p data-id="p"><strong>bo</strong>ld x</p>',
    );
    expect(
      writeHtml(deleteRange(intoCode, point('k', 1), point('p', 2), editContext())?.document),
    ).toBe('<pre data-id="k"><code>ald x</code></pre>');
  });

  it('the start block keeps its kind; the joined block keeps the identifier of its first character', () => {
    const doc = readHtml(
      '<p data-id="p0">before</p><h2 data-id="b">calm</h2><p data-id="c">seatide</p><ul><li data-id="a"><p>calmsea</p></li></ul><blockquote data-id="q"><p>calmsea</p></blockquote>',
    );
    const across = deleteRange(doc, point('b', 0), point('c', 3), editContext());
    expect(writeHtml(across?.document)).toContain('<h2 data-id="c">tide</h2>');
    expect(writeHtml(across?.document)).not.toContain('data-id="b"');
    expect(across?.caret).toEqual(point('c', 0));
    const inItem = deleteRange(doc, point('a', 0), point('a', 4), editContext());
    expect(writeHtml(inItem?.document)).toContain('<li data-id="a"><p>sea</p></li>');
    expect(inItem?.caret).toEqual(point('a', 0));
    const inQuote = deleteRange(doc, point('q', 4), point('q', 0), editContext());
    expect(writeHtml(inQuote?.document)).toContain(
      '<blockquote data-id="q"><p>sea</p></blockquote>',
    );
    // Nothing after the end point: the start block keeps its identifier.
    const whole = deleteRange(doc, point('b', 0), point('c', 7), editContext());
    expect(writeHtml(whole?.document)).toContain('<h2 data-id="b"></h2>');
    // Points in no textblock, or beyond the text.
    expect(deleteRange(doc, point('b', 9), point('c', 1), editContext())).toBeNull();
    expect(deleteRange(doc, point('missing', 0), point('c', 1), editContext())).toBeNull();
  });

  it('text inserted inside a link stays inside it; at its edges and over a range it takes the first text’s marks', () => {
    const link = 'https://old.example/';
    const doc = readHtml(`<p data-id="p1">see <a href="${link}">docs</a> now</p>`);
    const inside = replaceRange(doc, point('p1', 6), point('p1', 6), 'a\nb', editContext());
    expect(inside?.document.blocks[0]).toMatchObject({
      content: [
        { type: 'text', text: 'see ' },
        { type: 'text', text: 'doa', marks: { link } },
        { type: 'hard-break' },
        { type: 'text', text: 'bcs', marks: { link } },
        { type: 'text', text: ' now' },
      ],
    });
    expect(inside?.caret).toEqual(point('p1', 9));
    expect(insertionMarks(doc, point('p1', 8), point('p1', 8))).toBeNull();
    expect(insertionMarks(doc, point('p1', 4), point('p1', 4))).toBeNull();
    expect(insertionMarks(doc, point('p1', 5), point('p1', 7))).toEqual({ link });
    expect(insertionMarks(doc, point('p1', 4), point('p1', 8))).toBeNull();
    const bold = readHtml(
      '<p data-id="p2">a<strong>bc</strong>d</p><p data-id="p3"><em>x</em></p>',
    );
    expect(
      writeHtml(replaceRange(bold, point('p2', 1), point('p2', 3), 'X', editContext())?.document),
    ).toBe('<p data-id="p2">a<strong>X</strong>d</p>\n<p data-id="p3"><em>x</em></p>');
    expect(insertionMarks(bold, point('p2', 3), point('p2', 3))).toEqual({ bold: true });
    // Stored marks win; null is plain text; empty text only deletes.
    expect(
      writeHtml(
        replaceRange(bold, point('p2', 1), point('p2', 3), 'X', editContext(), null)?.document,
      ),
    ).toContain('<p data-id="p2">aXd</p>');
    expect(
      writeHtml(replaceRange(bold, point('p2', 1), point('p2', 3), '', editContext())?.document),
    ).toContain('<p data-id="p2">ad</p>');
    const code = readHtml('<pre data-id="k"><code>ab</code></pre>');
    expect(insertionMarks(code, point('k', 1), point('k', 1))).toBeNull();
    expect(
      writeHtml(replaceRange(code, point('k', 1), point('k', 1), 'x\ny', editContext())?.document),
    ).toBe('<pre data-id="k"><code>ax\nyb</code></pre>');
  });
});

describe('uwg-te-lis-up-i2: the marks a caret gives inserted text', () => {
  const at = (block: string, offset: number) => ({ block, offset });
  const link = 'https://docs.example/';
  const colored = { textColor: 'blue', highlight: 'yellow', bold: true } as const;
  const doc: TextEditorPortableDocument = {
    blocks: [
      {
        type: 'paragraph',
        id: 'p1',
        content: [textRun('run', { ...colored, link }), textRun(' x')],
      },
      {
        type: 'paragraph',
        id: 'p2',
        content: [
          textRun('a', { bold: true }),
          { type: 'hard-break' },
          textRun('b', { italic: true }),
        ],
      },
      { type: 'paragraph', id: 'p3', content: [textRun('bold', { bold: true, textColor: 'red' })] },
    ],
  };
  const caretMarks = (point: { block: string; offset: number }) =>
    insertionMarks(doc, point, point);

  it('marks and colors are inclusive at their end and exclusive at their start; links at neither', () => {
    // At a block start, even before a marked run, and after a hard break: none.
    expect(caretMarks(at('p1', 0))).toBeNull();
    expect(caretMarks(at('p3', 0))).toBeNull();
    expect(caretMarks(at('p2', 2))).toBeNull();
    // After marked text: its marks and colors, never the link at its end.
    expect(caretMarks(at('p1', 3))).toEqual(colored);
    expect(caretMarks(at('p2', 1))).toEqual({ bold: true });
    expect(caretMarks(at('p3', 4))).toEqual({ bold: true, textColor: 'red' });
    // Inside a link: the link too.
    expect(caretMarks(at('p1', 1))).toEqual({ ...colored, link });
  });

  it('text typed at a block start before a marked link run is plain', () => {
    const typed = replaceRange(doc, at('p1', 0), at('p1', 0), 'new ', editContext());
    const first = typed?.document.blocks[0];
    expect(first?.type === 'paragraph' ? first.content : null).toEqual([
      textRun('new '),
      textRun('run', { ...colored, link }),
      textRun(' x'),
    ]);
    expect(typed?.caret).toEqual(at('p1', 4));
  });
});
