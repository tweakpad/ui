/**
 * Performance probes of the text editor fixtures (C-443, C-444, C-449, C-450): keystroke
 * processing from Event Timing, layout passes and state publications per frame, pointer-move
 * handling, overlay mutations and long tasks. Each probe starts and stops around real input that
 * the Chrome DevTools MCP drives (`type_text`, `hover`, `drag`); the budget helpers turn the
 * results into reports. Driven only through the Chrome DevTools MCP (see README.md).
 */
import { composedContains, deepActiveElement } from '../../../../src/foundation/focus.js';
import { observeOverlayPasses } from '../../../../src/widgets/text-editor/geometry.js';
import { check, fixture, report, type Report } from './harness.js';

// Instances -----------------------------------------------------------------------------------

/** Extra probe targets beside the fixture instances: the bare engines' editing roots. */
const extraTargets = new Map<string, HTMLElement>();

/** Registers an element (a bare engine's root) under `id` for the probes. */
export function registerProbeTarget(id: string, element: HTMLElement): void {
  extraTargets.set(id, element);
}

/** The instance or registered target that holds `node`, through shadow roots; null for none. */
export function probeTargetOf(node: Node | null): string | null {
  if (!node) return null;
  for (const [id, editor] of fixture.editors) if (composedContains(editor.host, node)) return id;
  for (const [id, element] of extraTargets) if (composedContains(element, node)) return id;
  return null;
}

// Statistics ----------------------------------------------------------------------------------

export interface Stats {
  readonly count: number;
  readonly median: number;
  readonly p95: number;
  readonly max: number;
}

const round = (value: number): number => Math.round(value * 100) / 100;

export function stats(values: readonly number[]): Stats {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (quantile: number): number =>
    sorted.length === 0
      ? 0
      : sorted[Math.min(sorted.length - 1, Math.ceil(quantile * sorted.length) - 1)]!;
  return {
    count: sorted.length,
    median: round(at(0.5)),
    p95: round(at(0.95)),
    max: round(sorted.at(-1) ?? 0),
  };
}

/** The total length of the union of intervals. */
function unionLength(intervals: readonly (readonly [number, number])[]): number {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let start = -Infinity;
  let end = -Infinity;
  for (const [from, to] of sorted) {
    if (from > end) {
      if (end > start) total += end - start;
      start = from;
      end = to;
    } else end = Math.max(end, to);
  }
  if (end > start) total += end - start;
  return total;
}

// Keystrokes (V-588) --------------------------------------------------------------------------

interface EventTimingEntry extends PerformanceEntry {
  readonly processingStart: number;
  readonly processingEnd: number;
}

const KEY_EVENTS = new Set(['keydown', 'keypress', 'beforeinput', 'input', 'keyup']);

interface TypingProbe {
  readonly observer: PerformanceObserver;
  readonly entries: EventTimingEntry[];
  /** The instance focused at each keydown, by the event's time stamp. */
  readonly owners: Map<number, string | null>;
  readonly stop: () => void;
}
let typing: TypingProbe | null = null;

/**
 * Starts recording the processing time of keystrokes: Event Timing entries of `keydown`,
 * `keypress`, `beforeinput`, `input` and `keyup`, each keystroke attributed to the instance whose
 * editing root held focus at its `keydown`. A no-op window `input` listener runs on every page
 * alike, so that the engine's own work after the input falls inside a processing window.
 */
export function startTypingProbe(): void {
  stopTypingProbe();
  const entries: EventTimingEntry[] = [];
  const owners = new Map<number, string | null>();
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as EventTimingEntry[])
      if (KEY_EVENTS.has(entry.name)) entries.push(entry);
  });
  observer.observe({
    type: 'event',
    durationThreshold: 16,
    buffered: false,
  } as PerformanceObserverInit);
  const keydown = (event: Event): void => {
    owners.set(event.timeStamp, probeTargetOf(deepActiveElement(document)));
  };
  const flush = (): void => undefined;
  window.addEventListener('keydown', keydown, true);
  window.addEventListener('input', flush);
  typing = {
    observer,
    entries,
    owners,
    stop: () => {
      window.removeEventListener('keydown', keydown, true);
      window.removeEventListener('input', flush);
    },
  };
}

