/**
 * The element-backed fixture editor of `index.html`: the facade the page helpers read
 * (`FixtureEditorLike`) over a `tp-text-editor`, with its engine wrapped by the harness's one
 * recorder, plus the page helpers and the element-backed assertions (`uwg-te-req-engine-9`,
 * `uwg-te-tab-engine-r12`). Nothing here touches the DOM at import, so the pure helpers load in
 * Node. Driven only through the Chrome DevTools MCP (see README.md).
 */
import type { TextEditorAction } from '../../../../src/foundation/text-editor/actions.js';
import type {
  TextEditorRequestOutcome,
  TextEditorStatus,
} from '../../../../src/foundation/text-editor/controller.js';
import type {
  TextEditorContentOptions,
  TextEditorEngine,
  TextEditorEngineContext,
  TextEditorEngineInstance,
  TextEditorFormat,
  TextEditorRootAttributes,
  TextEditorSnapshot,
} from '../../../../src/foundation/text-editor/engine.js';
import {
  resolveTextEditorLayout,
  type TextEditorLayout,
} from '../../../../src/foundation/text-editor/layout.js';
import type { TextEditorEngineState } from '../../../../src/foundation/text-editor/model.js';
import type { TextEditorNodeDefinition } from '../../../../src/foundation/text-editor/nodes.js';
import type { TextEditorStrings } from '../../../../src/foundation/text-editor/strings.js';
import type {
  TextEditorTool,
  TextEditorToolRegistry,
} from '../../../../src/foundation/text-editor/tools.js';
import { observeOverlayPasses } from '../../../../src/widgets/text-editor/geometry.js';
import { observeTextEditorLanes } from '../../../../src/widgets/text-editor/views/lanes.js';
import { ignoreListener, markCreation } from './ledger.js';
import type { TpTextEditor } from '../../../../src/widgets/text-editor/text-editor.js';
import type {
  TextEditorFocusOptions,
  TextEditorImageUpload,
} from '../../../../src/widgets/text-editor/types.js';
import { assertNoForeignNodes, shadowRoots } from './api.js';
import type { EngineVariant, FixtureEngines } from './engine-modules.js';
import {
  check,
  EVENT_NAMES,
  fixture,
  FixtureEditor,
  nestInLevels,
  nodeLabel,
  recordEngine,
  report,
  resolveFixtureTools,
  settle,
  summarize,
  type CallRecord,
  type Check,
  type EngineName,
  type EngineRecorderSink,
  type EventRecord,
  type FixtureEditorLike,
  type Report,
  type RunOptions,
} from './harness.js';

export type ElementVariant =
  | 'default'
  | 'empty'
  | 'readonly'
  | 'disabled'
  | 'long'
  | 'long-readonly'
  | 'long-disabled'
  | 'auto'
  | 'auto-disabled'
  | 'form'
  | 'outside-form'
  | 'field'
  | 'rtl'
  | 'narrow'
  | 'dialog'
  | 'reduced'
  | 'custom'
  | 'upload'
  | 'mention'
  | 'late'
  | 'failing'
  | 'late-json'
  | 'late-markdown'
  | 'late-text'
  | 'no-engine'
  | 'swap'
  | 'created'
  | 'nested'
  | 'closed-root'
  | 'container'
  | 'large'
  | 'csp';

export interface ElementFixtureEditorOptions {
  readonly id: string;
  readonly variant: ElementVariant;
  /** The engine the instance is built for (its configured engine); null for `#no-engine`. */
  readonly engineName: EngineName | null;
  /** The engine assigned before connection (wrapped by the recorder); null leaves it unassigned. */
  readonly engine: TextEditorEngine | null;
  /** The engine `assign()` and `engine = 'default'` use when `engine` is null at construction. */
  readonly configured?: TextEditorEngine | null | undefined;
  /** Where the host is appended (already inside the level frames and any section markup). */
  readonly parent: HTMLElement;
  readonly levels: readonly HTMLElement[];
  /** Set with `setAttribute` before connection. */
  readonly attributes?: Readonly<Record<string, string>> | undefined;
  readonly defaultValue?: string | object | null | undefined;
  readonly nodes?: readonly TextEditorNodeDefinition[] | undefined;
  readonly tools?: readonly TextEditorTool[] | undefined;
  readonly layout?: Partial<TextEditorLayout> | null | undefined;
  readonly strings?: Partial<TextEditorStrings> | null | undefined;
  readonly imageUpload?: TextEditorImageUpload | null | undefined;
  /** Default true: appended at construction. */
  readonly connect?: boolean | undefined;
}

/** The widget's seven events (the harness logs its host hooks under the same names). */
const ELEMENT_EVENTS = [
  EVENT_NAMES.request,
  EVENT_NAMES.requestFailed,
  EVENT_NAMES.valueChange,
  EVENT_NAMES.valueCommit,
  EVENT_NAMES.ready,
  EVENT_NAMES.error,
  EVENT_NAMES.diagnostic,
] as const;

interface RootCall {
  readonly time: number;
  readonly attributes?: TextEditorRootAttributes;
  readonly editable?: boolean;
}

/** Every element-backed instance, by id. */
const elementEditors = new Map<string, ElementFixtureEditor>();

/** One instance over a `tp-text-editor`, its engine wrapped by the harness's recorder. */
export class ElementFixtureEditor implements FixtureEditorLike {
  readonly id: string;
  readonly variant: ElementVariant;
  readonly engineName: EngineName | null;
  readonly levels: readonly HTMLElement[];
  readonly host: TpTextEditor;
  /** When true, a listener cancels every `tp-text-editor-request` and logs it as cancelled. */
  cancelRequests = false;

