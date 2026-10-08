import { describe, expect, it } from 'vitest';
import {
  parseScrollRange,
  parseScrollRangeSpan,
  rangeProgress,
  spanProgress,
} from './scroll-progress.js';

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

describe('scroll range offsets', () => {
  const span = (value: string, start: number, size: number) =>
    spanProgress(parseScrollRangeSpan(value), start, size, 0, 1000);

  it('parses names, start points and start and end points', () => {
    expect(parseScrollRangeSpan('entry')).toEqual({
      start: { name: 'entry', fraction: 0 },
      end: { name: 'entry', fraction: 1 },
    });
    expect(parseScrollRangeSpan('entry 20%')).toEqual({
      start: { name: 'entry', fraction: 0.2 },
      end: { name: 'entry', fraction: 1 },
    });
    expect(parseScrollRangeSpan(' entry 20%  contain 50% ')).toEqual({
      start: { name: 'entry', fraction: 0.2 },
      end: { name: 'contain', fraction: 0.5 },
    });
    expect(parseScrollRangeSpan('entry exit')).toEqual({
      start: { name: 'entry', fraction: 0 },
      end: { name: 'exit', fraction: 1 },
    });
  });

  it('falls back to contain for anything unparsable', () => {
    const contain = parseScrollRangeSpan('contain');
    for (const value of [
      '',
      null,
      'bogus',
      '20%',
      'entry 20% 30%',
      'entry contain exit',
      'entry 20px',
    ])
      expect(parseScrollRangeSpan(value)).toEqual(contain);
  });

  it('whole ranges match the named mappings', () => {
    for (const name of ['cover', 'contain', 'entry', 'exit'] as const)
      for (const [start, size] of [
        [900, 200],
        [400, 200],
        [-100, 200],
        [-1000, 3000],
      ] as const)
        expect(span(name, start, size)).toBeCloseTo(at(name, start, size));
  });

  it('runs linearly between points of different ranges', () => {
    // A 200px box: entry 0% at start 1000, entry 100% (contain 0%) at 800, contain 100% at 0.
    expect(span('entry 0% contain 100%', 1000, 200)).toBe(0);
    expect(span('entry 0% contain 100%', 500, 200)).toBeCloseTo(0.5);
    expect(span('entry 0% contain 100%', 0, 200)).toBe(1);
    // From 20% entered (960) to half way through contain (400).
    expect(span('entry 20% contain 50%', 960, 200)).toBe(0);
    expect(span('entry 20% contain 50%', 680, 200)).toBeCloseTo(0.5);
    expect(span('entry 20% contain 50%', 400, 200)).toBe(1);
    expect(span('entry 20% contain 50%', 100, 200)).toBe(1);
  });

  it('a start point alone ends at the end of its range', () => {
    expect(span('cover 50%', 400, 200)).toBe(0);
    expect(span('cover 50%', 100, 200)).toBeCloseTo(0.5);
    expect(span('cover 50%', -200, 200)).toBe(1);
  });

  it('offsets a pinned track', () => {
    // A 3000px track runs contain from 0 to -2000; its first half is -1000.
    expect(span('contain 0% contain 50%', -500, 3000)).toBeCloseTo(0.5);
    expect(span('contain 0% contain 50%', -1000, 3000)).toBe(1);
  });
});
