import { describe, expect, it } from 'vitest';
import { carouselItems } from './model.js';
import { carouselVirtualRange, CarouselVirtualCache, carouselModulo } from './virtual.js';
import { carouselLoopPlan, carouselLoopPermutation } from './loop.js';
import { carouselLayout } from './layout.js';
import { resolveCarouselConfiguration } from './configuration.js';

describe('Carousel logical membership and projection', () => {
  it('keeps typed IDs, falsy payloads and source positions while excluding duplicates', () => {
    const records = carouselItems([0, '', 1, '1', 1, { id: 'object', label: '', value: false }]);
    expect(records.map((item) => item.id)).toEqual([0, '', 1, '1', 'object']);
    expect(records.at(-1)?.index).toBe(5);
    expect(records.at(-1)?.label).toBe('');
  });
  it('retains an empty initial virtual range, then includes zero and fractional views', () => {
    const config = resolveCarouselConfiguration({ virtual: {}, layout: { itemsPerView: 2.5 } });
    const items = carouselItems([0, 1, 2, 3, 4, 5]);
    const layout = carouselLayout(
      items.map((item) => ({ index: item.index, size: 100 })),
      250,
      config,
    );
    expect(carouselVirtualRange([], 0, 250, layout, config, false).to).toBe(-1);
    const range = carouselVirtualRange(items, 0, 250, layout, config, false);
    expect(range.mountedIds).toEqual([0, 1, 2, 3]);
    expect(carouselModulo(-19, 6)).toBe(5);
    expect(
      new Set(carouselVirtualRange(items, -19, 250, layout, config, true).mountedIds).size,
    ).toBeGreaterThan(0);
  });
  it('updates offset without a range change and pins focused content once', () => {
    const config = resolveCarouselConfiguration({ virtual: {}, layout: { itemsPerView: 1 } });
    const items = carouselItems([0, 1, 2, 3, 4, 5]);
    const make = (width: number) =>
      carouselLayout(
        items.map((item) => ({ index: item.index, size: 100 })),
        width,
        config,
      );
    const first = carouselVirtualRange(items, 3, 100, make(100), config, false, [3], 0);
    const resized = carouselVirtualRange(items, 3, 200, make(200), config, false, [3], 0);
    expect(first.from).toBe(resized.from);
    expect(first.offset).not.toBe(resized.offset);
    expect(first.pinnedId).toBe(0);
    expect(first.mountedIds.filter((id) => id === 0)).toHaveLength(1);
  });
  it('invalidates cached renderer generations and distinguishes typed keys', () => {
    const cache = new CarouselVirtualCache<unknown>();
    cache.reset(1);
    expect(cache.render(1, false, () => 0, true)).toBe(0);
    expect(cache.render(1, false, () => 99, true)).toBe(0);
    expect(cache.render('1', false, () => '', true)).toBe('');
    cache.reset(2);
    expect(cache.render(1, false, () => 99, true)).toBe(99);
  });
  it('keeps all-fit loops finite and chooses safe rewind on a genuine shortage', () => {
    const config = resolveCarouselConfiguration({ layout: { itemsPerView: 3 } }, { loop: true });
    const make = (count: number) =>
      carouselLayout(
        Array.from({ length: count }, (_, index) => ({ index, size: 100 })),
        300,
        config,
      );
    expect(carouselLoopPlan(make(3), config, 300)).toMatchObject({ mode: 'finite', reason: null });
    expect(
      carouselLoopPlan(
        make(4),
        resolveCarouselConfiguration(
          { layout: { itemsPerView: 3 }, loopOptions: { additionalItems: 1 } },
          { loop: true },
        ),
        300,
      ).mode,
    ).toBe('rewind');
    const plan = carouselLoopPlan(make(8), config, 300);
    const order = [0, 1, 2, 3, 4, 5, 6, 7];
    expect(carouselLoopPermutation(order, 0, plan, 'previous', false)).toEqual([
      7, 0, 1, 2, 3, 4, 5, 6,
    ]);
    expect(order[0]).toBe(0);
  });
  it('uses the movement group for append rotation and retains after-only offset directionality', () => {
    const config = resolveCarouselConfiguration(
      { layout: { itemsPerView: 3, offsetAfter: 100 }, loopOptions: { additionalItems: 1 } },
      { loop: true },
    );
    const order = Array.from({ length: 10 }, (_, index) => index);
    const layout = carouselLayout(
      order.map((index) => ({ index, size: 100 })),
      300,
      config,
    );
    const plan = carouselLoopPlan(layout, config, 300);
    expect(plan).toMatchObject({ mode: 'continuous', buffer: 3, group: 1, bothDirections: true });
    expect(carouselLoopPermutation(order, 5, plan, 'next', false)[0]).toBe(1);
  });
});
