import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TextEditorPortableDraft } from '../../content/portable.js';
import {
  backspaceKey,
  blockEdgeArrow,
  cellCaretArrow,
  edgeKey,
  collapseAtStart,
  deleteKey,
  editingBindings,
  enterKey,
} from './keymap.js';
import { TiptapGeometry } from './geometry.js';
import { pointToPos } from './mapping.js';
import type { TiptapCommandsLike, TiptapViewLike } from './modules.js';
import { blockSelection, isCellSelection } from './selection.js';
import {
  caretAt,
  keyedTiptap,
  ruleView,
  selectIn,
  TIPTAP_MODULES,
  htmlOf,
  shapeOf,
  undoOnce,
} from './tiptap-stubs.test.js';
import type { TestView } from './tiptap-stubs.test.js';
import { portableOf, type TiptapEnv } from './work.js';
import { isInstance } from './modules.js';
import { type TextEditorSelectionInput } from '../../model.js';
import { corpusNodes } from '../shared/test-helpers.test.js';

const t = (text: string) => ({ type: 'text' as const, text });

function caret(draft: TextEditorPortableDraft, block: string, offset = 0) {
  const mounted = ruleView(draft);
  const { view } = mounted;
  const pos = pointToPos(view.state.doc, { block, offset })!;
  view.dispatch(
    view.state.tr.setSelection(TIPTAP_MODULES.state.TextSelection.create(view.state.doc, pos)),
  );
  return mounted;
}

const blocks = (env: TiptapEnv, view: TestView) => portableOf(view.state.doc, env).blocks;

/** Engine commands that record their calls and do nothing. */
function recording(calls: string[]): TiptapCommandsLike {
  return new Proxy({} as TiptapCommandsLike, {
    get: (_target, name: string) => () => {
      calls.push(name);
      return false;
    },
  });
}

describe('Tiptap Backspace at the start of a block (uwg-te-req-parity-1)', () => {
  it('turns a heading, quote or code block into a paragraph, keeping its identifier and text', () => {
    const cases: [TextEditorPortableDraft['blocks'][number], unknown][] = [
      [
        { type: 'heading', id: 'b1', level: 2, align: 'center', content: [t('Tides')] },
        { type: 'paragraph', id: 'b1', align: 'center', content: [t('Tides')] },
      ],
      [
        { type: 'quote', id: 'b1', content: [t('calm')] },
        { type: 'paragraph', id: 'b1', content: [t('calm')] },
      ],
      [
        { type: 'code', id: 'b1', text: 'a\nb' },
        { type: 'paragraph', id: 'b1', content: [t('a'), { type: 'hard-break' }, t('b')] },
      ],
    ];
    for (const [block, expected] of cases) {
      const { view, env } = caret(
        { blocks: [{ type: 'paragraph', id: 'p0', content: [t('before')] }, block] },
        'b1',
      );
      const calls: string[] = [];
      expect(backspaceKey(env, view, recording(calls)), block.type).toBe(true);
      expect(calls).toEqual([]);
      expect(blocks(env, view)[1], block.type).toEqual(expected);
      expect(view.state.selection.$head.parentOffset).toBe(0);
      // Only a further Backspace joins it, through the engine.
      backspaceKey(env, view, recording(calls));
      expect(calls).toEqual(['deleteSelection', 'joinBackward', 'selectNodeBackward']);
    }
  });

  it('leaves paragraphs and carets away from the start to the engine', () => {
    const paragraph = caret({ blocks: [{ type: 'paragraph', id: 'p1', content: [t('a')] }] }, 'p1');
    expect(collapseAtStart(paragraph.env, paragraph.view)).toBe(false);
    const inside = caret(
      { blocks: [{ type: 'heading', id: 'h1', level: 1, content: [t('ab')] }] },
      'h1',
      1,
    );
    expect(collapseAtStart(inside.env, inside.view)).toBe(false);
  });

  it('a cell range is cleared as the shared table edit does; a block selection is deleted as the shared deletion does', () => {
    const { view, env } = ruleView({
      blocks: [
        { type: 'paragraph', id: 'p1', content: [t('one')] },
        { type: 'paragraph', id: 'p2', content: [t('two')] },
        { type: 'paragraph', id: 'p3', content: [t('three')] },
      ],
    });
    view.dispatch(view.state.tr.setSelection(blockSelection(env.modules, view.state.doc, ['p2'])!));
    const calls: string[] = [];
    expect(deleteKey(env, view, recording(calls))).toBe(true);
    expect(calls).toEqual([]);
    expect(blocks(env, view).map((block) => block.id)).toEqual(['p1', 'p3']);
    // The caret goes to the end of the previous textblock.
    expect(view.state.selection.$head.parent.textContent).toBe('one');
    expect(view.state.selection.$head.parentOffset).toBe(3);
    const table = ruleView({
      blocks: [
        {
          type: 'table',
          id: 't1',
          headerRow: false,
          headerColumn: false,
          rows: [
            {
              cells: [
                { paragraphs: [{ content: [t('a')] }] },
                { paragraphs: [{ content: [t('b')] }] },
              ],
            },
          ],
        },
      ],
    });
    const map = TIPTAP_MODULES.tables!.TableMap.get(table.view.state.doc.child(0));
    const cells = TIPTAP_MODULES.tables!.CellSelection.create(
      table.view.state.doc,
      1 + map.map[0]!,
      1 + map.map[1]!,
    );
    table.view.dispatch(table.view.state.tr.setSelection(cells));
    // uwg-te-req-tables-5: the cells are cleared, the table and the cell range kept; no engine command.
    expect(backspaceKey(table.env, table.view, recording(calls))).toBe(true);
    expect(calls).toEqual([]);
    expect(table.view.state.doc.child(0).textContent).toBe('');
    expect(isCellSelection(table.env.tables, table.view.state.selection)).toBe(true);
  });
});

