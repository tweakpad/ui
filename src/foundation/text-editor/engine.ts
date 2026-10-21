/**
 * Engine contract of the text editor (Widgets `uwg-te-par-engine-1`, `uwg-te-tab-engine`,
 * `uwg-te-req-engine-1` to `uwg-te-req-engine-11`, `uwg-te-req-evt-5`).
 *
 * An engine is the object that an adapter factory builds from the engine modules the application
 * passes; the library never imports an engine package. The engine mounts into a container the
 * widget owns and returns an instance, which the widget pulls: it reads state, content, the block
 * model and geometry when it needs them, and changes the document only through actions. The
 * instance only notifies, through the callbacks of its mount context.
 */
import type { MarkdownUrlPolicy } from '../markdown/types.js';
import type { ChangeReason } from '../types.js';
import type { TextEditorAction, TextEditorActionType } from './actions.js';
import type { TextEditorCapability } from './capabilities.js';
import type {
  TextEditorBlockRects,
  TextEditorBlockTree,
  TextEditorCellAddress,
  TextEditorEngineState,
  TextEditorTableModel,
  TextEditorTextPoint,
  TextEditorTextRange,
} from './model.js';
import type { TextEditorNodeDefinition } from './nodes.js';

// Formats and content (uwg-te-req-content-1)

/**
 * A content format: `html` in the portable profile, `markdown` in the library's Markdown dialect,
 * `text`, or `json`, the engine's native JSON, which is not portable between engines.
 */
export type TextEditorFormat = 'html' | 'markdown' | 'text' | 'json';

/** The formats that the shared converters write and read, the same on every engine. */
export type TextEditorPortableFormat = Exclude<TextEditorFormat, 'json'>;

/** Content in a format: a string, or for `json` the native JSON as an object or as JSON text. */
export interface TextEditorContentInput {
  readonly content: unknown;
  readonly format: TextEditorFormat;
}

/** The protocols that link and image URLs may use; relative references always pass. */
export type TextEditorUrlPolicy = Required<MarkdownUrlPolicy>;

/** How content set after ready treats the history: `push` adds one undo step, `reset` clears it. */
export type TextEditorHistoryMode = 'reset' | 'push';

export interface TextEditorContentOptions {
  /** Limits the content to these blocks, each with its nested items. */
  readonly blocks?: readonly string[] | undefined;
}

/** A lazy handle on one revision of the document. */
export interface TextEditorSnapshot {
  /** The content version of the revision. */
  readonly revision: number;
  /** The revision is one empty paragraph. */
  readonly empty: boolean;
  /** Serializes the revision when called, also after later changes. */
  getContent(format: TextEditorPortableFormat): string;
  getContent(format: 'json'): unknown;
  getContent(format: TextEditorFormat): unknown;
}

// Notifications (uwg-te-tab-engine r3; uwg-te-req-engine-6)

/** What caused a document change that the engine reports. */
export type TextEditorChangeCause =
  'input' | 'composition' | 'cut' | 'history' | 'action' | 'content' | 'engine';

/** A document change: its cause, the registered reason of that cause and what triggered it. */
export interface TextEditorContentChange {
  readonly cause: TextEditorChangeCause;
  /** `input` or `engine` for a change the engine originated; the request's reason for an action. */
  readonly reason: ChangeReason;
  readonly sourceEvent?: Event | undefined;
  /** For cause `action`, the type of the action that changed the document. */
  readonly action?: TextEditorActionType | undefined;
}

/**
 * The codes of non-fatal problems, prefixed `text-editor-`: no engine assigned, an engine version
 * the adapter was not verified with, an engine warning, content that cannot be parsed, kinds of
 * content converted because the engine cannot represent them, a duplicate or invalid block
 * identifier that was replaced, an unknown identifier in a layout or a suggestion tool in the
 * layout of a surface, a duplicate tool identifier, an unavailable tool that the application's
 * layout places, a `format` outside its domain, an uploaded image source that fails the image
 * policy, and placement under a closed shadow root.
 */
