import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ManualFrames } from '../../foundation/fakes.test.js';
import { runLayoutPasses } from '../../foundation/layout-batch.js';
import type { TextEditorBlockTree } from '../../foundation/text-editor/model.js';
import {
  OverlayGeometry,
  OverlayPool,
  type OverlayBox,
  observeOverlayPasses,
  overlayBox,
  type OverlayInstance,
  type OverlayLayer,
  type OverlayMeasureContext,
  type OverlayParts,
} from './geometry.js';

/** An event target that counts the listeners still attached. */
class CountingTarget extends EventTarget {
  listeners = 0;
  override addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ): void {
    this.listeners++;
    super.addEventListener(type, callback, options);
  }
  override removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean,
  ): void {
    this.listeners--;
    super.removeEventListener(type, callback, options);
  }
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const rect = ({ left, top, width, height }: Box): DOMRectReadOnly => ({
  left,
  top,
  width,
  height,
  x: left,
  y: top,
  right: left + width,
  bottom: top + height,
  toJSON: () => ({}),
});

class FakeElement extends CountingTarget {
  box: Box = { left: 0, top: 0, width: 0, height: 0 };
  offsetWidth = 0;
  offsetHeight = 0;
  constructor(readonly ownerDocument: unknown) {
    super();
  }
  getBoundingClientRect(): DOMRectReadOnly {
    return rect(this.box);
  }
}

/** A window with manual frames, a size observer, a mutation observer, fonts and visibility. */
function createWindow() {
  const frames = new ManualFrames();
  const resizeObservers = new Set<{ callback: ResizeObserverCallback; targets: Set<unknown> }>();
  const mutationObservers = new Set<{ callback: () => void; targets: Set<unknown> }>();
  class FakeResizeObserver {
    readonly record: { callback: ResizeObserverCallback; targets: Set<unknown> };
    constructor(callback: ResizeObserverCallback) {
      this.record = { callback, targets: new Set() };
      resizeObservers.add(this.record);
    }
    observe(target: unknown): void {
      this.record.targets.add(target);
    }
    unobserve(target: unknown): void {
      this.record.targets.delete(target);
    }
    disconnect(): void {
      this.record.targets.clear();
    }
  }
  class FakeMutationObserver {
    readonly record: { callback: () => void; targets: Set<unknown> };
    constructor(callback: () => void) {
      this.record = { callback, targets: new Set() };
      mutationObservers.add(this.record);
    }
    observe(target: unknown): void {
      this.record.targets.add(target);
    }
    disconnect(): void {
      this.record.targets.clear();
    }
    takeRecords(): [] {
      return [];
    }
  }
  const fonts = Object.assign(new CountingTarget(), { status: 'loaded' });
  const document = Object.assign(new CountingTarget(), {
    visibilityState: 'visible' as DocumentVisibilityState,
    fonts,
    defaultView: null as unknown,
  });
  const owner = {
    document,
    requestAnimationFrame: (callback: FrameRequestCallback) =>
      frames.requestAnimationFrame(callback),
    cancelAnimationFrame: (handle: number) => frames.cancelAnimationFrame(handle),
    performance: { now: () => frames.now() },
    ResizeObserver: FakeResizeObserver,
    MutationObserver: FakeMutationObserver,
  };
  document.defaultView = owner;
  const element = () => new FakeElement(document);
  const parts = () => {
    const viewport = element();
    const content = element();
    const overlay = element();
    content.offsetWidth = 200;
    content.offsetHeight = 100;
    content.box = { left: 10, top: 20, width: 200, height: 100 };
    overlay.box = { left: 10, top: 20, width: 0, height: 0 };
    return { viewport, content, overlay };
  };
  return {
    frames,
    document,
    fonts,
    parts,
    /** Reports a size for `target` to every size observer that observes it. */
    resize(target: FakeElement, width: number, height: number): void {
      target.box = { ...target.box, width, height };
      for (const { callback, targets } of [...resizeObservers])
        if (targets.has(target))
          callback(
            [
              {
                target,
                contentRect: rect(target.box),
                borderBoxSize: [{ inlineSize: width, blockSize: height }],
              } as unknown as ResizeObserverEntry,
            ],
            {} as ResizeObserver,
          );
    },
    /** Reports a mutation under `root`. */
    mutate(root: FakeElement): void {
      for (const { callback, targets } of [...mutationObservers]) if (targets.has(root)) callback();
    },
    observed(): number {
      let count = 0;
      for (const { targets } of [...resizeObservers, ...mutationObservers]) count += targets.size;
      return count;
    },
  };
}

