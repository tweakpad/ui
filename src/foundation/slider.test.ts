import { describe, expect, it } from 'vitest';
import {
  moveSliderThumb,
  normalizeSliderValues,
  sliderConfigurationError,
  sliderValueFromRatio,
  snapSliderValue,
} from './slider.js';

describe('slider value model', () => {
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
