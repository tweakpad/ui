/**
 * Update cost of inline controls: 40 instances of one control kind in one shadow root, with a
 * controlled value. `counters()` measures what one value change costs (Lit updates, presentation
 * refreshes, style text writes, `querySelectorAll` calls, mutation records and the share of them
 * that rewrite an unchanged value); `startTiming()` changes 30 instances per frame;
 * `safety()` forces a full presentation refresh and reports what it changed. Driven only through
 * the Chrome DevTools MCP (see README.md).
 *
 * `?package` loads `/dist`, `?package=baseline` loads the copy under
 * `/tmp/inline-update-cost/dist-baseline` (see README.md); without it the sources load.
 */
const build = new URL(location.href).searchParams.get('package');
const base =
  build === null ? null : build === 'baseline' ? '/tmp/inline-update-cost/dist-baseline' : '/dist';
const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = base ? `${base}/styles.css` : '/src/styles.css';
document.head.append(style);
// Absolute URLs: a relative dynamic import gains Vite's `?import` query, which would load a
// second instance of the module beside the one the elements import.
const load = (path: string): Promise<unknown> =>
  import(/* @vite-ignore */ new URL(`${base ?? '/src'}/${path}`, location.href).href);
const ext = base ? 'js' : 'ts';
await load(`register.${ext}`);
const { PresentationController } = (await load(
  `presentation/controller.${ext}`,
)) as typeof import('../../../../src/presentation/controller.js');
const { GeneratedStyleResource } = (await load(
  `foundation/generated-style.${ext}`,
)) as typeof import('../../../../src/foundation/generated-style.js');

type Control = HTMLElement & {
  value?: unknown;
  checked?: boolean;
  items?: unknown;
  partPresentation: Record<string, { classHook?: string; styleHook?: Record<string, string> }>;
  updateComplete: Promise<boolean>;
  performUpdate(): void;
  presentationController: { refresh(): void };
};

interface Kind {
  tag: string;
  attributes: Record<string, string>;
  /** The value of change `n`; consecutive changes always differ. */
  value(n: number): unknown;
  property: 'value' | 'checked';
  setup?(element: Control): void;
  /** A part rendered through `renderPart`, carrying the probe hook on instance 0. */
  hookPart: string;
}

const kinds: Record<string, Kind> = {
  slider: {
    tag: 'tp-slider',
    attributes: { variant: 'inline', label: 'Gain', min: '0', max: '100' },
    value: (n) => (n % 2 ? 70 : 30),
    property: 'value',
    hookPart: 'slider-range',
  },
  'input-number': {
    tag: 'tp-input',
    attributes: { variant: 'inline', label: 'Bleed', type: 'number' },
    value: (n) => String(n % 2 ? 12 : 4),
    property: 'value',
    hookPart: 'input-row',
  },
  'input-text': {
    tag: 'tp-input',
    attributes: { variant: 'inline', label: 'Title' },
    value: (n) => (n % 2 ? 'Harbor' : 'Meadow'),
    property: 'value',
    hookPart: 'input-row',
  },
  select: {
    tag: 'tp-select',
    attributes: { variant: 'inline', label: 'Paper' },
    value: (n) => (n % 2 ? 'satin' : 'matte'),
    property: 'value',
    setup: (element) => {
      element.items = [
        { value: 'matte', label: 'Matte' },
        { value: 'satin', label: 'Satin' },
        { value: 'gloss', label: 'Gloss' },
      ];
    },
    hookPart: 'select-trigger',
  },
  checkbox: {
    tag: 'tp-checkbox',
    attributes: { variant: 'inline', label: 'Crop marks' },
    value: (n) => n % 2 === 1,
    property: 'checked',
    hookPart: 'checkbox-indicator',
  },
  switch: {
    tag: 'tp-switch',
    attributes: { variant: 'inline', label: 'Proof' },
    value: (n) => n % 2 === 1,
    property: 'checked',
    hookPart: 'switch-thumb',
  },
  color: {
    tag: 'tp-color-input',
    attributes: { variant: 'inline', label: 'Ink' },
    value: (n) => (n % 2 ? '#1d6f42' : '#b3261e'),
    property: 'value',
    hookPart: 'color-input-row',
  },
};

const COUNT = 40;
const HOOK_CLASS = 'probe-hook';
const HOOK_STYLE = ['outline-offset', '3px'] as const;
const stage = document.querySelector<HTMLElement>('#stage')!;
const root = stage.shadowRoot ?? stage.attachShadow({ mode: 'open' });
let controls: Control[] = [];
let current: Kind | undefined;

