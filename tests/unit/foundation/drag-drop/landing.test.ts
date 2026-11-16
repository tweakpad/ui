import { describe, expect, it } from 'vitest';
import {
  landingLine,
  landingSide,
  landingTarget,
} from '../../../../src/foundation/drag-drop/landing.js';

const box = (start: number, end: number) => ({ start, end });

describe('the shared landing rules', () => {
  it('lands on a side of the item by where the pointer is: halves, or quarters around into', () => {
    const row = box(100, 140);
    expect(landingSide(row, 105, { into: true })).toBe('before');
    expect(landingSide(row, 110, { into: true })).toBe('into');
    expect(landingSide(row, 129, { into: true })).toBe('into');
    expect(landingSide(row, 130, { into: true })).toBe('after');
    expect(landingSide(row, 119)).toBe('before');
    expect(landingSide(row, 120)).toBe('after');
    // A right-to-left row measured left to right: the left half is after.
    expect(landingSide(row, 105, { reversed: true })).toBe('after');
  });

  it('targets the item under the pointer, else the nearest across a gap', () => {
    const rows = [
      { id: 'a', box: box(0, 40) },
      { id: 'b', box: box(48, 88) },
      { id: 'c', box: box(96, 136) },
    ];
    expect(landingTarget(rows, 60)?.id).toBe('b');
    // In the gap between b and c, nearer c's center.
    expect(landingTarget(rows, 93)?.id).toBe('c');
    expect(landingTarget(rows, 200)?.id).toBe('c');
    expect(landingTarget([], 10)).toBeNull();
  });

  it('marks the place halfway across the gap, or half a gap beyond an end', () => {
    expect(landingLine(box(0, 40), box(48, 88))).toBe(44);
    expect(landingLine(box(0, 40), null, 8)).toBe(44);
    expect(landingLine(null, box(48, 88), 8)).toBe(44);
    expect(landingLine(box(0, 40), null)).toBe(40);
    // Measured against the order (right to left): beyond the end is to the left.
    expect(landingLine(box(100, 60), null, 8, -1)).toBe(56);
    expect(landingLine(null, null)).toBeNull();
  });
});
