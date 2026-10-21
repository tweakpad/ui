/**
 * Resource ledger of the text editor fixtures: from its installation on, it records the listeners
 * added to windows, documents, shadow roots, editor hosts and the other window-level targets
 * (font sets, media queries, the visual viewport), every observation of a Resize, Mutation or
 * Intersection observer, and every pending timer and animation frame. `assertCleanup(id)` removes
 * an instance and reports what it left registered. Install it before the instances are created
 * (`nesting.html` always does; `index.html` with `?ledger`). Driven only through the Chrome
 * DevTools MCP (see README.md).
 */
import { frameLoopFor } from '../../../../src/foundation/frame-loop.js';
import { check, nodeLabel, report, type Report } from './harness.js';

export type LedgerKind = 'listener' | 'observer' | 'timeout' | 'interval' | 'frame';

export interface LedgerEntry {
  /** Ascending across every kind: the order of registration. */
  readonly seq: number;
  readonly kind: LedgerKind;
  /** A label of the target, or of the observed node. */
  readonly target: string;
  /** The event type, the observer class, or the timer kind. */
  readonly type: string;
  readonly capture?: boolean;
  /** A listener added with `once`, which the browser removes when it fires. */
  readonly once?: boolean;
  live: boolean;
  /** The node or event target, weakly held. */
  readonly ref: WeakRef<object> | null;
}

/** Window-level targets that are no nodes but outlive an editor. */
const WINDOW_TARGETS = ['FontFaceSet', 'MediaQueryList', 'VisualViewport', 'ScreenOrientation'];

const entries: LedgerEntry[] = [];
const creations = new Map<string, number>();
let seq = 0;
let installed = false;

// Realm-independent tests: a frame's windows and nodes come from another realm.
const isWindow = (target: unknown): target is Window =>
  typeof target === 'object' && target !== null && (target as Window).window === target;
const isNode = (target: unknown): target is Node =>
  typeof target === 'object' &&
  target !== null &&
  !isWindow(target) &&
  typeof (target as Node).nodeType === 'number';
const isShadowRoot = (target: unknown): target is ShadowRoot =>
  isNode(target) && target.nodeType === 11 && 'host' in target;

function tracked(target: EventTarget): boolean {
  if (isWindow(target)) return true;
  if (isNode(target))
    return (
      target.nodeType === 9 ||
      isShadowRoot(target) ||
      (target.nodeType === 1 && (target as Element).localName === 'tp-text-editor')
    );
  return WINDOW_TARGETS.includes(target.constructor.name);
}

function label(target: unknown): string {
  if (isWindow(target)) return target === window ? '#window' : '#window (frame)';
  if (isNode(target)) {
    const document = target.nodeType === 9 ? (target as Document) : target.ownerDocument;
    const text = target.nodeType === 9 ? '#document' : nodeLabel(target);
    return document && document !== window.document ? `${text} (frame)` : text;
  }
  return (target as { constructor?: { name?: string } } | null)?.constructor?.name ?? 'unknown';
}

function add(
  kind: LedgerKind,
  target: unknown,
  type: string,
  extra: Partial<LedgerEntry> = {},
): LedgerEntry {
  const entry: LedgerEntry = {
    seq: (seq += 1),
    kind,
    target: label(target),
    type,
    live: true,
    ref: typeof target === 'object' && target !== null ? new WeakRef(target) : null,
    ...extra,
  };
  entries.push(entry);
  return entry;
}

const captureOf = (options: boolean | AddEventListenerOptions | undefined): boolean =>
  typeof options === 'boolean' ? options : options?.capture === true;

