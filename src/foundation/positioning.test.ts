import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeIntersectionObserver } from './fakes.test.js';
import {
  computeSurfacePosition,
  detectOverflow,
  geometryOffsets,
  positionSurface,
  rect,
  type PositioningOffsetContext,
} from './positioning.js';

describe('positioning', () => {
  const clipping = rect(0, 0, 500, 500);

  it('places and offsets an aligned surface', () => {
    const result = computeSurfacePosition(rect(100, 100, 80, 40), rect(0, 0, 120, 60), clipping, {
      placement: 'bottom-start',
      offset: 8,
    });
    expect(result).toMatchObject({ x: 100, y: 148, placement: 'bottom-start' });
    expect(result?.stageData.offset).toEqual({ x: 0, y: 8, placement: 'bottom-start' });
  });

  it('flips to the first fitting opposite placement', () => {
    const result = computeSurfacePosition(rect(100, 450, 80, 30), rect(0, 0, 120, 80), clipping, {
      placement: 'bottom-start',
      offset: 8,
    });
    expect(result?.placement).toBe('top-start');
    expect(result?.y).toBe(362);
    expect(result?.stageData.flip?.candidates.map((candidate) => candidate.placement)).toEqual([
      'bottom-start',
      'bottom-end',
      'top-start',
      'top-end',
    ]);
  });

  it('resolves horizontal alignment from writing direction', () => {
    const result = computeSurfacePosition(
      rect(100, 100, 80, 40),
      rect(0, 0, 120, 60),
      clipping,
      { placement: 'bottom-start', offset: 0 },
      'rtl',
    );
    expect(result?.x).toBe(60);
  });

  it('reports signed overflow and rejects non-finite geometry', () => {
    expect(detectOverflow(rect(-10, 20, 40, 30), clipping)).toEqual({
      top: -20,
      right: -470,
      bottom: -450,
      left: 10,
    });
    expect(
      computeSurfacePosition(rect(Number.NaN, 0, 10, 10), rect(0, 0, 10, 10), clipping),
    ).toBeNull();
  });
});

const viewport = rect(0, 0, 320, 240);
const surface = rect(0, 0, 100, 40);
describe('anchored collision policy', () => {
  it.each([
    ['top', rect(2, 2, 20, 20), 'bottom'],
    ['right', rect(300, 80, 20, 20), 'left'],
    ['bottom', rect(100, 220, 20, 20), 'top'],
    ['left', rect(2, 80, 20, 20), 'right'],
  ] as const)('flips %s and shifts the alignment into the viewport', (side, anchor, resolved) => {
    const result = computeSurfacePosition(anchor, surface, viewport, {
      placement: side,
      padding: 5,
      collision: { side: 'flip', align: 'shift' },
    })!;
    expect(result.placement).toBe(resolved);
    expect(result.x).toBeGreaterThanOrEqual(5);
    expect(result.y).toBeGreaterThanOrEqual(5);
    expect(result.x + surface.width).toBeLessThanOrEqual(315);
    expect(result.y + surface.height).toBeLessThanOrEqual(235);
  });
  it('honors collision none even when both axes overflow', () => {
    const result = computeSurfacePosition(rect(0, 0, 10, 10), surface, viewport, {
      placement: 'top',
      offset: 6,
      collision: { side: 'none', align: 'none' },
    })!;
    expect(result).toMatchObject({ x: -45, y: -46, placement: 'top' });
    expect(result.stageData.shift).toMatchObject({ x: 0, y: 0 });
  });
  it('subtracts spacing from the available extent on the resolved side', () => {
    const result = computeSurfacePosition(rect(100, 80, 20, 20), surface, viewport, {
      placement: 'right',
      offset: 6,
      padding: 5,
    })!;
    expect(result.availableWidth).toBe(189);
    expect(result.availableHeight).toBe(230);
  });
  it('measures untransformed arrows and reports clamp displacement', () => {
    const arrow = {
      dataset: {},
      offsetWidth: 10,
      offsetHeight: 10,
      getBoundingClientRect: () => rect(0, 0, 2, 2),
    } as HTMLElement;
    const result = computeSurfacePosition(rect(0, 80, 4, 20), surface, viewport, {
      placement: 'bottom',
      padding: 5,
      arrow,
      arrowPadding: 8,
      collision: { side: 'flip', align: 'shift' },
    })!;
    expect(result.stageData.arrow).toMatchObject({ x: 8, centerOffset: -16 });
  });
  it('sticky permits side shifting but does not override collision none', () => {
    const anchor = rect(100, 220, 20, 20);
    const sticky = computeSurfacePosition(anchor, surface, viewport, {
      placement: 'bottom',
      padding: 5,
      sticky: true,
      collision: { side: 'none', align: 'shift' },
    })!;
    expect(sticky.y).toBe(195);
    const fixed = computeSurfacePosition(anchor, surface, viewport, {
      placement: 'bottom',
      padding: 5,
      sticky: true,
      collision: { side: 'none', align: 'none' },
    })!;
    expect(fixed.y).toBe(248);
  });
  it('rejects invalid virtual geometry', () => {
    expect(computeSurfacePosition(rect(NaN, 0, 1, 1), surface, viewport)).toBeNull();
  });
});

