import { describe, expect, it, vi } from 'vitest';
import type {
  TextEditorEngineState,
  TextEditorTableCell,
  TextEditorTableModel,
} from '../../../foundation/text-editor/model.js';
import { textEditorStrings } from '../../../foundation/text-editor/strings.js';
import type { OverlayMeasureContext } from '../geometry.js';
import {
  cellRangeSize,
  columnBandCells,
  lineRange,
  tableAnnouncement,
  tableChromeModel,
  tableMenuTarget,
  tableTabMove,
  TextEditorTableChrome,
  unionRect,
  type TableChromeHost,
} from './table-chrome.js';

/** A table model from cells; the grid is derived from the spans. */
function model(
  rows: number,
  columns: number,
  spans: readonly (Pick<TextEditorTableCell, 'row' | 'column'> & {
    rowSpan?: number;
    colSpan?: number;
  })[] = [],
): TextEditorTableModel {
  const grid: number[][] = Array.from({ length: rows }, () => Array<number>(columns).fill(-1));
  const cells: TextEditorTableCell[] = [];
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      if (grid[row]![column]! >= 0) continue;
      const span = spans.find((item) => item.row === row && item.column === column);
      const rowSpan = span?.rowSpan ?? 1;
      const colSpan = span?.colSpan ?? 1;
      const index = cells.length;
      cells.push({
        row,
        column,
        rowSpan,
        colSpan,
        header: row === 0,
        background: null,
        align: null,
        empty: true,
      });
      for (let r = row; r < row + rowSpan; r++)
        for (let c = column; c < column + colSpan; c++) grid[r]![c] = index;
    }
  return {
    id: 't1',
    rows,
    columns,
    cells,
    grid,
    headerRow: true,
    headerColumn: false,
    widths: null,
    merged: spans.length > 0,
  };
}

const caretState = (row: number, column: number) =>
  ({
    selection: {
      kind: 'text',
      anchor: { block: 't1', offset: 0, cell: { row, column, paragraph: 0 } },
      head: { block: 't1', offset: 0, cell: { row, column, paragraph: 0 } },
      empty: true,
    },
    table: {
      id: 't1',
      cell: { row, column },
      range: null,
      rows: 3,
      columns: 3,
      headerRow: true,
      headerColumn: false,
      merged: false,
      cellMerged: false,
    },
  }) as unknown as Pick<TextEditorEngineState, 'selection' | 'table'>;

const rangeState = (anchor: [number, number], head: [number, number]) => {
  const range = {
    anchor: { row: anchor[0], column: anchor[1] },
    head: { row: head[0], column: head[1] },
  };
  return {
    selection: { kind: 'cells', table: 't1', range },
    table: { ...caretState(head[0], head[1]).table!, range },
  } as unknown as Pick<TextEditorEngineState, 'selection' | 'table'>;
};

const NONE = { selection: { kind: 'none' }, table: null } as unknown as Pick<
  TextEditorEngineState,
  'selection' | 'table'
>;

