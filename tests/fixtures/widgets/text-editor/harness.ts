/**
 * Parity page harness. Each instance hosts one engine adapter through the real
 * `TextEditorController` and a fixture-only controller host: a host `div` with an open shadow
 * root holding the content container, placed under 0–2 ancestor open shadow roots. The harness
 * renders no widget UI; it records every call into the engine instance and every context
 * notification, and logs the controller host's hooks under the names of the events the widget
 * will dispatch (`tp-text-editor-request`, `-request-failed`, `tp-value-change`,
 * `tp-value-commit`, `tp-text-editor-ready`, `tp-text-editor-error`, `tp-diagnostic`).
 * Driven only through the Chrome DevTools MCP (see README.md).
 */
import type { TextEditorAction } from '../../../../src/foundation/text-editor/actions.js';
import { windowFrames } from '../../../../src/foundation/frame-loop.js';
import { adoptStyleText } from '../../../../src/foundation/generated-style.js';
import { textEditorTools } from '../../../../src/foundation/text-editor/builtin-tools.js';
import {
  TextEditorController,
  type TextEditorControllerHost,
  type TextEditorRequestDetail,
  type TextEditorRequestOutcome,
  type TextEditorStatus,
} from '../../../../src/foundation/text-editor/controller.js';
import type {
  TextEditorContentInput,
  TextEditorContentOptions,
  TextEditorDiagnostic,
  TextEditorEngine,
  TextEditorEngineContext,
  TextEditorEngineInstance,
  TextEditorFocusPosition,
  TextEditorFormat,
  TextEditorRootAttributes,
} from '../../../../src/foundation/text-editor/engine.js';
import {
  resolveTextEditorLayout,
  type TextEditorLayout,
} from '../../../../src/foundation/text-editor/layout.js';
import type { TextEditorEngineState } from '../../../../src/foundation/text-editor/model.js';
import type { TextEditorNodeDefinition } from '../../../../src/foundation/text-editor/nodes.js';
import { textEditorStrings } from '../../../../src/foundation/text-editor/strings.js';
import {
  resolveTextEditorCapabilities,
  resolveTextEditorTools,
  type TextEditorRequestSurface,
  type TextEditorTool,
  type TextEditorToolRegistry,
} from '../../../../src/foundation/text-editor/tools.js';
import type { ChangeReason } from '../../../../src/foundation/types.js';

export type EngineName = 'tiptap' | 'lexical';
export type Variant = 'default' | 'empty' | 'readonly' | 'disabled' | 'reduced' | 'custom';
export type Level = 0 | 1 | 2;

// Reports (flow fixture precedent: every helper returns { checks, records, passed }) ----------

export interface Check {
  readonly name: string;
  readonly pass: boolean;
  readonly actual: unknown;
}
export interface Report {
  readonly checks: Check[];
  readonly records: Record<string, unknown>;
  readonly passed: boolean;
}
export const check = (name: string, pass: boolean, actual: unknown): Check => ({
  name,
  pass,
  actual,
});
export const report = (checks: Check[], records: Record<string, unknown> = {}): Report => ({
  checks,
  records,
  passed: checks.every((item) => item.pass),
});

/** Two frames and a task: the controller publishes its state at the next frame. */
export function settle(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0))),
  );
}

// JSON-safe summaries of recorded values ------------------------------------------------------

/** A short label of a DOM node: `tag#id.class` for an element. */
export function nodeLabel(node: Node | null | undefined): string {
  if (!node) return 'null';
  if (node instanceof ShadowRoot) return `#shadow-root(${nodeLabel(node.host)})`;
  if (node instanceof Document) return '#document';
  if (node instanceof Text) {
    const data = node.data.length > 24 ? `${node.data.slice(0, 24)}…` : node.data;
    return `#text ${JSON.stringify(data)}`;
  }
  if (node instanceof Element) {
    const id = node.id ? `#${node.id}` : '';
    const classes = [...node.classList]
      .slice(0, 3)
      .map((name) => `.${name}`)
      .join('');
    return `${node.localName}${id}${classes}`;
  }
  return node.nodeName;
}

const LONG_TEXT = 400;