describe('Tiptap editing keymap (uwg-te-req-engine-11)', () => {
  it('Enter in an empty list item unnests it before the engine splits anything', () => {
    const { view, env } = caret(
      {
        blocks: [
          { type: 'list-bullet', id: 'i1', content: [t('one')], children: [] },
          { type: 'list-bullet', id: 'i2', content: [], children: [] },
        ],
      },
      'i2',
    );
    const calls: string[] = [];
    expect(enterKey(env, view, recording(calls), false)).toBe(true);
    expect(calls).toEqual([]);
    expect(blocks(env, view).map((block) => [block.type, block.id])).toEqual([
      ['list-bullet', 'i1'],
      ['paragraph', 'i2'],
    ]);
  });

  it('Enter in a list item splits it through the engine; elsewhere the engine splits the block', () => {
    const item = caret(
      {
        blocks: [
          { type: 'list-task', id: 'i1', checked: false, content: [t('one')], children: [] },
        ],
      },
      'i1',
      1,
    );
    const calls: string[] = [];
    enterKey(item.env, item.view, recording(calls), false);
    expect(calls).toEqual(['splitListItem', 'createParagraphNear', 'liftEmptyBlock', 'splitBlock']);
    calls.length = 0;
    enterKey(item.env, item.view, recording(calls), true);
    expect(calls).toEqual(['setHardBreak']);
  });

  it('binds only editing keys: no mark, heading, list, alignment or history chord, no Mod+Enter', () => {
    const { env, view } = ruleView({ blocks: [] });
    const keys = Object.keys(
      editingBindings(env, { view: view as never, commands: recording([]) }),
    );
    for (const key of keys)
      expect(key).toMatch(
        /^(?:Enter|Shift-Enter|(?:Mod-|Shift-)?Backspace|(?:Mod-)?Delete|Mod-a|(?:Shift-)?Tab|(?:Shift-)?Arrow(?:Up|Down|Left|Right)|Ctrl-[hdae]|Alt-(?:Backspace|Delete|d)|Ctrl-Alt-Backspace)$/u,
      );
  });
});

