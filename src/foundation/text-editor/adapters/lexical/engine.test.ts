/**
 * The Lexical engine: factory, module probes, configuration, reserved chords, root attributes,
 * base CSS and the mount's lifecycle (Widgets `uwg-te-par-engine-1`, `uwg-te-tab-engine`,
 * `uwg-te-req-engine-1`, `uwg-te-req-engine-2`, `uwg-te-req-engine-11`).
 */
import { readFileSync } from 'node:fs';
import * as lexical from 'lexical';
import { describe, expect, it } from 'vitest';
import { corpusNodes } from '../../content/corpus.test.js';
import { BASE_CAPABILITIES } from '../../capabilities.js';
import type { TextEditorNodeDefinition } from '../../nodes.js';
import {
  engineCopy,
  fakeContainer,
  type FakeElement,
  keyEvent,
} from '../shared/test-helpers.test.js';
import { LEXICAL_BASE_CSS } from './css.js';
import { MODIFIED_ENTER_CHORDS } from '../shared/reserved-keys.js';
import { lexicalReservedKeys } from './guards.js';
import { createLexicalEngine } from './index.js';
import {
  headlessLexical,
  htmlOf,
  selectText,
  realLexicalModules,
  recordingContext,
  reducedLexicalModules,
  stubLexicalModules,
  type Headless,
  rootedLexical,
} from './lexical-stubs.test.js';
import {
  LEXICAL_MODULE_PATHS,
  lexicalVersionProblem,
  probeLexicalModules,
  type LexicalEditorLike,
  type TextEditorLexicalModules,
} from './modules.js';
import { lexicalTheme } from './theme.js';
import { $holderById } from './ids.js';
import type { TextEditorAction } from '../../actions.js';

const REQUIRED = [
  'lexical',
  'extension',
  'richText',
  'history',
  'selection',
  'list',
  'link',
  'markdown',
  'code',
  'a11y',
  'html',
] as const;

function stubMount(options: { version?: string; editable?: boolean; html?: string } = {}) {
  const stub = stubLexicalModules({ version: options.version });
  const engine = createLexicalEngine(stub.modules);
  const recording = recordingContext({
    editable: options.editable,
    initialContent: options.html === undefined ? null : { content: options.html, format: 'html' },
  });
  const container = fakeContainer();
  const instance = engine.mount(container as unknown as HTMLElement, recording.context);
  if (instance instanceof Promise) throw new Error('The Lexical mount is synchronous.');
  const root = container.children[0] as FakeElement;
  return { ...stub, engine, recording, container, instance, root };
}

describe('uwg-te-req-engine-1: factory and module probes', () => {
  it('the engine signatures are typed: a wrong argument fails to compile', () => {
    // Each call below is a compile-time check that the typecheck runs; none of them runs.
    const calls = (modules: TextEditorLexicalModules, editor: LexicalEditorLike) => [
      // @ts-expect-error an extension needs a name
      () => modules.lexical.defineExtension({ namespace: 'tp-text-editor' }),
      // @ts-expect-error a configuration is a record
      () => modules.lexical.configExtension(modules.history.HistoryExtension, 'delay'),
      // @ts-expect-error the engine's points are nodes, not keys
      () => modules.selection.createDOMRange(editor, 'key', 0, 'key', 0),
      // @ts-expect-error a DOM selection names its anchor and focus
      () => modules.lexical.$createRangeSelectionFromDom({ anchorNode: null }, editor),
      // @ts-expect-error a transformer declares its kind and how it matches
      () => modules.markdown.registerMarkdownShortcuts(editor, [{ type: 'text-match' }]),
      () =>
        modules.html.domOverride([modules.lexical.TextNode], {
          // @ts-expect-error an override receives the node, the next step and the editor only
          $createDOM: (_node, $next, _editor, extra: number) => (extra ? $next() : $next()),
        }),
    ];
    expect(calls).toBeTypeOf('function');
  });

  it('V-012: the factory never throws, whatever the modules', () => {
    for (const modules of [{}, null, undefined, { table: 3 }, reducedLexicalModules])
      expect(() =>
        createLexicalEngine(modules as unknown as TextEditorLexicalModules),
      ).not.toThrow();
    const engine = createLexicalEngine({} as unknown as TextEditorLexicalModules);
    expect([...engine.capabilities]).toEqual([...BASE_CAPABILITIES]);
  });

  it.each(REQUIRED)('V-012: a missing "%s" module rejects the mount naming it', (key) => {
    const modules = {
      ...realLexicalModules,
      [key]: undefined,
    } as unknown as TextEditorLexicalModules;
    const engine = createLexicalEngine(modules);
    const recording = recordingContext();
    const container = fakeContainer();
    expect(() => engine.mount(container as unknown as HTMLElement, recording.context)).toThrow(
      new RegExp(`"${key}" \\(${LEXICAL_MODULE_PATHS[key].replace('/', '\\/')}\\) is missing`),
    );
    expect(container.children).toHaveLength(0);
    expect(recording.records).toEqual([]);
  });

  it('V-012: a module without a member the adapter uses rejects the mount as incompatible', () => {
    const modules = {
      ...realLexicalModules,
      html: { DOMRenderExtension: realLexicalModules.html.DOMRenderExtension },
    } as unknown as TextEditorLexicalModules;
    const engine = createLexicalEngine(modules);
    expect(() =>
      engine.mount(fakeContainer() as unknown as HTMLElement, recordingContext().context),
    ).toThrow(/"html" \(@lexical\/html\) is incompatible: it lacks "domOverride"/);
  });

  it('V-012: a node class from a second engine copy rejects the mount naming its module', () => {
    class OtherHeadingNode {}
    const modules = {
      ...realLexicalModules,
      richText: { ...realLexicalModules.richText, HeadingNode: OtherHeadingNode },
    } as unknown as TextEditorLexicalModules;
    expect(() =>
      createLexicalEngine(modules).mount(
        fakeContainer() as unknown as HTMLElement,
        recordingContext().context,
      ),
    ).toThrow(/"richText" \(@lexical\/rich-text\) comes from another copy of "lexical"/);
    const table = {
      ...realLexicalModules,
      table: { ...realLexicalModules.table, TableNode: class {} },
    };
    expect(() =>
      createLexicalEngine(table as unknown as TextEditorLexicalModules).mount(
        fakeContainer() as unknown as HTMLElement,
        recordingContext().context,
      ),
    ).toThrow(/"table" \(@lexical\/table\) comes from another copy/);
  });

  it('V-012: a module from a real second copy of the engine rejects the mount naming it', async () => {
    const copy = await engineCopy(
      (name) => name === 'lexical' || name.startsWith('@lexical/'),
      LEXICAL_MODULE_PATHS,
    );
    try {
      expect(copy.modules['lexical']).not.toBe(realLexicalModules.lexical);
      // The modules of one copy belong together, whichever copy it is.
      expect(() => probeLexicalModules(copy.modules)).not.toThrow();
      expect(() => probeLexicalModules(realLexicalModules)).not.toThrow();
      // The modules that hold engine classes or register engine commands.
      const checked = ['lexical', 'extension', 'richText', 'history', 'selection'];
      for (const key of [...checked, 'list', 'link', 'code', 'table']) {
        const modules = { ...realLexicalModules, [key]: copy.modules[key] };
        expect(() => probeLexicalModules(modules), key).toThrow(
          `The Lexical module "${key}" (${LEXICAL_MODULE_PATHS[key as keyof TextEditorLexicalModules]}) comes from another copy`,
        );
      }
    } finally {
      copy.remove();
    }
  });

  it('V-012: 0.51.0 gives one version diagnostic and a working mount; 0.52.3 and 0.52.0+dev.esm give none', () => {
    const old = stubMount({ version: '0.51.0' });
    expect(old.recording.of('diagnostic').map(({ code }) => code)).toEqual([
      'text-editor-engine-version',
    ]);
    expect(old.recording.of('ready')).toHaveLength(1);
    for (const version of ['0.52.3', '0.52.0+dev.esm']) {
      const current = stubMount({ version });
      expect(current.recording.of('diagnostic')).toEqual([]);
      expect(current.recording.of('ready')).toHaveLength(1);
    }
    expect(lexicalVersionProblem(undefined)).toBeNull();
  });

  it('V-012: the real engine reports a verified version', () => {
    const { editor, recording } = headlessLexical();
    expect(editor.constructor.version).toMatch(/^0\.52\./);
    expect(recording.of('diagnostic')).toEqual([]);
  });
});

