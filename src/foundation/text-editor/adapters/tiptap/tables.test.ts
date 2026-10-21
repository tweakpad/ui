import * as core from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import type { TextEditorAction } from '../../actions.js';
import {
  canonicalize,
  type TextEditorPortableDraftTable,
  type TextEditorPortableTableCell,
} from '../../content/portable.js';
import type { TextEditorContentInput, TextEditorEngineInstance } from '../../engine.js';
import { TP_ACTION_META } from './work.js';
import { toTiptapJson, type TiptapJson } from './mapping.js';
import type { TiptapPluginLike, TiptapTransactionLike } from './modules.js';
import { TABLE_SELECTION_FLAG } from './schema.js';
import {
  mountedKeys,
  mountTiptap,
  pluginName,
  type StubView,
  html,
  runActions,
  selectIn,
} from './tiptap-stubs.test.js';

const REASON = { reason: 'imperative-action' } as const;

/** A cell holding one paragraph of text, or an empty one. */
const cell = (
  text = '',
  extra: Partial<Omit<TextEditorPortableTableCell, 'paragraphs'>> = {},
): TextEditorPortableTableCell => ({
  ...extra,
  paragraphs: [{ content: text ? [{ type: 'text', text }] : [] }],
});

/** A row of text cells. */
const row = (...texts: string[]) => ({ cells: texts.map((text) => cell(text)) });

/** A document of a paragraph `p1` and the table `t1`, as native JSON content. */
function tableInput(
  table: Omit<TextEditorPortableDraftTable, 'type' | 'id'>,
): TextEditorContentInput {
  const document = canonicalize({
    blocks: [
      { type: 'paragraph', id: 'p1', content: [{ type: 'text', text: 'lead' }] },
      { type: 'table', id: 't1', headerRow: false, headerColumn: false, ...table },
    ],
  }).document;
  return { content: toTiptapJson(document), format: 'json' };
}

/** A 3×3 table A1…C3 with a header row. */
const GRID = () =>
  tableInput({
    headerRow: true,
    rows: [row('A1', 'B1', 'C1'), row('A2', 'B2', 'C2'), row('A3', 'B3', 'C3')],
  });

/** The table node of the instance's native JSON. */
function tableJson(instance: TextEditorEngineInstance): TiptapJson {
  const json = instance.getContent('json') as TiptapJson;
  return json.content!.find((node) => node.type === 'table')!;
}

/** The cell texts by row, the paragraphs of a cell joined with `/`. */
function texts(instance: TextEditorEngineInstance): string[][] {
  return tableJson(instance).content!.map((tableRow) =>
    (tableRow.content ?? []).map((tableCell) =>
      tableCell
        .content!.map((paragraph) => (paragraph.content ?? []).map((node) => node.text).join(''))
        .join('/'),
    ),
  );
}

/** The cell node types by row: `th` for a header cell, `td` otherwise. */
function types(instance: TextEditorEngineInstance): string[][] {
  return tableJson(instance).content!.map((tableRow) =>
    (tableRow.content ?? []).map((tableCell) => (tableCell.type === 'tableHeader' ? 'th' : 'td')),
  );
}

/** The column widths of each cell by row. */
function colwidths(instance: TextEditorEngineInstance): unknown[][] {
  return tableJson(instance).content!.map((tableRow) =>
    (tableRow.content ?? []).map((tableCell) => tableCell.attrs?.colwidth ?? null),
  );
}

/** Records the transactions that reach the view. */
function spy(view: StubView): TiptapTransactionLike[] {
  const dispatched: TiptapTransactionLike[] = [];
  const dispatch = view.dispatch.bind(view);
  view.dispatch = (tr: TiptapTransactionLike) => {
    dispatched.push(tr);
    dispatch(tr);
  };
  return dispatched;
}

const run = (instance: TextEditorEngineInstance, ...actions: TextEditorAction[]) =>
  instance.execute(actions, REASON);