describe('uwg-te-req-engine-11, uwg-te-req-content-7: Backspace and Delete', () => {
  const cases: [string, string, TextEditorSelectionInput, string, string][] = [
    [
      'Backspace at the start of a first item after a paragraph',
      '<p data-id="b">calm</p><ul><li data-id="a"><p>one</p></li><li data-id="c"><p>two</p></li></ul>',
      caretAt('a', 0),
      'Backspace',
      '<p data-id="b">calm</p>\n<p data-id="a">one</p>\n<ul><li data-id="c"><p>two</p></li></ul>',
    ],
    [
      'Delete at the end of an item',
      '<ul><li data-id="a"><p>one</p></li><li data-id="c"><p>two</p></li></ul>',
      caretAt('a', 3),
      'Delete',
      '<ul><li data-id="a"><p>onetwo</p></li></ul>',
    ],
    [
      'Backspace at the start of a paragraph after a list',
      '<ul><li data-id="a"><p>one</p></li><li data-id="c"><p>two</p></li></ul><p data-id="b">calm</p>',
      caretAt('b', 0),
      'Backspace',
      '<ul><li data-id="a"><p>one</p></li><li data-id="c"><p>twocalm</p></li></ul>',
    ],
    [
      'Delete at the end of a last item before a paragraph',
      '<ul><li data-id="a"><p>one</p></li><li data-id="c"><p>two</p></li></ul><p data-id="b">calm</p>',
      caretAt('c', 3),
      'Delete',
      '<ul><li data-id="a"><p>one</p></li><li data-id="c"><p>twocalm</p></li></ul>',
    ],
    [
      'Backspace in an empty first item',
      '<p data-id="x">x</p><ul><li data-id="b"><p></p></li><li data-id="c"><p>three</p></li></ul>',
      caretAt('b', 0),
      'Backspace',
      '<p data-id="x">x</p>\n<p data-id="b"></p>\n<ul><li data-id="c"><p>three</p></li></ul>',
    ],
    [
      'Delete at the end of a paragraph before a list with a nested item',
      '<p data-id="b">calm</p><ul><li data-id="a"><p>one</p><ul><li data-id="c"><p>two</p></li></ul></li></ul>',
      caretAt('b', 4),
      'Delete',
      '<p data-id="b">calmone</p>\n<ul><li data-id="c"><p>two</p></li></ul>',
    ],
    [
      'Backspace at the start of a first nested item',
      '<ul><li data-id="a"><p>one</p><ul><li data-id="c"><p>two</p></li><li data-id="d"><p>three</p></li></ul></li></ul>',
      caretAt('c', 0),
      'Backspace',
      '<ul><li data-id="a"><p>one</p></li><li data-id="c"><p>two</p><ul><li data-id="d"><p>three</p></li></ul></li></ul>',
    ],
  ];
  const LIST =
    '<p data-id="p0">intro text</p><ul><li data-id="a"><p>alpha</p><ul><li data-id="b"><p>bravo</p></li><li data-id="c"><p>charlie</p></li></ul></li><li data-id="d"><p>delta</p></li></ul>';
  const MERGED =
    '<table data-id="t1"><tbody><tr><td><p>A</p></td><td><p>B</p></td></tr><tr><td colspan="2"><p>wide</p></td></tr><tr><td><p>x</p></td><td><p>y</p></td></tr></tbody></table><p data-id="p9">end</p>';
  const RANGE = { anchor: { row: 0, column: 1 }, head: { row: 2, column: 1 } };

  it('Backspace and Delete never end in a node selection that the state cannot report', () => {
    const cases: [string, TextEditorSelectionInput, string][] = [
      [
        '<p data-id="b">calm</p><ul><li data-id="a"><p>one</p><ul><li data-id="c"><p>two</p></li></ul></li></ul>',
        { kind: 'caret', block: 'b', position: 'end' },
        'Delete',
      ],
      [
        '<ul><li data-id="a"><p>one</p><ul><li data-id="c"><p>two</p></li><li data-id="d"><p>three</p></li></ul></li></ul>',
        { kind: 'caret', block: 'c', position: 'start' },
        'Backspace',
      ],
    ];
    for (const [source, caret, key] of cases) {
      const { instance, keys, view } = keyedTiptap(source);
      selectIn(instance, caret);
      keys.press(key);
      expect(isInstance(view.state.selection, TIPTAP_MODULES.state.NodeSelection), key).toBe(false);
      expect(instance.getState().selection.kind, key).toBe('text');
    }
  });

  it('Backspace after a table or Delete before one block-selects it; the next key deletes it', () => {
    const table =
      '<table data-id="t1"><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr></tbody></table>';
    const cases: [string, TextEditorSelectionInput, string][] = [
      [
        `${table}<p data-id="b">calm</p>`,
        { kind: 'caret', block: 'b', position: 'start' },
        'Backspace',
      ],
      [`<p data-id="b">calm</p>${table}`, { kind: 'caret', block: 'b', position: 'end' }, 'Delete'],
    ];
    for (const [source, caret, key] of cases) {
      const { instance, keys } = keyedTiptap(source);
      selectIn(instance, caret);
      expect(keys.press(key), key).toBe(true);
      expect(instance.getState().selection, key).toEqual({ kind: 'blocks', ids: ['t1'] });
      expect(keys.press(key), key).toBe(true);
      expect(htmlOf(instance), key).toMatch(/^<p data-id="b">calm<\/p>/u);
      expect(htmlOf(instance), key).not.toContain('<table');
      expect(instance.getState().selection, key).toMatchObject({
        kind: 'text',
        head: { block: 'b', offset: key === 'Delete' ? 4 : 0 },
      });
    }
  });

  it('Backspace in an empty block after a table, or Delete in one before a table, block-selects the table and keeps the block; the next key deletes the table', () => {
    const table =
      '<table data-id="t1"><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr></tbody></table>';
    const cases: [string, string, string][] = [
      [`${table}<p data-id="b"></p><p data-id="c">c</p>`, 'Backspace', '<p data-id="b"></p>'],
      [`<p data-id="x">x</p>${table}<p data-id="b"></p>`, 'Backspace', '<p data-id="b"></p>'],
      [`<p data-id="b"></p>${table}<p data-id="z">x</p>`, 'Delete', '<p data-id="b"></p>'],
      [`<h2 data-id="b"></h2>${table}<p data-id="z">x</p>`, 'Delete', '<h2 data-id="b"></h2>'],
      [
        `<pre data-id="b"><code></code></pre>${table}<p data-id="z">x</p>`,
        'Delete',
        '<pre data-id="b"><code></code></pre>',
      ],
    ];
    for (const [source, key, block] of cases) {
      const { instance, keys } = keyedTiptap(source);
      selectIn(instance, caretAt('b', 0));
      const before = htmlOf(instance);
      expect(keys.press(key), source).toBe(true);
      expect(instance.getState().selection, source).toEqual({ kind: 'blocks', ids: ['t1'] });
      expect(htmlOf(instance), source).toBe(before);
      expect(keys.press(key), source).toBe(true);
      expect(htmlOf(instance), source).not.toContain('<table');
      expect(htmlOf(instance), source).toContain(block);
    }
  });

  it('joining an empty textblock keeps the block holding the first character, the earlier one when both are empty', () => {
    const tail = '<p data-id="c">x</p>';
    const cases: [string, string, string, string, number][] = [
      [`<p data-id="a"></p><p data-id="b"></p>${tail}`, 'b', 'Backspace', '<p data-id="a"></p>', 0],
      [`<p data-id="a"></p><p data-id="b"></p>${tail}`, 'a', 'Delete', '<p data-id="a"></p>', 0],
      [
        `<h2 data-id="a"></h2><p data-id="b"></p>${tail}`,
        'b',
        'Backspace',
        '<h2 data-id="a"></h2>',
        0,
      ],
      [
        `<h2 data-id="a"></h2><p data-id="b"></p>${tail}`,
        'a',
        'Delete',
        '<h2 data-id="a"></h2>',
        0,
      ],
      [`<p data-id="a"></p><h2 data-id="b"></h2>${tail}`, 'a', 'Delete', '<p data-id="a"></p>', 0],
      [
        `<pre data-id="a"><code></code></pre><p data-id="b"></p>${tail}`,
        'b',
        'Backspace',
        '<pre data-id="a"><code></code></pre>',
        0,
      ],
      [
        `<p data-id="a"></p><pre data-id="b"><code></code></pre>${tail}`,
        'a',
        'Delete',
        '<p data-id="a"></p>',
        0,
      ],
      [
        `<blockquote data-id="a"><p></p></blockquote><p data-id="b"></p>${tail}`,
        'a',
        'Delete',
        '<blockquote data-id="a"><p></p></blockquote>',
        0,
      ],
      [
        `<p data-id="a"></p><p data-id="b">yz</p>${tail}`,
        'a',
        'Delete',
        '<p data-id="b">yz</p>',
        0,
      ],
      [
        `<p data-id="a">yz</p><p data-id="b"></p>${tail}`,
        'b',
        'Backspace',
        '<p data-id="a">yz</p>',
        2,
      ],
    ];
    for (const [source, at, key, kept, offset] of cases) {
      const { instance, keys } = keyedTiptap(source);
      selectIn(instance, caretAt(at, 0));
      expect(keys.press(key), source).toBe(true);
      expect(htmlOf(instance), source).toBe(`${kept}\n${tail}`);
      const id = /data-id="(\w+)"/u.exec(kept)![1]!;
      expect(instance.getState().selection, source).toMatchObject({
        kind: 'text',
        anchor: { block: id, offset },
        head: { block: id, offset },
      });
    }
  });

  it('Backspace at the start of the document and Delete at its end are consumed and change nothing', () => {
    const cases: [string, string, number][] = [
      ['<p data-id="b"></p><p data-id="c">yz</p>', 'Backspace', 0],
      ['<p data-id="b">yz</p>', 'Backspace', 0],
      ['<p data-id="a">yz</p><p data-id="b"></p>', 'Delete', 0],
      ['<p data-id="a">yz</p><h2 data-id="b"></h2>', 'Delete', 0],
      ['<p data-id="a">yz</p><p data-id="b">yz</p>', 'Delete', 2],
    ];
    for (const [source, key, offset] of cases) {
      const { instance, keys } = keyedTiptap(source);
      selectIn(instance, caretAt('b', offset));
      const before = htmlOf(instance);
      expect(keys.press(key), source).toBe(true);
      expect(htmlOf(instance), source).toBe(before);
      expect(instance.getState().selection, source).toMatchObject({
        kind: 'text',
        anchor: { block: 'b', offset },
        head: { block: 'b', offset },
      });
    }
  });

  it('Backspace at the start of a cell and Delete at its end are consumed and change nothing; inside a cell its paragraphs join', () => {
    const source =
      '<p data-id="p0">zz</p><table data-id="t1"><tbody><tr><td><p>ab</p><p>cd</p></td><td><p>ef</p></td></tr><tr><td><p></p></td><td><p>gh</p></td></tr></tbody></table><p data-id="p1">z</p>';
    const at = (row: number, column: number, paragraph: number, offset: number) => ({
      block: 't1',
      cell: { row, column, paragraph },
      offset,
    });
    const cases: [ReturnType<typeof at>, string][] = [
      [at(0, 0, 0, 0), 'Backspace'],
      [at(0, 1, 0, 0), 'Backspace'],
      [at(1, 0, 0, 0), 'Backspace'],
      [at(1, 1, 0, 0), 'Backspace'],
      [at(0, 0, 1, 2), 'Delete'],
      [at(0, 1, 0, 2), 'Delete'],
      [at(1, 0, 0, 0), 'Delete'],
      [at(1, 1, 0, 2), 'Delete'],
    ];
    for (const [point, key] of cases) {
      const label = `${key} ${JSON.stringify(point.cell)} ${point.offset}`;
      const { instance, keys } = keyedTiptap(source);
      selectIn(instance, { kind: 'text', anchor: point });
      const before = htmlOf(instance);
      expect(keys.press(key), label).toBe(true);
      expect(htmlOf(instance), label).toBe(before);
      expect(instance.getState().selection, label).toMatchObject({
        kind: 'text',
        anchor: point,
        head: point,
      });
    }
    const { instance, keys } = keyedTiptap(source);
    selectIn(instance, { kind: 'text', anchor: at(0, 0, 1, 0) });
    expect(keys.press('Backspace')).toBe(true);
    expect(htmlOf(instance)).toContain('<td><p>abcd</p></td>');
    // Between the paragraphs of a cell the caret is at no edge of the cell.
    const inner = keyedTiptap(source);
    selectIn(inner.instance, { kind: 'text', anchor: at(0, 0, 1, 0) });
    expect(edgeKey(inner.view, 'backward')).toBe(false);
    selectIn(inner.instance, { kind: 'text', anchor: at(0, 0, 0, 2) });
    expect(edgeKey(inner.view, 'forward')).toBe(false);
    selectIn(inner.instance, { kind: 'text', anchor: at(0, 0, 1, 2) });
    expect(edgeKey(inner.view, 'forward')).toBe(true);
  });

  it('Backspace and Delete at list boundaries follow the shared rule and keep identifiers', () => {
    for (const [label, source, caret, key, expected] of cases) {
      const { instance, keys } = keyedTiptap(source);
      selectIn(instance, caret);
      expect(keys.press(key), label).toBe(true);
      expect(shapeOf(instance), label).toBe(expected);
    }
  });

  it('Backspace and typing over a range across blocks follow the shared range deletion', () => {
    const expected =
      '<p data-id="p0">introZpha</p>\n<ul><li data-id="b"><p>bravo</p></li><li data-id="c"><p>charlie</p></li><li data-id="d"><p>delta</p></li></ul>';
    const range: TextEditorSelectionInput = {
      kind: 'text',
      anchor: { block: 'p0', offset: 5 },
      head: { block: 'a', offset: 2 },
    };
    const backspace = keyedTiptap(LIST);
    selectIn(backspace.instance, range);
    expect(backspace.keys.press('Backspace')).toBe(true);
    backspace.keys.type('Z');
    expect(htmlOf(backspace.instance)).toBe(expected);
    const typing = keyedTiptap(LIST);
    selectIn(typing.instance, range);
    typing.keys.type('Z');
    expect(htmlOf(typing.instance)).toBe(expected);
  });

  it('cut and Backspace over a cell range clear the range grown over merged cells and keep it selected', () => {
    const cut = keyedTiptap(MERGED);
    selectIn(cut.instance, { kind: 'cells', table: 't1', range: RANGE });
    const handlers = cut.log.editorOptions[0]!.editorProps as {
      readonly handleDOMEvents: Readonly<
        Record<string, (view: unknown, event: unknown) => boolean>
      >;
    };
    handlers.handleDOMEvents.cut!(cut.view, {
      clipboardData: { clearData: () => undefined, setData: () => undefined },
      preventDefault: () => undefined,
    });
    const backspace = keyedTiptap(MERGED);
    selectIn(backspace.instance, { kind: 'cells', table: 't1', range: RANGE });
    expect(backspace.keys.press('Backspace')).toBe(true);
    for (const { instance } of [cut, backspace]) {
      const written = htmlOf(instance);
      for (const text of ['A', 'B', 'wide', '<p>x</p>', '<p>y</p>'])
        expect(written, text).not.toContain(`<p>${text.replace(/<\/?p>/gu, '')}</p>`);
      expect(written).toContain('<table');
      expect(instance.getState().selection).toEqual({ kind: 'cells', table: 't1', range: RANGE });
    }
  });
});