describe('uwg-te-req-engine-2: capabilities', () => {
  it('V-013: 30 base identifiers, plus the three table ones with the table module', () => {
    const full = createLexicalEngine(realLexicalModules);
    expect([...full.capabilities]).toEqual([
      ...BASE_CAPABILITIES,
      'block.table',
      'table.merge',
      'table.move',
    ]);
    const reduced = createLexicalEngine(reducedLexicalModules);
    expect([...reduced.capabilities]).toEqual([...BASE_CAPABILITIES]);
    const { $moveTableRow: _move, ...withoutMove } = realLexicalModules.table;
    void _move;
    const noMove = createLexicalEngine({
      ...realLexicalModules,
      table: withoutMove,
    } as TextEditorLexicalModules);
    expect([...noMove.capabilities]).toEqual([...BASE_CAPABILITIES, 'block.table', 'table.merge']);
  });

  it('V-013: the set is fixed before mount and is the instance set', () => {
    const { engine, instance } = stubMount();
    expect(instance.capabilities).toBe(engine.capabilities);
    const headless = headlessLexical();
    expect([...headless.instance.capabilities]).toHaveLength(33);
  });

  it('the capability set is frozen', () => {
    for (const modules of [realLexicalModules, reducedLexicalModules])
      expect(Object.isFrozen(createLexicalEngine(modules).capabilities)).toBe(true);
  });

  it('supportsNode takes a definition the adapter generates by its name, kind and content, or one with an override', () => {
    const engine = createLexicalEngine(realLexicalModules, {
      nodes: { callout: { klass: lexical.ParagraphNode } },
    });
    const block = (name: string, content: string) =>
      ({ kind: 'block', name, content }) as unknown as TextEditorNodeDefinition;
    expect(engine.supportsNode(block('callout', 'other'))).toBe(true);
    expect(engine.supportsNode(block('embed', 'none'))).toBe(true);
    expect(engine.supportsNode(block('Embed Card', 'none'))).toBe(false);
    expect(engine.supportsNode(block('embed', 'blocks'))).toBe(false);
  });

  it('supportsNode answers alike every time: generated classes and overrides', () => {
    const engine = createLexicalEngine(realLexicalModules, {
      nodes: { callout: { klass: class {} as never } },
    });
    const block = { kind: 'block', name: 'callout', content: 'inline' } as never;
    const atom = { kind: 'block', name: 'embed', content: 'none' } as never;
    const inline = { kind: 'inline', name: 'mention' } as never;
    for (let round = 0; round < 2; round += 1)
      expect([
        engine.supportsNode(block),
        engine.supportsNode(atom),
        engine.supportsNode(inline),
      ]).toEqual([true, true, true]);
    expect(engine.supportsNode({ kind: 'block', name: 'odd', content: 'other' } as never)).toBe(
      false,
    );
  });
});

