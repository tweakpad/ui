import { describe, expect, it } from 'vitest';
import { cubicBezier, parseEasing } from '../motion-easing.js';
import {
  coverMap,
  focalPoint,
  fragmentSource,
  revealDirection,
  shaderVariants,
  vertexSource,
} from '../../components/carousel/effects/shader/shaders.js';
import { resolveCarouselConfiguration } from './configuration.js';
import {
  EffectPresenter,
  carouselItemProgress,
  mergeCarouselOptions,
  stackEffectConstraint,
  type CarouselEffect,
  type CarouselEffectFrame,
  type CarouselEffectHost,
} from './effect.js';
import { carouselLayout } from './layout.js';

const config = resolveCarouselConfiguration({ layout: { itemsPerView: 1 } });
const layout = carouselLayout(
  [0, 1, 2, 3, 4].map((index) => ({ index, size: 100 })),
  100,
  config,
);

describe('carousel effect geometry', () => {
  it('reports signed item progress in pitches', () => {
    expect(carouselItemProgress(layout, 0, 0, false)).toBe(0);
    expect(carouselItemProgress(layout, 1, 0, false)).toBe(1);
    expect(carouselItemProgress(layout, 1, 150, false)).toBe(-0.5);
    expect(carouselItemProgress(layout, 4, 0, false)).toBe(4);
  });
  it('wraps progress across the loop seam', () => {
    expect(carouselItemProgress(layout, 4, 0, true)).toBe(-1);
    expect(carouselItemProgress(layout, 0, 400, true)).toBe(1);
    expect(carouselItemProgress(layout, 2, 0, true)).toBe(2);
  });
  it('merges option groups one level deep', () => {
    expect(
      mergeCarouselOptions(
        { layout: { gap: 8, itemsPerView: 3 }, transport: 'transform' },
        { layout: { itemsPerView: 1 } },
      ),
    ).toEqual({ layout: { gap: 8, itemsPerView: 1 }, transport: 'transform' });
  });
  it('constrains stack effects to one item and diagnoses overridden layout', () => {
    const messages: string[] = [];
    const input = stackEffectConstraint('test')(
      { items: [], itemsPerMovement: 2, options: { layout: { itemsPerView: 3, gap: 12 } } },
      (message) => messages.push(message),
    );
    expect(input.itemsPerMovement).toBe(1);
    expect(input.options?.layout).toMatchObject({ itemsPerView: 1, gap: 0, centered: false });
    expect(messages).toHaveLength(1);
    stackEffectConstraint('test')({ items: [] }, (message) => messages.push(message));
    expect(messages).toHaveLength(1);
  });
});

describe('frame easing', () => {
  it('evaluates CSS easing keywords and cubic Béziers', () => {
    expect(parseEasing('linear')(0.25)).toBe(0.25);
    expect(parseEasing('ease')(0)).toBe(0);
    expect(parseEasing('ease')(1)).toBe(1);
    expect(parseEasing('cubic-bezier(0.65, 0, 0.35, 1)')(0.5)).toBeCloseTo(0.5, 3);
    expect(cubicBezier(0.42, 0, 1, 1)(0.5)).toBeLessThan(0.5);
    expect(parseEasing('steps(4)')(0.5)).toBeCloseTo(parseEasing('ease')(0.5), 6);
  });
});

describe('shader mapping', () => {
  it('cover-fits textures and honors the focal point', () => {
    expect(coverMap(200, 100, 100, 100)).toEqual([1, 0.5, 0, 0.25]);
    expect(coverMap(100, 200, 100, 100)).toEqual([0.5, 1, 0.25, 0]);
    expect(coverMap(200, 100, 100, 100, 0.5, 0)).toEqual([1, 0.5, 0, 0]);
    expect(coverMap(0, 100, 100, 100)).toEqual([1, 1, 0, 0]);
  });
  it('parses object-position and reveal directions', () => {
    expect(focalPoint('50% 50%')).toEqual([0.5, 0.5]);
    expect(focalPoint('top left')).toEqual([0, 0]);
    expect(focalPoint('right 25%')).toEqual([1, 0.25]);
    expect(revealDirection('horizontal', 'ltr')).toEqual([-1, 0]);
    expect(revealDirection('horizontal', 'rtl')).toEqual([1, 0]);
    expect(revealDirection('vertical', 'ltr')).toEqual([0, -1]);
    // Each stage keeps its own entry point.
    expect(vertexSource).toContain('gl_Position');
    expect(vertexSource).not.toContain('uDirection');
    expect(fragmentSource).toContain('outColor =');
    // Displace (chromatic shares its branch) and crosswarp have explicit branches.
    expect(fragmentSource).toContain(`uVariant == ${shaderVariants.displace}`);
    expect(fragmentSource).toContain(`uVariant == ${shaderVariants.crosswarp}`);
    // Explicit travel overrides the axis, including corners.
    expect(revealDirection('horizontal', 'rtl', 'down')).toEqual([0, 1]);
    const [x, y] = revealDirection('horizontal', 'ltr', 'up-right');
    expect(x).toBeCloseTo(Math.SQRT1_2);
    expect(y).toBeCloseTo(-Math.SQRT1_2);
  });
});