describe('uwg-te-req-engine-9: Backspace and Delete beside an atom block', () => {
  const ATOMS = [
    ['a divider', '<hr data-id="x">'],
    ['an image', '<img data-id="x" src="https://example.com/a.png" alt="">'],
    [
      'a custom atom',
      '<figure data-id="x" data-type="embed" data-url="https://example.com/"></figure>',
    ],
  ] as const;
  const BEFORE = [
    ['a paragraph', '<p data-id="a">ab</p>', 2],
    ['an empty paragraph', '<p data-id="a"></p>', 0],
    ['a heading', '<h2 data-id="a">ab</h2>', 2],
    ['a quote', '<blockquote data-id="a"><p>ab</p></blockquote>', 2],
    ['a code block', '<pre data-id="a"><code>a\nb</code></pre>', 3],
    ['a list item', '<ul><li data-id="a"><p>ab</p></li></ul>', 2],
  ] as const;
  const AFTER = [
    ['a paragraph', '<p data-id="a">ab</p>'],
    ['an empty paragraph', '<p data-id="a"></p><p data-id="z">z</p>'],
  ] as const;

  /** The first key selects the atom and changes nothing; the second deletes the atom only. */
  function twoKeys(source: string, key: 'Backspace' | 'Delete', offset: number) {
    const { instance, keys } = keyedTiptap(source, { nodes: corpusNodes });
    selectIn(instance, caretAt('a', offset));
    const before = htmlOf(instance);
    const first = keys.press(key);
    const selected = instance.getState().selection;
    const unchanged = htmlOf(instance) === before;
    const second = keys.press(key);
    const ids = instance.getBlocks().roots;
    return {
      first,
      selected,
      unchanged,
      second,
      deleted: !ids.includes('x'),
      kept: ids.includes('a'),
    };
  }
  const SELECTED = {
    first: true,
    selected: { kind: 'blocks', ids: ['x'] },
    unchanged: true,
    second: true,
    deleted: true,
    kept: true,
  };

  it('Delete at the end of a textblock before one, an empty one included, selects it and keeps the textblock; a second Delete deletes it', () => {
    for (const [atom, html] of ATOMS)
      for (const [label, block, end] of BEFORE)
        expect(
          twoKeys(`${block}${html}<p data-id="z">z</p>`, 'Delete', end),
          `${label}, ${atom}`,
        ).toEqual(SELECTED);
  });

  it('Backspace at the start of a textblock after one, an empty one included, selects it and keeps the textblock; a second Backspace deletes it', () => {
    for (const [atom, html] of ATOMS)
      for (const [label, block] of AFTER)
        expect(
          twoKeys(`<p data-id="z">z</p>${html}${block}`, 'Backspace', 0),
          `${label}, ${atom}`,
        ).toEqual(SELECTED);
  });
});

