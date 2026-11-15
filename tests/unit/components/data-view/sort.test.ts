import { describe, expect, it } from 'vitest';
import { nextSort, sortDataViewRows } from '../../../../src/components/data-view/sort.js';
import type { DataViewColumn } from '../../../../src/components/data-view/types.js';

interface Row {
  id: string;
  name?: string | null;
  count?: number | null;
  when?: Date;
  on?: boolean;
}
const columns: DataViewColumn<Row>[] = [
  { id: 'name', header: 'Name', sortable: true },
  { id: 'count', header: 'Count', sortable: true },
  { id: 'when', header: 'When', sortable: true },
  { id: 'on', header: 'On', sortable: true },
];
const ids = (rows: readonly Row[]) => rows.map((row) => row.id);

describe('sortDataViewRows', () => {
  it('returns the rows as given without a sort or for an unknown column', () => {
    const rows = [{ id: 'a' }, { id: 'b' }];
    expect(sortDataViewRows(rows, null, columns)).toBe(rows);
    expect(sortDataViewRows(rows, { column: 'nope', direction: 'ascending' }, columns)).toBe(rows);
  });

  it('compares text in numeric order, ignoring case', () => {
    const rows = [
      { id: 'a', name: 'Station 10' },
      { id: 'b', name: 'station 2' },
      { id: 'c', name: 'Station 1' },
    ];
    expect(
      ids(sortDataViewRows(rows, { column: 'name', direction: 'ascending' }, columns)),
    ).toEqual(['c', 'b', 'a']);
  });

  it('compares numbers, dates and Booleans by value', () => {
    const rows = [
      { id: 'a', count: 10, when: new Date(3), on: true },
      { id: 'b', count: 2, when: new Date(1), on: false },
      { id: 'c', count: -1, when: new Date(2), on: true },
    ];
    const sort = (column: string, direction: 'ascending' | 'descending' = 'ascending') =>
      ids(sortDataViewRows(rows, { column, direction }, columns));
    expect(sort('count')).toEqual(['c', 'b', 'a']);
    expect(sort('count', 'descending')).toEqual(['a', 'b', 'c']);
    expect(sort('when')).toEqual(['b', 'c', 'a']);
    expect(sort('on')).toEqual(['b', 'a', 'c']);
  });

  it('is stable and keeps empty values last in both directions', () => {
    const rows = [
      { id: 'a', count: null },
      { id: 'b', count: 1 },
      { id: 'c', count: 1 },
      { id: 'd' },
      { id: 'e', count: 0 },
    ];
    expect(
      ids(sortDataViewRows(rows, { column: 'count', direction: 'ascending' }, columns)),
    ).toEqual(['e', 'b', 'c', 'a', 'd']);
    expect(
      ids(sortDataViewRows(rows, { column: 'count', direction: 'descending' }, columns)),
    ).toEqual(['b', 'c', 'e', 'a', 'd']);
  });

  it('uses a column comparator and value accessor', () => {
    const rows = [
      { id: 'a', name: 'bb' },
      { id: 'b', name: 'a' },
      { id: 'c', name: 'ccc' },
    ];
    const byLength: DataViewColumn<Row>[] = [
      { id: 'len', header: 'Length', compare: (x, y) => x.name!.length - y.name!.length },
      { id: 'first', header: 'First', value: (row) => row.name?.at(-1) },
    ];
    expect(
      ids(sortDataViewRows(rows, { column: 'len', direction: 'descending' }, byLength)),
    ).toEqual(['c', 'a', 'b']);
    expect(
      ids(sortDataViewRows(rows, { column: 'first', direction: 'ascending' }, byLength)),
    ).toEqual(['b', 'a', 'c']);
  });

  it('never mutates the rows', () => {
    const rows = Object.freeze([
      { id: 'b', count: 2 },
      { id: 'a', count: 1 },
    ]);
    expect(() =>
      sortDataViewRows(rows, { column: 'count', direction: 'ascending' }, columns),
    ).not.toThrow();
    expect(ids(rows)).toEqual(['b', 'a']);
  });
});

describe('nextSort', () => {
  it('cycles ascending, descending, none, and restarts on another column', () => {
    expect(nextSort(null, 'a')).toEqual({ column: 'a', direction: 'ascending' });
    expect(nextSort({ column: 'a', direction: 'ascending' }, 'a')).toEqual({
      column: 'a',
      direction: 'descending',
    });
    expect(nextSort({ column: 'a', direction: 'descending' }, 'a')).toBeNull();
    expect(nextSort({ column: 'a', direction: 'descending' }, 'b')).toEqual({
      column: 'b',
      direction: 'ascending',
    });
  });
});