describe('tableChromeModel', () => {
  it('shows nothing unless editable', () => {
    expect(
      tableChromeModel({
        editable: false,
        state: caretState(1, 1),
        hover: null,
        frozen: null,
        session: false,
      }),
    ).toBeNull();
    expect(
      tableChromeModel({ editable: true, state: NONE, hover: null, frozen: null, session: false }),
    ).toBeNull();
  });

  it('places the grips at the caret cell with no pointer over the table, without quick-add', () => {
    expect(
      tableChromeModel({
        editable: true,
        state: caretState(2, 1),
        hover: null,
        frozen: null,
        session: false,
      }),
    ).toEqual({ table: 't1', row: 2, column: 1, range: null, quickAdd: false, boundary: null });
  });

  it('follows the hovered cell with quick-add and the boundary under the pointer', () => {
    expect(
      tableChromeModel({
        editable: true,
        state: NONE,
        hover: { table: 't2', cell: { row: 0, column: 2 }, boundary: 1 },
        frozen: null,
        session: false,
      }),
    ).toEqual({ table: 't2', row: 0, column: 2, range: null, quickAdd: true, boundary: 1 });
  });

  it('keeps the caret line over the reserved space of the caret table', () => {
    expect(
      tableChromeModel({
        editable: true,
        state: caretState(1, 2),
        hover: { table: 't1', cell: null, boundary: null },
        frozen: null,
        session: false,
      }),
    ).toMatchObject({ row: 1, column: 2, quickAdd: true });
  });

  it('shows every control on the selection table during the session, the separator on the head column', () => {
    expect(
      tableChromeModel({
        editable: true,
        state: rangeState([0, 0], [1, 2]),
        hover: { table: 'other', cell: { row: 0, column: 0 }, boundary: null },
        frozen: null,
        session: true,
      }),
    ).toEqual({
      table: 't1',
      row: 1,
      column: 2,
      range: { anchor: { row: 0, column: 0 }, head: { row: 1, column: 2 } },
      quickAdd: true,
      boundary: 2,
    });
  });

  it('keeps a frozen model while a menu is open, with the live range', () => {
    const frozen = { table: 't1', row: 2, column: 0, range: null, quickAdd: true, boundary: null };
    expect(
      tableChromeModel({
        editable: true,
        state: rangeState([2, 0], [2, 2]),
        hover: { table: 't1', cell: { row: 0, column: 1 }, boundary: null },
        frozen,
        session: false,
      }),
    ).toEqual({ ...frozen, range: { anchor: { row: 2, column: 0 }, head: { row: 2, column: 2 } } });
  });
});

describe('table helpers', () => {
  it('selects whole lines and targets table menus', () => {
    const table = model(3, 4);
    expect(lineRange(table, 'row', 1)).toEqual({
      anchor: { row: 1, column: 0 },
      head: { row: 1, column: 3 },
    });
    expect(lineRange(table, 'column', 2)).toEqual({
      anchor: { row: 0, column: 2 },
      head: { row: 2, column: 2 },
    });
    expect(tableMenuTarget('row', 't1', 1)).toEqual({
      kind: 'table',
      table: 't1',
      axis: 'row',
      index: 1,
    });
    expect(tableMenuTarget('cell', 't1', 1)).toEqual({ kind: 'table', table: 't1', axis: 'cells' });
    expect(cellRangeSize({ anchor: { row: 2, column: 3 }, head: { row: 0, column: 1 } })).toEqual({
      rows: 3,
      columns: 3,
    });
  });

  it('announces structural changes in the widget strings', () => {
    const strings = textEditorStrings;
    expect(tableAnnouncement([{ type: 'table.insert-row', table: 't1', index: 1 }], strings)).toBe(
      'Row inserted',
    );
    expect(
      tableAnnouncement([{ type: 'table.duplicate-column', table: 't1', index: 0 }], strings),
    ).toBe('Column inserted');
    expect(
      tableAnnouncement([{ type: 'table.move-row', table: 't1', from: 0, to: 1 }], strings),
    ).toBe('Row moved to position 2');
    expect(
      tableAnnouncement([{ type: 'table.delete-columns', table: 't1', from: 1, to: 2 }], strings),
    ).toBe('Columns deleted: 2');
    expect(
      tableAnnouncement(
        [
          {
            type: 'table.merge-cells',
            table: 't1',
            range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 1 } },
          },
        ],
        strings,
      ),
    ).toBe('Cells merged');
    expect(
      tableAnnouncement(
        [{ type: 'table.split-cell', table: 't1', cell: { row: 0, column: 0 } }],
        strings,
      ),
    ).toBe('Cell split');
    expect(tableAnnouncement([{ type: 'mark.toggle', mark: 'bold' }], strings)).toBeNull();
  });

  it('moves Tab through cells in row-major order, a spanned cell counted once', () => {
    const table = model(2, 3, [{ row: 0, column: 1, colSpan: 2 }]);
    expect(tableTabMove(table, { row: 0, column: 0 }, false)).toEqual({
      kind: 'cell',
      cell: { row: 0, column: 1 },
    });
    expect(tableTabMove(table, { row: 0, column: 2 }, false)).toEqual({
      kind: 'cell',
      cell: { row: 1, column: 0 },
    });
    expect(tableTabMove(table, { row: 1, column: 0 }, true)).toEqual({
      kind: 'cell',
      cell: { row: 0, column: 1 },
    });
    expect(tableTabMove(table, { row: 1, column: 2 }, false)).toEqual({ kind: 'append' });
    expect(tableTabMove(table, { row: 0, column: 0 }, true)).toEqual({ kind: 'none' });
    expect(tableTabMove(table, { row: 9, column: 0 }, false)).toEqual({ kind: 'none' });
  });

  it('measures each column through a single-column cell where one exists', () => {
    const table = model(2, 3, [{ row: 0, column: 0, colSpan: 2 }]);
    expect(columnBandCells(table)).toEqual([
      { row: 1, column: 0 },
      { row: 1, column: 1 },
      { row: 0, column: 2 },
    ]);
    const merged = model(1, 2, [{ row: 0, column: 0, colSpan: 2 }]);
    expect(columnBandCells(merged)).toEqual([
      { row: 0, column: 0 },
      { row: 0, column: 0 },
    ]);
  });

  it('unites rectangles', () => {
    expect(unionRect([])).toBeNull();
    expect(
      unionRect([
        { left: 10, top: 5, right: 20, bottom: 15 },
        { left: 0, top: 10, right: 12, bottom: 30 },
      ]),
    ).toEqual({ left: 0, top: 5, right: 20, bottom: 30 });
  });
});

