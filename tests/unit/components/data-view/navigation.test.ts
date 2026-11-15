import { describe, expect, it } from 'vitest';
import type { GridKeyMove } from '../../../../src/foundation/grid-navigation.js';
import {
  clampPosition,
  firstPosition,
  movePosition,
  type DataViewGrid,
} from '../../../../src/components/data-view/navigation.js';

const grid = (
  mode: 'cell' | 'row',
  rows = 5,
  sortable: readonly number[] = [0, 2],
): DataViewGrid => ({
  mode,
  rows,
  columns: 3,
  page: 2,
  header: (column) => mode === 'cell' || sortable.includes(column),
});
const step = (columns: -1 | 0 | 1, rows: -1 | 0 | 1): GridKeyMove => ({
  kind: 'step',
  columns,
  rows,
});

describe('cell navigation', () => {
  const g = grid('cell');
  it('steps between cells and into the header', () => {
    expect(movePosition(g, { row: 0, column: 0 }, step(1, 0))).toEqual({ row: 0, column: 1 });
    expect(movePosition(g, { row: 0, column: 1 }, step(0, -1))).toEqual({ row: -1, column: 1 });
    expect(movePosition(g, { row: -1, column: 1 }, step(0, 1))).toEqual({ row: 0, column: 1 });
    expect(movePosition(g, { row: 4, column: 2 }, step(1, 0))).toBeNull();
    expect(movePosition(g, { row: 4, column: 2 }, step(0, 1))).toBeNull();
  });

  it('moves to row and grid edges and by pages', () => {
    expect(movePosition(g, { row: 2, column: 1 }, { kind: 'line', edge: 'end' })).toEqual({
      row: 2,
      column: 2,
    });
    expect(movePosition(g, { row: 2, column: 1 }, { kind: 'grid', edge: 'start' })).toEqual({
      row: -1,
      column: 0,
    });
    expect(movePosition(g, { row: 2, column: 1 }, { kind: 'grid', edge: 'end' })).toEqual({
      row: 4,
      column: 2,
    });
    expect(
      movePosition(g, { row: 1, column: 1 }, { kind: 'page', direction: 1, large: false }),
    ).toEqual({ row: 3, column: 1 });
    expect(
      movePosition(g, { row: 4, column: 1 }, { kind: 'page', direction: 1, large: false }),
    ).toBeNull();
  });
});

describe('row navigation', () => {
  const g = grid('row');
  it('moves between whole rows and ignores inline arrows', () => {
    expect(movePosition(g, { row: 0, column: -1 }, step(0, 1))).toEqual({ row: 1, column: -1 });
    expect(movePosition(g, { row: 1, column: -1 }, step(1, 0))).toBeNull();
    expect(movePosition(g, { row: 3, column: -1 }, { kind: 'line', edge: 'start' })).toEqual({
      row: 0,
      column: -1,
    });
    expect(movePosition(g, { row: 0, column: -1 }, { kind: 'grid', edge: 'end' })).toEqual({
      row: 4,
      column: -1,
    });
  });

  it('reaches the sortable headers from the first row and roves among them', () => {
    expect(movePosition(g, { row: 0, column: -1 }, step(0, -1))).toEqual({ row: -1, column: 0 });
    expect(movePosition(g, { row: -1, column: 0 }, step(1, 0))).toEqual({ row: -1, column: 2 });
    expect(movePosition(g, { row: -1, column: 2 }, step(1, 0))).toBeNull();
    expect(movePosition(g, { row: -1, column: 2 }, step(0, 1))).toEqual({ row: 0, column: -1 });
    expect(movePosition(grid('row', 5, []), { row: 0, column: -1 }, step(0, -1))).toBeNull();
  });
});

describe('positions', () => {
  it('starts at the first row, or a header without rows', () => {
    expect(firstPosition(grid('cell'))).toEqual({ row: 0, column: 0 });
    expect(firstPosition(grid('row'))).toEqual({ row: 0, column: -1 });
    expect(firstPosition(grid('cell', 0))).toEqual({ row: -1, column: 0 });
    expect(firstPosition(grid('row', 0, []))).toBeNull();
  });

  it('clamps a position after rows or columns go away', () => {
    expect(clampPosition(grid('cell', 2), { row: 7, column: 9 })).toEqual({ row: 1, column: 2 });
    expect(clampPosition(grid('row', 2), { row: 7, column: 1 })).toEqual({ row: 1, column: -1 });
    expect(clampPosition(grid('row'), { row: -1, column: 1 })).toEqual({ row: -1, column: 0 });
  });
});
