/**
 * Headless behavior of the text editor (Widgets `uwg-te-par-engine-1`, `uwg-te-req-engine-5` to
 * `uwg-te-req-engine-8`, `uwg-te-req-tools-2` to `uwg-te-req-tools-4`, `uwg-te-req-evt-1` to
 * `uwg-te-req-evt-5`, `uwg-te-req-prop-2`, `uwg-te-req-perf-1`, `uwg-te-req-value-1` to
 * `uwg-te-req-value-4`; Foundation `map-f-mount`, `map-f-lifecycle`, `map-f-pre-ready`).
 *
 * The controller mounts the engine while the widget is connected, publishes the normalized state
 * once per frame, passes every document change the widget initiates through one request
 * pipeline, queues content set before ready, carries the document over to a new mount as portable
 * HTML and supplies the value changes and commits. The widget hands it a host adapter for its
 * container, frames, styles and events: this class dispatches no event, writes no DOM and reads
 * no window or document of its own.
 */
import { domError } from '../dom-error.js';
import { EngineMountSession } from '../engine-session.js';
import type { FrameSource } from '../frame-loop.js';
import { frozenCopy } from '../freeze.js';
import { imageProtocols, linkProtocols } from '../markdown/url.js';
import { deferRelease } from '../services.js';
import type { ChangeReason } from '../types.js';
import {
  actionKey,
  assertTextEditorFormat,
  isMutatingAction,
  isSelectionOnly,
  isValidTextEditorAction,
  type TextEditorAction,
  type TextEditorContentSetAction,
} from './actions.js';
import { InputCauseTracker } from './cause.js';
import { parseHtmlDocument } from './content/dom.js';
import { importHtml } from './content/html.js';
import { readMarkdown, writeMarkdown } from './content/markdown.js';
import {
  isEmptyDocument,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
} from './content/portable.js';
import { firstTextEdge, stepTextPoint, type TextEditorStepDirection } from './content/edges.js';
import { readText, writeText } from './content/text.js';
import { isPreviewFormat } from './content/view.js';
import type {
  TextEditorContentChange,
  TextEditorContentInput,
  TextEditorDiagnosticCode,
  TextEditorEngine,
  TextEditorEngineContext,
  TextEditorEngineInstance,
  TextEditorEngineLabels,
  TextEditorEngineViews,
  TextEditorFormat,
  TextEditorPortableFormat,
  TextEditorSnapshot,
  TextEditorUrlPolicy,
} from './engine.js';
import { createBlockId } from './ids.js';
import { defaultTextEditorLayout, type TextEditorLayout } from './layout.js';
import type {
  TextEditorBlock,
  TextEditorEngineState,
  TextEditorSelection,
  TextEditorTextPoint,
} from './model.js';
import type { TextEditorNodeDefinition } from './nodes.js';
import { preReadyState, TextEditorStore } from './state.js';
import { textEditorStrings, type TextEditorStrings } from './strings.js';
import {
  checkToolValue,
  suggestionEntryTool,
  toolActions,
  toolEnabled,
  type TextEditorRequestSurface,
  type TextEditorTool,
  type TextEditorToolContext,
  type TextEditorToolKind,
  type TextEditorToolRegistry,
  type TextEditorToolSelectionTarget,
  type TextEditorToolTarget,
} from './tools.js';

// Requests (uwg-te-req-evt-1, uwg-te-req-evt-2)

/**
 * How a request settles: `applied` once its actions executed, also when they left the document
 * unchanged; `unchanged` when there was nothing to do, the tool was not enabled, or a later call
 * superseded content set before ready; `cancelled` when a listener prevented the request;
 * `opened` when a tool run without a value opened its surface.
 */
export type TextEditorRequestOutcome = 'applied' | 'unchanged' | 'cancelled' | 'opened';

/** The detail of `tp-text-editor-request`: frozen, its actions deeply. */
export interface TextEditorRequestDetail {
  /** The actions the request executes; none for a tool that acts outside the document. */
  readonly actions: readonly TextEditorAction[];
  /**
   * The identifier of the activated tool, the executed entry's for a slash menu entry, or `null`
   * for actions.
   */
  readonly tool: string | null;
  /** The surface that issued the request. */
  readonly surface: TextEditorRequestSurface;
  /** The value of a tool that takes one. */
  readonly value: unknown;
  readonly reason: ChangeReason;
  /** The originating event, or a synthetic `tp-programmatic-source` placeholder. */
  readonly sourceEvent: Event;
  /** The element that issued the request, or `null`. */
  readonly trigger: Element | null;
}

/**
 * The detail of `tp-text-editor-request-failed`: the request detail and the error. A request
 * rejected before its actions resolved, for an unknown or unavailable tool or for a value outside
 * the domain of its tool's kind, carries an empty `actions` list.
 */
export interface TextEditorRequestFailedDetail extends TextEditorRequestDetail {
  readonly error: unknown;
}

/** A document change the widget proposes: from `run`, `setContent`, form reset or a surface. */
export interface TextEditorRequestProposal {
  /** A tool identifier, an action or a list of actions. */
  readonly target: string | TextEditorAction | readonly TextEditorAction[];
  /** The value of a tool that takes one. */
  readonly value?: unknown;
  readonly surface: TextEditorRequestSurface;
  readonly reason: ChangeReason;
  readonly sourceEvent?: Event | undefined;
  readonly trigger?: Element | null | undefined;
  /** Whether applying the actions moves focus into the editing root; default true. */
  readonly focus?: boolean | undefined;
  /** What a tool acts on, such as the line of a table menu; the selection by default. */
  readonly toolTarget?: TextEditorToolTarget | undefined;
}

// Host (map-f-mount precedent: the widget implements it inside its element class)

/** The data of `tp-value-change`. */
export interface TextEditorValueChange {
  /** The snapshot handle of the new revision. */
  readonly value: TextEditorSnapshot;
  /** The snapshot handle of the revision published last. */
  readonly previousValue: TextEditorSnapshot;
  readonly reason: ChangeReason;
  readonly sourceEvent: Event | undefined;
  /** `request` for an applied request, `engine` for a change that the engine originated. */
  readonly origin: 'request' | 'engine';
  /** The tool of the request, or `null`. */
  readonly tool: string | null;
  /** The actions of the request; none for a change that the engine originated. */
  readonly actions: readonly TextEditorAction[];
}

/** The data of `tp-value-commit`. */
export interface TextEditorValueCommit {
  readonly value: TextEditorSnapshot;
  readonly previousValue: TextEditorSnapshot;
  readonly reason: ChangeReason;
  readonly sourceEvent: Event | undefined;
}

/** `idle` without a mount, `loading` from the mount until ready, then `ready`, or `error`. */
export type TextEditorStatus = 'idle' | 'loading' | 'ready' | 'error';

/** The widget's `readOnly` and `disabled`. */
export interface TextEditorAccess {
  readonly readOnly: boolean;
  readonly disabled: boolean;
}

/** The tools as the widget resolves them, which tool requests run against. */
export interface TextEditorControllerTools {
  readonly registry: TextEditorToolRegistry;
  /** The resolved layout: every key present and `*` expanded. */
  readonly layout: TextEditorLayout;
  readonly strings: TextEditorStrings;
}

