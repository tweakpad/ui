/**
 * Tables on Lexical (Widgets `uwg-te-req-tables-1`, `uwg-te-tab-actions` r7,
 * `uwg-te-req-tables-3`).
 */
import * as lexical from 'lexical';
import { describe, expect, it } from 'vitest';
import type { TextEditorAction } from '../../actions.js';
import type { TextEditorSelectionInput, TextEditorTableModel } from '../../model.js';
import { tableTargetCells } from '../shared/tables.js';
import { keyEvent } from '../shared/test-helpers.test.js';
import { $holderById } from './ids.js';
import { $cellAddress } from './points.js';
import { headlessLexical, realLexicalModules, rootedLexical } from './lexical-stubs.test.js';
import type { TextEditorLexicalModules } from './modules.js';

const grid3 =
  '<table data-id="t1"><thead><tr><th><p>a1</p></th><th><p>a2</p></th><th><p>a3</p></th></tr></thead>' +
  '<tbody><tr><td><p>b1</p></td><td><p>b2</p></td><td><p>b3</p></td></tr>' +
  '<tr><td><p>c1</p></td><td><p>c2</p></td><td><p>c3</p></td></tr></tbody></table>';

function setup(html = grid3, modules?: TextEditorLexicalModules) {
  const headless = headlessLexical({ html, ...(modules ? { modules } : {}) });
  const { instance } = headless;
  const run = (action: TextEditorAction) => instance.execute([action], { reason: 'item-press' });
  const table = () => instance.getTable('t1')!;
  /** The engine's header bits of each cell, row by row. */
  const headerBits = () => {
    const native = instance.getContent('json') as {
      root: { children: { type: string; children: { children: { headerState: number }[] }[] }[] };
    };
    const node = native.root.children.find((child) => child.type === 'table')!;
    return node.children.map((row) => row.children.map((cell) => cell.headerState));
  };
  return { ...headless, run, table, headerBits };
}

/** Header cells exactly where the positional flags put them. */
function expectPositional(model: TextEditorTableModel): void {
  for (const cell of model.cells)
    expect(cell.header, `${cell.row},${cell.column}`).toBe(
      (model.headerRow && cell.row === 0) || (model.headerColumn && cell.column === 0),
    );
}

const texts = (model: TextEditorTableModel, html: string) => {
  void model;
  return [...html.matchAll(/<(?:td|th)[^>]*><p>([^<]*)<\/p>/g)].map((match) => match[1]);
};

describe('uwg-te-req-tables-1: positional headers', () => {
  it('V-424, V-707: header flags apply again after every structural change; moved and copied lines carry none', () => {
    const { run, table, headerBits, instance } = setup();
    expect(run({ type: 'table.set-header', table: 't1', column: true })).toBe(true);
    expect(table()).toMatchObject({ headerRow: true, headerColumn: true });
    expect(headerBits()).toEqual([
      [3, 1, 1],
      [2, 0, 0],
      [2, 0, 0],
    ]);
    const steps: TextEditorAction[] = [
      { type: 'table.move-row', table: 't1', from: 0, to: 1 },
      { type: 'table.insert-column', table: 't1', index: 0 },
      { type: 'table.duplicate-row', table: 't1', index: 0 },
      { type: 'table.delete-rows', table: 't1', from: 0, to: 0 },
      { type: 'table.move-column', table: 't1', from: 0, to: 2 },
    ];
    for (const step of steps) {
      expect(run(step), step.type).toBe(true);
      const model = table();
      expect([model.headerRow, model.headerColumn]).toEqual([true, true]);
      expectPositional(model);
      const bits = headerBits();
      bits.forEach((row, r) =>
        row.forEach((value, c) =>
          expect(value, `${step.type} ${r},${c}`).toBe((r === 0 ? 1 : 0) | (c === 0 ? 2 : 0)),
        ),
      );
    }
    // The row moved down from the top holds td cells, the row moved up th cells.
    const html = instance.getContent('html') as string;
    expect(html).not.toContain('<th scope="col"><p>a');
  });

  it('a new table has a header row and no header column', () => {
    const { run, instance, headerBits } = setup('<p data-id="p1">x</p>');
    run({
      type: 'blocks.insert',
      kind: 'table',
      attrs: { rows: 2, columns: 2, headerRow: true, headerColumn: false },
      at: { after: 'p1' },
    });
    const id = instance.getBlocks().roots[1]!;
    expect(instance.getTable(id)).toMatchObject({
      headerRow: true,
      headerColumn: false,
      rows: 2,
      columns: 2,
    });
    expect(headerBits()).toEqual([
      [1, 1],
      [0, 0],
    ]);
  });
});