/** A JSON-safe copy of a recorded value: events, nodes, errors and snapshots become summaries. */
export function summarize(value: unknown, depth = 0): unknown {
  if (value === undefined || value === null) return value;
  switch (typeof value) {
    case 'string':
      return value.length > LONG_TEXT
        ? { text: `${value.slice(0, LONG_TEXT)}…`, length: value.length }
        : value;
    case 'number':
    case 'boolean':
      return value;
    case 'bigint':
    case 'symbol':
      return String(value);
    case 'function':
      return `[function ${(value as { name?: string }).name || 'anonymous'}]`;
  }
  if (value instanceof Event)
    return {
      event: value.type,
      trusted: value.isTrusted,
      ...(value instanceof KeyboardEvent ? { key: value.key } : {}),
      ...(value instanceof InputEvent ? { inputType: value.inputType } : {}),
    };
  if (value instanceof Node) return nodeLabel(value);
  if (value instanceof Error || value instanceof DOMException)
    return { error: value.name, message: value.message };
  if (value instanceof AbortSignal) return `[AbortSignal aborted=${value.aborted}]`;
  if (value instanceof DOMRectReadOnly)
    return { x: value.x, y: value.y, width: value.width, height: value.height };
  if (depth > 6) return '[deep]';
  if (Array.isArray(value)) return value.map((item) => summarize(item, depth + 1));
  if (value instanceof Set) return [...value].map((item) => summarize(item, depth + 1));
  if (value instanceof Map)
    return Object.fromEntries(
      [...value].map(([key, item]) => [String(key), summarize(item, depth + 1)]),
    );
  const record = value as Record<string, unknown>;
  if (typeof record['getContent'] === 'function' && typeof record['revision'] === 'number')
    return { revision: record['revision'], empty: record['empty'] };
  const entries: [string, unknown][] = [];
  for (const key of Object.keys(record)) entries.push([key, summarize(record[key], depth + 1)]);
  return Object.fromEntries(entries);
}

// Records -------------------------------------------------------------------------------------

export interface CallRecord {
  readonly time: number;
  readonly args: unknown[];
  /** A primitive result, such as the answer of `can` or `execute`. */
  readonly result?: unknown;
  /** The error that the call threw. */
  readonly threw?: unknown;
}

export interface EventRecord {
  /** The name of the event that the widget dispatches for this host hook. */
  readonly type: string;
  readonly time: number;
  readonly detail: unknown;
}

/** Names of the host hooks under the names of the widget's events (D2). */
export const EVENT_NAMES = Object.freeze({
  request: 'tp-text-editor-request',
  requestFailed: 'tp-text-editor-request-failed',
  valueChange: 'tp-value-change',
  valueCommit: 'tp-value-commit',
  ready: 'tp-text-editor-ready',
  error: 'tp-text-editor-error',
  diagnostic: 'tp-diagnostic',
  openSurface: 'open-surface',
});

const isPrimitive = (value: unknown): boolean =>
  value === null || ['string', 'number', 'boolean', 'undefined'].includes(typeof value);

// Host DOM ------------------------------------------------------------------------------------

/**
 * Styles of an instance host's shadow root: the frame around the content container, and no block
 * margins in the editing root. The engines render a block with different elements (a code block as
 * `pre` or as `code`, a list item's text in a `p` or not), whose user-agent margins differ; the
 * widget's content presentation sets the flow, which this page does not have, so geometry parity
 * compares the blocks without either.
 */
const HOST_CSS = `
:host { display: block; }
.content > * * { margin-block: 0; }
.content {
  box-sizing: border-box;
  min-block-size: 96px;
  padding: 12px 16px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-md);
  background: var(--tp-background);
  color: var(--tp-foreground);
  font-family: var(--tp-font-sans);
  font-size: 16px;
  line-height: 1.5;
}
.content > :focus-visible { outline: 2px solid var(--tp-ring); outline-offset: 4px; }
`;

export interface HostParts {
  /** The outer `div`s whose open shadow roots enclose the host, outermost first. */
  readonly levels: HTMLElement[];
  readonly host: HTMLElement;
  readonly shadow: ShadowRoot;
  /** The content container the engine mounts into (`part="content"`). */
  readonly container: HTMLElement;
}

/** Places `level` nested open shadow roots of plain `div`s under `parent`; returns them and the innermost frame. */
export function nestInLevels(
  parent: HTMLElement,
  level: Level,
): { readonly levels: HTMLElement[]; readonly frame: HTMLElement } {
  const levels: HTMLElement[] = [];
  let current = parent;
  for (let depth = 1; depth <= level; depth += 1) {
    const outer = document.createElement('div');
    outer.className = 'level-host';
    outer.dataset['level'] = String(depth);
    current.append(outer);
    const root = outer.attachShadow({ mode: 'open' });
    const frame = document.createElement('div');
    frame.className = 'level-frame';
    frame.setAttribute(
      'style',
      'display: block; padding: 4px; border: 1px dashed var(--tp-border); border-radius: var(--tp-radius-md)',
    );
    root.append(frame);
    levels.push(outer);
    current = frame;
  }
  return { levels, frame: current };
}

