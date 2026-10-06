import { afterEach, describe, expect, it, vi } from 'vitest';
import { INTERACTIVE_TARGET_SELECTOR, interactiveTargetInPath } from './interactive-target.js';
import {
  DOUBLE_TAP_WINDOW,
  TAP_GESTURE_THRESHOLD,
  TapGestureRecognizer,
  resolveTapRegion,
  type TapGestureActivation,
} from './tap-gestures.js';

afterEach(() => vi.useRealTimers());

interface FakeNode {
  nodeType: 1;
  matches: (selector: string) => boolean;
}
const node = (interactive = false): FakeNode => ({
  nodeType: 1,
  matches: (selector) => interactive && selector === INTERACTIVE_TARGET_SELECTOR,
});

function fixture(options: { locked?: () => boolean } = {}) {
  vi.useFakeTimers();
  const view = {
    setTimeout: (callback: () => void, delay: number) => globalThis.setTimeout(callback, delay),
    clearTimeout: (id: number) => globalThis.clearTimeout(id),
    performance: { now: () => Date.now() },
  };
  const surface = new EventTarget() as EventTarget & Record<string, unknown>;
  Object.assign(surface, {
    nodeType: 1,
    matches: () => false,
    ownerDocument: { defaultView: view },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 100 }),
  });
  const element = surface as unknown as HTMLElement;
  const recognizer = new TapGestureRecognizer(element, options);
  const fired: TapGestureActivation[] = [];
  const log =
    (label: string) =>
    (activation: TapGestureActivation): void => {
      fired.push({ ...activation, action: label });
    };
  const dispatch = (
    type: string,
    {
      x = 150,
      button = 0,
      pointerId = 1,
      pointerType = 'mouse',
      isPrimary = true,
      path = [node()],
    }: Partial<{
      x: number;
      button: number;
      pointerId: number;
      pointerType: string;
      isPrimary: boolean;
      path: FakeNode[];
    }> = {},
  ) => {
    const event = new Event(type);
    Object.defineProperties(event, {
      button: { value: button },
      pointerId: { value: pointerId },
      pointerType: { value: pointerType },
      isPrimary: { value: isPrimary },
      clientX: { value: x },
      composedPath: { value: () => [...path, surface] },
    });
    surface.dispatchEvent(event);
    return event as PointerEvent;
  };
  const tap = (init: Parameters<typeof dispatch>[1] = {}, hold = 50) => {
    dispatch('pointerdown', init);
    vi.advanceTimersByTime(hold);
    return dispatch('pointerup', init);
  };
  return { recognizer, fired, log, dispatch, tap, element };
}

describe('tap region resolution', () => {
  const rect = { left: 100, width: 300 };
  it('splits left and right into halves', () => {
    const active = new Set(['left', 'right'] as const);
    expect(resolveTapRegion(249, rect, active)).toBe('left');
    expect(resolveTapRegion(250, rect, active)).toBe('right');
  });
  it('splits three regions into thirds', () => {
    const active = new Set(['left', 'center', 'right'] as const);
    expect(resolveTapRegion(150, rect, active)).toBe('left');
    expect(resolveTapRegion(250, rect, active)).toBe('center');
    expect(resolveTapRegion(350, rect, active)).toBe('right');
  });
  it('lets center alone cover the whole surface', () => {
    const active = new Set(['center'] as const);
    expect(resolveTapRegion(101, rect, active)).toBe('center');
    expect(resolveTapRegion(399, rect, active)).toBe('center');
  });
  it('leaves positions outside partial zones to whole-surface bindings', () => {
    expect(resolveTapRegion(350, rect, new Set(['left'] as const))).toBeNull();
    expect(resolveTapRegion(380, rect, new Set(['left', 'center'] as const))).toBeNull();
    expect(resolveTapRegion(200, rect, new Set(['left'] as const))).toBe('left');
    expect(resolveTapRegion(200, { left: 0, width: 0 }, new Set(['left'] as const))).toBeNull();
  });
});

describe('interactive target detection', () => {
  it('excludes native, editable, role, component and data-interactive targets', () => {
    for (const entry of [
      'button',
      'a[href]',
      'textarea',
      '[contenteditable]:not([contenteditable="false"])',
      '[role="slider"]',
      '[role="menuitem"]',
      'tp-button',
      'tp-slider',
      '[data-interactive]',
    ])
      expect(INTERACTIVE_TARGET_SELECTOR.split(',')).toContain(entry);
  });
  it('walks the composed path only up to the boundary', () => {
    const boundary = node() as unknown as Element;
    const outside = node(true);
    const event = { composedPath: () => [node(), boundary, outside] } as unknown as Event;
    expect(interactiveTargetInPath(event, boundary)).toBe(false);
    const inside = { composedPath: () => [node(), node(true), boundary] } as unknown as Event;
    expect(interactiveTargetInPath(inside, boundary)).toBe(true);
  });
});