describe('shared geometry offset stage', () => {
  it('evaluates dimensions and alignment on each collision candidate', () => {
    const contexts: PositioningOffsetContext[] = [];
    const result = computeSurfacePosition(
      rect(50, 5, 30, 10),
      rect(0, 0, 40, 20),
      rect(0, 0, 200, 200),
      {
        placement: 'top-start',
        padding: 0,
        offset: geometryOffsets(
          (context) => {
            contexts.push(context);
            return context.anchor.height;
          },
          (context) => context.positioner.width / 10,
        ),
      },
    );
    expect(result?.placement).toBe('bottom-start');
    expect(result?.x).toBe(54);
    expect(result?.y).toBe(25);
    expect(contexts).toContainEqual({
      side: 'top',
      align: 'start',
      anchor: { width: 30, height: 10 },
      positioner: { width: 40, height: 20 },
    });
    expect(contexts).toContainEqual({
      side: 'bottom',
      align: 'start',
      anchor: { width: 30, height: 10 },
      positioner: { width: 40, height: 20 },
    });
  });
  it('keeps numeric callers equivalent and reverses end alignment in RTL', () => {
    const args = [rect(70, 60, 30, 10), rect(0, 0, 40, 20), rect(0, 0, 200, 200)] as const;
    const old = computeSurfacePosition(
      ...args,
      { placement: 'bottom-end', offset: { mainAxis: 7, crossAxis: 3, alignmentAxis: 3 } },
      'rtl',
    );
    const current = computeSurfacePosition(
      ...args,
      { placement: 'bottom-end', offset: geometryOffsets(7, 3) },
      'rtl',
    );
    expect(current).toEqual(old);
    expect(current?.stageData.offset).toMatchObject({ x: 3, y: 7 });
  });
  it('reads new geometry on subsequent passes and rejects a non-finite result', () => {
    const offset = geometryOffsets((context) => context.anchor.width / 2, 0);
    const surface = rect(0, 0, 10, 10),
      boundary = rect(0, 0, 200, 200);
    expect(computeSurfacePosition(rect(20, 20, 20, 10), surface, boundary, { offset })?.y).toBe(40);
    expect(computeSurfacePosition(rect(20, 20, 40, 10), surface, boundary, { offset })?.y).toBe(50);
    expect(
      computeSurfacePosition(rect(20, 20, 20, 10), surface, boundary, {
        offset: geometryOffsets(() => NaN, 0),
      }),
    ).toBeNull();
  });
});

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly observed = new Set<object>();
  constructor(readonly callback: () => void) {
    FakeResizeObserver.instances.push(this);
  }
  observe(target: object) {
    this.observed.add(target);
  }
  unobserve(target: object) {
    this.observed.delete(target);
  }
  disconnect() {
    this.observed.clear();
  }
}

/** An inline style whose `removeProperty` also clears the camel-cased member. */
function fakeStyle(): Record<string, string | undefined> {
  const style: Record<string, unknown> = {
    setProperty(name: string, value: string) {
      style[name] = value;
    },
    removeProperty(name: string) {
      delete style[name];
      delete style[name.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase())];
    },
    getPropertyValue(name: string) {
      return (style[name] as string | undefined) ?? '';
    },
  };
  return style as Record<string, string | undefined>;
}

afterEach(() => vi.unstubAllGlobals());