describe('uwg-te-req-engine-11: keys over the whole-document selection', () => {
  const DOC = '<hr data-id="d1"><p data-id="p1"><strong>a</strong>b</p><h2 data-id="h1">c</h2>';

  it('Enter over Mod+A leaves two empty paragraphs with fresh identifiers, the caret in the second', () => {
    const { instance, keys } = keyedTiptap(DOC);
    expect(keys.press('Mod-a')).toBe(true);
    expect(keys.press('Enter')).toBe(true);
    const blocks = instance.getBlocks().ordered();
    expect(blocks.map((block) => [block.kind, block.empty])).toEqual([
      ['paragraph', true],
      ['paragraph', true],
    ]);
    expect(blocks.map((block) => block.id)).not.toContain('p1');
    expect(new Set(blocks.map((block) => block.id)).size).toBe(2);
    expect(instance.getState().selection).toMatchObject({
      kind: 'text',
      head: { block: blocks[1]!.id, offset: 0 },
      empty: true,
    });
  });

  it('Shift+Enter over Mod+A leaves one paragraph holding a hard break', () => {
    const { instance, keys } = keyedTiptap(DOC);
    keys.press('Mod-a');
    expect(keys.press('Shift-Enter')).toBe(true);
    const json = instance.getContent('json') as {
      content: { type: string; content?: unknown[] }[];
    };
    expect(json.content).toHaveLength(1);
    expect(json.content[0]!.type).toBe('paragraph');
    expect(json.content[0]!.content).toEqual([{ type: 'hardBreak' }]);
    expect(instance.getState().selection).toMatchObject({ kind: 'text', head: { offset: 1 } });
  });

  it('text typed over Mod+A has no marks, in one paragraph with a fresh identifier', () => {
    const { instance, keys } = keyedTiptap(DOC);
    keys.press('Mod-a');
    keys.type('Q');
    expect(htmlOf(instance)).toMatch(/^<p data-id="(?!p1)[^"]+">Q<\/p>$/u);
    expect(instance.getState().marks.bold).toBe('off');
  });
});