describe('Tiptap table actions (uwg-te-tab-actions r7, uwg-te-req-tables-1)', () => {
  it('V-045: each of the 15 table actions applies as one transaction with the action meta', () => {
    const merged = tableInput({
      rows: [{ cells: [cell('M', { colSpan: 2 }), cell('c')] }, row('d', 'e', 'f')],
    });
    const range = { anchor: { row: 0, column: 0 }, head: { row: 1, column: 1 } };
    const cases: [TextEditorAction, TextEditorContentInput][] = [
      [{ type: 'table.insert-row', table: 't1', index: 1 }, GRID()],
      [{ type: 'table.insert-column', table: 't1', index: 3 }, GRID()],
      [{ type: 'table.delete-rows', table: 't1', from: 1, to: 1 }, GRID()],
      [{ type: 'table.delete-columns', table: 't1', from: 0, to: 1 }, GRID()],
      [{ type: 'table.move-row', table: 't1', from: 0, to: 2 }, GRID()],
      [{ type: 'table.move-column', table: 't1', from: 2, to: 0 }, GRID()],
      [{ type: 'table.duplicate-row', table: 't1', index: 1 }, GRID()],
      [{ type: 'table.duplicate-column', table: 't1', index: 0 }, GRID()],
      [{ type: 'table.merge-cells', table: 't1', range }, GRID()],
      [{ type: 'table.split-cell', table: 't1', cell: { row: 0, column: 1 } }, merged],
      [{ type: 'table.set-header', table: 't1', column: true }, GRID()],
      [{ type: 'table.align', table: 't1', target: { column: 1 }, align: 'center' }, GRID()],
      [{ type: 'table.background', table: 't1', target: { all: true }, color: 'blue' }, GRID()],
      [{ type: 'table.column-widths', table: 't1', widths: [100, 120, 140] }, GRID()],
      [{ type: 'table.clear-cells', table: 't1', range }, GRID()],
    ];
    for (const [action, content] of cases) {
      const { instance, view, context } = mountTiptap({ content });
      const before = JSON.stringify(instance.getContent('json'));
      expect(instance.can(action), action.type).toBe(true);
      // `can` is a dry run: nothing changed.
      expect(JSON.stringify(instance.getContent('json'))).toBe(before);
      const dispatched = spy(view);
      expect(run(instance, action), action.type).toBe(true);
      expect(dispatched, action.type).toHaveLength(1);
      expect(dispatched[0]!.getMeta(TP_ACTION_META)).toEqual({
        reason: 'imperative-action',
        type: action.type,
      });
      expect(context.changes.at(-1)).toMatchObject({ cause: 'action', action: action.type });
      expect(instance.getState().history.undo, action.type).toBe(true);
    }
  });

  it('V-045: can answers false for moves without table.move and for tables without the table modules', () => {
    const withoutMove = mountTiptap({ content: GRID(), withoutMove: true });
    expect(withoutMove.engine.capabilities.has('table.move')).toBe(false);
    for (const type of ['table.move-row', 'table.move-column'] as const)
      expect(withoutMove.instance.can({ type, table: 't1', from: 0, to: 1 })).toBe(false);
    expect(withoutMove.instance.can({ type: 'table.insert-row', table: 't1', index: 0 })).toBe(
      true,
    );
    const plain = mountTiptap({ content: GRID(), tables: false });
    const range = { anchor: { row: 0, column: 0 }, head: { row: 0, column: 1 } };
    expect(plain.instance.can({ type: 'table.merge-cells', table: 't1', range })).toBe(false);
    expect(
      plain.instance.can({ type: 'table.split-cell', table: 't1', cell: { row: 0, column: 0 } }),
    ).toBe(false);
    expect(plain.instance.can({ type: 'table.insert-row', table: 't1', index: 0 })).toBe(false);
  });

  it('refuses out-of-range lines, unknown tables and deleting every line, changing nothing', () => {
    const { instance } = mountTiptap({ content: GRID() });
    const before = JSON.stringify(instance.getContent('json'));
    const refused: TextEditorAction[] = [
      { type: 'table.insert-row', table: 't1', index: 4 },
      { type: 'table.insert-column', table: 'p1', index: 0 },
      { type: 'table.delete-rows', table: 't1', from: 0, to: 2 },
      { type: 'table.delete-columns', table: 't1', from: 2, to: 3 },
      { type: 'table.move-row', table: 't1', from: 0, to: 3 },
      { type: 'table.duplicate-row', table: 't1', index: 3 },
      { type: 'table.align', table: 't1', target: { row: 7 }, align: 'end' },
      { type: 'table.column-widths', table: 't1', widths: [100, 100] },
      { type: 'table.set-header', table: 't1' },
      { type: 'table.insert-row', table: 'missing', index: 0 },
    ];
    for (const action of refused) {
      expect(instance.can(action), JSON.stringify(action)).toBe(false);
      expect(run(instance, action)).toBe(false);
    }
    expect(JSON.stringify(instance.getContent('json'))).toBe(before);
    // A list fails as a whole when one table action fails.
    expect(
      run(
        instance,
        { type: 'table.insert-row', table: 't1', index: 1 },
        { type: 'table.insert-row', table: 't1', index: 9 },
      ),
    ).toBe(false);
    expect(JSON.stringify(instance.getContent('json'))).toBe(before);
  });

  it('inserts rows and columns, the caret in the first cell of the new line with select', () => {
    const { instance } = mountTiptap({ content: GRID() });
    expect(run(instance, { type: 'table.insert-row', table: 't1', index: 3, select: true })).toBe(
      true,
    );
    expect(texts(instance)).toEqual([
      ['A1', 'B1', 'C1'],
      ['A2', 'B2', 'C2'],
      ['A3', 'B3', 'C3'],
      ['', '', ''],
    ]);
    expect(instance.getState().selection).toMatchObject({
      kind: 'text',
      head: { block: 't1', cell: { row: 3, column: 0, paragraph: 0 }, offset: 0 },
    });
    expect(
      run(instance, { type: 'table.insert-column', table: 't1', index: 1, select: true }),
    ).toBe(true);
    expect(texts(instance)[0]).toEqual(['A1', '', 'B1', 'C1']);
    expect(instance.getState().selection).toMatchObject({
      head: { block: 't1', cell: { row: 0, column: 1, paragraph: 0 } },
    });
    expect(instance.getTable('t1')).toMatchObject({ rows: 4, columns: 4, headerRow: true });
  });

  it('deletes rows and columns, moving a caret in a deleted line to the nearest remaining cell', () => {
    const { instance } = mountTiptap({ content: GRID() });
    run(instance, {
      type: 'selection.set',
      selection: { kind: 'caret', block: 't1', cell: { row: 2, column: 1 }, position: 'start' },
    });
    expect(run(instance, { type: 'table.delete-rows', table: 't1', from: 1, to: 2 })).toBe(true);
    expect(texts(instance)).toEqual([['A1', 'B1', 'C1']]);
    expect(instance.getState().selection).toMatchObject({
      head: { block: 't1', cell: { row: 0, column: 1 } },
    });
    expect(run(instance, { type: 'table.delete-columns', table: 't1', from: 0, to: 1 })).toBe(true);
    expect(texts(instance)).toEqual([['C1']]);
    expect(instance.getState().selection).toMatchObject({
      head: { block: 't1', cell: { row: 0, column: 0 } },
    });
  });

  it('moves a row or a column and selects the moved line; moves are refused while merged', () => {
    const { instance } = mountTiptap({ content: GRID() });
    expect(run(instance, { type: 'table.move-row', table: 't1', from: 2, to: 0 })).toBe(true);
    expect(texts(instance).map((cells) => cells[0])).toEqual(['A3', 'A1', 'A2']);
    expect(instance.getState().selection).toEqual({
      kind: 'cells',
      table: 't1',
      range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 2 } },
    });
    expect(run(instance, { type: 'table.move-column', table: 't1', from: 0, to: 2 })).toBe(true);
    expect(texts(instance)[0]).toEqual(['B3', 'C3', 'A3']);
    expect(instance.getState().selection).toMatchObject({
      kind: 'cells',
      range: { anchor: { row: 0, column: 2 }, head: { row: 2, column: 2 } },
    });
    expect(run(instance, { type: 'table.move-row', table: 't1', from: 1, to: 1 })).toBe(true);
    const merged = mountTiptap({
      content: tableInput({ rows: [{ cells: [cell('M', { colSpan: 2 })] }, row('a', 'b')] }),
    });
    expect(merged.instance.can({ type: 'table.move-row', table: 't1', from: 0, to: 1 })).toBe(
      false,
    );
    expect(merged.instance.can({ type: 'table.move-column', table: 't1', from: 0, to: 1 })).toBe(
      false,
    );
  });

  it('duplicates lines with their content, background and alignment; refused across merged cells', () => {
    const { instance } = mountTiptap({
      content: tableInput({
        widths: [60, 90],
        rows: [
          { cells: [cell('a', { background: 'red', align: 'center' }), cell('b')] },
          row('c', 'd'),
        ],
      }),
    });
    expect(run(instance, { type: 'table.duplicate-row', table: 't1', index: 0 })).toBe(true);
    expect(texts(instance)).toEqual([
      ['a', 'b'],
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(instance.getTable('t1')!.cells[2]).toMatchObject({
      row: 1,
      column: 0,
      background: 'red',
      align: 'center',
    });
    expect(run(instance, { type: 'table.duplicate-column', table: 't1', index: 1 })).toBe(true);
    expect(texts(instance)[2]).toEqual(['c', 'd', 'd']);
    expect(instance.getTable('t1')!.widths).toEqual([60, 90, 90]);
    const spanning = mountTiptap({
      content: tableInput({
        rows: [{ cells: [cell('M', { rowSpan: 2 }), cell('b')] }, row('d'), row('e', 'f')],
      }),
    });
    expect(spanning.instance.can({ type: 'table.duplicate-row', table: 't1', index: 0 })).toBe(
      false,
    );
    // A cell merged only within the duplicated column is copied with its span.
    expect(run(spanning.instance, { type: 'table.duplicate-column', table: 't1', index: 0 })).toBe(
      true,
    );
    expect(spanning.instance.getTable('t1')!.cells.slice(0, 2)).toMatchObject([
      { row: 0, column: 0, rowSpan: 2 },
      { row: 0, column: 1, rowSpan: 2 },
    ]);
  });

  it('merges a range into its first cell with the non-empty contents in row-major order', () => {
    const { instance } = mountTiptap({
      content: tableInput({ rows: [row('a', '', 'c'), row('', 'e', 'f'), row('g', 'h', 'i')] }),
    });
    const range = { anchor: { row: 1, column: 1 }, head: { row: 0, column: 0 } };
    expect(run(instance, { type: 'table.merge-cells', table: 't1', range })).toBe(true);
    expect(texts(instance)).toEqual([['a/e', 'c'], ['f'], ['g', 'h', 'i']]);
    const model = instance.getTable('t1')!;
    expect(model.cells[0]).toMatchObject({ row: 0, column: 0, rowSpan: 2, colSpan: 2 });
    expect(model.merged).toBe(true);
    // The caret ends the merged cell.
    expect(instance.getState().selection).toMatchObject({
      kind: 'text',
      head: { block: 't1', cell: { row: 0, column: 0, paragraph: 1 }, offset: 1 },
    });
    // A range that cuts a merged cell grows to cover it.
    expect(
      run(instance, {
        type: 'table.merge-cells',
        table: 't1',
        range: { anchor: { row: 1, column: 1 }, head: { row: 2, column: 2 } },
      }),
    ).toBe(true);
    expect(instance.getTable('t1')!.cells[0]).toMatchObject({ rowSpan: 3, colSpan: 3 });
    // The rows that the merged cell covers hold no cell of their own.
    expect(texts(instance)).toEqual([['a/e/c/f/g/h/i'], [], []]);
    expect(instance.getTable('t1')).toMatchObject({ rows: 3, columns: 3, cells: [{ rowSpan: 3 }] });
    const single = { anchor: { row: 0, column: 0 }, head: { row: 0, column: 0 } };
    const { instance: plain } = mountTiptap({ content: GRID() });
    expect(plain.can({ type: 'table.merge-cells', table: 't1', range: single })).toBe(false);
  });

  it('splits a merged cell, its content staying in the first cell and the others empty', () => {
    const { instance } = mountTiptap({
      content: tableInput({
        rows: [
          { cells: [cell('M', { colSpan: 2, rowSpan: 2, background: 'green' }), cell('c')] },
          row('f'),
        ],
      }),
    });
    expect(
      instance.can({ type: 'table.split-cell', table: 't1', cell: { row: 0, column: 2 } }),
    ).toBe(false);
    expect(
      run(instance, { type: 'table.split-cell', table: 't1', cell: { row: 1, column: 1 } }),
    ).toBe(true);
    expect(texts(instance)).toEqual([
      ['M', '', 'c'],
      ['', '', 'f'],
    ]);
    const model = instance.getTable('t1')!;
    expect(model.merged).toBe(false);
    // The new cells take the background of the split cell, as the engine copies it.
    expect(model.cells.filter((entry) => entry.background === 'green')).toHaveLength(4);
    expect(instance.getState().selection).toMatchObject({
      head: { block: 't1', cell: { row: 0, column: 0, paragraph: 0 } },
    });
  });

  it('aligns cells and sets their background by row, column, range or all; start restores', () => {
    const { instance } = mountTiptap({ content: GRID() });
    run(instance, { type: 'table.align', table: 't1', target: { row: 1 }, align: 'end' });
    run(instance, {
      type: 'table.background',
      table: 't1',
      target: { range: { anchor: { row: 0, column: 0 }, head: { row: 1, column: 1 } } },
      color: 'purple',
    });
    const model = instance.getTable('t1')!;
    expect(model.cells.map((entry) => entry.align)).toEqual([
      null,
      null,
      null,
      'end',
      'end',
      'end',
      null,
      null,
      null,
    ]);
    expect(model.cells.map((entry) => entry.background)).toEqual([
      'purple',
      'purple',
      null,
      'purple',
      'purple',
      null,
      null,
      null,
      null,
    ]);
    run(instance, { type: 'table.align', table: 't1', target: { all: true }, align: 'start' });
    run(instance, { type: 'table.background', table: 't1', target: { column: 0 }, color: null });
    const after = instance.getTable('t1')!;
    expect(after.cells.every((entry) => entry.align === null)).toBe(true);
    expect(after.cells.map((entry) => entry.background)).toEqual([
      null,
      'purple',
      null,
      null,
      'purple',
      null,
      null,
      null,
      null,
    ]);
  });

  it('clears the cells of a range to one empty paragraph each and keeps the table', () => {
    const { instance } = mountTiptap({
      content: tableInput({
        rows: [
          {
            cells: [
              { paragraphs: [{ content: [{ type: 'text', text: 'x' }] }, { content: [] }] },
              cell('b'),
            ],
          },
          row('c', 'd'),
        ],
      }),
    });
    const range = { anchor: { row: 0, column: 0 }, head: { row: 1, column: 0 } };
    expect(run(instance, { type: 'table.clear-cells', table: 't1', range })).toBe(true);
    expect(texts(instance)).toEqual([
      ['', 'b'],
      ['', 'd'],
    ]);
  });

  it('Backspace and Delete over a cell range clear its cells and keep the table', () => {
    for (const key of ['Backspace', 'Delete']) {
      const { instance, view } = mountTiptap({ content: GRID() });
      view.dispatch = view.dispatch.bind(view);
      run(instance, {
        type: 'selection.set',
        selection: {
          kind: 'cells',
          table: 't1',
          range: { anchor: { row: 1, column: 0 }, head: { row: 2, column: 2 } },
        },
      });
      const editing = view.state.plugins.find(
        (plugin) => pluginName(plugin) === 'selectingCells',
      ) as
        | (TiptapPluginLike & {
            spec: { props: { handleKeyDown: (view: StubView, event: object) => boolean } };
          })
        | undefined;
      const handled = editing!.spec.props.handleKeyDown(view, {
        key,
        keyCode: key === 'Backspace' ? 8 : 46,
        shiftKey: false,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
      });
      expect(handled).toBe(true);
      expect(texts(instance)).toEqual([
        ['A1', 'B1', 'C1'],
        ['', '', ''],
        ['', '', ''],
      ]);
    }
  });

  it('paints a cell range through decorations, never the engine selected-cell class', () => {
    const { instance, view } = mountTiptap({ content: GRID() });
    const painted = () => {
      const state = core.DECORATION_MANAGER_PLUGIN_KEY.getState(view.state as never) as
        | {
            mergedDecorationSet: {
              find(): {
                from: number;
                to: number;
                type: { attrs: Record<string, string> };
                spec: Record<string, unknown>;
              }[];
            };
          }
        | undefined;
      return state?.mergedDecorationSet.find() ?? [];
    };
    expect(painted()).toEqual([]);
    run(instance, {
      type: 'selection.set',
      selection: {
        kind: 'cells',
        table: 't1',
        range: { anchor: { row: 0, column: 1 }, head: { row: 1, column: 2 } },
      },
    });
    const decorations = painted();
    expect(
      decorations.filter((entry) => entry.type.attrs.class === 'tp-te-cell-selected'),
    ).toHaveLength(4);
    expect(decorations.filter((entry) => entry.spec[TABLE_SELECTION_FLAG] === true)).toHaveLength(
      1,
    );
    expect(decorations.some((entry) => entry.type.attrs.class?.includes('selectedCell'))).toBe(
      false,
    );
    run(instance, {
      type: 'selection.set',
      selection: { kind: 'caret', block: 'p1', position: 'end' },
    });
    expect(painted()).toEqual([]);
  });

  it('no plugin of the mount decorates a cell range with the engine selected-cell class (uwg-te-req-tables-5)', () => {
    const { instance, view } = mountTiptap({ content: GRID() });
    // Every decoration set that a plugin of the mount gives the view, the engine's own included.
    const classes = (): string[] =>
      view.state.plugins.flatMap((plugin) => {
        const decorations = (
          plugin as unknown as {
            readonly props: { readonly decorations?: (state: unknown) => unknown };
          }
        ).props.decorations;
        const set = decorations?.(view.state) as
          | { find(): { readonly type: { readonly attrs?: { readonly class?: string } } }[] }
          | null
          | undefined;
        return (set?.find() ?? []).flatMap((entry) => entry.type.attrs?.class ?? []);
      });
    run(instance, {
      type: 'selection.set',
      selection: {
        kind: 'cells',
        table: 't1',
        range: { anchor: { row: 0, column: 1 }, head: { row: 1, column: 2 } },
      },
    });
    const painted = classes();
    expect(painted.filter((name) => name === 'tp-te-cell-selected')).toHaveLength(4);
    expect(painted.filter((name) => name.split(' ').includes('selectedCell'))).toEqual([]);
  });
});

