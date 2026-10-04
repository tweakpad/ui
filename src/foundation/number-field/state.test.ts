import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { describe, expect, it } from 'vitest';
import { LocaleService } from '../services.js';
import { NumberFieldState, type NumberFieldStateOptions } from './state.js';
import {
  normalizeNumberFieldValue,
  numberFieldValidity,
  roundNumberFieldValue,
} from './numeric.js';

class Host extends EventTarget implements ReactiveControllerHost {
  controllers = new Set<ReactiveController>();
  addController(c: ReactiveController) {
    this.controllers.add(c);
  }
  removeController(c: ReactiveController) {
    this.controllers.delete(c);
  }
  requestUpdate() {}
  updateComplete = Promise.resolve(true);
}
const model = (options: NumberFieldStateOptions = {}) => {
  const host = new Host();
  const changes: Array<{ value: number | null; reason: string }> = [];
  const commits: Array<{ value: number | null; reason: string }> = [];
  const state = new NumberFieldState(
    { host },
    {
      ...options,
      onValueChange: (e) => {
        changes.push({ value: e.detail.value, reason: e.detail.reason });
        options.onValueChange?.(e);
      },
      onValueCommitted: (e) => {
        commits.push({ value: e.detail.value, reason: e.detail.reason });
        options.onValueCommitted?.(e);
      },
    },
  );
  return { host, state, changes, commits };
};

describe('shared locale numeric parsing', () => {
  it('recognizes locale digits/grouping/decimal and Unicode signs', () => {
    for (const [locale, text, value] of [
      ['de-DE', '−1.234,5', -1234.5],
      ['fr-FR', '1 234,5', 1234.5],
      ['ar-EG', '١٬٢٣٤٫٥', 1234.5],
      ['fa-IR', '۱۲۳٫۵', 123.5],
      ['en-US', '１２３．５', 123.5],
      ['zh-CN', '一二三.五', 123.5],
      ['hi-IN-u-nu-deva', '१२३.५', 123.5],
    ] as const)
      expect(new LocaleService(locale).parseNumber(text)).toEqual({ kind: 'number', value });
  });
  it('distinguishes editable incomplete input from invalid committed text', () => {
    const locale = new LocaleService('en-US');
    for (const text of ['-', '+', '.', '1.', '1e-'])
      expect(locale.parseNumber(text).kind).toBe('incomplete');
    expect(locale.parseNumber('1.', undefined, true)).toEqual({ kind: 'number', value: 1 });
    for (const text of ['-', '1e-', '12oops', '1.2.3', 'Infinity', '∞'])
      expect(locale.parseNumber(text, undefined, true).kind).toBe('invalid');
    expect(locale.parseNumber(' ')).toEqual({ kind: 'empty', value: null });
  });
  it('round-trips currency/accounting, units, scientific notation and percent without binary scaling noise', () => {
    const examples: Array<[string, Intl.NumberFormatOptions, number]> = [
      ['en-US', { style: 'currency', currency: 'USD', currencySign: 'accounting' }, -1234.5],
      ['de-DE', { style: 'currency', currency: 'EUR' }, 1234.5],
      ['en-US', { style: 'unit', unit: 'liter', unitDisplay: 'long' }, 12.5],
      ['ar-EG', { notation: 'scientific', maximumFractionDigits: 4 }, 12345],
      ['en-US', { style: 'percent', maximumFractionDigits: 6 }, 0.12345678],
      ['en-US', { style: 'unit', unit: 'percent' }, 12.5],
    ];
    for (const [language, format, value] of examples) {
      const locale = new LocaleService(language);
      expect(locale.parseNumber(locale.number(value, format), format, true)).toEqual({
        kind: 'number',
        value,
      });
    }
    expect(new LocaleService('en-US').parseNumber('12.5‰')).toEqual({
      kind: 'number',
      value: 0.0125,
    });
  });
  it('keeps formatting service behavior unchanged and gates minus only when requested', () => {
    const service = new LocaleService('de-DE');
    expect(service.number(1234.56789)).toBe(new Intl.NumberFormat('de-DE').format(1234.56789));
    expect(service.numberLocale().allowsCharacter('-', false)).toBe(false);
    expect(service.numberLocale().allowsCharacter('−', true)).toBe(true);
  });
});

