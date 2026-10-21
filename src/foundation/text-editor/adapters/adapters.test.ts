/**
 * Both engine adapters through the real `TextEditorController` on the fakes' recording host (node
 * environment; Widgets `uwg-te-tab-engine` r1 and r3, `uwg-te-req-engine-6`, and the mount
 * failure of `uwg-te-req-engine-1`).
 *
 * The Tiptap adapter mounts over the real modules with a recording editor and a structural view
 * (`stubTiptapModules`) into the shared fake container; the Lexical adapter mounts its real editor
 * without a root (`createLexicalInstance` of its test stubs), as the Node environment has no DOM.
 * Each engine is wrapped by a recorder that counts the notifications of every mount and the reads
 * of every snapshot, and changes the engine originates are made through each engine's own API (a
 * transaction, an update) the way a keystroke would make them.
 */
import { htmlSource } from '../content/html-source.test.js';
import type * as tiptapState from '@tiptap/pm/state';
import * as lexical from 'lexical';
import { describe, expect, it } from 'vitest';
import type { TextEditorController, TextEditorValueChange } from '../controller.js';
import type {
  TextEditorContentChange,
  TextEditorEngine,
  TextEditorEngineContext,
  TextEditorEngineInstance,
  TextEditorFormat,
  TextEditorPortableFormat,
  TextEditorSnapshot,
} from '../engine.js';
import type { TextEditorAction } from '../actions.js';
import { BASE_CAPABILITIES } from '../capabilities.js';
import type { TextEditorNodeDefinition } from '../nodes.js';
import { createHost, fakeTools, flush, type FakeContainer } from '../text-editor-fakes.test.js';
import { corpusNodes } from '../content/corpus.test.js';
import { createLexicalEngine } from './lexical/index.js';
import {
  createLexicalInstance,
  headlessLexical,
  realLexicalModules,
  rootedLexical,
} from './lexical/lexical-stubs.test.js';
import type { TextEditorLexicalModules } from './lexical/modules.js';
import { createTiptapEngine } from './tiptap/index.js';
import type { TextEditorTiptapModules } from './tiptap/modules.js';
import { fakeContainer } from './shared/test-helpers.test.js';
import {
  html as htmlInput,
  mountTiptap,
  stubTiptapModules,
  TIPTAP_MODULES,
  type StubEditor,
} from './tiptap/tiptap-stubs.test.js';

const HTML = '<p data-id="p1">calm</p>\n<p data-id="p2">sea</p>';

// Recording engines

/** A snapshot that counts its serializations and hands them to the adapter's snapshot. */
class CountingSnapshot implements TextEditorSnapshot {
  readonly revision: number;
  readonly empty: boolean;
  readonly #snapshot: TextEditorSnapshot;
  readonly #log: EngineLog;

  constructor(snapshot: TextEditorSnapshot, log: EngineLog) {
    this.#snapshot = snapshot;
    this.#log = log;
    this.revision = snapshot.revision;
    this.empty = snapshot.empty;
  }

  getContent(format: TextEditorPortableFormat): string;
  getContent(format: 'json'): unknown;
  getContent(format: TextEditorFormat): unknown;
  getContent(format: TextEditorFormat): unknown {
    this.#log.serializations.push(format);
    return this.#snapshot.getContent(format);
  }
}

/** What the recorder of an engine saw, per mount. */
interface EngineLog {
  /** The contexts the controller passed, as it passed them. */
  readonly contexts: TextEditorEngineContext[];
  readonly instances: TextEditorEngineInstance[];
  /** Every notification of every mount, in order: `<mount>:<name>`. */
  readonly notifications: string[];
  readonly changes: TextEditorContentChange[];
  /** The formats each snapshot serialized, in order. */
  readonly serializations: TextEditorFormat[];
}

/**
 * Wraps an engine so that each mount's notifications are counted and its snapshots count their
 * reads; `mount` is the adapter's mount, the engine the factory's result.
 */