/** Places a host `div` with an open shadow root under `level` ancestor open shadow roots. */
export function createHost(parent: HTMLElement, id: string, level: Level): HostParts {
  const { levels, frame: current } = nestInLevels(parent, level);
  const host = document.createElement('div');
  host.id = id;
  host.className = 'editor-host';
  current.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  adoptStyleText(host, shadow, HOST_CSS);
  const container = document.createElement('div');
  container.className = 'content';
  container.setAttribute('part', 'content');
  shadow.append(container);
  return { levels, host, shadow, container };
}

// The fixture editor --------------------------------------------------------------------------

export interface FixtureEditorOptions {
  readonly id: string;
  readonly engineName: EngineName;
  readonly variant: Variant;
  readonly engine: TextEditorEngine | null;
  readonly parent: HTMLElement;
  readonly level: Level;
  readonly label: string;
  readonly placeholder?: string | undefined;
  readonly readOnly?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly nodes?: readonly TextEditorNodeDefinition[] | undefined;
  readonly content?: TextEditorContentInput | null | undefined;
  /** Shows the status in the light DOM. */
  readonly status?: HTMLElement | null | undefined;
}

export interface RunOptions {
  /** The value of a tool that takes one. */
  readonly value?: unknown;
  /** Whether applying moves focus into the editing root; default true. */
  readonly focus?: boolean | undefined;
  /** Default `api`. */
  readonly surface?: TextEditorRequestSurface | undefined;
  /** Default `imperative-action`. */
  readonly reason?: ChangeReason | undefined;
  readonly sourceEvent?: Event | undefined;
}

/** The members of a fixture instance that the page helpers read (`api.ts`, `parity.ts`, `harness.ts`). */
export interface FixtureEditorLike {
  readonly id: string;
  /** The element that holds the instance's shadow root: the harness host `div`, or the `tp-text-editor`. */
  readonly host: HTMLElement;
  readonly shadow: ShadowRoot;
  /** The container the engine mounts into (`part="content"`, or `text-editor-content`). */
  readonly container: HTMLElement;
  /** The editing root, or null. */
  readonly root: HTMLElement | null;
  /** The recording wrapper of the live engine instance, or null. */
  readonly instance: TextEditorEngineInstance | null;
  readonly status: TextEditorStatus;
  readonly state: TextEditorEngineState;
  /** The unwrapped engine, or null. */
  readonly engine: TextEditorEngine | null;
  readonly nodes: readonly TextEditorNodeDefinition[];
  readonly registry: TextEditorToolRegistry;
  /** The resolved layout: every key present, `*` expanded, skipped identifiers removed. */
  readonly resolvedLayout: TextEditorLayout;
  readOnly: boolean;
  readonly disabled: boolean;
  run(
    target: string | TextEditorAction | readonly TextEditorAction[],
    options?: RunOptions,
  ): Promise<TextEditorRequestOutcome>;
  setContent(content: unknown, format?: TextEditorFormat): Promise<TextEditorRequestOutcome>;
  getContent(format?: TextEditorFormat, options?: TextEditorContentOptions): unknown;
  /**
   * Brings the instance to `content` as the start state of a comparison. The harness restores
   * silently with the history cleared; the element-backed editor applies one `content.set` request.
   */
  restoreContent(content: unknown, format?: TextEditorFormat): void | Promise<unknown>;
  can(action: TextEditorAction): boolean;
  settled(): Promise<TextEditorStatus>;
  remount(): Promise<TextEditorStatus>;
  calls(): Readonly<Record<string, readonly CallRecord[]>>;
  callCounts(): Readonly<Record<string, number>>;
  events(): readonly EventRecord[];
  rawEvents(): readonly { readonly type: string; readonly detail: unknown }[];
  clear(): void;
  /** The root attribute record passed through `setRootAttributes` (merged over the current mount). */
  rootAttributeRecord(): TextEditorRootAttributes;
}

