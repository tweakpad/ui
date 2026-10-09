import { describe, expect, it } from 'vitest';
import { arrowKeys, stepIndex } from './collection.js';

describe('index stepping', () => {
  it('wraps past either end when looping', () => {
    expect(stepIndex(2, 1, 3, true)).toBe(0);
    expect(stepIndex(0, -1, 3, true)).toBe(2);
    expect(stepIndex(1, 1, 3, true)).toBe(2);
    expect(stepIndex(0, -5, 3, true)).toBe(1);
  });

  it('holds at the ends otherwise', () => {
    expect(stepIndex(2, 1, 3, false)).toBe(2);
    expect(stepIndex(0, -1, 3, false)).toBe(0);
    expect(stepIndex(1, 1, 3, false)).toBe(2);
    expect(stepIndex(0, 7, 3, false)).toBe(2);
  });

  it('has no index in an empty list', () => {
    expect(stepIndex(0, 1, 0, true)).toBe(-1);
    expect(stepIndex(0, 1, 0, false)).toBe(-1);
  });
});

describe('arrow keys', () => {
  it('maps the inline axis by writing direction and the block axis to up and down', () => {
    expect(arrowKeys('horizontal', 'ltr')).toEqual({ previous: 'ArrowLeft', next: 'ArrowRight' });
    expect(arrowKeys('horizontal', 'rtl')).toEqual({ previous: 'ArrowRight', next: 'ArrowLeft' });
    expect(arrowKeys('vertical', 'ltr')).toEqual({ previous: 'ArrowUp', next: 'ArrowDown' });
    expect(arrowKeys('vertical', 'rtl')).toEqual({ previous: 'ArrowUp', next: 'ArrowDown' });
  });
});