type FakeWindow = ReturnType<typeof createWindow>;
type FakeParts = ReturnType<FakeWindow['parts']>;

const asParts = (parts: FakeParts): OverlayParts => parts as unknown as OverlayParts;

const blocks: TextEditorBlockTree = {
  version: 0,
  roots: ['b1'],
  get: () => undefined,
  ordered: () => [],
};
const instance: OverlayInstance = {
  getBlocks: () => blocks,
  blockElement: () => null,
  blockRects: () => null,
  blockAt: () => null,
};

interface RecordingLayer extends OverlayLayer<string> {
  want: boolean;
  measures: number;
  hides: number;
  sources: string[];
  contexts: OverlayMeasureContext[];
}

/** A layer that records its calls into `log`. */
function recordingLayer(log: string[] = [], name = 'layer'): RecordingLayer {
  const layer: RecordingLayer = {
    want: true,
    measures: 0,
    hides: 0,
    sources: [] as string[],
    contexts: [] as OverlayMeasureContext[],
    wanted: () => layer.want,
    measure(context: OverlayMeasureContext): string {
      layer.measures++;
      layer.sources.push(context.source.kind);
      layer.contexts.push(context);
      log.push(`measure ${name}`);
      return name;
    },
    apply(measured: string): void {
      log.push(`apply ${measured}`);
    },
    hide(): void {
      layer.hides++;
    },
  };
  return layer;
}

/** A started geometry over a laid-out content part with one wanted layer and the instance ready. */
function setup(env: FakeWindow = createWindow(), log: string[] = [], name = 'layer') {
  const source = {
    instance: instance as OverlayInstance | null,
    preview: null as HTMLElement | null,
  };
  const geometry = new OverlayGeometry({
    instance: () => source.instance,
    preview: () => source.preview,
  });
  const layer = recordingLayer(log, name);
  const remove = geometry.addLayer(layer);
  const parts = env.parts();
  geometry.observe(asParts(parts));
  env.resize(parts.content, 200, 100);
  return { env, geometry, layer, remove, parts, source };
}

/** Runs one frame of the shared loop and the batch it queued. */
function frame(env: FakeWindow): void {
  env.frames.tick();
  runLayoutPasses();
}

/** The imports of the shared owners that geometry.ts must use, by module. */
const SHARED_IMPORTS: Readonly<Record<string, readonly string[]>> = {
  '../../foundation/frame-loop.js': ['frameLoopFor'],
  '../../foundation/layout-batch.js': ['scheduleLayoutPass'],
  '../../foundation/observation.js': ['observeResize', 'observeSubtree', 'observeFonts'],
};

/** The shared-owner imports `source` lacks, as `module#name`. */
export function missingSharedImports(source: string): string[] {
  const imported = new Map<string, Set<string>>();
  for (const [, names = '', module = ''] of source.matchAll(
    /import\s*\{([^}]*)\}\s*from\s*'([^']+)'/gu,
  )) {
    const set = imported.get(module) ?? new Set<string>();
    for (const name of names.split(',')) {
      const trimmed = name.trim();
      if (trimmed && !trimmed.startsWith('type ')) set.add(trimmed.split(/\s+as\s+/u)[0] ?? '');
    }
    imported.set(module, set);
  }
  return Object.entries(SHARED_IMPORTS).flatMap(([module, names]) =>
    names.filter((name) => !imported.get(module)?.has(name)).map((name) => `${module}#${name}`),
  );
}

