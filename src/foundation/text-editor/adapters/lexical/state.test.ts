/**
 * The normalized state on Lexical (Widgets `uwg-te-req-engine-4`, `uwg-te-tab-engine` r3, r7,
 * `uwg-te-req-blocks-4`).
 */
import * as lexical from 'lexical';
import { describe, expect, it } from 'vitest';
import { fakeContainer, type FakeElement, keyEvent } from '../shared/test-helpers.test.js';
import { createLexicalEngine } from './index.js';
import {
  headlessLexical,
  recordingContext,
  selectText,
  stubLexicalModules,
  type Headless,
} from './lexical-stubs.test.js';
import type { TextEditorAction } from '../../actions.js';

const deepFrozen = (value: unknown): boolean =>
  typeof value !== 'object' ||
  value === null ||
  (Object.isFrozen(value) && Object.values(value).every(deepFrozen));

describe('uwg-te-req-engine-4: the minimal state', () => {
  it('V-018: the state is deeply frozen and one object per version', () => {
    const { instance } = headlessLexical({ html: '<p data-id="p1">calm</p>' });
    const state = instance.getState();
    expect(deepFrozen(state)).toBe(true);
    expect(instance.getState()).toBe(state);
    expect(() => {
      (state as { version: number }).version = 9;
    }).toThrow(TypeError);
  });

  it('V-018: version rises on every update, contentVersion only on document changes', () => {
    const { instance, recording } = headlessLexical({ html: '<p data-id="p1">calm</p>' });
    const first = instance.getState();
    expect([first.version, first.contentVersion]).toEqual([1, 1]);
    instance.execute(
      [{ type: 'selection.set', selection: { kind: 'text', anchor: { block: 'p1', offset: 4 } } }],
      { reason: 'imperative-action' },
    );
    const selected = instance.getState();
    expect([selected.version, selected.contentVersion]).toEqual([2, 1]);
    expect(selected.selection).toEqual({
      kind: 'text',
      anchor: { block: 'p1', offset: 4 },
      head: { block: 'p1', offset: 4 },
      empty: true,
    });
    instance.execute([{ type: 'text.insert', text: ' sea' }], { reason: 'imperative-action' });
    const typed = instance.getState();
    expect([typed.version, typed.contentVersion]).toEqual([3, 2]);
    expect(typed.history).toEqual({ undo: true, redo: false });
    expect(recording.records.map(({ type }) => type)).toEqual(['ready', 'state', 'content']);
  });

  it('reports editability, emptiness and no selection', () => {
    const empty = headlessLexical();
    expect(empty.instance.getState()).toMatchObject({
      editable: true,
      focused: false,
      composing: false,
      empty: true,
      selection: { kind: 'none' },
      block: null,
      blockKinds: [],
      marks: { bold: 'off', textColor: null },
    });
    empty.instance.setEditable(false);
    expect(empty.instance.getState()).toMatchObject({ editable: false, version: 2 });
    const full = headlessLexical({ html: '<p data-id="p1">x</p>', editable: false });
    expect(full.instance.getState()).toMatchObject({ editable: false, empty: false });
  });

  it('V-051: the block tree is one object until the content version changes', () => {
    const { instance } = headlessLexical({
      html: '<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li></ul></li></ul><p data-id="p1"></p>',
    });
    const tree = instance.getBlocks();
    expect(instance.getBlocks()).toBe(tree);
    expect(tree.roots).toEqual(['a', 'p1']);
    expect(tree.get('b')).toMatchObject({
      parentId: 'a',
      depth: 1,
      index: 0,
      kind: 'list-bullet',
      textblock: true,
    });
    expect(tree.get('p1')).toMatchObject({ empty: true, children: [] });
    expect(tree.ordered().map(({ id }) => id)).toEqual(['a', 'b', 'p1']);
    instance.execute(
      [{ type: 'selection.set', selection: { kind: 'caret', block: 'p1', position: 'start' } }],
      { reason: 'imperative-action' },
    );
    expect(instance.getBlocks()).toBe(tree);
    instance.execute([{ type: 'text.insert', text: 'x' }], { reason: 'imperative-action' });
    expect(instance.getBlocks()).not.toBe(tree);
    expect(instance.getBlocks().version).toBe(2);
  });

  it('getTable is the span-aware model with positional headers', () => {
    const { instance } = headlessLexical({
      html: '<table data-id="t1"><tbody><tr><th colspan="2"><p>a</p></th></tr><tr><td data-background="green"><p></p></td><td><p>c</p></td></tr></tbody></table>',
    });
    expect(instance.getTable('t1')).toMatchObject({
      rows: 2,
      columns: 2,
      headerRow: true,
      headerColumn: false,
      merged: true,
      widths: null,
      grid: [
        [0, 0],
        [1, 2],
      ],
      cells: [
        { row: 0, column: 0, colSpan: 2, header: true, empty: false },
        { row: 1, column: 0, header: false, background: 'green', empty: true },
        { row: 1, column: 1, header: false, empty: false },
      ],
    });
    expect(instance.getTable('missing')).toBeNull();
  });
});

