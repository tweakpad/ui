import { describe, expect, it, vi } from 'vitest';
import { render } from 'lit';
import type {
  TextEditorEngineState,
  TextEditorTableCell,
  TextEditorTableModel,
} from '../../../foundation/text-editor/model.js';
import { textEditorStrings } from '../../../foundation/text-editor/strings.js';
import type { OverlayMeasureContext } from '../geometry.js';
import {
  cellEndColumn,
  cellRangeSize,
  columnBandCells,
  columnEdgeAt,
  columnEdgeRun,
  gripOutset,
  lineRange,
  reservedPressSelection,
  tableAnnouncement,
  tableChromeModel,
  tableMenuTarget,
  tableTabMove,
  tableChromeStyles,
  TextEditorTableChrome,
  unionRect,
  type TableChromeHost,
} from './table-chrome.js';

// The chrome renders its controls and an open menu's items into render roots of its own; Node has
// no DOM to render into, so the renders are recorded.
vi.mock('lit', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  render: vi.fn(),
}));

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
        focused: true,
      }),
    ).toBeNull();
    expect(
      tableChromeModel({
        editable: true,
        state: NONE,
        hover: null,
        frozen: null,
        session: false,
        focused: true,
      }),
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
        focused: true,
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
        focused: true,
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
        focused: true,
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
        focused: true,
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
        focused: true,
      }),
    ).toEqual({ ...frozen, range: { anchor: { row: 2, column: 0 }, head: { row: 2, column: 2 } } });
  });
});

describe('table chrome without focus (uwg-te-req-tables-3)', () => {
  const input = (patch: Partial<Parameters<typeof tableChromeModel>[0]>) =>
    tableChromeModel({
      editable: true,
      state: caretState(1, 1),
      hover: null,
      frozen: null,
      session: false,
      focused: false,
      ...patch,
    });

  it('shows no grips at the selection head while focus is outside the widget: the editor has no caret', () => {
    expect(input({})).toBeNull();
    expect(input({ state: rangeState([0, 0], [1, 2]) })).toBeNull();
    expect(input({ focused: true })).toMatchObject({ row: 1, column: 1 });
  });

  it('still reveals the hovered cell, without the range outline or the caret line over the reserved space', () => {
    expect(
      input({
        state: rangeState([0, 0], [1, 2]),
        hover: { table: 't1', cell: { row: 0, column: 2 }, boundary: 1 },
      }),
    ).toEqual({ table: 't1', row: 0, column: 2, range: null, quickAdd: true, boundary: 1 });
    expect(input({ hover: { table: 't1', cell: null, boundary: null } })).toMatchObject({
      row: null,
      column: null,
      quickAdd: true,
    });
  });

  it('keeps the session and a frozen model, which hold focus in the chrome', () => {
    expect(input({ session: true })).toMatchObject({ row: 1, column: 1, boundary: 1 });
    const frozen = { table: 't1', row: 2, column: 0, range: null, quickAdd: true, boundary: null };
    expect(input({ frozen })).toEqual(frozen);
  });
});

