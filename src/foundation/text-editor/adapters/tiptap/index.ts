/**
 * The Tiptap engine adapter of the text editor (Widgets `uwg-te-par-engine-1`, `uwg-te-tab-engine`
 * r1 to r14, `uwg-te-req-engine-1` to `uwg-te-req-engine-12`).
 *
 * The library does not depend on Tiptap: pass the modules you import yourself.
 *
 * ```ts
 * import * as core from '@tiptap/core';
 * import * as state from '@tiptap/pm/state';
 * import * as history from '@tiptap/pm/history';
 * import * as starterKit from '@tiptap/starter-kit';
 * import * as list from '@tiptap/extension-list';
 * import * as table from '@tiptap/extension-table';
 * import * as tables from '@tiptap/pm/tables';
 * editor.engine = createTiptapEngine({ core, state, history, starterKit, list, table, tables });
 * ```
 *
 * The factory fixes the capabilities and the reserved chords and never throws; the modules are
 * checked when an instance mounts. Each mount creates a fresh editing root in the container,
 * renders the initial content into it without history and reports ready as soon as the editor
 * exists.
 */
import { domError } from '../../../dom-error.js';
import { assertTextEditorFormat, type TextEditorAction } from '../../actions.js';
import { engineCapabilities, type TextEditorCapability } from '../../capabilities.js';
import { ENGINE_CHANGES, engineChange } from '../../cause.js';
import { canonicalize, type TextEditorPortableDocument } from '../../content/portable.js';
import type {
  TextEditorCellLocation,
  TextEditorContentChange,
  TextEditorContentOptions,
  TextEditorEngine,
  TextEditorEngineContext,
  TextEditorEngineInstance,
  TextEditorExecuteOptions,
  TextEditorFocusPosition,
  TextEditorFormat,
  TextEditorPortableFormat,
  TextEditorRootAttributes,
  TextEditorSetContentOptions,
  TextEditorSnapshot,
  TextEditorTableElements,
} from '../../engine.js';
import type {
  TextEditorBlockRects,
  TextEditorBlockTree,
  TextEditorCellAddress,
  TextEditorEngineState,
  TextEditorTableModel,
  TextEditorTextPoint,
  TextEditorTextRange,
} from '../../model.js';
import { isSupportedNode, type TextEditorNodeDefinition } from '../../nodes.js';
import {
  actionCan,
  actionChange,
  contentChange,
  planExecute,
  type TextEditorActionGate,
} from '../shared/actions.js';
import { blockTree, withTrailingParagraph } from '../shared/blocks.js';
import {
  readTextEditorContent,
  resolvedDirection,
  TextEditorAdapterSnapshot,
  textEditorContentGlue,
  textEditorContentOf,
  type TextEditorContentGlue,
} from '../shared/content.js';
import { nodeOverrides, resolveCss, type TextEditorAdapterOptions } from '../shared/options.js';
import { TextEditorPressRead } from '../shared/presses.js';
import { tableModelOf } from '../shared/tables.js';
import { applyAction, kindLookup } from './actions.js';
import { handleClipboardEvent, type TiptapClipboardViewLike } from './clipboard.js';
import { TIPTAP_BASE_CSS } from './css.js';
import { TiptapGeometry } from './geometry.js';
import { blockIdsPlugin, ID_REPAIR_META } from './ids.js';
import { TIPTAP_INPUT_RULES } from './input-rules.js';
import { behaviorExtensions } from './keymap.js';
import { LIST_MERGE_META, listMergePlugin } from './lists.js';
import { fromTiptapJson, toTiptapJson } from './mapping.js';
import { caretMarksPlugin, needsUnmarkedCaret } from './marks.js';
import {
  editorCopyProblem,
  hasTiptapTables,
  probeTiptapModules,
  type TextEditorTiptapModules,
  type TiptapCoreLike,
  type TiptapEditorConstructorLike,
  type TiptapEditorLike,
  type TiptapEditorStateLike,
  type TiptapExtensionLike,
  type TiptapPluginKeyLike,
  type TiptapPluginLike,
  type TiptapSelectionLike,
  type TiptapTransactionLike,
} from './modules.js';
import { customNodeExtensions } from './nodes.js';
import { domSelectionOf, edgeSelection, showReadOnlySelection } from './selection.js';
import { contentStopsActive } from '../shared/content-stops.js';
import {
  createContentStops,
  createTiptapExtensions,
  TIPTAP_RESERVED_KEYS,
  writeContentStops,
} from './schema.js';
import { buildTiptapState, isEmptyTiptapDoc } from './state.js';
import { tableSelectionExtension } from './tables.js';
import {
  COMPOSITION_META,
  ownStep,
  portableOf,
  TiptapWork,
  TP_ACTION_META,
  TP_STEP_META,
  type TiptapEnv,
} from './work.js';