describe('uwg-te-tab-engine r12: focus and the root', () => {
  it('focus is synchronous on the root and notifies state; blur leaves it', async () => {
    const stub = stubLexicalModules();
    const recording = recordingContext();
    const container = fakeContainer();
    const instance = createLexicalEngine(stub.modules).mount(
      container as unknown as HTMLElement,
      recording.context,
    );
    if (instance instanceof Promise) throw new Error('synchronous');
    const root = container.children[0] as FakeElement;
    recording.clear();
    const settled = instance.focus('end');
    expect(root.ownerDocument.activeElement).toBe(root);
    await settled;
    expect(recording.records).toEqual([{ type: 'state' }]);
    instance.blur();
    expect(root.ownerDocument.activeElement).toBeNull();
  });
});

describe('uwg-te-req-engine-4: the complete state', () => {
  const doc = [
    '<p data-id="p1">calm <strong>blue</strong> <a href="https://harbor.example/">pier</a></p>',
    '<h2 data-id="h1" style="text-align:center">Tides</h2>',
    '<ul><li data-id="a"><p>one</p><ul><li data-id="b"><p>two</p></li></ul></li></ul>',
    '<pre data-id="c1" data-language="js"><code>x</code></pre>',
    '<table data-id="t1"><thead><tr><th><p>h</p></th><th><p>i</p></th></tr></thead><tbody><tr><td colspan="2" style="text-align:right"><p>w</p></td></tr></tbody></table>',
    '<p data-id="e1"></p>',
  ].join('');

  it('V-018: marks on, off and mixed over a range; the marks typed text takes at a caret', () => {
    const headless = headlessLexical({ html: doc });
    selectText(headless, { block: 'p1', offset: 3 }, { block: 'p1', offset: 7 });
    expect(headless.instance.getState().marks).toMatchObject({ bold: 'mixed', italic: 'off' });
    selectText(headless, { block: 'p1', offset: 5 }, { block: 'p1', offset: 9 });
    expect(headless.instance.getState().marks).toMatchObject({ bold: 'on', textColor: null });
    // A caret at the end of the bold run continues it; at its start after other text it does not.
    selectText(headless, { block: 'p1', offset: 9 });
    expect(headless.instance.getState().marks.bold).toBe('on');
    selectText(headless, { block: 'p1', offset: 5 });
    expect(headless.instance.getState().marks.bold).toBe('off');
    headless.instance.execute([{ type: 'mark.color', mark: 'text-color', color: 'blue' }], {
      reason: 'imperative-action',
    });
    expect(headless.instance.getState().marks.textColor).toBe('blue');
  });

  it('V-018: the marks of a block selection are the runs of its text', () => {
    const headless = headlessLexical({ html: doc });
    headless.instance.execute(
      [{ type: 'selection.set', selection: { kind: 'blocks', ids: ['p1'] } }],
      { reason: 'imperative-action' },
    );
    expect(headless.instance.getState().marks).toMatchObject({ bold: 'mixed', italic: 'off' });
    headless.instance.execute(
      [{ type: 'selection.set', selection: { kind: 'blocks', ids: ['h1'] } }],
      { reason: 'imperative-action' },
    );
    expect(headless.instance.getState().marks.bold).toBe('off');
  });

  it('V-018: the marks of a cell range are the runs of its cells’ text, merged cells included', () => {
    const headless = headlessLexical({
      html: '<table data-id="t1"><tbody><tr><td><p><em>a</em></p></td><td><p>b</p></td><td><p><em>c</em></p></td></tr><tr><td colspan="2"><p><em>wide</em></p></td><td><p><strong>d</strong></p></td></tr></tbody></table>',
    });
    const cells = (anchor: [number, number], head: [number, number]) => {
      headless.instance.execute(
        [
          {
            type: 'selection.set',
            selection: {
              kind: 'cells',
              table: 't1',
              range: {
                anchor: { row: anchor[0], column: anchor[1] },
                head: { row: head[0], column: head[1] },
              },
            },
          },
        ],
        { reason: 'imperative-action' },
      );
      return headless.instance.getState().marks;
    };
    expect(cells([0, 0], [0, 1])).toMatchObject({ italic: 'mixed', bold: 'off' });
    expect(cells([0, 2], [1, 2])).toMatchObject({ italic: 'mixed', bold: 'mixed' });
    // A range that cuts the merged cell grows over it: a, b and wide.
    expect(cells([0, 0], [1, 0])).toMatchObject({ italic: 'mixed', bold: 'off' });
    expect(cells([1, 0], [1, 1])).toMatchObject({ italic: 'on', bold: 'off' });
  });

  it('V-018: the block at the head with its depth, the kinds spanned and the common alignment', () => {
    const headless = headlessLexical({ html: doc });
    selectText(headless, { block: 'p1', offset: 0 }, { block: 'b', offset: 1 });
    const state = headless.instance.getState();
    expect(state.block).toEqual({ id: 'b', kind: 'list-bullet', attrs: { align: null }, depth: 1 });
    expect(state.blockKinds).toEqual(['paragraph', 'heading:2', 'list-bullet']);
    expect(state.align).toBe('mixed');
    selectText(headless, { block: 'h1', offset: 1 });
    expect(headless.instance.getState().align).toBe('center');
    expect(headless.instance.getState().block).toMatchObject({ kind: 'heading', depth: 0 });
  });

  it('V-018: the link at the selection with its whole range, touched at either edge', () => {
    const headless = headlessLexical({ html: doc });
    for (const offset of [10, 12, 14]) {
      selectText(headless, { block: 'p1', offset });
      expect(headless.instance.getState().link).toEqual({
        href: 'https://harbor.example/',
        range: { block: 'p1', from: 10, to: 14 },
      });
    }
    selectText(headless, { block: 'p1', offset: 8 });
    expect(headless.instance.getState().link).toBeNull();
  });

  it('V-018: the table at the selection: cell, range, size, header flags and merges', () => {
    const headless = headlessLexical({ html: doc });
    selectText(headless, { block: 't1', cell: { row: 1, column: 0, paragraph: 0 }, offset: 1 });
    expect(headless.instance.getState().table).toEqual({
      id: 't1',
      cell: { row: 1, column: 0 },
      range: null,
      rows: 2,
      columns: 2,
      headerRow: true,
      headerColumn: false,
      merged: true,
      cellMerged: true,
    });
    // Cell paragraphs carry no alignment; the cell's own is `table.align`'s.
    expect(headless.instance.getState().align).toBeNull();
    expect(headless.instance.getState().block).toMatchObject({ id: 't1', kind: 'table' });
  });

  it('V-018: the caret with its text before it, in code or not, and the empty block', () => {
    const headless = headlessLexical({ html: doc });
    selectText(headless, { block: 'p1', offset: 9 });
    expect(headless.instance.getState().caret).toEqual({
      point: { block: 'p1', offset: 9 },
      textBefore: 'calm blue',
      inCode: false,
    });
    expect(headless.instance.getState().emptyBlock).toBeNull();
    selectText(headless, { block: 'c1', offset: 1 });
    expect(headless.instance.getState().caret?.inCode).toBe(true);
    selectText(headless, { block: 'e1', offset: 0 });
    expect(headless.instance.getState().emptyBlock).toEqual({ id: 'e1', kind: 'paragraph' });
    const long = headlessLexical({ html: `<p data-id="p1">${'w'.repeat(70)}<br>x</p>` });
    selectText(long, { block: 'p1', offset: 72 });
    const before = long.instance.getState().caret?.textBefore ?? '';
    expect(before).toHaveLength(64);
    expect(before.endsWith('w\nx')).toBe(true);
  });

  it('V-018: Mod+A selects the whole document, reported as text from the first to the last text point', () => {
    const headless = headlessLexical({
      html: '<hr data-id="d1"><h2 data-id="h1">Tides</h2><table data-id="t1"><tbody><tr><td><p>a</p></td><td><p>bc</p></td></tr></tbody></table>',
    });
    selectText(headless, { block: 't1', cell: { row: 0, column: 1, paragraph: 0 }, offset: 1 });
    const { event, record } = keyEvent('a', { meta: true });
    expect(headless.editor.dispatchCommand(lexical.SELECT_ALL_COMMAND, event)).toBe(true);
    headless.editor.read(() => undefined);
    expect(record.prevented).toBe(0);
    const trailing = headless.instance.getBlocks().roots.at(-1)!;
    expect(headless.instance.getState().selection).toEqual({
      kind: 'text',
      anchor: { block: 'h1', offset: 0 },
      head: { block: trailing, offset: 0 },
      empty: false,
    });
    // It spans every block, the divider before its first text point included.
    expect(headless.instance.getState().blockKinds).toEqual([
      'divider',
      'heading:2',
      'table',
      'paragraph',
    ]);
    // Typing over it acts as at the caret in one empty paragraph with a fresh identifier.
    headless.editor.dispatchCommand(lexical.CONTROLLED_TEXT_INSERTION_COMMAND, 'x');
    headless.editor.read(() => undefined);
    const [only, ...rest] = headless.instance.getBlocks().ordered();
    expect(rest).toEqual([]);
    expect(only).toMatchObject({ kind: 'paragraph' });
    expect(['d1', 'h1', 't1', trailing]).not.toContain(only!.id);
    expect(headless.instance.getContent('text')).toBe('x');
  });

  it('Mod+A is never swallowed while editable; read-only leaves it to the widget', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">ab</p><p data-id="p2">c</p>' });
    // Read-only, the engine dispatches no key command; the adapter remembers no select-all.
    headless.instance.setEditable(false);
    headless.editor.dispatchCommand(lexical.SELECT_ALL_COMMAND, keyEvent('a').event);
    expect(headless.rt.selectAll).toBe(false);
    headless.instance.setEditable(true);
    headless.editor.dispatchCommand(lexical.SELECT_ALL_COMMAND, keyEvent('a').event);
    headless.editor.read(() => undefined);
    expect(headless.instance.getState().selection).toMatchObject({
      anchor: { block: 'p1', offset: 0 },
      head: { block: 'p2', offset: 1 },
    });
    // Deleting it leaves one empty paragraph with a fresh identifier.
    headless.editor.dispatchCommand(lexical.DELETE_CHARACTER_COMMAND, true);
    headless.editor.read(() => undefined);
    expect(headless.instance.getBlocks().ordered()).toMatchObject([
      { kind: 'paragraph', empty: true, id: expect.stringMatching(/^gen\d{4}$/u) },
    ]);
    // Any other selection forgets it.
    expect(headless.rt.selectAll).toBe(false);
  });
});

