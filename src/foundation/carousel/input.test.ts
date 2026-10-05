import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bindCarouselGesture,
  carouselHideOnClickIgnored,
  carouselReleaseSnap,
  normalizeCarouselWheel,
} from './input.js';
import { resolveCarouselConfiguration } from './configuration.js';
import { CleanupScope } from '../services.js';
import type { CarouselController } from './controller.js';

describe('Carousel source input arithmetic', () => {
  it('normalizes release across either loop boundary and more than one cycle', () => {
    const interaction = resolveCarouselConfiguration().interaction;
    expect(carouselReleaseSnap([0, 100, 200], 240, 1, 100, interaction, 2, true, 300)).toBe(0);
    expect(carouselReleaseSnap([0, 100, 200], -40, -1, 100, interaction, 0, true, 300)).toBe(2);
    expect(carouselReleaseSnap([0, 100, 200], 940, 1, 100, interaction, 0, true, 300)).toBe(1);
  });
  it('normalizes legacy pixels, lines, pages and Shift in the source order', () => {
    expect(normalizeCarouselWheel({ wheelDelta: -120 })).toEqual({ x: 0, y: 10 });
    expect(normalizeCarouselWheel({ deltaY: 2, deltaMode: 1, shiftKey: true })).toEqual({
      x: 80,
      y: 0,
    });
    expect(normalizeCarouselWheel({ deltaX: 0.5, deltaY: 0, deltaMode: 2 })).toEqual({
      x: 400,
      y: 0,
    });
    expect(normalizeCarouselWheel({ deltaX: 3, deltaY: 9, shiftKey: true })).toEqual({
      x: 3,
      y: 9,
    });
  });
  it('preserves asymmetric long-release equality and short-release direction', () => {
    const interaction = resolveCarouselConfiguration().interaction;
    expect(carouselReleaseSnap([0, 100, 200], 50, 1, 301, interaction, 0)).toBe(1);
    expect(carouselReleaseSnap([0, 100, 200], 50, -1, 301, interaction, 1)).toBe(0);
    expect(carouselReleaseSnap([0, 100, 200], 1, 1, 300, interaction, 0)).toBe(1);
    expect(carouselReleaseSnap([0, 100, 200], 99, -1, 300, interaction, 1)).toBe(0);
  });
  it('restores accepted selection when the relevant release category is disabled', () => {
    const interaction = resolveCarouselConfiguration({
      interaction: { shortSwipes: false, longSwipes: false },
    }).interaction;
    expect(carouselReleaseSnap([0, 100, 200], 175, 1, 150, interaction, 0)).toBe(0);
    expect(carouselReleaseSnap([0, 100, 200], 175, 1, 500, interaction, 0)).toBe(0);
  });
});

/** Minimal element double: `key` is the one selector token the node matches. */
function node(key = 'div', extra: Record<string, unknown> = {}) {
  return {
    nodeType: 1,
    key,
    matches(selector: string) {
      return selector.split(',').some((part) => part.trim() === key);
    },
    ...extra,
  };
}
function click(path: unknown[], defaultPrevented = false): Event {
  const event = new Event('click', { cancelable: true });
  if (defaultPrevented) event.preventDefault();
  Object.defineProperty(event, 'composedPath', { value: () => path });
  return event;
}

describe('Carousel hide-on-click exclusions', () => {
  const root = node('section') as unknown as HTMLElement;
  const item = node();
  it('toggles only for noninteractive slide content', () => {
    expect(carouselHideOnClickIgnored(click([node('img'), item, root]), root)).toBe(false);
  });
  it('ignores descendant controls, interactive slide content and owned regions', () => {
    const controls = node('controls') as unknown as Element,
      scrollbar = node('scrollbar') as unknown as Element;
    for (const target of ['tp-button', 'button', 'a[href]', 'input', '[role="button"]', 'label'])
      expect(carouselHideOnClickIgnored(click([node(target), item, root]), root)).toBe(true);
    expect(
      carouselHideOnClickIgnored(click([node(), controls, root]), root, [controls, scrollbar]),
    ).toBe(true);
    expect(
      carouselHideOnClickIgnored(click([node(), scrollbar, root]), root, [controls, scrollbar]),
    ).toBe(true);
    expect(carouselHideOnClickIgnored(click([node(), item, root], true), root)).toBe(true);
  });
  it('does not inspect ancestors outside the Carousel root', () => {
    expect(carouselHideOnClickIgnored(click([node(), root, node('button')]), root)).toBe(false);
  });
});

