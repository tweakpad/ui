import { describe, expect, it, vi } from 'vitest';
import type { ReactiveController } from 'lit';
import {
  ImageLoadController,
  hasOwnImageSource,
  type ImageLoadControllerOptions,
  type ImageLoadStatus,
} from './image-load.js';

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  complete = false;
  naturalWidth = 0;
  referrerPolicy = '';
  crossOrigin: string | null = 'unset';
  sizes = '';
  srcset = '';
  #src = '';
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Set<() => void>>();
  decode?: () => Promise<void>;
  /** Simulates a cache hit: assigning `src` completes the request synchronously. */
  cached: 'loaded' | 'error' | undefined;
  get src(): string {
    return this.#src;
  }
  set src(value: string) {
    this.#src = value;
    if (this.cached) {
      this.complete = true;
      this.naturalWidth = this.cached === 'loaded' ? 40 : 0;
    }
  }
  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }
  addEventListener(type: string, listener: () => void, options?: { signal?: AbortSignal }): void {
    let set = this.listeners.get(type);
    if (!set) this.listeners.set(type, (set = new Set()));
    set.add(listener);
    options?.signal?.addEventListener('abort', () => set.delete(listener));
  }
  finish(result: 'loaded' | 'error'): void {
    this.complete = true;
    this.naturalWidth = result === 'loaded' ? 40 : 0;
    if (result === 'loaded') this.onload?.();
    else this.onerror?.();
    for (const listener of [...(this.listeners.get(result === 'loaded' ? 'load' : 'error') ?? [])])
      listener();
  }
}

function fixture(options: Omit<ImageLoadControllerOptions, 'onStatusChange'> = {}) {
  const created: FakeImage[] = [];
  let nextCached: 'loaded' | 'error' | undefined;
  const controllers: ReactiveController[] = [];
  const host = {
    isConnected: true,
    requestUpdate: vi.fn(),
    addController: (controller: ReactiveController) => controllers.push(controller),
    removeController: () => undefined,
    updateComplete: Promise.resolve(true),
    ownerDocument: {
      createElement: () => {
        const image = new FakeImage();
        image.cached = nextCached;
        created.push(image);
        return image;
      },
    } as unknown as Document,
  };
  const changes: [ImageLoadStatus, ImageLoadStatus][] = [];
  const controller = new ImageLoadController(host, {
    ...options,
    onStatusChange: (status, previous) => changes.push([status, previous]),
  });
  return {
    host,
    controller,
    controllers,
    created,
    changes,
    cacheNext: (result: 'loaded' | 'error' | undefined) => (nextCached = result),
    connect: () => controllers.forEach((c) => c.hostConnected?.()),
    disconnect: () => {
      host.isConnected = false;
      controllers.forEach((c) => c.hostDisconnected?.());
    },
  };
}
const image = (value: FakeImage) => value as unknown as HTMLImageElement;

