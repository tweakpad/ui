/**
 * Test helpers of the Lexical adapter (Widgets `uwg-te-par-engine-1`): the real modules, a
 * recording mount context, the instance over a rootless editor that the adapter builds
 * (`createLexicalInstance`, `headlessLexical`), structural stub modules that record the extension
 * list, the configurations, the command registrations and their priorities
 * (`stubLexicalModules`), and the engine's editor kept rootless under an instance that owns a
 * fake root (`rootedLexical`). The URL policy, identifiers, key events and the fake DOM are the
 * shared adapter test helpers. A `*.test.ts` module stays out of the build; the suite at the end
 * checks the helpers.
 */
import * as a11y from '@lexical/a11y';
import * as code from '@lexical/code';
import * as extension from '@lexical/extension';
import * as history from '@lexical/history';
import * as html from '@lexical/html';
import * as link from '@lexical/link';
import * as list from '@lexical/list';
import * as markdown from '@lexical/markdown';
import * as richText from '@lexical/rich-text';
import * as selection from '@lexical/selection';
import * as table from '@lexical/table';
import * as lexical from 'lexical';
import { describe, expect, it } from 'vitest';
import { htmlSource } from '../../content/html-source.test.js';
import type {
  TextEditorContentChange,
  TextEditorContentInput,
  TextEditorDiagnosticCode,
  TextEditorEngine,
  TextEditorEngineContext,
} from '../../engine.js';
import type { TextEditorNodeDefinition } from '../../nodes.js';
import {
  fakeContainer,
  sequentialIds,
  TEST_URLS,
  type FakeDocument,
  type FakeElement,
} from '../shared/test-helpers.test.js';
import { createLexicalEngine, type TextEditorLexicalOptions } from './index.js';
import { lexicalRuntime, openLexicalInstance, type LexicalInstance } from './instance.js';
import type {
  LexicalBuiltEditorLike,
  LexicalEditorLike,
  LexicalExtensionArgumentLike,
  LexicalExtensionInitLike,
  LexicalExtensionLike,
  LexicalTransformerLike,
  TextEditorLexicalModules,
} from './modules.js';
import type { LexicalRuntime } from './runtime.js';

// Real modules

/** The real Lexical 0.52 modules, checked against the structural types. */
export const realLexicalModules = {
  lexical,
  extension,
  richText,
  history,
  selection,
  list,
  link,
  markdown,
  code,
  a11y,
  html,
  table,
} satisfies TextEditorLexicalModules;

/** The real modules without tables. */
export const reducedLexicalModules: TextEditorLexicalModules = {
  lexical,
  extension,
  richText,
  history,
  selection,
  list,
  link,
  markdown,
  code,
  a11y,
  html,
};

// Recording context

export type ContextRecord =
  | { readonly type: 'ready' }
  | { readonly type: 'state' }
  | { readonly type: 'content'; readonly change: TextEditorContentChange }
  | { readonly type: 'error'; readonly error: unknown }
  | {
      readonly type: 'diagnostic';
      readonly code: TextEditorDiagnosticCode;
      readonly message: string;
    }
  | { readonly type: 'adopt'; readonly css: string }
  | { readonly type: 'release'; readonly css: string };

export interface RecordingContextInit {
  readonly initialContent?: TextEditorContentInput | null | undefined;
  readonly editable?: boolean | undefined;
  readonly nodes?: readonly TextEditorNodeDefinition[] | undefined;
  readonly createId?: (() => string) | undefined;
}

/** A mount context that records every notification. */
export function recordingContext(init: RecordingContextInit = {}) {
  const records: ContextRecord[] = [];
  const controller = new AbortController();
  const context: TextEditorEngineContext = {
    initialContent: init.initialContent ?? null,
    editable: init.editable ?? true,
    nodes: init.nodes ?? [],
    urls: TEST_URLS,
    createId: init.createId ?? sequentialIds('gen', 4),
    adoptStyles: (css) => {
      records.push({ type: 'adopt', css });
      return () => records.push({ type: 'release', css });
    },
    signal: controller.signal,
    labels: { taskCheckbox: 'Done' },
    ready: () => records.push({ type: 'ready' }),
    state: () => records.push({ type: 'state' }),
    content: (change) => records.push({ type: 'content', change }),
    error: (error) => records.push({ type: 'error', error }),
    diagnostic: (code, message) => records.push({ type: 'diagnostic', code, message }),
  };
  return {
    context,
    controller,
    records,
    /** The records of a type, in order. */
    of: <T extends ContextRecord['type']>(type: T) =>
      records.filter(
        (record): record is Extract<ContextRecord, { type: T }> => record.type === type,
      ),
    /** Forgets the records so far. */
    clear: () => void records.splice(0),
  };
}

// A rootless editor built by the adapter

/** Where a test instance renders: a container, or none for a rootless editor. */
export interface LexicalInstanceTarget {
  readonly container: HTMLElement | null;
  /** Parses HTML in place of the window's `DOMParser`. */
  readonly parseHtml?: ((source: string) => ReturnType<typeof htmlSource>) | undefined;
}