/** A window, document, anchor and surface for `positionSurface`, with manual animation frames. */
function surfaceFixture() {
  // The offset-parent check reads the global `HTMLElement`, which node does not define.
  vi.stubGlobal('HTMLElement', class {});
  FakeIntersectionObserver.instances = [];
  FakeResizeObserver.instances = [];
  const frames = new Map<number, FrameRequestCallback>();
  let next = 0;
  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    frames.set(++next, callback);
    return next;
  });
  const cancelAnimationFrame = vi.fn((handle: number) => {
    frames.delete(handle);
  });
  const view = {
    innerWidth: 800,
    innerHeight: 600,
    devicePixelRatio: 1,
    scrollX: 0,
    scrollY: 0,
    requestAnimationFrame,
    cancelAnimationFrame,
    getComputedStyle: () => ({
      direction: 'ltr',
      writingMode: 'horizontal-tb',
      display: 'block',
      overflow: 'visible',
      overflowX: 'visible',
      overflowY: 'visible',
    }),
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    IntersectionObserver: FakeIntersectionObserver,
    ResizeObserver: FakeResizeObserver,
    addEventListener() {},
    removeEventListener() {},
  };
  const document = Object.assign(new EventTarget(), { nodeType: 9, defaultView: view, body: null });
  const node = (extra: object) =>
    Object.assign(new EventTarget(), {
      nodeType: 1,
      isConnected: true,
      parentNode: null,
      assignedSlot: null,
      ownerDocument: document,
      ...extra,
    });
  Object.assign(document, { documentElement: node({ clientWidth: 800, clientHeight: 600 }) });
  let anchorBox = rect(100, 100, 80, 40);
  const anchor = node({ getBoundingClientRect: () => anchorBox }) as unknown as HTMLElement;
  const style = fakeStyle();
  const surface = node({
    offsetWidth: 120,
    offsetHeight: 60,
    offsetParent: null,
    style,
    dataset: {},
    matches: () => false,
    removeAttribute() {},
    toggleAttribute() {},
  }) as unknown as HTMLElement;
  const frame = () => {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(0);
  };
  return {
    requestAnimationFrame,
    cancelAnimationFrame,
    anchor,
    surface,
    style,
    frame,
    moveAnchor: (box: ReturnType<typeof rect>) => {
      anchorBox = box;
    },
  };
}

describe('anchor tracking', () => {
  it('follows the anchor through observers by default, without an animation-frame loop', () => {
    const { requestAnimationFrame, anchor, surface, style } = surfaceFixture();
    const handle = positionSurface(anchor, surface);
    expect(style.translate).toBe('80px 148px');
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    const [observer] = FakeIntersectionObserver.instances;
    expect(FakeIntersectionObserver.instances).toHaveLength(1);
    expect(observer!.targets.has(anchor)).toBe(true);
    // The root margin fits the anchor's box exactly, so any movement changes the ratio.
    expect(observer!.options).toMatchObject({ rootMargin: '-100px -620px -460px -100px' });
    expect(FakeResizeObserver.instances[0]!.observed).toEqual(new Set([anchor, surface]));
    handle.destroy();
    expect(observer!.disconnected).toBe(true);
    expect(FakeResizeObserver.instances[0]!.observed.size).toBe(0);
  });

  it('repositions after a layout shift moves the anchor and fits the observer again', () => {
    const { requestAnimationFrame, anchor, surface, style, frame, moveAnchor } = surfaceFixture();
    const onPosition = vi.fn();
    positionSurface(anchor, surface, { onPosition });
    expect(onPosition).toHaveBeenCalledTimes(1);
    moveAnchor(rect(100, 300, 80, 40));
    FakeIntersectionObserver.instances[0]!.report(anchor, true, 0.4);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(FakeIntersectionObserver.instances[0]!.disconnected).toBe(true);
    expect(FakeIntersectionObserver.instances[1]!.options).toMatchObject({
      rootMargin: '-300px -620px -260px -100px',
    });
    frame();
    expect(style.translate).toBe('80px 348px');
    expect(onPosition).toHaveBeenCalledTimes(2);
  });

  it('samples the anchor every frame only when polling or frame synchronization is requested', () => {
    const polled = surfaceFixture();
    const poll = positionSurface(polled.anchor, polled.surface, {
      tracking: { anchorLayoutShift: 'poll' },
    });
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
    expect(polled.requestAnimationFrame).toHaveBeenCalledTimes(1);
    poll.destroy();
    expect(polled.cancelAnimationFrame).toHaveBeenCalled();

    const synchronized = surfaceFixture();
    positionSurface(synchronized.anchor, synchronized.surface, {
      tracking: { frameSynchronized: true },
    });
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
    expect(synchronized.requestAnimationFrame).toHaveBeenCalledTimes(1);

    const still = surfaceFixture();
    positionSurface(still.anchor, still.surface, { tracking: { anchorLayoutShift: false } });
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
    expect(still.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('removes the positioning strategy it set when the surface is released', () => {
    const { anchor, surface, style } = surfaceFixture();
    const handle = positionSurface(anchor, surface, { strategy: 'fixed' });
    expect([style.position, style.left, style.translate]).toEqual(['fixed', '0px', '80px 148px']);
    handle.destroy();
    expect([style.position, style.left, style.top, style.translate]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    expect(handle.current).toBeNull();
  });
});