describe('uwg-te-req-content-7: Enter over a range and on an aligned block', () => {
  it('Enter over a range from a block start deletes the range, then splits keeping the identifier with the content', () => {
    const cases: [string, TextEditorSelectionInput, string][] = [
      [
        '<p data-id="b">calm sea</p>',
        { kind: 'text', anchor: { block: 'b', offset: 0 }, head: { block: 'b', offset: 4 } },
        '<p data-id="NEW"></p>\n<p data-id="b">&nbsp;sea</p>',
      ],
      [
        '<h2 data-id="b">calm</h2><p data-id="c">sea tide</p>',
        { kind: 'text', anchor: { block: 'b', offset: 0 }, head: { block: 'c', offset: 3 } },
        '<p data-id="NEW"></p>\n<h2 data-id="c">&nbsp;tide</h2>',
      ],
    ];
    for (const [source, range, expected] of cases) {
      const { instance, keys } = keyedTiptap(source);
      selectIn(instance, range);
      expect(keys.press('Enter'), source).toBe(true);
      expect(shapeOf(instance), source).toBe(expected);
    }
  });

  it('the block split from an aligned block takes its alignment at the start, middle and end', () => {
    for (const offset of [0, 2, 4]) {
      const { instance, keys } = keyedTiptap('<p data-id="p1" style="text-align: center">calm</p>');
      selectIn(instance, caretAt('p1', offset));
      expect(keys.press('Enter')).toBe(true);
      const json = instance.getContent('json') as { content: { attrs: { align: unknown } }[] };
      expect(
        json.content.map((node) => node.attrs.align),
        String(offset),
      ).toEqual(['center', 'center']);
    }
  });

  it('Enter at the start of an aligned heading or quote inserts an empty paragraph with its alignment before it, which keeps its identifier', () => {
    for (const source of [
      '<h2 data-id="b1" style="text-align: center">calm</h2>',
      '<blockquote data-id="b1" style="text-align: end"><p>calm</p></blockquote>',
      '<h3 data-id="b1">calm</h3>',
    ]) {
      const { instance, keys } = keyedTiptap(source);
      const type = (instance.getContent('json') as { content: { type: string }[] }).content[0]!
        .type;
      selectIn(instance, caretAt('b1', 0));
      expect(keys.press('Enter'), source).toBe(true);
      const json = instance.getContent('json') as {
        content: { type: string; attrs: { id: unknown; align: unknown }; content?: unknown }[];
      };
      const align = /text-align: (\w+)/u.exec(source)?.[1] ?? null;
      expect(
        json.content.map((node) => [node.type, node.attrs.align, node.content === undefined]),
        source,
      ).toEqual([
        ['paragraph', align, true],
        [type, align, false],
      ]);
      expect(json.content[0]!.attrs.id, source).toMatch(/^n\d{9}$/u);
      expect(json.content[1]!.attrs.id, source).toBe('b1');
      expect(instance.getState().selection, source).toMatchObject({
        kind: 'text',
        head: { block: 'b1', offset: 0 },
      });
      // Over a range from the start, the deletion and the new paragraph are one undo step.
      const ranged = keyedTiptap(source);
      const original = htmlOf(ranged.instance);
      selectIn(ranged.instance, {
        kind: 'text',
        anchor: { block: 'b1', offset: 0 },
        head: { block: 'b1', offset: 2 },
      });
      expect(ranged.keys.press('Enter'), source).toBe(true);
      expect(shapeOf(ranged.instance), source).toMatch(/^<p data-id="NEW"/u);
      expect(undoOnce(ranged.instance), source).toBe(true);
      expect(htmlOf(ranged.instance), source).toBe(original);
    }
  });

  it('Enter at the end of an aligned heading or quote gives a paragraph with its alignment', () => {
    for (const source of [
      '<h2 data-id="b1" style="text-align: center">calm</h2>',
      '<blockquote data-id="b1" style="text-align: end"><p>calm</p></blockquote>',
    ]) {
      const { instance, keys } = keyedTiptap(source);
      selectIn(instance, caretAt('b1', 4));
      expect(keys.press('Enter'), source).toBe(true);
      const json = instance.getContent('json') as {
        content: { type: string; attrs: { align: unknown } }[];
      };
      const align = json.content[0]!.attrs.align;
      expect(align, source).not.toBeNull();
      expect(
        json.content.map((node) => [node.type, node.attrs.align]),
        source,
      ).toEqual([
        [json.content[0]!.type, align],
        ['paragraph', align],
      ]);
    }
  });
});

describe('uwg-te-req-engine-9, uwg-te-req-key-6: arrow keys on a block selection', () => {
  const TABLE =
    '<table data-id="t1"><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr><tr><td><p>c</p></td><td><p>d</p></td></tr></tbody></table>';
  const EDGES = `<hr data-id="d1">${TABLE}<p data-id="p9">end</p>`;
  const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] as const;

  it('an arrow key with no block beyond the selection in its direction leaves the selection unchanged', () => {
    const cases: [readonly string[], readonly string[], readonly string[]][] = [
      // A leading divider: nothing before it; the table follows.
      [['d1'], ['ArrowLeft', 'ArrowUp'], ['ArrowRight', 'ArrowDown']],
      // A last paragraph: nothing after it; the table precedes.
      [['p9'], ['ArrowRight', 'ArrowDown'], ['ArrowLeft', 'ArrowUp']],
      // Every block: the inline-start key acts before the first, the other after the last.
      [['d1', 't1', 'p9'], ARROWS, []],
    ];
    for (const [ids, consumed, left] of cases) {
      for (const key of consumed) {
        const { instance, keys, view } = keyedTiptap(EDGES);
        selectIn(instance, { kind: 'blocks', ids });
        const before = view.state;
        expect(keys.press(key), `${ids.join()} ${key}`).toBe(true);
        expect(view.state, `${ids.join()} ${key}`).toBe(before);
        expect(instance.getState().selection, `${ids.join()} ${key}`).toEqual({
          kind: 'blocks',
          ids,
        });
      }
      // Where a block lies beyond, the engine moves the selection there.
      for (const key of left) {
        const { instance, keys } = keyedTiptap(EDGES);
        selectIn(instance, { kind: 'blocks', ids });
        expect(keys.press(key), `${ids.join()} ${key}`).toBe(false);
      }
    }
  });

  it('a node-selected atom block at the edge keeps its selection too; carets and inner blocks are left to the engine', () => {
    const edge = keyedTiptap(EDGES);
    const { NodeSelection } = TIPTAP_MODULES.state;
    edge.view.dispatch(
      edge.view.state.tr.setSelection(NodeSelection.create(edge.view.state.doc, 0)),
    );
    const before = edge.view.state;
    expect(edge.keys.press('ArrowLeft')).toBe(true);
    expect(edge.keys.press('ArrowUp')).toBe(true);
    expect(edge.view.state).toBe(before);
    expect(edge.instance.getState().selection).toEqual({ kind: 'blocks', ids: ['d1'] });
    // A divider between two paragraphs has a block beyond it in every direction.
    const inner = keyedTiptap('<p data-id="p1">top</p><hr data-id="d1"><p data-id="p2">mid</p>');
    selectIn(inner.instance, { kind: 'blocks', ids: ['d1'] });
    for (const key of ARROWS) expect(inner.keys.press(key), key).toBe(false);
    // A caret at the start of the document is no block selection.
    const caret = keyedTiptap('<p data-id="p1">top</p>');
    selectIn(caret.instance, caretAt('p1', 0));
    for (const key of ARROWS) expect(caret.keys.press(key), key).toBe(false);
  });

  it('ArrowLeft and ArrowRight follow the direction of the editing root', () => {
    const { instance, keys, view } = keyedTiptap(EDGES);
    selectIn(instance, { kind: 'blocks', ids: ['d1'] });
    const style = { direction: 'rtl' };
    const rtl = {
      state: view.state,
      dom: { ownerDocument: { defaultView: { getComputedStyle: () => style } } },
    } as unknown as TiptapViewLike;
    // From right to left, ArrowRight points to the inline start, before the leading divider.
    expect(blockEdgeArrow(keys.env, rtl, 'ArrowRight')).toBe(true);
    expect(blockEdgeArrow(keys.env, rtl, 'ArrowLeft')).toBe(false);
    style.direction = 'ltr';
    expect(blockEdgeArrow(keys.env, rtl, 'ArrowRight')).toBe(false);
    expect(blockEdgeArrow(keys.env, rtl, 'ArrowLeft')).toBe(true);
  });
});

