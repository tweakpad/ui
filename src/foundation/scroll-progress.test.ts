import { describe, expect, it } from 'vitest';
import { parseScrollRange, rangeProgress } from './scroll-progress.js';

// A 1000px visible extent from 0 to 1000.
const at = (range: Parameters<typeof rangeProgress>[0], start: number, size: number) =>
  rangeProgress(range, start, size, 0, 1000);

describe('scroll ranges', () => {
  it('cover runs from entering at the end to leaving at the start', () => {
    expect(at('cover', 1000, 200)).toBe(0);
    expect(at('cover', 400, 200)).toBeCloseTo(0.5);
    expect(at('cover', -200, 200)).toBe(1);
  });

  it('contain runs while a shorter box fills its place in the extent', () => {
    expect(at('contain', 800, 200)).toBe(0); // fully entered at the end
    expect(at('contain', 400, 200)).toBeCloseTo(0.5);
    expect(at('contain', 0, 200)).toBe(1); // starting to leave at the start
    expect(at('contain', 1200, 200)).toBe(0);
  });

  it('contain runs a pinned track from its start at the top to its end at the bottom', () => {
    // A 3000px track: start edge at the visible start, then its end edge at the visible end.
    expect(at('contain', 0, 3000)).toBe(0);
    expect(at('contain', -1000, 3000)).toBeCloseTo(0.5);
    expect(at('contain', -2000, 3000)).toBe(1);
    expect(at('contain', 500, 3000)).toBe(0);
  });

  it('entry and exit cover entering and leaving', () => {
    expect(at('entry', 1000, 200)).toBe(0);
    expect(at('entry', 900, 200)).toBeCloseTo(0.5);
    expect(at('entry', 800, 200)).toBe(1);
    expect(at('exit', 0, 200)).toBe(0);
    expect(at('exit', -100, 200)).toBeCloseTo(0.5);
    expect(at('exit', -200, 200)).toBe(1);
    // A tall box enters once its start reaches the visible start.
    expect(at('entry', 0, 3000)).toBe(1);
    expect(at('exit', -2000, 3000)).toBe(0);
  });

  it('parses ranges with contain as the default', () => {
    expect(parseScrollRange('cover')).toBe('cover');
    expect(parseScrollRange('bogus')).toBe('contain');
    expect(parseScrollRange(null)).toBe('contain');
  });
});