/** The engine instance methods that the recording wrapper forwards. */
const INSTANCE_METHODS = [
  'getState',
  'snapshot',
  'can',
  'execute',
  'getContent',
  'setContent',
  'getBlocks',
  'getTable',
  'blockElement',
  'blockAt',
  'cellElement',
  'cellAt',
  'tableElements',
  'pointAt',
  'blockRects',
  'rangeRects',
  'selectionRects',
  'caretRect',
  'setRootAttributes',
  'focus',
  'blur',
  'setEditable',
  'destroy',
] as const;

/** Every name the recorder logs: the mount, the context notifications and the instance methods. */
export type EngineCallName =
  | 'mount'
  | 'adoptStyles'
  | 'releaseStyles'
  | 'ready'
  | 'state'
  | 'content'
  | 'error'
  | 'diagnostic'
  | (typeof INSTANCE_METHODS)[number];

/** Where the recorder reports; each fixture editor implements one per instance. */
export interface EngineRecorderSink {
  /** One call, already summarized (`callRecord`); `args` are the raw arguments. */
  call(name: EngineCallName, record: CallRecord, args: readonly unknown[]): void;
  /** A mount's wrapped instance and its recorded context, only while the mount's signal is not aborted. */
  attach(instance: TextEditorEngineInstance, context: TextEditorEngineContext): void;
  /** The wrapped instance's `destroy()` was called; runs before the engine's own `destroy`. */
  detach(instance: TextEditorEngineInstance): void;
  /** Optional: awaited before the engine's own `mount` runs (held mounts). */
  hold?(): Promise<void> | null;
}

/** The JSON-safe record of one call: summarized arguments, a primitive result or the error it threw. */
export function callRecord(
  args: readonly unknown[],
  outcome?: { readonly result?: unknown; readonly threw?: unknown },
): CallRecord {
  const entry: { time: number; args: unknown[]; result?: unknown; threw?: unknown } = {
    time: performance.now(),
    args: args.map((arg) => summarize(arg)),
  };
  if (outcome && 'result' in outcome && isPrimitive(outcome.result)) entry.result = outcome.result;
  if (outcome && 'threw' in outcome) entry.threw = summarize(outcome.threw);
  return entry;
}

/**
 * The one engine recorder: wraps an engine so that its mount, every context notification and every
 * method of each instance it mounts are reported to `sink`, and forwards each to the engine
 * unchanged.
 */
export function recordEngine(engine: TextEditorEngine, sink: EngineRecorderSink): TextEditorEngine {
  const record = (
    name: EngineCallName,
    args: readonly unknown[],
    outcome?: { readonly result?: unknown; readonly threw?: unknown },
  ) => sink.call(name, callRecord(args, outcome), args);
  return {
    name: engine.name,
    capabilities: engine.capabilities,
    reservedKeys: engine.reservedKeys,
    supportsNode: (definition) => engine.supportsNode(definition),
    mount: (container, context) => {
      record('mount', [
        container,
        {
          initialContent: context.initialContent
            ? {
                format: context.initialContent.format,
                length: String(context.initialContent.content).length,
              }
            : null,
          editable: context.editable,
          nodes: context.nodes.map((node) => node.name),
          convertNodes: (context.convertNodes ?? []).map((node) => node.name),
          labels: context.labels,
        },
      ]);
      const recorded: TextEditorEngineContext = {
        initialContent: context.initialContent,
        editable: context.editable,
        nodes: context.nodes,
        convertNodes: context.convertNodes,
        urls: context.urls,
        signal: context.signal,
        labels: context.labels,
        views: context.views,
        createId: () => context.createId(),
        adoptStyles: (cssText) => {
          record('adoptStyles', [{ length: cssText.length }]);
          const release = context.adoptStyles(cssText);
          return () => {
            record('releaseStyles', []);
            release();
          };
        },
        ready: () => {
          record('ready', []);
          context.ready();
        },
        state: () => {
          record('state', []);
          context.state();
        },
        content: (change) => {
          record('content', [change]);
          context.content(change);
        },
        error: (error) => {
          record('error', [error]);
          context.error(error);
        },
        diagnostic: (code, message) => {
          record('diagnostic', [code, message]);
          context.diagnostic(code, message);
        },
      };
      const attach = (inner: TextEditorEngineInstance): TextEditorEngineInstance => {
        const wrapped = recordInstance(inner, sink);
        if (!context.signal.aborted) sink.attach(wrapped, recorded);
        return wrapped;
      };
      const start = () => {
        const result = engine.mount(container, recorded);
        return isThenable(result) ? Promise.resolve(result).then(attach) : attach(result);
      };
      const hold = sink.hold?.() ?? null;
      if (!hold) return start();
      return hold.then(() => {
        if (context.signal.aborted)
          throw new DOMException('The held mount was superseded.', 'AbortError');
        return start();
      });
    },
  };
}

