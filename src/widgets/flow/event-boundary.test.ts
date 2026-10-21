import type { ReactiveController } from 'lit';
import { describe, expect, it, vi } from 'vitest';
import type * as NestedEvents from '../../foundation/nested-events.js';

/** The boundaries each element asks for at construction, in call order. */
const boundaries = vi.hoisted(
  (): { host: unknown; options: NestedEvents.NestedEventContainment }[] => [],
);

vi.mock('../../foundation/nested-events.js', async (importOriginal) => {
  const original = await importOriginal<typeof NestedEvents>();
  return {
    ...original,
    containNestedEvents: (
      host: NestedEvents.NestedEventHost,
      options: NestedEvents.NestedEventContainment,
    ) => {
      boundaries.push({ host, options });
      return original.containNestedEvents(host, options);
    },
  };
});

const { containNestedEvents } = await vi.importActual<typeof NestedEvents>(
  '../../foundation/nested-events.js',
);
const { TpFlow } = await import('./flow.js');

type Listener = (event: Event) => void;

/** A node of a composed tree (node environment): its root, its listeners and what reached it. */
class Target {
  readonly listeners = {
    capture: new Map<string, Listener[]>(),
    bubble: new Map<string, Listener[]>(),
  };
  readonly heard: string[] = [];
  #root: Target | undefined;

  constructor(
    readonly name: string,
    root?: Target,
  ) {
    this.#root = root;
  }

  getRootNode(): Target {
    return this.#root ?? this;
  }

  addEventListener(type: string, listener: Listener, capture?: boolean): void {
    const map = capture === true ? this.listeners.capture : this.listeners.bubble;
    map.set(type, [...(map.get(type) ?? []), listener]);
  }

  removeEventListener(type: string, listener: Listener, capture?: boolean): void {
    const map = capture === true ? this.listeners.capture : this.listeners.bubble;
    map.set(
      type,
      (map.get(type) ?? []).filter((added) => added !== listener),
    );
  }

  /** A bubble listener that only records what reached this node. */
  listen(type: string): this {
    this.addEventListener(type, (event) => this.heard.push(`${event.type} from ${name(event)}`));
    return this;
  }
}

const name = (event: Event): string => (event.target as unknown as Target).name;

/**
 * Dispatches a bubbling, composed event: `path` lists each node from the origin up with the
 * target its tree sees, as the browser retargets it. Capture runs top-down, then bubbling.
 */
function dispatch(type: string, path: readonly (readonly [Target, Target])[]): void {
  let stopped = false;
  let seen = path[0]![1];
  const event = {
    type,
    bubbles: true,
    composed: true,
    get target() {
      return seen;
    },
    composedPath: () => path.map(([node]) => node),
    stopPropagation: () => {
      stopped = true;
    },
  } as unknown as Event;
  const run = (steps: readonly (readonly [Target, Target])[], phase: 'capture' | 'bubble') => {
    for (const [node, target] of steps) {
      seen = target;
      for (const listener of node.listeners[phase].get(type) ?? []) listener(event);
      if (stopped) return false;
    }
    return true;
  };
  if (run([...path].reverse(), 'capture')) run(path, 'bubble');
}

/**
 * A flow widget's boundaries, as its constructor asks for them, mounted on a structural host
 * whose shadow root is `root`; the host and the document record what reaches them.
 */
function mount(type: string) {
  boundaries.length = 0;
  const flow = new TpFlow();
  const own = boundaries.filter((boundary) => boundary.host === flow);
  const document = new Target('document').listen(type);
  const controllers: ReactiveController[] = [];
  const host = Object.assign(new Target('tp-flow', document).listen(type), {
    renderRoot: undefined as Target | undefined,
    addController: (controller: ReactiveController) => controllers.push(controller),
  });
  const root = new Target('#shadow-root');
  // The boundary rules read the widget's own render root.
  Object.defineProperty(flow, 'renderRoot', { value: root, configurable: true });
  for (const { options } of own)
    containNestedEvents(host as unknown as NestedEvents.NestedEventHost, options);
  host.renderRoot = root;
  for (const controller of controllers) controller.hostConnected?.();
  return { own, document, host, root };
}

describe('flow nested event boundary', () => {
  it('uwg-fl-req-evt-3: an event from inside a constituent rendered in the shadow root stops there after the constituent heard it', () => {
    const type = 'tp-open-change-complete';
    const { document, host, root } = mount(type);
    // The node library in the shadow root; an Accordion item inside its own shadow root.
    const library = new Target('tp-flow-palette', root);
    const libraryRoot = new Target('#library-root').listen(type);
    const item = new Target('tp-accordion-item', libraryRoot);
    dispatch(type, [
      [item, item],
      [libraryRoot, item],
      [library, library],
      [root, library],
      [host, host],
      [document, host],
    ]);
    expect(libraryRoot.heard).toEqual([`${type} from tp-accordion-item`]);
    expect(host.heard).toEqual([]);
    expect(document.heard).toEqual([]);
  });

  it('uwg-fl-req-evt-3: events of authored light-DOM content pass unchanged, slotted or from its own shadow root', () => {
    const type = 'tp-value-change';
    const { document, host, root } = mount(type);
    const slot = new Target('slot', root);
    // `#b > p`: a paragraph inside an authored node, both light-DOM children.
    const authored = new Target('tp-flow-node#b', document);
    const paragraph = new Target('p', document);
    dispatch(type, [
      [paragraph, paragraph],
      [authored, paragraph],
      [slot, paragraph],
      [root, paragraph],
      [host, paragraph],
      [document, paragraph],
    ]);
    // A control inside the authored node's own shadow root.
    const authoredRoot = new Target('#authored-root');
    const control = new Target('tp-select', authoredRoot);
    dispatch(type, [
      [control, control],
      [authoredRoot, control],
      [authored, authored],
      [slot, authored],
      [root, authored],
      [host, authored],
      [document, authored],
    ]);
    expect(document.heard).toEqual([`${type} from p`, `${type} from tp-flow-node#b`]);
    expect(host.heard).toEqual(document.heard);
  });

  it("uwg-fl-req-evt-3: content rendered directly in the shadow root stops before its own listeners; the widget's own events pass", () => {
    const type = 'tp-value-change';
    const { own, document, host, root } = mount(type);
    expect(own.length).toBeGreaterThan(0);
    const select = new Target('tp-select', root).listen(type);
    dispatch(type, [
      [select, select],
      [root, select],
      [host, host],
      [document, host],
    ]);
    expect(select.heard).toEqual([]);
    dispatch(type, [
      [host, host],
      [document, host],
    ]);
    expect(host.heard).toEqual([`${type} from tp-flow`]);
    expect(document.heard).toEqual([`${type} from tp-flow`]);
  });
});