export interface TextEditorControllerHost {
  /** The element the engine mounts into, in the widget's shadow root; `null` before render. */
  container(): HTMLElement | null;
  /** The animation frames of the widget's window. */
  frames(): FrameSource;
  /** The writing direction of the widget, which names the sides of table columns. */
  direction(): 'ltr' | 'rtl';
  /** Whether the widget uploads image files (its `imageUpload` hook is set); false when absent. */
  imageUpload?(): boolean;
  /** The views the widget renders into engine-owned hosts, such as the pending image's upload. */
  views?(): TextEditorEngineViews | undefined;
  /** Adopts engine styles into the widget's shadow root; returns their release. */
  adoptStyles(cssText: string): () => void;
  /** Dispatches the cancelable request; returns `false` when it was cancelled. */
  dispatchRequest(detail: TextEditorRequestDetail): boolean;
  requestFailed(detail: TextEditorRequestFailedDetail): void;
  /** Opens the surface of a tool run without a value, which is no request; whether it opened. */
  openSurface(tool: TextEditorTool, detail: TextEditorRequestDetail): boolean;
  /**
   * The instance of each mount once its result arrives, before ready, and `null` right before
   * that instance is destroyed: teardown, failure, the deferred release, a remount and dispose. A
   * mount superseded before its result arrived is never announced.
   */
  attached?(instance: TextEditorEngineInstance | null): void;
  /** Once per mount, as soon as the engine reports ready. */
  ready(native: unknown): void;
  /** The mount threw or rejected, or the engine reported a fatal error. */
  failed(error: unknown): void;
  valueChanged(change: TextEditorValueChange): void;
  valueCommitted(commit: TextEditorValueCommit): void;
  diagnostic(code: TextEditorDiagnosticCode, message: string): void;
}

// Values

/** The URL policy of every mount: the protocol lists of the shared Markdown policy. */
const URLS: TextEditorUrlPolicy = Object.freeze({
  links: linkProtocols(null),
  images: imageProtocols(null),
});

const NO_ACTIONS: readonly TextEditorAction[] = Object.freeze([]);
const SELECTION: TextEditorToolSelectionTarget = Object.freeze({ kind: 'selection' });
const DEFAULT_LABELS: TextEditorEngineLabels = Object.freeze({
  taskCheckbox: textEditorStrings.taskCheckbox,
});

/** Kinds that open their surface when run without a value (uwg-te-req-tools-4). */
const OPENS_SURFACE_WITHOUT_VALUE: ReadonlySet<TextEditorToolKind> = new Set<TextEditorToolKind>([
  'link',
  'table-size',
]);
/** Kinds whose `run` without a value settles unchanged. */
const UNCHANGED_WITHOUT_VALUE: ReadonlySet<TextEditorToolKind> = new Set<TextEditorToolKind>([
  'color',
  'radio-menu',
  'menu',
  'suggestion',
]);

const isActionList = (
  target: TextEditorAction | readonly TextEditorAction[],
): target is readonly TextEditorAction[] => Array.isArray(target);

/** The `content.set` of a list that holds it alone, or `null`. */
const soleContentSet = (actions: readonly TextEditorAction[]): TextEditorContentSetAction | null =>
  actions.length === 1 && actions[0]!.type === 'content.set' ? actions[0]! : null;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * The blocks of an instance that can hold a text point, textblocks and tables, in document order;
 * each is read through the library's HTML profile (`#edgeBlocks`), which keeps identifiers and
 * text-point lengths, only when it is reached.
 */
/** Whether two text points name one position: the block, the cell if any, and the offset. */
const sameTextPoint = (a: TextEditorTextPoint, b: TextEditorTextPoint): boolean =>
  a.block === b.block &&
  a.offset === b.offset &&
  a.cell?.row === b.cell?.row &&
  a.cell?.column === b.cell?.column &&
  a.cell?.paragraph === b.cell?.paragraph;

const textHolders = (instance: TextEditorEngineInstance): readonly TextEditorBlock[] =>
  instance
    .getBlocks()
    .ordered()
    .filter((block) => block.textblock || block.kind === 'table');

/**
 * A snapshot handle that serializes its revision once per format: publishing a change hands the
 * handle on without serializing, and every reader of one revision shares its serializations.
 */
class SnapshotHandle implements TextEditorSnapshot {
  readonly revision: number;
  readonly empty: boolean;
  readonly #snapshot: TextEditorSnapshot;
  readonly #content = new Map<TextEditorFormat, unknown>();

  constructor(snapshot: TextEditorSnapshot) {
    this.#snapshot = snapshot;
    this.revision = snapshot.revision;
    this.empty = snapshot.empty;
    Object.freeze(this);
  }

