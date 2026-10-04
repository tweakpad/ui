import { describe, expect, it } from 'vitest';
import { meterState } from './meter.js';
import { progressState } from '../components/progress/state.js';

describe('Meter measurement state', () => {
  it('keeps a nonzero range, readable text and geometry coherent', () => {
    const state = meterState({ value: 30, minimum: 20, maximum: 40, locale: 'en-US' });
    expect([
      state.clampedValue,
      state.normalizedPercentage,
      state.percentage,
      state.formattedValue,
    ]).toEqual([30, 0.5, 50, '50%']);
    expect(Object.isFrozen(state)).toBe(true);
  });
  it.each([
    [NaN, 20],
    [-Infinity, 20],
    [Infinity, 40],
    [10, 20],
    [50, 40],
  ])(
    'clamps measurement %s to %s while Progress nonfinite stays indeterminate',
    (value, expected) => {
      const meter = meterState({ value, minimum: 20, maximum: 40 });
      expect(meter.clampedValue).toBe(expected);
      if (!Number.isFinite(value)) {
        expect(progressState({ value, minimum: 20, maximum: 40 }).status).toBe('indeterminate');
        expect(Number.isFinite(meter.percentage)).toBe(true);
      }
    },
  );
  it('formats the clamped scalar but passes the raw scalar to the accessible resolver', () => {
    let args: unknown;
    const state = meterState({
      value: 150,
      locale: 'en-US',
      format: { style: 'currency', currency: 'USD' },
      getAccessibleValueText: (text, raw) => {
        args = [text, raw];
        return `${text} capacity`;
      },
    });
    expect(args).toEqual(['$100.00', 150]);
    expect(state.accessibleValueText).toBe('$100.00 capacity');
    expect(
      meterState({ value: 30, valueText: 'Explicit', getAccessibleValueText: () => 'Other' })
        .accessibleValueText,
    ).toBe('Explicit');
  });
  it.each([
    [5, 5],
    [10, 5],
    [-Number.MAX_VALUE, Number.MAX_VALUE],
    [0, Infinity],
  ])('reports invalid range %s..%s with safe zero geometry', (minimum, maximum) => {
    const errors: string[] = [];
    const state = meterState({
      value: 10,
      minimum,
      maximum,
      diagnostic: (code) => errors.push(code),
    });
    expect(errors).toEqual(['range']);
    expect([state.invalidRange, state.percentage, state.clampedValue]).toEqual([true, 0, 0]);
  });
  it('uses localized percent by default and diagnoses invalid format', () => {
    expect(meterState({ value: 30, locale: 'de-DE' }).formattedValue).toBe(
      new Intl.NumberFormat('de-DE', { style: 'percent' }).format(0.3),
    );
    const errors: string[] = [];
    const state = meterState({
      value: 30,
      locale: 'invalid_locale',
      diagnostic: (code) => errors.push(code),
    });
    expect(errors).toEqual(['format']);
    expect(state.formattedValue).toBe(
      new Intl.NumberFormat(undefined, { style: 'percent' }).format(0.3),
    );
  });
});