describe('overlay geometry', () => {
  it('uwg-te-req-engine-10: invalidations within a frame run one pass in the next frame', () => {
    const { env, geometry, layer } = setup();
    frame(env);
    expect(layer.measures).toBe(1);
    geometry.invalidate('state');
    geometry.invalidate('content');
    geometry.invalidate('fonts');
    expect(layer.measures).toBe(1);
    expect(env.frames.pending).toBe(1);
    frame(env);
    expect(layer.measures).toBe(2);
    frame(env);
    expect(layer.measures).toBe(2);
    expect(env.frames.pending).toBe(0);
  });

  it('uwg-te-req-perf-1: the passes of two instances run in one measurement batch, every measure before every apply', () => {
    const env = createWindow();
    const log: string[] = [];
    setup(env, log, 'a');
    setup(env, log, 'b');
    env.frames.tick();
    expect(log).toEqual([]);
    runLayoutPasses();
    expect(log).toEqual(['measure a', 'measure b', 'apply a', 'apply b']);
  });

  it('uwg-te-req-engine-10: no pass after release, and a pass queued before release is dropped; observe starts again', () => {
    const { env, geometry, layer, parts } = setup();
    env.frames.tick();
    geometry.release();
    runLayoutPasses();
    expect(layer.measures).toBe(0);
    geometry.invalidate('state');
    env.resize(parts.content, 200, 100);
    frame(env);
    expect(layer.measures).toBe(0);
    geometry.observe(asParts(parts));
    env.resize(parts.content, 200, 100);
    frame(env);
    expect(layer.measures).toBe(1);
  });

  it('uwg-te-req-engine-10: no pass while the content part has no layout box; one once it has one', () => {
    const { env, geometry, layer, parts } = setup();
    env.resize(parts.content, 0, 0);
    geometry.invalidate('state');
    frame(env);
    expect(layer.measures).toBe(0);
    env.resize(parts.content, 200, 100);
    frame(env);
    expect(layer.measures).toBe(1);
  });

  it('uwg-te-req-engine-10: no pass while the document is hidden; one after it becomes visible', () => {
    const env = createWindow();
    env.document.visibilityState = 'hidden';
    const { geometry, layer } = setup(env);
    geometry.invalidate('state');
    expect(env.frames.pending).toBe(0);
    frame(env);
    expect(layer.measures).toBe(0);
    env.document.visibilityState = 'visible';
    env.document.dispatchEvent(new Event('visibilitychange'));
    frame(env);
    expect(layer.measures).toBe(1);
  });

  it('uwg-te-req-engine-10: no pass while no layer has a mark to place, or while neither an instance nor a preview root exists; one once both hold', () => {
    const { env, geometry, layer, source } = setup();
    layer.want = false;
    geometry.invalidate('state');
    frame(env);
    expect(layer.measures).toBe(0);
    layer.want = true;
    source.instance = null;
    geometry.invalidate('state');
    frame(env);
    expect(layer.measures).toBe(0);
    source.instance = instance;
    geometry.invalidate('instance');
    frame(env);
    expect(layer.measures).toBe(1);
  });

  it('uwg-te-req-engine-10: content mutations, size changes of the content and the viewport, font loads and image loads each invalidate', () => {
    const { env, layer, parts } = setup();
    frame(env);
    const triggers = [
      () => env.mutate(parts.content),
      () => env.resize(parts.content, 220, 100),
      () => env.resize(parts.viewport, 300, 200),
      () => env.fonts.dispatchEvent(new Event('loadingdone')),
      () => parts.content.dispatchEvent(new Event('load')),
    ];
    for (const [index, trigger] of triggers.entries()) {
      trigger();
      frame(env);
      expect(layer.measures).toBe(index + 2);
    }
  });

  it('uwg-te-req-perf-1: a pass carries the invalidations since the previous pass measured', () => {
    const { env, geometry, layer } = setup();
    frame(env);
    expect([...layer.contexts[0]!.reasons!]).toEqual(['resize']);
    geometry.invalidate('scroll');
    geometry.invalidate('scroll');
    frame(env);
    expect([...layer.contexts[1]!.reasons!]).toEqual(['scroll']);
    geometry.invalidate('scroll');
    geometry.invalidate('content');
    frame(env);
    expect([...layer.contexts[2]!.reasons!].sort()).toEqual(['content', 'scroll']);
  });

  it('uwg-te-req-engine-10: release removes every observation and listener synchronously', () => {
    const { env, geometry, parts } = setup();
    geometry.invalidate('state');
    expect(env.observed()).toBeGreaterThan(0);
    expect(env.document.listeners + env.fonts.listeners + parts.content.listeners).toBe(3);
    expect(env.frames.pending).toBe(1);
    geometry.release();
    expect(env.observed()).toBe(0);
    expect(env.document.listeners + env.fonts.listeners + parts.content.listeners).toBe(0);
    expect(env.frames.pending).toBe(0);
  });

  it('uwg-te-req-engine-10: losing every source hides every layer without a pass', () => {
    const { env, geometry, layer, source } = setup();
    frame(env);
    source.instance = null;
    geometry.invalidate('instance');
    expect(layer.hides).toBe(1);
    frame(env);
    expect(layer.measures).toBe(1);
    geometry.release();
    expect(layer.hides).toBe(2);
  });

  it('uwg-te-req-render-2: client rectangles convert to overlay coordinates through the origin and the scale', () => {
    expect(
      overlayBox(
        { left: 110, top: 70, width: 50, height: 20 },
        { left: 10, top: 20 },
        { x: 0.5, y: 0.5 },
      ),
    ).toEqual({ left: 200, top: 100, width: 100, height: 40 });
    expect(
      overlayBox(
        { left: 30, top: 40, width: 50, height: 20 },
        { left: 10, top: 20 },
        { x: 1, y: 1 },
      ),
    ).toEqual({ left: 20, top: 20, width: 50, height: 20 });
    const { env, layer, parts } = setup();
    parts.content.box = { left: 10, top: 20, width: 100, height: 50 };
    frame(env);
    expect(layer.contexts[0]?.toOverlay(rect({ left: 60, top: 45, width: 10, height: 5 }))).toEqual(
      {
        left: 100,
        top: 50,
        width: 20,
        height: 10,
      },
    );
  });

  it('uwg-te-req-perf-1: observeOverlayPasses reports each pass with its content part and frame time, and stops when released', () => {
    const records: { content: unknown; time: number }[] = [];
    const stop = observeOverlayPasses((record) => records.push(record));
    const { env, geometry, parts } = setup();
    frame(env);
    expect(records).toEqual([{ content: parts.content, time: env.frames.time }]);
    stop();
    geometry.invalidate('state');
    frame(env);
    expect(records).toHaveLength(1);
  });

  it('env-shared-observation: geometry subscribes through the shared frame loop, layout batch and observation services', () => {
    const source = readFileSync(new URL('./geometry.ts', import.meta.url), 'utf8');
    expect(missingSharedImports('')).toHaveLength(5);
    expect(missingSharedImports(source)).toEqual([]);
  });

  it('uwg-te-tab-props-r4: before ready a pass measures against the preview root, and after ready against the instance', () => {
    const { env, geometry, layer, source } = setup();
    const root = env.parts().content as unknown as HTMLElement;
    source.instance = null;
    source.preview = root;
    geometry.invalidate('content');
    frame(env);
    expect(layer.sources).toEqual(['preview']);
    expect(layer.contexts[0]?.source).toEqual({ kind: 'preview', root });
    source.instance = instance;
    geometry.invalidate('instance');
    frame(env);
    expect(layer.sources).toEqual(['preview', 'instance']);
    expect(layer.hides).toBe(0);
  });
});