export interface TypingResult {
  /** Per instance: the processing time of each keystroke (the union of its windows), in ms. */
  readonly byInstance: Readonly<Record<string, Stats & { readonly values: readonly number[] }>>;
  /** Keystrokes that no instance held. */
  readonly unattributed: number;
}

/** Stops the keystroke probe and groups its entries: a keystroke runs from one keydown to the next. */
export function stopTypingProbe(): TypingResult {
  const probe = typing;
  typing = null;
  if (!probe) return { byInstance: {}, unattributed: 0 };
  for (const entry of probe.observer.takeRecords() as EventTimingEntry[])
    if (KEY_EVENTS.has(entry.name)) probe.entries.push(entry);
  probe.observer.disconnect();
  probe.stop();
  const sorted = [...probe.entries].sort((a, b) => a.startTime - b.startTime);
  const groups: { owner: string | null; windows: [number, number][] }[] = [];
  for (const entry of sorted) {
    if (entry.name === 'keydown' || groups.length === 0)
      groups.push({ owner: probe.owners.get(entry.startTime) ?? null, windows: [] });
    groups.at(-1)!.windows.push([entry.processingStart, entry.processingEnd]);
  }
  const values = new Map<string, number[]>();
  let unattributed = 0;
  for (const { owner, windows } of groups) {
    if (!owner) {
      unattributed += 1;
      continue;
    }
    let list = values.get(owner);
    if (!list) values.set(owner, (list = []));
    list.push(round(unionLength(windows)));
  }
  return {
    byInstance: Object.fromEntries(
      [...values].map(([id, list]) => [id, { ...stats(list), values: list }]),
    ),
    unattributed,
  };
}

/** The keystroke budgets (C-450): widget minus bare engine, and the absolute p95 at 500 blocks. */
export const TYPING_BUDGETS = Object.freeze({
  500: { median: 3, p95: 8, absoluteP95: 16 },
  2000: { median: 5, p95: 12, absoluteP95: null },
});

/**
 * Checks a widget instance's keystrokes against a bare engine's at a document size (500 or 2,000
 * blocks; other sizes use the nearer budget). Run each at 1×; record the 4× values without budget.
 */
export function typingBudget(
  result: TypingResult,
  widget: string,
  baseline: string,
  blocks: number,
): Report {
  const budget = blocks <= 1000 ? TYPING_BUDGETS[500] : TYPING_BUDGETS[2000];
  const ours = result.byInstance[widget];
  const bare = result.byInstance[baseline];
  if (!ours || !bare)
    return report([check('both instances typed', false, { widget: !!ours, baseline: !!bare })]);
  const median = round(ours.median - bare.median);
  const p95 = round(ours.p95 - bare.p95);
  const checks = [
    check('at least 20 keystrokes each', ours.count >= 20 && bare.count >= 20, [
      ours.count,
      bare.count,
    ]),
    check(`median over the bare engine ≤ ${budget.median} ms`, median <= budget.median, median),
    check(`p95 over the bare engine ≤ ${budget.p95} ms`, p95 <= budget.p95, p95),
  ];
  if (budget.absoluteP95 !== null)
    checks.push(
      check(`absolute p95 ≤ ${budget.absoluteP95} ms`, ours.p95 <= budget.absoluteP95, ours.p95),
    );
  return report(checks, { widget: ours, baseline: bare, blocks });
}

// Frames (C-443, C-444) -----------------------------------------------------------------------

interface FrameProbe {
  /** Overlay passes by instance and frame time. */
  readonly passes: Map<string, Map<number, number>>;
  readonly publications: Map<string, Map<number, number>>;
  readonly longTasks: { readonly start: number; readonly duration: number }[];
  readonly release: () => void;
  frame: number;
}
let frames: FrameProbe | null = null;

