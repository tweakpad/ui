import { describe, expect, it } from 'vitest';
import { nonnegative, scrollEdges, scrollTarget, readingVisibility } from './geometry.js';
describe('Message Scroller geometry', () => {
  it('aligns within asymmetric content padding with margin', () => {
    const row = { top: 300, height: 50 };
    expect(scrollTarget(row, 0, 200, 10, 20, 'start', 5)).toBe(285);
    expect(scrollTarget(row, 0, 200, 10, 20, 'center', 5)).toBe(225);
    expect(scrollTarget(row, 0, 200, 10, 20, 'end', 5)).toBe(175);
    expect(scrollTarget(row, 200, 200, 10, 20, 'nearest', 5)).toBe(200);
    expect(scrollTarget(row, 0, 200, 10, 20, 'nearest', 5)).toBe(175);
  });
  it('keeps independent edges and suppresses transient follow gaps', () => {
    expect(scrollEdges(0, 400, 200, 8)).toEqual({ start: false, end: true });
    expect(scrollEdges(100, 400, 200, 8)).toEqual({ start: true, end: true });
    expect(scrollEdges(193, 400, 200, 8)).toEqual({ start: true, end: false });
    expect(scrollEdges(100, 500, 200, 8, true)).toEqual({ start: true, end: false });
  });
  it('normalizes nonnegative geometry without NaN poisoning layout', () => {
    expect([-1, NaN, Infinity, 0, 2.5].map(nonnegative)).toEqual([0, 0, 0, 0, 2.5]);
  });
  it('keeps the prior anchor and excludes the peek band in the no-observer fallback', () => {
    const rows = [
      { id: 'prior', anchor: true, top: 0, height: 30 },
      { id: 'peek', anchor: false, top: 90, height: 30 },
      { id: 'reading', anchor: false, top: 120, height: 80 },
      { id: 'next', anchor: true, top: 240, height: 40 },
      { id: 'anonymous', anchor: true, top: 110, height: 40, addressable: false },
    ];
    expect(readingVisibility(rows, (row) => row, 120, 250)).toEqual({
      visibleMessageIds: ['reading', 'next'],
      currentAnchorId: 'prior',
    });
    expect(
      readingVisibility(
        rows,
        (row) => row,
        240,
        400,
        (row) => row.id === 'next',
      ),
    ).toEqual({
      visibleMessageIds: ['next'],
      currentAnchorId: 'next',
    });
  });
});