function recordInstance(
  inner: TextEditorEngineInstance,
  sink: EngineRecorderSink,
): TextEditorEngineInstance {
  const forward =
    (name: (typeof INSTANCE_METHODS)[number]) =>
    (...args: unknown[]): unknown => {
      const method = inner[name] as (...parameters: unknown[]) => unknown;
      try {
        const result = method.apply(inner, args);
        sink.call(name, callRecord(args, { result }), args);
        return result;
      } catch (error) {
        sink.call(name, callRecord(args, { threw: error }), args);
        throw error;
      }
    };
  const methods = Object.fromEntries(INSTANCE_METHODS.map((name) => [name, forward(name)]));
  const wrapped = {
    ...methods,
    get capabilities() {
      return inner.capabilities;
    },
    get native() {
      return inner.native;
    },
  } as unknown as TextEditorEngineInstance;
  const destroy = wrapped.destroy;
  wrapped.destroy = () => {
    sink.detach(wrapped);
    destroy();
  };
  return wrapped;
}

// Tools (the registry and layout the controller's tool requests resolve against) --------------

export interface FixtureToolsInput {
  readonly engine: TextEditorEngine | null;
  readonly nodes: readonly TextEditorNodeDefinition[];
  readonly tools: readonly TextEditorTool[] | null;
  readonly layout: Partial<TextEditorLayout> | null;
}

export interface FixtureTools {
  readonly registry: TextEditorToolRegistry;
  readonly layout: TextEditorLayout;
  /** The registry's diagnostics, then the layout's, in that order. */
  readonly diagnostics: readonly TextEditorDiagnostic[];
}

/** Capabilities, then the registry, then the resolved layout, as the controller's tool requests use them. */
export function resolveFixtureTools(input: FixtureToolsInput): FixtureTools {
  const capabilities = resolveTextEditorCapabilities(input.engine, input.nodes);
  const registry = resolveTextEditorTools({
    builtins: textEditorTools,
    tools: input.tools,
    nodes: input.nodes,
    capabilities,
  });
  const { layout, diagnostics } = resolveTextEditorLayout(input.layout, registry);
  return { registry, layout, diagnostics: [...registry.diagnostics, ...diagnostics] };
}

/**
 * One parity instance: the controller, its fixture host and the recording engine wrapper, with
 * the facade that `textEditorAPI.editor(id)` returns. Its setters mirror the widget's properties
 * that the controller reads: `readOnly`, `disabled`, `label`, `placeholder`, `engine`, `nodes`,
 * `tools` and `layout`.
 */
export class FixtureEditor implements FixtureEditorLike {
  readonly id: string;
  readonly engineName: EngineName;
  readonly variant: Variant;
  readonly levels: HTMLElement[];
  readonly host: HTMLElement;
  readonly shadow: ShadowRoot;
  readonly container: HTMLElement;
  readonly controller: TextEditorController;
  /** When set, `dispatchRequest` answers `false`, as a listener that cancels the request. */
  cancelRequests = false;

  readonly #original: TextEditorEngine | null;
  #engine: TextEditorEngine | null;
  #live: TextEditorEngineInstance | null = null;
  #label: string;
  #placeholder: string;
  #readOnly: boolean;
  #disabled: boolean;
  #nodes: readonly TextEditorNodeDefinition[];
  #tools: readonly TextEditorTool[] | null = null;
  #layoutInput: Partial<TextEditorLayout> | null = null;
  #registry: TextEditorToolRegistry | null = null;
  #layout: TextEditorLayout | null = null;
  readonly #status: HTMLElement | null;
  readonly #calls = new Map<string, CallRecord[]>();
  readonly #events: EventRecord[] = [];
  readonly #raw: { readonly type: string; readonly detail: unknown }[] = [];
  #waiters: (() => void)[] = [];
  #mounts = 0;
  readonly #sink: EngineRecorderSink = {
    call: (name, record) => {
      if (name === 'mount') this.#mounts += 1;
      this.#record(name, record);
    },
    attach: (wrapped) => {
      this.#live = wrapped;
      wrapped.setRootAttributes(this.rootAttributeRecord());
    },
    detach: (wrapped) => {
      if (this.#live === wrapped) this.#live = null;
    },
  };