describe('Tiptap table carets (uwg-te-req-tables-1)', () => {
  it('a selection outside the inserted or deleted lines moves with its cells', () => {
    const { instance } = mountTiptap({
      content: tableInput({ rows: [row('a', 'b'), row('c', 'dd'), row('e', 'f')] }),
    });
    const caret = (line: number, offset: number) =>
      run(instance, {
        type: 'selection.set',
        selection: {
          kind: 'text',
          anchor: { block: 't1', cell: { row: line, column: 1, paragraph: 0 }, offset },
        },
      });
    caret(1, 1);
    expect(run(instance, { type: 'table.insert-row', table: 't1', index: 0 })).toBe(true);
    expect(instance.getState().selection).toMatchObject({
      anchor: { block: 't1', cell: { row: 2, column: 1, paragraph: 0 }, offset: 1 },
    });
    expect(run(instance, { type: 'table.delete-rows', table: 't1', from: 0, to: 1 })).toBe(true);
    expect(instance.getState().selection).toMatchObject({
      anchor: { block: 't1', cell: { row: 0, column: 1, paragraph: 0 }, offset: 1 },
    });
    // A caret in a deleted line moves to the start of the nearest remaining cell.
    expect(run(instance, { type: 'table.delete-rows', table: 't1', from: 0, to: 0 })).toBe(true);
    expect(instance.getState().selection).toMatchObject({
      anchor: { block: 't1', cell: { row: 0, column: 1, paragraph: 0 }, offset: 0 },
    });
  });
});

