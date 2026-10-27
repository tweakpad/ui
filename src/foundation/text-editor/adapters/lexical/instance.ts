/**
 * A mounted Lexical editor (Widgets `uwg-te-tab-engine`, `uwg-te-req-engine-4`–`-10`).
 *
 * A mount builds the runtime of its modules, options and context (`lexicalRuntime`), then opens
 * an instance over it (`openLexicalInstance`): in a container it creates a fresh editing root,
 * builds the editor with the adapter's extension and the initial content, sets the root (the
 * engine renders synchronously, so the instance is ready right after) and adopts the base CSS;
 * without a container the editor stays rootless and only its content and actions work. The
 * instance reads content and state from the committed editor state and applies actions through
 * `actions.ts`.
 */
import type { TextEditorAction } from '../../actions.js';
import type { TextEditorCapability } from '../../capabilities.js';
import { canonicalize, type TextEditorPortableDocument } from '../../content/portable.js';
import type {
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
import { resolveTextEditorCapabilities } from '../../tools.js';
import { contentChange } from '../shared/actions.js';
import { blockTree } from '../shared/blocks.js';
import {
  readTextEditorContent,
  TextEditorAdapterSnapshot,
  textEditorContentGlue,
  textEditorContentOf,
  type TextEditorContentGlueOptions,
} from '../shared/content.js';
import { contentStopsActive } from '../shared/content-stops.js';
import { nodeOverrides, resolveCss } from '../shared/options.js';
import { tableModelOf } from '../shared/tables.js';
import { isActionAbort, LexicalActions } from './actions.js';
import { LEXICAL_BASE_CSS } from './css.js';
import { trackPresses } from './cursor.js';
import { $applyDocument, $loadDocument, $portableDocument, $textEdgeIn } from './document.js';
import { lexicalExtension, type LexicalMountInput } from './extension.js';
import { LexicalGeometry } from './geometry.js';
import type { TextEditorLexicalOptions } from './index.js';
import { lexicalToPortable, portableToLexical } from './mapping.js';
import {
  lexicalVersionProblem,
  type LexicalBuiltEditorLike,
  type TextEditorLexicalModules,
} from './modules.js';
import { cleanUpViews } from './nodes.js';
import { notifyState } from './notify.js';
import { repaintContentStops } from './render.js';
import { LexicalRuntime } from './runtime.js';
import { $applySelection, $readSelection } from './selection.js';
import {
  buildLexicalState,
  cancelDragStarts,
  releaseEngineRootStyle,
  releaseRootSelection,
  rootFocused,
  showReadOnlySelection,
  writeOwnRootAttributes,
  writeRootAttributes,
} from './state.js';

/**
 * The runtime of a mount: its modules, the content glue of its context (HTML read through
 * `glueOptions`), its custom nodes with their override classes and its identifier generator.
 */
export function lexicalRuntime(
  engine: TextEditorEngine,
  modules: TextEditorLexicalModules,
  options: TextEditorLexicalOptions,
  context: TextEditorEngineContext,
  glueOptions: TextEditorContentGlueOptions,
): LexicalRuntime {
  return new LexicalRuntime({
    modules,
    nodes: context.nodes,
    createId: () => context.createId(),
    urls: context.urls,
    glue: textEditorContentGlue(context, engine, lexicalToPortable, glueOptions),
    overrides: nodeOverrides(options),
  });
}

/**
 * Opens an instance over a runtime: with a container, a fresh editing root as its only child that
 * the editor renders into (`uwg-te-req-engine-7`); without one, a rootless editor. The initial
 * content renders without history and without a change notification, and the instance reports
 * ready before it returns.
 */
export function openLexicalInstance(
  engine: TextEditorEngine,
  rt: LexicalRuntime,
  options: TextEditorLexicalOptions,
  context: TextEditorEngineContext,
  container: HTMLElement | null,
): LexicalInstance {
  const { modules } = rt;
  const initial = context.initialContent
    ? readTextEditorContent(context.initialContent.content, context.initialContent.format, rt.glue)
    : {
        document: canonicalize({ blocks: [] }, { createId: rt.createId }).document,
        diagnostics: [],
      };
  const document = container?.ownerDocument ?? null;
  const root = document ? document.createElement('div') : null;
  const announcer = document ? document.createElement('div') : null;
  if (root) writeOwnRootAttributes(root, context.editable);
  rt.root = root;
  let release: (() => void) | null = null;
  let editor: LexicalBuiltEditorLike | null = null;
  try {
    if (root && container) release = context.adoptStyles(resolveCss(options.css, LEXICAL_BASE_CSS));
    const input: LexicalMountInput = {
      rt,
      context,
      announcer,
      onError: (error) => {
        if (!isActionAbort(error)) context.error(error);
      },
      onEditable: (editable) => {
        if (root) writeOwnRootAttributes(root, editable);
      },
    };
    editor = modules.extension.buildEditorFromExtensions(
      modules.lexical.defineExtension(lexicalExtension(input)),
    );
    const problem = lexicalVersionProblem(editor.constructor.version);
    if (problem) context.diagnostic('text-editor-engine-version', problem);
    // The content loads in one update that builds its nodes from the native JSON objects, before
    // the root is set: the transforms visit each new node once and no DOM selection is read.
    // With a root, the root's commit reconciles it, into the root while it is still detached, so
    // the load reads no style or layout of the page and writes no DOM selection.
    const { lexical } = rt;
    editor.update(
      () => {
        lexical.$addUpdateTag(lexical.SKIP_DOM_SELECTION_TAG);
        $loadDocument(rt, initial.document);
        lexical.$setSelection(null);
      },
      // Without a root nothing commits the update later, so it commits at once.
      { ...(root ? {} : { discrete: true as const }), tag: lexical.HISTORY_MERGE_TAG },
    );
    if (root) {
      editor.setRootElement(root);
      releaseEngineRootStyle(root);
      container?.append(root);
      const untrack = trackPresses(rt, root);
      const undrag = cancelDragStarts(root);
      const released = release;
      release = () => {
        untrack();
        undrag();
        released?.();
      };
    }
  } catch (error) {
    editor?.dispose();
    root?.remove();
    release?.();
    throw error;
  }
  const instance = new LexicalInstance(engine, rt, editor, root, release, context);
  rt.live = true;
  for (const { code, message } of initial.diagnostics) context.diagnostic(code, message);
  context.ready();
  return instance;
}

/** A mounted Lexical editor. */
export class LexicalInstance implements TextEditorEngineInstance {
  readonly capabilities: ReadonlySet<TextEditorCapability>;
  readonly #rt: LexicalRuntime;
  readonly #editor: LexicalBuiltEditorLike;
  readonly #root: HTMLElement | null;
  readonly #context: TextEditorEngineContext;
  readonly #actions: LexicalActions;
  readonly #geometry: LexicalGeometry;
  readonly #available: ReadonlySet<TextEditorCapability>;
  #release: (() => void) | null;
  #state: TextEditorEngineState | null = null;
  #document: { readonly version: number; readonly document: TextEditorPortableDocument } | null =
    null;
  #blocks: TextEditorBlockTree | null = null;
  #destroyed = false;

  constructor(
    engine: TextEditorEngine,
    rt: LexicalRuntime,
    editor: LexicalBuiltEditorLike,
    root: HTMLElement | null,
    release: (() => void) | null,
    context: TextEditorEngineContext,
  ) {
    this.capabilities = engine.capabilities;
    this.#rt = rt;
    this.#editor = editor;
    this.#root = root;
    this.#release = release;
    this.#context = context;
    this.#available = resolveTextEditorCapabilities(engine, context.nodes);
    this.#actions = new LexicalActions(rt, {
      capabilities: () => this.#available,
      editable: () => !this.#destroyed && rt.engine.isEditable(),
      report: ({ code, message }) => {
        if (!context.signal.aborted) context.diagnostic(code, message);
      },
      setContent: (content, format, options) => this.setContent(content, format, options),
      notifyState: () => notifyState(rt, context),
    });
    this.#geometry = new LexicalGeometry(rt);
  }

  /** The engine's editor object. */
  get native(): unknown {
    return this.#editor;
  }

  // State and content

  getState(): TextEditorEngineState {
    const rt = this.#rt;
    if (this.#state?.version !== rt.version) this.#state = buildLexicalState(rt);
    return this.#state;
  }

  /** The canonical portable document of the committed state, once per content version. */
  #portable(): TextEditorPortableDocument {
    const rt = this.#rt;
    if (this.#document?.version !== rt.contentVersion || !rt.live)
      this.#document = {
        version: rt.contentVersion,
        document: rt.readCommitted(() => $portableDocument(rt)),
      };
    return this.#document.document;
  }

  snapshot(): TextEditorSnapshot {
    const rt = this.#rt;
    const state = rt.engine.getEditorState();
    const version = rt.contentVersion;
    const empty = this.getState().empty;
    return new TextEditorAdapterSnapshot(
      version,
      empty,
      {
        portable: () =>
          version === rt.contentVersion
            ? this.#portable()
            : state.read(() => $portableDocument(rt)),
        native: () => state.toJSON(),
      },
      rt.glue,
    );
  }

  getContent(format: TextEditorPortableFormat, options?: TextEditorContentOptions): string;
  getContent(format: 'json', options?: TextEditorContentOptions): unknown;
  getContent(format: TextEditorFormat, options?: TextEditorContentOptions): unknown;
  getContent(format: TextEditorFormat, options: TextEditorContentOptions = {}): unknown {
    const rt = this.#rt;
    return textEditorContentOf(
      {
        portable: () => this.#portable(),
        native: () => rt.engine.getEditorState().toJSON(),
        toNative: portableToLexical,
      },
      format,
      rt.glue,
      options,
    );
  }

  setContent(
    content: unknown,
    format: TextEditorFormat,
    options: TextEditorSetContentOptions = {},
  ): void {
    const rt = this.#rt;
    const { lexical } = rt;
    const editor = rt.engine;
    // Read first: content that cannot be read, or a format that is none, leaves everything as it
    // was.
    const read = readTextEditorContent(content, format, rt.glue);
    const push = options.history === 'push';
    editor.read(() => undefined);
    rt.selectAll = false;
    rt.cleared = null;
    if (!push) editor.dispatchCommand(lexical.CLEAR_HISTORY_COMMAND, undefined);
    // A DOM selection that an unfocused root kept goes before the load: the engine's selection
    // notification after it would otherwise adopt it as the next selection.
    const root = this.#root;
    if (root && !rootFocused(root)) releaseRootSelection(rt, root);
    const tags = [push ? lexical.HISTORY_PUSH_TAG : lexical.HISTORY_MERGE_TAG];
    if (!rt.focused) tags.push(lexical.SKIP_DOM_SELECTION_TAG);
    rt.acting = contentChange(options);
    try {
      editor.update(
        () => {
          $applyDocument(rt, read.document);
          // No selection after a load until focus, the user or `selection.set` places one
          // (`uwg-te-req-engine-4`).
          lexical.$setSelection(null);
        },
        { discrete: true, tag: tags },
      );
    } finally {
      rt.acting = null;
    }
    if (!this.#context.signal.aborted)
      for (const { code, message } of read.diagnostics) this.#context.diagnostic(code, message);
  }

  // Actions

  can(action: TextEditorAction): boolean {
    if (this.#destroyed) return false;
    return this.#actions.can(action);
  }

  /**
   * Applies actions; unless `focus` is false, an unfocused root then takes focus with the
   * selection the actions left (`uwg-te-tab-engine` r4).
   */
  execute(actions: readonly TextEditorAction[], options: TextEditorExecuteOptions): boolean {
    if (this.#destroyed) return false;
    const applied = this.#actions.execute(actions, options);
    if (applied && options.focus !== false) this.#focusRoot();
    if (applied && this.#root) showReadOnlySelection(this.#rt, this.#root);
    return applied;
  }

  /**
   * Focuses an unfocused root and keeps the model selection, which the DOM selection that focusing
   * moves would otherwise replace: a caret keeps the format chosen at it, a block selection and a
   * cell range stay, and no selection stays none (`uwg-te-req-engine-4`): the caret the browser
   * puts into the root it focuses is removed, so the engine never adopts it.
   */
  #focusRoot(): void {
    const rt = this.#rt;
    const root = this.#root;
    if (!root || rootFocused(root)) return;
    const kept = rt.readCommitted(() => rt.lexical.$getSelection()?.clone() ?? null);
    root.focus({ preventScroll: true });
    rt.engine.update(() => rt.lexical.$setSelection(kept?.clone() ?? null), { discrete: true });
    if (!kept) releaseRootSelection(rt, root);
    this.#noteFocus();
  }

  /** Reports the focus the root took, when the engine's focus event has not yet. */
  #noteFocus(): void {
    const rt = this.#rt;
    const root = this.#root;
    if (root && rootFocused(root) && !rt.focused) {
      rt.focused = true;
      if (rt.live && !this.#context.signal.aborted) {
        rt.version += 1;
        this.#context.state();
      }
    }
  }

  // Block model

  /** The same tree object until the content version changes. */
  getBlocks(): TextEditorBlockTree {
    const rt = this.#rt;
    if (this.#blocks?.version !== rt.contentVersion || !rt.live)
      this.#blocks = blockTree(this.#portable(), rt.contentVersion);
    return this.#blocks;
  }

  getTable(id: string): TextEditorTableModel | null {
    return tableModelOf(this.#portable(), id);
  }

  // Lookups and geometry

  blockElement(id: string): HTMLElement | null {
    return this.#geometry.blockElement(id);
  }

  blockAt(node: Node): string | null {
    return this.#geometry.blockAt(node);
  }

  cellElement(table: string, cell: TextEditorCellAddress): HTMLElement | null {
    return this.#geometry.cellElement(table, cell);
  }

  cellAt(node: Node) {
    return this.#geometry.cellAt(node);
  }

  tableElements(id: string) {
    return this.#geometry.tableElements(id);
  }

  pointAt(x: number, y: number): TextEditorTextPoint | null {
    return this.#geometry.pointAt(x, y);
  }

  blockRects(id: string): TextEditorBlockRects | null {
    return this.#geometry.blockRects(id);
  }

  rangeRects(range: TextEditorTextRange): readonly DOMRectReadOnly[] {
    return this.#geometry.rangeRects(range);
  }

  selectionRects(): readonly DOMRectReadOnly[] {
    return this.#geometry.selectionRects();
  }

  caretRect(): DOMRectReadOnly | null {
    return this.#geometry.caretRect();
  }

  // The editing root

  setRootAttributes(attributes: TextEditorRootAttributes): void {
    if (!this.#root || this.#destroyed) return;
    writeRootAttributes(this.#root, attributes);
    const rt = this.#rt;
    const active = contentStopsActive(attributes, rt.contentStopsActive);
    if (active === rt.contentStopsActive) return;
    rt.contentStopsActive = active;
    repaintContentStops(rt, this.#root);
  }

  /**
   * Focuses the root synchronously and places the selection (`uwg-te-req-engine-4`): the last one
   * restored, or a caret at the first or last text point of the document, taking the format of the
   * text there. The selection to restore is read before the root takes focus, which moves the DOM
   * selection.
   */
  focus(position: TextEditorFocusPosition = 'restore'): Promise<void> {
    if (this.#destroyed) return Promise.resolve();
    const rt = this.#rt;
    const root = this.#root;
    // Focus places a selection, also after one was cleared.
    rt.cleared = null;
    const last =
      position === 'restore'
        ? rt.readCommitted(() => ({
            model: $readSelection(rt),
            engine: rt.lexical.$getSelection()?.clone() ?? null,
          }))
        : null;
    if (root && !rootFocused(root)) root.focus({ preventScroll: true });
    rt.engine.update(
      () => {
        if (last && last.model.kind !== 'none') {
          // Set again so the engine places it in the DOM; a text selection takes the format of
          // the text at its anchor.
          if (last.model.kind === 'text')
            $applySelection(rt, {
              kind: 'text',
              anchor: last.model.anchor,
              head: last.model.head,
            });
          else rt.lexical.$setSelection(last.engine?.clone() ?? null);
          return;
        }
        // The shared first or last text point of the document: a leading table's cell (0,0); an
        // atom is never block-selected here.
        const edge = $textEdgeIn(
          rt,
          rt.lexical.$getRoot().getChildren(),
          position === 'end' ? 'end' : 'start',
        );
        if (edge) $applySelection(rt, { kind: 'text', anchor: edge });
      },
      { discrete: true },
    );
    if (root) showReadOnlySelection(rt, root);
    this.#noteFocus();
    return Promise.resolve();
  }

  blur(): void {
    if (this.#destroyed) return;
    const root = this.#root;
    if (root && rootFocused(root)) root.blur();
  }

  setEditable(editable: boolean): void {
    if (this.#destroyed) return;
    const editor = this.#rt.engine;
    if (editor.isEditable() !== editable) editor.setEditable(editable);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    const rt = this.#rt;
    rt.live = false;
    const editor = this.#editor;
    try {
      cleanUpViews(editor);
      if (this.#root) editor.setRootElement(null);
      editor.dispose();
    } finally {
      this.#root?.remove();
      this.#release?.();
      this.#release = null;
    }
  }
}
