import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusManaged } from './focus.js';
import { HoverSurfaceController } from './hover-surface.js';
import { DelayGroup } from './delay-group.js';
import { preventComponentHandling } from './part.js';

afterEach(() => vi.useRealTimers());
function fixture({ focus = true, press = false, hover = true } = {}) {
  vi.useFakeTimers();
  const element = new EventTarget() as HTMLElement;
  const document = {
    activeElement: null,
    defaultView: {
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
      performance: { now: () => Date.now() },
    },
  } as unknown as Document;
  let open = false;
  const requests: Array<[boolean, string]> = [];
  const group = new DelayGroup();
  const controller = new HoverSurfaceController({
    document: () => document,
    open: () => open,
    trigger: () => element,
    popup: () => null,
    inside: (node) => node === element,
    disabled: () => false,
    enabled: () => hover,
    focusOpens: () => focus,
    pressToggles: () => press,
    closeOnClick: () => !press,
    hoverable: () => true,
    openDelay: () => 100,
    closeDelay: () => 20,
    group: () => group,
    request: (next, reason) => {
      open = next;
      requests.push([next, reason]);
      controller.accepted(next, reason);
    },
    moved: () => {},
  });
  const bind = (config = {}) => controller.bind(element, config);
  const event = (type: string, fields: Record<string, unknown> = {}) => {
    const event = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries(fields)) Object.defineProperty(event, key, { value });
    element.dispatchEvent(event);
    return event;
  };
  return { bind, controller, event, requests, element, isOpen: () => open };
}
describe('shared hover surface policy', () => {
  it('uses native-equivalent Enter and Space for an explicit nonnative press host', async () => {
    const f = fixture({ focus: false, press: true, hover: false });
    f.bind({ nativeAction: false });
    const enter = f.event('keydown', { key: 'Enter', repeat: false });
    enter.preventDefault();
    await Promise.resolve();
    await Promise.resolve();
    expect(f.isOpen()).toBe(true);
    f.event('keydown', { key: 'Enter', repeat: true });
    await Promise.resolve();
    await Promise.resolve();
    expect(f.requests).toHaveLength(1);
    f.event('keydown', { key: ' ' });
    await Promise.resolve();
    expect(f.isOpen()).toBe(true);
    f.event('keyup', { key: ' ' });
    await Promise.resolve();
    await Promise.resolve();
    expect(f.isOpen()).toBe(false);
  });
  it('disarms explicitly canceled key release, blur and disconnected gestures', async () => {
    const f = fixture({ focus: false, press: true, hover: false });
    const release = f.bind({ nativeAction: false });
    f.event('keydown', { key: ' ' });
    await Promise.resolve();
    const up = f.event('keyup', { key: ' ' });
    preventComponentHandling(up);
    await Promise.resolve();
    await Promise.resolve();
    f.event('keyup', { key: ' ' });
    await Promise.resolve();
    await Promise.resolve();
    expect(f.requests).toEqual([]);
    f.event('keydown', { key: ' ' });
    f.event('focusout');
    await Promise.resolve();
    f.event('keyup', { key: ' ' });
    await Promise.resolve();
    await Promise.resolve();
    expect(f.requests).toEqual([]);
    f.event('keydown', { key: 'Enter' });
    release();
    await Promise.resolve();
    await Promise.resolve();
    expect(f.requests).toEqual([]);
  });
  it.each(['button', 'a', 'input', 'custom-button'])(
    'leaves nested %s press to its actual action owner',
    async (kind) => {
      const f = fixture({ focus: false, press: true, hover: false });
      f.bind({ nativeAction: false });
      const child = {
        nodeType: 1,
        matches: (selector: string) =>
          kind === 'custom-button'
            ? selector.includes('[role="button"]')
            : selector.startsWith('button,'),
      };
      f.event('keydown', { key: 'Enter', composedPath: () => [child, f.element] });
      await Promise.resolve();
      await Promise.resolve();
      expect(f.requests).toEqual([]);
      f.event('click');
      await Promise.resolve();
      expect(f.requests).toEqual([[true, 'trigger-press']]);
    },
  );
  const visible = (focusVisible = true) => ({
    composedPath: () => [
      { matches: (selector: string) => selector === ':focus-visible' && focusVisible },
    ],
  });
  it('keeps Tooltip focus opening while press-only Popover does not open on focus', () => {
    const tooltip = fixture();
    tooltip.bind();
    tooltip.event('focusin', visible());
    expect(tooltip.requests).toEqual([[true, 'trigger-focus']]);
    const popover = fixture({ focus: false, press: true, hover: false });
    popover.bind();
    popover.event('focusin', visible());
    popover.event('pointerenter', { pointerType: 'mouse' });
    vi.advanceTimersByTime(500);
    expect(popover.requests).toEqual([]);
  });
  it('opens on visible focus only, and not for focus a surface moves on its own behalf', () => {
    const f = fixture();
    f.bind();
    f.event('focusin', visible(false));
    expect(f.requests).toEqual([]);
    const document = {} as Document;
    Object.defineProperty(f.element, 'ownerDocument', { value: document });
    const target = {
      ownerDocument: document,
      focus: () => f.event('focusin', visible()),
    } as unknown as HTMLElement;
    focusManaged(target);
    expect(f.requests).toEqual([]);
    f.event('focusin', visible());
    expect(f.requests).toEqual([[true, 'trigger-focus']]);
  });
  it('cancels delayed opening on exit or disconnect and excludes touch', () => {
    const f = fixture();
    const disconnect = f.bind();
    f.event('pointerenter', { pointerType: 'mouse' });
    vi.advanceTimersByTime(50);
    f.event('pointerleave', { pointerType: 'mouse' });
    vi.advanceTimersByTime(100);
    expect(f.requests.every(([open]) => !open)).toBe(true);
    f.event('pointerenter', { pointerType: 'mouse' });
    disconnect();
    vi.advanceTimersByTime(100);
    f.bind();
    f.event('pointerenter', { pointerType: 'touch' });
    vi.advanceTimersByTime(100);
    expect(f.isOpen()).toBe(false);
  });
  it('pins a recent hover opening after press and closes on the next explicit press', async () => {
    const f = fixture({ focus: false, press: true });
    f.bind();
    f.event('pointerenter', { pointerType: 'mouse' });
    vi.advanceTimersByTime(100);
    expect(f.isOpen()).toBe(true);
    f.event('click');
    await Promise.resolve();
    f.event('pointerleave', { pointerType: 'mouse' });
    vi.advanceTimersByTime(1000);
    expect(f.isOpen()).toBe(true);
    f.event('click');
    await Promise.resolve();
    expect(f.isOpen()).toBe(false);
    expect(f.requests).toEqual([
      [true, 'trigger-hover'],
      [true, 'trigger-press'],
      [false, 'trigger-press'],
    ]);
  });
  it('respects explicit component cancellation and keeps native default a separate synthetic-host channel', async () => {
    const f = fixture({ focus: false, press: true, hover: false });
    f.bind({ nativeAction: false });
    const event = f.event('click');
    event.preventDefault();
    await Promise.resolve();
    expect(f.isOpen()).toBe(true);
    const cancelled = f.event('click');
    preventComponentHandling(cancelled);
    await Promise.resolve();
    expect(f.isOpen()).toBe(true);
  });
});