describe('uwg-te-tab-engine r11: reserved chords', () => {
  it('V-055: every engine-bound chord that is no editing key is reserved; never Mod+a or Escape', () => {
    // The engine's keydown table: `prevent(key, modifiers, COMMAND, …)` entries.
    const source = readFileSync(
      new URL('../../../../../node_modules/lexical/dist/Lexical.dev.js', import.meta.url),
      'utf8',
    );
    const chords = new Set<string>();
    for (const match of source.matchAll(
      /prevent\('([^']+)', (\{[^}]*\}|[A-Z_]+), ([A-Z_]+)_COMMAND/g,
    )) {
      const [, key, modifiers, command] = match;
      if (!['FORMAT_TEXT', 'UNDO', 'REDO'].includes(command!)) continue;
      const shift = modifiers!.includes('shiftKey: true') ? 'Shift+' : '';
      const mod = modifiers!.includes('CONTROL_OR_META')
        ? 'Mod+'
        : modifiers!.includes('CTRL_KEY')
          ? 'Ctrl+'
          : '';
      chords.add(`${mod}${shift}${key}`);
    }
    // Off Apple the engine binds every chord of the table; on Apple, Ctrl+Y is no redo. The
    // engine also binds Enter with any modifiers to its Enter command; those chords that are no
    // editing key are prevented by the adapter and reserved too.
    const enter = source.match(/enter\(\{\s*\.\.\.ANY_MODIFIERS,\s*shiftKey: (true|false)\s*\}/gu);
    expect(enter).toHaveLength(2);
    const reserved = lexicalReservedKeys(false);
    expect([...chords, ...MODIFIED_ENTER_CHORDS].sort()).toEqual([...reserved].sort());
    expect(reserved).toEqual([
      'Mod+b',
      'Mod+i',
      'Mod+u',
      'Mod+z',
      'Mod+Shift+z',
      'Ctrl+y',
      ...MODIFIED_ENTER_CHORDS,
    ]);
    expect(MODIFIED_ENTER_CHORDS).toHaveLength(14);
    for (const chord of ['Enter', 'Shift+Enter']) expect(reserved).not.toContain(chord);
    expect(source).toMatch(
      /\.\.\.\(IS_APPLE \? \[[\s\S]*?\] : \[[^\]]*prevent\('y', CTRL_KEY, REDO_COMMAND/u,
    );
    for (const chord of ['Mod+a', 'Escape']) expect(reserved).not.toContain(chord);
    expect(Object.isFrozen(createLexicalEngine(realLexicalModules).reservedKeys)).toBe(true);
  });
});

describe('uwg-te-req-engine-11, uwg-te-req-key-4: the guards', () => {
  it('V-057, V-266: the Escape listener sits at low priority and answers true only for a range selection', () => {
    const { record } = stubMount();
    const escape = record.commands.filter(({ name }) => name === 'KEY_ESCAPE_COMMAND');
    expect(escape.map(({ priority }) => priority)).toEqual([lexical.COMMAND_PRIORITY_LOW]);
    // Run against a real editor: the listener reads only the selection, never the event.
    const headless = headlessLexical({
      html: '<p data-id="p1">ab</p><hr data-id="d1"><table data-id="t1"><tbody><tr><td><p>c</p></td><td><p>d</p></td></tr></tbody></table>',
    });
    const { event, record: calls } = keyEvent('Escape');
    selectText(headless, { block: 'p1', offset: 1 });
    // The engine's rich-text listener below it would blur the root; it never runs.
    expect(headless.editor.dispatchCommand(lexical.KEY_ESCAPE_COMMAND, event)).toBe(true);
    headless.instance.execute(
      [{ type: 'selection.set', selection: { kind: 'blocks', ids: ['d1'] } }],
      { reason: 'imperative-action' },
    );
    expect(headless.editor.dispatchCommand(lexical.KEY_ESCAPE_COMMAND, event)).toBe(false);
    expect(calls).toEqual({ prevented: 0, stopped: 0 });
  });

  it('keyboard-originated format, undo and redo do nothing; undo from an action or an input event applies', async () => {
    const headless = headlessLexical({ html: '<p data-id="p1">calm</p>' });
    selectText(headless, { block: 'p1', offset: 0 }, { block: 'p1', offset: 4 });
    headless.instance.execute([{ type: 'mark.toggle', mark: 'italic' }], {
      reason: 'imperative-action',
    });
    const italic = htmlOf(headless);
    // Mod+B through the engine's keydown table (Ctrl on this platform) and its formatBold path.
    const bold = keyEvent('b', { ctrl: true });
    headless.editor.dispatchCommand(lexical.KEY_DOWN_COMMAND, bold.event);
    headless.editor.read(() => undefined);
    expect(bold.record.prevented).toBe(1);
    expect(headless.editor.dispatchCommand(lexical.FORMAT_TEXT_COMMAND, 'bold')).toBe(true);
    headless.editor.read(() => undefined);
    expect(htmlOf(headless)).toBe(italic);
    // Mod+Z through the keydown table is consumed; its default stays prevented.
    const undo = keyEvent('z', { ctrl: true });
    headless.editor.dispatchCommand(lexical.KEY_DOWN_COMMAND, undo.event);
    headless.editor.read(() => undefined);
    expect(undo.record.prevented).toBe(1);
    expect(htmlOf(headless)).toBe(italic);
    await Promise.resolve();
    // A historyUndo input event dispatches the command alone: the engine's history applies.
    headless.editor.dispatchCommand(lexical.UNDO_COMMAND, undefined);
    headless.editor.read(() => undefined);
    expect(htmlOf(headless)).toBe('<p data-id="p1">calm</p>');
    expect(headless.instance.execute([{ type: 'history.redo' }], { reason: 'hotkey' })).toBe(true);
    expect(htmlOf(headless)).toBe(italic);
  });

  it('registers the guards at critical priority and the editing keys at high priority', () => {
    const { record } = stubMount();
    const at = (name: string) =>
      record.commands.filter((command) => command.name === name).map(({ priority }) => priority);
    const { COMMAND_PRIORITY_CRITICAL: CRITICAL, COMMAND_PRIORITY_HIGH: HIGH } = lexical;
    for (const name of [
      'FORMAT_TEXT_COMMAND',
      'SELECT_ALL_COMMAND',
      'UNDO_COMMAND',
      'REDO_COMMAND',
    ])
      expect(at(name)).toEqual([CRITICAL]);
    expect(at('KEY_DOWN_COMMAND')).toEqual([CRITICAL]);
    expect(at('COPY_COMMAND')).toEqual([CRITICAL]);
    expect(at('CUT_COMMAND')).toEqual([CRITICAL]);
    expect(at('KEY_TAB_COMMAND')).toEqual([HIGH, HIGH]);
    // Enter with a modifier other than Shift alone, then Enter over a whole-document selection
    // (critical), then the editing keys (high).
    expect(at('KEY_ENTER_COMMAND')).toEqual([CRITICAL, CRITICAL, HIGH]);
    // Backspace and Delete over a whole-document selection (critical); a join into a code block,
    // at list boundaries, Backspace at a block start and the keys beside a table (high); over a
    // cell range, ahead of the engine's table, and over a block selection, as an undo step of its
    // own (critical).
    expect(at('KEY_BACKSPACE_COMMAND')).toEqual([
      CRITICAL,
      HIGH,
      HIGH,
      HIGH,
      CRITICAL,
      HIGH,
      CRITICAL,
    ]);
    expect(at('KEY_DELETE_COMMAND')).toEqual([CRITICAL, HIGH, HIGH, CRITICAL, HIGH, CRITICAL]);
    // The input over a whole-document selection is checked before anything else, then the caret
    // colors of the text it inserts.
    // Then typing over a range across blocks, the shared range deletion.
    expect(at('INSERT_PARAGRAPH_COMMAND')[0]).toBe(CRITICAL);
    expect(at('CONTROLLED_TEXT_INSERTION_COMMAND')).toEqual([CRITICAL, CRITICAL, HIGH]);
  });
});

describe('uwg-te-par-engine-1: node overrides and custom views', () => {
  const embed = corpusNodes.find(({ name }) => name === 'embed')!;

  it('an override class replaces the generated one at runtime', () => {
    const generated = headlessLexical({ nodes: [embed] });
    const Generated = generated.rt.customBlocks.get('embed')!.klass;
    class Override extends (Generated as unknown as new () => object) {}
    const headless = headlessLexical({
      nodes: [embed],
      options: { nodes: { embed: { klass: Override as never } } },
    });
    expect(headless.rt.customBlocks.get('embed')!.klass).toBe(Override);
    const attrs = { url: 'https://harbor.example/tide', caption: 'Tide' };
    expect(
      headless.instance.execute([{ type: 'blocks.insert', kind: 'embed', attrs }], {
        reason: 'imperative-action',
      }),
    ).toBe(true);
    expect(headless.instance.getBlocks().ordered()).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'embed', attrs })]),
    );
  });

  it('atom classes get a mutation listener that cleans up the views of destroyed nodes', () => {
    const stub = stubLexicalModules();
    createLexicalEngine(stub.modules).mount(
      fakeContainer() as unknown as HTMLElement,
      recordingContext({ nodes: [embed] }).context,
    );
    expect(stub.record.mutationListeners).toHaveLength(1);
  });
});

