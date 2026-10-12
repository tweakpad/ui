import { describe, expect, it, vi } from 'vitest';
import { ManualFrames } from './fakes.test.js';
import { FrameLoop } from './frame-loop.js';
import {
  AUTO_PAN_SPEED,
  PanZoomController,
  WHEEL_SETTLE_DELAY,
  clampViewport,
  wheelZoomFactor,
  zoomToPoint,
  type PanZoomLimits,
  type PanZoomOptions,
  type PanZoomPoint,
  type PanZoomPolicy,
  type PanZoomViewport,
} from './pan-zoom.js';

class FakeWindow extends EventTarget {
  readonly #frames = new Map<number, FrameRequestCallback>();
  readonly #timers = new Map<number, { at: number; callback: () => void }>();
  #next = 0;
  #now = 0;
  get frames(): FrameRequestCallback[] {
    return [...this.#frames.values()];
  }
  get timers(): number {
    return this.#timers.size;
  }
  requestAnimationFrame = (callback: FrameRequestCallback): number => {
    const id = ++this.#next;
    this.#frames.set(id, callback);
    return id;
  };
  cancelAnimationFrame = (id: number): void => {
    this.#frames.delete(id);
  };
  setTimeout = (callback: () => void, delay: number): number => {
    const id = ++this.#next;
    this.#timers.set(id, { at: this.#now + delay, callback });
    return id;
  };
  clearTimeout = (id: number): void => {
    this.#timers.delete(id);
  };
  flush(): void {
    const pending = [...this.#frames.values()];
    this.#frames.clear();
    for (const frame of pending) frame(0);
  }
  /** Advances the clock, running timers that come due in order. */
  advance(ms: number): void {
    this.#now += ms;
    for (const [id, timer] of [...this.#timers].sort((a, b) => a[1].at - b[1].at)) {
      if (timer.at > this.#now) continue;
      this.#timers.delete(id);
      timer.callback();
    }
  }
}

class FakeElement extends EventTarget {
  rect = { left: 10, top: 20, width: 200, height: 100 };
  captured: number[] = [];
  released: number[] = [];
  readonly #active = new Set<number>();
  getBoundingClientRect() {
    return this.rect;
  }
  setPointerCapture(id: number) {
    this.captured.push(id);
    this.#active.add(id);
  }
  hasPointerCapture(id: number) {
    return this.#active.has(id);
  }
  releasePointerCapture(id: number) {
    this.#active.delete(id);
    this.released.push(id);
  }
}

function pointer(type: string, init: Record<string, unknown> = {}): PointerEvent {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, {
    button: 0,
    pointerId: 1,
    pointerType: 'mouse',
    clientX: 10,
    clientY: 20,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    ...init,
  });
  return event as unknown as PointerEvent;
}

function wheel(init: Record<string, unknown> = {}): WheelEvent {
  const event = new Event('wheel', { cancelable: true });
  Object.assign(event, {
    clientX: 110,
    clientY: 70,
    deltaX: 0,
    deltaY: 0,
    deltaMode: 0,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    ...init,
  });
  return event as unknown as WheelEvent;
}

function doubleClick(init: Record<string, unknown> = {}): MouseEvent {
  const event = new Event('dblclick', { cancelable: true });
  Object.assign(event, { clientX: 110, clientY: 70, shiftKey: false, ...init });
  return event as unknown as MouseEvent;
}

const DEFAULT_POLICY: PanZoomPolicy = {
  panButtons: [0],
  wheel: 'zoom',
  pinch: true,
  doubleClickZoom: true,
  cooperative: false,
  activationHeld: false,
  panOnTouch: true,
};

interface SetupOptions {
  policy?: Partial<PanZoomPolicy>;
  limits?: Partial<PanZoomLimits>;
  viewport?: PanZoomViewport;
  filter?: PanZoomOptions['filter'];
  frameLoop?: PanZoomOptions['frameLoop'];
}

function setup(options: SetupOptions = {}) {
  const owner = new FakeWindow();
  const element = new FakeElement();
  const model = { viewport: options.viewport ?? { x: 0, y: 0, zoom: 1 } };
  const policy: PanZoomPolicy = { ...DEFAULT_POLICY, ...options.policy };
  const limits: PanZoomLimits = { minZoom: 0.25, maxZoom: 4, ...options.limits };
  const calls: string[] = [];
  const viewports: PanZoomViewport[] = [];
  const handlers = {
    start: vi.fn((reason: string) => {
      calls.push(`start:${reason}`);
    }),
    move: vi.fn((viewport: PanZoomViewport, reason: string) => {
      model.viewport = viewport;
      viewports.push(viewport);
      calls.push(`move:${reason}`);
    }),
    end: vi.fn((reason: string) => {
      calls.push(`end:${reason}`);
    }),
    cancel: vi.fn(() => {
      calls.push('cancel');
    }),
  };
  const controller = new PanZoomController({
    element: element as unknown as HTMLElement,
    owner: owner as unknown as Window,
    viewport: () => model.viewport,
    limits: () => limits,
    policy: () => policy,
    handlers,
    ...(options.filter ? { filter: options.filter } : {}),
    ...(options.frameLoop ? { frameLoop: options.frameLoop } : {}),
  });
  controller.connect();
  return { owner, element, model, policy, limits, controller, calls, viewports, handlers };
}

const nearPoint = (point: PanZoomPoint, expected: PanZoomPoint) => {
  expect(point.x).toBeCloseTo(expected.x, 6);
  expect(point.y).toBeCloseTo(expected.y, 6);
};

const near = (viewport: PanZoomViewport, expected: PanZoomViewport) => {
  nearPoint(viewport, expected);
  expect(viewport.zoom).toBeCloseTo(expected.zoom, 6);
};

describe('wheelZoomFactor', () => {
  it('scales pixel, line and page deltas and amplifies a macOS trackpad pinch', () => {
    expect(wheelZoomFactor(-100, 0)).toBeCloseTo(2 ** 0.2, 10);
    expect(wheelZoomFactor(3, 1)).toBeCloseTo(2 ** -0.15, 10);
    expect(wheelZoomFactor(1, 2)).toBeCloseTo(0.5, 10);
    expect(wheelZoomFactor(-10, 0, { pinch: true })).toBeCloseTo(2 ** 0.02, 10);
    expect(wheelZoomFactor(-10, 0, { pinch: true, mac: true })).toBeCloseTo(2 ** 0.2, 10);
    expect(wheelZoomFactor(-10, 0, { mac: true })).toBeCloseTo(2 ** 0.02, 10);
  });
});

describe('clampViewport', () => {
  const size = { width: 200, height: 100 };

  it('clamps the zoom and leaves the translation alone without an extent', () => {
    expect(clampViewport({ x: 5, y: 6, zoom: 9 }, { minZoom: 0.5, maxZoom: 2 }, size)).toEqual({
      x: 5,
      y: 6,
      zoom: 2,
    });
    expect(clampViewport({ x: 5, y: 6, zoom: 0.1 }, { minZoom: 0.5, maxZoom: 2 }, size)).toEqual({
      x: 5,
      y: 6,
      zoom: 0.5,
    });
  });

  it('pushes the view back inside a larger extent and centers a smaller one', () => {
    const limits: PanZoomLimits = {
      minZoom: 0.25,
      maxZoom: 4,
      translateExtent: [
        [0, 0],
        [400, 300],
      ],
    };
    // Dragged 50 px right of the extent's left edge.
    expect(clampViewport({ x: 50, y: 0, zoom: 1 }, limits, size)).toEqual({ x: 0, y: 0, zoom: 1 });
    // Dragged past the right edge: the view's right side meets the extent's right side.
    expect(clampViewport({ x: -300, y: -250, zoom: 1 }, limits, size)).toEqual({
      x: -200,
      y: -200,
      zoom: 1,
    });
    // Inside the extent nothing moves.
    expect(clampViewport({ x: -100, y: -50, zoom: 1 }, limits, size)).toEqual({
      x: -100,
      y: -50,
      zoom: 1,
    });
    // At a zoom where the extent is smaller than the view, it is centered.
    expect(clampViewport({ x: 0, y: 0, zoom: 0.25 }, limits, size)).toEqual({
      x: 50,
      y: 12.5,
      zoom: 0.25,
    });
    // Infinite extents constrain nothing.
    expect(
      clampViewport(
        { x: 999, y: -999, zoom: 1 },
        {
          minZoom: 0.25,
          maxZoom: 4,
          translateExtent: [
            [-Infinity, -Infinity],
            [Infinity, Infinity],
          ],
        },
        size,
      ),
    ).toEqual({ x: 999, y: -999, zoom: 1 });
  });
});

describe('zoomToPoint', () => {
  it('keeps the flow point under the screen point fixed and clamps the zoom', () => {
    const viewport = { x: 10, y: 20, zoom: 1 };
    const limits = { minZoom: 0.5, maxZoom: 2 };
    const next = zoomToPoint(viewport, 2, { x: 100, y: 50 }, limits);
    near(next, { x: 100 - 90 * 2, y: 50 - 30 * 2, zoom: 2 });
    // The flow point (90, 30) is still under (100, 50).
    expect((100 - next.x) / next.zoom).toBeCloseTo(90);
    expect((50 - next.y) / next.zoom).toBeCloseTo(30);
    near(zoomToPoint(viewport, 10, { x: 100, y: 50 }, limits), next);
    near(zoomToPoint(viewport, 1, { x: 100, y: 50 }, limits), viewport);
  });
});

describe('PanZoomController', () => {
  it('captures an allowed press, pans one frame per movement batch and ends on release', () => {
    const { owner, element, controller, calls, viewports } = setup();
    const down = pointer('pointerdown', { clientX: 60, clientY: 70 });
    element.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(element.captured).toEqual([1]);
    expect(controller.active).toBe(true);
    expect(controller.pinching).toBe(false);
    expect(calls).toEqual(['start:drag']);

    element.dispatchEvent(pointer('pointermove', { clientX: 70, clientY: 75 }));
    element.dispatchEvent(pointer('pointermove', { clientX: 90, clientY: 80 }));
    expect(calls).toEqual(['start:drag']);
    expect(owner.frames).toHaveLength(1);
    owner.flush();
    expect(calls).toEqual(['start:drag', 'move:drag']);
    expect(viewports[0]).toEqual({ x: 30, y: 10, zoom: 1 });

    element.dispatchEvent(pointer('pointermove', { clientX: 100, clientY: 90 }));
    const up = pointer('pointerup', { clientX: 100, clientY: 90 });
    element.dispatchEvent(up);
    // The pending movement settles before the end.
    expect(calls).toEqual(['start:drag', 'move:drag', 'move:drag', 'end:drag']);
    expect(viewports[1]).toEqual({ x: 40, y: 20, zoom: 1 });
    expect(owner.frames).toHaveLength(0);
    expect(element.released).toEqual([1]);
    expect(controller.active).toBe(false);
    // A late lost-capture notification after the release is inert.
    element.dispatchEvent(pointer('lostpointercapture'));
    expect(calls).toHaveLength(4);
  });

  it('pans relative to the viewport at the press, not the pointer origin', () => {
    const { owner, element, viewports } = setup({ viewport: { x: -40, y: 25, zoom: 2 } });
    element.dispatchEvent(pointer('pointerdown', { clientX: 60, clientY: 70 }));
    element.dispatchEvent(pointer('pointermove', { clientX: 61, clientY: 69 }));
    owner.flush();
    expect(viewports[0]).toEqual({ x: -39, y: 24, zoom: 2 });
  });

  it('pinches with a second pointer around the midpoint and resumes a pan when one lifts', () => {
    const { owner, element, controller, calls, viewports } = setup();
    // Element-relative (50, 50) and (150, 50): midpoint (100, 50), distance 100.
    element.dispatchEvent(pointer('pointerdown', { pointerId: 1, clientX: 60, clientY: 70 }));
    const second = pointer('pointerdown', { pointerId: 2, clientX: 160, clientY: 70 });
    element.dispatchEvent(second);
    expect(second.defaultPrevented).toBe(true);
    expect(element.captured).toEqual([1, 2]);
    expect(controller.pinching).toBe(true);
    expect(calls).toEqual(['start:drag']);

    // Spread the second pointer to (250, 50): distance 200 (zoom x2), midpoint (150, 50).
    element.dispatchEvent(pointer('pointermove', { pointerId: 2, clientX: 260, clientY: 70 }));
    owner.flush();
    expect(calls).toEqual(['start:drag', 'move:drag']);
    // The flow point under the old midpoint, (100, 50), is now under (150, 50) at zoom 2.
    near(viewports[0]!, { x: 150 - 100 * 2, y: 50 - 50 * 2, zoom: 2 });
    nearPoint(controller.screenToFlow({ x: 150, y: 50 }), { x: 100, y: 50 });

    // The second pointer lifts: the first continues as a plain pan from the current viewport.
    element.dispatchEvent(pointer('pointerup', { pointerId: 2, clientX: 260, clientY: 70 }));
    expect(controller.pinching).toBe(false);
    expect(controller.active).toBe(true);
    expect(element.released).toEqual([2]);
    expect(calls).toEqual(['start:drag', 'move:drag']);
    element.dispatchEvent(pointer('pointermove', { pointerId: 1, clientX: 70, clientY: 80 }));
    owner.flush();
    near(viewports[1]!, { x: -50 + 10, y: -50 + 10, zoom: 2 });
    element.dispatchEvent(pointer('pointerup', { pointerId: 1, clientX: 70, clientY: 80 }));
    expect(calls).toEqual(['start:drag', 'move:drag', 'move:drag', 'end:drag']);
    expect(element.released).toEqual([2, 1]);
  });

  it('ends the gesture when a third pointer lands and ignores a second one without pinch', () => {
    const { element, controller, calls } = setup();
    element.dispatchEvent(pointer('pointerdown', { pointerId: 1 }));
    element.dispatchEvent(pointer('pointerdown', { pointerId: 2, clientX: 100 }));
    expect(controller.pinching).toBe(true);
    element.dispatchEvent(pointer('pointerdown', { pointerId: 3, clientX: 150 }));
    expect(calls).toEqual(['start:drag', 'end:drag']);
    expect(controller.active).toBe(false);
    expect(element.released).toEqual([1, 2]);

    const plain = setup({ policy: { pinch: false } });
    plain.element.dispatchEvent(pointer('pointerdown', { pointerId: 1 }));
    const second = pointer('pointerdown', { pointerId: 2, clientX: 100 });
    plain.element.dispatchEvent(second);
    expect(second.defaultPrevented).toBe(false);
    expect(plain.controller.pinching).toBe(false);
    expect(plain.element.captured).toEqual([1]);
  });

  it('settles at the last position when capture is lost or a move reports no button', () => {
    const lost = setup();
    lost.element.dispatchEvent(pointer('pointerdown'));
    lost.element.dispatchEvent(pointer('pointermove', { clientX: 90, clientY: 60 }));
    expect(lost.owner.frames).toHaveLength(1);
    lost.element.dispatchEvent(pointer('lostpointercapture', { clientX: 0, clientY: 0 }));
    expect(lost.calls).toEqual(['start:drag', 'move:drag', 'end:drag']);
    expect(lost.viewports[0]).toEqual({ x: 80, y: 40, zoom: 1 });
    expect(lost.controller.active).toBe(false);
    expect(lost.owner.frames).toHaveLength(0);
    lost.element.dispatchEvent(pointer('pointerup'));
    expect(lost.calls).toHaveLength(3);

    const buttonless = setup();
    buttonless.element.dispatchEvent(pointer('pointerdown'));
    buttonless.element.dispatchEvent(
      pointer('pointermove', { clientX: 50, clientY: 20, buttons: 0 }),
    );
    expect(buttonless.calls).toEqual(['start:drag', 'move:drag', 'end:drag']);
    expect(buttonless.viewports[0]).toEqual({ x: 40, y: 0, zoom: 1 });
    expect(buttonless.controller.active).toBe(false);
  });

  it('cancels on pointercancel and disposal without a move or an end', () => {
    const { owner, element, controller, calls } = setup();
    element.dispatchEvent(pointer('pointerdown'));
    element.dispatchEvent(pointer('pointermove', { clientX: 90 }));
    element.dispatchEvent(pointer('pointercancel'));
    owner.flush();
    expect(calls).toEqual(['start:drag', 'cancel']);
    expect(element.released).toEqual([1]);
    expect(controller.active).toBe(false);

    element.dispatchEvent(pointer('pointerdown'));
    controller.disconnect();
    expect(calls).toEqual(['start:drag', 'cancel', 'start:drag', 'cancel']);
    expect(element.released).toEqual([1, 1]);
  });

  it('honors the button policy, the activation key, touch policy, Ctrl presses and the filter', () => {
    const secondary = setup({ policy: { panButtons: [1, 2] } });
    const primary = pointer('pointerdown');
    secondary.element.dispatchEvent(primary);
    expect(primary.defaultPrevented).toBe(false);
    expect(secondary.calls).toEqual([]);
    secondary.element.dispatchEvent(pointer('pointerdown', { button: 1 }));
    expect(secondary.calls).toEqual(['start:drag']);

    const held = setup({ policy: { panButtons: [], activationHeld: true } });
    held.element.dispatchEvent(pointer('pointerdown', { button: 2 }));
    expect(held.calls).toEqual(['start:drag']);

    const touch = setup({ policy: { panOnTouch: false } });
    touch.element.dispatchEvent(pointer('pointerdown', { pointerType: 'touch' }));
    expect(touch.calls).toEqual([]);
    touch.element.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse' }));
    expect(touch.calls).toEqual(['start:drag']);

    const control = setup();
    control.element.dispatchEvent(pointer('pointerdown', { ctrlKey: true }));
    expect(control.calls).toEqual([]);

    const filter = vi.fn(() => false);
    const filtered = setup({ filter });
    const press = pointer('pointerdown');
    filtered.element.dispatchEvent(press);
    expect(filter).toHaveBeenCalledWith(press);
    expect(press.defaultPrevented).toBe(false);
    expect(filtered.element.captured).toEqual([]);
    expect(filtered.calls).toEqual([]);
  });

  it('zooms around the wheel point, keeping the flow point under the pointer fixed', () => {
    const { owner, element, controller, calls, viewports } = setup({
      viewport: { x: 10, y: 20, zoom: 1 },
    });
    // Element-relative (100, 50) over the flow point (90, 30).
    const event = wheel({ deltaY: -100 });
    element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(calls).toEqual(['start:wheel', 'move:wheel']);
    expect(controller.active).toBe(true);
    const factor = 2 ** 0.2;
    near(viewports[0]!, { x: 100 - 90 * factor, y: 50 - 30 * factor, zoom: factor });
    nearPoint(controller.screenToFlow({ x: 100, y: 50 }), { x: 90, y: 30 });

    // Further wheels extend the same gesture; the end is debounced after the last one.
    owner.advance(WHEEL_SETTLE_DELAY - 1);
    element.dispatchEvent(wheel({ deltaY: -100 }));
    expect(calls).toEqual(['start:wheel', 'move:wheel', 'move:wheel']);
    owner.advance(WHEEL_SETTLE_DELAY - 1);
    expect(calls).toHaveLength(3);
    owner.advance(1);
    expect(calls).toEqual(['start:wheel', 'move:wheel', 'move:wheel', 'end:wheel']);
    expect(controller.active).toBe(false);
    expect(owner.timers).toBe(0);
  });

  it('pans on wheel under the pan policy, swaps axes with Shift and zooms on a Ctrl or Meta wheel', () => {
    const { element, calls, viewports, controller } = setup({ policy: { wheel: 'pan' } });
    element.dispatchEvent(wheel({ deltaX: 10, deltaY: 20 }));
    expect(viewports[0]).toEqual({ x: -10, y: -20, zoom: 1 });
    element.dispatchEvent(wheel({ deltaY: 5, deltaMode: 1 }));
    expect(viewports[1]).toEqual({ x: -10, y: -120, zoom: 1 });
    element.dispatchEvent(wheel({ deltaY: 20, shiftKey: true }));
    expect(viewports[2]).toEqual({ x: -30, y: -120, zoom: 1 });
    // The platform already swapped the axes: keep them.
    element.dispatchEvent(wheel({ deltaX: 20, shiftKey: true }));
    expect(viewports[3]).toEqual({ x: -50, y: -120, zoom: 1 });

    const pinch = wheel({ deltaY: -100, ctrlKey: true });
    element.dispatchEvent(pinch);
    expect(pinch.defaultPrevented).toBe(true);
    nearPoint(controller.screenToFlow({ x: 100, y: 50 }), { x: 150, y: 170 });
    expect(viewports[4]!.zoom).toBeCloseTo(2 ** 0.2);
    element.dispatchEvent(wheel({ deltaY: -100, metaKey: true }));
    expect(viewports[5]!.zoom).toBeCloseTo(2 ** 0.4);
    expect(calls.filter((call) => call === 'start:wheel')).toHaveLength(1);
  });

  it('leaves plain wheels alone under cooperative gating and the none policy', () => {
    const cooperative = setup({ policy: { wheel: 'zoom', cooperative: true } });
    const plain = wheel({ deltaY: -100 });
    cooperative.element.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(false);
    expect(cooperative.calls).toEqual([]);
    const modified = wheel({ deltaY: -100, ctrlKey: true });
    cooperative.element.dispatchEvent(modified);
    expect(modified.defaultPrevented).toBe(true);
    expect(cooperative.calls).toEqual(['start:wheel', 'move:wheel']);

    const none = setup({ policy: { wheel: 'none' } });
    none.element.dispatchEvent(wheel({ deltaY: -100 }));
    expect(none.calls).toEqual([]);
    none.element.dispatchEvent(wheel({ deltaY: -100, ctrlKey: true }));
    expect(none.calls).toEqual(['start:wheel', 'move:wheel']);

    const noPinch = setup({ policy: { wheel: 'zoom', pinch: false } });
    const pinch = wheel({ deltaY: -100, ctrlKey: true });
    noPinch.element.dispatchEvent(pinch);
    expect(pinch.defaultPrevented).toBe(false);
    expect(noPinch.calls).toEqual([]);

    const filtered = setup({ filter: (event) => event.type !== 'wheel' });
    filtered.element.dispatchEvent(wheel({ deltaY: -100 }));
    expect(filtered.calls).toEqual([]);
  });

  it('ignores wheels while a pointer gesture is in progress', () => {
    const { element, calls } = setup();
    element.dispatchEvent(pointer('pointerdown'));
    const event = wheel({ deltaY: -100 });
    element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(calls).toEqual(['start:drag']);
  });

  it('clamps every reported viewport to the zoom range and the translate extent', () => {
    const { owner, element, viewports, controller } = setup({
      limits: {
        maxZoom: 1.1,
        translateExtent: [
          [0, 0],
          [400, 300],
        ],
      },
    });
    element.dispatchEvent(pointer('pointerdown'));
    element.dispatchEvent(pointer('pointermove', { clientX: 60, clientY: 50 }));
    owner.flush();
    expect(viewports[0]).toEqual({ x: 0, y: 0, zoom: 1 });
    element.dispatchEvent(pointer('pointerup', { clientX: 60, clientY: 50 }));
    element.dispatchEvent(wheel({ deltaY: -1000 }));
    expect(viewports[1]!.zoom).toBe(1.1);
    controller.panBy({ x: -1000, y: -1000 });
    near(viewports[2]!, { x: 200 - 400 * 1.1, y: 100 - 300 * 1.1, zoom: 1.1 });
  });

  it('zooms by 1.2 around a double click with reason gesture, out with Shift', () => {
    const { element, calls, viewports, controller } = setup({
      viewport: { x: 10, y: 20, zoom: 1 },
    });
    const event = doubleClick();
    element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(calls).toEqual(['start:gesture', 'move:gesture', 'end:gesture']);
    near(viewports[0]!, { x: 100 - 90 * 1.2, y: 50 - 30 * 1.2, zoom: 1.2 });
    nearPoint(controller.screenToFlow({ x: 100, y: 50 }), { x: 90, y: 30 });
    element.dispatchEvent(doubleClick({ shiftKey: true }));
    expect(viewports[1]!.zoom).toBeCloseTo(1);

    const off = setup({ policy: { doubleClickZoom: false } });
    const ignored = doubleClick();
    off.element.dispatchEvent(ignored);
    expect(ignored.defaultPrevented).toBe(false);
    expect(off.calls).toEqual([]);

    const filtered = setup({ filter: (event) => event.type !== 'dblclick' });
    filtered.element.dispatchEvent(doubleClick());
    expect(filtered.calls).toEqual([]);
  });

  it('steps animateTo once per frame, resolves true when settled and false when interrupted', async () => {
    const frames = new ManualFrames();
    const { element, controller, calls, viewports } = setup({
      frameLoop: new FrameLoop(frames),
    });
    const settled = controller.animateTo(
      { x: -100, y: -50, zoom: 2 },
      { duration: 100, easing: (t) => t },
    );
    expect(calls).toEqual([]);
    expect(frames.pending).toBe(1);
    frames.tick(50);
    expect(calls).toEqual(['move:programmatic']);
    // Halfway: zoom interpolates geometrically, the view center moves straight in flow space.
    expect(viewports[0]!.zoom).toBeCloseTo(Math.SQRT2);
    // The target keeps the same flow point, (100, 50), at the view center.
    near(viewports[0]!, { x: 100 - 100 * Math.SQRT2, y: 50 - 50 * Math.SQRT2, zoom: Math.SQRT2 });
    frames.tick(25);
    expect(calls).toHaveLength(2);
    frames.tick(25);
    expect(calls).toHaveLength(3);
    expect(viewports[2]).toEqual({ x: -100, y: -50, zoom: 2 });
    expect(frames.pending).toBe(0);
    await expect(settled).resolves.toBe(true);

    const interrupted = controller.animateTo({ x: 0, y: 0, zoom: 1 }, { duration: 100 });
    frames.tick(10);
    expect(calls).toHaveLength(4);
    element.dispatchEvent(pointer('pointerdown'));
    await expect(interrupted).resolves.toBe(false);
    frames.tick(50);
    expect(calls).toHaveLength(5);
    expect(calls.at(-1)).toBe('start:drag');

    // A zero duration applies the target at once; a clamped target is what gets applied.
    await expect(controller.animateTo({ x: 1, y: 2, zoom: 100 }, { duration: 0 })).resolves.toBe(
      true,
    );
    expect(viewports.at(-1)).toEqual({ x: 1, y: 2, zoom: 4 });
    const replaced = controller.animateTo({ x: 0, y: 0, zoom: 1 }, { duration: 100 });
    controller.cancelAnimation();
    await expect(replaced).resolves.toBe(false);
  });

  it('auto-pans with a speed that ramps toward the edge and stops inside the margin', () => {
    const frames = new ManualFrames();
    const { controller, calls, viewports } = setup({ frameLoop: new FrameLoop(frames) });
    controller.autoPan({ x: 20, y: 50 });
    expect(frames.pending).toBe(1);
    frames.tick();
    expect(calls).toEqual(['move:drag']);
    expect(viewports[0]).toEqual({ x: AUTO_PAN_SPEED / 2, y: 0, zoom: 1 });
    controller.autoPan({ x: 0, y: 50 });
    frames.tick();
    expect(viewports[1]).toEqual({ x: AUTO_PAN_SPEED * 1.5, y: 0, zoom: 1 });
    // Near the far corner the pan runs the other way on both axes.
    controller.autoPan({ x: 190, y: 90 });
    frames.tick();
    expect(viewports[2]).toEqual({
      x: AUTO_PAN_SPEED * 1.5 - AUTO_PAN_SPEED * 0.75,
      y: -AUTO_PAN_SPEED * 0.75,
      zoom: 1,
    });
    expect(frames.pending).toBe(1);
    controller.autoPan({ x: 100, y: 50 });
    frames.tick();
    expect(calls).toHaveLength(3);
    expect(frames.pending).toBe(0);
    controller.autoPan({ x: 5, y: 50 });
    controller.stopAutoPan();
    frames.tick();
    expect(calls).toHaveLength(3);
    expect(frames.pending).toBe(0);
  });

  it('converts between screen and flow points and pans or zooms programmatically', () => {
    const { controller, viewports, calls } = setup({ viewport: { x: 10, y: 20, zoom: 2 } });
    expect(controller.screenToFlow({ x: 30, y: 40 })).toEqual({ x: 10, y: 10 });
    expect(controller.flowToScreen({ x: 10, y: 10 })).toEqual({ x: 30, y: 40 });
    controller.panBy({ x: 5, y: -5 });
    expect(viewports[0]).toEqual({ x: 15, y: 15, zoom: 2 });
    controller.zoomAround({ x: 15, y: 15 }, 0.5, 'gesture');
    expect(viewports[1]).toEqual({ x: 15, y: 15, zoom: 1 });
    expect(calls).toEqual(['move:programmatic', 'move:gesture']);
  });

  it('releases its listeners, timers and frames on disconnect', () => {
    const frames = new ManualFrames();
    const { owner, element, controller, calls } = setup({ frameLoop: new FrameLoop(frames) });
    element.dispatchEvent(wheel({ deltaY: -100 }));
    controller.autoPan({ x: 0, y: 0 });
    expect(owner.timers).toBe(1);
    expect(frames.pending).toBe(1);
    controller.disconnect();
    expect(calls).toEqual(['start:wheel', 'move:wheel', 'end:wheel']);
    expect(owner.timers).toBe(0);
    frames.tick();
    expect(calls).toHaveLength(3);
    expect(frames.pending).toBe(0);
    for (const event of [pointer('pointerdown'), wheel({ deltaY: -100 }), doubleClick()]) {
      element.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(calls).toHaveLength(3);
    expect(controller.active).toBe(false);
    // Reconnecting restores the owner.
    controller.connect();
    element.dispatchEvent(pointer('pointerdown'));
    expect(calls.at(-1)).toBe('start:drag');
  });
});
