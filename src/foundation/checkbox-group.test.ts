import { describe, expect, it } from 'vitest';
import { checkboxParentSelection } from './checkbox-group.js';
describe('Checkbox logical parent membership', () => {
  it('selects enabled logical children, preserves disabled checked and unmatched state', () => {
    expect(
      checkboxParentSelection(
        ['held', 'unmounted'],
        ['held', 'blocked', 'a', 'b'],
        new Set(['held', 'blocked']),
        true,
      ),
    ).toEqual(['held', 'unmounted', 'a', 'b']);
  });
  it('clears only eligible logical children without mutating source', () => {
    const current = Object.freeze(['a', 'held', 'unmounted']);
    expect(checkboxParentSelection(current, ['a', 'held'], new Set(['held']), false)).toEqual([
      'held',
      'unmounted',
    ]);
    expect(current).toEqual(['a', 'held', 'unmounted']);
  });
  it('treats whitespace and prototype names as ordinary values', () => {
    expect(checkboxParentSelection([], ['constructor', 'a b'], new Set(), true)).toEqual([
      'constructor',
      'a b',
    ]);
  });
});
