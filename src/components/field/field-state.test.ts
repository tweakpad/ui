import { describe, expect, it } from 'vitest';
import { errorMatches, fieldErrors, fieldValues, sameFieldValue } from './field-state.js';
describe('Field state policies', () => {
  it('deduplicates ordered records while omitting empty messages', () => {
    expect(
      fieldErrors([
        ' First ',
        { message: 'First' },
        undefined,
        { message: 'Second' },
        '',
        { message: '' },
      ]),
    ).toEqual(['First', 'Second']);
  });
  it('aggregates duplicate names without flattening list-valued Fields', () => {
    const values = fieldValues([
      { name: 'choice', value: ['a', 'b'] },
      { name: 'choice', value: ['c'] },
      { name: '', value: 42 },
      { name: '__proto__', value: 'safe' },
    ]);
    expect(values.choice).toEqual([['a', 'b'], ['c']]);
    expect(values.__proto__).toBe('safe');
    expect(Object.hasOwn(values, '')).toBe(false);
  });
  it('compares immutable value lanes by their ordered identity', () => {
    expect(sameFieldValue(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(sameFieldValue(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(sameFieldValue(null, '')).toBe(false);
  });
  it('keeps matching independent from aggregate invalidity', () => {
    expect(errorMatches(true, { valid: true })).toBe(true);
    expect(errorMatches(false, { valid: false })).toBe(false);
    expect(errorMatches('valueMissing', { valid: false, valueMissing: false })).toBe(false);
    expect(errorMatches('typeMismatch', { valid: false, typeMismatch: true })).toBe(true);
    expect(errorMatches(undefined, { valid: null })).toBe(false);
  });
});