describe('uwg-te-req-engine-4: the state is deeply frozen', () => {
  const run = (
    headless: Headless,
    actions: readonly TextEditorAction[],
    focus: boolean | undefined = false,
  ) => headless.instance.execute(actions, { reason: 'imperative-action', focus });
  /** Every path of a value whose object is not frozen. */
  function unfrozen(value: unknown, path = 'state', out: string[] = []): string[] {
    if (typeof value !== 'object' || value === null) return out;
    if (!Object.isFrozen(value)) out.push(path);
    for (const [key, member] of Object.entries(value)) unfrozen(member, `${path}.${key}`, out);
    return out;
  }

  it('every object of the state is frozen, the cell of a text point in a table included', () => {
    const headless = headlessLexical({
      html: '<table data-id="t1"><tbody><tr><td><p>ab</p></td><td><p>cd</p></td></tr></tbody></table>',
    });
    run(headless, [
      {
        type: 'selection.set',
        selection: {
          kind: 'text',
          anchor: { block: 't1', cell: { row: 0, column: 1, paragraph: 0 }, offset: 1 },
        },
      },
    ]);
    expect(unfrozen(headless.instance.getState())).toEqual([]);
    run(headless, [
      {
        type: 'selection.set',
        selection: {
          kind: 'text',
          anchor: { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 },
          head: { block: 't1', cell: { row: 0, column: 1, paragraph: 0 }, offset: 2 },
        },
      },
    ]);
    expect(unfrozen(headless.instance.getState())).toEqual([]);
  });
});