  getContent(format: TextEditorPortableFormat): string;
  getContent(format: 'json'): unknown;
  getContent(format: TextEditorFormat): unknown;
  getContent(format: TextEditorFormat): unknown {
    if (this.#content.has(format)) return this.#content.get(format);
    const content: unknown = this.#snapshot.getContent(format);
    this.#content.set(format, content);
    return content;
  }
}

/** A `content.set` request accepted before ready, waiting for the mount. */
interface QueuedContent {
  readonly detail: TextEditorRequestDetail;
  readonly input: TextEditorContentInput;
  resolve(outcome: TextEditorRequestOutcome): void;
  reject(error: unknown): void;
}

/** The document while no instance holds it: carried over or kept as portable HTML, or restored. */
interface KeptContent {
  readonly input: TextEditorContentInput;
  /** Carried over or kept as portable HTML, which reads in every portable format. */
  readonly portable: boolean;
  /** Whether the instance that held it was empty; absent for restored content. */
  readonly empty?: boolean | undefined;
  /** Its other portable formats, converted on the first read. */
  readonly conversions: Map<TextEditorFormat, string | null>;
}

/**
 * Pending content read as a portable document, for the definitions it was read with: `null` input
 * for nothing pending, and a `null` document for HTML that no parser reads.
 */
interface PendingRead {
  readonly input: TextEditorContentInput | null;
  readonly nodes: readonly TextEditorNodeDefinition[];
  readonly document: TextEditorPortableDocument | null;
}

/**
 * What an engine's `can` answers depend on: the document, editability, the selection, the marks
 * and the history. Focus and composition are left out: their changes publish a new state version,
 * and a focus entering the widget renders it, which resolves every tool again.
 */
export function canStateKey(
  state: Pick<
    TextEditorEngineState,
    'contentVersion' | 'editable' | 'selection' | 'marks' | 'history'
  >,
): string {
  return `${state.contentVersion}|${state.editable}|${JSON.stringify([state.selection, state.marks, state.history])}`;
}

/**
 * The block context that the answers of `block.set-type` and `block.align` on the selection depend
 * on while the selection is a text selection in one block outside tables: editability, that block
 * and its kind and attributes. Typing changes the document and the caret, not this context, so the
 * block-type and alignment tools keep their answers across keystrokes (`uwg-te-req-perf-1`). `null`
 * for any other action or selection, whose answers follow `canStateKey`.
 */
export function blockContextKey(
  state: Pick<TextEditorEngineState, 'editable' | 'selection' | 'block'>,
  action: TextEditorAction,
): string | null {
  // `can` also answers values that are no action.
  const type = (action as { readonly type?: unknown } | null | undefined)?.type;
  if (type !== 'block.set-type' && type !== 'block.align') return null;
  const { selection, block } = state;
  if ((action as { readonly ids?: unknown }).ids !== undefined) return null;
  if (selection.kind !== 'text' || !block) return null;
  const { anchor, head } = selection;
  if (anchor.cell || head.cell || anchor.block !== head.block || block.id !== anchor.block)
    return null;
  return `${state.editable}|${block.id}|${block.kind}|${block.depth}|${JSON.stringify(block.attrs)}`;
}

/**
 * The direction that the first block of a selection resolves from its text (`dir="auto"`), or the
 * first paragraph of its first cell; `undefined` without an element to read. Read through `:dir()`,
 * which needs no layout.
 */
export function textDirectionOf(
  instance: Pick<TextEditorEngineInstance, 'blockElement' | 'cellElement'>,
  selection: TextEditorSelection,
): 'ltr' | 'rtl' | undefined {
  let element: Element | null = null;
  if (selection.kind === 'text') {
    const { block, cell } = selection.anchor;
    const holder = cell ? instance.cellElement(block, cell) : instance.blockElement(block);
    element = cell ? (holder?.children[cell.paragraph] ?? holder) : holder;
  } else if (selection.kind === 'blocks') {
    element = selection.ids[0] === undefined ? null : instance.blockElement(selection.ids[0]);
  } else if (selection.kind === 'cells') {
    const cell = instance.cellElement(selection.table, selection.range.anchor);
    element = cell?.firstElementChild ?? cell;
  }
  if (!element) return undefined;
  try {
    return element.matches(':dir(rtl)') ? 'rtl' : 'ltr';
  } catch {
    return undefined;
  }
}

/**
 * The headless text editor. Before ready its state is the pre-ready state of
 * `uwg-te-req-prop-2`, its value is `null` and content reads return the pending content.
 */
export class TextEditorController {
  readonly #host: TextEditorControllerHost;
  readonly #store: TextEditorStore;
  readonly #tracker = new InputCauseTracker();
  readonly #session = new EngineMountSession<TextEditorEngineInstance>({
    attached: (instance) => this.#attached(instance),
    ready: (instance) => this.#ready(instance),
    detaching: () => {
      this.#untrack();
      this.#host.attached?.(null);
    },
    failed: (error) => this.#failed(error),
  });
  #engine: TextEditorEngine | null = null;
  #nodes: readonly TextEditorNodeDefinition[] = Object.freeze([]);
  #labels: TextEditorEngineLabels = DEFAULT_LABELS;
  #access: TextEditorAccess = Object.freeze({ readOnly: false, disabled: false });
  #tools: TextEditorControllerTools | null = null;
  #status: TextEditorStatus = 'idle';
  #connected = false;
  #cancelRelease: (() => void) | null = null;
  /** The container of the current mount, which the cause tracker observes. */
  #container: HTMLElement | null = null;
  /** The document the current mount's container belonged to when it mounted. */
  #mountDocument: Document | null = null;
  /**
   * Definitions that a change of `nodes` removed, by name: content written while they applied is
   * read with them, so that their nodes convert with the diagnostic instead of losing their kind.
   */
  readonly #retired = new Map<string, TextEditorNodeDefinition>();
  #stopTracking: (() => void) | null = null;
  /** The editability the instance has: the mount's, then each `setEditable`. */
  #instanceEditable = true;
  #default: TextEditorContentInput | null = null;
  #queued: QueuedContent | null = null;
  #kept: KeptContent | null = null;
  #pendingRead: PendingRead | null = null;
  /** The content the current mount started with. */
  #mountContent: TextEditorContentInput | null = null;
  /** The handle of the revision published last; `null` before ready. */
  #value: SnapshotHandle | null = null;
  /** The handle of the revision committed last; `null` before ready. */
  #committed: SnapshotHandle | null = null;
  /** A change the engine originated was published and not committed since; kept over a remount. */
  #uncommitted = false;
  /** A change the engine originated, with the cause of the latest one, waiting for its frame. */
  #engineChange: TextEditorContentChange | null = null;
  /** The reason of the latest document change, staged or published; `null` before the first. */
  #lastChangeReason: ChangeReason | null = null;
  #frame: number | undefined;
  #engineCheck: number | undefined;
  #engineReported = false;
  /** A request's actions are executing: its content notification belongs to the request. */
  #executing = false;
  /** Content applies without a change: content queued while the mount loaded, or a restore. */
  #silent = false;
  #canInstance: TextEditorEngineInstance | null = null;
  /** The state whose `canStateKey` was last read, and that key. */
  #canState: TextEditorEngineState | null = null;
  #canKey = '';
  readonly #canAnswers = new Map<string, boolean>();
  /** The answers of the last block context (`blockContextKey`) and that context. */
  #contextKey = '';
  readonly #contextAnswers = new Map<string, boolean>();

  constructor(host: TextEditorControllerHost) {
    this.#host = host;
    // Frames are read when one is requested, never while the widget is constructed.
    const frames: FrameSource = {
      requestAnimationFrame: (callback) => host.frames().requestAnimationFrame(callback),
      cancelAnimationFrame: (handle) => host.frames().cancelAnimationFrame(handle),
      now: () => host.frames().now(),
    };
    this.#store = new TextEditorStore(frames, preReadyState({ editable: true, empty: true }));
  }

  /** The published normalized state: the same object until the next publication. */
  get state(): TextEditorEngineState {
    return this.#store.state;
  }

  get status(): TextEditorStatus {
    return this.#status;
  }

  /** Whether a staged state waits for the frame that publishes it. */
  get publicationPending(): boolean {
    return this.#frame !== undefined;
  }

  /** The snapshot handle of the committed document; `null` before ready. */
  get value(): TextEditorSnapshot | null {
    return this.#status === 'ready' ? this.#value : null;
  }

  /**
   * The reason of the latest document change, also while the engine's change waits for its frame:
   * the open lanes of the suggestion lists read it on the state publication that precedes that
   * value change (`uwg-te-tab-reasons` r12, r13).
   */
  get lastChangeReason(): ChangeReason | null {
    return this.#lastChangeReason;
  }

  /** The engine's editor object while ready, or `null`. */
  get native(): unknown {
    return this.#status === 'ready' ? (this.#session.instance?.native ?? null) : null;
  }

  /** Calls `callback` at most once per publication, when the selected slice changed. */
  subscribe<S>(
    selector: (state: TextEditorEngineState) => S,
    callback: (selected: S) => void,
  ): () => void {
    return this.#store.subscribe(selector, callback);
  }

  // Lifecycle (uwg-te-req-engine-7, uwg-te-req-engine-8) ------------------------------------

  connect(): void {
    this.#connected = true;
    this.#engineReported = false;
    this.#store.resume();
    if (this.#cancelRelease) {
      this.#cancelRelease();
      this.#cancelRelease = null;
      if (this.#movedDocument()) {
        // A reconnection into another document within the release window mounts anew with the
        // document carried over, as replacing the engine does; it moves no focus by itself.
        this.#end();
      } else {
        // A reconnection into the same document keeps the instance (map-f-lifecycle).
        this.#track();
        if (this.#engineChange) this.#scheduleFrame();
      }
    }
    this.#mount();
    this.#checkEngine();
  }

  /**
   * Stops the controller's own work at once, its frames and the publication of the state included,
   * and releases the instance after two frames, keeping its document as portable HTML for the next
   * mount and publishing the state before ready with the release; a reconnection before cancels
   * the release.
   */
  disconnect(): void {
    this.#connected = false;
    this.#untrack();
    this.#cancelFrame();
    this.#cancelEngineCheck();
    this.#store.pause();
    this.#cancelRelease?.();
    this.#cancelRelease = deferRelease(this.#host.frames(), () => {
      this.#cancelRelease = null;
      if (this.#connected) return;
      this.#end();
      this.#store.flush();
    });
  }

  /** Final cleanup when the widget is gone for good. */
  dispose(): void {
    this.#cancelRelease?.();
    this.#cancelRelease = null;
    this.#connected = false;
    this.#cancelEngineCheck();
    this.#engine = null;
    this.#teardown();
    const queued = this.#queued;
    this.#queued = null;
    queued?.resolve('unchanged');
    this.#store.dispose();
  }

  /**
   * Assigns the engine. A different engine ends the mount, carrying its document over, and mounts
   * anew; `null` returns to idle and reports the missing engine.
   */
  setEngine(engine: TextEditorEngine | null): void {
    if (engine === this.#engine) return;
    this.#end();
    this.#engine = engine;
    this.#mount();
    if (engine) return;
    this.#engineReported = false;
    this.#checkEngine();
  }

  /** Sets the custom node definitions; a change remounts with the document carried over. */
  setNodes(nodes: readonly TextEditorNodeDefinition[]): void {
    const current = this.#nodes;
    if (nodes.length === current.length && nodes.every((node, index) => node === current[index]))
      return;
    const mounted = this.#mounted();
    if (mounted) this.#end();
    for (const definition of current) this.#retired.set(definition.name, definition);
    for (const definition of nodes) this.#retired.delete(definition.name);
    this.#nodes = Object.freeze([...nodes]);
    this.#kept?.conversions.clear();
    // The definitions decide what pending HTML and Markdown read as.
    this.#stagePreReady();
    if (mounted) this.#mount();
  }

  /**
   * Sets the labels that the engine renders; a change of the task checkbox name remounts with the
   * document carried over, and no other string remounts.
   */
  setViewLabels(labels: TextEditorEngineLabels): void {
    if (labels.taskCheckbox === this.#labels.taskCheckbox) return;
    const mounted = this.#mounted();
    if (mounted) this.#end();
    this.#labels = Object.freeze({ taskCheckbox: labels.taskCheckbox });
    if (mounted) this.#mount();
  }

  /** Sets `readOnly` and `disabled`: the instance's editability and the request gate follow. */
  setAccess(access: TextEditorAccess): void {
    const editable = this.#editable;
    this.#access = Object.freeze({ readOnly: access.readOnly, disabled: access.disabled });
    if (this.#editable === editable) return;
    const instance = this.#session.instance;
    if (instance) this.#applyEditable(instance);
    this.#stagePreReady();
  }

  /** Sets `defaultValue`: the content of a mount when no other content is pending. */
  setDefaultContent(input: TextEditorContentInput | null): void {
    this.#default = input ? Object.freeze({ content: input.content, format: input.format }) : null;
    this.#stagePreReady();
  }

  /** Sets the tools that tool requests resolve against. */
  setTools(tools: TextEditorControllerTools | null): void {
    this.#tools = tools;
  }

  // Requests (uwg-te-req-evt-1, uwg-te-req-evt-2, uwg-te-req-tools-3, uwg-te-req-tools-4) ---

  /**
   * Passes one proposed change through the pipeline. In order: an unknown tool, a value outside
   * the domain of the tool's kind and an unavailable tool reject before the actions resolve; a
   * link, image or table-size tool without a value opens its surface, and a color, radio-menu,
   * menu or suggestion tool run without a value settles unchanged; the actions resolve, and
   * actions that only change the selection apply directly; a change of the document while
   * read-only or disabled rejects, `content.set` excepted; a tool that is not enabled while the
   * editor is ready settles unchanged; then the request is dispatched. Before ready an accepted
   * `content.set` waits for the mount and any other request rejects; when ready the actions
   * execute as one transaction. Every rejection of a request reports its failed detail.
   */
  request(proposal: TextEditorRequestProposal): Promise<TextEditorRequestOutcome> {
    const sourceEvent = proposal.sourceEvent ?? new Event('tp-programmatic-source');
    const tool = typeof proposal.target === 'string' ? proposal.target : null;
    // An entry of the slash menu reports the tool that it executes, which takes no value there.
    const detail = (
      actions: readonly TextEditorAction[],
      entry: string | null = null,
    ): TextEditorRequestDetail =>
      Object.freeze({
        actions,
        tool: entry ?? tool,
        surface: proposal.surface,
        // Only a tool takes a value.
        value: tool === null || entry !== null ? undefined : proposal.value,
        reason: proposal.reason,
        sourceEvent,
        trigger: proposal.trigger ?? null,
      });
    try {
      return this.#request(proposal, detail);
    } catch (error) {
      // A function of the tool threw: the request fails before its actions resolve.
      return this.#reject(detail(NO_ACTIONS), error);
    }
  }

  /**
   * Selects the content of the editing root, from its first to its last text point, while the
   * editor is ready, read-only and not disabled: a selection-only change, with no request and no
   * value change, that keeps focus where it is. Otherwise it does nothing.
   */
  selectContent(sourceEvent: Event): void {
    const instance = this.#readyInstance();
    const { readOnly, disabled } = this.#access;
    if (!instance || !readOnly || disabled) return;
    // Normally one block from each end is read.
    const blocks = textHolders(instance);
    const anchor = firstTextEdge(this.#edgeBlocks(instance, blocks, 'start'), 'start');
    const head = anchor && firstTextEdge(this.#edgeBlocks(instance, blocks, 'end'), 'end');
    if (!anchor || !head) return;
    this.#selectText(anchor, head, sourceEvent);
  }

  /**
   * Whether the live selection is the whole-document selection (`uwg-te-req-engine-4`): a text
   * selection that is not collapsed from the document's first to its last text point, either way
   * round, however it was made. Escape turns it into every top-level block, atoms and tables before
   * the first or after the last text point included (`uwg-te-req-blocks-4`). Normally one block
   * from each end is read.
   */
  holdsWholeDocument(): boolean {
    const instance = this.#readyInstance();
    if (!instance) return false;
    const { selection } = instance.getState();
    if (selection.kind !== 'text' || selection.empty) return false;
    const blocks = textHolders(instance);
    const first = firstTextEdge(this.#edgeBlocks(instance, blocks, 'start'), 'start');
    const last = first && firstTextEdge(this.#edgeBlocks(instance, blocks, 'end'), 'end');
    if (!first || !last) return false;
    const { anchor, head } = selection;
    return (
      (sameTextPoint(anchor, first) && sameTextPoint(head, last)) ||
      (sameTextPoint(anchor, last) && sameTextPoint(head, first))
    );
  }

  /**
   * Extends a caret, or no selection, by one character while the editor is ready, read-only and
   * not disabled (`uwg-te-req-a11y-1`, `uwg-te-req-prop-3`): a browser extends no collapsed
   * selection in content that is not editable, and extends a non-empty one itself. The anchor is
   * the caret, or without a selection the document's first text point (`forward`) or its last
   * (`backward`); the head is one character from it (`stepTextPoint`), or, past the edge of a
   * textblock, the nearest text point of the adjacent block that holds text. A selection-only
   * change, as `selectContent` makes, that keeps focus where it is. Answers whether it set a
   * selection: a non-empty text selection, a block or cell selection, the document's edge and a
   * table cell's edge set none.
   */
  extendSelection(direction: TextEditorStepDirection, sourceEvent: Event): boolean {
    const instance = this.#readyInstance();
    const { readOnly, disabled } = this.#access;
    if (!instance || !readOnly || disabled) return false;
    const { selection } = instance.getState();
    if (selection.kind !== 'none' && !(selection.kind === 'text' && selection.empty)) return false;
    const blocks = textHolders(instance);
    const side = direction === 'forward' ? 'start' : 'end';
    const anchor =
      selection.kind === 'text'
        ? selection.head
        : firstTextEdge(this.#edgeBlocks(instance, blocks, side), side);
    const index = anchor ? blocks.findIndex((block) => block.id === anchor.block) : -1;
    if (!anchor || index < 0) return false;
    let head: TextEditorTextPoint | null = null;
    for (const own of this.#edgeBlocks(instance, [blocks[index]!], side))
      head = stepTextPoint(own, anchor, direction);
    // A text selection leaves a table cell only through the engine's own cell selection.
    if (!head && !anchor.cell) {
      const rest = direction === 'forward' ? blocks.slice(index + 1) : blocks.slice(0, index);
      head = firstTextEdge(this.#edgeBlocks(instance, rest, side), side);
    }
    if (!head) return false;
    this.#selectText(anchor, head, sourceEvent);
    return true;
  }

  /** Sets a text selection from a key, keeping focus where it is. */
  #selectText(anchor: TextEditorTextPoint, head: TextEditorTextPoint, sourceEvent: Event): void {
    // A rejection is reported to the host as for any selection request.
    this.request({
      target: { type: 'selection.set', selection: { kind: 'text', anchor, head } },
      surface: 'keyboard',
      reason: 'hotkey',
      sourceEvent,
      focus: false,
    }).catch(() => undefined);
  }

  /** Blocks as portable blocks, one at a time from one end, each read only when it is reached. */
  *#edgeBlocks(
    instance: TextEditorEngineInstance,
    blocks: readonly TextEditorBlock[],
    side: 'start' | 'end',
  ): Generator<TextEditorPortableBlock> {
    for (let index = 0; index < blocks.length; index++) {
      const block = blocks[side === 'start' ? index : blocks.length - 1 - index]!;
      const content = instance.getContent('html', { blocks: [block.id] });
      const read = this.#portable({ format: 'html', content })?.blocks[0];
      if (read) yield read;
    }
  }

  #request(
    proposal: TextEditorRequestProposal,
    detail: (
      actions: readonly TextEditorAction[],
      entry?: string | null,
    ) => TextEditorRequestDetail,
  ): Promise<TextEditorRequestOutcome> {
    const { target, value, surface } = proposal;
    let tool: TextEditorTool | null = null;
    let context: TextEditorToolContext | null = null;
    let actions: readonly TextEditorAction[];
    let entry: string | null = null;
    if (typeof target === 'string') {
      const registry = this.#tools?.registry;
      tool = registry?.tools.get(target) ?? null;
      if (!registry || !tool)
        return this.#reject(
          detail(NO_ACTIONS),
          domError('NotSupportedError', `No tool has the identifier "${target}".`),
        );
      context = this.#toolContext(surface, value, proposal.toolTarget);
      const outside = value === undefined ? null : checkToolValue(tool, value, URLS, context);
      if (outside) return this.#reject(detail(NO_ACTIONS), outside);
      if (!registry.isAvailable(target))
        return this.#reject(
          detail(NO_ACTIONS),
          domError(
            'NotSupportedError',
            `The engine does not declare the capabilities of the tool "${target}".`,
          ),
        );
      if (value === undefined && OPENS_SURFACE_WITHOUT_VALUE.has(tool.kind)) {
        // Opening a surface is no request.
        const opened =
          this.#enabled(tool, context) && this.#host.openSurface(tool, detail(NO_ACTIONS));
        return Promise.resolve(opened ? 'opened' : 'unchanged');
      }
      if (value === undefined && surface === 'api' && UNCHANGED_WITHOUT_VALUE.has(tool.kind))
        return Promise.resolve('unchanged');
      const resolved = toolActions(tool, context, registry);
      if (resolved === null) return Promise.resolve('unchanged');
      actions = frozenCopy(resolved);
      // A slash entry's request names the executed tool with surface slash (uwg-te-sec-events).
      if (surface === 'slash') entry = suggestionEntryTool(tool, context, registry)?.id ?? null;
    } else {
      actions = frozenCopy(isActionList(target) ? target : [target]);
      if (actions.length === 0) return Promise.resolve('unchanged');
      const problem = malformed(actions);
      if (problem) return this.#reject(detail(actions), domError('NotSupportedError', problem));
    }
    if (isSelectionOnly(actions))
      return this.#select(actions, detail(actions, entry), proposal.focus);
    const set = soleContentSet(actions);
    const { readOnly, disabled } = this.#access;
    if ((readOnly || disabled) && !set && actions.some(isMutatingAction))
      return this.#reject(
        detail(actions, entry),
        domError(
          'NotSupportedError',
          `The editor is ${disabled ? 'disabled' : 'read-only'}: only content.set changes it.`,
        ),
      );
    if (tool && context && this.#status === 'ready' && !this.#enabled(tool, context))
      return Promise.resolve('unchanged');
    const request = detail(actions, entry);
    if (!this.#host.dispatchRequest(request)) return Promise.resolve('cancelled');
    return this.#accept(request, set, proposal.focus);
  }

  /**
   * Applies actions that only change the selection: no request, reason or value change. Before
   * ready they reject, and a rejection reports the detail that their request would have carried.
   */
  #select(
    actions: readonly TextEditorAction[],
    detail: TextEditorRequestDetail,
    focus: boolean | undefined,
  ): Promise<TextEditorRequestOutcome> {
    const instance = this.#readyInstance();
    if (!instance)
      return this.#reject(detail, domError('InvalidStateError', 'The editor is not ready.'));
    try {
      instance.execute(actions, { reason: detail.reason, sourceEvent: detail.sourceEvent, focus });
    } catch (error) {
      return this.#reject(detail, error);
    }
    return Promise.resolve('applied');
  }

  /** Settles an accepted request: queued or rejected before ready, executed when ready. */
  #accept(
    request: TextEditorRequestDetail,
    set: TextEditorContentSetAction | null,
    focus: boolean | undefined,
  ): Promise<TextEditorRequestOutcome> {
    const instance = this.#readyInstance();
    if (!instance) {
      if (set) return this.#queue(request, set);
      return this.#reject(request, domError('InvalidStateError', 'The editor is not ready.'));
    }
    // A change the engine originated before this request publishes first.
    this.#publishEngineChange();
    // A tool that acts outside the document acts once its request is accepted.
    if (request.actions.length === 0) return Promise.resolve('applied');
    const { reason, sourceEvent } = request;
    const before = instance.getState().contentVersion;
    const withdraw = this.#tracker.expectAction(
      reason,
      sourceEvent,
      request.actions.find(isMutatingAction)?.type,
    );
    let failure: { readonly error: unknown } | null = null;
    this.#executing = true;
    try {
      if (set) instance.setContent(set.content, set.format, { history: set.history, reason });
      else if (!instance.execute(request.actions, { reason, sourceEvent, focus }))
        failure = { error: domError('NotSupportedError', 'The engine did not apply the actions.') };
    } catch (error) {
      failure = { error };
    } finally {
      this.#executing = false;
      withdraw();
    }
    if (failure) return this.#reject(request, failure.error);
    if (this.#readyInstance() === instance && instance.getState().contentVersion !== before)
      this.#publish(
        instance,
        { reason, sourceEvent, origin: 'request', tool: request.tool, actions: request.actions },
        true,
      );
    return Promise.resolve('applied');
  }

  /** Queues content set before ready: the last call wins, the one it supersedes is unchanged. */
  #queue(
    request: TextEditorRequestDetail,
    set: TextEditorContentSetAction,
  ): Promise<TextEditorRequestOutcome> {
    return new Promise((resolve, reject) => {
      const superseded = this.#queued;
      this.#queued = {
        detail: request,
        input: Object.freeze({ content: set.content, format: set.format }),
        resolve,
        reject,
      };
      superseded?.resolve('unchanged');
      this.#stagePreReady();
    });
  }

  #reject(detail: TextEditorRequestDetail, error: unknown): Promise<never> {
    this.#host.requestFailed(Object.freeze({ ...detail, error }));
    return Promise.reject(error);
  }

  #failQueued(queued: QueuedContent, error: unknown): void {
    this.#host.requestFailed(Object.freeze({ ...queued.detail, error }));
    queued.reject(error);
  }

  /**
   * Replaces the content for a form-state restore: no request, reason or value change, and the
   * history cleared. Before ready it becomes the content of the mount, superseding content set
   * before, and a mount already loading applies it once ready; content the engine cannot read is
   * reported and leaves the document unchanged.
   */
  restoreContent(input: TextEditorContentInput): void {
    assertTextEditorFormat(input.format);
    const instance = this.#readyInstance();
    if (!instance) {
      const superseded = this.#queued;
      this.#queued = null;
      superseded?.resolve('unchanged');
      this.#kept = {
        input: Object.freeze({ content: input.content, format: input.format }),
        portable: false,
        conversions: new Map(),
      };
      this.#stagePreReady();
      return;
    }
    this.#publishEngineChange();
    let failure: { readonly error: unknown } | null = null;
    this.#silent = true;
    try {
      instance.setContent(input.content, input.format, { history: 'reset' });
    } catch (error) {
      failure = { error };
    } finally {
      this.#silent = false;
    }
    if (failure) this.#restoreFailed(failure.error);
    else this.#settle(new SnapshotHandle(instance.snapshot()));
  }

  /** Makes a revision both the published and the committed value, with nothing to commit. */
  #settle(value: SnapshotHandle): void {
    this.#value = value;
    this.#committed = value;
    this.#uncommitted = false;
  }

  /** Reports a restore whose content the engine cannot read; the document stays as it was. */
  #restoreFailed(error: unknown): void {
    this.#host.diagnostic(
      'text-editor-content-invalid',
      `The restored content cannot be read: ${errorMessage(error)}`,
    );
  }

  /**
   * Serializes the current document. Before ready it returns the pending content when that is in
   * `format`, or, for a document carried over to a new mount or kept after a release, that
   * document in any portable format through the shared converters, and otherwise `null`.
   */
  getContent(format: TextEditorPortableFormat): string | null;
  getContent(format: 'json'): unknown;
  getContent(format: TextEditorFormat): unknown;
  getContent(format: TextEditorFormat): unknown {
    assertTextEditorFormat(format);
    const instance = this.#readyInstance();
    if (instance) return instance.getContent(format);
    const queued = this.#queued?.input;
    if (queued) return queued.format === format ? queued.content : null;
    const kept = this.#kept;
    if (kept) {
      if (kept.input.format === format) return kept.input.content;
      return kept.portable && (format === 'markdown' || format === 'text')
        ? this.#convert(kept, format)
        : null;
    }
    return this.#default?.format === format ? this.#default.content : null;
  }

  /**
   * The pending content as a portable document for the preview before ready: content set before
   * ready, else kept, else the default, read through the shared converters; one empty paragraph
   * with nothing pending; `null` while ready, for json and for HTML that no parser reads.
   */
  previewDocument(): TextEditorPortableDocument | null {
    if (this.#status === 'ready') return null;
    const input = this.#pending;
    if (input && !isPreviewFormat(input.format)) return null;
    return this.#readPending(input);
  }

  /** Pending content as a portable document, memoized per input and definitions. */
  #readPending(input: TextEditorContentInput | null): TextEditorPortableDocument | null {
    const read = this.#pendingRead;
    if (read && read.input === input && read.nodes === this.#nodes) return read.document;
    const document = !input
      ? readText('')
      : input.format === 'text'
        ? readText(String(input.content))
        : this.#portable(input);
    this.#pendingRead = { input, nodes: this.#nodes, document };
    return document;
  }

  /** Kept portable HTML in another portable format, through the shared converters. */
  #convert(kept: KeptContent, format: 'markdown' | 'text'): string | null {
    if (kept.conversions.has(format)) return kept.conversions.get(format) ?? null;
    const document = this.#portable(kept.input);
    const nodes = this.#nodes;
    const content = !document
      ? null
      : format === 'markdown'
        ? writeMarkdown(document, { urls: URLS, nodes }).markdown
        : writeText(document, { nodes });
    kept.conversions.set(format, content);
    return content;
  }

  /**
   * Pending HTML or Markdown as a portable document, through the shared converters; `null` for
   * HTML where no parser exists.
   */
  #portable(input: TextEditorContentInput): TextEditorPortableDocument | null {
    const nodes = this.#nodes;
    const source = String(input.content);
    if (input.format === 'markdown') return readMarkdown(source, { urls: URLS, nodes }).document;
    // The parser comes from the widget's window, or from the global scope without a container.
    const view = this.#host.container()?.ownerDocument.defaultView ?? null;
    const root = parseHtmlDocument(source, view);
    return root ? importHtml(root, { urls: URLS, nodes }).document : null;
  }

  /**
   * Whether an action would apply now: the engine's dry run, memoized per state (`canStateKey`)
   * and action key, or for the block-type and alignment actions per block context
   * (`blockContextKey`); `false` before ready.
   */
  can(action: TextEditorAction): boolean {
    const instance = this.#readyInstance();
    if (!instance) return false;
    const state = instance.getState();
    if (instance !== this.#canInstance || state !== this.#canState) {
      const key = canStateKey(state);
      if (instance !== this.#canInstance || key !== this.#canKey) this.#canAnswers.clear();
      if (instance !== this.#canInstance) this.#contextAnswers.clear();
      this.#canInstance = instance;
      this.#canState = state;
      this.#canKey = key;
    }
    const context = blockContextKey(state, action);
    if (context !== null && context !== this.#contextKey) {
      this.#contextAnswers.clear();
      this.#contextKey = context;
    }
    const answers = context === null ? this.#canAnswers : this.#contextAnswers;
    const key = actionKey(action);
    let answer = answers.get(key);
    if (answer === undefined) {
      try {
        answer = instance.can(action) === true;
      } catch {
        answer = false;
      }
      answers.set(key, answer);
    }
    return answer;
  }

  // Tools ------------------------------------------------------------------------------------

  /**
   * The context that a request from `surface` resolves its tool with, for a view that presents
   * the tools; build it once per surface and pass it to every `isToolEnabled` call. `target` is
   * what the tools act on, the selection by default.
   */
  toolContext(
    surface: TextEditorRequestSurface,
    value?: unknown,
    target?: TextEditorToolTarget,
  ): TextEditorToolContext {
    return this.#toolContext(surface, value, target);
  }

  /** Whether a request of the tool in this context would act: `false` before ready. */
  isToolEnabled(tool: TextEditorTool, context: TextEditorToolContext): boolean {
    return this.#enabled(tool, context);
  }

  #toolContext(
    surface: TextEditorRequestSurface,
    value: unknown,
    target: TextEditorToolTarget = SELECTION,
  ): TextEditorToolContext {
    const instance = this.#readyInstance();
    const state = instance ? instance.getState() : this.#store.current;
    const tools = this.#tools;
    return {
      state,
      strings: tools?.strings ?? textEditorStrings,
      surface,
      target,
      direction: this.#host.direction(),
      textDirection: instance ? textDirectionOf(instance, state.selection) : undefined,
      layout: tools?.layout ?? defaultTextEditorLayout,
      table: !instance
        ? null
        : target.kind === 'table'
          ? instance.getTable(target.table)
          : state.table
            ? instance.getTable(state.table.id)
            : null,
      imageUpload: this.#host.imageUpload?.() ?? false,
      value,
    };
  }

  #enabled(tool: TextEditorTool, context: TextEditorToolContext): boolean {
    const registry = this.#tools?.registry;
    return (
      registry !== undefined &&
      toolEnabled(tool, context, {
        ready: this.#status === 'ready',
        disabled: this.#access.disabled,
        editable: this.#editable,
        registry,
        can: (action) => this.can(action),
      })
    );
  }

  // Mount ------------------------------------------------------------------------------------

  get #editable(): boolean {
    return !this.#access.readOnly && !this.#access.disabled;
  }

  /** The content of the next mount: content set before ready, else kept, else the default. */
  get #pending(): TextEditorContentInput | null {
    return this.#queued?.input ?? this.#kept?.input ?? this.#default;
  }

  #mounted(): boolean {
    return this.#session.instance !== null || this.#session.mounting;
  }

  /** Whether the current mount's container left the document it mounted in. */
  #movedDocument(): boolean {
    const document = this.#mountDocument;
    if (!document || !this.#mounted()) return false;
    const container = this.#host.container();
    return container !== null && container.ownerDocument !== document;
  }

  /**
   * The definitions that content may hold and the mount does not represent: those the engine
   * rejects and those a change of `nodes` removed, each name once and none the mount supports.
   */
  #convertNodes(
    nodes: readonly TextEditorNodeDefinition[],
    supported: readonly TextEditorNodeDefinition[],
  ): readonly TextEditorNodeDefinition[] {
    const names = new Set(supported.map((definition) => definition.name));
    const convert: TextEditorNodeDefinition[] = [];
    for (const definition of [...nodes, ...this.#retired.values()]) {
      if (names.has(definition.name)) continue;
      names.add(definition.name);
      convert.push(definition);
    }
    return Object.freeze(convert);
  }

  #readyInstance(): TextEditorEngineInstance | null {
    return this.#status === 'ready' ? this.#session.instance : null;
  }

  /** Mounts while connected, with an engine and a container, unless a mount is current. */
  #mount(): void {
    const engine = this.#engine;
    const container = this.#host.container();
    if (!this.#connected || !engine || !container || this.#mounted()) return;
    const initialContent = this.#pending;
    const editable = this.#editable;
    const nodes = this.#nodes;
    const labels = this.#labels;
    this.#session.start((control) => {
      const supported = Object.freeze(
        nodes.filter((definition) => engine.supportsNode(definition)),
      );
      const context: TextEditorEngineContext = {
        initialContent,
        editable,
        nodes: supported,
        convertNodes: this.#convertNodes(nodes, supported),
        urls: URLS,
        createId: createBlockId,
        adoptStyles: (cssText) => this.#host.adoptStyles(cssText),
        signal: control.signal,
        labels,
        views: this.#host.views?.(),
        ready: control.ready,
        state: () => {
          if (control.live()) this.#stage();
        },
        content: (change) => {
          if (control.live()) this.#engineContent(change);
        },
        error: control.fail,
        diagnostic: (code, message) => {
          if (control.live()) this.#host.diagnostic(code, message);
        },
      };
      this.#container = container;
      this.#mountDocument = container.ownerDocument;
      this.#mountContent = initialContent;
      this.#instanceEditable = editable;
      this.#status = 'loading';
      return engine.mount(container, context);
    });
  }

  #attached(instance: TextEditorEngineInstance): void {
    this.#applyEditable(instance);
    this.#track();
    this.#host.attached?.(instance);
  }

  #ready(instance: TextEditorEngineInstance): void {
    const queued = this.#queued;
    const pending = queued?.input ?? this.#kept?.input ?? null;
    this.#queued = null;
    this.#kept = null;
    let failure: { readonly error: unknown } | null = null;
    if (pending && pending !== this.#mountContent) {
      // Content set or restored while the mount loaded applies as its content: no history, no
      // value change.
      this.#silent = true;
      try {
        instance.setContent(pending.content, pending.format, { history: 'reset' });
      } catch (error) {
        failure = { error };
      } finally {
        this.#silent = false;
      }
    }
    this.#status = 'ready';
    this.#value = new SnapshotHandle(instance.snapshot());
    this.#committed = this.#value;
    this.#stage();
    this.#host.ready(instance.native ?? null);
    if (queued) {
      if (failure) this.#failQueued(queued, failure.error);
      else queued.resolve('applied');
    } else if (failure) this.#restoreFailed(failure.error);
  }

  #failed(error: unknown): void {
    this.#forget();
    const queued = this.#queued;
    this.#queued = null;
    this.#status = 'error';
    this.#stagePreReady();
    this.#host.failed(error);
    // The content queued for the failed mount rejects with its error.
    if (queued) this.#failQueued(queued, error);
  }

  /**
   * Ends the mount, keeping the document of a ready instance as portable HTML for the next mount,
   * which applies it without a value change.
   */
  #end(): void {
    const instance = this.#readyInstance();
    if (instance) {
      this.#publishEngineChange();
      try {
        this.#kept = {
          input: Object.freeze({ content: instance.getContent('html'), format: 'html' }),
          portable: true,
          empty: instance.getState().empty,
          conversions: new Map(),
        };
      } catch {
        // An instance that cannot serialize keeps nothing; the pending content stays.
      }
    }
    this.#teardown();
  }

  /** Destroys the instance, or a pending result when it arrives, and returns to idle. */
  #teardown(): void {
    this.#forget();
    this.#session.teardown();
    this.#container = null;
    this.#mountDocument = null;
    this.#status = 'idle';
    this.#stagePreReady();
  }

  /** Drops what belongs to the ending mount: its frame, its waiting change, value and dry runs. */
  #forget(): void {
    this.#cancelFrame();
    this.#engineChange = null;
    this.#value = null;
    this.#committed = null;
    this.#canInstance = null;
    this.#canState = null;
    this.#canAnswers.clear();
    this.#contextAnswers.clear();
  }

  #applyEditable(instance: TextEditorEngineInstance): void {
    const editable = this.#editable;
    if (editable === this.#instanceEditable) return;
    this.#instanceEditable = editable;
    instance.setEditable(editable);
  }

  #track(): void {
    if (!this.#connected || this.#stopTracking || !this.#container || !this.#session.instance)
      return;
    this.#stopTracking = this.#tracker.attach(this.#container);
  }

  #untrack(): void {
    this.#stopTracking?.();
    this.#stopTracking = null;
  }

  /**
   * Reports the missing engine at the first frame after connection while none is assigned: once
   * per connection, and again after the engine is set to `null`.
   */
  #checkEngine(): void {
    if (!this.#connected || this.#engine || this.#engineReported) return;
    if (this.#engineCheck !== undefined) return;
    this.#engineCheck = this.#host.frames().requestAnimationFrame(() => {
      this.#engineCheck = undefined;
      if (!this.#connected || this.#engine || this.#engineReported) return;
      this.#engineReported = true;
      this.#host.diagnostic(
        'text-editor-engine-missing',
        'No engine is assigned, so the editor stays idle until one is.',
      );
    });
  }

  #cancelEngineCheck(): void {
    if (this.#engineCheck === undefined) return;
    this.#host.frames().cancelAnimationFrame(this.#engineCheck);
    this.#engineCheck = undefined;
  }

  // Publication (uwg-te-req-evt-3, uwg-te-req-evt-4, uwg-te-req-perf-1) ---------------------

  /**
   * Commits when focus left the widget: publishes a change the engine originated that waits for
   * its frame, then, when a change the engine originated is not committed yet, commits it with
   * reason `input-blur`. Whether a commit followed; nothing commits before ready. The caller
   * decides when focus left.
   */
  commitPending(sourceEvent: Event): boolean {
    if (!this.#readyInstance()) return false;
    this.#publishEngineChange(true);
    const value = this.#value;
    if (!this.#uncommitted || !value) return false;
    const previousValue = this.#committed ?? value;
    this.#committed = value;
    this.#uncommitted = false;
    this.#host.valueCommitted(
      Object.freeze({ value, previousValue, reason: 'input-blur', sourceEvent }),
    );
    return true;
  }

  /** A document change the engine reports, attributed by the cause tracker. */
  #engineContent(reported: TextEditorContentChange): void {
    if (this.#status !== 'ready') return;
    if (!this.#silent) {
      // One attribution per content notification; a request's own change is the request's.
      const attributed = this.#tracker.consume();
      const change = attributed.cause === 'engine' && reported ? reported : attributed;
      if (!this.#executing) {
        this.#engineChange = change;
        this.#lastChangeReason = change.reason;
      }
    }
    this.#stage();
  }

  /** Stages the instance's state for the next frame, which publishes it. */
  #stage(): void {
    const instance = this.#readyInstance();
    if (!instance) return;
    this.#store.stage(instance.getState());
    this.#scheduleFrame();
  }

  /** Stages the state before ready: the mount's editability and the pending content's emptiness. */
  #stagePreReady(): void {
    if (this.#status === 'ready') return;
    const { version, contentVersion } = this.#store.current;
    this.#store.stage(
      preReadyState({
        editable: this.#editable,
        empty: !this.#holdsContent(),
        version,
        contentVersion,
      }),
    );
  }

  /**
   * Whether the pending content is not empty, as the state before ready reports it: kept content
   * as the instance that held it was, native JSON always, text with any character, and HTML and
   * Markdown unless the shared converters read them as one empty paragraph; HTML that no parser
   * reads counts when it holds more than whitespace.
   */
  #holdsContent(): boolean {
    const input = this.#pending;
    if (!input) return false;
    const kept = this.#kept;
    if (kept?.input === input && kept.empty !== undefined) return !kept.empty;
    const { content, format } = input;
    if (format === 'json') return content !== null && content !== undefined;
    if (typeof content !== 'string') return false;
    if (format === 'text') return content !== '';
    if (content.trim() === '') return false;
    const document = this.#readPending(input);
    return !document || !isEmptyDocument(document);
  }

  /**
   * Requests the frame that publishes the state and then at most one value change for the
   * changes the engine originated since the last one.
   */
  #scheduleFrame(): void {
    if (this.#frame !== undefined || !this.#connected) return;
    this.#frame = this.#host.frames().requestAnimationFrame(() => {
      this.#frame = undefined;
      this.#store.flush();
      this.#publishEngineChange();
    });
  }

  #cancelFrame(): void {
    if (this.#frame === undefined) return;
    this.#host.frames().cancelAnimationFrame(this.#frame);
    this.#frame = undefined;
  }

  /**
   * Publishes the waiting engine change, which a composition in progress holds until its end
   * unless `force`d.
   */
  #publishEngineChange(force = false): void {
    const change = this.#engineChange;
    const instance = this.#readyInstance();
    if (!change || !instance || (this.#tracker.composing && !force)) return;
    this.#engineChange = null;
    const { reason, sourceEvent } = change;
    this.#publish(
      instance,
      { reason, sourceEvent, origin: 'engine', tool: null, actions: NO_ACTIONS },
      false,
    );
  }

  /**
   * Publishes the current revision as the committed value: a value change whose previous value is
   * the handle published last, then, for a request, its commit. Nothing is serialized.
   */
  #publish(
    instance: TextEditorEngineInstance,
    change: Omit<TextEditorValueChange, 'value' | 'previousValue'>,
    commit: boolean,
  ): void {
    const previousValue = this.#value;
    if (!previousValue) return;
    const value = new SnapshotHandle(instance.snapshot());
    this.#value = value;
    this.#lastChangeReason = change.reason;
    this.#host.valueChanged(Object.freeze({ ...change, value, previousValue }));
    if (!commit) {
      this.#uncommitted = true;
      return;
    }
    this.#committed = value;
    this.#uncommitted = false;
    this.#host.valueCommitted(
      Object.freeze({
        value,
        previousValue,
        reason: change.reason,
        sourceEvent: change.sourceEvent,
      }),
    );
  }
}

/** Why a list of actions cannot be requested, or `null` when it can. */
function malformed(actions: readonly TextEditorAction[]): string | null {
  for (const action of actions)
    if (!isValidTextEditorAction(action)) {
      const type = (action as { readonly type?: unknown } | null)?.type;
      return typeof type === 'string'
        ? `The action "${type}" is unknown or its payload is malformed.`
        : 'The request holds a value that is no text editor action.';
    }
  if (actions.length > 1 && actions.some((action) => action.type === 'content.set'))
    return 'content.set is the only action of its request.';
  return null;
}
