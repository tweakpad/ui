import { describe, expect, it } from 'vitest';
import { emptyField, screen, smooth, wrap } from './light-field.js';

describe('light field', () => {
  it('starts dark and at rest width', () => {
    const field = emptyField(3);
    expect([...field.intensity]).toEqual([0, 0, 0]);
    expect([...field.core]).toEqual([0, 0, 0]);
    expect([...field.swell]).toEqual([1, 1, 1]);
  });

  it('adds light like a screen, wraps positions and eases', () => {
    expect(screen(0.5, 0.5)).toBeCloseTo(0.75);
    expect(screen(1, 0.3)).toBe(1);
    expect(wrap(1.25)).toBeCloseTo(0.25);
    expect(wrap(-0.1)).toBeCloseTo(0.9);
    expect(smooth(0.5)).toBeCloseTo(0.5);
    expect(smooth(0)).toBe(0);
    expect(smooth(1)).toBe(1);
  });
});
