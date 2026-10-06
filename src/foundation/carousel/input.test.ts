import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bindCarouselGesture,
  bindCarouselKeyboard,
  carouselHideOnClickIgnored,
  carouselReleaseIntent,
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
  it('decides release direction from a flick, not from jitter', () => {
    const samples = (velocity: number) =>
      [0, 16, 32, 48].map((time) => [1000 + time, 500 + time * velocity] as const);
    // Dragged forward, then flicked back by more than the threshold.
    expect(carouselReleaseIntent(samples(-1), 1048, 1, 48, 5)).toEqual({
      velocity: -1,
      direction: -1,
      flick: true,
    });
    // A short reversal at release keeps the overall direction.
    expect(carouselReleaseIntent(samples(-0.1), 1048, 1, 5, 5).direction).toBe(1);
    expect(carouselReleaseIntent(samples(-1), 1048, 1, 6, 5).flick).toBe(false);
    // A pointer that rested before release carries no velocity.
    expect(carouselReleaseIntent(samples(1), 1120, 1, 0, 5)).toEqual({
      velocity: 0,
      direction: 1,
      flick: false,
    });
    // A long drag that ends in a fast forward flick decides like a short swipe.
    expect(carouselReleaseIntent(samples(0.5), 1048, 1, 0, 5).flick).toBe(true);
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

describe('Carousel keyboard on the shared key-binding owner', () => {
  type Node = EventTarget & Record<string, unknown>;
  const node = (localName = 'div', attributes: Record<string, string> = {}): Node => {
    const element = Object.assign(new EventTarget(), {
      nodeType: 1,
      localName,
      isContentEditable: false,
      ownerDocument: { defaultView: { navigator: { platform: 'Win32', userAgent: '' } } },
      getAttribute: (name: string) => attributes[name] ?? null,
      matches: (selector: string) =>
        selector
          .split(',')
          .some(
            (part) =>
              part === localName ||
              Object.entries(attributes).some(([name, value]) => part === `[${name}="${value}"]`),
          ),
    });
    return element as unknown as Node;
  };
  function fixture(
    keyboard: Record<string, unknown> | false = { enabled: true, pageKeys: false, homeEnd: true },
    snapshot: Record<string, unknown> = {},
  ) {
    const root = node('section', { 'aria-roledescription': 'carousel' });
    const controller = {
      configuration: { keyboard },
      snapshot: {
        orientation: 'horizontal',
        direction: 'ltr',
        canScrollPrevious: true,
        canScrollNext: true,
        ...snapshot,
      },
      previous: vi.fn(),
      next: vi.fn(),
      scrollToIndex: vi.fn(),
    };
    const scope = new CleanupScope();
    bindCarouselKeyboard(
      controller as unknown as CarouselController,
      { root, viewport: node(), track: node() } as never,
      scope,
    );
    const press = (
      key: string,
      init: Record<string, unknown> = {},
      path: EventTarget[] = [],
      ancestors: EventTarget[] = [],
    ) => {
      const event = Object.assign(new Event('keydown', { cancelable: true }), {
        key,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        repeat: false,
        isComposing: false,
        ...init,
      });
      Object.defineProperty(event, 'composedPath', { value: () => [...path, root, ...ancestors] });
      root.dispatchEvent(event);
      return event;
    };
    return { root, controller, scope, press };
  }

  it('maps logical previous/next to direction and orientation and prevents only accepted keys', () => {
    const ltr = fixture();
    expect(ltr.press('ArrowRight').defaultPrevented).toBe(true);
    expect(ltr.controller.next).toHaveBeenCalledWith({
      reason: 'keyboard',
      sourceEvent: expect.any(Event),
    });
    ltr.press('ArrowLeft');
    expect(ltr.controller.previous).toHaveBeenCalledTimes(1);
    expect(ltr.press('ArrowDown').defaultPrevented).toBe(false);
    const rtl = fixture(undefined, { direction: 'rtl' });
    rtl.press('ArrowLeft');
    expect(rtl.controller.next).toHaveBeenCalledTimes(1);
    const vertical = fixture(undefined, { orientation: 'vertical' });
    expect(vertical.press('ArrowRight').defaultPrevented).toBe(false);
    vertical.press('ArrowDown');
    expect(vertical.controller.next).toHaveBeenCalledTimes(1);
  });
  it('honors boundaries, Home/End, page keys and disabled keyboard configuration', () => {
    const edge = fixture(undefined, { canScrollNext: false });
    expect(edge.press('ArrowRight').defaultPrevented).toBe(false);
    expect(edge.press('End').defaultPrevented).toBe(false);
    edge.press('Home');
    expect(edge.controller.scrollToIndex).toHaveBeenCalledWith(0, expect.anything());
    const pages = fixture({ enabled: true, pageKeys: true, homeEnd: false });
    pages.press('PageDown');
    expect(pages.controller.next).toHaveBeenCalledTimes(1);
    expect(pages.press('Home').defaultPrevented).toBe(false);
    const noPages = fixture();
    expect(noPages.press('PageDown').defaultPrevented).toBe(false);
    for (const keyboard of [false, { enabled: false, pageKeys: false, homeEnd: true }] as const) {
      const off = fixture(keyboard);
      expect(off.press('ArrowRight').defaultPrevented).toBe(false);
      expect(off.controller.next).not.toHaveBeenCalled();
    }
  });
  it('ignores modified, composing, consumed and nested-control keys but repeats when held', () => {
    const f = fixture();
    for (const init of [
      { shiftKey: true },
      { ctrlKey: true },
      { altKey: true },
      { metaKey: true },
      { isComposing: true },
    ])
      expect(f.press('ArrowRight', init).defaultPrevented).toBe(false);
    for (const control of [node('button'), node('input'), node('div', { role: 'slider' })])
      expect(f.press('ArrowRight', {}, [control]).defaultPrevented).toBe(false);
    expect(f.controller.next).not.toHaveBeenCalled();
    expect(f.press('ArrowRight', { repeat: true }).defaultPrevented).toBe(true);
    const nested = node('section', { 'aria-roledescription': 'carousel' });
    expect(f.press('ArrowRight', {}, [node(), nested]).defaultPrevented).toBe(false);
    expect(f.controller.next).toHaveBeenCalledTimes(1);
  });
  it('leaves keys owned by nested composites inside a slide with them (sec-187)', () => {
    const f = fixture({ enabled: true, pageKeys: true, homeEnd: true });
    const slide = () => [node('div', { role: 'group' }), node()];
    const composites: [string, EventTarget[]][] = [
      ['tab in tablist', [node('button', { role: 'tab' }), node('div', { role: 'tablist' })]],
      ['option in listbox', [node('div', { role: 'option' }), node('div', { role: 'listbox' })]],
      ['active-descendant listbox', [node('ul', { role: 'listbox' })]],
      ['menu item', [node('div', { role: 'menuitem' }), node('div', { role: 'menu' })]],
      ['menu component item', [node('tp-menu-item'), node('div', { role: 'menu' })]],
      [
        'radio in radiogroup',
        [node('span', { role: 'radio' }), node('div', { role: 'radiogroup' })],
      ],
      ['radio group component item', [node('tp-radio-group-item'), node('div')]],
      ['slider thumb', [node('tp-slider-thumb'), node('tp-slider')]],
      ['toolbar', [node('span'), node('div', { role: 'toolbar' })]],
      ['grid cell', [node('td', { role: 'gridcell' }), node('table', { role: 'grid' })]],
      ['tree item', [node('li', { role: 'treeitem' }), node('ul', { role: 'tree' })]],
      ['explicit owner', [node('div', { 'data-tp-owns-keys': '' })]],
    ];
    for (const [name, path] of composites)
      for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'PageDown', 'PageUp'])
        expect(f.press(key, {}, [...path, ...slide()]).defaultPrevented, `${key} in ${name}`).toBe(
          false,
        );
    // Editable fields inside a slide own every key (sec-187: keys owned by nested editors).
    for (const editor of [
      node('input'),
      node('textarea'),
      node('div', { role: 'textbox' }),
      node('div', { role: 'combobox' }),
      node('div', { role: 'spinbutton' }),
    ])
      for (const key of ['ArrowRight', 'Home', 'End'])
        expect(f.press(key, {}, [editor, ...slide()]).defaultPrevented).toBe(false);
    expect(f.controller.next).not.toHaveBeenCalled();
    expect(f.controller.previous).not.toHaveBeenCalled();
    expect(f.controller.scrollToIndex).not.toHaveBeenCalled();
    // An explicit owner claims only the keys it lists.
    const arrows = node('div', { 'data-tp-owns-keys': 'ArrowLeft ArrowRight' });
    expect(f.press('ArrowRight', {}, [arrows, ...slide()]).defaultPrevented).toBe(false);
    expect(f.press('End', {}, [arrows, ...slide()]).defaultPrevented).toBe(true);
    expect(f.controller.scrollToIndex).toHaveBeenCalledTimes(1);
  });
  it('still navigates from plain slide content and ignores composites outside the root', () => {
    const f = fixture();
    const slide = [node('p'), node('div', { role: 'group' }), node()];
    expect(f.press('ArrowRight', {}, slide).defaultPrevented).toBe(true);
    expect(f.press('ArrowLeft', {}, slide).defaultPrevented).toBe(true);
    expect(f.press('End', {}, slide).defaultPrevented).toBe(true);
    // Non-owning nested content (link-like spans, images, plain groups) is not a composite.
    expect(
      f.press('ArrowRight', {}, [node('img'), node('figure'), ...slide]).defaultPrevented,
    ).toBe(true);
    // A composite that contains the whole carousel does not claim keys inside it.
    expect(
      f.press('ArrowRight', {}, slide, [
        node('div', { role: 'tabpanel' }),
        node('div', { role: 'listbox' }),
      ]).defaultPrevented,
    ).toBe(true);
    expect(f.controller.next).toHaveBeenCalledTimes(3);
    expect(f.controller.previous).toHaveBeenCalledTimes(1);
    expect(f.controller.scrollToIndex).toHaveBeenCalledTimes(1);
  });
  it('releases the owner with the binding scope and tolerates a rebind', () => {
    const f = fixture();
    f.scope.dispose();
    expect(f.press('ArrowRight').defaultPrevented).toBe(false);
    const g = fixture();
    bindCarouselKeyboard(
      g.controller as unknown as CarouselController,
      { root: g.root, viewport: node(), track: node() } as never,
      new CleanupScope(),
    );
    g.press('ArrowRight');
    expect(g.controller.next).toHaveBeenCalledTimes(1);
  });
});