// The layer over a fake instance ---------------------------------------------------------------

const rect = (left: number, top: number, width: number, height: number) =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  }) as DOMRectReadOnly;

function layer(
  options: {
    state?: Pick<TextEditorEngineState, 'selection' | 'table'>;
    access?: { readOnly: boolean; disabled: boolean };
    direction?: 'ltr' | 'rtl';
    scrollerWidth?: number;
  } = {},
) {
  const table = model(2, 3);
  // Columns 100 px wide from x 50, rows 30 px tall from y 100.
  const cellRect = (row: number, column: number) =>
    rect(50 + column * 100, 100 + row * 30, 100, 30);
  const tableElement = {
    getBoundingClientRect: () => rect(50, 100, 300, 60),
    rows: [0, 1].map((row) => ({ getBoundingClientRect: () => rect(50, 100 + row * 30, 300, 30) })),
  };
  const scroller = {
    getBoundingClientRect: () => rect(50, 100, options.scrollerWidth ?? 400, 90),
    addEventListener() {},
    removeEventListener() {},
  };
  const instance = {
    getTable: () => table,
    tableElements: () => ({ table: tableElement, scroller }),
    cellElement: (_table: string, cell: { row: number; column: number }) => ({
      getBoundingClientRect: () => cellRect(cell.row, cell.column),
    }),
    selectionRects: () => [cellRect(0, 1), cellRect(1, 2)],
  };
  const state = {
    editable: true,
    ...(options.state ?? caretState(1, 1)),
  } as unknown as TextEditorEngineState;
  const geometry = {
    addLayer: vi.fn(() => () => {}),
    invalidate: vi.fn(),
    onScroll: vi.fn(() => () => {}),
  };
  const host: TableChromeHost = {
    element: { ownerDocument: { defaultView: null }, shadowRoot: null } as unknown as HTMLElement,
    geometry: geometry as never,
    instance: () => instance as never,
    state: () => state,
    access: () => options.access ?? { readOnly: false, disabled: false },
    strings: () => textEditorStrings,
    direction: () => options.direction ?? 'ltr',
    request: vi.fn(() => Promise.resolve('applied' as const)),
    menuGroups: () => [],
    focusEditing: vi.fn(),
    announce: vi.fn(),
    requestUpdate: vi.fn(),
  };
  const chrome = new TextEditorTableChrome(host);
  const context = {
    source: { kind: 'instance', instance },
    owner: {} as Window,
    toOverlay: (value: DOMRectReadOnly) => ({
      left: value.left,
      top: value.top,
      width: value.width,
      height: value.height,
    }),
  } as unknown as OverlayMeasureContext;
  return { chrome, host, geometry, context };
}

