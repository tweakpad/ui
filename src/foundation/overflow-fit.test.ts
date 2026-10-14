import { describe, expect, it } from 'vitest';
import {
  fitPartition,
  limitPartition,
  resolveItemLimit,
  rowCount,
  shownRange,
  type FitRequest,
} from './overflow-fit.js';

const fixedCount = () => 24;

function fit(overrides: Partial<FitRequest>): number {
  return fitPartition({
    sizes: [40, 40, 40, 40, 40, 40],
    gap: 4,
    available: 100,
    maxRows: 1,
    from: 'end',
    countSize: fixedCount,
    ...overrides,
  });
}

describe('item limit', () => {
  it('truncates fractions and treats values below one or not numbers as no limit', () => {
    expect(resolveItemLimit(3)).toBe(3);
    expect(resolveItemLimit(2.7)).toBe(2);
    expect(resolveItemLimit('4')).toBe(4);
    expect(resolveItemLimit(0.5)).toBeUndefined();
    expect(resolveItemLimit(0)).toBeUndefined();
    expect(resolveItemLimit(-1)).toBeUndefined();
    expect(resolveItemLimit(Number.NaN)).toBeUndefined();
    expect(resolveItemLimit(null)).toBeUndefined();
    expect(resolveItemLimit('')).toBeUndefined();
    expect(resolveItemLimit(Infinity)).toBeUndefined();
  });

  it('shows at most the limit', () => {
    expect(limitPartition(8, 3)).toBe(3);
    expect(limitPartition(2, 3)).toBe(2);
    expect(limitPartition(8, undefined)).toBe(8);
  });

  it('shows the leading run from the end and the trailing run from the start', () => {
    expect(shownRange(8, 3, 'end')).toEqual([0, 3]);
    expect(shownRange(8, 3, 'start')).toEqual([5, 8]);
  });
});

describe('row count', () => {
  it('wraps like flex lines with gaps', () => {
    expect(rowCount([40, 40], 4, 100)).toBe(1);
    expect(rowCount([40, 40, 40], 4, 100)).toBe(2);
    expect(rowCount([50, 46], 4, 100)).toBe(1);
    expect(rowCount([50, 47], 4, 100)).toBe(2);
    expect(rowCount([], 4, 100)).toBe(0);
  });

  it('gives a box wider than a row a row of its own', () => {
    expect(rowCount([150], 4, 100)).toBe(1);
    expect(rowCount([20, 150, 20], 4, 100)).toBe(3);
  });
});

describe('fit', () => {
  it('shows every Item without a Count when all fit', () => {
    expect(fit({ sizes: [40, 40], available: 100 })).toBe(2);
    expect(fit({ sizes: [] })).toBe(0);
  });

  it('keeps the most Items that fit beside the Count', () => {
    // 40 + 4 + 24 = 68 fits; 40 + 4 + 40 + 4 + 24 = 112 does not.
    expect(fit({})).toBe(1);
    expect(fit({ available: 112 })).toBe(2);
    expect(fit({ maxRows: 2 })).toBe(3);
  });

  it('sizes the Count for the count it presents', () => {
    // "+5" needs 20, "+4" needs 40: two Items fit only with the narrower Count.
    const countSize = (hidden: number) => (hidden >= 5 ? 20 : 40);
    expect(fit({ sizes: [40, 40, 40, 40, 40, 40, 40], available: 108, countSize })).toBe(2);
  });

  it('shows the Count alone when no Item fits beside it', () => {
    expect(fit({ available: 50 })).toBe(0);
    expect(fit({ available: 10 })).toBe(0);
  });

  it('gives an Item wider than a row its own row', () => {
    expect(fit({ sizes: [150, 40, 40], maxRows: 2 })).toBe(3);
    expect(fit({ sizes: [150, 40, 40], maxRows: 1 })).toBe(0);
    expect(fit({ sizes: [40, 150, 40], maxRows: 2 })).toBe(1);
  });

  it('never shows more than the limit', () => {
    expect(fit({ limit: 2, maxRows: 4 })).toBe(2);
    expect(fit({ sizes: [40, 40], limit: 5 })).toBe(2);
  });

  it('places the Count first when collapsing from the start', () => {
    // The trailing Items stay; the Count precedes them on the first row.
    expect(fit({ sizes: [90, 40, 40, 40], from: 'start', maxRows: 2 })).toBe(3);
    expect(fit({ sizes: [40, 40, 40, 90], from: 'start', maxRows: 2 })).toBe(2);
  });
});