function recordEngine(
  engine: TextEditorEngine,
  mount: TextEditorEngine['mount'] = engine.mount,
): { readonly engine: TextEditorEngine; readonly log: EngineLog } {
  const log: EngineLog = {
    contexts: [],
    instances: [],
    notifications: [],
    changes: [],
    serializations: [],
  };
  const counted = (instance: TextEditorEngineInstance) => {
    const snapshot = instance.snapshot.bind(instance);
    // An own member: the adapters' instances keep private fields, so a proxy would not do.
    Object.defineProperty(instance, 'snapshot', {
      value: () => new CountingSnapshot(snapshot(), log),
    });
    log.instances.push(instance);
    return instance;
  };
  const recorded: TextEditorEngine = Object.freeze({
    ...engine,
    mount: (container: HTMLElement, context: TextEditorEngineContext) => {
      const index = log.contexts.push(context) - 1;
      const note = (name: string) => log.notifications.push(`${index}:${name}`);
      const counting: TextEditorEngineContext = {
        ...context,
        ready: () => {
          note('ready');
          context.ready();
        },
        state: () => {
          note('state');
          context.state();
        },
        content: (change) => {
          note('content');
          log.changes.push(change);
          context.content(change);
        },
      };
      const result = mount(container, counting);
      return result instanceof Promise ? result.then(counted) : counted(result);
    },
  });
  return { engine: recorded, log };
}

interface Adapter {
  readonly name: string;
  /** A recorded engine of the adapter and the container it mounts into. */
  create(): {
    readonly engine: TextEditorEngine;
    readonly log: EngineLog;
    readonly container: object | null;
  };
  /** An engine over broken modules, whose mount the adapter rejects naming the module. */
  broken(): { readonly engine: TextEditorEngine; readonly module: RegExp };
  /** Types text at the selection through the engine, as a keystroke does. */
  type(native: unknown, text: string): void;
  /** Moves the selection to the document's end through the engine, changing nothing else. */
  selectEnd(native: unknown): void;
}

const tiptap: Adapter = {
  name: 'Tiptap',
  create() {
    const { modules } = stubTiptapModules();
    return { ...recordEngine(createTiptapEngine(modules)), container: fakeContainer() };
  },
  broken() {
    const { history, ...modules } = TIPTAP_MODULES;
    void history;
    return {
      engine: createTiptapEngine(modules as unknown as TextEditorTiptapModules),
      module: /@tiptap\/pm\/history/u,
    };
  },
  type(native, text) {
    const { view } = native as StubEditor;
    const state = view.state as unknown as tiptapState.EditorState;
    view.dispatch(state.tr.insertText(text) as never);
  },
  selectEnd(native) {
    const { view } = native as StubEditor;
    const state = view.state as unknown as tiptapState.EditorState;
    const { Selection } = TIPTAP_MODULES.state;
    view.dispatch(state.tr.setSelection(Selection.atEnd(state.doc as never) as never) as never);
  },
};

/** A Lexical editor: the update and read members these tests use. */
interface LexicalEditor {
  update(update: () => void, options: { readonly discrete: boolean }): void;
}

const lexicalAdapter: Adapter = {
  name: 'Lexical',
  create() {
    const modules = realLexicalModules;
    const engine = createLexicalEngine(modules);
    // The adapter's own instance over its real editor, without a root.
    const mount: TextEditorEngine['mount'] = (_container, context) =>
      createLexicalInstance(engine, modules, {}, context, {
        container: null,
        parseHtml: (source) => htmlSource(source),
      });
    return { ...recordEngine(engine, mount), container: null };
  },
  broken() {
    const { html, ...modules } = realLexicalModules;
    void html;
    return {
      engine: createLexicalEngine(modules as unknown as TextEditorLexicalModules),
      module: /@lexical\/html/u,
    };
  },
  type(native, text) {
    (native as LexicalEditor).update(
      () => {
        const selection = lexical.$getSelection();
        if (lexical.$isRangeSelection(selection)) selection.insertText(text);
      },
      { discrete: true },
    );
  },
  selectEnd(native) {
    (native as LexicalEditor).update(() => void lexical.$getRoot().selectEnd(), {
      discrete: true,
    });
  },
};

/** Puts the caret in a block through a request that keeps the focus where it is. */
const caretAt = (controller: TextEditorController, block: string, offset: number) =>
  controller.request({
    target: {
      type: 'selection.set',
      selection: { kind: 'text', anchor: { block, offset }, head: { block, offset } },
    },
    surface: 'api',
    reason: 'imperative-action',
    focus: false,
  });