describe('uwg-te-req-engine-9: ArrowUp and ArrowDown from a cell into the cell above or below', () => {
  afterEach(() => vi.restoreAllMocks());
  const TABLE =
    '<table data-id="t1"><tbody><tr><td><p>c1</p></td><td><p>c2</p></td></tr><tr><td><p>c3</p></td><td><p>c4</p></td></tr></tbody></table>';
  const DOC = `<p data-id="p0">top</p>${TABLE}<p data-id="p9">end</p>`;
  // Cell (0,0) spans two columns, so (1,2) is the third cell of its row and the second of row 0.
  const MERGED =
    '<table data-id="t2"><tbody><tr><td colspan="2"><p>wide</p></td><td><p>b</p></td></tr>' +
    '<tr><td><p>c</p></td><td><p>d</p></td><td><p>e</p></td></tr>' +
    '<tr><td><p>f</p></td><td><p>g</p></td><td><p>h</p></td></tr></tbody></table><p data-id="p9">end</p>';
  const at = (table: string, row: number, column: number, offset: number) => ({
    block: table,
    cell: { row, column, paragraph: 0 },
    offset,
  });
  const caret = (point: ReturnType<typeof at>) => ({
    kind: 'text',
    anchor: point,
    head: point,
    empty: true,
  });
  /** The key at a caret, the caret on the edge line or not; answers the selection after it. */
  function arrow(
    source: string,
    from: ReturnType<typeof at>,
    key: 'ArrowUp' | 'ArrowDown',
    onEdge = true,
  ) {
    const { instance, keys, view } = keyedTiptap(source);
    selectIn(instance, { kind: 'text', anchor: from });
    const sides: string[] = [];
    const moved = cellCaretArrow(
      keys.env,
      view as unknown as TiptapViewLike,
      key,
      (_point, side) => {
        sides.push(side);
        return onEdge;
      },
    );
    return { moved, sides, selection: instance.getState().selection };
  }

  it('ArrowUp on a cell’s first line goes to the end of the cell above, ArrowDown on its last line to the start of the cell below', () => {
    expect(arrow(DOC, at('t1', 1, 0, 1), 'ArrowUp')).toEqual({
      moved: true,
      sides: ['first'],
      selection: caret(at('t1', 0, 0, 2)),
    });
    expect(arrow(DOC, at('t1', 1, 1, 0), 'ArrowUp').selection).toEqual(caret(at('t1', 0, 1, 2)));
    expect(arrow(DOC, at('t1', 0, 1, 1), 'ArrowDown')).toEqual({
      moved: true,
      sides: ['last'],
      selection: caret(at('t1', 1, 1, 0)),
    });
  });

  it('next to a merged cell the grid’s columns decide, never the cells’ order in their row', () => {
    expect(arrow(MERGED, at('t2', 1, 1, 0), 'ArrowUp').selection).toEqual(caret(at('t2', 0, 0, 4)));
    expect(arrow(MERGED, at('t2', 1, 2, 1), 'ArrowUp').selection).toEqual(caret(at('t2', 0, 2, 1)));
    expect(arrow(MERGED, at('t2', 0, 2, 0), 'ArrowDown').selection).toEqual(
      caret(at('t2', 1, 2, 0)),
    );
    expect(arrow(MERGED, at('t2', 1, 2, 0), 'ArrowDown').selection).toEqual(
      caret(at('t2', 2, 2, 0)),
    );
  });

  it('off the edge line and out of the first or last row the key stays the engine’s', () => {
    expect(arrow(DOC, at('t1', 1, 0, 1), 'ArrowUp', false)).toMatchObject({
      moved: false,
      sides: ['first'],
      selection: caret(at('t1', 1, 0, 1)),
    });
    expect(arrow(DOC, at('t1', 0, 0, 1), 'ArrowUp')).toMatchObject({ moved: false, sides: [] });
    expect(arrow(DOC, at('t1', 1, 1, 2), 'ArrowDown')).toMatchObject({ moved: false, sides: [] });
    // Outside a table the key is no cell key.
    const { instance, keys, view } = keyedTiptap(DOC);
    selectIn(instance, caretAt('p9', 0));
    expect(cellCaretArrow(keys.env, view as unknown as TiptapViewLike, 'ArrowUp', () => true)).toBe(
      false,
    );
  });

  it('the editing keymap takes plain ArrowUp and ArrowDown ahead of the table’s keys, without an undo step', () => {
    vi.spyOn(TiptapGeometry.prototype, 'onEdgeLine').mockReturnValue(true);
    const { instance, keys, editor } = keyedTiptap(DOC);
    selectIn(instance, { kind: 'text', anchor: at('t1', 1, 0, 1) });
    const html = instance.getContent('html');
    expect(keys.press('ArrowUp')).toBe(true);
    expect(instance.getState().selection).toEqual(caret(at('t1', 0, 0, 2)));
    expect(keys.press('ArrowDown')).toBe(true);
    expect(instance.getState().selection).toEqual(caret(at('t1', 1, 0, 0)));
    expect(instance.getContent('html')).toBe(html);
    expect(instance.getState().history.undo).toBe(false);
    // Its plugin runs before the table's, whose vertical move lands at the start of the cell.
    const names = editor.inner.extensionManager.extensions.map((extension) => extension.name);
    expect(names.indexOf('tpKeymap')).toBeGreaterThanOrEqual(0);
    expect(names.indexOf('tpKeymap')).toBeLessThan(names.indexOf('table'));
  });
});