describe('uwg-te-tab-engine r4: history with focus false', () => {
  it('the root is not editable while an undo with focus false commits, then editable again', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">calm</p>' });
    selectText(headless, { block: 'p1', offset: 4 });
    headless.instance.execute([{ type: 'text.insert', text: '!' }], {
      reason: 'imperative-action',
    });
    const root = fakeContainer();
    root.setAttribute('contenteditable', 'true');
    // The adapter reads the root once before it dispatches; the headless engine keeps none.
    const editor = headless.editor as unknown as { getRootElement: () => unknown };
    const original = editor.getRootElement.bind(editor);
    editor.getRootElement = () => {
      editor.getRootElement = original;
      return root;
    };
    const seen: (string | null)[] = [];
    headless.editor.registerCommand(
      lexical.UNDO_COMMAND,
      () => {
        seen.push(root.getAttribute('contenteditable'));
        return false;
      },
      lexical.COMMAND_PRIORITY_CRITICAL,
    );
    expect(
      headless.instance.execute([{ type: 'history.undo' }], { reason: 'hotkey', focus: false }),
    ).toBe(true);
    expect(seen).toEqual(['false']);
    expect(root.getAttribute('contenteditable')).toBe('true');
    expect(htmlOf(headless)).toBe('<p data-id="p1">calm</p>');
  });
});

describe('uwg-te-req-engine-12: engine configuration', () => {
  it('V-063: the extension list, its configurations and the theme', () => {
    const { record, modules } = stubMount();
    const [init] = record.extensions;
    expect(init).toMatchObject({
      name: '@tweakpad/ui/text-editor/adapters/lexical',
      namespace: 'tp-text-editor',
      editable: true,
    });
    const configs = Object.fromEntries(record.configs.map(({ name, config }) => [name, config]));
    expect(configs['@lexical/history/History']).toEqual({
      delay: 500,
      maxDepth: 100,
      disabled: false,
      createInitialHistoryState: expect.any(Function),
    });
    expect(configs['@lexical/table/Table']).toEqual({
      hasTabHandler: false,
      hasHorizontalScroll: true,
      hasCellMerge: true,
      hasCellBackgroundColor: false,
      hasNestedTables: false,
    });
    // The detached announcer owner silences every engine announcer.
    const owner = configs['@lexical/a11y/AriaLiveRegion']?.['owner'] as FakeElement;
    expect(owner.tagName).toBe('DIV');
    expect(owner.isConnected).toBe(false);
    expect(Array.isArray(configs['@lexical/html/DOM']?.['overrides'])).toBe(true);
    const names = (init!.dependencies ?? []).map((dependency) =>
      Array.isArray(dependency)
        ? (dependency[0] as { name: string }).name
        : (dependency as { name: string }).name,
    );
    expect(names).toEqual([
      '@lexical/rich-text',
      '@lexical/a11y/AriaLiveRegion',
      '@lexical/history/History',
      '@lexical/list/List',
      '@lexical/link/Link',
      '@lexical/code',
      '@lexical/extension/HorizontalRule',
      '@lexical/table/Table',
      '@lexical/html/DOM',
    ]);
    for (const absent of [
      /CheckList/,
      /ClickableLink/,
      /AutoLink/,
      /TabIndentation/,
      /Draggable/,
      /Highlight/,
    ])
      expect(names.some((name) => absent.test(name))).toBe(false);
    expect(init!.theme).toBe(lexicalTheme(modules.lexical));
    expect(init!.theme).toMatchObject({ blockCursor: 'tp-te-block-cursor' });
  });

  it('V-063: without the table module there is no table extension', () => {
    const stub = stubLexicalModules({ base: reducedLexicalModules });
    createLexicalEngine(stub.modules).mount(
      fakeContainer() as unknown as HTMLElement,
      recordingContext().context,
    );
    expect(stub.record.configs.some(({ name }) => name === '@lexical/table/Table')).toBe(false);
  });

  it('registers the identifier transforms, history flags, focus and the Enter-at-start rule', () => {
    const { record } = stubMount();
    const byName = record.commands.map(({ name, priority }) => `${name}@${priority}`);
    expect(byName).toEqual(
      expect.arrayContaining([
        'INSERT_PARAGRAPH_COMMAND@1',
        'CAN_UNDO_COMMAND@1',
        'CAN_REDO_COMMAND@1',
        'CLEAR_HISTORY_COMMAND@4',
        'FOCUS_COMMAND@4',
        'BLUR_COMMAND@4',
      ]),
    );
    expect(record.transforms.length).toBeGreaterThanOrEqual(9);
    expect(record.updateListeners.length).toBeGreaterThanOrEqual(2);
    expect(record.editableListeners).toHaveLength(1);
  });
});

