import { describe, expect, it } from 'vitest';
import {
  moveSliderThumb,
  normalizeSliderValues,
  sliderConfigurationError,
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
