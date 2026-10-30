import { describe, expect, it } from 'vitest';
import { splitCssList } from './css-list.js';

describe('splitCssList', () => {
  it('splits at top-level commas only', () => {
    expect(splitCssList('rgb(1, 2, 3), oklch(0.7 0.1 200 / 50%),#fff')).toEqual([
      'rgb(1, 2, 3)',
      'oklch(0.7 0.1 200 / 50%)',
      '#fff',
    ]);
    expect(splitCssList('cubic-bezier(0.2, 0, 0, 1), linear')).toEqual([
      'cubic-bezier(0.2, 0, 0, 1)',
      'linear',
    ]);
    expect(splitCssList('  ')).toEqual([]);
  });
});
