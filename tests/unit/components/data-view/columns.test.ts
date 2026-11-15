import { describe, expect, it } from 'vitest';
import {
  cellText,
  cellValue,
  columnTracks,
  defaultRowId,
  duplicateColumnIds,
  rowIdentities,
} from '../../../../src/components/data-view/columns.js';
import type { DataViewColumn } from '../../../../src/components/data-view/types.js';

describe('data view columns', () => {
  it('builds the grid tracks with the default width', () => {
    expect(
      columnTracks([
        { id: 'a', header: 'A' },
        { id: 'b', header: 'B', width: '6rem' },
      ]),
    ).toBe('minmax(8rem, 1fr) 6rem');
    expect(columnTracks([])).toBe('1fr');
  });

  it('reads values and text', () => {
    const column: DataViewColumn<{ n: number }> = { id: 'n', header: 'N' };
    expect(cellValue(column, { n: 3 })).toBe(3);
    expect(cellText(column, { n: 3 })).toBe('3');
    expect(cellText({ id: 'x', header: 'X' }, {})).toBe('');
    const formatted: DataViewColumn<{ n: number }> = {
      id: 'n',
      header: 'N',
      value: (row) => row.n * 2,
      format: (value) => `${value}!`,
    };
    expect(cellText(formatted, { n: 3 })).toBe('6!');
  });

  it('reports repeated column ids', () => {
    expect(
      duplicateColumnIds([
        { id: 'a', header: '' },
        { id: 'a', header: '' },
        { id: 'b', header: '' },
      ]),
    ).toEqual(['a']);
  });
});

describe('row identities', () => {
  it('reads row.id by default', () => {
    expect(defaultRowId({ id: 7 })).toBe('7');
    expect(defaultRowId({ id: 'x' })).toBe('x');
    expect(defaultRowId({})).toBeUndefined();
    expect(defaultRowId(null)).toBeUndefined();
  });

  it('falls back to a unique index key for missing and repeated ids', () => {
    const rows = [{ id: 'a' }, { id: 'a' }, {}, { id: '#2' }];
    const identities = rowIdentities(rows, (row) => defaultRowId(row));
    expect(identities.missing).toBe(1);
    expect(identities.duplicates).toEqual(['a']);
    expect(new Set(identities.ids).size).toBe(4);
    expect(identities.ids[0]).toBe('a');
    expect(identities.index.get('a')).toBe(0);
  });
});
