/**
 * Stubs for the Tiptap adapter tests in Node. The real engine modules run headless
 * here: `stubTiptapModules` keeps them but replaces the editor class with one that records its
 * options and mounts no view, so a mount runs in Node over the real schema, state, plugins and
 * commands, with a structural view that applies transactions and drives the plugin views; it
 * also records the `configure` calls of the configured extensions. `headlessTiptap` builds the
 * adapter's schema and plugins into a bare editor state. The suite at the end checks the stubs.
 */
import * as core from '@tiptap/core';
import * as list from '@tiptap/extension-list';
import * as table from '@tiptap/extension-table';
import * as history from '@tiptap/pm/history';
import * as state from '@tiptap/pm/state';
import * as tables from '@tiptap/pm/tables';
import * as starterKit from '@tiptap/starter-kit';
import { describe, expect, it } from 'vitest';
import {
  canonicalize,
  type TextEditorPortableDocument,
  type TextEditorPortableDraft,
} from '../../content/portable.js';
import type {
  TextEditorContentChange,
  TextEditorContentInput,
  TextEditorDiagnosticCode,
  TextEditorEngine,
  TextEditorEngineContext,
  TextEditorEngineInstance,
} from '../../engine.js';
import type { TextEditorAction } from '../../actions.js';
import type { TextEditorSelectionInput } from '../../model.js';
import type { TextEditorNodeDefinition } from '../../nodes.js';
import {
  FakeDocument,
  fakeContainer,
  sequentialIds,
  TEST_URLS,
  type FakeElement,
} from '../shared/test-helpers.test.js';
import { createTiptapEngine, type TextEditorTiptapOptions } from './index.js';
import { blockIdsPlugin } from './ids.js';
import { TIPTAP_INPUT_RULES } from './input-rules.js';
import { behaviorExtensions, editingBindings } from './keymap.js';
import { listMergePlugin } from './lists.js';
import { caretMarksPlugin } from './marks.js';
import { customNodeExtensions } from './nodes.js';
import { withTrailingParagraph } from '../shared/blocks.js';
import { toTiptapJson } from './mapping.js';
import { hasTiptapTables } from './modules.js';
import type {
  TextEditorTiptapModules,
  TiptapCommandEditorLike,
  TiptapCommandsLike,
  TiptapViewLike,
  TiptapCoreLike,
  TiptapEditorStateLike,
  TiptapExtensionLike,
  TiptapHistoryLike,
  TiptapListLike,
  TiptapNodeLike,
  TiptapPluginLike,
  TiptapStarterKitLike,
  TiptapStateLike,
  TiptapTableLike,
  TiptapTablesLike,
  TiptapTransactionLike,
} from './modules.js';
import { createTiptapExtensions } from './schema.js';
import { TiptapWork, type TiptapDispatchViewLike, type TiptapEnv } from './work.js';

// The real modules conform to the structural module types, which the type check verifies.
const realCore: TiptapCoreLike = core;
const realState: TiptapStateLike = state;
const realHistory: TiptapHistoryLike = history;
const realStarterKit: TiptapStarterKitLike = starterKit;
const realList: TiptapListLike = list;
const realTable: TiptapTableLike = table;
const realTables: TiptapTablesLike = tables;

/** The engine modules, as an application passes them. */
export const TIPTAP_MODULES: TextEditorTiptapModules = Object.freeze({
  core: realCore,
  state: realState,
  history: realHistory,
  starterKit: realStarterKit,
  list: realList,
  table: realTable,
  tables: realTables,
});

export const TEST_LABELS = Object.freeze({ taskCheckbox: 'Done' });

// The structural view and editor

interface PluginViewLike {
  update?(view: StubView, previous: TiptapEditorStateLike): void;
  destroy?(): void;
}

/**
 * The view of a stub editor: it applies transactions to the real state, calls the plugin views
 * as the engine's view does, and computes the root attributes; it renders nothing.
 */
export class StubView {
  state: TiptapEditorStateLike;
  props: Record<string, unknown>;
  composing = false;
  isDestroyed = false;
  /** Every state the view showed, in order. */
  readonly states: TiptapEditorStateLike[] = [];
  #views: PluginViewLike[] = [];

  constructor(
    readonly dom: FakeElement,
    initial: TiptapEditorStateLike,
    props: Record<string, unknown>,
    readonly editor: StubEditor,
  ) {
    this.state = initial;
    this.props = props;
    this.#createViews();
  }

  get editable(): boolean {
    return this.editor.options.editable !== false;
  }