describe('TextEditorTableChrome', () => {
  it('registers its layer and places the grips on the table edges at the caret line', () => {
    const { chrome, geometry, context } = layer();
    expect(geometry.addLayer).toHaveBeenCalledWith(chrome);
    chrome.update();
    const placement = chrome.measure(context)!;
    expect(placement.rowGrip).toEqual({ x: 50, y: 145 });
    expect(placement.columnGrip).toEqual({ x: 200, y: 100 });
    expect(placement.addRow).toBeNull();
    expect(placement.separator).toBeNull();
  });

  it('reports no row grip reach before a grip has shown', () => {
    const { chrome } = layer();
    expect(chrome.rowGripOutset()).toBe(0);
  });

  it('mirrors the row grip and the column ends in right-to-left content', () => {
    const { chrome, context } = layer({ direction: 'rtl' });
    chrome.session = true;
    const placement = chrome.measure(context)!;
    expect(placement.rowGrip).toEqual({ x: 350, y: 145 });
    // The session puts the separator on the inline-end boundary of the head column.
    expect(placement.separator?.left).toBe(150);
    expect(placement.addColumn?.left).toBe(50);
  });

  it('outlines a cell range with its handle at the inline-end middle and announces its size', () => {
    const { chrome, host, context } = layer({ state: rangeState([0, 1], [1, 2]) });
    chrome.update();
    expect(host.announce).toHaveBeenCalledWith('Selected cells: 2 by 2');
    const placement = chrome.measure(context)!;
    expect(placement.outline).toEqual({ left: 150, top: 100, width: 200, height: 60 });
    expect(placement.handle).toEqual({ x: 350, y: 130 });
    chrome.update();
    expect(host.announce).toHaveBeenCalledTimes(1);
  });

  it('clips controls to the wrapper: a column outside the visible area has no grip', () => {
    const { chrome, context } = layer({ state: caretState(0, 2), scrollerWidth: 180 });
    chrome.session = true;
    const placement = chrome.measure(context)!;
    expect(placement.columnGrip).toBeNull();
    expect(placement.addColumn).toBeNull();
    expect(placement.addRow).toEqual({ left: 50, top: 160, width: 180, height: 0 });
  });

  it('places the session separator with the column widths and its values', () => {
    const { chrome, context } = layer({ state: caretState(0, 0) });
    chrome.session = true;
    chrome.measure(context);
    expect(chrome.resize.target).toEqual({
      table: 't1',
      column: 0,
      widths: [100, 100, 100],
      visible: 400,
    });
    expect(chrome.resize.attributes()).toMatchObject({
      'aria-valuenow': 100,
      'aria-valuemin': 48,
      'aria-valuemax': 400,
      'aria-orientation': 'vertical',
    });
  });

  it('shows nothing while read-only', () => {
    const { chrome } = layer({ access: { readOnly: true, disabled: false } });
    chrome.update();
    expect(chrome.model).toBeNull();
    expect(chrome.wanted()).toBe(false);
  });

  it('announces structural changes of requests', () => {
    const { chrome, host } = layer();
    chrome.changed([{ type: 'table.delete-rows', table: 't1', from: 0, to: 0 }]);
    expect(host.announce).toHaveBeenCalledWith('Rows deleted: 1');
  });
});
