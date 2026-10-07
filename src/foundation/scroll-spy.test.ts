import { describe, expect, it } from 'vitest';
import { activeRegions, parseActivationOffset, readingLine, spyRegions } from './scroll-spy.js';
import { collectTargets } from './collect-targets.js';

describe('scroll spy geometry', () => {
  it('extends a heading-like target to the next start and the last to the content end', () => {
    const regions = spyRegions(
      [
        { start: 0, end: 20 },
        { start: 300, end: 320 },
        { start: 700, end: 720 },
      ],
      1000,
    );
    expect(regions.map(({ start, end }) => [start, end])).toEqual([
      [0, 300],
      [300, 700],
      [700, 1000],
    ]);
  });

  it('keeps a wrapping target active across the targets it contains', () => {
    // Guide [0, 600) contains Forms [50, 250) and Overlays [250, 550); Reference starts at 650.
    const regions = spyRegions(
      [
        { start: 0, end: 600 },
        { start: 50, end: 250 },
        { start: 250, end: 550 },
        { start: 650, end: 800 },
      ],
      800,
    );
    expect(activeRegions(regions, 300)).toEqual({ active: [0, 2], current: 2 });
    expect(activeRegions(regions, 20)).toEqual({ active: [0], current: 0 });
    // The gap after Overlays belongs to it and to Guide.
    expect(activeRegions(regions, 580)).toEqual({ active: [0, 2], current: 2 });
    expect(activeRegions(regions, 700)).toEqual({ active: [3], current: 3 });
  });

  it('orders by position, never by the supplied order', () => {
    const regions = spyRegions(
      [
        { start: 500, end: 520 },
        { start: 0, end: 20 },
      ],
      900,
    );
    expect(activeRegions(regions, 100)).toEqual({ active: [1], current: 1 });
    expect(activeRegions(regions, 600)).toEqual({ active: [0], current: 0 });
  });

  it('keeps the first target current before the first region, including overscroll', () => {
    const regions = spyRegions(
      [
        { start: 200, end: 220 },
        { start: 600, end: 620 },
      ],
      900,
    );
    expect(activeRegions(regions, 100)).toEqual({ active: [0], current: 0 });
    expect(activeRegions(regions, -40)).toEqual({ active: [0], current: 0 });
    expect(activeRegions([], 100)).toEqual({ active: [], current: null });
  });

  it('keeps the last target current at the end of the scroll range', () => {
    const boxes = [
      { start: 0, end: 20 },
      { start: 300, end: 320 },
      { start: 1150, end: 1170 },
    ];
    const clientSize = 400,
      scrollSize = 1200;
    for (const scrollTop of [800, 860]) {
      // 860 is rubber-band overscroll past the maximum of 800.
      const line = Math.min(
        scrollTop + readingLine({ scrollTop, clientSize, scrollSize, offset: 1 }),
        scrollSize - 0.5,
      );
      expect(activeRegions(spyRegions(boxes, scrollSize), line).current).toBe(2);
    }
  });

  it('holds the reading line at the offset until the final scroll distance', () => {
    const base = { clientSize: 500, scrollSize: 2000, offset: 101 };
    expect(readingLine({ ...base, scrollTop: 0 })).toBe(101);
    expect(readingLine({ ...base, scrollTop: 1000 })).toBe(101);
    // The final distance is min(max scroll 1500, end - offset ≈ 399).
    const end = 499.5;
    expect(readingLine({ ...base, scrollTop: 1500 })).toBeCloseTo(end);
    const midway = readingLine({ ...base, scrollTop: 1500 - (end - 101) / 2 });
    expect(midway).toBeCloseTo((101 + end) / 2);
  });

  it('puts the reading line at the end edge when the root cannot scroll', () => {
    expect(readingLine({ scrollTop: 0, clientSize: 500, scrollSize: 500, offset: 1 })).toBe(499.5);
  });

  it('makes short final sections current in order while reaching the end', () => {
    // Viewport 400, content 1200 (max scroll 800); final sections at 1000 and 1100 never reach
    // the offset line of 1.
    const boxes = [
      { start: 0, end: 20 },
      { start: 1000, end: 1020 },
      { start: 1100, end: 1120 },
    ];
    const currentAt = (scrollTop: number) => {
      const line = readingLine({ scrollTop, clientSize: 400, scrollSize: 1200, offset: 1 });
      const shifted = boxes.map((box) => ({
        start: box.start - scrollTop,
        end: box.end - scrollTop,
      }));
      return activeRegions(spyRegions(shifted, 1200 - scrollTop), line).current;
    };
    const seen = [0, 500, 650, 700, 750, 800].map(currentAt);
    expect(seen[0]).toBe(0);
    expect(seen.at(-1)).toBe(2);
    expect(seen).toContain(1);
    expect(seen.indexOf(1)).toBeLessThan(seen.indexOf(2));
  });

  it('parses activation offsets', () => {
    expect(parseActivationOffset(null, 400)).toBeNull();
    expect(parseActivationOffset('', 400)).toBeNull();
    expect(parseActivationOffset(64, 400)).toBe(64);
    expect(parseActivationOffset('64px', 400)).toBe(64);
    expect(parseActivationOffset('25%', 400)).toBe(100);
    expect(parseActivationOffset('auto', 400)).toBeNull();
  });
});

describe('collectTargets', () => {
  it('collects only what the caller selects, without ids or depth by default', () => {
    const elements = [
      { id: '', textContent: '  Release   notes ' },
      { id: 'steps', textContent: 'Upgrade steps' },
    ] as unknown as Element[];
    const root = { querySelectorAll: () => elements } as unknown as ParentNode;
    expect(collectTargets(root, '[data-toc]')).toEqual([
      { element: elements[0], id: null, label: 'Release notes' },
      { element: elements[1], id: 'steps', label: 'Upgrade steps' },
    ]);
    expect(collectTargets(root, '[data-toc]', { depth: () => 2 })[0]!.depth).toBe(2);
  });
});