describe('uwg-te-req-engine-9: ArrowUp out of a table that opens the document', () => {
  afterEach(() => vi.restoreAllMocks());
  // The table opens the document; its cell (0,0) spans rows 0–1.
  const SOURCE =
    '<table data-id="t1"><tbody><tr><td rowspan="2"><p>tall</p></td><td><p>c1</p></td></tr>' +
    '<tr><td><p>c2</p></td></tr></tbody></table><p data-id="p9">end</p>';
  const at = (row: number, column: number, offset: number) => ({
    block: 't1',
    cell: { row, column, paragraph: 0 },
    offset,
  });
  const caret = (point: ReturnType<typeof at>) => ({
    kind: 'text',
    anchor: point,
    head: point,
    empty: true,
  });

  it('from the first row, a cell spanning rows included, the key is consumed and the selection stays', () => {
    for (const from of [at(0, 1, 1), at(0, 0, 2), at(0, 1, 0)]) {
      const { instance, keys, view } = keyedTiptap(SOURCE);
      selectIn(instance, { kind: 'text', anchor: from });
      const sides: string[] = [];
      const moved = cellCaretArrow(
        keys.env,
        view as unknown as TiptapViewLike,
        'ArrowUp',
        (_point, side) => {
          sides.push(side);
          return true;
        },
      );
      expect({ moved, sides, selection: instance.getState().selection }).toEqual({
        moved: true,
        sides: ['first'],
        selection: caret(from),
      });
    }
  });

  it('the editing keymap consumes it without a change, an undo step or a notification', () => {
    vi.spyOn(TiptapGeometry.prototype, 'onEdgeLine').mockReturnValue(true);
    const { instance, keys, context } = keyedTiptap(SOURCE);
    selectIn(instance, { kind: 'text', anchor: at(0, 1, 1) });
    const html = instance.getContent('html');
    context.calls.length = 0;
    expect(keys.press('ArrowUp')).toBe(true);
    expect(instance.getState().selection).toEqual(caret(at(0, 1, 1)));
    expect(instance.getContent('html')).toBe(html);
    expect(instance.getState().history.undo).toBe(false);
    expect(context.calls).toEqual([]);
  });

  it('off the first line, or with a block before the table, the key stays the engine’s', () => {
    const offEdge = keyedTiptap(SOURCE);
    selectIn(offEdge.instance, { kind: 'text', anchor: at(0, 1, 1) });
    expect(
      cellCaretArrow(
        offEdge.keys.env,
        offEdge.view as unknown as TiptapViewLike,
        'ArrowUp',
        () => false,
      ),
    ).toBe(false);
    const before = keyedTiptap(`<p data-id="p0">top</p>${SOURCE}`);
    selectIn(before.instance, { kind: 'text', anchor: at(0, 1, 1) });
    const sides: string[] = [];
    expect(
      cellCaretArrow(
        before.keys.env,
        before.view as unknown as TiptapViewLike,
        'ArrowUp',
        (_point, side) => {
          sides.push(side);
          return true;
        },
      ),
    ).toBe(false);
    expect(sides).toEqual([]);
  });
});

describe('uwg-te-req-content-5, uwg-te-req-content-7: a textblock joined into a code block', () => {
  const MENTION = '<span data-type="mention" data-person="u1" data-label="Ann">@Ann</span>';
  const mounted = (source: string, caret: TextEditorSelectionInput) => {
    const keyed = keyedTiptap(source, { nodes: corpusNodes });
    selectIn(keyed.instance, caret);
    return keyed;
  };

  it('Delete at the end of a code block joins the next textblock, each inline node as its text', () => {
    const cases: [string, number, string][] = [
      [`<p data-id="b">${MENTION}</p><p data-id="e">e</p>`, 3, 'a\nb@Ann'],
      [`<p data-id="b"><strong>x</strong>${MENTION}y<br>z</p>`, 3, 'a\nbx@Anny\nz'],
    ];
    for (const [next, end, text] of cases) {
      const { instance, keys } = mounted(
        `<pre data-id="a"><code>a\nb</code></pre>${next}`,
        caretAt('a', end),
      );
      expect(keys.press('Delete'), next).toBe(true);
      expect(htmlOf(instance).split('\n<p')[0], next).toBe(
        `<pre data-id="a"><code>${text}</code></pre>`,
      );
      expect(htmlOf(instance)).not.toContain('data-id="b"');
      expect(instance.getState().selection).toMatchObject({ head: { block: 'a', offset: end } });
    }
  });

  it('Backspace at the start of a paragraph after a code block joins it, each inline node as its text', () => {
    const { instance, keys } = mounted(
      `<pre data-id="a"><code>ab</code></pre><p data-id="b">${MENTION} y</p>`,
      caretAt('b', 0),
    );
    expect(keys.press('Backspace')).toBe(true);
    expect(htmlOf(instance)).toBe('<pre data-id="a"><code>ab@Ann y</code></pre>');
    expect(instance.getState().selection).toMatchObject({ head: { block: 'a', offset: 2 } });
    expect(undoOnce(instance)).toBe(true);
    expect(htmlOf(instance)).toBe(
      `<pre data-id="a"><code>ab</code></pre>\n<p data-id="b">${MENTION} y</p>`,
    );
  });
});
