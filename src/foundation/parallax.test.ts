import { describe, expect, it } from 'vitest';
import {
  clampParallaxDepth,
  parallaxGeometry,
  parallaxDriver,
  parallaxProgress,
  scrollAxis,
  supportsViewTimeline,
  timelineScrollContainer,
} from './parallax.js';

describe('parallax geometry', () => {
  it('enlarges by the depth and travels half of it to either side', () => {
    expect(parallaxGeometry(0.3)).toEqual({ scale: 1.3, travel: 0.15 });
    expect(parallaxGeometry(0)).toEqual({ scale: 1, travel: 0 });
    expect(parallaxGeometry(-2)).toEqual({ scale: 1, travel: 0 });
    expect(parallaxGeometry(Number.NaN)).toEqual({ scale: 1, travel: 0 });
  });

  it('clamps Image depth to 0 through 1', () => {
    expect(clampParallaxDepth(2)).toBe(1);
    expect(clampParallaxDepth(-1)).toBe(0);
    expect(clampParallaxDepth(0.4)).toBe(0.4);
    expect(clampParallaxDepth(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('parallax progress', () => {
  // A 100px box in an 800px viewport.
  it('runs from -1 entering at the end to 1 leaving at the start', () => {
    expect(parallaxProgress(800, 100, 0, 800)).toBe(-1);
    expect(parallaxProgress(-100, 100, 0, 800)).toBe(1);
    expect(parallaxProgress(350, 100, 0, 800)).toBeCloseTo(0);
  });

  it('clamps outside the visible extent and measures nested extents', () => {
    expect(parallaxProgress(2000, 100, 0, 800)).toBe(-1);
    expect(parallaxProgress(-900, 100, 0, 800)).toBe(1);
    expect(parallaxProgress(250, 100, 200, 400)).toBeCloseTo(0);
  });

  it('reports rest for an empty extent', () => {
    expect(parallaxProgress(0, 0, 0, 0)).toBe(0);
  });
});

describe('view timeline support', () => {
  it('asks the host', () => {
    const view = (supported: boolean) =>
      ({ CSS: { supports: () => supported } }) as unknown as Window;
    expect(supportsViewTimeline(view(true))).toBe(true);
    expect(supportsViewTimeline(view(false))).toBe(false);
    expect(supportsViewTimeline(null)).toBe(false);
  });
});

/** A minimal document: each node has an overflow and optional scroll extent. */
function layout(supports = true) {
  const styles = new Map<object, { overflowX: string; overflowY: string; display: string }>();
  const view = {
    CSS: { supports: () => supports },
    getComputedStyle: (element: object) =>
      styles.get(element) ?? { overflowX: 'visible', overflowY: 'visible', display: 'block' },
    frameElement: null,
  };
  const document = { defaultView: view } as Record<string, unknown>;
  const node = (parent: object | null, overflow = 'visible', overflows = false) => {
    const element = {
      nodeType: 1,
      parentNode: parent,
      assignedSlot: null,
      ownerDocument: document,
      scrollHeight: overflows ? 900 : 300,
      clientHeight: 300,
      scrollWidth: 300,
      clientWidth: 300,
    };
    styles.set(element, { overflowX: overflow, overflowY: overflow, display: 'block' });
    return element as unknown as Element;
  };
  const root = node(null);
  const body = node(root);
  Object.assign(document, { documentElement: root, body, scrollingElement: root });
  return { root, body, node };
}

describe('parallax driver', () => {
  it('keeps the view timeline when no clipping ancestor sits between image and scroller', () => {
    const { root, body, node } = layout();
    const image = node(node(body));
    expect(timelineScrollContainer(image)).toBe(root);
    expect(parallaxDriver(image)).toBe('timeline');
  });

  it('falls back to scroll observation under a clipping ancestor that cannot scroll', () => {
    const { body, node } = layout();
    const card = node(body, 'hidden');
    const image = node(node(card, 'auto'));
    expect(timelineScrollContainer(image)).not.toBe(card); // nearest: the auto wrapper
    expect(parallaxDriver(image)).toBe('script');
  });

  it('keeps the view timeline inside a container that actually scrolls', () => {
    const { body, node } = layout();
    const scroller = node(body, 'auto', true);
    const image = node(scroller);
    expect(timelineScrollContainer(image)).toBe(scroller);
    expect(parallaxDriver(image)).toBe('timeline');
  });

  it('uses scroll observation where view timelines are unsupported', () => {
    const { body, node } = layout(false);
    expect(parallaxDriver(node(body))).toBe('script');
  });
});

describe('scroll axis', () => {
  const box = (scrollWidth: number, scrollHeight: number) =>
    ({ scrollWidth, clientWidth: 300, scrollHeight, clientHeight: 300 }) as unknown as Element;
  it('measures sideways strips along the inline axis and everything else along the block axis', () => {
    expect(scrollAxis(box(1200, 300))).toBe('inline');
    expect(scrollAxis(box(300, 1200))).toBe('block');
    expect(scrollAxis(box(1200, 1200))).toBe('block');
    expect(scrollAxis(box(300, 300))).toBe('block');
  });
});