const frame = (): Promise<number> => new Promise((resolve) => requestAnimationFrame(resolve));
const task = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const bounded = <T>(promise: Promise<T>, ms = 2000): Promise<T | 'timeout'> =>
  Promise.race([
    promise,
    new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), ms)),
  ]);

/** Every element under the stage, through shadow roots. */
function deepElements(start: Node = root): Element[] {
  const out: Element[] = [];
  const walk = (node: Node): void => {
    for (const child of node.childNodes) {
      if (child.nodeType !== 1) continue;
      out.push(child as Element);
      const shadow = (child as Element).shadowRoot;
      if (shadow) walk(shadow);
      walk(child);
    }
  };
  walk(start);
  return out;
}
const shadowRoots = (): ShadowRoot[] => [
  root,
  ...deepElements()
    .map((element) => element.shadowRoot)
    .filter((shadow): shadow is ShadowRoot => !!shadow),
];
/** Every library element under the stage (the controls and their constituents). */
const libraryElements = (): Control[] =>
  deepElements().filter((element): element is Control => 'presentationController' in element);

async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await bounded(Promise.all(libraryElements().map((element) => element.updateComplete)));
    await frame();
  }
  await task();
}

/** Mounts 40 instances of `kind`; instance 0 carries the probe hook. */
export async function mount(kind: keyof typeof kinds): Promise<{ kind: string; count: number }> {
  current = kinds[kind];
  if (!current) throw new Error(`Unknown kind ${kind}`);
  root.replaceChildren();
  const list = document.createElement('div');
  list.style.cssText = 'display:grid;gap:4px;inline-size:320px';
  controls = Array.from({ length: COUNT }, (_, index) => {
    const element = document.createElement(current!.tag) as Control;
    for (const [name, value] of Object.entries(current!.attributes))
      element.setAttribute(name, value);
    element.setAttribute('aria-label', `${current!.attributes.label} ${index + 1}`);
    current!.setup?.(element);
    (element as unknown as Record<string, unknown>)[current!.property] = current!.value(0);
    if (index === 0)
      element.partPresentation = {
        [current!.hookPart]: {
          classHook: HOOK_CLASS,
          styleHook: { [HOOK_STYLE[0]]: HOOK_STYLE[1] },
        },
      };
    list.append(element);
    return element;
  });
  root.append(list);
  await settle();
  return { kind, count: controls.length };
}

// Instrumentation ------------------------------------------------------------------------------

const counts = { updates: 0, refresh: 0, setText: 0, querySelectorAll: 0 };
let active = false;
function wrap<T extends object>(
  target: T,
  name: keyof T & string,
  counter: keyof typeof counts,
): void {
  const original = target[name] as unknown as (...args: unknown[]) => unknown;
  if ((original as { counted?: boolean }).counted) return;
  const wrapped = function (this: unknown, ...args: unknown[]) {
    if (active) counts[counter]++;
    return original.apply(this, args);
  };
  (wrapped as { counted?: boolean }).counted = true;
  (target as Record<string, unknown>)[name] = wrapped;
}
{
  let proto: object | null = Object.getPrototypeOf(document.createElement('tp-slider'));
  while (proto && !Object.hasOwn(proto, 'performUpdate')) proto = Object.getPrototypeOf(proto);
  if (!proto) throw new Error('No reactive element base');
  wrap(proto as { update(): void }, 'update', 'updates');
  wrap(PresentationController.prototype, 'refresh', 'refresh');
  wrap(GeneratedStyleResource.prototype, 'setText', 'setText');
  wrap(Element.prototype, 'querySelectorAll', 'querySelectorAll');
  wrap(DocumentFragment.prototype, 'querySelectorAll', 'querySelectorAll');
}