/**
 * An instance of the adapter over its real editor, as a mount opens it: rootless without a
 * container, HTML read through `parseHtml` (Node has no `DOMParser`).
 */
export function createLexicalInstance(
  engine: TextEditorEngine,
  modules: TextEditorLexicalModules,
  options: TextEditorLexicalOptions,
  context: TextEditorEngineContext,
  target: LexicalInstanceTarget,
): LexicalInstance {
  const rt = lexicalRuntime(engine, modules, options, context, { parseHtml: target.parseHtml });
  return openLexicalInstance(engine, rt, options, context, target.container);
}

export interface HeadlessOptions extends RecordingContextInit {
  readonly modules?: TextEditorLexicalModules | undefined;
  readonly options?: TextEditorLexicalOptions | undefined;
  /** HTML content, as the shared importer reads it. */
  readonly html?: string | undefined;
}

export interface Headless {
  readonly instance: LexicalInstance;
  readonly rt: LexicalRuntime;
  readonly editor: LexicalEditorLike;
  readonly modules: TextEditorLexicalModules;
  readonly recording: ReturnType<typeof recordingContext>;
}

/** The recording context of a headless editor: its content from `html` unless given. */
const headlessContext = (options: HeadlessOptions) =>
  recordingContext({
    ...options,
    initialContent:
      options.initialContent ??
      (options.html !== undefined ? { content: options.html, format: 'html' } : null),
  });

/** The adapter's editor without a root, through the adapter's instance. */
export function headlessLexical(options: HeadlessOptions = {}): Headless {
  const modules = options.modules ?? realLexicalModules;
  const recording = headlessContext(options);
  const adapterOptions = options.options ?? {};
  const engine = createLexicalEngine(modules, adapterOptions);
  const rt = lexicalRuntime(engine, modules, adapterOptions, recording.context, {
    parseHtml: htmlSource,
  });
  const instance = openLexicalInstance(engine, rt, adapterOptions, recording.context, null);
  return { instance, rt, editor: rt.engine, modules, recording };
}

/** A mount whose instance owns a root in a fake document while the engine's editor stays rootless. */
export interface Rooted {
  readonly instance: LexicalInstance;
  readonly recording: ReturnType<typeof recordingContext>;
  readonly root: FakeElement;
  readonly document: FakeDocument;
}

/**
 * A mount through the factory into a connected fake container, whose instance owns the editing
 * root and tracks its focus in the fake document, while the real editor ignores the root (Node has
 * no DOM to render into): the focus paths of an instance with a root.
 */
export function rootedLexical(options: HeadlessOptions = {}): Rooted {
  const base = options.modules ?? realLexicalModules;
  const modules: TextEditorLexicalModules = {
    ...base,
    lexical: {
      ...base.lexical,
      // The live region has no owner in the fake document, as in a rootless editor.
      configExtension: (extension, config) =>
        base.lexical.configExtension(
          extension,
          extension === base.a11y.AriaLiveRegionExtension ? { ...config, owner: null } : config,
        ),
    },
    extension: {
      ...base.extension,
      buildEditorFromExtensions: (...extensions) => {
        const built = base.extension.buildEditorFromExtensions(...extensions);
        // The editor keeps no root: Node has no DOM to render into.
        built.setRootElement = () => undefined;
        return built;
      },
    },
  };
  const recording = headlessContext(options);
  const container = fakeContainer();
  const engine = createLexicalEngine(modules, options.options ?? {});
  const instance = engine.mount(container as unknown as HTMLElement, recording.context);
  return {
    instance: instance as LexicalInstance,
    recording,
    root: container.children[0]!,
    document: container.ownerDocument,
  };
}

// Keys and selections for headless editors

/** Sets a text selection (a caret when `head` is left out) through the instance. */
export function selectText(
  headless: Headless,
  anchor: {
    block: string;
    offset: number;
    cell?: { row: number; column: number; paragraph: number };
  },
  head = anchor,
): void {
  const applied = headless.instance.execute(
    [{ type: 'selection.set', selection: { kind: 'text', anchor, head } }],
    { reason: 'imperative-action' },
  );
  if (!applied) throw new Error('The selection did not apply.');
}

/** Types text one character per update at the selection, as typing does. */
export function typeText(headless: Headless, text: string): void {
  for (const character of text) {
    headless.editor.update(
      () => {
        const selection = lexical.$getSelection();
        if (lexical.$isRangeSelection(selection)) selection.insertText(character);
      },
      { discrete: true },
    );
    // Flush what the update listeners scheduled, such as an input rule.
    headless.editor.read(() => undefined);
  }
}

/** The canonical HTML of the instance. */
export const htmlOf = (headless: Headless): string =>
  headless.instance.getContent('html') as string;

// Stub modules

export interface CommandRecord {
  readonly command: unknown;
  readonly name: string;
  readonly priority: number;
  readonly listener: (payload: unknown) => boolean;
}