export type { TextEditorTiptapModules } from './modules.js';

/**
 * A node of the engine that replaces the generated node of a custom definition: a Tiptap node
 * extension. The adapter installs it under its own engine name for the definition, as it does a
 * generated node, so that no definition name collides with a name of the engine.
 */
export type TextEditorTiptapNodeOverride = TiptapExtensionLike;

/**
 * The options of `createTiptapEngine` (`uwg-te-par-engine-1`, `uwg-te-tab-engine` r2): `css`, a
 * sheet that replaces the adapter's base CSS or a function that receives the base CSS and returns
 * the sheet, and `nodes`, Tiptap node extensions that replace the generated nodes of custom
 * definitions, by definition name.
 */
export type TextEditorTiptapOptions = TextEditorAdapterOptions<TextEditorTiptapNodeOverride>;

const isObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  (typeof value === 'object' || typeof value === 'function') && value !== null;

/**
 * The capabilities of a modules object (`engineCapabilities`): tables with both table modules, and
 * moving rows and columns when the table helpers can.
 */
function tiptapCapabilities(modules: unknown): ReadonlySet<TextEditorCapability> {
  const tables =
    isObject(modules) && isObject(modules.table) && isObject(modules.tables)
      ? modules.tables
      : null;
  return engineCapabilities({
    tables: tables !== null,
    move: typeof tables?.moveTableRow === 'function',
  });
}

/** The editor class of each core module. */
const editorClasses = new WeakMap<object, TiptapEditorConstructorLike>();

/** The editor options that the editor class reads. */
interface EditorOptionsLike {
  readonly options: { readonly editorProps?: { readonly attributes?: unknown } | undefined };
}

/**
 * The engine's editor whose editing root carries the adapter's attributes alone
 * (`uwg-te-tab-engine` r12). The engine merges `role="textbox"` into the attributes of its props,
 * which a widget then could not remove; the widget writes the role through `setRootAttributes`, as
 * every other attribute.
 */
function editorClass(core: TiptapCoreLike): TiptapEditorConstructorLike {
  let Class = editorClasses.get(core);
  if (!Class) {
    const Base = core.Editor as unknown as new (
      options: object,
    ) => TiptapEditorLike & EditorOptionsLike;
    Class = class extends Base {
      getEditorViewAttributes(): unknown {
        return this.options.editorProps?.attributes ?? {};
      }
    };
    editorClasses.set(core, Class);
  }
  return Class;
}

/**
 * Creates the Tiptap engine of the text editor from the application's modules. It never throws:
 * a missing, incompatible or duplicated module rejects the mount with an error naming it.
 */
export function createTiptapEngine(
  modules: TextEditorTiptapModules,
  options: TextEditorTiptapOptions = {},
): TextEditorEngine {
  const capabilities = tiptapCapabilities(modules);
  const overrides = nodeOverrides(options);
  const engine: TextEditorEngine = Object.freeze({
    name: 'tiptap',
    capabilities,
    reservedKeys: TIPTAP_RESERVED_KEYS,
    supportsNode: (definition: TextEditorNodeDefinition) => isSupportedNode(definition, overrides),
    mount: (container: HTMLElement, context: TextEditorEngineContext) => {
      const problem = probeTiptapModules(modules);
      if (problem) return Promise.reject(problem);
      try {
        return new TiptapInstance(engine, modules, options, overrides, container, context);
      } catch (error) {
        return Promise.reject(error);
      }
    },
  });
  return engine;
}

/** Whether a transaction is one that `execute` built or that forms its own step. */
const closesHistory = (tr: TiptapTransactionLike): boolean =>
  tr.getMeta(TP_ACTION_META) !== undefined || tr.getMeta(TP_STEP_META) !== undefined;

/**
 * Whether a transaction is one that the adapter's normalization appends to the change that caused
 * it: the identifier repair with the trailing paragraph, or the merge of adjacent lists. The
 * engine marks appended transactions only once they passed the filters, so the adapter's own
 * metas tell them apart there.
 */
const isNormalization = (tr: TiptapTransactionLike): boolean =>
  tr.getMeta(ID_REPAIR_META) !== undefined || tr.getMeta(LIST_MERGE_META) !== undefined;

/** What a state notification compares, so that an update that changed nothing stays silent. */
interface Observed {
  readonly doc: object;
  readonly selection: object;
  readonly storedMarks: object | null;
  readonly editable: boolean;
  readonly focused: boolean;
  readonly composing: boolean;
}