export type TextEditorDiagnosticCode =
  | 'text-editor-engine-missing'
  | 'text-editor-engine-version'
  | 'text-editor-engine-warning'
  | 'text-editor-content-invalid'
  | 'text-editor-content-converted'
  | 'text-editor-block-id'
  | 'text-editor-layout-unknown'
  | 'text-editor-tool-duplicate'
  | 'text-editor-tool-unavailable'
  | 'text-editor-format-invalid'
  | 'text-editor-upload-rejected'
  | 'text-editor-closed-root';

/** A non-fatal problem, as the converters and the tool registry report it. */
export interface TextEditorDiagnostic {
  readonly code: TextEditorDiagnosticCode;
  readonly message: string;
}

/** What an engine reports to the widget; calls after the context's signal aborted are ignored. */
export interface TextEditorEngineNotifications {
  /** Once per mount, as soon as the editing root holds the initial content. */
  ready(): void;
  /**
   * A change that leaves the document unchanged: the selection, stored marks, focus,
   * composition, editability or history availability.
   */
  state(): void;
  /** A document change; the editing root is current and the state is refreshed. */
  content(change: TextEditorContentChange): void;
  /** A fatal error: the status becomes `error`. */
  error(error: unknown): void;
  /** A non-fatal problem. */
  diagnostic(code: TextEditorDiagnosticCode, message: string): void;
}

// Mount context (uwg-te-par-engine-1)

/** The labels from the widget's strings that adapter view hooks render. */
export interface TextEditorEngineLabels {
  /** The accessible name of the checkbox of a task item. */
  readonly taskCheckbox: string;
}

export interface TextEditorEngineContext extends TextEditorEngineNotifications {
  /** Rendered as the editing root mounts, without history and without a content notification. */
  readonly initialContent: TextEditorContentInput | null;
  readonly editable: boolean;
  /** The custom node definitions that the engine supports. */
  readonly nodes: readonly TextEditorNodeDefinition[];
  /**
   * Definitions of custom nodes that content may hold and the mount does not represent: those
   * `supportsNode` rejects and those a change of the widget's `nodes` removed. Content is read
   * with them, so that such a node converts with the diagnostic; they are never rendered.
   */
  readonly convertNodes?: readonly TextEditorNodeDefinition[] | undefined;
  readonly urls: TextEditorUrlPolicy;
  /** A fresh block identifier. */
  createId(): string;
  /** Adopts engine styles into the widget's shadow root; returns their release. */
  adoptStyles(cssText: string): () => void;
  /** Aborted when the widget destroys or supersedes this mount. */
  readonly signal: AbortSignal;
  readonly labels: TextEditorEngineLabels;
}

// Instance (uwg-te-tab-engine r1–r14)

export interface TextEditorExecuteOptions {
  readonly reason: ChangeReason;
  readonly sourceEvent?: Event | undefined;
  /** Whether applying moves focus into the editing root; default true. */
  readonly focus?: boolean | undefined;
}

export interface TextEditorSetContentOptions {
  /** Default `reset`. */
  readonly history?: TextEditorHistoryMode | undefined;
  /** The reason of the request; a form-state restore carries none. */
  readonly reason?: ChangeReason | undefined;
}

/** Where `focus` places the selection: the last one restored, or the start or end of the document. */
export type TextEditorFocusPosition = 'restore' | 'start' | 'end';

/** A table cell found from a node. */
export interface TextEditorCellLocation {
  readonly table: string;
  readonly cell: TextEditorCellAddress;
}

/** The elements of a table: the table and its scroll wrapper. */
export interface TextEditorTableElements {
  readonly table: HTMLElement;
  readonly scroller: HTMLElement;
}