describe('Tiptap table structure (uwg-te-req-tables-1, uwg-te-tab-engine r8)', () => {
  it('V-424: header flags apply again after insert, move, delete, merge and duplicate', () => {
    const { instance } = mountTiptap({ content: GRID() });
    expect(types(instance)).toEqual([
      ['th', 'th', 'th'],
      ['td', 'td', 'td'],
      ['td', 'td', 'td'],
    ]);
    run(instance, { type: 'table.insert-row', table: 't1', index: 0 });
    expect(types(instance).map((cells) => cells[0])).toEqual(['th', 'td', 'td', 'td']);
    expect(texts(instance)[1]![0]).toBe('A1');
    // A moved header row never carries header cells.
    run(instance, { type: 'table.move-row', table: 't1', from: 1, to: 3 });
    expect(types(instance).map((cells) => cells[0])).toEqual(['th', 'td', 'td', 'td']);
    expect(texts(instance)[3]![0]).toBe('A1');
    run(instance, { type: 'table.delete-rows', table: 't1', from: 0, to: 0 });
    expect(types(instance)[0]).toEqual(['th', 'th', 'th']);
    expect(texts(instance)[0]![0]).toBe('A2');
    run(instance, { type: 'table.set-header', table: 't1', column: true });
    expect(types(instance)).toEqual([
      ['th', 'th', 'th'],
      ['th', 'td', 'td'],
      ['th', 'td', 'td'],
    ]);
    run(instance, { type: 'table.duplicate-row', table: 't1', index: 0 });
    expect(types(instance)[1]).toEqual(['th', 'td', 'td']);
    run(instance, { type: 'table.duplicate-column', table: 't1', index: 0 });
    expect(types(instance)[2]).toEqual(['th', 'td', 'td', 'td']);
    run(instance, {
      type: 'table.merge-cells',
      table: 't1',
      range: { anchor: { row: 1, column: 0 }, head: { row: 2, column: 1 } },
    });
    expect(types(instance)[1]![0]).toBe('th');
    expect(instance.getTable('t1')).toMatchObject({
      headerRow: true,
      headerColumn: true,
      merged: true,
    });
    run(instance, { type: 'table.set-header', table: 't1', row: false, column: false });
    expect(
      types(instance)
        .flat()
        .every((type) => type === 'td'),
    ).toBe(true);
  });

  it('V-424: widths stay null until the first commit, then every column has at least 48', () => {
    const { instance } = mountTiptap({ content: GRID() });
    run(instance, { type: 'table.insert-column', table: 't1', index: 1 });
    expect(instance.getTable('t1')!.widths).toBeNull();
    expect(
      colwidths(instance)
        .flat()
        .every((width) => width === null),
    ).toBe(true);
    run(instance, { type: 'table.column-widths', table: 't1', widths: [10, 200, 47.5, 64] });
    expect(instance.getTable('t1')!.widths).toEqual([48, 200, 48, 64]);
    expect(colwidths(instance)[0]).toEqual([[48], [200], [48], [64]]);
    // An inserted column takes the width of the column before it.
    run(instance, { type: 'table.insert-column', table: 't1', index: 2 });
    expect(instance.getTable('t1')!.widths).toEqual([48, 200, 200, 48, 64]);
    run(instance, { type: 'table.delete-columns', table: 't1', from: 0, to: 1 });
    expect(instance.getTable('t1')!.widths).toEqual([200, 48, 64]);
    run(instance, {
      type: 'table.merge-cells',
      table: 't1',
      range: { anchor: { row: 1, column: 0 }, head: { row: 1, column: 1 } },
    });
    expect(colwidths(instance)[1]).toEqual([[200, 48], [64]]);
    run(instance, { type: 'table.column-widths', table: 't1', widths: null });
    expect(instance.getTable('t1')!.widths).toBeNull();
  });

  it('V-424: spans and merged are computed in the table model', () => {
    const { instance } = mountTiptap({
      content: tableInput({
        headerRow: true,
        rows: [
          { cells: [cell('a', { colSpan: 2 }), cell('b', { rowSpan: 2 })] },
          row('c', 'd'),
          row('e', 'f', 'g'),
        ],
      }),
    });
    const model = instance.getTable('t1')!;
    expect(model).toMatchObject({ rows: 3, columns: 3, merged: true, headerRow: true });
    expect(model.cells.slice(0, 2)).toMatchObject([
      { row: 0, column: 0, colSpan: 2, rowSpan: 1, header: true },
      { row: 0, column: 2, colSpan: 1, rowSpan: 2, header: true },
    ]);
    expect(model.grid).toEqual([
      [0, 0, 1],
      [2, 3, 1],
      [4, 5, 6],
    ]);
    expect(instance.getTable('p1')).toBeNull();
  });
});

