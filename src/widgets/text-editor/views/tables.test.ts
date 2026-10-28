import { describe, expect, it, vi } from 'vitest';
import type { TextEditorRequestDetail } from '../../../foundation/text-editor/controller.js';
import type { TextEditorEngineState } from '../../../foundation/text-editor/model.js';
import { textEditorStrings } from '../../../foundation/text-editor/strings.js';
import type { TextEditorTool } from '../../../foundation/text-editor/tools.js';
import { openerTakesFocus, TextEditorTables, type TextEditorTablesHost } from './tables.js';

/** A 2 by 2 table without spans. */
const MODEL = {
  id: 't1',
  rows: 2,
  columns: 2,
  cells: [0, 1, 2, 3].map((index) => ({
    row: Math.floor(index / 2),
    column: index % 2,
    rowSpan: 1,
    colSpan: 1,
    header: index < 2,
    background: null,
    align: null,
    empty: true,
  })),
  grid: [
    [0, 1],
    [2, 3],
  ],
  headerRow: true,
  headerColumn: false,
  widths: null,
  merged: false,
};

function setup(cell: { row: number; column: number } | null = { row: 0, column: 0 }) {
  const state = {
    editable: true,
    selection: { kind: 'text' },
    table: cell
      ? {
          id: 't1',
          cell,
          range: null,
          rows: 2,
          columns: 2,
          headerRow: true,
          headerColumn: false,
          merged: false,
          cellMerged: false,
        }
      : null,
  } as unknown as TextEditorEngineState;
  const request = vi.fn((proposal: unknown) =>
    Promise.resolve(proposal ? ('applied' as const) : ('unchanged' as const)),
  );
  const scrollIntoView = vi.fn();
  const cellElement = vi.fn(() => ({ scrollIntoView }));
  const toolbar = { contains: (node: unknown) => node === inToolbar || node === inMore };
  const moreTrigger = {} as HTMLElement;
  const inToolbar = { isConnected: true, closest: () => null } as unknown as HTMLElement;
  const inMore = {
    isConnected: true,
    closest: () => ({ querySelector: () => moreTrigger }),
  } as unknown as HTMLElement;
  const host: TextEditorTablesHost = {
    element: { shadowRoot: null, ownerDocument: {} } as unknown as HTMLElement,
    geometry: {
      addLayer: () => () => {},
      invalidate: () => {},
      onScroll: () => () => {},
    } as never,
    instance: () => ({ getTable: () => MODEL, cellElement }) as never,
    state: () => state,
    strings: () => textEditorStrings,
    layout: () => ({}) as never,
    access: () => ({ readOnly: false, disabled: false }),
    direction: () => 'ltr',
    registry: () => null,
    toolContext: () => ({}) as never,
    toolEnabled: () => true,
    shortcut: () => undefined,
    request,
    announce: vi.fn(),
    focusEditing: vi.fn(),
    focused: () => true,
    registerContextual: vi.fn(() => () => {}),
    cycleContextual: () => false,
    stickyHeaders: () => false,
    viewport: () => null,
    content: () => null,
    toolbar: () => toolbar as unknown as HTMLElement,
    requestUpdate: vi.fn(),
    updateComplete: () => Promise.resolve(),
  };
  return {
    tables: new TextEditorTables(host),
    request,
    cellElement,
    scrollIntoView,
    inToolbar,
    inMore,
    moreTrigger,
  };
}

const tab = (shift = false) =>
  Object.assign(new Event('keydown', { cancelable: true }), {
    key: 'Tab',
    shiftKey: shift,
    repeat: false,
  }) as unknown as KeyboardEvent;