/** A connected controller on the recording host with an adapter's engine, ready and published. */
async function readyAdapter(
  adapter: Adapter,
  options: { readonly nodes?: readonly TextEditorNodeDefinition[] } = {},
) {
  const setup = createHost();
  const { engine, log, container } = adapter.create();
  // The Lexical instance renders nowhere, so the fakes' container stays the controller's.
  if (container) setup.host.container = container as FakeContainer;
  const { controller } = setup;
  if (options.nodes) controller.setNodes(options.nodes);
  controller.setDefaultContent({ content: HTML, format: 'html' });
  controller.setTools(fakeTools(engine, undefined, options.nodes));
  controller.connect();
  controller.setEngine(engine);
  await flush();
  setup.frames.tick();
  return { ...setup, engine, log };
}

describe.each([tiptap, lexicalAdapter])(
  '$name adapter through the controller (uwg-te-tab-engine r3, uwg-te-req-engine-6)',
  (adapter) => {
    it('V-032: ready is honored once per mount, also around a remount', async () => {
      const { controller, frames, log, of } = await readyAdapter(adapter);
      expect(controller.status).toBe('ready');
      expect(of('ready')).toEqual([log.instances[0]!.native]);
      expect(log.notifications.filter((entry) => entry.endsWith('ready'))).toEqual(['0:ready']);
      // A repeated ready of the same mount is ignored.
      log.contexts[0]!.ready();
      await flush();
      expect(of('ready')).toHaveLength(1);
      // New node definitions remount with the document carried over and no value change.
      controller.setNodes(corpusNodes);
      await flush();
      frames.tick();
      expect(controller.status).toBe('ready');
      expect(log.instances).toHaveLength(2);
      expect(of('ready')).toEqual([log.instances[0]!.native, log.instances[1]!.native]);
      expect(log.contexts[0]!.signal.aborted).toBe(true);
      expect(log.contexts[1]!.signal.aborted).toBe(false);
      expect(controller.getContent('html')).toBe(HTML);
      expect(of('value-change')).toEqual([]);
    });

    it('V-032: each engine update notifies once, and a content notification refreshes the published state', async () => {
      const { controller, frames, log, of } = await readyAdapter(adapter);
      const [instance] = log.instances;
      await caretAt(controller, 'p1', 0);
      frames.tick();
      // The selection, applied directly, is one state notification and no value change.
      expect(log.notifications.slice(1)).toEqual(['0:state']);
      expect(controller.state.selection).toMatchObject({
        kind: 'text',
        anchor: { block: 'p1', offset: 0 },
      });
      const before = controller.state.contentVersion;
      adapter.type(instance!.native, 'Very ');
      expect(log.notifications.slice(2)).toEqual(['0:content']);
      expect(log.changes).toEqual([{ cause: 'input', reason: 'input' }]);
      frames.tick();
      expect(controller.state.contentVersion).toBe(before + 1);
      expect(controller.state.contentVersion).toBe(instance!.getState().contentVersion);
      expect(controller.state.selection).toMatchObject({
        kind: 'text',
        head: { block: 'p1', offset: 5 },
      });
      const changes = of<TextEditorValueChange>('value-change');
      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({ origin: 'engine', reason: 'input', tool: null });
      expect(changes[0]!.actions).toEqual([]);
      // A selection the engine moves is one state notification; the content stays.
      adapter.selectEnd(instance!.native);
      frames.tick();
      expect(log.notifications.slice(3)).toEqual(['0:state']);
      expect(controller.state.contentVersion).toBe(before + 1);
      expect(of('value-change')).toHaveLength(1);
      // A request's change is one content notification attributed to its action.
      await expect(
        controller.request({
          target: [{ type: 'text.insert', text: '!' }],
          surface: 'api',
          reason: 'imperative-action',
          focus: false,
        }),
      ).resolves.toBe('applied');
      expect(log.notifications.slice(4)).toEqual(['0:content']);
      expect(log.changes[1]).toMatchObject({ cause: 'action', action: 'text.insert' });
      frames.tick();
      expect(controller.getContent('text')).toBe('Very calm\n\nsea!');
      expect(of<TextEditorValueChange>('value-change').map(({ origin }) => origin)).toEqual([
        'engine',
        'request',
      ]);
      expect(of('value-commit')).toHaveLength(1);
    });

    it('V-032: notifications after the mount signal aborted are ignored', async () => {
      const { controller, frames, log, of } = await readyAdapter(adapter);
      const stale = log.contexts[0]!;
      controller.setNodes(corpusNodes);
      await flush();
      frames.tick();
      expect(stale.signal.aborted).toBe(true);
      const state = controller.state;
      const ready = of('ready').length;
      stale.ready();
      stale.state();
      stale.content({ cause: 'input', reason: 'input' });
      stale.diagnostic('text-editor-engine-warning', 'Late.');
      stale.error(new Error('Late.'));
      frames.tick();
      expect(of('ready')).toHaveLength(ready);
      expect([of('diagnostic'), of('error'), of('value-change')]).toEqual([[], [], []]);
      expect(controller.state).toBe(state);
      expect(controller.status).toBe('ready');
      expect(controller.native).toBe(log.instances[1]!.native);
    });

    it('V-032: publication serializes nothing; a snapshot serializes on getContent and an older one keeps its revision', async () => {
      const { controller, frames, log } = await readyAdapter(adapter);
      const first = controller.value!;
      await caretAt(controller, 'p1', 0);
      adapter.type(log.instances[0]!.native, 'Very ');
      frames.tick();
      const second = controller.value!;
      expect(second).not.toBe(first);
      expect(log.serializations).toEqual([]);
      expect(second.revision).toBe(first.revision + 1);
      expect(second.getContent('text')).toBe('Very calm\n\nsea');
      expect(first.getContent('text')).toBe('calm\n\nsea');
      expect(first.getContent('html')).toBe(HTML);
      expect(log.serializations).toEqual(['text', 'text', 'html']);
      // A handle serializes each format of its revision once.
      expect(first.getContent('text')).toBe('calm\n\nsea');
      expect(log.serializations).toHaveLength(3);
      expect([first.empty, second.empty]).toEqual([false, false]);
    });
  },
);