describe('uwg-te-req-tables-1: the selection a table edit keeps', () => {
  it('a kept caret in a deleted row goes to the same column of the next row; others keep their offset', () => {
    const source =
      '<table data-id="t1"><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr><tr><td><p>longtext</p></td><td><p>one</p></td></tr><tr><td><p>x</p></td><td><p>b2</p></td></tr></tbody></table><p data-id="p1">z</p>';
    const removed = mountTiptap({ content: html(source) });
    selectIn(removed.instance, {
      kind: 'text',
      anchor: { block: 't1', cell: { row: 1, column: 0, paragraph: 0 }, offset: 8 },
    });
    expect(
      runActions(removed.instance, { type: 'table.delete-rows', table: 't1', from: 1, to: 1 }),
    ).toBe(true);
    expect(removed.instance.getState().selection).toMatchObject({
      head: { block: 't1', cell: { row: 1, column: 0, paragraph: 0 }, offset: 0 },
    });
    const kept = mountTiptap({ content: html(source) });
    selectIn(kept.instance, {
      kind: 'text',
      anchor: { block: 't1', cell: { row: 2, column: 1, paragraph: 0 }, offset: 2 },
    });
    expect(
      runActions(kept.instance, { type: 'table.delete-rows', table: 't1', from: 1, to: 1 }),
    ).toBe(true);
    expect(kept.instance.getState().selection).toMatchObject({
      head: { block: 't1', cell: { row: 1, column: 1, paragraph: 0 }, offset: 2 },
    });
  });
});

