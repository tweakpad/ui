import { describe, expect, it } from 'vitest';
import { normalizeToggleValues, toggleSelection } from './selection.js';
describe('Toggle Group policy', () => {
  it('preserves identifiers containing spaces and removes duplicates without mutating input', () => {
    const input = Object.freeze(['left right', 'left right', '']);
    expect(normalizeToggleValues(input)).toEqual(['left right']);
    expect(normalizeToggleValues('left right')).toEqual(['left right']);
    expect(normalizeToggleValues('["a","b"]')).toEqual(['a', 'b']);
  });
  it('single selection can clear and multiple selection follows registration while retaining absent values', () => {
    expect(toggleSelection(['a'], 'a', false, ['a', 'b'])).toEqual([]);
    expect(toggleSelection(['b'], 'a', false, ['a', 'b'])).toEqual(['a']);
    expect(toggleSelection(['unmounted', 'b'], 'a', true, ['a', 'b'])).toEqual([
      'unmounted',
      'a',
      'b',
    ]);
  });
});