  readonly #parent: HTMLElement;
  readonly #configured: TextEditorEngine | null;
  #engine: TextEditorEngine | null = null;
  #live: TextEditorEngineInstance | null = null;
  #context: TextEditorEngineContext | null = null;
  #mountContainer: HTMLElement | null = null;
  #mounts = 0;
  /** The mount whose outcome (ready or error) arrived last; `settled()` compares it with `#mounts`. */
  #settledMount = 0;
  /** An engine was assigned and its mount has not been recorded yet. */
  #pendingMount = false;
  #waiters: (() => void)[] = [];
  #hold: { readonly promise: Promise<void>; readonly release: () => void } | null = null;
  #rootCalls: RootCall[] = [];
  readonly #calls = new Map<string, CallRecord[]>();
  readonly #events: EventRecord[] = [];
  readonly #raw: { readonly type: string; readonly detail: unknown }[] = [];
  readonly #sink: EngineRecorderSink = {
    call: (name, record, args) => {
      if (name === 'mount') {
        this.#mounts += 1;
        this.#pendingMount = false;
        this.#mountContainer = (args[0] as HTMLElement | undefined) ?? null;
        this.#rootCalls = [];
      }
      if (name === 'setRootAttributes')
        this.#rootCalls.push({
          time: performance.now(),
          attributes: args[0] as TextEditorRootAttributes,
        });
      if (name === 'setEditable')
        this.#rootCalls.push({ time: performance.now(), editable: args[0] === true });
      let list = this.#calls.get(name);
      if (!list) this.#calls.set(name, (list = []));
      list.push(record);
    },
    attach: (instance, context) => {
      this.#live = instance;
      this.#context = context;
    },
    detach: (instance) => {
      if (this.#live !== instance) return;
      this.#live = null;
      this.#context = null;
    },
    hold: () => this.#hold?.promise ?? null,
  };

  constructor(options: ElementFixtureEditorOptions) {
    markCreation(options.id);
    this.id = options.id;
    this.variant = options.variant;
    this.engineName = options.engineName;
    this.levels = options.levels;
    this.#parent = options.parent;
    this.#configured = options.configured ?? options.engine;
    const host = document.createElement('tp-text-editor');
    host.id = options.id;
    this.host = host;
    ignoreListener(this.#onEvent);
    for (const type of ELEMENT_EVENTS) host.addEventListener(type, this.#onEvent);
    for (const [name, value] of Object.entries(options.attributes ?? {}))
      host.setAttribute(name, value);
    if (options.defaultValue !== undefined) host.defaultValue = options.defaultValue;
    if (options.nodes) host.nodes = options.nodes;
    if (options.tools) host.tools = options.tools;
    if (options.layout !== undefined) host.layout = options.layout;
    if (options.strings !== undefined) host.strings = options.strings;
    if (options.imageUpload !== undefined) host.imageUpload = options.imageUpload;
    if (options.engine) this.engine = options.engine;
    elementEditors.set(this.id, this);
    if (options.connect !== false) this.connect();
  }

  readonly #onEvent = (event: Event): void => {
    const detail = (event as CustomEvent<unknown>).detail;
    if (event.type === EVENT_NAMES.request && this.cancelRequests) event.preventDefault();
    const summary = summarize(detail);
    this.#events.push({
      type: event.type,
      time: performance.now(),
      detail: {
        ...(summary !== null && typeof summary === 'object' ? summary : { detail: summary }),
        cancelable: event.cancelable,
        cancelled: event.defaultPrevented,
      },
    });
    this.#raw.push({ type: event.type, detail });
    const reason = (detail as { reason?: unknown } | null)?.reason;
    if (typeof reason === 'string')
      reasonLog.push({ id: this.id, type: event.type, reason, time: performance.now() });
    if (event.type === EVENT_NAMES.ready || event.type === EVENT_NAMES.error) {
      this.#settledMount = this.#mounts;
      const waiters = this.#waiters;
      this.#waiters = [];
      for (const resolve of waiters) resolve();
    }
  };

  // FixtureEditorLike -----------------------------------------------------------------------

  get shadow(): ShadowRoot {
    const shadow = this.host.shadowRoot;
    if (!shadow) throw new Error(`"${this.id}" has not rendered yet.`);
    return shadow;
  }
  get container(): HTMLElement {
    const container = this.host.shadowRoot?.querySelector<HTMLElement>(
      '[part~="text-editor-content"]',
    );
    if (!container) throw new Error(`"${this.id}" has not rendered yet.`);
    return container;
  }
  /** The editing root: the content part's only element child, with the textbox role. */
  get root(): HTMLElement | null {
    if (!this.#live) return null;
    const container = this.host.shadowRoot?.querySelector<HTMLElement>(
      '[part~="text-editor-content"]',
    );
    if (!container || container.childElementCount !== 1) return null;
    const child = container.firstElementChild as HTMLElement;
    return child.getAttribute('role') === 'textbox' ? child : null;
  }
  get instance(): TextEditorEngineInstance | null {
    return this.#live;
  }
  get status(): TextEditorStatus {
    return (this.host.getAttribute('data-status') as TextEditorStatus | null) ?? 'idle';
  }
  get state(): TextEditorEngineState {
    return this.host.state;
  }
  /** The engine last assigned through this editor, unwrapped. */
  get engine(): TextEditorEngine | null {
    return this.#engine;
  }
  /** Wraps the engine with the recorder; `'default'` restores the configured engine. */
  set engine(engine: TextEditorEngine | null | 'default') {
    const next = engine === 'default' ? this.#configured : engine;
    this.#engine = next;
    this.#pendingMount = next !== null;
    this.host.engine = next ? recordEngine(next, this.#sink) : null;
  }
  get nodes(): readonly TextEditorNodeDefinition[] {
    return this.host.nodes;
  }
  set nodes(nodes: readonly TextEditorNodeDefinition[]) {
    this.host.nodes = nodes;
  }
  get registry(): TextEditorToolRegistry {
    return resolveFixtureTools({
      engine: this.host.engine,
      nodes: this.host.nodes,
      tools: this.host.tools,
      layout: null,
    }).registry;
  }
  get resolvedLayout(): TextEditorLayout {
    return resolveTextEditorLayout(this.host.layout, this.registry).layout;
  }
  get readOnly(): boolean {
    return this.host.readOnly;
  }
  set readOnly(readOnly: boolean) {
    this.host.readOnly = readOnly;
  }
  get disabled(): boolean {
    return this.host.disabled;
  }
  set disabled(disabled: boolean) {
    this.host.disabled = disabled;
  }

  /** The element's `run`: `focus` is ignored; another surface or reason cannot be expressed. */
  run(
    target: string | TextEditorAction | readonly TextEditorAction[],
    options: RunOptions = {},
  ): Promise<TextEditorRequestOutcome> {
    if (
      (options.surface ?? 'api') !== 'api' ||
      (options.reason ?? 'imperative-action') !== 'imperative-action'
    )
      throw new TypeError(
        'The element runs requests with surface "api" and reason "imperative-action" only.',
      );
    return this.host.run(target, {
      ...('value' in options ? { value: options.value } : {}),
      sourceEvent: options.sourceEvent,
    });
  }
  setContent(content: unknown, format?: TextEditorFormat): Promise<TextEditorRequestOutcome> {
    return this.host.setContent(content as string | object, format);
  }
  getContent(format?: TextEditorFormat, options?: TextEditorContentOptions): unknown {
    if (options) return this.#live?.getContent(format ?? 'html', options) ?? null;
    return this.host.getContent(format);
  }
  /** One `content.set` request: its events and one history step. */
  restoreContent(content: unknown, format?: TextEditorFormat): Promise<TextEditorRequestOutcome> {
    return this.host.setContent(content as string | object, format);
  }
  can(action: TextEditorAction): boolean {
    const live = this.#live;
    if (!live || this.status !== 'ready') return false;
    try {
      return live.can(action) === true;
    } catch {
      return false;
    }
  }
  /** Resolves once the current mount reported ready or error, then after the element's update. */
  settled(): Promise<TextEditorStatus> {
    const done = async () => {
      // The outcome event comes before the element requests its update: wait a task first.
      await new Promise((resolve) => setTimeout(resolve, 0));
      await this.host.updateComplete;
      return this.status;
    };
    if (!this.host.engine) return done();
    if (!this.#pendingMount && this.#mounts > 0 && this.#settledMount === this.#mounts)
      return done();
    return new Promise((resolve) => this.#waiters.push(() => void done().then(resolve)));
  }
  /** A fresh recorded wrapper of the same engine: the element remounts with the content kept. */
  remount(): Promise<TextEditorStatus> {
    if (this.#engine) {
      this.#pendingMount = true;
      this.host.engine = recordEngine(this.#engine, this.#sink);
    }
    return this.settled();
  }
  calls(): Record<string, CallRecord[]> {
    return Object.fromEntries([...this.#calls].map(([name, list]) => [name, [...list]]));
  }
  callCounts(): Record<string, number> {
    return Object.fromEntries([...this.#calls].map(([name, list]) => [name, list.length]));
  }
  events(): EventRecord[] {
    return [...this.#events];
  }
  rawEvents(): { readonly type: string; readonly detail: unknown }[] {
    return [...this.#raw];
  }
  clear(): void {
    this.#calls.clear();
    this.#events.length = 0;
    this.#raw.length = 0;
  }
  /** Every `setRootAttributes` argument since the current mount, merged. */
  rootAttributeRecord(): TextEditorRootAttributes {
    return mergeRootAttributes(
      this.#rootCalls.flatMap((call) => (call.attributes ? [call.attributes] : [])),
    );
  }

  /** The raw `setRootAttributes` and `setEditable` arguments recorded since `time`. */
  rootCallsSince(time: number): {
    readonly records: TextEditorRootAttributes[];
    readonly editable: boolean[];
  } {
    const calls = this.#rootCalls.filter((call) => call.time >= time);
    return {
      records: calls.flatMap((call) => (call.attributes ? [call.attributes] : [])),
      editable: calls.flatMap((call) => (call.editable === undefined ? [] : [call.editable])),
    };
  }

  // Element-only ------------------------------------------------------------------------------

  get label(): string {
    return this.host.label;
  }
  set label(label: string) {
    this.host.label = label;
  }
  get placeholder(): string {
    return this.host.placeholder;
  }
  set placeholder(placeholder: string) {
    this.host.placeholder = placeholder;
  }
  get tools(): readonly TextEditorTool[] {
    return this.host.tools;
  }
  set tools(tools: readonly TextEditorTool[]) {
    this.host.tools = tools;
  }
  get layout(): TextEditorLayout {
    return this.host.layout;
  }
  set layout(layout: Partial<TextEditorLayout> | null) {
    this.host.layout = layout;
  }
  get mounts(): number {
    return this.#mounts;
  }
  get value(): TextEditorSnapshot | null {
    return this.host.value;
  }
  get native(): unknown {
    return this.host.native;
  }
  /** The container the last `mount` received. */
  get mountContainer(): HTMLElement | null {
    return this.#mountContainer;
  }
  subscribe<S>(
    selector: (state: TextEditorEngineState) => S,
    callback: (selected: S) => void,
  ): () => void {
    return this.host.subscribe(selector, callback);
  }
  focus(options?: TextEditorFocusOptions): void {
    this.host.focus(options);
  }
  blur(): void {
    this.host.blur();
  }
  connect(): void {
    if (!this.host.isConnected) this.#parent.append(this.host);
  }
  disconnect(): void {
    this.host.remove();
  }
  /** Holds the next mounts until `releaseMount()`, or for `ms` when given. */
  holdMount(ms?: number): void {
    if (!this.#hold) {
      let release!: () => void;
      const promise = new Promise<void>((resolve) => (release = resolve));
      this.#hold = { promise, release };
    }
    if (ms !== undefined) setTimeout(() => this.releaseMount(), ms);
  }
  releaseMount(): void {
    const hold = this.#hold;
    this.#hold = null;
    hold?.release();
  }
  /** Reports a fatal error through the live mount's recorded context; false without one. */
  fatal(error?: unknown): boolean {
    if (!this.#context) return false;
    this.#context.error(error ?? new Error('fatal'));
    return true;
  }
}

/** The element-backed instance of `id`; throws when `id` is a harness instance or unknown. */
export function elementEditorOf(id: string): ElementFixtureEditor {
  const editor = elementEditors.get(id);
  if (!editor || fixture.editors.get(id) !== editor)
    throw new Error(`No element-backed instance "${id}" on this page.`);
  return editor;
}

// Page state --------------------------------------------------------------------------------

/** The page elements that live inside level shadow roots (`getElementById` cannot reach them). */
export interface FixturePageElements {
  readonly notesForm: HTMLFormElement | null;
  readonly notesFieldset: HTMLFieldSetElement | null;
  readonly otherForm: HTMLFormElement | null;
  readonly lateForm: HTMLFormElement | null;
  readonly fieldForms: Readonly<Record<string, HTMLFormElement>>;
  readonly fields: Readonly<Record<string, HTMLElement>>;
  readonly dialogs: Readonly<Record<string, HTMLElement>>;
  readonly markdownReference: HTMLElement | null;
  readonly mount: HTMLElement;
}

/** What `fixture.ts` hands over once the engines loaded and the chrome exists. */
export interface ElementFixturePage {
  readonly engines: FixtureEngines;
  readonly elements: FixturePageElements;
}

let page: ElementFixturePage | null = null;
let installed = false;

/** Called by `fixture.ts` before the instances are built. */
export function bindElementFixturePage(value: ElementFixturePage): void {
  page = value;
}

function currentPage(): ElementFixturePage {
  if (!page) throw new Error('The fixture page is not built yet.');
  return page;
}

export interface ReasonRecord {
  readonly id: string;
  readonly type: string;
  readonly reason: string;
  readonly time: number;
}
const reasonLog: ReasonRecord[] = [];

export interface LayoutShiftRecord {
  readonly value: number;
  readonly startTime: number;
  readonly hadRecentInput: boolean;
  readonly sources: readonly {
    readonly node: string;
    readonly previous: unknown;
    readonly current: unknown;
  }[];
}
const shiftLog: LayoutShiftRecord[] = [];

interface PassEntry {
  readonly content: HTMLElement;
  readonly time: number;
  readonly at: number;
}
const passLog: PassEntry[] = [];

/** One change of a surface's open lane (`uwg-te-tab-reasons` r12, r13), from the lane probe. */
export interface LaneRecord {
  readonly id: string;
  readonly surface: string;
  readonly open: boolean;
  readonly reason: string;
  readonly time: number;
}
const laneLog: LaneRecord[] = [];

interface LayoutShiftEntry extends PerformanceEntry {
  readonly value: number;
  readonly hadRecentInput: boolean;
  readonly sources?: readonly {
    readonly node: Node | null;
    readonly previousRect: DOMRectReadOnly;
    readonly currentRect: DOMRectReadOnly;
  }[];
}

/** Starts the page logs that must exist before the first instance: layout shifts, overlay passes. */
export function installElementFixture(): void {
  if (installed) return;
  installed = true;
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[])
        shiftLog.push({
          value: entry.value,
          startTime: entry.startTime,
          hadRecentInput: entry.hadRecentInput,
          sources: (entry.sources ?? []).map((source) => ({
            node: nodeLabel(source.node),
            previous: summarize(source.previousRect),
            current: summarize(source.currentRect),
          })),
        });
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {
    // No layout-shift entries in this browser: `layoutShifts()` reports none.
  }
  observeOverlayPasses((record) =>
    passLog.push({ content: record.content, time: record.time, at: performance.now() }),
  );
  observeTextEditorLanes(({ host, surface, open, reason }) =>
    laneLog.push({ id: host.id, surface, open, reason, time: performance.now() }),
  );
}

// Page helpers ------------------------------------------------------------------------------

export type CreateOptions = Partial<
  Omit<ElementFixtureEditorOptions, 'engine' | 'parent' | 'levels'>
>;

let created = 0;

const isEngine = (value: unknown): value is TextEditorEngine =>
  typeof (value as { mount?: unknown } | null)?.mount === 'function';

/** Builds an instance by script into `#mount` (nested at the page's level), recorded like every other. */
export function create(
  engine: EngineName | TextEditorEngine | null,
  options: CreateOptions = {},
): ElementFixtureEditor {
  const { engines, elements } = currentPage();
  const resolved =
    engine === null ? null : isEngine(engine) ? engine : engines.createEngine(engine, 'full');
  const id = options.id ?? `created-${(created += 1)}`;
  if (fixture.editors.has(id)) throw new Error(`The id "${id}" is taken.`);
  const { levels, frame } = nestInLevels(elements.mount, fixture.level);
  const editor = new ElementFixtureEditor({
    attributes: { label: `Created ${id}` },
    ...options,
    id,
    variant: options.variant ?? 'created',
    engineName: options.engineName ?? (typeof engine === 'string' ? engine : null),
    engine: resolved,
    parent: frame,
    levels,
  });
  fixture.editors.set(id, editor);
  return editor;
}

/**
 * Assigns an engine: undefined for the instance's configured one, a variant of its engine, a named
 * engine, an engine object, or null. Every engine passes through the recorder.
 */
export function assign(
  id: string,
  engine?:
    | TextEditorEngine
    | EngineVariant
    | { readonly name: EngineName; readonly variant?: EngineVariant }
    | null,
): void {
  const editor = elementEditorOf(id);
  if (engine === undefined) {
    editor.engine = 'default';
    return;
  }
  if (engine === null || isEngine(engine)) {
    editor.engine = engine;
    return;
  }
  const { engines } = currentPage();
  const name = typeof engine === 'string' ? editor.engineName : engine.name;
  if (!name) throw new Error(`"${id}" is built for no engine; pass an engine name.`);
  const variant = typeof engine === 'string' ? engine : (engine.variant ?? 'full');
  const built = engines.createEngine(name, variant);
  if (!built) throw new Error(`The ${variant} engine "${name}" is not available.`);
  editor.engine = built;
}

export const holdMount = (id: string, ms?: number): void => elementEditorOf(id).holdMount(ms);
export const releaseMount = (id: string): void => elementEditorOf(id).releaseMount();
export const fatal = (id: string): boolean => elementEditorOf(id).fatal();

/**
 * The lane probe: every change of an open lane since load (the link popover, the table
 * size picker, the suggestion lists), of one instance when `id` is given; never cleared.
 */
export function lanes(id?: string): LaneRecord[] {
  return laneLog.filter((record) => id === undefined || record.id === id);
}

/** Every `detail.reason` of every widget event since load (never cleared by `clear()`). */
export function reasons(): ReasonRecord[] {
  return [...reasonLog];
}

/** Buffered `layout-shift` entries since load or since `since` (a `performance.now()` mark). */
export function layoutShifts(options: { readonly since?: number } = {}): {
  readonly total: number;
  readonly withoutInput: number;
  readonly entries: LayoutShiftRecord[];
} {
  const entries = shiftLog.filter((entry) => entry.startTime >= (options.since ?? 0));
  return {
    total: entries.reduce((sum, entry) => sum + entry.value, 0),
    withoutInput: entries
      .filter((entry) => !entry.hadRecentInput)
      .reduce((sum, entry) => sum + entry.value, 0),
    entries,
  };
}

/** Overlay layout passes since load or `since`, per frame and per instance. */
export function passes(options: { readonly since?: number } = {}): {
  readonly total: number;
  readonly perFrame: Readonly<Record<string, number>>;
  readonly maxPerFrame: number;
  readonly byInstance: Readonly<Record<string, number>>;
} {
  const entries = passLog.filter((entry) => entry.at >= (options.since ?? 0));
  const contents = new Map<HTMLElement, string>();
  for (const editor of elementEditors.values()) {
    const content = editor.host.shadowRoot?.querySelector<HTMLElement>(
      '[part~="text-editor-content"]',
    );
    if (content) contents.set(content, editor.id);
  }
  const perFrame: Record<string, number> = {};
  const byInstance: Record<string, number> = {};
  for (const entry of entries) {
    const frame = String(entry.time);
    perFrame[frame] = (perFrame[frame] ?? 0) + 1;
    const id = contents.get(entry.content) ?? '?';
    byInstance[id] = (byInstance[id] ?? 0) + 1;
  }
  return {
    total: entries.length,
    perFrame,
    maxPerFrame: Math.max(0, ...Object.values(perFrame)),
    byInstance,
  };
}

export interface UploadRecord {
  readonly time: number;
  readonly name: string;
  readonly type: string;
  readonly size: number;
  /** The signal aborted while the upload was unsettled. */
  readonly aborted: boolean;
  readonly settled: 'resolved' | 'rejected' | null;
}
const uploadLog = new Map<string, { -readonly [K in keyof UploadRecord]: UploadRecord[K] }[]>();

/**
 * How an instance's stub upload hook answers: after `delay` ms, with `source` (default the
 * fixture image), or rejecting; `holdAfterFirst` keeps every upload after the first one pending
 * until it is aborted.
 */
export interface UploadMode {
  readonly delay?: number | undefined;
  readonly source?: string | undefined;
  readonly reject?: boolean | undefined;
  readonly holdAfterFirst?: boolean | undefined;
}
const uploadModes = new Map<string, UploadMode & { readonly from: number }>();

/** Sets the answer of an `-upload` instance's hook for the uploads that start afterwards. */
export function uploadMode(id: string, mode: UploadMode = {}): void {
  uploadModes.set(id, { ...mode, from: uploadLog.get(id)?.length ?? 0 });
}

/**
 * The stub upload hook of an `-upload` instance: records each call and, by default, reports full
 * progress and resolves `source` after 300 ms (see `uploadMode`).
 */
export function uploadHook(id: string, source: string): TextEditorImageUpload {
  return (file, { signal, onProgress }) => {
    const mode = uploadModes.get(id) ?? { from: 0 };
    const record: { -readonly [K in keyof UploadRecord]: UploadRecord[K] } = {
      time: performance.now(),
      name: file.name,
      type: file.type,
      size: file.size,
      aborted: false,
      settled: null,
    };
    let list = uploadLog.get(id);
    if (!list) uploadLog.set(id, (list = []));
    const held = !!mode.holdAfterFirst && list.length > mode.from;
    list.push(record);
    return new Promise<string>((resolve, reject) => {
      const timer = held
        ? undefined
        : setTimeout(() => {
            if (mode.reject) {
              record.settled = 'rejected';
              reject(new Error('The fixture upload failed.'));
              return;
            }
            onProgress(file.size, file.size);
            record.settled = 'resolved';
            resolve(mode.source ?? source);
          }, mode.delay ?? 300);
      signal.addEventListener(
        'abort',
        () => {
          if (record.settled) return;
          record.aborted = true;
          record.settled = 'rejected';
          clearTimeout(timer);
          reject(signal.reason);
        },
        { once: true },
      );
    });
  };
}

/** The calls of an `-upload` instance's stub upload hook. */
export function uploads(id: string): UploadRecord[] {
  return (uploadLog.get(id) ?? []).map((record) => ({ ...record }));
}

/** The page elements that live inside level shadow roots. */
export function elements(): FixturePageElements {
  return currentPage().elements;
}

// I-01 element-backed assertions --------------------------------------------------------------

/** The root attribute names the record admits, and `contenteditable` (written through `setEditable`). */
export const ROOT_ATTRIBUTE_NAMES: ReadonlySet<string> = new Set([
  'role',
  'aria-multiline',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-placeholder',
  'aria-readonly',
  'aria-disabled',
  'aria-controls',
  'aria-activedescendant',
  'tabindex',
  'spellcheck',
  'translate',
  'contenteditable',
]);

/** An engine's own writes on its root in reaction to focus, learned from a widget-free control. */
export interface EngineReactionSignature {
  readonly engine: EngineName;
  readonly entries: readonly {
    readonly attribute: string;
    readonly added: readonly string[];
    readonly removed: readonly string[];
  }[];
}

/** A mutation record of the watched root as plain data. */
export interface RootMutation {
  readonly type: 'attributes' | 'childList' | 'characterData';
  /** `root` for the editing root itself, `inside` for a node under it. */
  readonly at: 'root' | 'inside';
  readonly target: string;
  readonly attribute: string | null;
  readonly oldValue: string | null;
  /** The value right after this record (the next record's old value, else the value at stop). */
  readonly value: string | null;
}

const tokens = (value: string | null): Set<string> =>
  new Set((value ?? '').split(/\s+/).filter(Boolean));

/** The tokens an attribute value gained and lost, sorted; `null` reads as empty. */
export function classTokenChange(
  oldValue: string | null,
  value: string | null,
): { readonly added: readonly string[]; readonly removed: readonly string[] } {
  const before = tokens(oldValue);
  const after = tokens(value);
  return {
    added: [...after].filter((token) => !before.has(token)).sort(),
    removed: [...before].filter((token) => !after.has(token)).sort(),
  };
}

const sameTokens = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && [...a].sort().every((token, index) => token === [...b].sort()[index]);

/** The records that are not the engine's learned reaction: every one without a signature. */
export function unexpectedRootMutations(
  mutations: readonly RootMutation[],
  signature: EngineReactionSignature | null,
): RootMutation[] {
  return mutations.filter((mutation) => {
    if (!signature || mutation.type !== 'attributes' || mutation.at !== 'root') return true;
    const change = classTokenChange(mutation.oldValue, mutation.value);
    return !signature.entries.some(
      (entry) =>
        entry.attribute === mutation.attribute &&
        sameTokens(entry.added, change.added) &&
        sameTokens(entry.removed, change.removed),
    );
  });
}

/** The records merged in order: a later member wins, `null` is kept. */
export function mergeRootAttributes(
  records: readonly TextEditorRootAttributes[],
): TextEditorRootAttributes {
  return Object.assign({}, ...records) as TextEditorRootAttributes;
}

/**
 * The root attribute writes that no `setRootAttributes` record (or, for `contenteditable`, no
 * `setEditable` call) passed: a removal matches a `null` member; a name outside
 * `ROOT_ATTRIBUTE_NAMES` never matches.
 */
export function unmatchedRootAttributeWrites(
  mutations: readonly RootMutation[],
  passed: {
    readonly records: readonly TextEditorRootAttributes[];
    readonly editable: readonly boolean[];
  },
): RootMutation[] {
  return mutations.filter((mutation) => {
    if (mutation.type !== 'attributes' || mutation.at !== 'root' || mutation.attribute === null)
      return true;
    const name = mutation.attribute;
    if (!ROOT_ATTRIBUTE_NAMES.has(name)) return true;
    const value = mutation.value;
    if (passed.records.some((record) => name in record && record[name] === value)) return false;
    if (name === 'contenteditable')
      return !passed.editable.some((editable) =>
        editable ? value === 'true' : value === 'false' || value === null,
      );
    return true;
  });
}

/** Records as `RootMutation`s, each with the value it left (the next record's old value, else now). */
function toRootMutations(records: readonly MutationRecord[], root: Element): RootMutation[] {
  return records.map((record, index) => {
    const at = record.target === root ? 'root' : 'inside';
    const target = nodeLabel(record.target);
    if (record.type === 'attributes') {
      const name = record.attributeName;
      const next = records
        .slice(index + 1)
        .find(
          (later) =>
            later.type === 'attributes' &&
            later.target === record.target &&
            later.attributeName === name,
        );
      const value = next
        ? next.oldValue
        : name && record.target instanceof Element
          ? record.target.getAttribute(name)
          : null;
      return { type: 'attributes', at, target, attribute: name, oldValue: record.oldValue, value };
    }
    if (record.type === 'characterData') {
      const next = records
        .slice(index + 1)
        .find((later) => later.type === 'characterData' && later.target === record.target);
      return {
        type: 'characterData',
        at,
        target,
        attribute: null,
        oldValue: record.oldValue,
        value: next ? next.oldValue : record.target.textContent,
      };
    }
    return {
      type: 'childList',
      at,
      target,
      attribute: null,
      oldValue: [...record.removedNodes].map((node) => nodeLabel(node)).join(' ') || null,
      value: [...record.addedNodes].map((node) => nodeLabel(node)).join(' ') || null,
    };
  });
}

const WATCH_OPTIONS: MutationObserverInit = {
  subtree: true,
  attributes: true,
  attributeOldValue: true,
  childList: true,
  characterData: true,
  characterDataOldValue: true,
};

const signatures = new Map<EngineName, EngineReactionSignature>();

/**
 * Learns each loaded engine's own root writes on focus and blur from a widget-free harness
 * instance in a hidden chrome slot, observed as the watches observe; the instance is removed after.
 */
export async function calibrateEngineReactions(): Promise<Record<string, EngineReactionSignature>> {
  const { engines } = currentPage();
  const slot = document.createElement('div');
  slot.dataset['fixtureChrome'] = 'calibration';
  slot.setAttribute(
    'style',
    'position: fixed; inset-block-start: 0; inset-inline-start: 0; inline-size: 320px; opacity: 0; pointer-events: none',
  );
  document.body.append(slot);
  try {
    for (const name of Object.keys(engines.modules) as EngineName[]) {
      const engine = engines.createEngine(name, 'full');
      if (!engine) continue;
      const parent = document.createElement('div');
      slot.append(parent);
      const control = new FixtureEditor({
        id: `calibration-${name}`,
        engineName: name,
        variant: 'default',
        engine,
        parent,
        level: 0,
        label: 'Calibration',
        content: { content: '<p>Calibration text</p>', format: 'html' },
      });
      await control.settled();
      const root = control.root;
      if (!root) {
        control.disconnect();
        continue;
      }
      // The records delivered while the steps settle, then those still queued.
      const records: MutationRecord[] = [];
      const observer = new MutationObserver((list) => records.push(...list));
      observer.observe(root, WATCH_OPTIONS);
      await control.focus();
      await settle();
      control.blur();
      await settle();
      records.push(...observer.takeRecords());
      const mutations = toRootMutations(records, root);
      observer.disconnect();
      control.disconnect();
      const entries: EngineReactionSignature['entries'][number][] = [];
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes' || mutation.at !== 'root' || !mutation.attribute)
          continue;
        const change = classTokenChange(mutation.oldValue, mutation.value);
        const entry = { attribute: mutation.attribute, ...change };
        if (
          !entries.some(
            (known) =>
              known.attribute === entry.attribute &&
              sameTokens(known.added, entry.added) &&
              sameTokens(known.removed, entry.removed),
          )
        )
          entries.push(entry);
      }
      signatures.set(name, { engine: name, entries });
    }
  } finally {
    slot.remove();
  }
  return Object.fromEntries(signatures);
}

export type ElementStep = (editor: ElementFixtureEditor) => unknown;

const labelled = (label: string, step: ElementStep): ElementStep => Object.assign(step, { label });

/** Scrolls the viewport part by `delta` and back (a synthetic step). */
export async function scrollViewport(editor: ElementFixtureEditor, delta: number): Promise<void> {
  const viewport = editor.shadow.querySelector<HTMLElement>('[part~="text-editor-viewport"]');
  if (!viewport) return;
  const start = viewport.scrollTop;
  viewport.scrollTop = start + delta;
  await settle();
  viewport.scrollTop = start;
  await settle();
}

/** Narrows the host by `inlineDelta` and restores it (a synthetic step). */
export async function resizeHost(editor: ElementFixtureEditor, inlineDelta: number): Promise<void> {
  const style = editor.host.style;
  const previous = style.inlineSize;
  style.inlineSize = `${editor.host.getBoundingClientRect().width - inlineDelta}px`;
  await settle();
  style.inlineSize = previous;
  await settle();
}

let watch: {
  readonly editor: ElementFixtureEditor;
  readonly root: HTMLElement;
  readonly observer: MutationObserver;
  readonly records: MutationRecord[];
} | null = null;

/** Starts watching the editing root of `id` (subtree, attributes, child lists, text). */
export function startRootWatch(id: string): {
  readonly watching: string;
  readonly calibrated: boolean;
} {
  const editor = elementEditorOf(id);
  const root = editor.root;
  if (!root) throw new Error(`"${id}" has no editing root.`);
  watch?.observer.disconnect();
  const records: MutationRecord[] = [];
  const observer = new MutationObserver((list) => records.push(...list));
  observer.observe(root, WATCH_OPTIONS);
  watch = { editor, root, observer, records };
  return {
    watching: id,
    calibrated: editor.engineName !== null && signatures.has(editor.engineName),
  };
}

/** Stops the watch: the root was kept and every record is the engine's learned reaction. */
export function stopRootWatch(): Report {
  const current = watch;
  if (!current) return report([check('a watch was started', false, null)]);
  watch = null;
  current.records.push(...current.observer.takeRecords());
  current.observer.disconnect();
  const signature = current.editor.engineName
    ? (signatures.get(current.editor.engineName) ?? null)
    : null;
  const mutations = toRootMutations(current.records, current.root);
  const unexpected = unexpectedRootMutations(mutations, signature);
  const engineReactions = mutations.filter((mutation) => !unexpected.includes(mutation));
  return report(
    [
      check('engine reactions calibrated', signature !== null, signature),
      check(
        'editing root kept',
        current.editor.root === current.root,
        nodeLabel(current.editor.root),
      ),
      check('no widget write in the editing root', unexpected.length === 0, unexpected),
    ],
    { id: current.editor.id, unexpected, engineReactions },
  );
}

/** Watches the editing root of `id` during `steps` (default: a 60 px scroll and a 40 px resize). */
export async function assertNoWidgetRootWrites(
  id: string,
  steps?: readonly ElementStep[],
): Promise<Report> {
  const editor = elementEditorOf(id);
  const list = steps ?? [
    labelled('synthetic: viewport scroll 60 px', (target) => scrollViewport(target, 60)),
    labelled('synthetic: host resize 40 px', (target) => resizeHost(target, 40)),
  ];
  startRootWatch(id);
  for (const step of list) {
    await step(editor);
    await settle();
  }
  const result = stopRootWatch();
  return report(result.checks, {
    ...result.records,
    steps: list.map((step) => (step as { label?: string }).label ?? (step.name || 'step')),
  });
}

const settleElement = async (editor: ElementFixtureEditor): Promise<void> => {
  await editor.host.updateComplete;
  await settle();
};

/**
 * During access, label and placeholder changes, every root attribute write names an admitted
 * attribute and takes a value that a `setRootAttributes` record (or `setEditable`) passed.
 */
export async function assertRootAttributeWrites(
  id: string,
  steps?: readonly ElementStep[],
): Promise<Report> {
  const editor = elementEditorOf(id);
  const root = editor.root;
  if (!root) return report([check('editing root present', false, null)]);
  const focused = root.contains(editor.shadow.activeElement);
  const toggle = (label: string, apply: (target: ElementFixtureEditor) => void): ElementStep =>
    labelled(label, async (target) => {
      apply(target);
      await settleElement(target);
    });
  const list = steps ?? [
    toggle('readOnly true', (target) => (target.readOnly = true)),
    toggle('readOnly false', (target) => (target.readOnly = false)),
    toggle('disabled true', (target) => (target.disabled = true)),
    toggle('disabled false', (target) => (target.disabled = false)),
    ...((): ElementStep[] => {
      const label = editor.label;
      const placeholder = editor.placeholder;
      return [
        toggle('label changed', (target) => (target.label = `${label} (changed)`)),
        toggle('label restored', (target) => (target.label = label)),
        toggle('placeholder changed', (target) => (target.placeholder = 'Changed placeholder')),
        toggle('placeholder restored', (target) => (target.placeholder = placeholder)),
      ];
    })(),
  ];
  const start = performance.now();
  const records: MutationRecord[] = [];
  const observer = new MutationObserver((items) => records.push(...items));
  observer.observe(root, { attributes: true, attributeOldValue: true });
  for (const step of list) {
    await step(editor);
    await settle();
  }
  records.push(...observer.takeRecords());
  observer.disconnect();
  const mutations = toRootMutations(records, root);
  const passed = editor.rootCallsSince(start);
  const outside = mutations.filter(
    (mutation) => mutation.attribute === null || !ROOT_ATTRIBUTE_NAMES.has(mutation.attribute),
  );
  const unmatched = unmatchedRootAttributeWrites(mutations, passed);
  const record = editor.rootAttributeRecord();
  const differing = Object.entries(record).filter(([name, value]) =>
    value === null ? root.hasAttribute(name) : root.getAttribute(name) !== value,
  );
  return report(
    [
      check('editing root unfocused', !focused, focused),
      check('only admitted root attributes written', outside.length === 0, outside),
      check('every root write was passed', unmatched.length === 0, unmatched),
      check('root attributes equal the record', differing.length === 0, differing),
    ],
    {
      steps: list.map((step) => (step as { label?: string }).label ?? (step.name || 'step')),
      mutations,
      passed,
    },
  );
}

/** The fixture instance whose shadow tree holds `node`, through nested component roots. */
function instanceTreeOf(node: Node): { readonly id: string | null; readonly hosts: Element[] } {
  const hosts: Element[] = [];
  let root = node.getRootNode();
  let id: string | null = null;
  while (root instanceof ShadowRoot) {
    hosts.push(root.host);
    if (id === null)
      for (const editor of fixture.editors.values()) if (editor.host === root.host) id = editor.id;
    root = root.host.getRootNode();
  }
  return { id, hosts };
}

/**
 * Every open surface of the page (`:popover-open`, `dialog[open]`): with `expectOpen`, one inside
 * `id`'s shadow tree; each inside it in the top layer; none outside every widget tree except the
 * fixture's own (`[data-fixture-surface]`).
 */
export function assertSurfacesInRoot(
  id: string,
  options: { readonly expectOpen?: boolean } = {},
): Report {
  elementEditorOf(id);
  const expectOpen = options.expectOpen ?? true;
  const open = [document, ...shadowRoots()].flatMap((root) => [
    ...root.querySelectorAll(':popover-open, dialog[open]'),
  ]);
  const inside: Element[] = [];
  const stray: Element[] = [];
  for (const element of open) {
    const tree = instanceTreeOf(element);
    if (tree.id === id) inside.push(element);
    else if (tree.id !== null) continue;
    else if (
      element.closest('[data-fixture-surface]') ||
      tree.hosts.some((host) => host.closest('[data-fixture-surface]'))
    )
      continue;
    else stray.push(element);
  }
  const notTop = inside.filter((element) => !element.matches(':popover-open'));
  const checks: Check[] = [
    check(
      'every surface of the widget in the top layer',
      notTop.length === 0,
      notTop.map(nodeLabel),
    ),
    check('no open surface outside the widget trees', stray.length === 0, stray.map(nodeLabel)),
  ];
  if (expectOpen)
    checks.unshift(check('an open surface inside the widget', inside.length > 0, inside.length));
  return report(checks, { inside: inside.map(nodeLabel), stray: stray.map(nodeLabel) });
}

const firstDefault = (): string => {
  for (const editor of elementEditors.values())
    if (editor.variant === 'default' && fixture.editors.get(editor.id) === editor) return editor.id;
  throw new Error('No default instance on this page.');
};

const failedCheck = (result: Report, name: string): boolean =>
  result.checks.some((item) => item.name === name && !item.pass);

/** The negative control: planted writes that each assertion must report; every plant is removed. */
export async function selfTest(id: string = firstDefault()): Promise<Report> {
  const editor = elementEditorOf(id);
  await editor.settled();
  const before = editor.getContent('html');
  if (editor.root?.contains(editor.shadow.activeElement)) {
    editor.blur();
    await settle();
  }
  const checks: Check[] = [];
  const records: Record<string, unknown> = {};

  // 1. A class on the root's first block child, inside a watch.
  const root = editor.root;
  const child = root?.firstElementChild ?? null;
  if (child) {
    startRootWatch(id);
    child.classList.add('tp-self-test');
    await settle();
    child.classList.remove('tp-self-test');
    const watched = stopRootWatch();
    const unexpected = watched.records['unexpected'] as RootMutation[];
    records['watch'] = watched;
    checks.push(
      check(
        'planted block class reported by the root watch',
        unexpected.some((mutation) => mutation.at === 'inside' && mutation.attribute === 'class'),
        unexpected,
      ),
    );
  } else checks.push(check('planted block class reported by the root watch', false, 'no block'));

  // 2. An aria-label outside any setRootAttributes call.
  if (root) {
    const previous = root.getAttribute('aria-label');
    const written = await assertRootAttributeWrites(id, [
      labelled('planted aria-label', () => root.setAttribute('aria-label', 'Planted label')),
    ]);
    if (previous === null) root.removeAttribute('aria-label');
    else root.setAttribute('aria-label', previous);
    records['attributes'] = written;
    checks.push(
      check(
        'planted aria-label reported as unmatched',
        failedCheck(written, 'every root write was passed'),
        written.checks,
      ),
    );
  } else checks.push(check('planted aria-label reported as unmatched', false, 'no root'));

  // 3. A live region in the body, then inside the widget's shadow root.
  const region = document.createElement('div');
  region.setAttribute('aria-live', 'polite');
  region.dataset['selfTest'] = '';
  document.body.append(region);
  const outsideReport = assertNoForeignNodes(id);
  region.remove();
  editor.shadow.append(region);
  const insideReport = assertNoForeignNodes(id);
  region.remove();
  records['foreign'] = { outside: outsideReport, inside: insideReport };
  checks.push(
    check(
      'planted body live region reported',
      failedCheck(outsideReport, 'no live region added outside a widget tree'),
      outsideReport.checks,
    ),
    check(
      'live region inside the widget not reported',
      insideReport.checks.some(
        (item) => item.name === 'no live region added outside a widget tree' && item.pass,
      ),
      insideReport.checks,
    ),
  );

  // 4. A popover shown in the body.
  const popover = document.createElement('div');
  popover.setAttribute('popover', 'manual');
  popover.dataset['selfTest'] = '';
  popover.textContent = 'Planted surface';
  document.body.append(popover);
  popover.showPopover();
  const surfaces = assertSurfacesInRoot(id, { expectOpen: false });
  popover.hidePopover();
  popover.remove();
  records['surfaces'] = surfaces;
  checks.push(
    check(
      'planted body popover reported',
      failedCheck(surfaces, 'no open surface outside the widget trees'),
      surfaces.checks,
    ),
  );

  const after = editor.getContent('html');
  const status = await editor.remount();
  checks.push(
    check('content unchanged by the plants', before === after, { before, after }),
    check('remount restores a fresh engine', status === 'ready', status),
  );
  return report(checks, records);
}