  constructor(options: FixtureEditorOptions) {
    this.id = options.id;
    this.engineName = options.engineName;
    this.variant = options.variant;
    const parts = createHost(options.parent, options.id, options.level);
    this.levels = parts.levels;
    this.host = parts.host;
    this.shadow = parts.shadow;
    this.container = parts.container;
    this.#status = options.status ?? null;
    this.#original = options.engine;
    this.#engine = options.engine;
    this.#label = options.label;
    this.#placeholder = options.placeholder ?? '';
    this.#readOnly = options.readOnly ?? false;
    this.#disabled = options.disabled ?? false;
    this.#nodes = Object.freeze([...(options.nodes ?? [])]);
    this.controller = new TextEditorController(this.#controllerHost());
    if (this.#nodes.length > 0) this.controller.setNodes(this.#nodes);
    this.controller.setAccess({ readOnly: this.#readOnly, disabled: this.#disabled });
    if (options.content) this.controller.setDefaultContent(options.content);
    this.#applyTools();
    this.controller.setEngine(this.#engine ? recordEngine(this.#engine, this.#sink) : null);
    this.controller.connect();
    this.#showStatus();
  }

  // Controller host -------------------------------------------------------------------------

  #controllerHost(): TextEditorControllerHost {
    return {
      container: () => this.container,
      frames: () => windowFrames(window),
      direction: () => (getComputedStyle(this.host).direction === 'rtl' ? 'rtl' : 'ltr'),
      adoptStyles: (cssText) => adoptStyleText(this.host, this.shadow, cssText),
      dispatchRequest: (detail) => {
        const cancelled = this.cancelRequests;
        this.#event(EVENT_NAMES.request, detail, {
          ...requestSummary(detail),
          cancelable: true,
          cancelled,
        });
        return !cancelled;
      },
      requestFailed: (detail) =>
        this.#event(EVENT_NAMES.requestFailed, detail, {
          ...requestSummary(detail),
          error: summarize(detail.error),
        }),
      openSurface: (tool, detail) => {
        this.#event(EVENT_NAMES.openSurface, detail, {
          tool: tool.id,
          kind: tool.kind,
          ...requestSummary(detail),
        });
        return false;
      },
      ready: (native) => {
        this.#event(EVENT_NAMES.ready, native, { native: native === null ? null : typeof native });
        this.#settle();
      },
      failed: (error) => {
        this.#event(EVENT_NAMES.error, error, { error: summarize(error) });
        this.#settle();
      },
      valueChanged: (change) =>
        this.#event(EVENT_NAMES.valueChange, change, {
          value: summarize(change.value),
          previousValue: summarize(change.previousValue),
          reason: change.reason,
          sourceEvent: summarize(change.sourceEvent),
          origin: change.origin,
          tool: change.tool,
          actions: summarize(change.actions),
          cancelable: false,
        }),
      valueCommitted: (commit) =>
        this.#event(EVENT_NAMES.valueCommit, commit, {
          value: summarize(commit.value),
          previousValue: summarize(commit.previousValue),
          reason: commit.reason,
          sourceEvent: summarize(commit.sourceEvent),
          cancelable: false,
        }),
      diagnostic: (code, message) =>
        this.#event(EVENT_NAMES.diagnostic, { code, message }, { code, message }),
    };
  }

  #event(type: string, raw: unknown, detail: unknown): void {
    this.#events.push({ type, time: performance.now(), detail });
    this.#raw.push({ type, detail: raw });
    this.#showStatus();
  }

  #record(name: string, record: CallRecord): void {
    let list = this.#calls.get(name);
    if (!list) this.#calls.set(name, (list = []));
    list.push(record);
  }

  #settle(): void {
    const waiters = this.#waiters;
    this.#waiters = [];
    for (const resolve of waiters) resolve();
  }

  #showStatus(): void {
    if (this.#status) this.#status.textContent = this.controller?.status ?? 'idle';
  }

  // Tools (the registry the controller's tool requests resolve against) -----------------------

  #applyTools(): void {
    const { registry, layout, diagnostics } = resolveFixtureTools({
      engine: this.#engine,
      nodes: this.#nodes,
      tools: this.#tools,
      layout: this.#layoutInput,
    });
    this.#registry = registry;
    this.#layout = layout;
    this.controller.setTools({ registry, layout, strings: textEditorStrings });
    for (const diagnostic of diagnostics)
      this.#event(EVENT_NAMES.diagnostic, diagnostic, diagnostic);
  }

  /** The resolved registry and layout that tool requests use. */
  get tools(): readonly TextEditorTool[] | null {
    return this.#tools;
  }
  set tools(tools: readonly TextEditorTool[] | null) {
    this.#tools = tools ? Object.freeze([...tools]) : null;
    this.#applyTools();
  }
  get layout(): Partial<TextEditorLayout> | null {
    return this.#layoutInput;
  }
  set layout(layout: Partial<TextEditorLayout> | null) {
    this.#layoutInput = layout;
    this.#applyTools();
  }
  get registry(): TextEditorToolRegistry {
    return this.#registry!;
  }
  get resolvedLayout(): TextEditorLayout {
    return this.#layout!;
  }

  // Root attributes (what the widget will pass; the element's own mapping is M6) -------------

  /** The record that the harness passes to `setRootAttributes`. */
  rootAttributeRecord(): TextEditorRootAttributes {
    return {
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': this.#label || textEditorStrings.label,
      'aria-placeholder': this.#placeholder || null,
      'aria-readonly': this.#readOnly ? 'true' : null,
      'aria-disabled': this.#disabled ? 'true' : null,
      tabindex: this.#disabled ? null : '0',
      spellcheck: 'true',
    };
  }

  #applyRootAttributes(): void {
    this.#live?.setRootAttributes(this.rootAttributeRecord());
  }

  get label(): string {
    return this.#label;
  }
  set label(label: string) {
    this.#label = label;
    this.#applyRootAttributes();
  }
  get placeholder(): string {
    return this.#placeholder;
  }
  set placeholder(placeholder: string) {
    this.#placeholder = placeholder;
    this.#applyRootAttributes();
  }
  get readOnly(): boolean {
    return this.#readOnly;
  }
  set readOnly(readOnly: boolean) {
    this.#readOnly = readOnly;
    this.controller.setAccess({ readOnly, disabled: this.#disabled });
    this.#applyRootAttributes();
  }
  get disabled(): boolean {
    return this.#disabled;
  }
  set disabled(disabled: boolean) {
    this.#disabled = disabled;
    this.controller.setAccess({ readOnly: this.#readOnly, disabled });
    this.#applyRootAttributes();
  }

  // Engine and nodes ---------------------------------------------------------------------------

  /** The engine (unwrapped); `'default'` restores the instance's own engine. */
  get engine(): TextEditorEngine | null {
    return this.#engine;
  }
  set engine(engine: TextEditorEngine | null | 'default') {
    const next = engine === 'default' ? this.#original : engine;
    this.#engine = next;
    this.#applyTools();
    this.controller.setEngine(next ? recordEngine(next, this.#sink) : null);
  }
  get nodes(): readonly TextEditorNodeDefinition[] {
    return this.#nodes;
  }
  set nodes(nodes: readonly TextEditorNodeDefinition[]) {
    this.#nodes = Object.freeze([...nodes]);
    this.controller.setNodes(this.#nodes);
    this.#applyTools();
  }

  /** Mounts anew with a fresh wrapper of the same engine: the document carries over. */
  remount(): Promise<TextEditorStatus> {
    if (this.#engine) this.controller.setEngine(recordEngine(this.#engine, this.#sink));
    return this.settled();
  }

  /** How many times the engine was mounted. */
  get mounts(): number {
    return this.#mounts;
  }

  // Facade --------------------------------------------------------------------------------------

  get status(): TextEditorStatus {
    return this.controller.status;
  }
  get state(): TextEditorEngineState {
    return this.controller.state;
  }
  get value() {
    return this.controller.value;
  }
  get native(): unknown {
    return this.controller.native;
  }
  /** The recording wrapper of the live engine instance, or `null`. */
  get instance(): TextEditorEngineInstance | null {
    return this.#live;
  }
  /** The editing root: the container's only child. */
  get root(): HTMLElement | null {
    return this.container.firstElementChild as HTMLElement | null;
  }

  /** A request with surface `api` and reason `imperative-action`, as the widget's `run`. */
  run(
    target: string | TextEditorAction | readonly TextEditorAction[],
    options: RunOptions = {},
  ): Promise<TextEditorRequestOutcome> {
    return this.controller.request({
      target,
      value: options.value,
      surface: options.surface ?? 'api',
      reason: options.reason ?? 'imperative-action',
      sourceEvent: options.sourceEvent,
      focus: options.focus,
    });
  }

  /** `setContent` after ready: one undoable step that keeps the earlier history. */
  setContent(
    content: unknown,
    format: TextEditorFormat = 'html',
  ): Promise<TextEditorRequestOutcome> {
    return this.run({ type: 'content.set', content, format, history: 'push' });
  }

  getContent(format: TextEditorFormat = 'html', options?: TextEditorContentOptions): unknown {
    if (options) return this.#live?.getContent(format, options) ?? null;
    return this.controller.getContent(format);
  }

  /** A form-state restore: silent, the history cleared. */
  restoreContent(content: unknown, format: TextEditorFormat = 'html'): void {
    this.controller.restoreContent({ content, format });
  }

  setDefaultContent(content: unknown, format: TextEditorFormat = 'html'): void {
    this.controller.setDefaultContent(content === null ? null : { content, format });
  }

  can(action: TextEditorAction): boolean {
    return this.controller.can(action);
  }

  subscribe<S>(selector: (state: TextEditorEngineState) => S, callback: (selected: S) => void) {
    return this.controller.subscribe(selector, callback);
  }

  /** As the widget's `focus`: nothing while not ready or while disabled. */
  async focus(options: { readonly position?: TextEditorFocusPosition } = {}): Promise<void> {
    const live = this.#live;
    if (!live || this.controller.status !== 'ready' || this.#disabled) return;
    await live.focus(options.position ?? 'restore');
  }

  blur(): void {
    this.#live?.blur();
  }

  connect(): void {
    this.controller.connect();
  }
  disconnect(): void {
    this.controller.disconnect();
  }

  /** Resolves once the current mount is ready or failed, or at once without an engine. */
  settled(): Promise<TextEditorStatus> {
    const status = this.controller.status;
    // Without an engine the controller stays idle: nothing to wait for.
    if (status === 'ready' || status === 'error' || !this.#engine) return Promise.resolve(status);
    return new Promise((resolve) => this.#waiters.push(() => resolve(this.controller.status)));
  }

  // Logs ----------------------------------------------------------------------------------------

  /** Recorded calls by name: instance methods, `mount` and the context notifications. */
  calls(): Record<string, CallRecord[]> {
    return Object.fromEntries([...this.#calls].map(([name, list]) => [name, [...list]]));
  }
  callCounts(): Record<string, number> {
    return Object.fromEntries([...this.#calls].map(([name, list]) => [name, list.length]));
  }
  events(): EventRecord[] {
    return [...this.#events];
  }
  /** The details as the host hooks received them: snapshot handles, events and errors. */
  rawEvents(): { readonly type: string; readonly detail: unknown }[] {
    return [...this.#raw];
  }
  clear(): void {
    this.#calls.clear();
    this.#events.length = 0;
    this.#raw.length = 0;
  }
}

function requestSummary(detail: TextEditorRequestDetail): Record<string, unknown> {
  return {
    actions: summarize(detail.actions),
    tool: detail.tool,
    surface: detail.surface,
    value: summarize(detail.value),
    reason: detail.reason,
    sourceEvent: summarize(detail.sourceEvent),
    trigger: summarize(detail.trigger),
  };
}

const isThenable = <T>(value: T | Promise<T>): value is Promise<T> =>
  typeof (value as { then?: unknown } | null)?.then === 'function';

// Registry ------------------------------------------------------------------------------------

/** A corpus document: canonical HTML, and its Markdown and text goldens where they exist. */
export interface CorpusDocument {
  readonly name: string;
  readonly html: string;
  readonly markdown: string | null;
  readonly text: string | null;
  /** Whether it needs the corpus custom node definitions (the `custom` instances have them). */
  readonly custom: boolean;
}

/** The page's state, filled by `engines.ts`. */
export const fixture = {
  editors: new Map<string, FixtureEditorLike>(),
  corpus: new Map<string, CorpusDocument>(),
  level: 0 as Level,
};

export function editorOf(id: string): FixtureEditorLike {
  const editor = fixture.editors.get(id);
  if (!editor) throw new Error(`No instance "${id}" on this page.`);
  return editor;
}

export function corpusOf(name: string): CorpusDocument {
  const document = fixture.corpus.get(name);
  if (!document) throw new Error(`No corpus document "${name}".`);
  return document;
}

/** Loads a corpus document through `restoreContent`: silent, the history cleared. */
export async function resetEditor(id: string, name: string): Promise<void> {
  const editor = editorOf(id);
  await editor.settled();
  await editor.restoreContent(corpusOf(name).html, 'html');
  await settle();
}