/** A mounted Tiptap editor. */
/** The keys that leave a cleared selection unplaced: Escape, Tab, a lone modifier and composition. */
const KEEPS_CLEARED: ReadonlySet<string> = new Set([
  'Escape',
  'Tab',
  'Shift',
  'Control',
  'Alt',
  'AltGraph',
  'Meta',
  'CapsLock',
]);

/** Whether a key places a cleared selection before the engine handles it. */
const placesClearedSelection = (event: KeyboardEvent): boolean =>
  !event.isComposing && !KEEPS_CLEARED.has(event.key);

class TiptapInstance implements TextEditorEngineInstance {
  readonly capabilities: ReadonlySet<TextEditorCapability>;
  readonly native: TiptapEditorLike;
  readonly #context: TextEditorEngineContext;
  readonly #env: TiptapEnv;
  readonly #glue: TextEditorContentGlue;
  readonly #root: HTMLElement;
  /** The document the root was created in, where the engine registers its document listeners. */
  readonly #mountDocument: Document;
  readonly #release: () => void;
  readonly #geometry: TiptapGeometry;
  /** The plugin key whose state is the cause of the last change of the document. */
  readonly #causes: TiptapPluginKeyLike;
  readonly #rootAttributes: Record<string, string> = { translate: 'no' };
  /** The links, task checkboxes and table wrappers of the content, by the root's tab index. */
  readonly #stops = createContentStops();
  #version = 1;
  #contentVersion = 1;
  #state: TextEditorEngineState | null = null;
  #tree: {
    readonly document: TextEditorPortableDocument;
    readonly version: number;
    readonly tree: TextEditorBlockTree;
  } | null = null;
  #observed: Observed | null = null;
  #expected: TextEditorContentChange | null = null;
  #ready = false;
  #destroyed = false;
  /**
   * Whether a selection is placed: after a mount or `setContent`, none is until focus, a user
   * selection, `focus()` or an applied action that selects. Until then the state reports none, an
   * insertion without a place goes to the document's end (`uwg-te-req-blocks-1`), and the engine's
   * own selection waits at the first text point.
   */
  #placed = false;
  /**
   * Whether `selection.set` with none left the selection unplaced: the root keeps focus without a
   * DOM selection, and the next key or press places the engine's resting selection again.
   */
  #cleared = false;
  /**
   * Set while the adapter focuses its root after applied actions: that focus keeps the selection
   * the actions left, so it places none (`uwg-te-tab-engine` r4).
   */
  #keepingSelection = false;
  /**
   * The press that follows a change the view did not write into the DOM selection: the view
   * records the DOM selection only while it owns it, so after content or a selection applied
   * without focus, a click on the point it recorded last looks to it like no change
   * (`uwg-te-req-engine-4`).
   */
  readonly #presses = new TextEditorPressRead<TiptapSelectionLike>();

  constructor(
    engine: TextEditorEngine,
    modules: TextEditorTiptapModules,
    options: TextEditorTiptapOptions,
    overrides: Readonly<Record<string, TextEditorTiptapNodeOverride>>,
    container: HTMLElement,
    context: TextEditorEngineContext,
  ) {
    this.capabilities = engine.capabilities;
    this.#context = context;
    const document = container.ownerDocument;
    this.#glue = textEditorContentGlue(context, engine, fromTiptapJson, {
      view: document.defaultView,
      direction: () => resolvedDirection(container),
    });
    const createId = () => context.createId();
    this.#env = {
      modules,
      tables: hasTiptapTables(modules) ? modules.tables : undefined,
      createId,
      nodes: context.nodes,
      urls: context.urls,
      capabilities: this.#glue.capabilities,
    };
    const read = context.initialContent
      ? readTextEditorContent(
          context.initialContent.content,
          context.initialContent.format,
          this.#glue,
        )
      : { document: canonicalize({ blocks: [] }, { createId }).document, diagnostics: [] };
    const custom = customNodeExtensions(modules, context.nodes, overrides);
    const cells = tableSelectionExtension(this.#env);
    this.#causes = new modules.state.PluginKey('tpCause');
    const extensions = createTiptapExtensions(modules, {
      urls: context.urls,
      labels: context.labels,
      plugins: [
        blockIdsPlugin(modules, createId),
        listMergePlugin(modules),
        caretMarksPlugin(modules),
        ...this.#plugins(modules),
      ],
      custom: [...(cells ? [cells] : []), ...custom.extensions],
      customNames: custom.names,
      behaviors: behaviorExtensions(this.#env),
      stops: this.#stops,
    });
    this.#root = document.createElement('div');
    this.#mountDocument = document;
    container.replaceChildren(this.#root);
    this.#release = context.adoptStyles(resolveCss(options.css, TIPTAP_BASE_CSS));
    try {
      this.native = new (editorClass(modules.core))({
        element: { mount: this.#root },
        extensions,
        content: toTiptapJson(withTrailingParagraph(read.document, createId)),
        injectCSS: false,
        enableContentCheck: true,
        // Only the adapter's rules, which call the shared rule table.
        enableInputRules: [TIPTAP_INPUT_RULES],
        enablePasteRules: false,
        // The adapter's editing keymap replaces the engine's own.
        enableCoreExtensions: { tabindex: false, textDirection: false, keymap: false },
        editable: context.editable,
        autofocus: false,
        editorProps: this.#editorProps(),
      });
      const copy = editorCopyProblem(modules, this.native);
      if (copy) {
        this.native.destroy();
        throw copy;
      }
    } catch (error) {
      this.#root.remove();
      this.#release();
      throw error;
    }
    this.#geometry = new TiptapGeometry(this.#env, () => this.native.view);
    // The engine starts at the document's start, which may select a leading atom: the selection
    // waits at the first text point instead, unreported until placed.
    this.#placeAtEdge('start', false);
    this.#observed = this.#observe();
    this.#ready = true;
    if (!this.#live()) return;
    for (const { code, message } of read.diagnostics) context.diagnostic(code, message);
    // Ready as soon as the root holds the content, never from the engine's later create event.
    context.ready();
  }

  /** Whether notifications reach the widget: mounted, and the mount's signal not aborted. */
  #live(): boolean {
    return !this.#destroyed && !this.#context.signal.aborted;
  }

  // Engine wiring

  /**
   * The editor props of the mount: the root attributes, which the adapter owns; copy and cut,
   * which write the shared clipboard flavours; `dragstart`, cancelled for anything dragged from
   * inside the root, since blocks move only through the widget (`uwg-te-req-content-6`,
   * `uwg-te-req-blocks-5`); the start and end of a composition, after which the state's
   * `composing` is read again; and the start and end of a press, whose DOM selection the adapter
   * reads when the view would miss it (`#readPress`).
   */
  #editorProps(): object {
    const clipboard = (cut: boolean) => (view: TiptapClipboardViewLike, event: ClipboardEvent) =>
      handleClipboardEvent(this.#env, view, event, cut);
    const composition = () => {
      this.#recheckComposition();
      return false;
    };
    return {
      attributes: () => ({ ...this.#rootAttributes }),
      handleDOMEvents: {
        compositionstart: composition,
        compositionend: composition,
        copy: clipboard(false),
        cut: clipboard(true),
        dragstart: (_view: unknown, event: DragEvent) => {
          event.preventDefault();
          return true;
        },
        mousedown: () => {
          this.#presses.pressed(this.native.view.state.selection);
          return false;
        },
        mouseup: () => {
          this.#readPress();
          this.#placeCleared(false);
          return false;
        },
        keydown: (_view: unknown, event: KeyboardEvent) => {
          if (placesClearedSelection(event)) this.#placeCleared(true);
          return false;
        },
      },
    };
  }

  /**
   * Reads the DOM selection when a press ends that followed a change the view did not write into
   * the DOM selection, if the view kept the selection it had when the press started
   * (`TextEditorPressRead`, `uwg-te-req-engine-4`): the press may have put the DOM selection back
   * on the point the view recorded last, which the view takes for no change. The selection read is
   * dispatched as the view dispatches the selection of a press; the view's own handling of the
   * release, such as selecting an atom, comes after it.
   */
  #readPress(): void {
    if (this.#destroyed) return;
    const view = this.native.view;
    if (!this.#presses.released(view.state.selection, (a, b) => a.eq(b))) return;
    const read = domSelectionOf(this.#env.modules, view);
    if (!read || read.eq(view.state.selection)) return;
    view.dispatch(view.state.tr.setSelection(read).setMeta('pointer', true));
  }

  /**
   * The cause of a document change that no adapter call made, by its transaction
   * (`uwg-te-req-engine-6`, `engineChange`): an undo or redo of the engine's history, a cut, a
   * composition, else typing.
   */
  #causeOf(tr: TiptapTransactionLike): TextEditorContentChange {
    return engineChange({
      history: this.#env.modules.history.isHistoryTransaction(tr),
      cut: tr.getMeta('uiEvent') === 'cut',
      composition: tr.getMeta(COMPOSITION_META) !== undefined,
    });
  }

  /**
   * The adapter's plugins after the identifier repair and the list normalization: the history
   * boundary, the cause of the last change and the notifier.
   */
  #plugins(modules: TextEditorTiptapModules): TiptapPluginLike[] {
    const boundary = new modules.state.PluginKey('tpHistoryBoundary');
    return [
      // An action, an input rule, a structural key or a pushed content ends its history event:
      // the next change starts a new one. A transaction appended to a change belongs to its event
      // and leaves the boundary as it is (`uwg-te-req-engine-5`).
      new modules.state.Plugin({
        key: boundary,
        state: {
          init: () => false,
          apply: (tr: TiptapTransactionLike, closed: boolean) =>
            closesHistory(tr)
              ? true
              : tr.getMeta('appendedTransaction') !== undefined || isNormalization(tr)
                ? closed
                : tr.docChanged
                  ? false
                  : closed,
        },
        filterTransaction: (tr: TiptapTransactionLike, state: TiptapEditorStateLike) => {
          if (
            boundary.getState(state) === true &&
            tr.docChanged &&
            !closesHistory(tr) &&
            !isNormalization(tr)
          )
            modules.history.closeHistory(tr);
          return true;
        },
      }),
      // The cause of the last change of the document that the transaction itself records.
      new modules.state.Plugin({
        key: this.#causes,
        state: {
          init: () => ENGINE_CHANGES.input,
          apply: (tr: TiptapTransactionLike, cause: TextEditorContentChange) =>
            tr.docChanged && tr.getMeta('appendedTransaction') === undefined
              ? this.#causeOf(tr)
              : cause,
        },
      }),
      // Every update of the view reaches the widget once.
      new modules.state.Plugin({
        view: () => ({
          update: (_view: unknown, previous: TiptapEditorStateLike) => this.#sync(previous),
        }),
      }),
    ];
  }

  #observe(): Observed {
    const view = this.native.view;
    const { state } = view;
    return {
      doc: state.doc,
      selection: state.selection,
      storedMarks: state.storedMarks,
      editable: view.editable,
      focused: view.hasFocus(),
      composing: view.composing,
    };
  }

  /**
   * Counts an engine update and notifies it: `content` for a document change, with the cause the
   * adapter knows (the request of an action or a content change, else engine history, a cut or a
   * composition, else input), and `state` otherwise. Nothing is notified after the mount's signal
   * aborted.
   */
  #sync(previous: TiptapEditorStateLike): void {
    if (this.#destroyed || !this.#ready) return;
    const observed = this.#observe();
    const last = this.#observed;
    this.#observed = observed;
    // The view writes a new selection into the DOM selection only while it owns it, editable and
    // focused; otherwise the DOM selection it recorded last stays its record.
    if (last !== null && (last.selection !== observed.selection || last.doc !== observed.doc))
      this.#presses.changed(observed.editable && observed.focused);
    // The root taking focus, or a change that no adapter call made (the user's), places the
    // selection; a root that stays focused, and the focus an applied request gives it, place none.
    if (
      (observed.focused && last?.focused !== true && !this.#keepingSelection) ||
      (this.#expected === null &&
        last !== null &&
        (last.selection !== observed.selection || last.doc !== observed.doc))
    )
      this.#placed = true;
    const changed =
      last !== null && last.doc !== observed.doc && !previous.doc.eq(this.native.state.doc);
    const same =
      last !== null &&
      last.doc === observed.doc &&
      last.selection === observed.selection &&
      last.storedMarks === observed.storedMarks &&
      last.editable === observed.editable &&
      last.focused === observed.focused &&
      last.composing === observed.composing;
    if (same) return;
    this.#version += 1;
    if (this.#context.signal.aborted) return;
    if (changed) {
      this.#contentVersion += 1;
      this.#context.content(this.#expected ?? this.#engineCause(observed.composing));
    } else this.#context.state();
  }

  /**
   * Notifies state when the engine's composition flag changed without an update of the view: the
   * engine flips it in its own handlers of `compositionstart` and `compositionend`, which run right
   * after the adapter's, and dispatches only when the composition left changes
   * (`uwg-te-req-engine-4`, `uwg-te-req-engine-6`).
   */
  #recheckComposition(): void {
    queueMicrotask(() => {
      if (this.#destroyed || !this.#ready) return;
      if (this.#observed?.composing !== this.native.view.composing) this.#sync(this.native.state);
    });
  }

  /** The cause of an engine change: a composition in progress, else what its transaction records. */
  #engineCause(composing: boolean): TextEditorContentChange {
    if (composing) return ENGINE_CHANGES.composition;
    const cause = this.#causes.getState(this.native.state);
    return typeof cause === 'object' && cause !== null
      ? (cause as TextEditorContentChange)
      : ENGINE_CHANGES.input;
  }

  /** Dispatches a transaction as a change of a known cause. */
  #dispatch(tr: TiptapTransactionLike, change: TextEditorContentChange): void {
    this.#expected = change;
    try {
      this.native.view.dispatch(tr);
    } finally {
      this.#expected = null;
    }
  }

  // State and content

  getState(): TextEditorEngineState {
    if (this.#state?.version !== this.#version) {
      const view = this.native.view;
      this.#state = buildTiptapState({
        modules: this.#env.modules,
        tables: this.#env.tables,
        nodes: this.#env.nodes,
        state: this.native.state,
        version: this.#version,
        contentVersion: this.#contentVersion,
        editable: this.native.isEditable,
        focused: view.hasFocus(),
        composing: view.composing,
        placed: this.#placed,
      });
    }
    return this.#state;
  }

  #portable(): TextEditorPortableDocument {
    return portableOf(this.native.state.doc, this.#env);
  }

  snapshot(): TextEditorSnapshot {
    const doc = this.native.state.doc;
    return new TextEditorAdapterSnapshot(
      this.#contentVersion,
      isEmptyTiptapDoc(doc),
      { portable: () => portableOf(doc, this.#env), native: () => doc.toJSON() },
      this.#glue,
    );
  }

  getContent(format: TextEditorPortableFormat, options?: TextEditorContentOptions): string;
  getContent(format: 'json', options?: TextEditorContentOptions): unknown;
  getContent(format: TextEditorFormat, options?: TextEditorContentOptions): unknown;
  getContent(format: TextEditorFormat, options: TextEditorContentOptions = {}): unknown {
    const source = {
      portable: () => this.#portable(),
      native: () => this.native.state.doc.toJSON(),
      toNative: toTiptapJson,
    };
    return textEditorContentOf(source, format, this.#glue, options);
  }

  setContent(
    content: unknown,
    format: TextEditorFormat,
    options: TextEditorSetContentOptions = {},
  ): void {
    assertTextEditorFormat(format);
    const read = readTextEditorContent(content, format, this.#glue);
    const { schema } = this.native;
    let doc;
    try {
      doc = schema.nodeFromJSON(
        toTiptapJson(withTrailingParagraph(read.document, this.#env.createId)),
      );
      doc.check();
    } catch (error) {
      throw domError('DataError', `The content does not fit the schema: ${String(error)}`);
    }
    const change = contentChange(options);
    const { state } = this.#env.modules;
    const current = this.native.state;
    // The selection waits, unreported, at the first text point.
    this.#placed = false;
    if (options.history === 'push') {
      const tr = current.tr;
      if (!current.doc.eq(doc)) {
        tr.replaceWith(0, current.doc.content.size, doc.content);
        // An undo step of its own: the history event closes before and after it
        // (`uwg-te-req-engine-5`).
        ownStep(this.#env, tr);
      }
      tr.setSelection(edgeSelection(this.#env, tr.doc, 'start'));
      this.#dispatch(tr, change);
    } else {
      // A new state clears the history; its plugin views are created anew, so sync here. No
      // transaction runs the caret rule's plugin, so the new state stores what it would.
      const selection = edgeSelection(this.#env, doc, 'start');
      const next = state.EditorState.create({
        schema,
        doc,
        plugins: current.plugins,
        selection,
        storedMarks: needsUnmarkedCaret(this.#env.modules, selection, null) ? [] : null,
      });
      this.#expected = change;
      try {
        this.native.view.updateState(next);
        this.#sync(current);
      } finally {
        this.#expected = null;
      }
    }
    if (this.#live())
      for (const { code, message } of read.diagnostics) this.#context.diagnostic(code, message);
  }

  getBlocks(): TextEditorBlockTree {
    const document = this.#portable();
    if (this.#tree?.document !== document || this.#tree.version !== this.#contentVersion)
      this.#tree = {
        document,
        version: this.#contentVersion,
        tree: blockTree(document, this.#contentVersion),
      };
    return this.#tree.tree;
  }

  getTable(id: string): TextEditorTableModel | null {
    return tableModelOf(this.#portable(), id);
  }

  // Actions

  /**
   * What the shared action gate reads from the mount (`uwg-te-req-engine-5`): its capabilities,
   * editability, URL policy, the kinds of the current document's blocks and the history.
   */
  #gate(): TextEditorActionGate {
    const { state } = this.native;
    const { history } = this.#env.modules;
    return {
      capabilities: this.#env.capabilities,
      editable: this.native.isEditable,
      urls: this.#env.urls,
      kindOf: kindLookup(state.doc),
      canUndo: history.undoDepth(state) > 0,
      canRedo: history.redoDepth(state) > 0,
    };
  }

  /** A work over the current state, as `execute` builds it. */
  #work(): TiptapWork {
    return new TiptapWork(this.#env, this.native.state, {
      placed: this.#placed,
      editable: this.native.isEditable,
    });
  }

  can(action: TextEditorAction): boolean {
    return actionCan(action, this.#gate(), this.#glue, (allowed) =>
      applyAction(this.#work(), allowed),
    );
  }

  execute(actions: readonly TextEditorAction[], options: TextEditorExecuteOptions): boolean {
    if (this.#destroyed) return false;
    const plan = planExecute(actions, this.#gate());
    switch (plan.kind) {
      case 'refused':
        return false;
      case 'content':
        this.setContent(plan.action.content, plan.action.format, {
          history: plan.action.history,
          reason: options.reason,
        });
        return true;
      case 'history':
        return this.#step(plan.action.type, options);
      case 'actions':
        return this.#apply(plan.actions, options);
    }
  }

  /** Undo or redo through the engine's history, as one change of the request. */
  #step(type: 'history.undo' | 'history.redo', options: TextEditorExecuteOptions): boolean {
    const { history } = this.#env.modules;
    const change = actionChange([{ type }], options);
    const applied = (type === 'history.undo' ? history.undo : history.redo)(
      this.native.state,
      (tr) => {
        tr.setMeta(TP_ACTION_META, { reason: options.reason, type });
        // The step restores the selection of its time, which places one.
        this.#placed = true;
        this.#dispatch(tr, change);
      },
    );
    if (applied) this.#focusAfter(options);
    return applied;
  }

  /**
   * Applies a list of actions as one transaction of the request, all of them or none; while
   * read-only, a text selection it leaves goes into the focused root's DOM selection
   * (`showReadOnlySelection`).
   */
  #apply(actions: readonly TextEditorAction[], options: TextEditorExecuteOptions): boolean {
    const work = this.#work();
    for (const action of actions) if (!applyAction(work, action)) return false;
    const change = actionChange(actions, options);
    const tr = this.#withoutNoOpSteps(work.tr);
    tr.setMeta(TP_ACTION_META, { reason: options.reason, type: change.action ?? actions[0]!.type });
    if (tr.docChanged) this.#env.modules.history.closeHistory(tr);
    // An action that selects places the selection, before the notification reads it; clearing
    // the selection unplaces it.
    this.#cleared = work.cleared;
    if (work.cleared) this.#placed = false;
    else if (work.placed || tr.selectionSet) this.#placed = true;
    const version = this.#version;
    this.#dispatch(tr, change);
    // An applied list that changed nothing still notifies state, never content
    // (`uwg-te-req-engine-6`).
    if (this.#version === version && this.#live()) {
      this.#version += 1;
      this.#context.state();
    }
    // Diagnostics of the actions, such as converted kinds of inserted content, once applied.
    if (this.#live())
      for (const { code, message } of work.diagnostics) this.#context.diagnostic(code, message);
    this.#focusAfter(options);
    if (work.cleared) this.#dropDomSelection();
    else showReadOnlySelection(this.#env.modules, this.native.view);
    return true;
  }

  /**
   * Removes the DOM selection of the focused root after the selection was cleared, so that no
   * caret shows; the view ignores a DOM selection outside its root, and the next press is read
   * from the DOM (`TextEditorPressRead`).
   */
  #dropDomSelection(): void {
    const view = this.native.view;
    if (!view.hasFocus()) return;
    view.dom.ownerDocument.getSelection?.()?.removeAllRanges();
    this.#presses.changed(false);
  }

  /**
   * Places the resting selection that clearing left, once a key or a press follows: a key writes
   * it into the DOM selection first, so that the key acts where the caret shows; a press has set
   * the DOM selection itself. Notifies state, which then reports the selection.
   */
  #placeCleared(write: boolean): void {
    if (this.#destroyed || !this.#cleared) return;
    this.#cleared = false;
    if (this.#placed) return;
    this.#placed = true;
    if (write) this.#focusRoot();
    this.#version += 1;
    if (this.#live()) this.#context.state();
  }

  /**
   * The transaction of an applied action list whose steps leave the document as it was, such as a
   * link set to the destination it already has: a list that changes nothing adds no undo step,
   * keeps the redo steps and notifies `state` only (`uwg-te-req-engine-5`), so its steps give way
   * to a transaction carrying only the selection and stored marks it set, at the same positions of
   * the unchanged document. Any other transaction is returned as it is. The comparison stops at
   * the nodes the steps did not rewrite, which both documents share.
   */
  #withoutNoOpSteps(tr: TiptapTransactionLike): TiptapTransactionLike {
    const { state } = this.native;
    if (!tr.docChanged || !tr.doc.eq(state.doc)) return tr;
    const kept = state.tr;
    if (tr.selectionSet) kept.setSelection(tr.selection.map(state.doc, kept.mapping));
    if (tr.storedMarksSet) kept.setStoredMarks(tr.storedMarks);
    return kept;
  }

  #focusAfter(options: TextEditorExecuteOptions): void {
    if (options.focus === false || this.native.view.hasFocus()) return;
    this.#keepingSelection = true;
    try {
      this.#focusRoot();
    } finally {
      this.#keepingSelection = false;
    }
  }

  // Lookups and geometry (geometry.ts)

  blockElement(id: string): HTMLElement | null {
    return this.#destroyed ? null : this.#geometry.blockElement(id);
  }
  blockAt(node: Node): string | null {
    return this.#destroyed ? null : this.#geometry.blockAt(node);
  }
  cellElement(table: string, cell: TextEditorCellAddress): HTMLElement | null {
    return this.#destroyed ? null : this.#geometry.cellElement(table, cell);
  }
  cellAt(node: Node): TextEditorCellLocation | null {
    return this.#destroyed ? null : this.#geometry.cellAt(node);
  }
  tableElements(id: string): TextEditorTableElements | null {
    return this.#destroyed ? null : this.#geometry.tableElements(id);
  }
  pointAt(x: number, y: number): TextEditorTextPoint | null {
    return this.#destroyed ? null : this.#geometry.pointAt(x, y);
  }
  blockRects(id: string): TextEditorBlockRects | null {
    return this.#destroyed ? null : this.#geometry.blockRects(id);
  }
  rangeRects(range: TextEditorTextRange): readonly DOMRectReadOnly[] {
    return this.#destroyed ? [] : this.#geometry.rangeRects(range);
  }
  // While no selection is placed the state reports none, so there is no selection or caret to
  // measure, although the engine's own selection waits at the first text point.
  selectionRects(): readonly DOMRectReadOnly[] {
    return this.#destroyed || !this.#placed ? [] : this.#geometry.selectionRects();
  }
  caretRect(): DOMRectReadOnly | null {
    return this.#destroyed || !this.#placed ? null : this.#geometry.caretRect();
  }

  // Root, focus and editability

  setRootAttributes(attributes: TextEditorRootAttributes): void {
    for (const [name, value] of Object.entries(attributes)) {
      if (value === null) delete this.#rootAttributes[name];
      else this.#rootAttributes[name] = value;
    }
    const active = contentStopsActive(attributes, this.#stops.active);
    if (active !== this.#stops.active) {
      this.#stops.active = active;
      writeContentStops(this.#stops);
    }
    if (!this.#destroyed) this.native.view.setProps({});
  }

  /** Focuses the editing root without scrolling and writes the model selection into it. */
  #focusRoot(): void {
    const view = this.native.view;
    if (!view.editable) this.#root.focus({ preventScroll: true });
    view.focus();
    this.#presses.changed(view.editable && view.hasFocus());
  }

  /**
   * Moves the engine's selection to the first or last text point of the document, without
   * history; `place` also places it, as `focus` does.
   */
  #placeAtEdge(side: 'start' | 'end', place: boolean): void {
    const { state } = this.native;
    if (place) this.#placed = true;
    const tr = state.tr
      .setSelection(edgeSelection(this.#env, state.doc, side))
      .setMeta('addToHistory', false);
    this.#dispatch(tr, { cause: 'engine', reason: 'engine' });
  }

  /**
   * Focuses the root (`uwg-te-tab-engine` r13): `start` and `end` put the caret at the first or
   * last text point, `restore` keeps the last selection, or without one puts the caret at the
   * first text point, never on an atom. While read-only, a text selection goes into the root's DOM
   * selection (`showReadOnlySelection`).
   */
  focus(position: TextEditorFocusPosition = 'restore'): Promise<void> {
    if (this.#destroyed) return Promise.resolve();
    if (position !== 'restore') this.#placeAtEdge(position, true);
    else if (!this.#placed) this.#placeAtEdge('start', true);
    this.#focusRoot();
    showReadOnlySelection(this.#env.modules, this.native.view);
    return Promise.resolve();
  }

  blur(): void {
    if (!this.#destroyed) this.native.view.dom.blur();
  }

  setEditable(editable: boolean): void {
    if (this.#destroyed) return;
    // Without the engine's update event: the change notifies state only (`uwg-te-tab-engine` r13).
    this.native.setEditable(editable, false);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    returnToMountDocument(this.#root, this.#mountDocument);
    try {
      this.native.destroy();
    } finally {
      this.#root.remove();
      this.#release();
    }
  }
}

/**
 * Before the engine is destroyed: a root that moved into another document goes back to the one it
 * mounted in, leaving its container, because the engine removes its document listeners from the
 * root's current document and registered them on the first one.
 */
function returnToMountDocument(root: HTMLElement, document: Document): void {
  if (root.ownerDocument === document || typeof document.adoptNode !== 'function') return;
  document.adoptNode(root);
}