describe('TextEditorTables: Tab between cells', () => {
  it('moves the caret to the end of the next cell as a keyboard selection change', () => {
    const { tables, request } = setup({ row: 0, column: 1 });
    expect(tables.tableTab(tab(), false)).toBe(true);
    expect(request.mock.calls[0]![0]).toMatchObject({
      target: {
        type: 'selection.set',
        selection: { kind: 'caret', block: 't1', cell: { row: 1, column: 0 }, position: 'end' },
      },
      surface: 'keyboard',
      reason: 'keyboard',
    });
  });

  it('appends a row in the last cell and selects into it', () => {
    const { tables, request } = setup({ row: 1, column: 1 });
    expect(tables.tableTab(tab(), false)).toBe(true);
    expect(request.mock.calls[0]![0]).toMatchObject({
      target: [{ type: 'table.insert-row', table: 't1', index: 2, select: true }],
      surface: 'keyboard',
      reason: 'keyboard',
    });
  });

  it('scrolls the cell it moved the caret into into view once the move applied, also sideways', async () => {
    const moved = setup({ row: 0, column: 1 });
    moved.tables.tableTab(tab(), false);
    expect(moved.scrollIntoView).not.toHaveBeenCalled();
    await Promise.resolve();
    await Promise.resolve();
    expect(moved.cellElement).toHaveBeenCalledWith('t1', { row: 1, column: 0 });
    expect(moved.scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'instant',
    });
    const appended = setup({ row: 1, column: 1 });
    appended.tables.tableTab(tab(), false);
    await Promise.resolve();
    await Promise.resolve();
    expect(appended.cellElement).toHaveBeenCalledWith('t1', { row: 2, column: 0 });
    const refused = setup({ row: 0, column: 1 });
    refused.request.mockResolvedValueOnce('unchanged' as never);
    refused.tables.tableTab(tab(), false);
    await Promise.resolve();
    await Promise.resolve();
    expect(refused.scrollIntoView).not.toHaveBeenCalled();
  });

  it('consumes Shift+Tab in the first cell without effect, and leaves Tab outside a table', () => {
    const first = setup({ row: 0, column: 0 });
    expect(first.tables.tableTab(tab(true), true)).toBe(true);
    expect(first.request).not.toHaveBeenCalled();
    const outside = setup(null);
    expect(outside.tables.tableTab(tab(), false)).toBe(false);
  });
});

describe('TextEditorTables: size picker', () => {
  const detail = (trigger: Element | null, surface = 'toolbar') =>
    ({ trigger, surface }) as unknown as TextEditorRequestDetail;
  const tool = { kind: 'table-size' } as TextEditorTool;

  it('opens the picker for the table tool only, at its toolbar control', () => {
    const { tables, inToolbar } = setup();
    expect(tables.openSurface({ kind: 'image' } as TextEditorTool, detail(null))).toBe(false);
    expect(tables.openSurface(tool, detail(inToolbar))).toBe(true);
    expect(tables.picker.open).toBe(true);
    expect(tables.picker.render().values).toContain(inToolbar);
  });

  it('anchors at the More trigger for its item, and at the selection otherwise', () => {
    const { tables, inMore, moreTrigger } = setup();
    tables.openSurface(tool, detail(inMore));
    expect(tables.picker.render().values).toContain(moreTrigger);
    tables.closeSurfaces();
    tables.openSurface(tool, detail(null, 'slash'));
    const anchor = tables.picker
      .render()
      .values.find(
        (value) => typeof value === 'object' && value !== null && 'getBoundingRectangle' in value,
      );
    expect(anchor).toBeDefined();
  });

  it('inserts through the table tool with the opening surface and reason item-press', () => {
    const { tables, request } = setup();
    tables.openSurface(tool, detail(null, 'slash'));
    tables.picker.hover(4, 2);
    tables.picker.insert(new Event('click'), null);
    expect(request.mock.calls[0]![0]).toMatchObject({
      target: 'table',
      value: { rows: 4, columns: 2 },
      surface: 'slash',
      reason: 'item-press',
      focus: true,
    });
  });
});

describe('openerTakesFocus', () => {
  it('returns focus to a rendered opener only, so a hidden selection toolbar control gives way', () => {
    const opener = (connected: boolean, visible: boolean) =>
      ({ isConnected: connected, checkVisibility: () => visible }) as unknown as HTMLElement;
    expect(openerTakesFocus(opener(true, true))).toBe(true);
    expect(openerTakesFocus(opener(true, false))).toBe(false);
    expect(openerTakesFocus(opener(false, true))).toBe(false);
    expect(openerTakesFocus(null)).toBe(false);
  });
});