describe('column boundaries and merged cells (uwg-te-req-tables-6)', () => {
  // Four rows, three columns; row 1 merges columns 0 and 1, row 3 columns 1 and 2.
  const merged = model(4, 3, [
    { row: 1, column: 0, colSpan: 2 },
    { row: 3, column: 1, colSpan: 2 },
  ]);

  it('finds a boundary only where two cells meet, never inside a cell that spans it', () => {
    expect([0, 1, 2, 3].map((row) => columnEdgeAt(merged, 0, row))).toEqual([
      true,
      false,
      true,
      true,
    ]);
    expect([0, 1, 2, 3].map((row) => columnEdgeAt(merged, 1, row))).toEqual([
      true,
      true,
      true,
      false,
    ]);
    // The table's end edge runs through every row.
    expect([0, 1, 2, 3].every((row) => columnEdgeAt(merged, 2, row))).toBe(true);
    expect(cellEndColumn(merged, 1, 0)).toBe(1);
    expect(cellEndColumn(merged, 3, 1)).toBe(2);
    expect(cellEndColumn(merged, 0, 1)).toBe(1);
  });

  it('runs a boundary through the rows around a row up to a merged cell that spans it', () => {
    expect(columnEdgeRun(merged, 0, 0)).toEqual({ from: 0, to: 0 });
    expect(columnEdgeRun(merged, 0, 3)).toEqual({ from: 2, to: 3 });
    expect(columnEdgeRun(merged, 1, 1)).toEqual({ from: 0, to: 2 });
    expect(columnEdgeRun(merged, 2, 1)).toEqual({ from: 0, to: 3 });
  });

  it('draws the session separator along the cell edges of its run only', () => {
    // Rows 30 px tall from y 100: the boundary after column 1 stops at the merged cell of row 3.
    const { chrome, context } = layer({ table: merged, state: caretState(0, 1) });
    chrome.session = true;
    const placement = chrome.measure(context)!;
    expect(placement.separator).toMatchObject({ left: 250, top: 100, height: 90 });
    expect(chrome.resize.target?.column).toBe(1);
    // Below a merged cell the run starts at the next row's top.
    const below = layer({ table: merged, state: caretState(3, 0) });
    below.chrome.session = true;
    expect(below.chrome.measure(below.context)!.separator).toMatchObject({
      left: 150,
      top: 160,
      height: 60,
    });
  });

  it("puts the session separator of a head cell that spans the boundary on that cell's inline-end edge", () => {
    const { chrome, context } = layer({ table: merged, state: caretState(3, 1) });
    chrome.session = true;
    // The cell covers columns 1 and 2: its end is the table's end edge, through every row.
    expect(chrome.measure(context)!.separator).toMatchObject({ left: 350, top: 100, height: 120 });
    expect(chrome.resize.target?.column).toBe(2);
  });

  it('reveals no separator for the pointer over a merged cell near a boundary that the cell spans', () => {
    const { chrome, host, geometry, context } = layer({ table: merged, state: NONE });
    const instance = host.instance() as unknown as Record<string, unknown>;
    const nodes = new Map<unknown, { row: number; column: number }>();
    const cellNode = (row: number, column: number) => {
      const node = { nodeType: 1 };
      nodes.set(node, { row, column });
      return node;
    };
    Object.assign(instance, {
      cellAt: (node: unknown) => {
        const cell = nodes.get(node);
        return cell ? { table: 't1', cell } : null;
      },
      blockAt: () => null,
      getBlocks: () => ({ get: () => undefined }),
    });
    const frames: (() => void)[] = [];
    Object.assign(geometry, {
      requestHit: vi.fn((_x: number, _y: number, resolve: () => void) => frames.push(resolve)),
    });
    const viewport = new EventTarget();
    chrome.observe(viewport as unknown as HTMLElement);
    const hover = (node: unknown, clientX: number, clientY: number) => {
      viewport.dispatchEvent(
        Object.assign(new Event('pointermove'), {
          composedPath: () => [node, viewport],
          clientX,
          clientY,
        }),
      );
      for (const resolve of frames.splice(0)) resolve();
      return chrome.model;
    };
    // A first pass records the boundaries, as a shown chrome has.
    hover(cellNode(0, 0), 60, 110);
    chrome.measure(context);
    // On the boundary after column 0 in row 0, two cells meet: the separator shows there.
    expect(hover(cellNode(0, 0), 150, 110)).toMatchObject({ row: 0, boundary: 0 });
    // The same x in the merged cell of row 1, which spans that boundary: none.
    expect(hover(cellNode(1, 0), 150, 140)).toMatchObject({ row: 1, boundary: null });
    // The boundary that row 1's merged cell ends on still shows.
    expect(hover(cellNode(1, 0), 251, 140)).toMatchObject({ row: 1, boundary: 1 });
    chrome.release();
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
    // A range over a merged cell spans the rectangle it selects, grown over the span.
    const merged = model(3, 3, [{ row: 0, column: 0, rowSpan: 2, colSpan: 2 }]);
    const range = { anchor: { row: 0, column: 0 }, head: { row: 0, column: 2 } };
    expect(cellRangeSize(range, merged)).toEqual({ rows: 2, columns: 3 });
  });

  it('moves a pill grip out from the table edge by half its length less half its thickness', () => {
    // A 16 by 24 grip reaches 12 out of the table, as far as a 24 square one centred on the edge.
    expect(gripOutset(24, 16)).toBe(4);
    expect(gripOutset(24, 24)).toBe(0);
    expect(gripOutset(16, 24)).toBe(0);
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
    table?: TextEditorTableModel;
    focused?: () => boolean;
  } = {},
) {
  const table = options.table ?? model(2, 3);
  // Columns 100 px wide from x 50, rows 30 px tall from y 100; a cell spans its spans.
  const cellRect = (row: number, column: number) => {
    const cell = table.cells[table.grid[row]?.[column] ?? -1];
    return rect(
      50 + column * 100,
      100 + row * 30,
      100 * (cell?.colSpan ?? 1),
      30 * (cell?.rowSpan ?? 1),
    );
  };
  const tableElement = {
    getBoundingClientRect: () => rect(50, 100, 300, 30 * table.rows),
    rows: Array.from({ length: table.rows }, (_, row) => ({
      getBoundingClientRect: () => rect(50, 100 + row * 30, 300, 30),
    })),
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
    focused: options.focused ?? (() => true),
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

  it('hides the grips, the range outline and its handle while focus is outside the widget, and shows them when it returns (uwg-te-req-tables-3)', () => {
    let focused = false;
    const { chrome, context } = layer({
      state: rangeState([0, 1], [1, 2]),
      focused: () => focused,
    });
    chrome.update();
    expect(chrome.model).toBeNull();
    focused = true;
    chrome.update();
    const placement = chrome.measure(context)!;
    expect(placement.outline).not.toBeNull();
    expect(placement.handle).not.toBeNull();
    expect(placement.columnGrip).not.toBeNull();
    focused = false;
    chrome.update();
    expect(chrome.model).toBeNull();
  });

  it('clips controls to the wrapper: a column outside the visible area has no grip', () => {
    const { chrome, context } = layer({ state: caretState(0, 2), scrollerWidth: 180 });
    chrome.session = true;
    const placement = chrome.measure(context)!;
    expect(placement.columnGrip).toBeNull();
    expect(placement.addColumn).toBeNull();
    expect(placement.addRow).toEqual({ left: 50, top: 160, width: 180, height: 0 });
  });

  it('keeps a focused separator whose boundary left the visible area, and scrolls it back', () => {
    const { chrome, context } = layer({ state: caretState(0, 2), scrollerWidth: 180 });
    chrome.session = true;
    // Unfocused, the boundary at x 350 outside the wrapper (50 to 230) has no separator.
    expect(chrome.measure(context)!.separator).toBeNull();
    chrome.resize.focusChanged(true);
    const placement = chrome.measure(context)!;
    expect(placement.separator?.left).toBe(230);
    expect(placement.reveal).toBe(350 - (230 - 16));
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

  it('hides its marks when the caret and the pointer leave every table', () => {
    const { chrome, host } = layer();
    chrome.update();
    expect(chrome.wanted()).toBe(false); // no container bound in this harness
    const hide = vi.spyOn(chrome, 'hide');
    const paragraph = {
      editable: true,
      selection: { kind: 'text', empty: true },
      table: null,
    } as unknown as TextEditorEngineState;
    Object.assign(host, { state: () => paragraph });
    chrome.update();
    expect(chrome.model).toBeNull();
    expect(hide).toHaveBeenCalledTimes(1);
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

  it('V-589: a pointer move resolves its table in the next frame, reading a table model only for a table', () => {
    const { chrome, host, geometry } = layer();
    const instance = host.instance() as unknown as Record<string, unknown>;
    const paragraph = { nodeType: 1 };
    const table = { nodeType: 1 };
    const blocks = new Map<unknown, string>([
      [paragraph, 'p1'],
      [table, 't1'],
    ]);
    const kinds: Record<string, string> = { p1: 'paragraph', t1: 'table' };
    const getTable = vi.fn(instance['getTable'] as () => unknown);
    const cellAt = vi.fn(() => null);
    Object.assign(instance, {
      cellAt,
      blockAt: (node: unknown) => blocks.get(node) ?? null,
      getBlocks: () => ({ get: (id: string) => (kinds[id] ? { kind: kinds[id] } : undefined) }),
      getTable,
    });
    const frames: ((block: string | null) => void)[] = [];
    Object.assign(geometry, {
      requestHit: vi.fn((_x: number, _y: number, resolve: (block: string | null) => void) =>
        frames.push(resolve),
      ),
    });
    const frame = (): void => {
      for (const resolve of frames.splice(0)) resolve(null);
    };
    const viewport = new EventTarget();
    chrome.observe(viewport as unknown as HTMLElement);
    const move = (node: unknown): void => {
      const event = Object.assign(new Event('pointermove'), {
        composedPath: () => [node, viewport],
        clientX: 60,
        clientY: 110,
      });
      viewport.dispatchEvent(event);
    };
    move(paragraph);
    // The move handler asks the engine nothing; the frame does.
    expect(cellAt).not.toHaveBeenCalled();
    frame();
    expect(cellAt).toHaveBeenCalled();
    expect(getTable).not.toHaveBeenCalled();
    move(table);
    frame();
    expect(getTable).toHaveBeenCalledWith('t1');
    chrome.release();
  });
});

describe('a press in the space a table wrapper reserves (V-367)', () => {
  const rect = (left: number, top: number, width: number, height: number) =>
    ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;

  /** A 2 x 2 table at (0, 0) of 200 x 80 whose cells hold one paragraph line each. */
  function fixture() {
    const cells = new Map<object, { row: number; column: number }>();
    const paragraphs: Record<string, object> = {};
    const cellElements: Record<string, object> = {};
    for (const row of [0, 1])
      for (const column of [0, 1]) {
        const paragraph = {
          getBoundingClientRect: () => rect(column * 100 + 8, row * 40 + 8, 84, 20),
        };
        const cell = { children: [paragraph] };
        cells.set(cell, { row, column });
        cells.set(paragraph, { row, column });
        paragraphs[`${row},${column}`] = paragraph;
        cellElements[`${row},${column}`] = cell;
      }
    const element = {
      getBoundingClientRect: () => rect(0, 0, 200, 80),
      contains: (node: object) => cells.has(node),
      getRootNode: () => ({
        elementsFromPoint: (x: number, y: number) => {
          const row = y < 40 ? 0 : 1;
          const column = x < 100 ? 0 : 1;
          return [paragraphs[`${row},${column}`], cellElements[`${row},${column}`]];
        },
      }),
    } as unknown as Element;
    const points: [number, number][] = [];
    const instance = {
      cellAt: (node: Node) => {
        const cell = cells.get(node);
        return cell ? { table: 't1', cell } : null;
      },
      cellElement: (_table: string, cell: { row: number; column: number }) =>
        cellElements[`${cell.row},${cell.column}`] as HTMLElement,
      pointAt: vi.fn((x: number, y: number) => {
        points.push([x, y]);
        return { block: 't1', cell: { row: 1, column: 0, paragraph: 0 }, offset: 2 };
      }),
    };
    return { element, instance, points };
  }

  it('places the caret on the nearest line of the nearest cell, below the last row or beside the last column', () => {
    const { element, instance, points } = fixture();
    // 18 px below the last row, under the first column.
    expect(reservedPressSelection(instance, 't1', element, 30, 98)).toEqual({
      kind: 'text',
      anchor: { block: 't1', cell: { row: 1, column: 0, paragraph: 0 }, offset: 2 },
    });
    // The point read on the last line of the cell's paragraph.
    expect(points.at(-1)).toEqual([30, 67]);
    // Beside the last column: the cell of that row, its line at the press height.
    reservedPressSelection(instance, 't1', element, 240, 15);
    expect(points.at(-1)).toEqual([191, 15]);
    // No text point there: the end of the cell.
    instance.pointAt.mockReturnValueOnce(null as never);
    expect(reservedPressSelection(instance, 't1', element, 240, 70)).toEqual({
      kind: 'caret',
      block: 't1',
      cell: { row: 1, column: 1 },
      position: 'end',
    });
    // Another table's cell is no answer.
    expect(reservedPressSelection(instance, 't2', element, 30, 98)).toBeNull();
  });
});

describe('table control pointer targets (uwg-te-req-pres-6)', () => {
  const css = tableChromeStyles.cssText.replace(/\s+/gu, ' ');

  it('grows each control beyond its box along an axis that reaches no neighbour, layout untouched', () => {
    expect(css).toContain(
      ".table-chrome > .table-control::after { content: ''; position: absolute; inset: 0; }",
    );
    expect(css).toContain(
      ":is([part~='text-editor-row-grip'], [part~='text-editor-cell-handle'])::after { inset-block: calc(-1 * var(--_tp-text-editor-target-grow)); }",
    );
    expect(css).toContain(
      "[part~='text-editor-column-grip']::after { inset-inline: calc(-1 * var(--_tp-text-editor-target-grow)); }",
    );
    expect(css).toContain(
      "[part~='text-editor-add-row']::after { inset-block-end: calc(-1 * var(--_tp-text-editor-target-grow)); }",
    );
    expect(css).toContain(
      "[part~='text-editor-add-column']::after { inset-inline-end: calc(-1 * var(--_tp-text-editor-target-grow)); }",
    );
    // No grip grows across the table's edge, toward the gutter or into a cell.
    expect(css).not.toMatch(/row-grip'\][^{]*\{[^}]*inset-inline/u);
  });

  it('grows more only under a coarse pointer', () => {
    expect(css).toContain(
      '.table-chrome > .table-control { --_tp-text-editor-target-grow: var(--tp-space-1); }',
    );
    expect(css).toContain(
      '@media (any-pointer: coarse) { .table-chrome > .table-control { --_tp-text-editor-target-grow: var(--tp-space-2); } }',
    );
  });
});

describe('table menus outside the overlay (uwg-te-req-ana-3)', () => {
  /** The static text of a template and of every template in its values. */
  const templateText = (value: unknown): string => {
    if (Array.isArray(value)) return value.map(templateText).join('');
    if (value && typeof value === 'object' && 'strings' in value && 'values' in value) {
      const result = value as { strings: readonly string[]; values: readonly unknown[] };
      return result.strings
        .map((text, index) => text + templateText(result.values[index]))
        .join('');
    }
    return '';
  };

  it('renders the controls in the overlay and the row, column and cell menus apart from them', () => {
    const { chrome } = layer();
    chrome.update();
    const controls = templateText(chrome.render());
    expect(controls).toContain('class="table-chrome"');
    expect(controls).not.toContain('<tp-menu');
    const menus = templateText(chrome.renderMenus());
    expect(menus).toContain('class="table-menus"');
    expect(menus.match(/<tp-menu/g)).toHaveLength(3);
    // Focus leaving a menu reaches the session as it does from a control.
    expect(menus).toContain('@focusout=');
  });

  it('gives the holder of the menus no box', () => {
    expect(tableChromeStyles.cssText).toMatch(/\.table-menus \{\s*display: contents;\s*\}/);
  });
});

describe('a table reveal renders the chrome alone (V-587)', () => {
  /** The listener bound to `@tp-open-change` of the menu of `kind` in the menus' template. */
  const openListener = (template: unknown, kind: 'row' | 'column' | 'cell') => {
    const menus = (template as { values: readonly unknown[] }).values.filter(
      (value): value is { strings: readonly string[]; values: readonly unknown[] } =>
        !!value && typeof value === 'object' && 'strings' in value,
    );
    const menu = menus[['row', 'column', 'cell'].indexOf(kind)]!;
    const at = menu.strings.findIndex((text) => text.trimEnd().endsWith('@tp-open-change='));
    return menu.values[at] as (event: unknown) => void;
  };
  /** Binds `menu` as the menu of `kind` through the ref of the menus' template. */
  const bindMenu = (template: unknown, kind: 'row' | 'column' | 'cell', menu: object) => {
    const menus = (template as { values: readonly unknown[] }).values.filter(
      (value): value is { values: readonly unknown[] } =>
        !!value && typeof value === 'object' && 'strings' in value,
    );
    const directive = menus[['row', 'column', 'cell'].indexOf(kind)]!.values.find(
      (value): value is { values: readonly unknown[] } =>
        !!value &&
        typeof value === 'object' &&
        !('strings' in value) &&
        typeof (value as { values?: readonly unknown[] }).values?.[0] === 'function',
    )!;
    (directive.values[0] as (element: object) => void)(menu);
  };
  const openChange = (menu: object, value: boolean) => ({
    target: menu,
    currentTarget: menu,
    detail: { value, sourceEvent: undefined },
    preventDefault: vi.fn(),
  });

  it('resolves no menu item and renders nothing of the element when the grips move to another cell', () => {
    const { chrome, host } = layer();
    const menuGroups = vi.fn(() => []);
    Object.assign(host, { menuGroups });
    chrome.update();
    Object.assign(host, { state: () => ({ editable: true, ...caretState(0, 2) }) });
    chrome.update();
    expect(chrome.model).toMatchObject({ row: 0, column: 2 });
    // The labels of the grips are the chrome's own render; the element does not render.
    expect(host.requestUpdate).not.toHaveBeenCalled();
    chrome.render();
    chrome.renderMenus();
    chrome.updated();
    expect(menuGroups).not.toHaveBeenCalled();
  });

  it('resolves and renders the items and name of a menu into it when it opens and while it is open', () => {
    vi.mocked(render).mockClear();
    const { chrome, host } = layer({ state: caretState(1, 2) });
    const menuGroups = vi.fn(() => []);
    Object.assign(host, { menuGroups });
    chrome.update();
    const menu = { label: '' };
    bindMenu(chrome.renderMenus(), 'row', menu);
    openListener(chrome.renderMenus(), 'row')(openChange(menu, true));
    expect(menuGroups).toHaveBeenCalledTimes(1);
    expect(menuGroups).toHaveBeenCalledWith('table-row', {
      kind: 'table',
      table: 't1',
      axis: 'row',
      index: 1,
    });
    expect(menu.label).toBe('Row 2');
    expect(vi.mocked(render).mock.calls.at(-1)?.[1]).toBe(menu);
    // An update of the element while it is open renders its items again, for the frozen target.
    chrome.updated();
    expect(menuGroups).toHaveBeenCalledTimes(2);
    expect(menuGroups).toHaveBeenLastCalledWith('table-row', {
      kind: 'table',
      table: 't1',
      axis: 'row',
      index: 1,
    });
    openListener(chrome.renderMenus(), 'row')(openChange(menu, false));
    chrome.updated();
    expect(menuGroups).toHaveBeenCalledTimes(2);
  });

  it('places the controls without reading the direction after its writes', () => {
    const { chrome, host, context } = layer({ direction: 'rtl' });
    const direction = vi.spyOn(host, 'direction');
    chrome.session = true;
    const placement = chrome.measure(context)!;
    expect(placement.rtl).toBe(true);
    const reads = direction.mock.calls.length;
    chrome.apply(placement);
    expect(direction).toHaveBeenCalledTimes(reads);
  });
});