  #createViews(): void {
    for (const view of this.#views) view.destroy?.();
    this.#views = this.state.plugins.flatMap((plugin) => {
      const spec = plugin.spec as { view?: (view: StubView) => PluginViewLike };
      return spec.view ? [spec.view(this)] : [];
    });
  }

  dispatch(tr: TiptapTransactionLike): void {
    if (this.isDestroyed) return;
    this.updateState(this.state.apply(tr));
  }

  updateState(next: TiptapEditorStateLike): void {
    const previous = this.state;
    this.state = next;
    this.states.push(next);
    if (previous.plugins !== next.plugins) this.#createViews();
    else for (const view of this.#views) view.update?.(this, previous);
  }

  setProps(props: object): void {
    this.props = { ...this.props, ...props };
    this.updateState(this.state);
  }

  /**
   * The root attributes, as the engine's view writes them: those of the editor's view attributes
   * (the engine's merge of `role` with the adapter's, unless the editor class replaces it), then
   * `translate="no"` when no attribute gives one.
   */
  attributes(): Record<string, string> {
    const source = this.editor.getEditorViewAttributes();
    const value = typeof source === 'function' ? source(this.state) : source;
    const result: Record<string, string> = {};
    for (const [name, attribute] of Object.entries(value)) result[name] = String(attribute);
    result.translate ??= 'no';
    return result;
  }

  /** Focuses the root, as the engine's view does only while editable, and writes the selection. */
  focus(): void {
    if (this.editable) this.dom.focus();
    this.updateState(this.state);
  }

  /** Whether the root is the active element of its root node, as the engine's view reads it. */
  hasFocus(): boolean {
    const root = this.dom.getRootNode();
    return 'activeElement' in root && root.activeElement === this.dom;
  }

  destroy(): void {
    this.isDestroyed = true;
    for (const view of this.#views) view.destroy?.();
    this.#views = [];
  }
}

/** The options an editor received, the element stripped. */
export type StubEditorOptions = Readonly<Record<string, unknown>> & {
  readonly element?: { readonly mount: FakeElement } | null;
};

/**
 * An editor over the real engine without a view: a headless editor builds the schema, the content
 * and the plugins, and a `StubView` stands for the view.
 */
export class StubEditor {
  readonly options: Record<string, unknown>;
  readonly inner: core.Editor;
  readonly view: StubView;
  isDestroyed = false;

  constructor(
    options: StubEditorOptions,
    readonly log: StubLog,
  ) {
    log.editorOptions.push(options);
    this.options = { ...options };
    const { element, ...rest } = options;
    this.inner = new core.Editor({ ...(rest as object), element: null });
    const initial = state.EditorState.create({
      schema: this.inner.schema,
      doc: this.inner.state.doc,
      plugins: this.inner.extensionManager.plugins,
    });
    log.plugins.push(initial.plugins.map((plugin) => pluginName(plugin)));
    this.view = new StubView(
      element?.mount ?? new FakeDocument().createElement('div'),
      initial as unknown as TiptapEditorStateLike,
      { ...((options.editorProps as object | undefined) ?? {}) },
      this,
    );
    log.editors.push(this);
  }

  get state(): TiptapEditorStateLike {
    return this.view.state;
  }

  /** The engine's attributes of the editing root: its `role` merged with those of the props. */
  getEditorViewAttributes():
    Record<string, unknown> | ((state: TiptapEditorStateLike) => Record<string, unknown>) {
    const attributes = (this.options.editorProps as { attributes?: unknown } | undefined)
      ?.attributes;
    if (typeof attributes === 'function')
      return (state) => ({
        role: 'textbox',
        ...(attributes as (state: TiptapEditorStateLike) => Record<string, unknown>)(state),
      });
    return { role: 'textbox', ...(attributes as Record<string, unknown> | undefined) };
  }

  mount(): void {}

  get schema() {
    return this.view.state.schema;
  }

  get isEditable(): boolean {
    return this.options.editable !== false;
  }

  get extensionManager(): { readonly plugins: readonly TiptapPluginLike[] } {
    return { plugins: this.view.state.plugins };
  }

  getJSON(): unknown {
    return this.view.state.doc.toJSON();
  }

  setEditable(editable: boolean, emitUpdate = true): void {
    this.options.editable = editable;
    this.log.setEditable.push([editable, emitUpdate]);
    this.view.updateState(this.view.state);
  }

  destroy(): void {
    this.isDestroyed = true;
    this.view.destroy();
    this.inner.destroy();
  }
}

/** A plugin's key name without the engine's counter suffix. */
export function pluginName(plugin: TiptapPluginLike): string {
  const key = (plugin as unknown as { readonly key?: string }).key ?? '';
  return key.replace(/\$\d*$/u, '');
}

/** What the stub modules recorded. */
export interface StubLog {
  readonly editorOptions: StubEditorOptions[];
  readonly editors: StubEditor[];
  /** The plugin names of each editor, in the order the engine runs them. */
  readonly plugins: string[][];
  /** Each `configure` call of a recorded extension: its name and options. */
  readonly configure: [string, unknown][];
  readonly setEditable: [boolean, boolean][];
}

/**
 * An extension whose `configure` calls are recorded. It derives from the engine's extension, so
 * that it stays an extension of the same copy of the engine.
 */
function recorded(extension: TiptapExtensionLike, log: StubLog): TiptapExtensionLike {
  return Object.assign(Object.create(extension) as TiptapExtensionLike, {
    configure: (options?: object) => {
      log.configure.push([extension.name, options]);
      return extension.configure(options);
    },
    extend: (config?: object) => {
      const extended = extension.extend(config);
      return {
        name: extended.name,
        type: extended.type,
        configure: (options?: object) => {
          log.configure.push([extension.name, options]);
          return extended.configure(options);
        },
        extend: (more?: object) => extended.extend(more),
      };
    },
  });
}

export interface StubModulesOptions {
  /** Include the table modules; default true. */
  readonly tables?: boolean | undefined;
  /** Remove `moveTableRow` from the table helpers. */
  readonly withoutMove?: boolean | undefined;
}

/** The real modules with a recording editor class and recorded StarterKit and Table. */
export function stubTiptapModules(options: StubModulesOptions = {}) {
  const log: StubLog = {
    editorOptions: [],
    editors: [],
    plugins: [],
    configure: [],
    setEditable: [],
  };
  // A class, as the engine's editor is, so that a subclass of it can replace its methods.
  const Editor = class extends StubEditor {
    constructor(editorOptions: StubEditorOptions) {
      super(editorOptions, log);
    }
  } as unknown as TiptapCoreLike['Editor'];
  const withTables = options.tables !== false;
  const { moveTableRow, ...withoutMove } = realTables;
  void moveTableRow;
  const tablesModule: TiptapTablesLike = options.withoutMove ? withoutMove : realTables;
  const modules: TextEditorTiptapModules = {
    core: { ...realCore, Editor },
    state: realState,
    history: realHistory,
    starterKit: { StarterKit: recorded(realStarterKit.StarterKit, log) },
    list: realList,
    ...(withTables
      ? { table: { ...realTable, Table: recorded(realTable.Table, log) }, tables: tablesModule }
      : {}),
  };
  return { modules, log };
}

// Mounting

/** A recording mount context. */
export interface StubContext extends TextEditorEngineContext {
  readonly calls: string[];
  readonly changes: TextEditorContentChange[];
  readonly diagnostics: { readonly code: TextEditorDiagnosticCode; readonly message: string }[];
  readonly adopted: string[];
  readonly released: string[];
  readonly controller: AbortController;
}

export interface StubContextOptions {
  readonly content?: TextEditorContentInput | null | undefined;
  readonly editable?: boolean | undefined;
  readonly nodes?: readonly TextEditorNodeDefinition[] | undefined;
  readonly createId?: (() => string) | undefined;
}

export function stubContext(options: StubContextOptions = {}): StubContext {
  const calls: string[] = [];
  const changes: TextEditorContentChange[] = [];
  const diagnostics: { code: TextEditorDiagnosticCode; message: string }[] = [];
  const adopted: string[] = [];
  const released: string[] = [];
  const controller = new AbortController();
  return {
    calls,
    changes,
    diagnostics,
    adopted,
    released,
    controller,
    initialContent: options.content ?? null,
    editable: options.editable ?? true,
    nodes: options.nodes ?? [],
    urls: TEST_URLS,
    // Identifiers `n000000001`, `n000000002`… in order.
    createId: options.createId ?? sequentialIds('n', 9),
    adoptStyles: (css) => {
      adopted.push(css);
      return () => void released.push(css);
    },
    signal: controller.signal,
    labels: TEST_LABELS,
    ready: () => void calls.push('ready'),
    state: () => void calls.push('state'),
    content: (change) => {
      calls.push('content');
      changes.push(change);
    },
    error: () => void calls.push('error'),
    diagnostic: (code, message) => {
      calls.push(`diagnostic:${code}`);
      diagnostics.push({ code, message });
    },
  };
}

export interface MountOptions extends StubContextOptions, StubModulesOptions {
  readonly engineOptions?: TextEditorTiptapOptions | undefined;
}

/** A mounted instance over the stub modules, with its context, container and editor. */
export function mountTiptap(options: MountOptions = {}) {
  const stub = stubTiptapModules(options);
  const engine: TextEditorEngine = createTiptapEngine(stub.modules, options.engineOptions);
  const context = stubContext(options);
  const container = fakeContainer();
  const result = engine.mount(container as unknown as HTMLElement, context);
  if (result instanceof Promise) throw new Error('The stub mount is synchronous.');
  const instance: TextEditorEngineInstance = result;
  const editor = stub.log.editors.at(-1)!;
  return { ...stub, engine, context, container, instance, editor, view: editor.view };
}

/** Mounts an engine of any modules over a fresh container and settles the mount's result. */
export async function mountResult(modules: unknown) {
  const engine = createTiptapEngine(modules as TextEditorTiptapModules);
  const container = fakeContainer() as unknown as HTMLElement;
  try {
    return { value: await engine.mount(container, stubContext()) };
  } catch (error) {
    return { error: error as Error };
  }
}

/** Content in HTML, as `initialContent` takes it. */
export const html = (content: string): TextEditorContentInput => ({ content, format: 'html' });

/**
 * The editing keys and typing of a mount: the adapter's key bindings over the engine's own
 * commands, which run on the stub view, so every plugin of the mount sees the keys' transactions;
 * typed text goes through the plugins' text input, else the engine's text insertion.
 */
export function mountedKeys(mounted: ReturnType<typeof mountTiptap>) {
  const { editor, view, instance, context, modules } = mounted;
  const { inner } = editor;
  // What the engine's commands read from their editor besides the state and the view.
  const commandEditor = {
    extensionManager: inner.extensionManager,
    options: inner.options,
    storage: inner.storage,
    extensionStorage: inner.extensionStorage,
    isEditable: true,
    isDestroyed: false,
    emit: () => undefined,
    get state() {
      return view.state;
    },
    view,
    get schema() {
      return view.state.schema;
    },
  };
  const keyEditor: TiptapCommandEditorLike = {
    view: view as unknown as TiptapViewLike,
    get commands() {
      return new core.CommandManager({ editor: commandEditor as never })
        .commands as unknown as TiptapCommandsLike;
    },
  };
  const env: TiptapEnv = {
    modules,
    tables: hasTiptapTables(modules) ? modules.tables : undefined,
    createId: () => context.createId(),
    nodes: context.nodes,
    urls: context.urls,
    capabilities: instance.capabilities,
  };
  const bindings = editingBindings(env, keyEditor);
  return {
    env,
    /** Presses a key by the engine's name, such as `Enter` or `Shift-Enter`; whether it was handled. */
    press: (name: string): boolean => bindings[name]?.() ?? false,
    type(text: string): void {
      for (const character of text) {
        const { state } = view;
        const { from, to } = state.selection;
        const handled = state.plugins.some(
          (plugin) =>
            (
              plugin as unknown as {
                readonly props: {
                  handleTextInput?: (...args: unknown[]) => boolean;
                };
              }
            ).props.handleTextInput?.(view, from, to, character, () =>
              state.tr.insertText(character),
            ) === true,
        );
        if (!handled) view.dispatch(view.state.tr.insertText(character));
      }
    },
  };
}

/** Mounts content in HTML with its editing keys. */
export function keyedTiptap(source: string, options: MountOptions = {}) {
  const mounted = mountTiptap({ ...options, content: html(source) });
  return { ...mounted, keys: mountedKeys(mounted) };
}

// Running actions on a mount

/** The options of an imperative request that leaves focus alone. */
export const QUIET = Object.freeze({ reason: 'imperative-action', focus: false } as const);

/** Executes actions as one imperative request; whether they applied. */
export const runActions = (instance: TextEditorEngineInstance, ...actions: TextEditorAction[]) =>
  instance.execute(actions, QUIET);

/** Sets a selection as an imperative request; whether it applied. */
export const selectIn = (instance: TextEditorEngineInstance, selection: TextEditorSelectionInput) =>
  runActions(instance, { type: 'selection.set', selection });

/** Undoes one step as the widget's hotkey does; whether it applied. */
export const undoOnce = (instance: TextEditorEngineInstance) =>
  instance.execute([{ type: 'history.undo' }], { reason: 'hotkey', focus: false });

/** The HTML of a mount. */
export const htmlOf = (instance: TextEditorEngineInstance): string => instance.getContent('html');

/** The HTML of a mount, identifiers that the mount created written as `NEW`. */
export const shapeOf = (instance: TextEditorEngineInstance): string =>
  htmlOf(instance).replace(/n\d{9}/gu, 'NEW');

/** A caret at a text offset of a block. */
export const caretAt = (block: string, offset: number): TextEditorSelectionInput => ({
  kind: 'text',
  anchor: { block, offset },
});

// Headless state

/** The adapter's schema and plugins over the real modules, in a bare editor state. */
export function headlessTiptap(
  draft: TextEditorPortableDraft = { blocks: [] },
  options: { readonly nodes?: readonly TextEditorNodeDefinition[] } = {},
) {
  const createId = sequentialIds('h', 9);
  const nodes = options.nodes ?? [];
  const document: TextEditorPortableDocument = withTrailingParagraph(
    canonicalize(draft, { nodes, createId }).document,
    createId,
  );
  const env: TiptapEnv = {
    modules: TIPTAP_MODULES,
    tables: realTables,
    createId,
    nodes,
    urls: TEST_URLS,
    capabilities: createTiptapEngine(TIPTAP_MODULES).capabilities,
  };
  const custom = customNodeExtensions(TIPTAP_MODULES, nodes, {});
  const extensions = createTiptapExtensions(TIPTAP_MODULES, {
    urls: TEST_URLS,
    labels: TEST_LABELS,
    plugins: [
      blockIdsPlugin(TIPTAP_MODULES, createId),
      listMergePlugin(TIPTAP_MODULES),
      caretMarksPlugin(TIPTAP_MODULES),
    ],
    custom: custom.extensions,
    customNames: custom.names,
    behaviors: behaviorExtensions(env),
  });
  const editor = new core.Editor({
    element: null,
    extensions: extensions as never,
    content: toTiptapJson(document) as never,
    enableInputRules: [TIPTAP_INPUT_RULES],
    enablePasteRules: false,
    enableCoreExtensions: { tabindex: false, textDirection: false, keymap: false },
  });
  const initial = state.EditorState.create({
    schema: editor.schema,
    doc: editor.state.doc,
    plugins: editor.extensionManager.plugins,
  }) as unknown as TiptapEditorStateLike;
  return {
    editor,
    state: initial,
    env,
    doc: initial.doc as TiptapNodeLike,
    /** A work over a state. */
    work: (on: TiptapEditorStateLike = initial) => new TiptapWork(env, on),
  };
}

/** A structural view over a headless state: it applies what it dispatches, as the engine's does. */
export class TestView implements TiptapDispatchViewLike {
  composing = false;
  editable = true;
  readonly dispatched: TiptapTransactionLike[] = [];
  constructor(public state: TiptapEditorStateLike) {}
  dispatch(tr: TiptapTransactionLike): void {
    this.dispatched.push(tr);
    this.state = this.state.apply(tr);
  }
}

/** A headless state with a structural view, the caret at a position. */
export function ruleView(
  draft: TextEditorPortableDraft,
  caret = 1,
  options: { readonly nodes?: readonly TextEditorNodeDefinition[] } = {},
) {
  const headless = headlessTiptap(draft, options);
  const view = new TestView(headless.state);
  const { TextSelection } = TIPTAP_MODULES.state;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, caret)));
  return { ...headless, view };
}

describe('Tiptap adapter stubs (uwg-te-par-engine-1)', () => {
  it('mounts over the real engine without a view and records the editor options', () => {
    const { context, log, instance, container } = mountTiptap({
      content: html('<p data-id="p1">calm sea</p>'),
    });
    expect(context.calls).toEqual(['ready']);
    expect(log.editorOptions).toHaveLength(1);
    expect(instance.getContent('html')).toBe('<p data-id="p1">calm sea</p>');
    expect(container.children).toHaveLength(1);
    expect(log.configure.map(([name]) => name)).toContain('starterKit');
  });

  it('builds the headless schema with the extension manager plugins', () => {
    const { state: headless } = headlessTiptap({
      blocks: [{ type: 'paragraph', id: 'p1', content: [{ type: 'text', text: 'tide' }] }],
    });
    expect(headless.doc.toJSON()).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { id: 'p1', align: null },
          content: [{ type: 'text', text: 'tide' }],
        },
      ],
    });
    expect(headless.plugins.length).toBeGreaterThan(5);
  });
});