describe('uwg-te-req-tables-5: a cell range touching a merged cell', () => {
  // The cell (1,1) spans rows 1–2 and columns 1–2, as in the parity corpus's third table.
  const MERGED = () =>
    tableInput({
      rows: [
        row('Day', 'A', 'B', 'C'),
        { cells: [cell('Monday'), cell('Live', { rowSpan: 2, colSpan: 2 }), cell('Talk')] },
        row('Tuesday', 'News'),
        row('Wednesday', 'Quiz', 'Archive', 'Music'),
      ],
    });
  const range = (anchor: readonly [number, number], head: readonly [number, number]) => ({
    kind: 'cells' as const,
    table: 't1',
    range: {
      anchor: { row: anchor[0], column: anchor[1] },
      head: { row: head[0], column: head[1] },
    },
  });
  /** The texts of the cells that carry the selected-cell decoration, in document order. */
  const paintedCells = (view: StubView): string[] =>
    (
      (
        core.DECORATION_MANAGER_PLUGIN_KEY.getState(view.state as never) as unknown as {
          mergedDecorationSet: {
            find(): { from: number; type: { attrs: Record<string, string> } }[];
          };
        }
      ).mergedDecorationSet.find() ?? []
    )
      .filter((entry) => entry.type.attrs.class === 'tp-te-cell-selected')
      .map((entry) => view.state.doc.nodeAt(entry.from)!.textContent);

  it('paints every cell of the range grown over the merged cell', () => {
    const { instance, view } = mountTiptap({ content: MERGED() });
    expect(selectIn(instance, range([2, 0], [3, 1]))).toBe(true);
    expect(instance.getState().selection).toEqual(range([2, 0], [3, 1]));
    expect(paintedCells(view)).toEqual([
      'Monday',
      'Live',
      'Tuesday',
      'Wednesday',
      'Quiz',
      'Archive',
    ]);
  });

  it('Shift with an arrow key extends a range by the shared grid rule, at the table’s edge too', () => {
    const mounted = mountTiptap({ content: MERGED() });
    const keys = mountedKeys(mounted);
    const { instance } = mounted;
    selectIn(instance, range([2, 0], [2, 0]));
    expect(keys.press('Shift-ArrowRight')).toBe(true);
    expect(instance.getState().selection).toEqual(range([2, 0], [1, 1]));
    expect(keys.press('Shift-ArrowDown')).toBe(true);
    expect(instance.getState().selection).toEqual(range([2, 0], [3, 1]));
    selectIn(instance, range([2, 0], [3, 3]));
    expect(keys.press('Shift-ArrowDown')).toBe(true);
    expect(instance.getState().selection).toEqual(range([2, 0], [3, 3]));
  });

  it('Shift with an arrow key at the end of a cell’s text starts a range from that cell', () => {
    const mounted = mountTiptap({ content: MERGED() });
    const keys = mountedKeys(mounted);
    const { instance } = mounted;
    const tuesday = { block: 't1', cell: { row: 2, column: 0, paragraph: 0 }, offset: 7 };
    selectIn(instance, { kind: 'text', anchor: tuesday });
    expect(keys.press('Shift-ArrowRight')).toBe(true);
    expect(instance.getState().selection).toEqual(range([2, 0], [1, 1]));
    // Within the text the key is the engine's.
    selectIn(instance, { kind: 'text', anchor: { ...tuesday, offset: 3 } });
    expect(keys.press('Shift-ArrowRight')).toBe(false);
  });
});