describe('uwg-te-req-engine-4: alignment and block-selection identifiers', () => {
  const run = (headless: Headless, ...actions: TextEditorAction[]) =>
    headless.instance.execute(actions, { reason: 'imperative-action', focus: false });
  const range = (
    anchor: { block: string; offset: number },
    head: { block: string; offset: number },
  ): TextEditorAction => ({ type: 'selection.set', selection: { kind: 'text', anchor, head } });
  it('state.align leaves code blocks out', () => {
    const headless = headlessLexical({
      html: '<blockquote data-id="q1" style="text-align: center"><p>quoted</p></blockquote><pre data-id="k1"><code>x</code></pre>',
    });
    run(headless, range({ block: 'q1', offset: 0 }, { block: 'k1', offset: 1 }));
    expect(headless.instance.getState().align).toBe('center');
  });

  it('a block selection holds and reports the topmost blocks, state.block the first', () => {
    const headless = headlessLexical({
      html: '<ul><li data-id="a"><p>one</p><ul><li data-id="b"><p>two</p></li></ul></li></ul><p data-id="p1">x</p>',
    });
    run(headless, { type: 'selection.set', selection: { kind: 'blocks', ids: ['b', 'p1', 'a'] } });
    const state = headless.instance.getState();
    expect(state.selection).toEqual({ kind: 'blocks', ids: ['a', 'p1'] });
    expect(state.block?.id).toBe('a');
  });
});