describe('uwg-te-tab-actions r7: table actions', () => {
  it('V-045: inserts and deletes rows and columns, spans growing and shrinking', () => {
    const { run, table, instance } = setup();
    expect(run({ type: 'table.insert-row', table: 't1', index: 3 })).toBe(true);
    expect(run({ type: 'table.insert-column', table: 't1', index: 1 })).toBe(true);
    expect(table()).toMatchObject({ rows: 4, columns: 4 });
    expect(run({ type: 'table.delete-columns', table: 't1', from: 1, to: 1 })).toBe(true);
    expect(run({ type: 'table.delete-rows', table: 't1', from: 3, to: 3 })).toBe(true);
    expect(texts(table(), instance.getContent('html') as string)).toEqual([
      'a1',
      'a2',
      'a3',
      'b1',
      'b2',
      'b3',
      'c1',
      'c2',
      'c3',
    ]);
    expect(instance.can({ type: 'table.delete-rows', table: 't1', from: 0, to: 2 })).toBe(false);
    expect(instance.can({ type: 'table.insert-row', table: 't1', index: 9 })).toBe(false);
  });

  it('V-045: an inserted line with select puts the caret in its first cell', () => {
    const { run, instance } = setup();
    run({ type: 'table.insert-row', table: 't1', index: 1, select: true });
    expect(instance.getState().selection).toMatchObject({
      kind: 'text',
      anchor: { block: 't1', cell: { row: 1, column: 0 } },
    });
    run({ type: 'table.insert-column', table: 't1', index: 3, select: true });
    expect(instance.getState().selection).toMatchObject({
      anchor: { cell: { row: 0, column: 3 } },
    });
  });

  it('V-045: merge joins non-empty contents row-major; split restores single cells; moves wait for no merge', () => {
    const { run, table, instance } = setup();
    expect(
      run({
        type: 'table.merge-cells',
        table: 't1',
        range: { anchor: { row: 1, column: 0 }, head: { row: 2, column: 1 } },
      }),
    ).toBe(true);
    const merged = table();
    expect(merged.merged).toBe(true);
    expect(merged.cells[3]).toMatchObject({ row: 1, column: 0, rowSpan: 2, colSpan: 2 });
    expect(instance.getContent('html')).toContain(
      '<td colspan="2" rowspan="2"><p>b1</p><p>b2</p><p>c1</p><p>c2</p></td>',
    );
    expect(instance.getState().selection).toMatchObject({
      anchor: { block: 't1', cell: { row: 1, column: 0 } },
    });
    expect(instance.can({ type: 'table.move-row', table: 't1', from: 0, to: 2 })).toBe(false);
    expect(instance.can({ type: 'table.duplicate-row', table: 't1', index: 1 })).toBe(false);
    expect(run({ type: 'table.split-cell', table: 't1', cell: { row: 2, column: 1 } })).toBe(true);
    expect(table()).toMatchObject({ merged: false, rows: 3, columns: 3 });
    expect(table().cells.filter((cell) => cell.empty)).toHaveLength(3);
    expect(
      instance.can({ type: 'table.split-cell', table: 't1', cell: { row: 0, column: 0 } }),
    ).toBe(false);
  });

  it('V-045: duplicates copy a line after it, content and backgrounds included', () => {
    const { run, table, instance } = setup();
    run({ type: 'table.background', table: 't1', target: { row: 1 }, color: 'green' });
    expect(run({ type: 'table.duplicate-row', table: 't1', index: 1 })).toBe(true);
    expect(run({ type: 'table.duplicate-column', table: 't1', index: 2 })).toBe(true);
    expect(table()).toMatchObject({ rows: 4, columns: 4 });
    expect(texts(table(), instance.getContent('html') as string)).toEqual([
      'a1',
      'a2',
      'a3',
      'a3',
      'b1',
      'b2',
      'b3',
      'b3',
      'b1',
      'b2',
      'b3',
      'b3',
      'c1',
      'c2',
      'c3',
      'c3',
    ]);
    expect(table().cells.filter((cell) => cell.background === 'green')).toHaveLength(8);
  });

  it('V-045: align and background follow their targets as names; clear-cells empties a range', () => {
    const { run, table, instance } = setup();
    run({ type: 'table.align', table: 't1', target: { column: 1 }, align: 'center' });
    run({
      type: 'table.background',
      table: 't1',
      target: { range: { anchor: { row: 1, column: 1 }, head: { row: 2, column: 2 } } },
      color: 'blue',
    });
    run({ type: 'table.align', table: 't1', target: { all: true }, align: null });
    run({ type: 'table.align', table: 't1', target: { row: 0 }, align: 'end' });
    const model = table();
    expect(model.cells.map((cell) => cell.align)).toEqual([
      'end',
      'end',
      'end',
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(model.cells.map((cell) => cell.background)).toEqual([
      null,
      null,
      null,
      null,
      'blue',
      'blue',
      null,
      'blue',
      'blue',
    ]);
    const native = JSON.stringify(instance.getContent('json'));
    expect(native).toContain('"tp-background":"blue"');
    expect(native).not.toMatch(/"backgroundColor":"/);
    run({
      type: 'table.clear-cells',
      table: 't1',
      range: { anchor: { row: 0, column: 0 }, head: { row: 1, column: 1 } },
    });
    expect(table().cells.filter((cell) => cell.empty)).toHaveLength(4);
  });

  it('V-424: widths are null until the first commit, then every column at least 48', () => {
    const { run, table, instance } = setup();
    expect(table().widths).toBeNull();
    expect(instance.can({ type: 'table.column-widths', table: 't1', widths: [100, 100] })).toBe(
      false,
    );
    expect(run({ type: 'table.column-widths', table: 't1', widths: [10, 120, 30] })).toBe(true);
    expect(table().widths).toEqual([48, 120, 48]);
    run({ type: 'table.insert-column', table: 't1', index: 2 });
    expect(table().widths).toEqual([48, 120, 120, 48]);
    run({ type: 'table.delete-columns', table: 't1', from: 0, to: 0 });
    expect(table().widths).toEqual([120, 120, 48]);
    run({ type: 'table.column-widths', table: 't1', widths: null });
    expect(table().widths).toBeNull();
  });

  it('a table action keeps the table node and its key', () => {
    const { run, editor, rt } = setup();
    const key = () => editor.read(() => $holderById(rt, 't1')?.getKey());
    const before = key();
    run({ type: 'table.insert-row', table: 't1', index: 1 });
    expect(key()).toBe(before);
  });

  it('V-045: moves need $moveTableRow; merges need the table module', () => {
    const { $moveTableRow: _move, ...withoutMove } = realLexicalModules.table;
    void _move;
    const { instance } = setup(grid3, {
      ...realLexicalModules,
      table: withoutMove,
    } as TextEditorLexicalModules);
    expect(instance.can({ type: 'table.move-row', table: 't1', from: 0, to: 1 })).toBe(false);
    expect(
      instance.can({
        type: 'table.merge-cells',
        table: 't1',
        range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 1 } },
      }),
    ).toBe(true);
    const full = setup();
    expect(full.instance.can({ type: 'table.move-row', table: 't1', from: 0, to: 1 })).toBe(true);
  });
});

describe('uwg-te-req-tables-5: a cell range touching a merged cell', () => {
  // The cell (1,1) spans rows 1–2 and columns 1–2, as in the parity corpus's third table.
  const merged =
    '<table data-id="t1"><tbody>' +
    '<tr><td><p>Day</p></td><td><p>A</p></td><td><p>B</p></td><td><p>C</p></td></tr>' +
    '<tr><td><p>Monday</p></td><td rowspan="2" colspan="2"><p>Live</p></td><td><p>Talk</p></td></tr>' +
    '<tr><td><p>Tuesday</p></td><td><p>News</p></td></tr>' +
    '<tr><td><p>Wednesday</p></td><td><p>Quiz</p></td><td><p>Archive</p></td><td><p>Music</p></td></tr>' +
    '</tbody></table>';
  const range = (anchor: readonly [number, number], head: readonly [number, number]) => ({
    kind: 'cells' as const,
    table: 't1',
    range: {
      anchor: { row: anchor[0], column: anchor[1] },
      head: { row: head[0], column: head[1] },
    },
  });
  const commands = {
    ArrowUp: lexical.KEY_ARROW_UP_COMMAND,
    ArrowDown: lexical.KEY_ARROW_DOWN_COMMAND,
    ArrowLeft: lexical.KEY_ARROW_LEFT_COMMAND,
    ArrowRight: lexical.KEY_ARROW_RIGHT_COMMAND,
  };
  /** Shift with an arrow key, as the engine dispatches it; whether handled and prevented. */
  function shiftArrow(headless: ReturnType<typeof setup>, key: keyof typeof commands) {
    const { event, record } = keyEvent(key, { shift: true });
    const handled = headless.editor.dispatchCommand(commands[key], event);
    headless.editor.read(() => undefined);
    return { handled, prevented: record.prevented > 0 };
  }
  const select = (headless: ReturnType<typeof setup>, selection: TextEditorSelectionInput) =>
    headless.instance.execute([{ type: 'selection.set', selection }], {
      reason: 'imperative-action',
    });

  it('the engine selects the cells of the grown rectangle, as the shared rule names them', () => {
    const headless = setup(merged);
    const ranges = [
      range([2, 0], [3, 1]),
      range([2, 0], [1, 1]),
      range([3, 2], [0, 3]),
      range([0, 0], [3, 3]),
    ];
    for (const selection of ranges) {
      expect(select(headless, selection)).toBe(true);
      const model = headless.table();
      const shared = tableTargetCells(model, { range: selection.range }).map(
        (index) => `${model.cells[index]!.row},${model.cells[index]!.column}`,
      );
      const engine = headless.editor.read(() => {
        const selection = lexical.$getSelection()!;
        return selection
          .getNodes()
          .filter((node) => node.getType() === 'tablecell')
          .map((node) => {
            const address = $cellAddress(headless.rt, node as never)!.cell;
            return `${address.row},${address.column}`;
          });
      });
      expect(engine).toEqual(shared);
    }
  });

  it('Shift with an arrow key extends a range by the shared grid rule, at the table’s edge too', () => {
    const headless = setup(merged);
    select(headless, range([2, 0], [2, 0]));
    expect(shiftArrow(headless, 'ArrowRight')).toEqual({ handled: true, prevented: true });
    expect(headless.instance.getState().selection).toEqual(range([2, 0], [1, 1]));
    expect(shiftArrow(headless, 'ArrowDown')).toEqual({ handled: true, prevented: true });
    expect(headless.instance.getState().selection).toEqual(range([2, 0], [3, 1]));
    select(headless, range([2, 0], [3, 3]));
    expect(shiftArrow(headless, 'ArrowDown')).toEqual({ handled: true, prevented: true });
    expect(headless.instance.getState().selection).toEqual(range([2, 0], [3, 3]));
  });

  it('Shift with an arrow key at the end of a cell’s text starts a range from that cell', () => {
    const headless = setup(merged);
    const tuesday = { block: 't1', cell: { row: 2, column: 0, paragraph: 0 }, offset: 7 };
    select(headless, { kind: 'text', anchor: tuesday });
    expect(shiftArrow(headless, 'ArrowRight')).toEqual({ handled: true, prevented: true });
    expect(headless.instance.getState().selection).toEqual(range([2, 0], [1, 1]));
    // Within the text the key is the engine's: no cell range.
    select(headless, { kind: 'text', anchor: { ...tuesday, offset: 3 } });
    shiftArrow(headless, 'ArrowRight');
    expect(headless.instance.getState().selection.kind).toBe('text');
  });
});

describe('uwg-te-req-content-6: a cell range in a focused root keeps a DOM caret in the root', () => {
  /** A rooted mount whose engine maps cell keys to fake cell elements in the root. */
  function focusedTable() {
    const rooted = rootedLexical({ html: grid3 });
    const editor = rooted.instance.native as lexical.LexicalEditor;
    const elements = new Map<string, unknown>();
    Object.assign(editor, {
      getElementByKey: (key: string) => {
        const node = editor.getEditorState().read(() => lexical.$getNodeByKey(key));
        if (!(node instanceof realLexicalModules.table.TableCellNode)) return null;
        if (!elements.has(key)) {
          const element = rooted.document.createElement('td');
          rooted.root.append(element);
          elements.set(key, element);
        }
        return elements.get(key);
      },
    });
    let at: unknown = null;
    const selection = {
      get rangeCount() {
        return at === null ? 0 : 1;
      },
      get anchorNode() {
        return at;
      },
      get focusNode() {
        return at;
      },
      anchorOffset: 0,
      focusOffset: 0,
      removeAllRanges: () => void (at = null),
      collapse: (node: unknown) => void (at = node),
    };
    Object.assign(rooted.document, { getSelection: () => selection });
    const cells = (focus = false) =>
      rooted.instance.execute(
        [
          {
            type: 'selection.set',
            selection: {
              kind: 'cells',
              table: 't1',
              range: { anchor: { row: 1, column: 0 }, head: { row: 2, column: 1 } },
            },
          },
        ],
        { reason: 'imperative-action', focus },
      );
    const anchorElement = () =>
      editor.getElementByKey(
        editor.getEditorState().read(() => {
          const selected = lexical.$getSelection();
          return realLexicalModules.table.$isTableSelection(selected) ? selected.anchor.key : '';
        }),
      );
    return { rooted, selection, cells, anchorElement };
  }

  it('a cell range set through the API leaves the DOM caret at the start of its anchor cell, where the Copy and Cut commands then fire', () => {
    const { rooted, selection, cells, anchorElement } = focusedTable();
    rooted.root.focus();
    expect(cells()).toBe(true);
    expect(rooted.instance.getState().selection.kind).toBe('cells');
    expect(anchorElement()).not.toBeNull();
    expect(selection.anchorNode).toBe(anchorElement());
  });

  it('an unfocused root gets no DOM caret', () => {
    const { selection, cells } = focusedTable();
    expect(cells()).toBe(true);
    expect(selection.rangeCount).toBe(0);
  });
});