/**
 * Starts counting, per animation frame, the overlay layout passes and the state publications of
 * each instance (all by default), and the long tasks of the page.
 */
export function startFrameProbe(ids: readonly string[] = [...fixture.editors.keys()]): void {
  stopFrameProbe();
  const publications = new Map<string, Map<number, number>>();
  const releases: (() => void)[] = [];
  const passCounts = new Map<string, Map<number, number>>();
  const probe: FrameProbe = {
    passes: passCounts,
    publications,
    longTasks: [],
    release: () => {
      for (const release of releases) release();
    },
    frame: 0,
  };
  for (const id of ids) {
    const editor = fixture.editors.get(id);
    if (!editor) continue;
    const counts = new Map<number, number>();
    publications.set(id, counts);
    let first = true;
    const unsubscribe = (
      editor as {
        subscribe?: (selector: (state: unknown) => unknown, cb: () => void) => () => void;
      }
    ).subscribe?.(
      (state) => state,
      () => {
        // The subscription's own first call is no publication.
        if (first) {
          first = false;
          return;
        }
        counts.set(probe.frame, (counts.get(probe.frame) ?? 0) + 1);
      },
    );
    if (unsubscribe) releases.push(unsubscribe);
  }
  const contents = new Map<HTMLElement, string>();
  for (const id of ids) {
    const editor = fixture.editors.get(id);
    try {
      if (editor) contents.set(editor.container, id);
    } catch {
      // Not rendered yet: its passes count under '?'.
    }
  }
  releases.push(
    observeOverlayPasses(({ content, time }) => {
      const id = contents.get(content) ?? '?';
      let counts = passCounts.get(id);
      if (!counts) passCounts.set(id, (counts = new Map()));
      counts.set(time, (counts.get(time) ?? 0) + 1);
    }),
  );
  let handle = 0;
  const tick = (): void => {
    probe.frame += 1;
    handle = requestAnimationFrame(tick);
  };
  handle = requestAnimationFrame(tick);
  releases.push(() => cancelAnimationFrame(handle));
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        probe.longTasks.push({ start: entry.startTime, duration: round(entry.duration) });
    });
    observer.observe({ type: 'longtask', buffered: false });
    releases.push(() => observer.disconnect());
  } catch {
    // No long-task entries in this browser.
  }
  frames = probe;
}

/**
 * Stops the frame probe: at most one layout pass and one publication per instance and frame, no
 * long task over 50 ms.
 */
export function stopFrameProbe(): Report {
  const probe = frames;
  frames = null;
  if (!probe) return report([check('frame probe started', false, false)]);
  probe.release();
  const maxOf = (map: Map<string, Map<number, number>>) =>
    Object.fromEntries([...map].map(([id, counts]) => [id, Math.max(0, ...counts.values())]));
  const totalOf = (map: Map<string, Map<number, number>>) =>
    Object.fromEntries(
      [...map].map(([id, counts]) => [id, [...counts.values()].reduce((a, b) => a + b, 0)]),
    );
  const maxPasses = maxOf(probe.passes);
  const maxPublications = maxOf(probe.publications);
  return report(
    [
      check(
        'at most one layout pass per instance and frame',
        Object.values(maxPasses).every((max) => max <= 1),
        maxPasses,
      ),
      check(
        'at most one state publication per instance and frame',
        Object.values(maxPublications).every((max) => max <= 1),
        maxPublications,
      ),
      check('no long task', probe.longTasks.length === 0, probe.longTasks),
    ],
    {
      passes: totalOf(probe.passes),
      publications: totalOf(probe.publications),
      frames: probe.frame,
    },
  );
}

// Pointer moves (V-589) -----------------------------------------------------------------------

interface PointerProbe {
  readonly values: Map<string, number[]>;
  readonly release: () => void;
}
let pointer: PointerProbe | null = null;