describe('ImageLoadController (media player R-10, Avatar regression V-78)', () => {
  it('registers with its host and starts idle', () => {
    const { controller, controllers } = fixture();
    expect(controllers).toEqual([controller]);
    expect(controller.status).toBe('idle');
    expect(controller.generation).toBe(0);
  });

  it('preloads a source with its request attributes and reports loading then loaded', () => {
    const { controller, created, changes, host } = fixture();
    const generation = controller.load({
      src: 'a.png',
      srcset: 'a.png 1x, a@2x.png 2x',
      sizes: '40px',
      crossOrigin: 'anonymous',
      referrerPolicy: 'no-referrer',
    });
    expect(generation).toBe(1);
    expect(controller.status).toBe('loading');
    const [preloader] = created;
    expect(preloader).toMatchObject({
      src: 'a.png',
      srcset: 'a.png 1x, a@2x.png 2x',
      sizes: '40px',
      crossOrigin: 'anonymous',
      referrerPolicy: 'no-referrer',
    });
    preloader!.finish('loaded');
    expect(controller.status).toBe('loaded');
    expect(changes).toEqual([
      ['loading', 'idle'],
      ['loaded', 'loading'],
    ]);
    expect(host.requestUpdate).toHaveBeenCalledTimes(2);
  });

  it('defaults crossOrigin to null and reports errors', () => {
    const { controller, created } = fixture();
    controller.load({ src: 'missing.png', crossOrigin: '' });
    expect(created[0]!.crossOrigin).toBeNull();
    created[0]!.finish('error');
    expect(controller.status).toBe('error');
  });

  it('treats a source without src or srcset as idle without a request', () => {
    const { controller, created, changes } = fixture();
    controller.load({ src: 'a.png' });
    controller.load({ sizes: '40px' });
    controller.load(null);
    expect(controller.status).toBe('idle');
    expect(created).toHaveLength(1);
    expect(changes).toEqual([
      ['loading', 'idle'],
      ['idle', 'loading'],
    ]);
    expect(controller.load({ srcset: 'b.png 1x' })).toBe(4);
    expect(controller.status).toBe('loading');
  });

  it('settles already-complete (cached) images synchronously', () => {
    const { controller, cacheNext, changes } = fixture();
    cacheNext('loaded');
    controller.load({ src: 'cached.png' });
    expect(controller.status).toBe('loaded');
    cacheNext('error');
    controller.load({ src: 'broken.png' });
    expect(controller.status).toBe('error');
    expect(changes.map(([status]) => status)).toEqual(['loading', 'loaded', 'loading', 'error']);
  });

  it('ignores results from replaced sources and detaches the old preloader', () => {
    const { controller, created } = fixture();
    controller.load({ src: 'first.png' });
    const first = created[0]!;
    const firstLoad = first.onload;
    controller.load({ src: 'second.png' });
    expect(first.onload).toBeNull();
    firstLoad?.();
    expect(controller.status).toBe('loading');
    controller.settle('loaded', 1);
    expect(controller.status).toBe('loading');
    created[1]!.finish('loaded');
    expect(controller.status).toBe('loaded');
  });

  it('does not re-report an unchanged status', () => {
    const { controller, created, changes } = fixture();
    controller.load({ src: 'a.png' });
    created[0]!.finish('loaded');
    controller.settle('loaded');
    expect(changes).toHaveLength(2);
  });

  it('waits for a rendered image when preloading is disabled', () => {
    const { controller, created } = fixture();
    const generation = controller.load({ src: 'a.png' }, { preload: false });
    expect(created).toHaveLength(0);
    expect(controller.status).toBe('loading');
    const rendered = new FakeImage();
    controller.inspect(image(rendered));
    expect(controller.status).toBe('loading');
    rendered.complete = true;
    controller.inspect(image(rendered));
    expect(controller.status).toBe('loading'); // no own source: complete is meaningless
    rendered.attributes.set('src', 'a.png');
    rendered.naturalWidth = 20;
    controller.inspect(image(rendered));
    expect(controller.status).toBe('loaded');
    controller.settle('error', generation);
    expect(controller.status).toBe('error');
  });

  it('observes an authored image, reading its completed state and later events', () => {
    const { controller } = fixture();
    controller.load({ src: 'poster.jpg' }, { preload: false });
    const authored = new FakeImage();
    authored.attributes.set('src', 'poster.jpg');
    controller.observe(image(authored));
    expect(controller.image).toBe(image(authored));
    expect(controller.status).toBe('loading');
    authored.finish('error');
    expect(controller.status).toBe('error');

    controller.load({ src: 'poster-2.jpg' }, { preload: false });
    expect(controller.image).toBeNull();
    expect(authored.listeners.get('load')?.size).toBe(0);
    const complete = new FakeImage();
    complete.attributes.set('srcset', 'poster-2.jpg 1x');
    complete.complete = true;
    complete.naturalWidth = 100;
    controller.observe(image(complete));
    expect(controller.status).toBe('loaded');
    controller.observe(null);
    expect(complete.listeners.get('error')?.size).toBe(0);
  });

  it('ignores results after host disconnection and invalidates the generation', () => {
    const { controller, created, disconnect, changes } = fixture();
    controller.load({ src: 'a.png' });
    const preloader = created[0]!;
    const onload = preloader.onload;
    disconnect();
    expect(controller.generation).toBe(2);
    expect(preloader.onload).toBeNull();
    onload?.();
    controller.settle('loaded');
    expect(controller.status).toBe('loading');
    expect(changes).toEqual([['loading', 'idle']]);
  });

  it('uses lifecycle connection state for hosts without isConnected', () => {
    const { controller, host, connect, created } = fixture();
    delete (host as { isConnected?: boolean }).isConnected;
    controller.load({ src: 'a.png' });
    expect(controller.status).toBe('idle');
    connect();
    controller.load({ src: 'a.png' });
    created[1]!.finish('loaded');
    expect(controller.status).toBe('loaded');
  });

  it('awaits decode before reporting loaded when requested', async () => {
    const { controller, created } = fixture({ decode: true });
    let resolve!: () => void;
    controller.load({ src: 'a.png' });
    created[0]!.decode = () => new Promise<void>((done) => (resolve = done));
    created[0]!.finish('loaded');
    expect(controller.status).toBe('loading');
    resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.status).toBe('loaded');
  });

  it('maps decode rejection by intrinsic size and drops stale decodes', async () => {
    const { controller, created } = fixture({ decode: true });
    controller.load({ src: 'a.png' });
    created[0]!.decode = () => Promise.reject(new Error('EncodingError'));
    created[0]!.finish('loaded');
    await new Promise((done) => setTimeout(done));
    expect(controller.status).toBe('loaded');

    controller.load({ src: 'b.png' });
    const rendered = new FakeImage();
    rendered.decode = () => Promise.reject(new Error('EncodingError'));
    controller.settle('loaded', controller.generation, image(rendered));
    await new Promise((done) => setTimeout(done));
    expect(controller.status).toBe('error');

    let resolve!: () => void;
    const stale = controller.load({ src: 'c.png' });
    created[2]!.decode = () => new Promise<void>((done) => (resolve = done));
    created[2]!.finish('loaded');
    controller.load({ src: 'd.png' });
    resolve();
    await new Promise((done) => setTimeout(done));
    expect(stale).toBe(controller.generation - 1);
    expect(controller.status).toBe('loading');
  });

  it('identifies images whose own attributes request a source', () => {
    const value = new FakeImage();
    expect(hasOwnImageSource(image(value))).toBe(false);
    value.attributes.set('src', '');
    expect(hasOwnImageSource(image(value))).toBe(false);
    value.attributes.set('srcset', '');
    expect(hasOwnImageSource(image(value))).toBe(true);
    value.attributes.delete('srcset');
    value.attributes.set('src', 'a.png');
    expect(hasOwnImageSource(image(value))).toBe(true);
  });
});