/**
 * Attributes of the editing root by name: its role, multiline state, name, description,
 * placeholder, read-only and disabled states, controlled element, active descendant, tab index and
 * spell checking. `null` removes an attribute.
 */
export type TextEditorRootAttributes = Readonly<Record<string, string | null>>;

/**
 * A mounted engine. Elements that lookups return belong to the engine: they are read-only and
 * valid until the next engine update.
 */
export interface TextEditorEngineInstance {
  /** The set that the engine's `capabilities` holds, not a copy of it. */
  readonly capabilities: ReadonlySet<TextEditorCapability>;

  /** The frozen normalized state; reading it is cheap and has no side effect. */
  getState(): TextEditorEngineState;
  /** A lazy handle on the current revision. */
  snapshot(): TextEditorSnapshot;

  /** Whether an action would apply: a dry run that never throws. */
  can(action: TextEditorAction): boolean;
  /**
   * Applies a list of actions as one engine transaction, all of it or none; answers whether it
   * applied.
   */
  execute(actions: readonly TextEditorAction[], options: TextEditorExecuteOptions): boolean;

  getContent(format: TextEditorPortableFormat, options?: TextEditorContentOptions): string;
  getContent(format: 'json', options?: TextEditorContentOptions): unknown;
  getContent(format: TextEditorFormat, options?: TextEditorContentOptions): unknown;
  /**
   * Replaces the content. Throws a DataError for content it cannot parse and a NotSupportedError
   * for an unknown format, the content then unchanged.
   */
  setContent(
    content: unknown,
    format: TextEditorFormat,
    options?: TextEditorSetContentOptions,
  ): void;

  getBlocks(): TextEditorBlockTree;
  getTable(id: string): TextEditorTableModel | null;

  /** The element of a block; a list item's item element, a table's scroll wrapper. */
  blockElement(id: string): HTMLElement | null;
  /** The identifier of the nearest block holding a node. */
  blockAt(node: Node): string | null;
  cellElement(table: string, cell: TextEditorCellAddress): HTMLElement | null;
  cellAt(node: Node): TextEditorCellLocation | null;
  tableElements(id: string): TextEditorTableElements | null;
  /** The text point under a client point. */
  pointAt(x: number, y: number): TextEditorTextPoint | null;

  /** Geometry in client coordinates, read synchronously; `null` or empty when unmeasurable. */
  blockRects(id: string): TextEditorBlockRects | null;
  rangeRects(range: TextEditorTextRange): readonly DOMRectReadOnly[];
  /** Line rectangles of text, one per cell of a cell range, one per block of a block selection. */
  selectionRects(): readonly DOMRectReadOnly[];
  caretRect(): DOMRectReadOnly | null;

  setRootAttributes(attributes: TextEditorRootAttributes): void;
  /** Settles once the editing root holds focus and the selection is in place. */
  focus(position?: TextEditorFocusPosition): Promise<void>;
  blur(): void;
  /** Changes editability without a content notification. */
  setEditable(editable: boolean): void;
  /** Idempotent: removes the editing root and releases its styles and listeners. */
  destroy(): void;

  /** The engine's editor object: an escape hatch outside this contract. */
  readonly native?: unknown;
}

/** An engine, which the application assigns to the widget's `engine` property. */
export interface TextEditorEngine {
  /** Identifies the engine in diagnostics only. */
  readonly name?: string | undefined;
  /** Static: declared before mount and never changed. */
  readonly capabilities: ReadonlySet<TextEditorCapability>;
  /** Key-binding patterns that the engine binds and the adapter cannot turn off. */
  readonly reservedKeys: readonly string[];
  /** Whether the engine supports a custom node definition; the same answer every time. */
  supportsNode(definition: TextEditorNodeDefinition): boolean;
  /** Creates a fresh editing root inside the container and returns the instance. */
  mount(
    container: HTMLElement,
    context: TextEditorEngineContext,
  ): TextEditorEngineInstance | Promise<TextEditorEngineInstance>;
}