describe('NumberField numeric/editor ownership', () => {
  it('retains unfinished text, publishes only valid numeric proposals and commits once at blur', () => {
    const { state, changes, commits } = model({ defaultValue: 1, step: 'any' });
    state.input('-');
    expect(state.value).toBe(1);
    expect(state.text).toBe('-');
    expect(changes).toEqual([]);
    state.input('2.');
    expect(state.value).toBe(1);
    expect(state.text).toBe('2.');
    state.blur();
    expect(state.value).toBe(2);
    expect(state.text).toBe('2');
    state.update({ disabled: true });
    expect(state.value).toBe(2);
    state.update({ disabled: false });
    expect(state.value).toBe(2);
    expect(commits).toEqual([{ value: 2, reason: 'input-blur' }]);
    state.blur();
    expect(commits).toHaveLength(1);
  });
  it('retains out-of-range display while the numeric proposal clamps, and supports unrestricted direct entry', () => {
    const a = model({ minimum: 0, maximum: 10 });
    a.state.input('999');
    expect(a.state.text).toBe('999');
    expect(a.state.value).toBe(10);
    a.state.blur();
    expect(a.state.text).toBe('10');
    const b = model({ minimum: 0, maximum: 10, allowOutOfRange: true });
    b.state.input('999');
    expect(b.state.value).toBe(999);
    expect(b.state.validity.rangeOverflow).toBe(true);
    b.state.step(-1);
    expect(b.state.value).toBe(10);
  });
  it('does not reparse rounded display text on no-edit blur or stepping', () => {
    const { state } = model({ defaultValue: 1.23456789, step: 0.00001 });
    expect(state.text).toBe('1.235');
    state.blur();
    expect(state.value).toBe(1.23456789);
    state.step(1);
    expect(state.value).toBeCloseTo(1.23457789, 12);
  });
  it('applies explicit format rounding to numeric values, including percent scale', () => {
    expect(roundNumberFieldValue(0.123456, { style: 'percent', maximumFractionDigits: 2 })).toBe(
      0.1235,
    );
    const { state } = model({ defaultValue: 1.2345, format: { maximumFractionDigits: 2 } });
    state.blur();
    expect(state.value).toBe(1.23);
  });
  it('restores invalid text at blur without losing the stored number', () => {
    const { state, changes, commits } = model({ defaultValue: 12 });
    state.input('12oops');
    expect(state.validity.badInput).toBe(true);
    state.blur();
    expect(state.text).toBe('12');
    expect(changes).toHaveLength(0);
    expect(commits).toHaveLength(0);
  });
  it('keeps text, number and commit history intact when a proposal is vetoed', () => {
    const { state, commits } = model({ defaultValue: 2, onValueChange: (e) => e.preventDefault() });
    state.input('2.');
    expect(state.step(1)).toBe(false);
    expect(state.text).toBe('2.');
    expect(state.value).toBe(2);
    expect(state.input('3')).toBe(false);
    expect(state.text).toBe('2.');
    expect(commits).toHaveLength(0);
  });
  it('uses atomic controlled publication and never commits a rejected owner write', () => {
    let veto = false;
    const setup = model({
      value: 1,
      onValueChange: (e) => {
        state.update({ value: e.detail.value });
        if (veto) e.preventDefault();
      },
    });
    const state = setup.state;
    expect(state.step(1)).toBe(true);
    state.commit('keyboard');
    expect(state.value).toBe(2);
    veto = true;
    expect(state.step(1)).toBe(false);
    expect(state.value).toBe(2);
    expect(state.text).toBe('2');
    state.update({ disabled: true });
    expect(state.value).toBe(2);
    state.update({ disabled: false });
    expect(state.value).toBe(2);
    state.update({ value: 10 });
    state.blur();
    expect(setup.commits).toEqual([{ value: 2, reason: 'keyboard' }]);
  });
  it('clears to null, resets to default and detaches its state controller on dispose', () => {
    const { state, host } = model({ defaultValue: 3, required: true });
    state.input('');
    expect(state.value).toBeNull();
    expect(state.validity.valueMissing).toBe(true);
    state.blur();
    state.reset();
    expect(state.value).toBe(3);
    expect(state.touched).toBe(false);
    expect(state.dirty).toBe(false);
    state.dispose();
    expect(host.controllers.size).toBe(0);
  });
  it('seeds an empty bounded field at zero clamped to its nearest bound, without an extra step', () => {
    const { state } = model({ minimum: 5, maximum: 10, step: 2, snapOnStep: true });
    state.step(1);
    expect(state.value).toBe(5);
    state.step(1);
    expect(state.value).toBe(7);
  });
  it('uses Alt small steps and Shift large steps with directional snapping and reachable fractional bounds', () => {
    const { state } = model({
      defaultValue: 1.3,
      minimum: 0,
      maximum: 3.6,
      step: 1,
      snapOnStep: true,
    });
    state.step(1);
    expect(state.value).toBe(2);
    state.step(-1, 'keyboard', { altKey: true } as KeyboardEvent);
    expect(state.value).toBe(1.9);
    state.step(1, 'keyboard', { shiftKey: true } as KeyboardEvent);
    expect(state.value).toBe(3.6);
  });
  it('validates any/required/range/step independently and never validates disabled/readonly fields', () => {
    expect(numberFieldValidity(0.3, { step: 0.1 })).toEqual({});
    expect(numberFieldValidity(0.35, { step: 0.1 })).toEqual({ stepMismatch: true });
    expect(numberFieldValidity(0.35, { step: 'any' })).toEqual({});
    expect(numberFieldValidity(null, { required: true, disabled: true })).toEqual({});
    expect(numberFieldValidity(-1, { minimum: 0, readOnly: true })).toEqual({});
  });
  it('preserves meaningful precision and rejects invalid configuration before replacing state', () => {
    const v = 9007199254740991;
    expect(roundNumberFieldValue(v)).toBe(v);
    expect(normalizeNumberFieldValue(1.234567890123456, {})).toBe(1.234567890123456);
    const { state } = model({ defaultValue: 2 });
    expect(() => state.update({ step: 0 })).toThrow();
    expect(state.options.step).toBeUndefined();
    expect(state.value).toBe(2);
  });
});