describe('TapGestureRecognizer', () => {
  it('fires a quick primary tap immediately without double-tap bindings', () => {
    const f = fixture();
    f.recognizer.add({ type: 'tap', handler: f.log('tap') });
    const event = f.tap();
    expect(f.fired).toHaveLength(1);
    expect(f.fired[0]).toMatchObject({
      event,
      type: 'tap',
      region: null,
      pointerType: 'mouse',
      reason: 'gesture',
    });
  });

  it('rejects long presses, secondary buttons and non-primary pointers', () => {
    const f = fixture();
    f.recognizer.add({ type: 'tap', handler: f.log('tap') });
    f.tap({}, TAP_GESTURE_THRESHOLD + 1);
    f.tap({ button: 2 });
    f.tap({ isPrimary: false });
    expect(f.fired).toHaveLength(0);
    f.tap({}, TAP_GESTURE_THRESHOLD);
    expect(f.fired).toHaveLength(1);
  });

  it('ignores presses that start or end on interactive targets', () => {
    const f = fixture();
    f.recognizer.add({ type: 'tap', handler: f.log('tap') });
    f.dispatch('pointerdown', { path: [node(true)] });
    f.dispatch('pointerup');
    f.dispatch('pointerdown');
    f.dispatch('pointerup', { path: [node(), node(true)] });
    expect(f.fired).toHaveLength(0);
  });

  it('cancels on a concurrent pointer and on pointercancel', () => {
    const f = fixture();
    f.recognizer.add({ type: 'tap', handler: f.log('tap') });
    f.dispatch('pointerdown', { pointerId: 1, pointerType: 'touch' });
    f.dispatch('pointerdown', { pointerId: 2, pointerType: 'touch' });
    f.dispatch('pointerup', { pointerId: 1, pointerType: 'touch' });
    f.dispatch('pointerdown');
    f.dispatch('pointercancel');
    f.dispatch('pointerup');
    expect(f.fired).toHaveLength(0);
  });

  it('filters by pointer type', () => {
    const f = fixture();
    f.recognizer.add({ type: 'tap', pointer: 'mouse', handler: f.log('mouse') });
    f.recognizer.add({ type: 'tap', pointer: 'touch', handler: f.log('touch') });
    f.tap({ pointerType: 'touch' });
    f.tap({ pointerType: 'mouse' });
    f.tap({ pointerType: 'pen' });
    expect(f.fired.map((a) => a.action)).toEqual(['touch', 'mouse']);
  });

  it('waits for the double-tap window and recognizes double taps by region', () => {
    const f = fixture();
    f.recognizer.add({ type: 'tap', handler: f.log('single') });
    f.recognizer.add({ type: 'doubletap', region: 'left', handler: f.log('back') });
    f.recognizer.add({ type: 'doubletap', region: 'center', handler: f.log('full') });
    f.recognizer.add({ type: 'doubletap', region: 'right', handler: f.log('forward') });

    f.tap({ x: 20 });
    expect(f.fired).toHaveLength(0);
    vi.advanceTimersByTime(DOUBLE_TAP_WINDOW);
    expect(f.fired.map((a) => a.action)).toEqual(['single']);

    f.tap({ x: 20 }, 10);
    f.tap({ x: 20 }, 10);
    f.tap({ x: 150 }, 10);
    f.tap({ x: 150 }, 10);
    f.tap({ x: 290 }, 10);
    f.tap({ x: 290 }, 10);
    vi.advanceTimersByTime(DOUBLE_TAP_WINDOW);
    expect(f.fired.map((a) => [a.action, a.type, a.region])).toEqual([
      ['single', 'tap', null],
      ['back', 'doubletap', 'left'],
      ['full', 'doubletap', 'center'],
      ['forward', 'doubletap', 'right'],
    ]);
  });

  it('treats a second tap after the window as two single taps', () => {
    const f = fixture();
    f.recognizer.add({ type: 'tap', handler: f.log('single') });
    f.recognizer.add({ type: 'doubletap', handler: f.log('double') });
    f.tap({}, 10);
    vi.advanceTimersByTime(DOUBLE_TAP_WINDOW + 10);
    f.tap({}, 10);
    vi.advanceTimersByTime(DOUBLE_TAP_WINDOW);
    expect(f.fired.map((a) => a.action)).toEqual(['single', 'single']);
  });

  it('prefers a region match over a whole-surface match', () => {
    const f = fixture();
    f.recognizer.add({ type: 'doubletap', handler: f.log('surface') });
    f.recognizer.add({ type: 'doubletap', region: 'left', handler: f.log('left') });
    f.tap({ x: 10 }, 10);
    f.tap({ x: 10 }, 10);
    f.tap({ x: 250 }, 10);
    f.tap({ x: 250 }, 10);
    expect(f.fired.map((a) => [a.action, a.region])).toEqual([
      ['left', 'left'],
      ['surface', null],
    ]);
  });

  it('resolves bindings when the deferred tap fires', () => {
    const f = fixture();
    const remove = f.recognizer.add({ type: 'tap', handler: f.log('removed') });
    f.recognizer.add({ type: 'doubletap', region: 'center', handler: f.log('double') });
    f.tap();
    remove();
    f.recognizer.add({ type: 'tap', handler: f.log('added') });
    vi.advanceTimersByTime(DOUBLE_TAP_WINDOW);
    expect(f.fired.map((a) => a.action)).toEqual(['added']);
  });

  it('does not wait when double-tap bindings are disabled or for another pointer', () => {
    const f = fixture();
    let disabled = true;
    f.recognizer.add({ type: 'tap', handler: f.log('single') });
    f.recognizer.add({ type: 'doubletap', disabled: () => disabled, handler: f.log('double') });
    f.recognizer.add({ type: 'doubletap', pointer: 'touch', disabled: true, handler: f.log('x') });
    f.tap();
    expect(f.fired.map((a) => a.action)).toEqual(['single']);
    disabled = false;
    f.tap({}, 10);
    f.tap({}, 10);
    expect(f.fired.map((a) => a.action)).toEqual(['single', 'double']);
  });

  it('suppresses recognition while locked, including deferred taps', () => {
    let locked = false;
    const f = fixture({ locked: () => locked });
    f.recognizer.add({ type: 'tap', handler: f.log('single') });
    f.recognizer.add({ type: 'doubletap', handler: f.log('double') });
    f.tap();
    locked = true;
    vi.advanceTimersByTime(DOUBLE_TAP_WINDOW);
    f.tap();
    vi.advanceTimersByTime(DOUBLE_TAP_WINDOW);
    expect(f.fired).toHaveLength(0);
  });

  it('answers claimsTap for the activity owner', () => {
    let locked = false;
    const f = fixture({ locked: () => locked });
    const event = f.dispatch('pointerup', { pointerType: 'touch' });
    expect(f.recognizer.claimsTap(event)).toBe(false);
    f.recognizer.add({
      type: 'tap',
      pointer: 'touch',
      action: 'toggle-controls',
      disabled: true,
      handler: f.log('controls'),
    });
    expect(f.recognizer.claimsTap(event)).toBe(true);
    expect(f.recognizer.claimsTap(event, 'toggle-controls')).toBe(true);
    expect(f.recognizer.claimsTap(event, 'toggle-paused')).toBe(false);
    const mouse = f.dispatch('pointerup', { pointerType: 'mouse' });
    expect(f.recognizer.claimsTap(mouse)).toBe(false);
    const interactive = f.dispatch('pointerup', { pointerType: 'touch', path: [node(true)] });
    expect(f.recognizer.claimsTap(interactive)).toBe(false);
    locked = true;
    expect(f.recognizer.claimsTap(interactive)).toBe(true);
  });

  it('detaches listeners and pending timers when the last binding is removed or on dispose', () => {
    const f = fixture();
    const removeTap = f.recognizer.add({ type: 'tap', handler: f.log('single') });
    const removeDouble = f.recognizer.add({ type: 'doubletap', handler: f.log('double') });
    f.tap();
    removeTap();
    removeDouble();
    removeDouble();
    vi.advanceTimersByTime(DOUBLE_TAP_WINDOW);
    expect(f.fired).toHaveLength(0);
    f.recognizer.add({ type: 'tap', handler: f.log('again') });
    f.tap();
    expect(f.fired.map((a) => a.action)).toEqual(['again']);
    f.recognizer.dispose();
    f.tap();
    expect(f.recognizer.bindings).toHaveLength(0);
    expect(f.recognizer.add({ type: 'tap', handler: f.log('late') })).toBeTypeOf('function');
    f.tap();
    expect(f.fired).toHaveLength(1);
  });

  it('reports handler failures without breaking recognition', () => {
    const onError = vi.fn();
    vi.useFakeTimers();
    const f = fixture();
    const recognizer = new TapGestureRecognizer(f.element, { onError });
    recognizer.add({
      type: 'tap',
      handler: () => {
        throw new Error('boom');
      },
    });
    f.tap();
    expect(onError).toHaveBeenCalledOnce();
    recognizer.dispose();
  });
});
