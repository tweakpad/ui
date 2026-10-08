import { describe, expect, it } from 'vitest';
import { segmentStatus, timelineState } from './state.js';
import type { TimelineItemInput } from './state.js';

const items = (count: number, overrides: Partial<TimelineItemInput>[] = []): TimelineItemInput[] =>
  Array.from({ length: count }, (_, index) => ({
    value: `s${index + 1}`,
    status: '',
    align: '',
    ...overrides[index],
  }));

describe('timeline state', () => {
  it('derives complete, current and upcoming from the root value', () => {
    const state = timelineState(items(5), 's3', 'end');
    expect(state.items.map((item) => item.status)).toEqual([
      'complete',
      'complete',
      'current',
      'upcoming',
      'upcoming',
    ]);
    expect(state.items.map((item) => item.current)).toEqual([false, false, true, false, false]);
  });

  it('derives none when the value is null, empty or unmatched', () => {
    for (const value of [null, '', 'missing'])
      expect(
        timelineState(items(3), value, 'end').items.every((item) => item.status === 'none'),
      ).toBe(true);
  });

  it('lets an item override only its own status', () => {
    const state = timelineState(items(4, [{}, {}, { status: 'complete' }]), 's2', 'end');
    expect(state.items.map((item) => item.status)).toEqual([
      'complete',
      'current',
      'complete',
      'upcoming',
    ]);
  });

  it('applies overrides without a root value and marks only the first current item', () => {
    const state = timelineState(
      items(3, [{ status: 'current' }, {}, { status: 'current' }]),
      null,
      'end',
    );
    expect(state.items.map((item) => item.status)).toEqual(['current', 'none', 'current']);
    expect(state.items.map((item) => item.current)).toEqual([true, false, false]);
  });

  it('takes each segment from its earlier item and hides the outer ends', () => {
    expect(segmentStatus('complete', 'upcoming')).toBe('complete');
    expect(segmentStatus('current', 'upcoming')).toBe('upcoming');
    expect(segmentStatus('none', 'none')).toBe('none');
    expect(segmentStatus('none', 'current')).toBe('upcoming');
    const state = timelineState(items(4), 's3', 'end');
    expect(state.items.map((item) => [item.before, item.after])).toEqual([
      ['none', 'complete'],
      ['complete', 'complete'],
      ['complete', 'upcoming'],
      ['upcoming', 'none'],
    ]);
  });

  it('resolves sides for every alignment and per-item overrides', () => {
    const sides = (align: Parameters<typeof timelineState>[2], overrides = []) =>
      timelineState(items(4, overrides), null, align).items.map((item) => item.side);
    expect(sides('end')).toEqual(['end', 'end', 'end', 'end']);
    expect(sides('start')).toEqual(['start', 'start', 'start', 'start']);
    expect(sides('alternate')).toEqual(['end', 'start', 'end', 'start']);
    expect(sides('alternate-reverse')).toEqual(['start', 'end', 'start', 'end']);
    expect(sides('alternate', [{ align: 'start' }, { align: 'start' }] as never)).toEqual([
      'start',
      'start',
      'end',
      'start',
    ]);
  });

  it('reports duplicate non-empty values and positions', () => {
    const state = timelineState(
      items(3, [{ value: 'a' }, { value: 'a' }, { value: '' }]),
      'a',
      'end',
    );
    expect(state.duplicates).toEqual(['a']);
    expect(state.items.map((item) => [item.index, item.first, item.last])).toEqual([
      [0, true, false],
      [1, false, false],
      [2, false, true],
    ]);
    expect(state.items[0]!.status).toBe('current');
  });

  it('handles empty and single-item timelines', () => {
    expect(timelineState([], 'x', 'end').items).toEqual([]);
    const [only] = timelineState(items(1), 's1', 'end').items;
    expect([only!.before, only!.after, only!.first, only!.last]).toEqual([
      'none',
      'none',
      true,
      true,
    ]);
  });
});