/**
 * Starts timing the handling of each `pointermove`: from a window capture listener to a window
 * bubble listener, which brackets every handler of the widget (the gutter's hit test included),
 * attributed to the instance under the pointer.
 */
export function startPointerProbe(): void {
  stopPointerProbe();
  const values = new Map<string, number[]>();
  let start = 0;
  const before = (): void => {
    start = performance.now();
  };
  const after = (event: Event): void => {
    const elapsed = performance.now() - start;
    const id = probeTargetOf(event.composedPath()[0] as Node | null);
    if (!id) return;
    let list = values.get(id);
    if (!list) values.set(id, (list = []));
    list.push(round(elapsed));
  };
  window.addEventListener('pointermove', before, true);
  window.addEventListener('pointermove', after);
  pointer = {
    values,
    release: () => {
      window.removeEventListener('pointermove', before, true);
      window.removeEventListener('pointermove', after);
    },
  };
}

/** Stops the pointer probe; `budget` (ms, default 1) bounds each instance's p95. */
export function stopPointerProbe(budget = 1): Report {
  const probe = pointer;
  pointer = null;
  if (!probe) return report([check('pointer probe started', false, false)]);
  probe.release();
  const byInstance = Object.fromEntries([...probe.values].map(([id, list]) => [id, stats(list)]));
  return report(
    Object.entries(byInstance).map(([id, value]) =>
      check(`${id}: pointer-move handling p95 ≤ ${budget} ms`, value.p95 <= budget, value),
    ),
    { byInstance },
  );
}

/**
 * Times the handling of `count` synthetic pointer moves over the centers of the instance's first
 * blocks in the viewport (recorded as synthetic: dispatched events skip the browser's hit test).
 */
export function hoverSweep(id: string, count = 20): Stats {
  const editor = fixture.editors.get(id);
  const root = editor?.root;
  if (!editor || !root) return stats([]);
  const viewport =
    editor.shadow.querySelector<HTMLElement>('[part~="text-editor-viewport"]') ?? root;
  const box = viewport.getBoundingClientRect();
  const blocks = [...root.children]
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.bottom > box.top && rect.top < box.bottom)
    .slice(0, count);
  const values: number[] = [];
  for (const rect of blocks) {
    const start = performance.now();
    viewport.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        composed: true,
        pointerType: 'mouse',
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }),
    );
    values.push(performance.now() - start);
  }
  return stats(values);
}

// Overlay mutations (V-589) -------------------------------------------------------------------

let overlayWatch: { observer: MutationObserver; counts: Map<string, number> } | null = null;

/** Starts counting child-list mutations in the overlay and underlay layers of the instances. */
export function startOverlayWatch(ids: readonly string[] = [...fixture.editors.keys()]): void {
  stopOverlayWatch();
  const counts = new Map<string, number>();
  const owners = new Map<Node, string>();
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type !== 'childList') continue;
      let node: Node | null = record.target;
      while (node && !owners.has(node)) node = node.parentNode;
      const id = node ? owners.get(node)! : '?';
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  });
  for (const id of ids) {
    const shadow = fixture.editors.get(id)?.host.shadowRoot;
    if (!shadow) continue;
    counts.set(id, 0);
    for (const layer of shadow.querySelectorAll('[part~="text-editor-overlay"], .underlay')) {
      owners.set(layer, id);
      observer.observe(layer, { childList: true, subtree: true });
    }
  }
  overlayWatch = { observer, counts };
}

/** Stops the overlay watch: no child-list mutation after warm-up (pooled marks are hidden). */
export function stopOverlayWatch(): Report {
  const watch = overlayWatch;
  overlayWatch = null;
  if (!watch) return report([check('overlay watch started', false, false)]);
  watch.observer.disconnect();
  const counts = Object.fromEntries(watch.counts);
  return report(
    [
      check(
        'no overlay child-list mutation',
        Object.values(counts).every((n) => n === 0),
        counts,
      ),
    ],
    { counts },
  );
}
