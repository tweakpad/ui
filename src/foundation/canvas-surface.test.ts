import { describe, expect, it, vi } from 'vitest';
import { CanvasSurface } from './canvas-surface.js';

class FakeQuery extends EventTarget {
  constructor(readonly media: string) {
    super();
  }
}

class FakeObserver {
  static instances: FakeObserver[] = [];
  observed: unknown[] = [];
  disconnected = false;
  constructor(readonly callback: (entries: unknown[]) => void) {
    FakeObserver.instances.push(this);
  }
  observe(target: unknown) {
    this.observed.push(target);
  }
  disconnect() {
    this.disconnected = true;
  }
}

class FakeDocument extends EventTarget {
  visibilityState: 'visible' | 'hidden' = 'visible';
  documentElement = {};
}

class FakeWindow extends EventTarget {
  devicePixelRatio = 2;
  document = new FakeDocument();
  queries: FakeQuery[] = [];
  readonly #frames = new Map<number, FrameRequestCallback>();
  #next = 0;
  ResizeObserver = FakeObserver;
  MutationObserver = FakeObserver;
  get frames(): FrameRequestCallback[] {
    return [...this.#frames.values()];
  }
  matchMedia = (media: string) => {
    const query = new FakeQuery(media);
    this.queries.push(query);
    return query as unknown as MediaQueryList;
  };
  requestAnimationFrame = (callback: FrameRequestCallback) => {
    const id = ++this.#next;
    this.#frames.set(id, callback);
    return id;
  };
  cancelAnimationFrame = (id: number) => {
    this.#frames.delete(id);
  };
  flush() {
    const pending = [...this.#frames.values()];
    this.#frames.clear();
    for (const frame of pending) frame(0);
  }
}

class FakeCanvas extends EventTarget {
  width = 0;
  height = 0;
  rect = { width: 100, height: 50 };
  context = { setTransform: vi.fn() };
  getBoundingClientRect() {
    return this.rect;
  }
  getContext() {
    return this.context;
  }
}

function setup() {
  FakeObserver.instances = [];
  const owner = new FakeWindow();
  const canvas = new FakeCanvas();
  const render = vi.fn();
  const surface = new CanvasSurface({
    canvas: canvas as unknown as HTMLCanvasElement,
    owner: owner as unknown as Window,
    render,
  });
  return { owner, canvas, render, surface };
}

describe('CanvasSurface', () => {
  it('sizes the canvas at the device pixel ratio and paints once per invalidation batch', () => {
    const { owner, canvas, render, surface } = setup();
    surface.connect();
    expect(surface.width).toBe(200);
    expect(surface.height).toBe(100);
    surface.invalidate();
    surface.invalidate();
    expect(owner.frames).toHaveLength(1);
    owner.flush();
    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(100);
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(canvas.context, 200, 100, 2);
    expect(canvas.context.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
    expect(surface.renders).toBe(1);
  });

  it('repaints on resize, pixel-ratio change and theme change', () => {
    const { owner, render, surface } = setup();
    surface.connect();
    owner.flush();
    const [resize, mutation] = FakeObserver.instances;
    resize!.callback([
      {
        contentRect: { width: 120, height: 60 },
        devicePixelContentBoxSize: [{ inlineSize: 240, blockSize: 120 }],
      },
    ]);
    owner.flush();
    expect(render).toHaveBeenLastCalledWith(expect.anything(), 240, 120, 2);

    owner.devicePixelRatio = 1;
    const ratioQuery = owner.queries.find((query) => query.media.startsWith('(resolution'))!;
    ratioQuery.dispatchEvent(new Event('change'));
    owner.flush();
    expect(surface.pixelRatio).toBe(1);
    expect(render).toHaveBeenLastCalledWith(expect.anything(), 100, 50, 1);
    expect(owner.queries.filter((query) => query.media.startsWith('(resolution'))).toHaveLength(2);

    const scheme = owner.queries.find((query) => query.media.includes('prefers-color-scheme'))!;
    scheme.dispatchEvent(new Event('change'));
    mutation!.callback([]);
    owner.flush();
    expect(render).toHaveBeenCalledTimes(4);
  });

  it('stops while lost, hidden or disconnected and resumes afterwards', () => {
    const { owner, canvas, render, surface } = setup();
    surface.connect();
    owner.flush();
    expect(render).toHaveBeenCalledTimes(1);

    const lost = new Event('contextlost', { cancelable: true });
    canvas.dispatchEvent(lost);
    expect(lost.defaultPrevented).toBe(true);
    expect(surface.lost).toBe(true);
    surface.invalidate();
    owner.flush();
    expect(render).toHaveBeenCalledTimes(1);
    canvas.dispatchEvent(new Event('contextrestored'));
    owner.flush();
    expect(render).toHaveBeenCalledTimes(2);

    owner.document.visibilityState = 'hidden';
    surface.invalidate();
    expect(owner.frames).toHaveLength(0);
    owner.document.visibilityState = 'visible';
    owner.document.dispatchEvent(new Event('visibilitychange'));
    owner.flush();
    expect(render).toHaveBeenCalledTimes(3);

    surface.invalidate();
    surface.disconnect();
    owner.flush();
    expect(render).toHaveBeenCalledTimes(3);
    expect(FakeObserver.instances.every((observer) => observer.disconnected)).toBe(true);
    expect(surface.connected).toBe(false);
  });

  it('does not paint a zero-sized surface', () => {
    const { owner, canvas, render, surface } = setup();
    canvas.rect = { width: 0, height: 0 };
    surface.connect();
    surface.invalidate();
    expect(owner.frames).toHaveLength(0);
    expect(render).not.toHaveBeenCalled();
  });
});
