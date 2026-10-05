import { describe, expect, it } from 'vitest';
import { carouselReleaseSnap, normalizeCarouselWheel } from './input.js';
import { resolveCarouselConfiguration } from './configuration.js';

describe('Carousel source input arithmetic', () => {
  it('normalizes release across either loop boundary and more than one cycle', () => {
    const interaction = resolveCarouselConfiguration().interaction;
    expect(carouselReleaseSnap([0, 100, 200], 240, 1, 100, interaction, 2, true, 300)).toBe(0);
    expect(carouselReleaseSnap([0, 100, 200], -40, -1, 100, interaction, 0, true, 300)).toBe(2);
    expect(carouselReleaseSnap([0, 100, 200], 940, 1, 100, interaction, 0, true, 300)).toBe(1);
  });
  it('normalizes legacy pixels, lines, pages and Shift in the source order', () => {
    expect(normalizeCarouselWheel({ wheelDelta: -120 })).toEqual({ x: 0, y: 10 });
    expect(normalizeCarouselWheel({ deltaY: 2, deltaMode: 1, shiftKey: true })).toEqual({
      x: 80,
      y: 0,
    });
    expect(normalizeCarouselWheel({ deltaX: 0.5, deltaY: 0, deltaMode: 2 })).toEqual({
      x: 400,
      y: 0,
    });
    expect(normalizeCarouselWheel({ deltaX: 3, deltaY: 9, shiftKey: true })).toEqual({
      x: 3,
      y: 9,
    });
  });
  it('preserves asymmetric long-release equality and short-release direction', () => {
    const interaction = resolveCarouselConfiguration().interaction;
    expect(carouselReleaseSnap([0, 100, 200], 50, 1, 301, interaction, 0)).toBe(1);
    expect(carouselReleaseSnap([0, 100, 200], 50, -1, 301, interaction, 1)).toBe(0);
    expect(carouselReleaseSnap([0, 100, 200], 1, 1, 300, interaction, 0)).toBe(1);
    expect(carouselReleaseSnap([0, 100, 200], 99, -1, 300, interaction, 1)).toBe(0);
  });
  it('restores accepted selection when the relevant release category is disabled', () => {
    const interaction = resolveCarouselConfiguration({
      interaction: { shortSwipes: false, longSwipes: false },
    }).interaction;
    expect(carouselReleaseSnap([0, 100, 200], 175, 1, 150, interaction, 0)).toBe(0);
    expect(carouselReleaseSnap([0, 100, 200], 175, 1, 500, interaction, 0)).toBe(0);
  });
});
