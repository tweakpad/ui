import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { containNestedEvents, type NestedEventHost } from './nested-events.js';

type Listener = (event: Event) => void;
interface Added {
  readonly type: string;
  readonly listener: Listener;
  readonly capture: boolean;
}
interface Controller {
  hostConnected?(): void;
  hostDisconnected?(): void;
}

/** An event target that records its listeners instead of dispatching. */
function recorder() {
  const added: Added[] = [];
  const removed: Added[] = [];
  return {
    added,
    removed,
    addEventListener: (type: string, listener: Listener, options?: boolean) =>
      added.push({ type, listener, capture: options === true }),
    removeEventListener: (type: string, listener: Listener, options?: boolean) =>
      removed.push({ type, listener, capture: options === true }),
  };
}

/**
 * A host and its render root as structural targets (node environment). As on a Lit host, the
 * render root exists only from the first connection, before the controllers hear of it.
 */
function setup() {
  const root = recorder();
  const controllers: Controller[] = [];
  const host = {
    ...recorder(),
    renderRoot: undefined as ReturnType<typeof recorder> | undefined,
    addController: (controller: Controller) => controllers.push(controller),
  };
  const inShadow = { getRootNode: () => root };
  const authored = { getRootNode: () => ({}) };
  return {
    root,
    host,
    inShadow,
    authored,
    connect: () => {
      host.renderRoot = root;
      for (const controller of controllers) controller.hostConnected?.();
    },
    disconnect: () => {
      for (const controller of controllers) controller.hostDisconnected?.();
    },
    asHost: () => host as unknown as NestedEventHost,
  };
}

/** An event whose retargeted target and composed path head are given separately. */
function event(type: string, target: unknown, head: unknown = target) {
  return {
    type,
    target,
    composedPath: () => (head === undefined ? [] : [head]),
    stopPropagation: vi.fn(),
  } as unknown as Event & { stopPropagation: ReturnType<typeof vi.fn> };
}

const TYPES = ['tp-value-change', 'tp-open-change'] as const;