/** Wraps the registration APIs of `view` (the page's window, or a frame's). */
function wrapWindow(view: Window & typeof globalThis): void {
  const marker = view as unknown as { __tpLedger?: boolean };
  if (marker.__tpLedger) return;
  marker.__tpLedger = true;

  // Listeners, keyed by target, then type and capture, then listener.
  const listeners = new WeakMap<EventTarget, Map<string, Map<unknown, LedgerEntry>>>();
  const prototype = view.EventTarget.prototype;
  const addListener = prototype.addEventListener;
  const removeListener = prototype.removeEventListener;
  prototype.addEventListener = function (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    addListener.call(this, type, listener, options);
    if (!listener || !tracked(this)) return;
    const capture = captureOf(options);
    const key = `${type}\u0000${capture}`;
    let byKey = listeners.get(this);
    if (!byKey) listeners.set(this, (byKey = new Map()));
    let byListener = byKey.get(key);
    if (!byListener) byKey.set(key, (byListener = new Map()));
    if (byListener.get(listener)?.live) return;
    const once = typeof options === 'object' && options.once === true;
    const entry = add('listener', this, type, { capture, once });
    byListener.set(listener, entry);
    const signal = typeof options === 'object' ? options.signal : undefined;
    signal?.addEventListener('abort', () => (entry.live = false), { once: true });
  };
  prototype.removeEventListener = function (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) {
    removeListener.call(this, type, listener, options);
    const entry = listeners
      .get(this)
      ?.get(`${type}\u0000${captureOf(options)}`)
      ?.get(listener);
    if (entry) entry.live = false;
  };

  // Observations: one entry per observer and target.
  for (const name of ['ResizeObserver', 'MutationObserver', 'IntersectionObserver'] as const) {
    const Observer = view[name] as unknown as {
      prototype: {
        observe(target: Node, options?: unknown): void;
        unobserve?(target: Node): void;
        disconnect(): void;
      };
    };
    const observations = new WeakMap<object, Map<Node, LedgerEntry>>();
    const { observe, unobserve, disconnect } = Observer.prototype;
    Observer.prototype.observe = function (this: object, target: Node, options?: unknown) {
      observe.call(this, target, options);
      let map = observations.get(this);
      if (!map) observations.set(this, (map = new Map()));
      if (!map.get(target)?.live) map.set(target, add('observer', target, name));
    };
    if (unobserve)
      Observer.prototype.unobserve = function (this: object, target: Node) {
        unobserve.call(this, target);
        const entry = observations.get(this)?.get(target);
        if (entry) entry.live = false;
        observations.get(this)?.delete(target);
      };
    Observer.prototype.disconnect = function (this: object) {
      disconnect.call(this);
      for (const entry of observations.get(this)?.values() ?? []) entry.live = false;
      observations.delete(this);
    };
  }

  // Timers and frames: live until they fire or are cleared.
  const pending = new Map<string, LedgerEntry>();
  const timers = [
    ['setTimeout', 'clearTimeout', 'timeout'],
    ['setInterval', 'clearInterval', 'interval'],
    ['requestAnimationFrame', 'cancelAnimationFrame', 'frame'],
  ] as const;
  for (const [set, clear, kind] of timers) {
    const original = view[set] as unknown as (...args: unknown[]) => number;
    const cancel = view[clear] as unknown as (handle: number) => void;
    (view as unknown as Record<string, unknown>)[set] = function (
      callback: unknown,
      ...rest: unknown[]
    ) {
      let entry: LedgerEntry | null = null;
      const wrapped =
        typeof callback === 'function'
          ? function (this: unknown, ...args: unknown[]) {
              if (entry && kind !== 'interval') entry.live = false;
              return (callback as (...values: unknown[]) => unknown).apply(this, args);
            }
          : callback;
      const handle = original.call(view, wrapped, ...rest);
      entry = add(kind, view, kind);
      pending.set(`${kind}:${handle}`, entry);
      return handle;
    };
    (view as unknown as Record<string, unknown>)[clear] = function (handle: number) {
      cancel.call(view, handle);
      const entry = pending.get(`${kind}:${handle}`);
      if (entry) entry.live = false;
      pending.delete(`${kind}:${handle}`);
    };
  }
}

/** Installs the ledger on the page's window; later frames are wrapped by `wrapFrame`. */
export function installLedger(): void {
  if (installed) return;
  installed = true;
  wrapWindow(window);
}

/** Wraps a same-origin frame's window, so that moves into it are recorded too. */
export function wrapFrame(view: Window): void {
  if (installed) wrapWindow(view as Window & typeof globalThis);
}

export const ledgerInstalled = (): boolean => installed;

/** Records where an instance's registrations start; called before its host is created. */
export function markCreation(id: string): void {
  if (installed) creations.set(id, seq);
}

export interface LedgerCounts {
  readonly listener: number;
  readonly observer: number;
  readonly timeout: number;
  readonly interval: number;
  readonly frame: number;
}

/** The live entries per kind, since `since` (a sequence number, default 0). */
export function ledgerCounts(since = 0): LedgerCounts {
  const counts = { listener: 0, observer: 0, timeout: 0, interval: 0, frame: 0 };
  for (const entry of entries) if (entry.live && entry.seq > since) counts[entry.kind] += 1;
  return counts;
}

