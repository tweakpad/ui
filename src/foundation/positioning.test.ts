import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeIntersectionObserver } from './fakes.test.js';
import {
  computeSurfacePosition,
  detectOverflow,
  geometryOffsets,
  inlineFragmentRect,
  positionSurface,
  rect,
  themeSpacing,
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

describe('inline-fragment stage', () => {
  // Two lines of a selection: the first from x 200 to 400, the second from x 20 to 120.
  const lines = [rect(200, 100, 200, 20), rect(20, 120, 100, 20)];
  const viewport = rect(0, 0, 800, 600);
  const surface = rect(0, 0, 100, 30);

  it('leaves a single rectangle unchanged', () => {
    expect(inlineFragmentRect([rect(10, 10, 50, 20)], 'top')).toBeNull();
    const single = computeSurfacePosition(rect(10, 100, 50, 20), surface, viewport, {
      placement: 'top-start',
      offset: 0,
    });
    const listed = computeSurfacePosition(
      rect(10, 100, 50, 20),
      surface,
      viewport,
      { placement: 'top-start', offset: 0 },
      'ltr',
      [rect(10, 100, 50, 20)],
    );
    expect(listed).toEqual(single);
  });

  it('takes the first line for top and the last line for bottom over the full block span', () => {
    expect(inlineFragmentRect(lines, 'top')).toEqual(rect(200, 100, 200, 40));
    expect(inlineFragmentRect(lines, 'bottom')).toEqual(rect(20, 100, 100, 40));
  });

  it('joins rectangles of one line and skips empty ones', () => {
    const split = [rect(200, 100, 50, 20), rect(250, 101, 150, 19), rect(400, 100, 0, 20)];
    expect(inlineFragmentRect([...split, ...lines.slice(1)], 'top')).toEqual(
      rect(200, 100, 200, 40),
    );
  });

  it('takes the lines nearest a side for side placements', () => {
    expect(inlineFragmentRect(lines, 'left')).toEqual(rect(20, 120, 100, 20));
    expect(inlineFragmentRect(lines, 'right')).toEqual(rect(200, 100, 200, 20));
  });

  it('selects the line that holds a point, within the padding, else the nearest one', () => {
    expect(inlineFragmentRect(lines, 'top', { x: 50, y: 130 })).toEqual(lines[1]);
    expect(inlineFragmentRect(lines, 'top', { x: 401, y: 99 })).toEqual(lines[0]);
    expect(inlineFragmentRect(lines, 'top', { x: 405, y: 99, padding: 0 })).toEqual(lines[0]);
    expect(inlineFragmentRect(lines, 'bottom', { x: 10, y: 300 })).toEqual(lines[1]);
  });

  it('places a top surface at the first line and a bottom surface at the last line', () => {
    const top = computeSurfacePosition(
      rect(20, 100, 380, 40),
      surface,
      viewport,
      { placement: 'top-start', offset: 0 },
      'ltr',
      lines,
    )!;
    expect([top.x, top.y, top.anchorWidth]).toEqual([200, 70, 200]);
    const bottom = computeSurfacePosition(
      rect(20, 100, 380, 40),
      surface,
      viewport,
      { placement: 'bottom-start', offset: 0 },
      'ltr',
      lines,
    )!;
    expect([bottom.x, bottom.y, bottom.anchorWidth]).toEqual([20, 140, 100]);
  });

  it('resets to the flipped side’s reference rectangle once', () => {
    // No room above: the surface flips below and aligns with the last line.
    const near = [rect(200, 10, 200, 20), rect(20, 30, 100, 20)];
    const result = computeSurfacePosition(
      rect(20, 10, 380, 40),
      surface,
      viewport,
      { placement: 'top-start', offset: 0 },
      'ltr',
      near,
    )!;
    expect(result.placement).toBe('bottom-start');
    expect([result.x, result.y]).toEqual([20, 50]);
    expect(result.stageData.flip?.index).toBeGreaterThan(0);
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

describe('anchor clipping', () => {
  it('shows a surface whose anchor lies in a top-layer element that a clipping ancestor of that element leaves out', () => {
    const { anchor, surface } = surfaceFixture();
    // Every fake node is an EventTarget, so it passes the element check.
    vi.stubGlobal('Element', EventTarget);
    const view = (anchor as unknown as { ownerDocument: { defaultView: Record<string, unknown> } })
      .ownerDocument.defaultView;
    const base = (view['getComputedStyle'] as () => Record<string, string>)();
    const box = (left: number, top: number, width: number, height: number) => ({
      nodeType: 1,
      assignedSlot: null,
      getBoundingClientRect: () => rect(left, top, width, height),
      offsetWidth: width,
      offsetHeight: height,
      clientLeft: 0,
      clientTop: 0,
      clientWidth: width,
      clientHeight: height,
    });
    let topLayer = true;
    // A box that clips its content to 50 x 50, which leaves the anchor at (100, 100) out.
    const clipper = Object.assign(new EventTarget(), box(0, 0, 50, 50), {
      parentNode: null,
      matches: () => false,
    });
    // A popup in the top layer, inside the clipping box, holding the anchor.
    const popup = Object.assign(new EventTarget(), box(90, 90, 200, 200), {
      parentNode: clipper,
      matches: (selector: string) => topLayer && selector.includes(':popover-open'),
    });
    Object.assign(anchor, { parentNode: popup });
    view['getComputedStyle'] = (element: unknown) =>
      element === clipper
        ? { ...base, overflow: 'clip', overflowX: 'clip', overflowY: 'clip' }
        : base;
    const hidden: boolean[] = [];
    Object.assign(surface, {
      toggleAttribute: (name: string, value: boolean) => {
        if (name === 'data-anchor-hidden') hidden.push(value);
      },
    });
    positionSurface(anchor, surface, { tracking: false }).destroy();
    expect(hidden).toEqual([false]);
    // Out of the top layer, the clipping ancestor hides the anchor.
    topLayer = false;
    positionSurface(anchor, surface, { tracking: false }).destroy();
    expect(hidden).toEqual([false, true]);
  });
});

describe('adaptive origin', () => {
  it('hangs a surface above its anchor from the bottom of the containing block', () => {
    const { anchor, surface, style } = surfaceFixture();
    // Anchor 100,100 80x40; surface 120x60 above it: y = 40, x centered = 80. The document is 600 tall.
    const handle = positionSurface(anchor, surface, {
      placement: 'top',
      offset: 0,
      tracking: false,
      adaptiveOrigin: true,
    });
    expect(style.top).toBe('auto');
    expect(style.bottom).toBe('0px');
    expect(style.left).toBe('0px');
    expect(style.translate).toBe('80px -500px');
    handle.destroy();
    expect(style.bottom).toBeUndefined();
  });

  it('hangs a surface before its anchor from the right edge, and keeps plain offsets elsewhere', () => {
    const { anchor, surface, style } = surfaceFixture();
    // Surface 120x60 left of the anchor: x = -20 (shifted to 0 by the viewport), so right = 800 - 120.
    const left = positionSurface(anchor, surface, {
      placement: 'left',
      offset: 0,
      tracking: false,
      adaptiveOrigin: true,
      collision: { side: 'none', align: 'none' },
    });
    expect(style.left).toBe('auto');
    expect(style.right).toBe('0px');
    expect(style.translate).toBe('-700px 90px');
    left.destroy();
    const below = positionSurface(anchor, surface, {
      placement: 'bottom',
      offset: 0,
      tracking: false,
      adaptiveOrigin: true,
    });
    expect(style.left).toBe('0px');
    expect(style.top).toBe('0px');
    expect(style.right).toBeUndefined();
    expect(style.bottom).toBeUndefined();
    expect(style.translate).toBe('80px 140px');
    below.destroy();
  });
});

describe('anchor tracking', () => {
  it('reads the client rectangles of a virtual anchor on every pass', () => {
    const { anchor, surface, style } = surfaceFixture();
    let lines = [rect(200, 100, 200, 20), rect(20, 120, 100, 20)];
    const getClientRectangles = vi.fn(() => lines);
    const handle = positionSurface(
      {
        getBoundingRectangle: () => rect(20, 100, 380, 40),
        getClientRectangles,
        contextElement: anchor,
      },
      surface,
      { placement: 'top-start', offset: 0, tracking: false },
    );
    expect(style.translate).toBe('200px 40px');
    lines = [rect(300, 100, 50, 20), rect(20, 120, 100, 20)];
    void handle.update();
    expect(getClientRectangles).toHaveBeenCalledTimes(2);
    expect(style.translate).toBe('300px 40px');
    handle.destroy();
  });

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

/**
 * A body whose appends and removals reach the fixture's mutation observers as `childList`
 * records (delivered by `deliver`, as the microtask would), and a theme spacing seed of
 * `0.25rem` at 16 px (4 px per unit).
 */
function observedDocument(fixture: ReturnType<typeof surfaceFixture>) {
  const document = (fixture.anchor as unknown as { ownerDocument: Record<string, unknown> })
    .ownerDocument;
  const view = document['defaultView'] as Record<string, unknown>;
  const callbacks: Array<(records: unknown[]) => void> = [];
  const queue: unknown[] = [];
  view['MutationObserver'] = class {
    constructor(callback: (records: unknown[]) => void) {
      callbacks.push(callback);
    }
    observe() {}
    disconnect() {}
  };
  const base = (view['getComputedStyle'] as () => Record<string, string>)();
  let seed = '0.25rem';
  view['getComputedStyle'] = () => ({
    ...base,
    fontSize: '16px',
    getPropertyValue: (name: string) => (name === '--tp-spacing' ? seed : ''),
  });
  let probes = 0;
  const body = { nodeType: 1, parentNode: null };
  const record = (added: unknown[], removed: unknown[]) =>
    queue.push({ type: 'childList', target: body, addedNodes: added, removedNodes: removed });
  Object.assign(body, {
    append: (node: unknown) => {
      probes += 1;
      record([node], []);
    },
  });
  document['body'] = body;
  document['createElement'] = () => {
    const style: Record<string, string> = {};
    const probe = {
      nodeType: 1,
      style,
      // `calc(<seed> * <units>)` at 16 px per rem.
      getBoundingClientRect: () => {
        const [, value, units] = /calc\(([\d.]+)rem \* ([\d.]+)\)/.exec(style['inlineSize']!)!;
        return rect(0, 0, Number(value) * 16 * Number(units), 0);
      },
      remove: () => record([], [probe]),
    };
    return probe;
  };
  return {
    probes: () => probes,
    setSeed: (value: string) => {
      seed = value;
    },
    push: (records: unknown[]) => queue.push(...records),
    deliver: () => {
      const records = queue.splice(0);
      if (records.length) for (const callback of callbacks) callback(records);
    },
  };
}

describe('open surfaces at rest', () => {
  it('resolves the theme spacing once per seed instead of inserting a probe on every call', () => {
    const fixture = surfaceFixture();
    const document = observedDocument(fixture);
    expect(themeSpacing(fixture.anchor, 2)).toBe(8);
    expect(themeSpacing(fixture.anchor, 2)).toBe(8);
    expect(themeSpacing(fixture.anchor, 3)).toBe(12);
    expect(document.probes()).toBe(2);
    // A theme that changes the seed is measured again.
    document.setSeed('0.5rem');
    expect(themeSpacing(fixture.anchor, 2)).toBe(16);
    expect(document.probes()).toBe(3);
  });

  it('does not reposition after its own pass: the probe and other mutations off the anchor and surface chains are ignored', () => {
    const fixture = surfaceFixture();
    const document = observedDocument(fixture);
    const onPosition = vi.fn();
    const onInvalid = vi.fn();
    // As anchored surfaces resolve their default side offset, on every pass.
    const handle = positionSurface(fixture.anchor, fixture.surface, {
      offset: () => themeSpacing(fixture.anchor, 3),
      onPosition,
      onInvalid,
    });
    expect(onPosition).toHaveBeenCalledTimes(1);
    expect(fixture.style.translate).toBe('80px 152px');
    // The probe's records reach the document observer: no pass follows (no frame loop).
    document.deliver();
    expect(fixture.requestAnimationFrame).not.toHaveBeenCalled();
    // A later pass reads the resolved spacing and leaves the document untouched.
    void handle.update();
    expect(document.probes()).toBe(1);
    document.deliver();
    expect(fixture.requestAnimationFrame).not.toHaveBeenCalled();
    // Content added elsewhere in the page.
    document.push([
      { type: 'childList', target: {}, addedNodes: [{ nodeType: 1 }], removedNodes: [] },
    ]);
    document.deliver();
    expect(fixture.requestAnimationFrame).not.toHaveBeenCalled();
    // Removing an ancestor of the anchor detaches it: the next pass reports the anchor gone.
    vi.stubGlobal('Element', EventTarget);
    const ancestor = Object.assign(new EventTarget(), {
      nodeType: 1,
      parentNode: null,
      assignedSlot: null,
    });
    Object.assign(fixture.anchor, { parentNode: ancestor, isConnected: false });
    document.push([{ type: 'childList', target: {}, addedNodes: [], removedNodes: [ancestor] }]);
    document.deliver();
    expect(fixture.requestAnimationFrame).toHaveBeenCalledTimes(1);
    fixture.frame();
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(fixture.style.translate).toBeUndefined();
    handle.destroy();
  });

  it('writes the surface and its arrow only when a value changes', () => {
    const fixture = surfaceFixture();
    const writes: string[] = [];
    const record = (target: string, style: Record<string, unknown>) => {
      const setProperty = style['setProperty'] as (name: string, value: string) => void;
      const removeProperty = style['removeProperty'] as (name: string) => void;
      style['setProperty'] = (name: string, value: string) => {
        writes.push(`${target} ${name}`);
        setProperty(name, value);
      };
      style['removeProperty'] = (name: string) => {
        writes.push(`${target} -${name}`);
        removeProperty(name);
      };
      return new Proxy<Record<string, string>>(
        {},
        {
          set(data, key, value: string) {
            writes.push(`${target} data-${String(key)}`);
            data[key as string] = value;
            return true;
          },
        },
      );
    };
    Object.assign(fixture.surface, { dataset: record('surface', fixture.style) });
    const arrowStyle = fakeStyle();
    const arrow = {
      style: arrowStyle,
      dataset: record('arrow', arrowStyle),
      offsetWidth: 12,
      offsetHeight: 6,
      getBoundingClientRect: () => rect(0, 0, 12, 6),
      toggleAttribute() {},
      removeAttribute() {},
    } as unknown as HTMLElement;
    const handle = positionSurface(fixture.anchor, fixture.surface, {
      arrow,
      constrainSize: true,
      matchReferenceWidth: true,
      tracking: false,
    });
    expect(writes).toContain('surface translate');
    expect(writes).toContain('arrow left');
    writes.length = 0;
    void handle.update();
    expect(writes).toEqual([]);
    // A moved anchor writes what moved.
    fixture.moveAnchor(rect(100, 120, 80, 40));
    void handle.update();
    expect(writes).toContain('surface translate');
    expect(writes).not.toContain('surface data-side');
    expect(writes).not.toContain('arrow data-side');
    handle.destroy();
  });
});