describe.each([tiptap, lexicalAdapter])(
  '$name adapter module problems through the controller (uwg-te-req-engine-1)',
  (adapter) => {
    it("V-012: a module problem rejects the mount: status error and the host's failure, naming the module", async () => {
      const { engine, module } = adapter.broken();
      const setup = createHost();
      const { controller, of } = setup;
      controller.setDefaultContent({ content: HTML, format: 'html' });
      controller.setTools(fakeTools(engine));
      controller.connect();
      // Content set before the mount waits for it, and rejects with the mount's error.
      const queued = controller
        .request({
          target: {
            type: 'content.set',
            content: '<p>later</p>',
            format: 'html',
            history: 'reset',
          },
          surface: 'api',
          reason: 'imperative-action',
        })
        .then(
          () => null,
          (error: unknown) => error,
        );
      expect(() => controller.setEngine(engine)).not.toThrow();
      await flush();
      setup.frames.tick();
      expect(controller.status).toBe('error');
      expect(of('ready')).toEqual([]);
      const errors = of<Error>('error');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(Error);
      expect(errors[0]!.message).toMatch(module);
      await expect(queued).resolves.toBe(errors[0]);
      expect(controller.value).toBeNull();
      expect(controller.native).toBeNull();
    });
  },
);

describe('both engine factories (uwg-te-par-engine-1, uwg-te-req-engine-2)', () => {
  it('build engines without an engine package and read no module a mount needs, as the package check runs them', async () => {
    const url = new URL('../../../../scripts/pack-smoke-engine-factories.mjs', import.meta.url);
    const check = (await import(/* @vite-ignore */ url.href)) as {
      engineFactoryProblems(
        name: string,
        factory: (modules: never) => TextEditorEngine,
        base: readonly string[],
      ): { readonly problems: readonly string[] };
    };
    const base = [...BASE_CAPABILITIES];
    expect(
      check.engineFactoryProblems('createTiptapEngine', createTiptapEngine, base),
    ).toMatchObject({
      problems: [],
    });
    expect(
      check.engineFactoryProblems('createLexicalEngine', createLexicalEngine, base),
    ).toMatchObject({ problems: [] });
    // Only the platform flag of the Lexical factory is admitted.
    const reading =
      (read: (modules: Readonly<Record<string, Readonly<Record<string, unknown>>>>) => unknown) =>
      (modules: never) => {
        read(modules);
        return createLexicalEngine({} as TextEditorLexicalModules);
      };
    expect(
      check.engineFactoryProblems(
        'createLexicalEngine',
        reading((modules) => [
          modules['lexical']?.['IS_APPLE'],
          modules['lexical']?.['ElementNode'],
        ]),
        base,
      ).problems,
    ).toEqual(['read lexical.ElementNode']);
    expect(
      check.engineFactoryProblems(
        'createTiptapEngine',
        reading((modules) => [modules['lexical']?.['IS_APPLE'], modules['core']]),
        base,
      ).problems,
    ).toEqual(['read lexical lexical.IS_APPLE core']);
  });

  const factories = [
    [
      'tiptap',
      (nodes: Readonly<Record<string, never>>) => createTiptapEngine(TIPTAP_MODULES, { nodes }),
    ],
    [
      'lexical',
      (nodes: Readonly<Record<string, never>>) =>
        createLexicalEngine(realLexicalModules, { nodes }),
    ],
  ] as const;

  it('answer supportsNode by one rule: a valid name, and a generated kind or an override', () => {
    const definitions: unknown[] = [
      { kind: 'block', name: 'callout', content: 'inline' },
      { kind: 'block', name: 'embed', content: 'none' },
      { kind: 'inline', name: 'mention' },
      { kind: 'block', name: 'panel', content: 'blocks' },
      { kind: 'block', name: 'Bad Name', content: 'inline' },
      { kind: 'block', content: 'inline' },
      { kind: 'inline', name: 7 },
      null,
    ];
    const overrides = { panel: {}, 'Bad Name': {}, undefined: {} } as unknown as Readonly<
      Record<string, never>
    >;
    const answers = factories.map(([, create]) =>
      [create({}), create(overrides)].map((engine) =>
        definitions.map((definition) =>
          engine.supportsNode(definition as TextEditorNodeDefinition),
        ),
      ),
    );
    expect(answers[1]).toEqual(answers[0]);
    expect(answers[0]).toEqual([
      [true, true, true, false, false, false, false, false],
      [true, true, true, true, false, false, false, false],
    ]);
  });
});

