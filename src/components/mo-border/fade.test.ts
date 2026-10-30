import { describe, expect, it } from 'vitest';
import { cubicBezier } from '../../foundation/motion-easing.js';
import { Fade } from './fade.js';

const fade = (outDelay = 0) => {
  const value = new Fade();
  value.timing = { duration: 100, easing: (t) => t, outDelay };
  return value;
};

describe('Fade', () => {
  it('fades in at once over the duration', () => {
    const value = fade(50);
    value.set(true, 0);
    expect(value.step(50)).toBeCloseTo(0.5);
    expect(value.step(100)).toBe(1);
    expect(value.moving).toBe(false);
  });

  it('waits the out delay before fading out', () => {
    const value = fade(50);
    value.snap(true);
    value.set(false, 0);
    expect(value.step(40)).toBe(1);
    expect(value.moving).toBe(true);
    expect(value.step(100)).toBeCloseTo(0.5);
    expect(value.step(150)).toBe(0);
  });

  it('cancels a pending fade-out when turned on again, without dimming', () => {
    const value = fade(50);
    value.snap(true);
    value.set(false, 0);
    expect(value.step(30)).toBe(1);
    value.set(true, 30);
    expect(value.step(200)).toBe(1);
    expect(value.moving).toBe(false);
  });

  it('reverses from its current value at the same pace', () => {
    const value = fade();
    value.set(true, 0);
    expect(value.step(60)).toBeCloseTo(0.6);
    value.set(false, 60);
    expect(value.step(90)).toBeCloseTo(0.3);
    expect(value.step(120)).toBe(0);
  });

  it('applies the easing', () => {
    const value = fade();
    value.timing = { ...value.timing, easing: cubicBezier(0.4, 0, 1, 1) };
    value.set(true, 0);
    expect(value.step(50)).toBeLessThan(0.5);
  });

  it('is instant with no duration', () => {
    const value = new Fade();
    value.set(true, 0);
    expect(value.step(0)).toBe(1);
  });
});