/** The live entries since `since`, newest last, as plain records. */
export function ledgerEntries(since = 0): Omit<LedgerEntry, 'ref'>[] {
  return entries
    .filter((entry) => entry.live && entry.seq > since)
    .map(({ ref, ...rest }) => {
      void ref;
      return rest;
    });
}

/** The current sequence number, for `ledgerEntries(since)`. */
export const ledgerMark = (): number => seq;

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

/** Whether a registration belongs to the subtree of `host` (its shadow trees included). */
function within(entry: LedgerEntry, host: Element): boolean {
  const target = entry.ref?.deref();
  if (!isNode(target)) return false;
  for (let node: Node | null = target; node;) {
    if (node === host) return true;
    node = node.parentNode ?? (isShadowRoot(node) ? node.host : null);
  }
  return false;
}

/** The engine's own document listener, released with the instance rather than at removal. */
const ENGINE_DOCUMENT_TYPES = new Set(['selectionchange']);

export interface CleanupOptions {
  /** Frames to wait after the removal before the final read; default 3. */
  readonly frames?: number;
  /** Re-append the host where it was once the check ran; default true. */
  readonly restore?: boolean;
}

/**
 * Removes the host of `id` and reports what it left registered (V-584). At the removal, the
 * widget's own registrations must already be gone: no observation of a node in the host's tree
 * outside the editing root, and no window, document or host listener other than the engines'
 * `selectionchange`. After `frames` frames nothing registered since the instance was created may
 * stay: no listener on a window, a document, a shadow root, the host or a window-level target, no
 * observation, no pending timer or frame, and the window's frame loop is at rest. Run it with the
 * other instances idle: window-level registrations cannot be told apart by instance.
 */
export async function assertCleanup(
  id: string,
  host: HTMLElement,
  root: HTMLElement | null,
  options: CleanupOptions = {},
): Promise<Report> {
  if (!installed) return report([check('ledger installed before creation', false, false)]);
  const since = creations.get(id);
  if (since === undefined)
    return report([check('instance created while the ledger was installed', false, id)]);
  const parent = host.parentNode;
  const next = host.nextSibling;
  const view = host.ownerDocument.defaultView ?? window;
  host.remove();
  const atRemoval = entries.filter((entry) => entry.live && entry.seq > since);
  const insideRoot = (entry: LedgerEntry): boolean => {
    const target = entry.ref?.deref();
    return root !== null && isNode(target) && root.contains(target);
  };
  const widgetObservations = atRemoval.filter(
    (entry) => entry.kind === 'observer' && within(entry, host) && !insideRoot(entry),
  );
  const widgetListeners = atRemoval.filter(
    (entry) =>
      entry.kind === 'listener' &&
      !entry.once &&
      !ENGINE_DOCUMENT_TYPES.has(entry.type) &&
      (within(entry, host) ||
        isWindow(entry.ref?.deref()) ||
        (entry.ref?.deref() as Node | undefined)?.nodeType === 9),
  );
  for (let index = 0; index < (options.frames ?? 3); index++) await frame();
  const left = entries.filter(
    (entry) => entry.live && entry.seq > since && !(entry.kind === 'listener' && entry.once),
  );
  const pageLevel = (entry: LedgerEntry): boolean => {
    const target = entry.ref?.deref();
    if (!isNode(target)) return true;
    const document = target.ownerDocument;
    return (
      target.nodeType === 9 || target === document?.documentElement || target === document?.body
    );
  };
  // Listeners and observations count when they belong to the host's tree or the page level;
  // timers and frames always do.
  const attributable = left.filter(
    (entry) =>
      (entry.kind !== 'listener' && entry.kind !== 'observer') ||
      within(entry, host) ||
      pageLevel(entry),
  );
  const loopActive = frameLoopFor(view).active;
  const checks = [
    check(
      "the widget's own observations end at the removal",
      widgetObservations.length === 0,
      widgetObservations.map(({ ref, ...rest }) => (void ref, rest)),
    ),
    check(
      "the widget's own window, document and host listeners end at the removal",
      widgetListeners.length === 0,
      widgetListeners.map(({ ref, ...rest }) => (void ref, rest)),
    ),
    check(
      'nothing registered since creation stays after the release',
      attributable.length === 0,
      attributable.map(({ ref, ...rest }) => (void ref, rest)),
    ),
    check('the frame loop of the window is at rest', !loopActive, loopActive),
  ];
  if (options.restore !== false && parent) parent.insertBefore(host, next);
  return report(checks, {
    since,
    atRemoval: atRemoval.length,
    left: left.length,
    once: entries.filter((entry) => entry.seq > since && entry.once).length,
  });
}