describe('both engines before a selection is placed (uwg-te-req-blocks-1, uwg-te-req-engine-4)', () => {
  const QUIET = { reason: 'imperative-action', focus: false } as const;
  const mounts = [
    ['tiptap', (source: string) => mountTiptap({ content: htmlInput(source) }).instance],
    ['lexical', (source: string) => headlessLexical({ html: source }).instance],
  ] as const;
  /** The document's HTML lines, fresh identifiers of either engine as `NEW`. */
  const lines = (instance: TextEditorEngineInstance) =>
    (instance.getContent('html') as string).replace(/"(?:n\d{9}|gen\d{4})"/gu, '"NEW"').split('\n');

  it('actions that name their targets or keep the selection place none; an insertion then goes to the end', () => {
    const source =
      '<p data-id="p1">first</p><ul><li data-id="l1"><p>one</p><ul><li data-id="l3"><p>three</p></li></ul></li></ul>' +
      '<p data-id="p2">second</p><table data-id="t1"><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr></tbody></table>' +
      '<p data-id="p3">third</p>';
    const actions: readonly TextEditorAction[] = [
      { type: 'block.outdent', ids: ['l3'] },
      { type: 'block.set-type', kind: 'heading', attrs: { level: 2 }, ids: ['p2'] },
      { type: 'block.align', align: 'center', ids: ['p2'] },
      { type: 'blocks.insert', kind: 'paragraph', at: { after: 'p1' }, select: 'none' },
      { type: 'blocks.move', ids: ['p3'], to: { parent: null, index: 0 } },
      { type: 'table.insert-row', table: 't1', index: 1 },
      { type: 'table.background', table: 't1', target: { row: 0 }, color: 'red' },
    ];
    for (const action of actions)
      for (const [name, mount] of mounts) {
        const instance = mount(source);
        expect(instance.execute([action], QUIET), `${name} ${action.type}`).toBe(true);
        expect(instance.getState().selection, `${name} ${action.type}`).toEqual({ kind: 'none' });
        expect(instance.execute([{ type: 'blocks.insert', kind: 'divider' }], QUIET)).toBe(true);
        expect(lines(instance).at(-1), `${name} ${action.type}`).toBe('<hr data-id="NEW">');
      }
  });

  it('the focus an applied request gives the root keeps the selection the actions left: none', () => {
    const source =
      '<p data-id="p1">first</p><ul><li data-id="l1"><p>one</p><ul><li data-id="l3"><p>three</p></li></ul></li></ul>';
    const focused = [
      ['tiptap', () => mountTiptap({ content: htmlInput(source) }).instance],
      ['lexical', () => rootedLexical({ html: source }).instance],
    ] as const;
    for (const [name, mount] of focused) {
      const instance = mount();
      const action: TextEditorAction = { type: 'block.outdent', ids: ['l3'] };
      expect(instance.execute([action], { reason: 'imperative-action' }), name).toBe(true);
      expect(instance.getState(), name).toMatchObject({
        focused: true,
        selection: { kind: 'none' },
      });
      // A later change while focused places none either.
      expect(
        instance.execute([{ type: 'block.align', align: 'center', ids: ['p1'] }], QUIET),
        name,
      ).toBe(true);
      expect(instance.getState().selection, name).toEqual({ kind: 'none' });
    }
  });

  it('selection.set with none clears a block selection, keeps focus and adds no undo step', () => {
    const source = '<p data-id="p1">first</p><hr data-id="d1"><p data-id="p2">second</p>';
    const tiptapMount = mountTiptap({ content: htmlInput(source) });
    const focused = [
      ['tiptap', tiptapMount.instance],
      ['lexical', rootedLexical({ html: source }).instance],
    ] as const;
    const none: TextEditorAction = { type: 'selection.set', selection: { kind: 'none' } };
    for (const [name, instance] of focused) {
      const blocks: TextEditorAction = {
        type: 'selection.set',
        selection: { kind: 'blocks', ids: ['p1', 'd1'] },
      };
      expect(instance.execute([blocks], { reason: 'programmatic' }), name).toBe(true);
      expect(instance.getState().selection, name).toEqual({ kind: 'blocks', ids: ['p1', 'd1'] });
      expect(instance.can(none), name).toBe(true);
      expect(instance.execute([none], { reason: 'programmatic' }), name).toBe(true);
      expect(instance.getState(), name).toMatchObject({
        focused: true,
        selection: { kind: 'none' },
        history: { undo: false },
      });
      expect(instance.caretRect(), name).toBeNull();
      expect(instance.getContent('html'), name).toBe(
        '<p data-id="p1">first</p>\n<hr data-id="d1">\n<p data-id="p2">second</p>',
      );
    }
    // The next key that edits places the engine's resting caret first, where it then acts; Escape
    // and a lone modifier leave the selection cleared.
    const keydown = (
      tiptapMount.view.props as {
        handleDOMEvents: { keydown(view: unknown, event: KeyboardEvent): boolean };
      }
    ).handleDOMEvents.keydown;
    const press = (key: string) =>
      keydown(tiptapMount.view, { key, isComposing: false } as KeyboardEvent);
    press('Escape');
    press('Shift');
    expect(tiptapMount.instance.getState().selection).toEqual({ kind: 'none' });
    press('x');
    expect(tiptapMount.instance.getState().selection).toMatchObject({
      kind: 'text',
      anchor: { block: 'p1', offset: 0 },
      empty: true,
    });
  });

  it('an insertion at the end replaces a final empty paragraph, as a caret there does', () => {
    const cases: readonly (readonly [string, readonly string[]])[] = [
      [
        '<p data-id="p1">a</p><p data-id="p2"></p>',
        ['<p data-id="p1">a</p>', '<hr data-id="NEW">'],
      ],
      [
        '<p data-id="p1">a</p><hr data-id="d1">',
        ['<p data-id="p1">a</p>', '<hr data-id="d1">', '<hr data-id="NEW">'],
      ],
      [
        '<ul><li data-id="l1"><p>a</p><ul><li data-id="l2"><p></p></li></ul></li></ul>',
        ['<ul><li data-id="l1"><p>a</p></li></ul>', '<hr data-id="NEW">'],
      ],
    ];
    for (const [source, expected] of cases)
      for (const [name, mount] of mounts) {
        const instance = mount(source);
        expect(instance.execute([{ type: 'blocks.insert', kind: 'divider' }], QUIET)).toBe(true);
        expect(lines(instance), `${name} ${source}`).toEqual(expected);
      }
  });
});