export interface StubRecord {
  /** The adapter's extensions as `defineExtension` received them. */
  readonly extensions: LexicalExtensionInitLike[];
  /** Each `configExtension` call with the extension's name and configuration. */
  readonly configs: { readonly name: string; readonly config: Readonly<Record<string, unknown>> }[];
  readonly commands: CommandRecord[];
  readonly transforms: unknown[];
  readonly mutationListeners: unknown[];
  /** The transformers each `registerMarkdownShortcuts` call received. */
  readonly markdown: (readonly LexicalTransformerLike[])[];
  readonly updateListeners: ((payload: unknown) => void)[];
  readonly editableListeners: ((editable: boolean) => void)[];
  /** Each `setRootElement` argument. */
  readonly roots: (unknown | null)[];
  disposed: number;
}

/** A command's name as the real module exports it. */
function commandName(command: unknown): string {
  for (const [name, value] of Object.entries(lexical)) if (value === command) return name;
  return String((command as { type?: string } | null)?.type ?? 'unknown');
}

/**
 * The real modules with a recording builder: `buildEditorFromExtensions` builds no editor but a
 * structural one that records the registrations of the adapter's extension, which it registers;
 * `defineExtension` and `configExtension` record their input. `version` is the engine version the
 * editor reports.
 */
export function stubLexicalModules(
  options: { readonly version?: string | undefined; readonly base?: TextEditorLexicalModules } = {},
) {
  const base = options.base ?? realLexicalModules;
  const record: StubRecord = {
    extensions: [],
    configs: [],
    commands: [],
    transforms: [],
    mutationListeners: [],
    markdown: [],
    updateListeners: [],
    editableListeners: [],
    roots: [],
    disposed: 0,
  };
  let editable = true;
  class StubEditor {
    static version: string | undefined = options.version ?? '0.52.0';
    registerCommand(command: unknown, listener: (payload: unknown) => boolean, priority: number) {
      record.commands.push({ command, name: commandName(command), priority, listener });
      return () => undefined;
    }
    registerNodeTransform(klass: unknown) {
      record.transforms.push(klass);
      return () => undefined;
    }
    registerMutationListener(klass: unknown) {
      record.mutationListeners.push(klass);
      return () => undefined;
    }
    registerUpdateListener(listener: (payload: unknown) => void) {
      record.updateListeners.push(listener);
      return () => undefined;
    }
    registerEditableListener(listener: (value: boolean) => void) {
      record.editableListeners.push(listener);
      return () => undefined;
    }
    setRootElement(root: unknown) {
      record.roots.push(root);
      // The engine's inline style on a root it is given.
      const style = (root as Partial<Pick<FakeElement, 'style'>> | null)?.style;
      style?.setProperty('user-select', 'text');
      style?.setProperty('white-space', 'pre-wrap');
      style?.setProperty('word-break', 'break-word');
    }
    isEditable() {
      return editable;
    }
    setEditable(value: boolean) {
      editable = value;
      for (const listener of record.editableListeners) listener(value);
    }
    isComposing() {
      return false;
    }
    dispose() {
      record.disposed += 1;
    }
    /** Updates run no engine: a stub has no editor state. */
    update() {
      return undefined;
    }
    getRootElement() {
      return record.roots.at(-1) ?? null;
    }
    getElementByKey() {
      return null;
    }
  }
  const modules: TextEditorLexicalModules = {
    ...base,
    lexical: {
      ...base.lexical,
      defineExtension: (init: LexicalExtensionInitLike) => {
        record.extensions.push(init);
        return init;
      },
      configExtension: (
        extension: LexicalExtensionLike,
        config: Readonly<Record<string, unknown>>,
      ): LexicalExtensionArgumentLike => {
        record.configs.push({ name: extension.name, config });
        return [extension, config];
      },
    },
    markdown: {
      registerMarkdownShortcuts: (_editor, transformers) => {
        record.markdown.push(transformers);
        return () => undefined;
      },
    },
    extension: {
      ...base.extension,
      // The adapter's extension, as the stub `defineExtension` recorded it, registers on a stub.
      buildEditorFromExtensions: () => {
        const init = record.extensions.at(-1);
        const editor = new StubEditor() as unknown as LexicalBuiltEditorLike;
        editable = init?.editable ?? true;
        init?.register?.(editor, undefined, undefined);
        return editor;
      },
    },
  };
  return { modules, record };
}

describe('uwg-te-par-engine-1: the test helpers of the Lexical adapter', () => {
  it('builds a rootless editor through the adapter and reports ready', () => {
    const { instance, recording } = headlessLexical({ html: '<p data-id="p1">calm</p>' });
    expect(recording.of('ready')).toHaveLength(1);
    expect(instance.getContent('html')).toBe('<p data-id="p1">calm</p>');
  });

  it('records the extension, the configurations and the registrations of a stub mount', () => {
    const { modules, record } = stubLexicalModules();
    const engine = createLexicalEngine(modules);
    const recording = recordingContext();
    const container = fakeContainer();
    engine.mount(container as unknown as HTMLElement, recording.context);
    expect(record.extensions).toHaveLength(1);
    expect(record.configs.map(({ name }) => name)).toContain('@lexical/history/History');
    expect(record.commands.length).toBeGreaterThan(0);
    expect(record.roots).toHaveLength(1);
    expect(container.children).toHaveLength(1);
  });
});