describe('nested event containment', () => {
  it('uwg-em-req-evt-3: a root boundary stops each listed type from a nested origin while connected', () => {
    const { root, host, inShadow, connect, asHost } = setup();
    containNestedEvents(asHost(), { types: TYPES, on: 'root' });
    expect(root.added).toEqual([]);
    connect();
    expect(root.added.map(({ type, capture }) => [type, capture])).toEqual([
      ['tp-value-change', false],
      ['tp-open-change', false],
    ]);
    expect(host.added).toEqual([]);
    const nested = event('tp-value-change', inShadow);
    root.added[0]!.listener(nested);
    expect(nested.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it("uwg-cp-req-evt-2: the host's own event passes on both sites", () => {
    const rooted = setup();
    containNestedEvents(rooted.asHost(), { types: TYPES, on: 'root' });
    rooted.connect();
    const own = event('tp-value-change', rooted.host);
    rooted.root.added[0]!.listener(own);
    expect(own.stopPropagation).not.toHaveBeenCalled();
    const hosted = setup();
    containNestedEvents(hosted.asHost(), { types: TYPES, on: 'host' });
    const ownHosted = event('tp-value-change', hosted.host, hosted.host);
    hosted.host.added[0]!.listener(ownHosted);
    expect(ownHosted.stopPropagation).not.toHaveBeenCalled();
  });

  it('uwg-fl-req-evt-3: a host boundary listens in capture from construction and reads the path head', () => {
    const { root, host, inShadow, connect, disconnect, asHost } = setup();
    const contained = vi.fn();
    containNestedEvents(asHost(), { types: TYPES, on: 'host', contained });
    expect(host.added.map(({ type, capture }) => [type, capture])).toEqual([
      ['tp-value-change', true],
      ['tp-open-change', true],
    ]);
    connect();
    disconnect();
    expect(root.added).toEqual([]);
    expect(host.removed).toEqual([]);
    // In capture on the host the target is retargeted to the host; the origin is the path head.
    const nested = event('tp-open-change', host, inShadow);
    host.added[1]!.listener(nested);
    expect(nested.stopPropagation).toHaveBeenCalledTimes(1);
    expect(contained).toHaveBeenCalledWith(nested, inShadow);
    const headless = event('tp-open-change', host, undefined);
    host.added[1]!.listener(headless);
    expect(headless.stopPropagation).not.toHaveBeenCalled();
  });

  it('uwg-fl-req-evt-3: an event of authored light-DOM content passes unchanged', () => {
    const { root, host, inShadow, authored, asHost } = setup();
    const contained = vi.fn();
    containNestedEvents(asHost(), {
      types: TYPES,
      on: 'host',
      passes: (_event, origin) => origin.getRootNode() !== (root as unknown as Node),
      contained,
    });
    const light = event('tp-value-change', host, authored);
    host.added[0]!.listener(light);
    expect(light.stopPropagation).not.toHaveBeenCalled();
    const nested = event('tp-value-change', host, inShadow);
    host.added[0]!.listener(nested);
    expect(nested.stopPropagation).toHaveBeenCalledTimes(1);
    expect(contained.mock.calls).toEqual([[nested, inShadow]]);
  });

  it('uwg-fl-req-evt-3: the widget bookkeeping runs after the stop', () => {
    const { root, inShadow, connect, asHost } = setup();
    const order: string[] = [];
    containNestedEvents(asHost(), {
      types: TYPES,
      on: 'root',
      contained: () => order.push('contained'),
    });
    connect();
    const nested = event('tp-open-change', inShadow);
    nested.stopPropagation.mockImplementation(() => order.push('stopped'));
    root.added[1]!.listener(nested);
    expect(order).toEqual(['stopped', 'contained']);
  });

  it('uwg-ee-req-evt-2: disconnection removes exactly the root listeners and reconnection restores them', () => {
    const { root, connect, disconnect, asHost } = setup();
    containNestedEvents(asHost(), { types: TYPES, on: 'root' });
    connect();
    connect();
    expect(root.added).toHaveLength(2);
    disconnect();
    disconnect();
    expect(root.removed).toEqual(root.added);
    connect();
    expect(root.added.slice(2)).toEqual(root.added.slice(0, 2));
  });

  it('uwg-cp-req-evt-2: the returned template listeners apply the same rule through one handler', () => {
    const { host, inShadow, asHost } = setup();
    const listeners = containNestedEvents(asHost(), { types: TYPES, on: 'root' });
    expect(Object.keys(listeners)).toEqual(['@tp-value-change', '@tp-open-change']);
    expect(Object.isFrozen(listeners)).toBe(true);
    expect(new Set(Object.values(listeners)).size).toBe(1);
    const nested = event('tp-open-change', inShadow);
    listeners['@tp-open-change']!(nested);
    expect(nested.stopPropagation).toHaveBeenCalledTimes(1);
    const own = event('tp-open-change', host);
    listeners['@tp-open-change']!(own);
    expect(own.stopPropagation).not.toHaveBeenCalled();
  });
});

describe('nested event containment owners', () => {
  const root = new URL('../', import.meta.url).pathname;
  const sources = (dir: string): string[] =>
    readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? sources(join(dir, entry.name))
        : entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')
          ? [join(dir, entry.name)]
          : [],
    );

  it('uwg-em-req-evt-3, uwg-cp-req-evt-2, uwg-ee-req-evt-2, uwg-fl-req-evt-3: every widget type list goes through the shared boundary', () => {
    const owners = sources('widgets').filter((file) =>
      readFileSync(join(root, file), 'utf8').includes('NESTED_EVENT_TYPES'),
    );
    expect(owners.length).toBeGreaterThanOrEqual(6);
    for (const file of owners) {
      const text = readFileSync(join(root, file), 'utf8');
      expect({ file, handler: /#containNested|#panelListeners/u.test(text) }).toEqual({
        file,
        handler: false,
      });
      expect({ file, boundary: /containNestedEvents\(this,/u.test(text) }).toEqual({
        file,
        boundary: true,
      });
    }
  });

  it('keeps the boundary out of every public entry', () => {
    const entries = [
      'index.ts',
      'foundation/index.ts',
      'widgets/index.ts',
      'presentation/index.ts',
      ...sources('components').filter((file) => file.endsWith('/index.ts')),
    ];
    for (const file of entries)
      expect({
        file,
        exported: readFileSync(join(root, file), 'utf8').includes('nested-events'),
      }).toEqual({ file, exported: false });
  });
});