interface Classified {
  records: number;
  noop: number;
  /** `attribute name → count` of the no-op records. */
  noopAttributes: Record<string, number>;
}
function classify(records: MutationRecord[]): Classified {
  // A record keeps the old value only; the new one is the next record's old value for the same
  // target and attribute, or the value now.
  const result: Classified = { records: records.length, noop: 0, noopAttributes: {} };
  const later = new Map<Node, Map<string, string | null>>();
  for (let i = records.length - 1; i >= 0; i--) {
    const record = records[i]!;
    let noop = false;
    let key = '';
    if (record.type === 'attributes') {
      const target = record.target as Element;
      key = record.attributeName!;
      const values = later.get(target) ?? new Map<string, string | null>();
      later.set(target, values);
      const next = values.has(key) ? values.get(key)! : target.getAttribute(key);
      noop = next === record.oldValue;
      values.set(key, record.oldValue);
    } else if (record.type === 'characterData') {
      key = '#text';
      noop = record.oldValue === record.target.textContent;
    } else if (record.type === 'childList') {
      key = '#children';
      const removed = [...record.removedNodes];
      const added = [...record.addedNodes];
      noop =
        removed.length === 1 &&
        added.length === 1 &&
        removed[0]!.nodeType === 3 &&
        added[0]!.nodeType === 3 &&
        removed[0]!.textContent === added[0]!.textContent;
    }
    if (noop) {
      result.noop++;
      result.noopAttributes[key] = (result.noopAttributes[key] ?? 0) + 1;
    }
  }
  return result;
}

/** Each instance's last change number: the next value always differs from its current one. */
const changeCounts = new WeakMap<Control, number>();
function change(control: Control): void {
  const n = (changeCounts.get(control) ?? 0) + 1;
  changeCounts.set(control, n);
  (control as unknown as Record<string, unknown>)[current!.property] = current!.value(n);
}

/**
 * 20 single value changes, each a real change on the next instance, with every follow-up
 * update and frame awaited. Returns per-change averages.
 */
export async function counters(changes = 20): Promise<Record<string, unknown>> {
  if (!current) throw new Error('mount() first');
  const records: MutationRecord[] = [];
  const observer = new MutationObserver((list) => records.push(...list));
  for (const shadow of shadowRoots())
    observer.observe(shadow, {
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      childList: true,
      characterData: true,
      characterDataOldValue: true,
    });
  for (const key of Object.keys(counts)) counts[key as keyof typeof counts] = 0;
  let classified: Classified = { records: 0, noop: 0, noopAttributes: {} };
  for (let i = 0; i < changes; i++) {
    const control = controls[i % COUNT]!;
    active = true;
    change(control);
    await settle();
    active = false;
    records.push(...observer.takeRecords());
    const batch = classify(records.splice(0));
    classified = {
      records: classified.records + batch.records,
      noop: classified.noop + batch.noop,
      noopAttributes: Object.fromEntries(
        [
          ...new Set([
            ...Object.keys(classified.noopAttributes),
            ...Object.keys(batch.noopAttributes),
          ]),
        ].map((key) => [
          key,
          (classified.noopAttributes[key] ?? 0) + (batch.noopAttributes[key] ?? 0),
        ]),
      ),
    };
  }
  observer.disconnect();
  const per = (value: number): number => Math.round((value / changes) * 10) / 10;
  return {
    updates: per(counts.updates),
    refresh: per(counts.refresh),
    setText: per(counts.setText),
    querySelectorAll: per(counts.querySelectorAll),
    mutationRecords: per(classified.records),
    noopRecords: per(classified.noop),
    noopAttributes: Object.fromEntries(
      Object.entries(classified.noopAttributes)
        .sort((a, b) => b[1] - a[1])
        .map(([key, value]) => [key, per(value)]),
    ),
  };
}

// Timing ---------------------------------------------------------------------------------------

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0;
};
const quantile = (values: number[], q: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)]! : 0;
};
const round = (value: number, digits = 1): number =>
  Math.round(value * 10 ** digits) / 10 ** digits;

let timing: { state: 'idle' | 'running' | 'done' | 'failed'; result?: unknown; error?: string } = {
  state: 'idle',
};

/**
 * Starts `rounds` rounds of `frames` frames; each frame changes 30 of the 40 instances and flushes
 * each with `performUpdate()`. Poll `timingResult()`; keep the tab in the foreground.
 */