describe('Carousel gesture pointer capture', () => {
  const scopes: CleanupScope[] = [];
  afterEach(() => {
    for (const scope of scopes.splice(0)) scope.dispose();
  });
  function setup(captureFails: boolean) {
    const view = Object.assign(new EventTarget(), {
      PointerEvent: class {},
      innerWidth: 1000,
      setTimeout: (callback: () => void, delay: number) => globalThis.setTimeout(callback, delay),
      clearTimeout: (id: number) => globalThis.clearTimeout(id),
      requestAnimationFrame: (callback: FrameRequestCallback) =>
        globalThis.setTimeout(() => callback(0), 0),
      cancelAnimationFrame: (id: number) => globalThis.clearTimeout(id),
    });
    const document = Object.assign(new EventTarget(), { defaultView: view });
    const element = (key: string) =>
      node(key, {
        ownerDocument: document,
        setPointerCapture: vi.fn(() => {
          if (captureFails) throw new Error('InvalidPointerId');
        }),
        hasPointerCapture: () => false,
        releasePointerCapture: vi.fn(),
      }) as unknown as HTMLElement;
    const elements = {
      root: element('root'),
      viewport: element('viewport'),
      track: element('track'),
    };
    const controller = {
      configuration: resolveCarouselConfiguration(),
      snapshot: {
        canScrollNext: true,
        canScrollPrevious: false,
        orientation: 'horizontal',
        direction: 'ltr',
        loopMode: 'finite',
        animating: false,
        snapIndex: 0,
      },
      projection: {
        position: 0,
        generation: 1,
        layout: {
          snaps: [
            { position: 0, index: 0 },
            { position: 100, index: 1 },
          ],
          sizes: [100, 100],
          gap: 0,
        },
      },
      disposed: false,
      interruptPreview: vi.fn(() => 0),
      restorePreview: vi.fn(async () => {}),
      preview: vi.fn(async () => {}),
      scrollToIndex: vi.fn(async () => ({ status: 'accepted' })),
      autoplay: { setReason: vi.fn() },
    };
    const changed = vi.fn();
    const scope = new CleanupScope();
    scopes.push(scope);
    bindCarouselGesture(controller as unknown as CarouselController, elements, scope, changed);
    const pointer = (type: string, clientX: number) => {
      const event = Object.assign(new Event(type, { cancelable: true }), {
        pointerType: 'touch',
        pointerId: 7,
        isPrimary: true,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        clientX,
        clientY: 100,
      });
      Object.defineProperty(event, 'composedPath', {
        value: () => [elements.track, elements.viewport, elements.root],
      });
      document.dispatchEvent(event);
    };
    return { controller, changed, elements, pointer };
  }
  it('cancels the claimed gesture safely when capture throws', async () => {
    const f = setup(true);
    f.pointer('pointerdown', 500);
    f.pointer('pointermove', 400);
    expect(f.elements.track.setPointerCapture).toHaveBeenCalledWith(7);
    expect(f.controller.restorePreview).toHaveBeenCalledTimes(1);
    expect(f.changed).not.toHaveBeenCalledWith(true);
    expect(f.controller.autoplay.setReason).not.toHaveBeenCalledWith('gesture', true);
    f.pointer('pointermove', 300);
    f.pointer('pointerup', 300);
    await new Promise((resolve) => globalThis.setTimeout(resolve, 5));
    expect(f.controller.preview).not.toHaveBeenCalled();
    expect(f.controller.scrollToIndex).not.toHaveBeenCalled();
    expect(f.controller.restorePreview).toHaveBeenCalledTimes(1);
  });
  it('continues the gesture when capture succeeds', async () => {
    const f = setup(false);
    f.pointer('pointerdown', 500);
    f.pointer('pointermove', 400);
    expect(f.changed).toHaveBeenCalledWith(true);
    expect(f.controller.autoplay.setReason).toHaveBeenCalledWith('gesture', true);
    f.pointer('pointerup', 380);
    await new Promise((resolve) => globalThis.setTimeout(resolve, 5));
    expect(f.controller.scrollToIndex).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ reason: 'swipe' }),
    );
  });
});
