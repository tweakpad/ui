import { describe, expect, it } from 'vitest';
import {
  clampParallaxDepth,
  parallaxGeometry,
  parallaxDriver,
  supportsViewTimeline,
  timelineScrollContainer,
} from './parallax.js';
import { scrollAxis, smoothProgress } from './scroll-progress.js';

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

describe('parallax smoothing', () => {
  it('snaps to the target without smoothing', () => {
    expect(smoothProgress(-1, 1, 0, 16)).toBe(1);
  });

  it('leaves the smoothing share of the distance after one 60 Hz frame', () => {
    expect(smoothProgress(0, 1, 0.5, 1000 / 60)).toBeCloseTo(0.5);
    expect(smoothProgress(0, 1, 0.9, 1000 / 60)).toBeCloseTo(0.1);
  });

  it('does not depend on the frame rate', () => {
    const once = smoothProgress(0, 1, 0.8, 2000 / 60);
    const twice = smoothProgress(smoothProgress(0, 1, 0.8, 1000 / 60), 1, 0.8, 1000 / 60);
    expect(once).toBeCloseTo(twice);
  });

  it('converges and clamps the factor so motion never freezes', () => {
    let current = -1;
    for (let frame = 0; frame < 600; frame++) current = smoothProgress(current, 1, 1, 1000 / 60);
    expect(current).toBeCloseTo(1, 3);
    expect(smoothProgress(0, 1, 0.5, 0)).toBe(0);
  });

  it('drives smoothed parallax from scroll observation', () => {
    const { body, node } = layout();
    const image = node(body);
    expect(parallaxDriver(image)).toBe('timeline');
    expect(parallaxDriver(image, { smoothing: 0.5 })).toBe('script');
  });
});
