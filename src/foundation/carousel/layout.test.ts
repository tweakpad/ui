import { describe, expect, it } from 'vitest';
import { carouselLayout, closestCarouselSnap, carouselVisible } from './layout.js';
import { resolveCarouselConfiguration } from './configuration.js';

describe('Carousel source-derived layout', () => {
  const items = (count: number) =>
    Array.from({ length: count }, (_, index) => ({ index, size: 100 }));
  it('keeps a zero-size mount unmeasured without NaN or invented snaps', () => {
    expect(carouselLayout(items(3), 0, resolveCarouselConfiguration()).snaps).toEqual([]);
  });
  it('preserves fractional sizing and terminal tolerance', () => {
    const result = carouselLayout(
      items(5),
      320.5,
      resolveCarouselConfiguration({ layout: { itemsPerView: 2.5, gap: 7.5 } }),
    );
    expect(result.sizes[0]).toBeCloseTo(123.7);
    expect(result.snaps.at(-1)?.position).toBeCloseTo(result.extent - 320.5);
    expect(result.snaps.every((snap) => Number.isFinite(snap.position))).toBe(true);
    expect(new Set(result.snaps.map((snap) => snap.index)).size).toBe(result.snaps.length);
  });
  it('maps skipped groups and hidden source positions without renumbering', () => {
    const result = carouselLayout(
      [
        { index: 0, size: 100 },
        { index: 2, size: 100 },
        { index: 3, size: 100 },
        { index: 5, size: 100 },
      ],
      100,
      resolveCarouselConfiguration({ layout: { groupSkip: 1 } }, { itemsPerMovement: 2 }),
    );
    expect(result.snaps.map((snap) => snap.index)).toEqual([0, 2, 5]);
  });
  it('deduplicates centered bounded snaps while retaining group membership', () => {
    const result = carouselLayout(
      items(4),
      300,
      resolveCarouselConfiguration({
        layout: { itemsPerView: 'auto', centered: true, centeredBounds: true },
        indicators: false,
      }),
    );
    expect(result.snaps.map((snap) => snap.position)).toEqual([0, 100]);
    expect(result.snaps.flatMap((snap) => snap.members)).toEqual([0, 1, 2, 3]);
  });
  it('fits auto edge snaps backwards and uses real group membership', () => {
    const result = carouselLayout(
      [
        { index: 0, size: 100 },
        { index: 1, size: 130 },
        { index: 2, size: 80 },
        { index: 3, size: 90 },
      ],
      200,
      resolveCarouselConfiguration({ layout: { itemsPerView: 'auto', snapToItemEdge: true } }),
    );
    expect(result.snaps.map((snap) => snap.index)).toEqual([0, 1, 2]);
    expect(result.snaps.at(-1)?.position).toBe(230);
  });
  it('reports partial visibility and nearest snapping without mutating selection', () => {
    const result = carouselLayout(items(4), 100, resolveCarouselConfiguration());
    expect(carouselVisible(result, 50, 100)).toEqual([0, 1]);
    expect(closestCarouselSnap(result, 51)).toBe(1);
  });
});
