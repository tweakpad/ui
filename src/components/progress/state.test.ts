import { describe, expect, it } from 'vitest';
import { progressState } from './state.js';

describe('Progress publication', () => {
  it('keeps custom range, formatting and geometry coherent through clamping', () => {
    const half = progressState({ value: 30, minimum: 20, maximum: 40, locale: 'en-US' });
    expect([half.clampedValue, half.percentage, half.formattedValue, half.status]).toEqual([
      30,
      50,
      '50%',
      'progressing',
    ]);
    const full = progressState({ value: 50, minimum: 20, maximum: 40, locale: 'en-US' });
    expect([full.clampedValue, full.percentage, full.formattedValue, full.status]).toEqual([
      40,
      100,
      '100%',
      'complete',
    ]);
    const empty = progressState({ value: 10, minimum: 20, maximum: 40, locale: 'en-US' });
    expect([empty.clampedValue, empty.percentage, empty.formattedValue]).toEqual([20, 0, '0%']);
  });
  it.each([null, Number.NaN, Infinity, -Infinity])(
    'omits current and percentage for %s',
    (value) => {
      const state = progressState({ value, minimum: 0, maximum: 100 });
      expect([state.clampedValue, state.percentage, state.formattedValue, state.status]).toEqual([
        null,
        null,
        '',
        'indeterminate',
      ]);
    },
  );
  it('formats clamped scalar and supplies the raw value to the accessible resolver', () => {
    let received: unknown;
    const state = progressState({
      value: 50,
      minimum: 20,
      maximum: 40,
      locale: 'en-US',
      format: { style: 'currency', currency: 'USD' },
      getAccessibleValueText: (formatted, raw) => {
        received = [formatted, raw];
        return formatted + ' transferred';
      },
    });
    expect(received).toEqual(['$40.00', 50]);
    expect(state.accessibleValueText).toBe('$40.00 transferred');
  });
  it('passes empty formatting to indeterminate resolver and respects explicit readable text', () => {
    let received: unknown;
    expect(
      progressState({
        value: null,
        minimum: 0,
        maximum: 100,
        getAccessibleValueText: (formatted, raw) => {
          received = [formatted, raw];
          return 'Waiting';
        },
      }).accessibleValueText,
    ).toBe('Waiting');
    expect(received).toEqual(['', null]);
    expect(
      progressState({
        value: 50,
        minimum: 0,
        maximum: 100,
        valueText: 'Halfway',
        getAccessibleValueText: () => 'Other',
      }).accessibleValueText,
    ).toBe('Halfway');
  });
  it('publishes a safe zero range snapshot and diagnostic for an invalid configuration', () => {
    const errors: string[] = [];
    const state = progressState({
      value: 80,
      minimum: 50,
      maximum: 40,
      diagnostic: (code) => errors.push(code),
    });
    expect(errors).toEqual(['range']);
    expect([
      state.invalidRange,
      state.minimum,
      state.maximum,
      state.clampedValue,
      state.percentage,
    ]).toEqual([true, 0, 100, 0, 0]);
    expect(Object.isFrozen(state)).toBe(true);
    expect([state.rawMinimum, state.rawMaximum, state.value]).toEqual([50, 40, 80]);
    const unknown = progressState({ value: null, minimum: 50, maximum: 40 });
    expect([
      unknown.status,
      unknown.percentage,
      unknown.clampedValue,
      unknown.formattedValue,
    ]).toEqual(['indeterminate', null, null, '']);
  });
  it('falls back deterministically from malformed locale/format while reporting the error', () => {
    const errors: string[] = [];
    const state = progressState({
      value: 50,
      minimum: 0,
      maximum: 100,
      locale: 'invalid_locale',
      diagnostic: (code) => errors.push(code),
    });
    expect(errors).toEqual(['format']);
    expect(state.formattedValue).toBe(
      new Intl.NumberFormat(undefined, { style: 'percent' }).format(0.5),
    );
  });
});