describe('uwg-te-tab-engine r12: the editing root', () => {
  it('V-060: one fresh root, adapter-owned contenteditable and translate, widget attributes written as given', () => {
    const { root, container, instance, record } = stubMount();
    expect(container.children).toEqual([root]);
    expect(record.roots).toEqual([root]);
    expect(Object.fromEntries(root.attributes)).toEqual({
      contenteditable: 'true',
      translate: 'no',
    });
    instance.setRootAttributes({
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': 'Notes',
      tabindex: '0',
      contenteditable: 'false',
      translate: 'yes',
      spellcheck: 'true',
    });
    expect(Object.fromEntries(root.attributes)).toEqual({
      contenteditable: 'true',
      translate: 'no',
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': 'Notes',
      tabindex: '0',
      spellcheck: 'true',
    });
    instance.setRootAttributes({ 'aria-label': null, tabindex: null, 'aria-disabled': 'true' });
    expect(root.getAttribute('aria-label')).toBeNull();
    expect(root.getAttribute('tabindex')).toBeNull();
    expect(root.getAttribute('aria-disabled')).toBe('true');
  });

  it('V-060: contenteditable follows setEditable, with a state notification and no content one', () => {
    const { root, instance, recording } = stubMount({ editable: false });
    expect(root.getAttribute('contenteditable')).toBe('false');
    recording.clear();
    instance.setEditable(true);
    expect(root.getAttribute('contenteditable')).toBe('true');
    expect(recording.records).toEqual([{ type: 'state' }]);
    instance.setEditable(true);
    expect(recording.records).toEqual([{ type: 'state' }]);
  });

  it('a dragstart from inside the root is cancelled, editable or read-only, until destroy', () => {
    // Dragging inside the document is disabled (`uwg-te-req-content-6`): text moves by cut and
    // paste, blocks only through the widget.
    const { root, instance } = stubMount();
    const dragStart = () => {
      const event = new Event('dragstart', { bubbles: true, cancelable: true });
      root.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(dragStart()).toBe(true);
    instance.setEditable(false);
    expect(dragStart()).toBe(true);
    instance.destroy();
    expect(dragStart()).toBe(false);
  });

  it('adopts the base CSS once, and destroy releases it and leaves the container empty, idempotently', () => {
    const { container, instance, recording, record } = stubMount();
    expect(recording.of('adopt').map(({ css }) => css)).toEqual([LEXICAL_BASE_CSS]);
    instance.destroy();
    instance.destroy();
    expect(container.children).toEqual([]);
    expect(recording.of('release')).toHaveLength(1);
    expect(record.roots).toEqual([expect.anything(), null]);
    expect(record.disposed).toBe(1);
  });

  it('reports ready once, synchronously in the mount, after the initial content diagnostics', () => {
    const { recording } = stubMount({ html: '<p data-id="same">a</p><p data-id="same">b</p>' });
    expect(recording.records.map(({ type }) => type)).toEqual(['adopt', 'diagnostic', 'ready']);
    expect(recording.of('diagnostic')[0]?.code).toBe('text-editor-block-id');
  });
});

describe('uwg-te-req-pres-2: base CSS', () => {
  const css = LEXICAL_BASE_CSS;

  it('V-066: no literal color and only editing mechanics', () => {
    expect(css).not.toMatch(
      /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(|oklab\(|lab\(|lch\(|color-mix\(/i,
    );
    const named = css.match(/:\s*([a-z-]+)\s*;/gi) ?? [];
    const colorWords = [
      'red',
      'blue',
      'green',
      'black',
      'white',
      'gray',
      'grey',
      'yellow',
      'orange',
      'purple',
      'pink',
    ];
    for (const value of named)
      for (const word of colorWords) expect(value).not.toMatch(new RegExp(`\\b${word}\\b`));
    const properties = [...css.matchAll(/^\s*([a-z-]+)\s*:/gim)].map((match) => match[1]);
    expect(new Set(properties)).toEqual(
      new Set([
        'white-space',
        'overflow-wrap',
        'font-variant-ligatures',
        'display',
        'tab-size',
        'overflow-x',
        // The engine's wrapper item of a nested list draws no marker of its own.
        'list-style-type',
        // A list in it takes the widget's direction, which the root records.
        '--tp-te-direction',
        'direction',
        'caret-color',
        'user-select',
        'background-color',
      ]),
    );
    expect(css).toMatch(/background-color: transparent;/);
  });

  it('options.css replaces the base with a string and extends it with a function', () => {
    const replaced = recordingContext();
    createLexicalEngine(stubLexicalModules().modules, { css: '.x { tab-size: 4; }' }).mount(
      fakeContainer() as unknown as HTMLElement,
      replaced.context,
    );
    expect(replaced.of('adopt')[0]?.css).toBe('.x { tab-size: 4; }');
    const stub = stubLexicalModules();
    const recording = recordingContext();
    createLexicalEngine(stub.modules, { css: (base) => `${base}/* app */` }).mount(
      fakeContainer() as unknown as HTMLElement,
      recording.context,
    );
    expect(recording.of('adopt')[0]?.css).toBe(`${css}/* app */`);
  });
});

describe('uwg-te-req-content-1: content through the shared glue', () => {
  const html = '<p data-id="p1">calm <strong>sea</strong></p>\n<h2 data-id="h1">Tides</h2>';

  it('reads the initial content without history or a content notification', () => {
    const { instance, recording } = headlessLexical({ html });
    expect(recording.records.map(({ type }) => type)).toEqual(['ready']);
    expect(instance.getContent('html')).toBe(html);
    expect(instance.getContent('markdown')).toBe('calm **sea**\n\n## Tides\n');
    expect(instance.getContent('text')).toBe('calm sea\n\nTides');
    expect(instance.getState().history).toEqual({ undo: false, redo: false });
    expect(instance.getState().contentVersion).toBe(1);
  });

  it('json is the editor state; json with blocks maps the selected blocks back', () => {
    const { instance } = headlessLexical({ html });
    const native = instance.getContent('json') as { root: { children: { type: string }[] } };
    expect(native.root.children.map(({ type }) => type)).toEqual(['paragraph', 'heading']);
    const limited = instance.getContent('json', { blocks: ['h1'] }) as {
      root: { children: unknown[] };
    };
    expect(limited.root.children).toMatchObject([
      { type: 'heading', tag: 'h2', $: { 'tp-id': 'h1' } },
    ]);
    expect(instance.getContent('html', { blocks: ['h1'] })).toBe('<h2 data-id="h1">Tides</h2>');
  });

  it('setContent push adds one undoable step after the earlier ones; reset clears the history', () => {
    const { instance, recording } = headlessLexical({ html });
    recording.clear();
    instance.setContent('<p data-id="n1">next</p>', 'html', {
      history: 'push',
      reason: 'imperative-action',
    });
    expect(recording.of('content').map(({ change }) => change)).toEqual([
      { cause: 'content', reason: 'imperative-action' },
    ]);
    expect(instance.getContent('html')).toBe('<p data-id="n1">next</p>');
    expect(instance.getState().history.undo).toBe(true);
    instance.setContent('third', 'text', { history: 'push' });
    expect(instance.getContent('text')).toBe('third');
    expect(instance.execute([{ type: 'history.undo' }], { reason: 'hotkey' })).toBe(true);
    expect(instance.getContent('html')).toBe('<p data-id="n1">next</p>');
    expect(instance.execute([{ type: 'history.undo' }], { reason: 'hotkey' })).toBe(true);
    expect(instance.getContent('html')).toBe(html);
    instance.setContent('# Fresh', 'markdown');
    expect(instance.getContent('markdown')).toBe('# Fresh\n');
    expect(instance.getState().history).toEqual({ undo: false, redo: false });
  });

  it('content that cannot be read throws and leaves the content; an unknown format is NotSupported', () => {
    const { instance, recording } = headlessLexical({ html });
    recording.clear();
    expect(() => instance.setContent('{bad', 'json')).toThrow(
      expect.objectContaining({ name: 'DataError' }),
    );
    expect(() => instance.setContent({ type: 'doc', content: [] }, 'json')).toThrow(
      expect.objectContaining({ name: 'DataError' }),
    );
    expect(() => instance.setContent('x', 'rtf' as never)).toThrow(
      expect.objectContaining({ name: 'NotSupportedError' }),
    );
    expect(() => instance.getContent('rtf' as never)).toThrow(
      expect.objectContaining({ name: 'NotSupportedError' }),
    );
    expect(instance.getContent('html')).toBe(html);
    expect(recording.records).toEqual([]);
  });

  it('setting equal content changes nothing: no notification, no undo step, no selection', () => {
    const { instance, recording } = headlessLexical({ html });
    recording.clear();
    instance.setContent(html, 'html', { history: 'push' });
    expect(recording.records.map(({ type }) => type)).toEqual([]);
    expect(instance.getState().history.undo).toBe(false);
    // With a selection, the load clears it: a state notification only.
    instance.execute(
      [{ type: 'selection.set', selection: { kind: 'caret', block: 'p1', position: 'end' } }],
      { reason: 'imperative-action', focus: false },
    );
    recording.clear();
    instance.setContent(html, 'html', { history: 'push' });
    expect(recording.records.map(({ type }) => type)).toEqual(['state']);
    expect(instance.getState().selection).toEqual({ kind: 'none' });
    expect(instance.getState().history.undo).toBe(false);
  });

  it('converts what the instance cannot represent with one diagnostic per load', () => {
    const { instance, recording } = headlessLexical({
      modules: reducedLexicalModules,
      html: '<table><tbody><tr><td><p>a</p></td></tr></tbody></table><p>b</p>',
    });
    expect(recording.of('diagnostic').map(({ code }) => code)).toEqual([
      'text-editor-content-converted',
    ]);
    expect(instance.getContent('text')).toBe('a\n\nb');
  });

  it('a snapshot keeps its revision and serializes only when read', () => {
    const { instance } = headlessLexical({ html });
    const first = instance.snapshot();
    instance.setContent('<p data-id="n1">next</p>', 'html', { history: 'push' });
    const second = instance.snapshot();
    expect([first.revision, second.revision]).toEqual([1, 2]);
    expect(first.getContent('html')).toBe(html);
    expect(second.getContent('html')).toBe('<p data-id="n1">next</p>');
    expect(first.empty).toBe(false);
    expect(
      (first.getContent('json') as { root: { children: unknown[] } }).root.children,
    ).toHaveLength(2);
  });
});

describe('uwg-te-req-engine-4: the model selection, never a stale DOM selection', () => {
  const run = (
    headless: Headless,
    actions: readonly TextEditorAction[],
    focus: boolean | undefined = false,
  ) => headless.instance.execute(actions, { reason: 'imperative-action', focus });
  const html = (headless: Headless) => headless.instance.getContent('html') as string;
  /**
   * Makes every update begin with another selection, as the engine does when an update begins
   * outside an event while a stale DOM selection lies in the root.
   */
  function staleDomSelection(headless: Headless, block: string, offset: number): () => void {
    const editor = headless.editor;
    const update = editor.update.bind(editor);
    editor.update = (fn, options) =>
      update(() => {
        const holder = $holderById(headless.rt, block) as lexical.ElementNode | null;
        const text = holder?.getFirstChild();
        if (lexical.$isTextNode(text)) text.select(offset, offset);
        fn();
      }, options);
    return () => void (editor.update = update);
  }

  it('a stale DOM selection in the root never replaces the selection an action acts on', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1">calm sea</p><h2 data-id="h1">tide</h2>',
    });
    run(headless, [
      {
        type: 'selection.set',
        selection: {
          kind: 'text',
          anchor: { block: 'p1', offset: 0 },
          head: { block: 'p1', offset: 4 },
        },
      },
    ]);
    staleDomSelection(headless, 'h1', 0);
    expect(run(headless, [{ type: 'mark.toggle', mark: 'bold' }])).toBe(true);
    expect(html(headless)).toBe(
      '<p data-id="p1"><strong>calm</strong> sea</p>\n<h2 data-id="h1">tide</h2>',
    );
    expect(run(headless, [{ type: 'block.set-type', kind: 'quote' }])).toBe(true);
    expect(
      headless.instance
        .getBlocks()
        .ordered()
        .map(({ kind }) => kind),
    ).toEqual(['quote', 'heading']);
  });

  it('focus restores the model selection, not the DOM selection the root takes on focus', () => {
    const headless = headlessLexical({
      html: '<p data-id="p1">calm sea</p><h2 data-id="h1">tide</h2>',
    });
    run(headless, [
      {
        type: 'selection.set',
        selection: {
          kind: 'text',
          anchor: { block: 'h1', offset: 1 },
          head: { block: 'h1', offset: 3 },
        },
      },
    ]);
    staleDomSelection(headless, 'p1', 0);
    void headless.instance.focus();
    expect(headless.instance.getState().selection).toMatchObject({
      kind: 'text',
      anchor: { block: 'h1', offset: 1 },
      head: { block: 'h1', offset: 3 },
    });
  });
});

describe('uwg-te-tab-engine r4: an applied action focuses the root unless focus is false', () => {
  it('a block selection or a cell range set with focus true focuses the root and stays', () => {
    const { instance, root, document } = rootedLexical({
      html: '<p data-id="p1">a</p><hr data-id="d1"><table data-id="t1"><tbody><tr><td><p>x</p></td><td><p>y</p></td></tr></tbody></table><p data-id="p2"></p>',
    });
    expect(
      instance.execute([{ type: 'selection.set', selection: { kind: 'blocks', ids: ['d1'] } }], {
        reason: 'imperative-action',
      }),
    ).toBe(true);
    expect(document.activeElement).toBe(root);
    expect(instance.getState().selection).toEqual({ kind: 'blocks', ids: ['d1'] });
    root.blur();
    const cells = {
      kind: 'cells' as const,
      table: 't1',
      range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 1 } },
    };
    instance.execute([{ type: 'selection.set', selection: cells }], {
      reason: 'imperative-action',
    });
    expect(document.activeElement).toBe(root);
    expect(instance.getState().selection).toEqual(cells);
    // With focus false the root keeps out of focus.
    root.blur();
    instance.execute([{ type: 'selection.set', selection: { kind: 'blocks', ids: ['d1'] } }], {
      reason: 'imperative-action',
      focus: false,
    });
    expect(document.activeElement).toBeNull();
  });

  it('focusing keeps a caret format chosen by the action', () => {
    const { instance, root, document } = rootedLexical({ html: '<p data-id="p1">calm</p>' });
    instance.execute(
      [
        { type: 'selection.set', selection: { kind: 'text', anchor: { block: 'p1', offset: 2 } } },
        { type: 'mark.toggle', mark: 'bold' },
      ],
      { reason: 'imperative-action' },
    );
    expect(document.activeElement).toBe(root);
    expect(instance.getState().marks.bold).toBe('on');
  });
});

describe('uwg-te-req-engine-1: the module probes reject every second engine copy', () => {
  const mount = (modules: unknown) => () =>
    createLexicalEngine(modules as TextEditorLexicalModules).mount(
      fakeContainer() as unknown as HTMLElement,
      recordingContext().context,
    );

  it('a foreign divider, table row or table cell class rejects the mount naming its module', () => {
    expect(
      mount({
        ...realLexicalModules,
        extension: { ...realLexicalModules.extension, HorizontalRuleNode: class {} },
      }),
    ).toThrow(/"extension" \(@lexical\/extension\) comes from another copy of "lexical"/);
    for (const member of ['TableRowNode', 'TableCellNode'])
      expect(
        mount({
          ...realLexicalModules,
          table: { ...realLexicalModules.table, [member]: class {} },
        }),
      ).toThrow(/"table" \(@lexical\/table\) comes from another copy of "lexical"/);
  });
});

describe('uwg-te-req-engine-11: reservedKeys follow the platform the engine binds its keys for', () => {
  it('Ctrl+y is reserved off Apple only, as the engine binds it', () => {
    expect(lexicalReservedKeys(true)).toEqual([
      'Mod+b',
      'Mod+i',
      'Mod+u',
      'Mod+z',
      'Mod+Shift+z',
      ...MODIFIED_ENTER_CHORDS,
    ]);
    expect(lexicalReservedKeys(false)).toEqual([
      'Mod+b',
      'Mod+i',
      'Mod+u',
      'Mod+z',
      'Mod+Shift+z',
      'Ctrl+y',
      ...MODIFIED_ENTER_CHORDS,
    ]);
    expect(Object.isFrozen(lexicalReservedKeys(true))).toBe(true);
  });

  it('the factory takes the platform the engine binds its keys for', () => {
    const on = (apple: boolean) =>
      createLexicalEngine({
        ...realLexicalModules,
        lexical: { ...realLexicalModules.lexical, IS_APPLE: apple },
      }).reservedKeys;
    expect(on(true)).not.toContain('Ctrl+y');
    expect(on(false)).toContain('Ctrl+y');
    expect(createLexicalEngine(realLexicalModules).reservedKeys).toEqual(
      lexicalReservedKeys(realLexicalModules.lexical.IS_APPLE),
    );
  });
});

describe('uwg-te-req-engine-4: the start selection', () => {
  const run = (headless: Headless, ...actions: TextEditorAction[]) =>
    headless.instance.execute(actions, { reason: 'imperative-action', focus: false });
  const html = (headless: Headless) =>
    (headless.instance.getContent('html') as string).replace(/\n/gu, '');
  it('after setContent the selection is none and an insertion without at goes to the end', () => {
    const headless = headlessLexical({ html: '<p data-id="p0">x</p>' });
    headless.instance.setContent('<p data-id="p1">calm</p><p data-id="p2">tide</p>', 'html');
    expect(headless.instance.getState().selection).toEqual({ kind: 'none' });
    expect(headless.instance.can({ type: 'mark.toggle', mark: 'bold' })).toBe(false);
    expect(run(headless, { type: 'blocks.insert', kind: 'divider' })).toBe(true);
    expect(html(headless)).toMatch(
      /^<p data-id="p1">calm<\/p><p data-id="p2">tide<\/p><hr data-id="gen\d{4}">$/u,
    );
  });

  it('focus without a selection puts the caret at the first text edge; a leading table at cell (0,0)', async () => {
    const atom = headlessLexical({
      html: '<hr data-id="d1"><ul><li data-id="a"><p>one</p></li></ul>',
    });
    await atom.instance.focus();
    expect(atom.instance.getState().selection).toMatchObject({
      kind: 'text',
      head: { block: 'a', offset: 0 },
    });
    const table = headlessLexical({
      html: '<table data-id="t1"><tbody><tr><td><p>a</p></td></tr></tbody></table><p data-id="p1">x</p>',
    });
    await table.instance.focus('start');
    expect(table.instance.getState().selection).toMatchObject({
      head: { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 },
    });
    await table.instance.focus('end');
    expect(table.instance.getState().selection).toMatchObject({ head: { block: 'p1', offset: 1 } });
  });
});

describe('uwg-te-req-engine-4: DOM selections and the focus of the editing root', () => {
  /** A document selection in the fake document of a rooted mount, as the engine reads one. */
  function fakeSelection(rooted: ReturnType<typeof rootedLexical>) {
    const record = { removed: 0 };
    let at: unknown = null;
    const selection = {
      get rangeCount() {
        return at === null ? 0 : 1;
      },
      get anchorNode() {
        return at;
      },
      get focusNode() {
        return at;
      },
      anchorOffset: 0,
      focusOffset: 0,
      removeAllRanges() {
        at = null;
        record.removed += 1;
      },
      collapse(node: unknown) {
        at = node;
      },
    };
    Object.assign(rooted.document, { getSelection: () => selection });
    return { selection, record };
  }
  const editorOf = (rooted: ReturnType<typeof rootedLexical>) =>
    rooted.instance.native as lexical.LexicalEditor;
  /** The root's focus event as the engine dispatches it, its update flushed. */
  const focusRoot = (rooted: ReturnType<typeof rootedLexical>, event: FocusEvent) => {
    editorOf(rooted).dispatchCommand(lexical.FOCUS_COMMAND, event);
    editorOf(rooted).read(() => undefined);
  };
  const focusEvent = (timeStamp = 1000) => ({ type: 'focus', timeStamp }) as unknown as FocusEvent;
  /** A text node inside the root, where the browser would leave a caret. */
  const inRoot = (rooted: ReturnType<typeof rootedLexical>) => {
    const span = rooted.document.createElement('span');
    rooted.root.append(span);
    return span;
  };

  it('a content load while the root is unfocused removes a DOM selection left in the root, which the engine would adopt next', () => {
    const rooted = rootedLexical({ html: '<p data-id="p1">Proof the tide.</p>' });
    const { selection, record } = fakeSelection(rooted);
    // A caret placed while focused, then the root blurred: the browser keeps the DOM selection.
    selection.collapse(inRoot(rooted));
    // The engine notifies the selection of the load while it commits, and that notification reads
    // the DOM selection: it must be gone before the load.
    const removeAllRanges = selection.removeAllRanges.bind(selection);
    const removedWith: string[] = [];
    selection.removeAllRanges = () => {
      removedWith.push(rooted.instance.getContent('text') as string);
      removeAllRanges();
    };
    rooted.instance.setContent('<p>Push.</p>', 'html', { history: 'push' });
    expect(rooted.instance.getState().selection).toEqual({ kind: 'none' });
    expect(record.removed).toBe(1);
    expect(removedWith).toEqual(['Proof the tide.']);
    expect(selection.rangeCount).toBe(0);
    // A selection outside the root is the page's own and stays.
    const outside = rooted.document.createElement('p');
    selection.collapse(outside);
    rooted.instance.setContent('<p>Again.</p>', 'html');
    expect(record.removed).toBe(1);
    expect(selection.anchorNode).toBe(outside);
  });

  it('the focus an applied request gives the root keeps the selection none and leaves no DOM caret for the engine to adopt', () => {
    const rooted = rootedLexical({
      html: '<p data-id="p1">a</p><table data-id="t1"><tbody><tr><td><p>b</p></td></tr></tbody></table>',
    });
    const { selection, record } = fakeSelection(rooted);
    const focus = rooted.root.focus.bind(rooted.root);
    // The browser puts a caret at the start of a contenteditable it focuses, then fires focus.
    rooted.root.focus = () => {
      selection.collapse(inRoot(rooted));
      focus();
      focusRoot(rooted, focusEvent());
    };
    expect(rooted.instance.getState().selection).toEqual({ kind: 'none' });
    const applied = rooted.instance.execute(
      [
        {
          type: 'table.background',
          table: 't1',
          target: { all: true },
          color: 'green',
        },
      ],
      { reason: 'imperative-action' },
    );
    expect(applied).toBe(true);
    expect(rooted.document.activeElement).toBe(rooted.root);
    expect(rooted.instance.getState().selection).toEqual({ kind: 'none' });
    expect(record.removed).toBe(1);
    expect(selection.rangeCount).toBe(0);
  });
});

describe('uwg-te-req-engine-4: a selection the API sets while read-only', () => {
  it('is written into the DOM selection of the focused root, which the engine does not write while read-only, so that it stays and a copy writes it', () => {
    const calls: unknown[][] = [];
    const real = realLexicalModules;
    const modules: TextEditorLexicalModules = {
      ...real,
      selection: {
        ...real.selection,
        // The DOM range of two engine points in document order, as the engine builds it over its
        // elements.
        createDOMRange: (_editor, anchor, anchorOffset, focus, offset) => {
          const forward = anchor.is(focus) ? anchorOffset <= offset : anchor.isBefore(focus);
          const [start, startOffset, end, endOffset] = forward
            ? [anchor, anchorOffset, focus, offset]
            : [focus, offset, anchor, anchorOffset];
          return {
            startContainer: `${start.getTextContent()}@${startOffset}`,
            startOffset,
            endContainer: `${end.getTextContent()}@${endOffset}`,
            endOffset,
          } as unknown as Range;
        },
      },
    };
    const rooted = rootedLexical({
      modules,
      editable: false,
      html: '<p data-id="a">ab</p><p data-id="b">cd</p>',
    });
    Object.assign(rooted.document, {
      getSelection: () => ({
        rangeCount: 0,
        setBaseAndExtent: (...args: unknown[]) => void calls.push(args),
      }),
    });
    rooted.root.focus();
    const set = (anchor: [string, number], head: [string, number], focus = true) =>
      rooted.instance.execute(
        [
          {
            type: 'selection.set',
            selection: {
              kind: 'text',
              anchor: { block: anchor[0], offset: anchor[1] },
              head: { block: head[0], offset: head[1] },
            },
          },
        ],
        { reason: 'imperative-action', focus },
      );
    expect(set(['a', 1], ['b', 1])).toBe(true);
    expect(calls).toEqual([['ab@1', 1, 'cd@1', 1]]);
    // A backward range keeps its direction.
    set(['b', 1], ['a', 0]);
    expect(calls[1]).toEqual(['cd@1', 1, 'ab@0', 0]);
    // An unfocused root keeps the document's selection where it is.
    rooted.root.blur();
    set(['a', 0], ['a', 2], false);
    expect(calls).toHaveLength(2);
  });
});
