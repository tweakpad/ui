import { describe, expect, it } from 'vitest';
import {
  moveSliderThumb,
  normalizeSliderBufferedRanges,
  normalizeSliderSegments,
  normalizeSliderValues,
  sliderBufferEnd,
  sliderCenterDetent,
  sliderOnLattice,
  sliderConfigurationError,
  sliderPointerRatio,
  sliderRangeIndeterminate,
  sliderRatio,
  sliderRawValueFromRatio,
  sliderSegmentStates,
  sliderTicks,
  sliderTicksActive,
  sliderValueFromRatio,
  snapSliderValue,
} from './slider.js';

describe('slider value model', () => {
  const move = (overrides: Partial<Parameters<typeof moveSliderThumb>[0]> = {}) =>
    moveSliderThumb({
      values: [20, 40, 60],
      identities: ['a', 'b', 'c'],
      index: 0,
      proposedValue: 70,
      minimum: 0,
      maximum: 100,
      step: 1,
      minStepsBetweenValues: 10,
      collisionBehavior: 'push',
      ...overrides,
    });
  it('pushes neighboring values and does not restore them when reversing', () => {
    const pushed = move();
    expect(pushed.values).toEqual([70, 80, 90]);
    expect(move({ values: pushed.values, proposedValue: 30 }).values).toEqual([30, 80, 90]);
  });
  it('limits pushing at bounds and at disabled neighboring members', () => {
    expect(move({ proposedValue: 100 }).values).toEqual([80, 90, 100]);
    expect(move({ disabled: [false, true, false] }).values).toEqual([30, 40, 60]);
    expect(move({ index: 1, disabled: [false, true, false] }).values).toEqual([20, 40, 60]);
  });
  it('does not exchange disabled member identities', () => {
    expect(move({ collisionBehavior: 'swap', disabled: [false, true, false] }).identities).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
  it('retains tiny finite decimal lattice precision', () => {
    expect(snapSliderValue(3.3e-14, 1e-14, 1e-12, 1e-14)).toBe(3e-14);
  });
  it('pushes downward without moving a disabled lower barrier', () => {
    expect(move({ index: 2, proposedValue: 0 }).values).toEqual([0, 10, 20]);
    expect(move({ index: 2, proposedValue: 0, disabled: [true, false, false] }).values).toEqual([
      20, 30, 40,
    ]);
  });
  it('keeps a positive step separation when none clamps at either neighbor', () => {
    expect(move({ index: 1, proposedValue: 100, collisionBehavior: 'none' }).values).toEqual([
      20, 50, 60,
    ]);
    expect(move({ index: 1, proposedValue: 0, collisionBehavior: 'none' }).values).toEqual([
      20, 30, 60,
    ]);
  });
  it('does not mutate consumer value/identity arrays', () => {
    const values = Object.freeze([20, 40, 60]);
    const identities = Object.freeze(['a', 'b', 'c']);
    expect(move({ values, identities }).values).toEqual([70, 80, 90]);
    expect(values).toEqual([20, 40, 60]);
    expect(identities).toEqual(['a', 'b', 'c']);
  });
  it('snaps to the minimum-based step lattice and clamps to bounds', () => {
    expect(snapSliderValue(4.4, 1, 10, 2)).toBe(5);
    expect(snapSliderValue(-10, 1, 10, 2)).toBe(1);
    expect(sliderValueFromRatio(1, 1, 10, 2)).toBe(9);
  });

  it('normalizes an ordered range with minimum separation', () => {
    expect(normalizeSliderValues([80, 21, 20], 0, 100, 5, 2)).toEqual([20, 30, 80]);
  });

  it('prevents crossing without moving the neighboring thumb', () => {
    expect(
      moveSliderThumb({
        values: [20, 60],
        identities: ['low', 'high'],
        index: 0,
        proposedValue: 80,
        minimum: 0,
        maximum: 100,
        step: 1,
        minStepsBetweenValues: 0,
        crossing: 'prevent',
      }),
    ).toEqual({ values: [60, 60], identities: ['low', 'high'], activeIndex: 0 });
  });

  it('atomically swaps thumb identity and active index when crossing', () => {
    expect(
      moveSliderThumb({
        values: [20, 60],
        identities: ['low', 'high'],
        index: 0,
        proposedValue: 80,
        minimum: 0,
        maximum: 100,
        step: 1,
        minStepsBetweenValues: 0,
        crossing: 'swap',
      }),
    ).toEqual({ values: [60, 80], identities: ['high', 'low'], activeIndex: 1 });
  });

  it('rejects an impossible separation configuration', () => {
    expect(sliderConfigurationError(0, 10, 1, 10, 6, 3)).toContain('cannot contain');
  });

  it('preserves finite input without producing NaN for invalid configuration', () => {
    expect(normalizeSliderValues([20, 40], 10, 10, 0, 0)).toEqual([20, 40]);
    expect(snapSliderValue(Number.NaN, 10, 10, 0)).toBe(0);
  });
});

describe('slider media extensions (mp-slider-media)', () => {
  it('declares empty and non-finite domains indeterminate instead of a configuration error', () => {
    for (const [minimum, maximum] of [
      [0, 0],
      [10, 5],
      [0, Number.NaN],
      [0, Number.POSITIVE_INFINITY],
      [Number.NEGATIVE_INFINITY, 10],
    ] as const) {
      expect(sliderRangeIndeterminate(minimum, maximum)).toBe(true);
      expect(sliderConfigurationError(minimum, maximum, 1, 10, 0, 1)).toBeNull();
      expect(sliderConfigurationError(minimum, maximum, 1, 10, 5, 3)).toBeNull();
    }
    expect(sliderRangeIndeterminate(0, 100)).toBe(false);
    // Other configuration errors are still diagnosed while indeterminate.
    expect(sliderConfigurationError(0, Number.NaN, 0, 10, 0, 1)).toContain('step');
    expect(sliderConfigurationError(0, 0, 1, 10, 0, 0)).toContain('requires a value');
  });

  it('maps ratios safely for indeterminate domains', () => {
    expect(sliderRatio(25, 0, 100)).toBe(0.25);
    expect(sliderRatio(150, 0, 100)).toBe(1);
    expect(sliderRatio(5, 0, Number.NaN)).toBe(0);
    expect(sliderRatio(5, 10, 10)).toBe(0);
    expect(sliderRawValueFromRatio(0.333, 0, 120)).toBeCloseTo(39.96);
    expect(sliderRawValueFromRatio(2, 0, 120)).toBe(120);
    expect(sliderRawValueFromRatio(0.5, 0, Number.NaN)).toBeNaN();
  });

  it('normalizes buffered ranges: finite, clamped, ordered and merged', () => {
    expect(
      normalizeSliderBufferedRanges(
        [
          [50, 70],
          [-10, 20],
          [15, 30],
          [80, Number.NaN],
          [90, 90],
          [95, 200],
        ],
        0,
        100,
      ),
    ).toEqual([
      [0, 30],
      [50, 70],
      [95, 100],
    ]);
    expect(normalizeSliderBufferedRanges([[0, 10]], 0, Number.NaN)).toEqual([]);
    expect(normalizeSliderBufferedRanges(undefined, 0, 100)).toEqual([]);
  });

  it('publishes the end of the range containing the value, else the last range', () => {
    const ranges: Array<[number, number]> = [
      [0, 30],
      [50, 70],
    ];
    expect(sliderBufferEnd(ranges, 10)).toBe(30);
    expect(sliderBufferEnd(ranges, 55)).toBe(70);
    expect(sliderBufferEnd(ranges, 40)).toBe(70);
    expect(sliderBufferEnd(ranges, undefined)).toBe(70);
    expect(sliderBufferEnd([], 10)).toBeNull();
  });

  it('normalizes chapter segments and derives fill, buffer, active and highlighted state', () => {
    const segments = normalizeSliderSegments(
      [
        { start: 60, end: 120, label: 'Two' },
        { start: 0, end: 60, label: 'One' },
        { start: 30, end: 30 },
        { start: Number.NaN, end: 10 },
      ],
      0,
      100,
    );
    expect(segments).toEqual([
      { start: 0, end: 60, label: 'One' },
      { start: 60, end: 100, label: 'Two' },
    ]);
    const states = sliderSegmentStates(segments, {
      minimum: 0,
      maximum: 100,
      value: 30,
      pointerValue: 80,
      bufferEnd: 70,
    });
    expect(states.map((state) => [state.startRatio, state.widthRatio])).toEqual([
      [0, 0.6],
      [0.6, 0.4],
    ]);
    expect(states.map((state) => state.fillRatio)).toEqual([0.5, 0]);
    expect(states.map((state) => state.bufferRatio)).toEqual([1, 0.25]);
    expect(states.map((state) => state.active)).toEqual([true, false]);
    expect(states.map((state) => state.highlighted)).toEqual([false, true]);
    expect(states[0]!.label).toBe('One');
    // A boundary belongs to the later segment; the final end belongs to the last segment.
    const at = (value: number) =>
      sliderSegmentStates(segments, {
        minimum: 0,
        maximum: 100,
        value,
        pointerValue: null,
        bufferEnd: null,
      }).map((state) => state.active);
    expect(at(60)).toEqual([false, true]);
    expect(at(100)).toEqual([false, true]);
    expect(
      sliderSegmentStates(segments, {
        minimum: 0,
        maximum: Number.NaN,
        value: 0,
        pointerValue: null,
        bufferEnd: null,
      }),
    ).toEqual([]);
  });

  it('maps pointer coordinates along orientation, direction and edge inset', () => {
    const rect = { left: 100, top: 50, width: 200, height: 100 };
    const base = { clientX: 150, clientY: 75, rect } as const;
    expect(sliderPointerRatio({ ...base, orientation: 'horizontal', direction: 'ltr' })).toBe(0.25);
    expect(sliderPointerRatio({ ...base, orientation: 'horizontal', direction: 'rtl' })).toBe(0.75);
    expect(sliderPointerRatio({ ...base, orientation: 'vertical', direction: 'rtl' })).toBe(0.75);
    expect(
      sliderPointerRatio({ ...base, orientation: 'horizontal', direction: 'ltr', inset: 25 }),
    ).toBeCloseTo(25 / 150);
    expect(
      sliderPointerRatio({ ...base, clientX: 0, orientation: 'horizontal', direction: 'ltr' }),
    ).toBe(0);
    expect(
      sliderPointerRatio({
        ...base,
        rect: { ...rect, width: 0 },
        orientation: 'horizontal',
        direction: 'ltr',
      }),
    ).toBeNull();
  });
});

describe('slider ticks', () => {
  it('draws ticks every interval from the minimum with a distinct center', () => {
    const ticks = sliderTicks(0, 2, 0.25);
    expect(ticks.map((tick) => tick.value)).toEqual([0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
    expect(ticks.filter((tick) => tick.center).map((tick) => tick.value)).toEqual([1]);
  });

  it('keeps float intervals on their decimal grid and clamps to the domain', () => {
    const ticks = sliderTicks(0, 1, 0.1);
    expect(ticks.map((tick) => tick.value)).toEqual([
      0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1,
    ]);
    expect(sliderTicks(0, 10, 3, 1).map((tick) => tick.value)).toEqual([0, 3, 5, 6, 9]);
  });

  it('draws only values the slider can take', () => {
    // Snapping to whole days: the midpoint 2.5 is not a value, so no center tick.
    const days = sliderTicks(0, 5, 1);
    expect(days.map((tick) => tick.value)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(days.some((tick) => tick.center)).toBe(false);
    // Free movement on whole steps: quarter ticks off the step lattice are left out.
    expect(sliderTicks(0, 2, 0.25, 1).map((tick) => tick.value)).toEqual([0, 1, 2]);
    expect(sliderTicks(0, 2, 0.25, 1).find((tick) => tick.center)?.value).toBe(1);
    expect(sliderOnLattice(2.5, 0, 1)).toBe(false);
    expect(sliderOnLattice(0.3, 0, 0.1)).toBe(true);
  });

  it('thins drawn ticks to the minimum spacing and always keeps the center', () => {
    const ticks = sliderTicks(0, 100, 1, 1, 100, 6);
    const regular = ticks.filter((tick) => !tick.center);
    expect(regular.every((tick) => tick.value % 6 === 0)).toBe(true);
    expect(ticks.some((tick) => tick.center && tick.value === 50)).toBe(true);
    for (const [index, tick] of ticks.entries())
      if (index) expect((tick.ratio - ticks[index - 1]!.ratio) * 100).toBeGreaterThanOrEqual(2);
  });

  it('draws nothing without a positive finite interval or a determinate domain', () => {
    expect(sliderTicks(0, 1, undefined)).toEqual([]);
    expect(sliderTicks(0, 1, 0)).toEqual([]);
    expect(sliderTicks(0, 1, Number.NaN)).toEqual([]);
    expect(sliderTicks(1, 1, 0.1)).toEqual([]);
    expect(sliderTicksActive(0.5, 0, 1)).toBe(true);
    expect(sliderConfigurationError(0, 10, 1, 10, 0, 1, -1)).toContain('ticks');
    expect(sliderConfigurationError(0, 10, 1, 10, 0, 1, 2)).toBeNull();
  });

  it('pulls a pointer within the detent distance onto the center', () => {
    expect(sliderCenterDetent(0.5 + 5 / 200, 200, 6)).toBe(0.5);
    expect(sliderCenterDetent(0.5 - 6 / 200, 200, 6)).toBe(0.5);
    expect(sliderCenterDetent(0.5 + 7 / 200, 200, 6)).toBeCloseTo(0.535);
    expect(sliderCenterDetent(0.2, 0, 6)).toBe(0.2);
  });
});