describe('effect presenter', () => {
  function fakeElement() {
    const values = new Map<string, string>();
    const attributes = new Map<string, string>();
    return {
      style: {
        getPropertyValue: (name: string) => values.get(name) ?? '',
        getPropertyPriority: () => '',
        setProperty: (name: string, value: string) => values.set(name, value),
        removeProperty: (name: string) => values.delete(name),
      },
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name),
      attributes,
      values,
    };
  }
  function setup() {
    const frames: CarouselEffectFrame[] = [];
    const callbacks: FrameRequestCallback[] = [];
    let now = 0;
    const view = {
      performance: { now: () => now },
      requestAnimationFrame: (callback: FrameRequestCallback) => callbacks.push(callback),
      cancelAnimationFrame: () => {},
      getComputedStyle: () => ({ getPropertyValue: () => '' }),
      matchMedia: () => ({ matches: false }),
      AbortController,
      setTimeout,
      clearTimeout,
    };
    const owner = {
      ownerDocument: { defaultView: view },
      dispatchEvent: () => true,
      getAttribute: () => null,
      setAttribute: () => {},
      removeAttribute: () => {},
      getRootNode: () => owner,
      parentNode: null,
      isConnected: true,
    };
    const track = fakeElement();
    const shells = [0, 1, 2, 3, 4].map(() => fakeElement());
    const controller = {
      configuration: { orientation: 'horizontal' },
      snapshot: { direction: 'ltr' },
      projection: { layout, loop: { mode: 'off' } },
    };
    const effect: CarouselEffect = {
      name: 'probe',
      layout: 'stack',
      duration: 100,
      easing: 'linear',
      attach: () => ({ frame: (frame) => frames.push(frame), detach: () => {} }),
    };
    const host = {
      owner,
      viewport: owner,
      track,
      controller: () => controller,
      surface: () => owner,
      logicalOffset: () => 0,
      items: () => shells.map((shell, index) => ({ id: index, index, shell, content: shell })),
      dragging: () => false,
      diagnose: () => {},
    } as unknown as CarouselEffectHost;
    const presenter = new EffectPresenter(effect, host);
    const flush = (time: number) => {
      now = time;
      const pending = callbacks.splice(0);
      for (const callback of pending) callback(time);
    };
    return { presenter, frames, flush, shells, track };
  }
  it('presents immediate moves with the current/next pair', async () => {
    const { presenter, frames, shells, track } = setup();
    await presenter.move(150, { speed: 0 });
    const frame = frames.at(-1)!;
    expect(frame.phase).toBe('settle');
    expect(frame.current?.index).toBe(1);
    expect(frame.next?.index).toBe(2);
    expect(frame.amount).toBeCloseTo(0.5);
    expect(track.values.get('transform')).toBe('none');
    expect(shells[1]!.attributes.get('data-effect-role')).toBe('outgoing');
    expect(shells[2]!.attributes.get('data-effect-role')).toBe('incoming');
    expect(shells[0]!.values.get('visibility')).toBe('hidden');
    expect(shells[2]!.values.get('--tp-carousel-item-progress')).toBe('0.5');
  });
  it('animates frame by frame and freezes the logical position on interruption', async () => {
    const { presenter, frames, flush } = setup();
    const done = presenter.move(100, {});
    flush(0);
    flush(50);
    expect(presenter.position).toBeCloseTo(50);
    expect(frames.at(-1)?.phase).toBe('animate');
    expect(frames.at(-1)?.velocity).toBeGreaterThan(0);
    presenter.cancel();
    await done;
    expect(presenter.position).toBeCloseTo(50);
    const resumed = presenter.move(0, {});
    flush(100);
    flush(200);
    await resumed;
    expect(presenter.position).toBe(0);
    expect(frames.at(-1)?.phase).toBe('settle');
    expect(frames.at(-1)?.direction).toBe(-1);
    expect(frames.at(-1)?.next).toBeNull();
  });
});