export function startTiming(rounds = 5, frames = 45): { started: boolean } {
  if (!current) throw new Error('mount() first');
  if (timing.state === 'running') return { started: false };
  timing = { state: 'running' };
  void (async () => {
    const perUpdate: number[] = [];
    const frameWork: number[] = [];
    const roundMedians: { perUpdate: number; frame: number }[] = [];
    for (let r = 0; r < rounds; r++) {
      const roundUpdates: number[] = [];
      const roundFrames: number[] = [];
      for (let f = 0; f < frames; f++) {
        const sample = await new Promise<{ sync: number; frame: number }>((resolve) =>
          requestAnimationFrame((stamp) => {
            const start = performance.now();
            for (let i = 0; i < 30; i++) {
              const control = controls[(i + f) % COUNT]!;
              change(control);
              control.performUpdate();
            }
            const sync = performance.now() - start;
            const channel = new MessageChannel();
            channel.port1.onmessage = () => resolve({ sync, frame: performance.now() - stamp });
            channel.port2.postMessage(0);
          }),
        );
        roundUpdates.push((sample.sync * 1000) / 30);
        roundFrames.push(sample.frame);
      }
      await settle();
      // The first frames of a round warm caches; keep the steady state.
      const steadyUpdates = roundUpdates.slice(5);
      const steadyFrames = roundFrames.slice(5);
      perUpdate.push(...steadyUpdates);
      frameWork.push(...steadyFrames);
      roundMedians.push({
        perUpdate: round(median(steadyUpdates)),
        frame: round(median(steadyFrames), 2),
      });
    }
    timing = {
      state: 'done',
      result: {
        usPerUpdate: round(median(perUpdate)),
        frameWorkMedianMs: round(median(frameWork), 2),
        frameWorkP95Ms: round(quantile(frameWork, 0.95), 2),
        rounds: roundMedians,
      },
    };
  })().catch((error: unknown) => {
    timing = { state: 'failed', error: String(error) };
  });
  return { started: true };
}
export const timingResult = (): typeof timing => timing;

// Safety ---------------------------------------------------------------------------------------

function snapshot(): Map<string, string> {
  const out = new Map<string, string>();
  const elements = deepElements();
  elements.forEach((element, index) => {
    const values = [
      'part',
      'class',
      'style',
      'data-tp-presentation-part',
      'data-tp-presentation-owner',
    ]
      .map((name) => `${name}=${element.getAttribute(name) ?? ''}`)
      .join('|');
    out.set(`${index}:${element.localName}`, values);
  });
  shadowRoots().forEach((shadow, index) => {
    out.set(
      `root${index}`,
      shadow.adoptedStyleSheets
        .map((sheet) => [...sheet.cssRules].map((rule) => rule.cssText).join('\n'))
        .join('\n---\n'),
    );
  });
  return out;
}

/**
 * Forces a full presentation refresh on every library element and reports each difference it
 * made, then checks the probe hook on instance 0 is in place on every target of its part.
 */
export async function safety(): Promise<Record<string, unknown>> {
  if (!current) throw new Error('mount() first');
  await settle();
  const before = snapshot();
  const elements = libraryElements();
  for (const element of elements) element.presentationController.refresh();
  await settle();
  const after = snapshot();
  const differences: { key: string; before?: string; after?: string }[] = [];
  for (const key of new Set([...before.keys(), ...after.keys()]))
    if (before.get(key) !== after.get(key))
      differences.push({
        key,
        before: before.get(key)?.slice(0, 300),
        after: after.get(key)?.slice(0, 300),
      });
  const first = controls[0]!;
  const targets = [
    ...(first.shadowRoot?.querySelectorAll<HTMLElement>(`[part~="${current.hookPart}"]`) ?? []),
  ];
  const hookIntact =
    targets.length > 0 &&
    targets.every(
      (target) =>
        target.classList.contains(HOOK_CLASS) &&
        target.style.getPropertyValue(HOOK_STYLE[0]) === HOOK_STYLE[1],
    );
  return {
    controllers: elements.length,
    differences: differences.length,
    detail: differences.slice(0, 8),
    hookTargets: targets.length,
    hookIntact,
  };
}

/** Whether the probe hook is on every target of its part now, without a forced refresh. */
export function hookIntact(): { targets: number; intact: boolean } {
  const first = controls[0]!;
  const targets = [
    ...(first.shadowRoot?.querySelectorAll<HTMLElement>(`[part~="${current!.hookPart}"]`) ?? []),
  ];
  return {
    targets: targets.length,
    intact:
      targets.length > 0 &&
      targets.every(
        (target) =>
          target.classList.contains(HOOK_CLASS) &&
          target.style.getPropertyValue(HOOK_STYLE[0]) === HOOK_STYLE[1],
      ),
  };
}

Object.assign(window, {
  inlineUpdateCost: {
    build: build ?? 'source',
    kinds: Object.keys(kinds),
    mount,
    counters,
    startTiming,
    timingResult,
    safety,
    hookIntact,
  },
});
document.documentElement.dataset.fixtureReady = '';