describe('block hit testing and pooled marks (M8)', () => {
  /** A geometry whose content part holds an editing root over three block elements. */
  function hitSetup() {
    const env = createWindow();
    const owner = env.document.defaultView as Record<string, unknown>;
    owner['getComputedStyle'] = () => ({ paddingLeft: '30px', paddingRight: '10px' });
    const editing = new FakeElement(env.document);
    editing.box = { left: 10, top: 20, width: 200, height: 100 };
    const inside = new Set<unknown>([editing]);
    const points: { x: number; y: number }[] = [];
    const hits: unknown[] = [];
    // An engine may map its editing root to its first block.
    const ids = new Map<unknown, string>([[editing, 'b1']]);
    for (const id of ['b1', 'b2']) {
      const element = new FakeElement(env.document);
      inside.add(element);
      ids.set(element, id);
      hits.push(element);
    }
    const parts = env.parts();
    Object.assign(parts.content, {
      firstElementChild: editing,
      contains: (node: unknown) => inside.has(node),
      getRootNode: () => ({
        elementsFromPoint: (x: number, y: number) => {
          points.push({ x, y });
          return y < 70 ? [hits[0], editing, parts.content] : [editing, parts.content];
        },
      }),
    });
    const geometry = new OverlayGeometry({
      instance: () => ({ ...instance, blockAt: (node: Node) => ids.get(node) ?? null }),
      preview: () => null,
    });
    geometry.observe(asParts(parts));
    return { env, geometry, parts, points };
  }

  it('clamps the pointer into the editing root and maps the first block element', () => {
    const { geometry, points } = hitSetup();
    expect(geometry.hitBlock(0, 40)).toBe('b1');
    // Inside the inline-start inset, the probe moves to the first column of content.
    expect(points.at(-1)).toEqual({ x: 41, y: 40 });
    expect(geometry.hitBlock(500, 40)).toBe('b1');
    expect(points.at(-1)).toEqual({ x: 199, y: 40 });
  });

  it('answers null between blocks and outside the content extent', () => {
    const { geometry, points } = hitSetup();
    expect(geometry.hitBlock(50, 80)).toBeNull();
    const probes = points.length;
    expect(geometry.hitBlock(50, 5)).toBeNull();
    expect(geometry.hitBlock(50, 130)).toBeNull();
    expect(points).toHaveLength(probes);
  });

  it('V-589: a requested hit resolves once in the next frame, at the latest requested point', () => {
    const { env, geometry, points } = hitSetup();
    const answers: (string | null)[] = [];
    const resolve = (id: string | null): void => void answers.push(id);
    geometry.requestHit(50, 80, resolve);
    geometry.requestHit(50, 40, resolve);
    // The requesting task reads no layout and hit-tests nothing.
    expect(points).toHaveLength(0);
    frame(env);
    expect(answers).toEqual(['b1']);
    expect(points).toEqual([{ x: 50, y: 40 }]);
    frame(env);
    expect(answers).toEqual(['b1']);
    expect(points).toHaveLength(1);
  });

  it('V-372: a viewport scroll re-runs the hit test of a scroll listener in the next frame', () => {
    const { env, geometry, parts, points } = hitSetup();
    // A node target, so the shared scroll source listens on it.
    Object.assign(parts.viewport, { nodeType: 1 });
    geometry.release();
    geometry.observe(asParts(parts));
    const answers: (string | null)[] = [];
    let calls = 0;
    geometry.onScroll(() => {
      calls++;
      geometry.requestHit(50, 40, (id) => void answers.push(id));
    });
    // The browser fires the scroll event in the rendering steps of the frame that follows the
    // scroll, before that frame's animation frame callbacks: the listener runs inside the event.
    parts.viewport.dispatchEvent(new Event('scroll'));
    expect(calls).toBe(1);
    expect(points).toHaveLength(0);
    frame(env);
    expect(answers).toEqual(['b1']);
    expect(points).toEqual([{ x: 50, y: 40 }]);
  });

  it('V-589: resolvers asking at one point in a frame share one hit test', () => {
    const { env, geometry, points } = hitSetup();
    const gutter: (string | null)[] = [];
    const table: (string | null)[] = [];
    geometry.requestHit(50, 40, (id) => void gutter.push(id));
    geometry.requestHit(50, 40, (id) => void table.push(id));
    frame(env);
    expect(gutter).toEqual(['b1']);
    expect(table).toEqual(['b1']);
    expect(points).toHaveLength(1);
  });

  it('V-589: a release drops a requested hit', () => {
    const { env, geometry, points } = hitSetup();
    const answers: (string | null)[] = [];
    geometry.requestHit(50, 40, (id) => answers.push(id));
    geometry.release();
    frame(env);
    expect(answers).toEqual([]);
    expect(points).toHaveLength(0);
  });

  it('answers null without a ready instance or once released', () => {
    const { geometry } = hitSetup();
    geometry.release();
    expect(geometry.hitBlock(50, 40)).toBeNull();
    expect(geometry.parts).toBeNull();
  });

  it('measures and applies one layer at once with the overlay transform', () => {
    const { geometry } = hitSetup();
    const applied: unknown[] = [];
    const layer: OverlayLayer<OverlayBox> = {
      wanted: () => true,
      measure: (context) =>
        context.toOverlay({ left: 30, top: 50, width: 10, height: 5 } as DOMRectReadOnly),
      apply: (box) => applied.push(box),
      hide: () => undefined,
    };
    geometry.layoutNow(layer);
    expect(applied).toEqual([{ left: 20, top: 30, width: 10, height: 5 }]);
  });

  it('pools marks: one element per box, the rest hidden and kept', () => {
    const created: Record<string, unknown>[] = [];
    const container = {
      ownerDocument: {
        createElement: () => {
          const element: Record<string, unknown> = {
            style: {},
            hidden: true,
            attributes: {} as Record<string, string>,
            parentNode: null,
            setAttribute(name: string, value: string) {
              (element['attributes'] as Record<string, string>)[name] = value;
            },
            remove() {
              element['parentNode'] = null;
            },
          };
          created.push(element);
          return element;
        },
      },
      append(element: Record<string, unknown>) {
        element['parentNode'] = container;
      },
    };
    const pool = new OverlayPool(() => container as unknown as HTMLElement, 'text-editor-x');
    pool.write([
      { left: 1, top: 2, width: 3, height: 4 },
      { left: 5, top: 6, width: 7, height: 8 },
    ]);
    expect(created).toHaveLength(2);
    expect(created[0]).toMatchObject({
      hidden: false,
      attributes: { part: 'text-editor-x', 'aria-hidden': 'true' },
      style: { transform: 'translate(1px, 2px)', width: '3px', height: '4px' },
    });
    pool.write([{ left: 0, top: 0, width: 1, height: 1 }]);
    expect(created).toHaveLength(2);
    expect(created.map((element) => element['hidden'])).toEqual([false, true]);
    pool.hide();
    expect(created.map((element) => element['hidden'])).toEqual([true, true]);
    pool.release();
    expect(pool.elements).toHaveLength(0);
  });
});
