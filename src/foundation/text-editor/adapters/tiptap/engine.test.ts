import * as core from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { BASE_CAPABILITIES } from '../../capabilities.js';
import type { TextEditorEngineInstance } from '../../engine.js';
import { defineTextEditorBlock } from '../../nodes.js';
import { MODIFIED_ENTER_CHORDS } from '../shared/reserved-keys.js';
import {
  cssRules,
  fakeContainer,
  FakeDocument,
  type FakeElement,
} from '../shared/test-helpers.test.js';
import { TIPTAP_BASE_CSS } from './css.js';
import { createTiptapEngine } from './index.js';
import type { TextEditorTiptapModules } from './modules.js';
import { TIPTAP_INPUT_RULES } from './input-rules.js';
import { editingBindings, neutralizesEscape } from './keymap.js';
import type { TiptapPluginLike } from './modules.js';
import { TIPTAP_RESERVED_KEYS } from './schema.js';
import {
  headlessTiptap,
  html,
  mountTiptap,
  pluginName,
  stubContext,
  stubTiptapModules,
  TIPTAP_MODULES,
  caretAt,
  htmlOf,
  keyedTiptap,
  runActions,
  selectIn,
  shapeOf,
  undoOnce,
  mountResult,
} from './tiptap-stubs.test.js';
import { type TextEditorSelectionInput } from '../../model.js';
import { corpusNodes } from '../../content/corpus.test.js';

const TABLE_CAPABILITIES = ['block.table', 'table.merge', 'table.move'];

describe('Tiptap engine factory and module checks (uwg-te-req-engine-1, uwg-te-req-engine-2)', () => {
  it('V-012: factories never throw and each missing required module rejects the mount naming it', async () => {
    for (const modules of [null, undefined, {}, 5])
      expect(() => createTiptapEngine(modules as unknown as TextEditorTiptapModules)).not.toThrow();
    for (const name of ['core', 'state', 'history', 'starterKit', 'list'] as const) {
      const { [name]: removed, ...rest } = TIPTAP_MODULES;
      void removed;
      const { error } = await mountResult(rest);
      expect(error?.message).toContain(`"${name}"`);
    }
    const { error } = await mountResult(null);
    expect(error?.message).toContain('"core"');
  });

  it('V-012: broken probes reject the mount naming the module', async () => {
    const OldEditor = function () {} as unknown as typeof core.Editor;
    const cases: [string, unknown][] = [
      ['core', { ...TIPTAP_MODULES, core: { ...TIPTAP_MODULES.core, Editor: OldEditor } }],
      ['history', { ...TIPTAP_MODULES, history: { ...TIPTAP_MODULES.history, closeHistory: 1 } }],
      ['table', { ...TIPTAP_MODULES, table: { ...TIPTAP_MODULES.table, TableView: undefined } }],
      [
        'tables',
        {
          ...TIPTAP_MODULES,
          // A second copy of the engine: its cell selection extends another Selection class.
          tables: { ...TIPTAP_MODULES.tables, CellSelection: class Other {} },
        },
      ],
    ];
    for (const [name, modules] of cases) {
      const { error } = await mountResult(modules);
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toContain(`"${name}"`);
    }
  });

  it('V-012: the real modules pass the probes and report no version diagnostic', () => {
    const { context } = mountTiptap();
    expect(context.calls).toEqual(['ready']);
    expect(context.diagnostics).toEqual([]);
  });

  it('V-013: capabilities hold the base set, plus the table set with both table modules', () => {
    const full = createTiptapEngine(TIPTAP_MODULES).capabilities;
    expect([...full]).toEqual([...BASE_CAPABILITIES, ...TABLE_CAPABILITIES]);
    const { table, tables, ...plain } = TIPTAP_MODULES;
    void [table, tables];
    expect([...createTiptapEngine(plain).capabilities]).toEqual([...BASE_CAPABILITIES]);
    expect([...createTiptapEngine({ ...TIPTAP_MODULES, tables: undefined }).capabilities]).toEqual([
      ...BASE_CAPABILITIES,
    ]);
    const { modules } = stubTiptapModules({ withoutMove: true });
    expect([...createTiptapEngine(modules).capabilities]).toEqual([
      ...BASE_CAPABILITIES,
      'block.table',
      'table.merge',
    ]);
    expect(Object.isFrozen(full)).toBe(true);
  });

  it('V-013: the instance holds the engine set itself, before and after mount', () => {
    const { engine, instance } = mountTiptap();
    expect(instance.capabilities).toBe(engine.capabilities);
    expect([...engine.capabilities]).toEqual([...BASE_CAPABILITIES, ...TABLE_CAPABILITIES]);
  });

  it('supportsNode answers generated nodes and overrides, the engine names included', () => {
    const callout = defineTextEditorBlock({
      name: 'callout',
      content: 'inline',
      element: 'aside',
      tool: { label: 'Callout' },
    });
    const engine = createTiptapEngine(TIPTAP_MODULES);
    expect(engine.supportsNode(callout)).toBe(true);
    // A name the engine's own extensions hold is generated in the adapter's namespace.
    const clash = { ...callout, name: 'paste' };
    expect(engine.supportsNode(clash)).toBe(true);
    const override = core.Node.create({ name: 'paste', group: 'block', content: 'inline*' });
    expect(
      createTiptapEngine(TIPTAP_MODULES, { nodes: { paste: override } }).supportsNode(clash),
    ).toBe(true);
  });
});

describe('Tiptap engine configuration (uwg-te-tab-engine r1, r10, r11; uwg-te-req-engine-9)', () => {
  it('V-063: StarterKit, the editor and the table are configured without engine UI', () => {
    const { log } = mountTiptap();
    const kit = log.configure.find(([name]) => name === 'starterKit')?.[1];
    expect(kit).toMatchObject({
      blockquote: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      listKeymap: false,
      code: false,
      dropcursor: false,
      gapcursor: false,
      trailingNode: false,
      undoRedo: false,
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: {
        openOnClick: false,
        autolink: false,
        linkOnPaste: false,
        HTMLAttributes: { class: 'tp-te-link', target: null, rel: null },
      },
    });
    const table = log.configure.find(([name]) => name === 'table')?.[1];
    expect(table).toMatchObject({
      resizable: false,
      allowTableNodeSelection: true,
      cellMinWidth: 48,
    });
    expect(log.editorOptions[0]).toMatchObject({
      injectCSS: false,
      enableContentCheck: true,
      enablePasteRules: false,
      autofocus: false,
      enableCoreExtensions: { tabindex: false, textDirection: false, keymap: false },
    });
    const plugins = log.plugins[0]!;
    for (const absent of ['dropcursor', 'gapcursor', 'columnResizing', 'placeholder', 'suggestion'])
      expect(plugins.some((name) => name.toLowerCase().includes(absent.toLowerCase()))).toBe(false);
    expect(plugins).toContain('history');
  });

  it('V-054: paste rules are off and only the adapter rule extension has input rules', () => {
    const { log } = mountTiptap();
    expect(log.editorOptions[0]).toMatchObject({
      enablePasteRules: false,
      enableInputRules: [TIPTAP_INPUT_RULES],
    });
    const inner = log.editors[0]!.inner;
    // No engine input-rule or paste-rule plugin: the adapter's rules are a plain plugin.
    const engineRules = inner.extensionManager.plugins.filter(
      (plugin) => (plugin.spec as { isInputRules?: boolean }).isInputRules === true,
    );
    expect(engineRules).toEqual([]);
    expect(log.plugins[0]).toContain(TIPTAP_INPUT_RULES);
    expect(createTiptapEngine(TIPTAP_MODULES).capabilities.has('input-rules')).toBe(true);
  });

  it('V-055: every chord the extensions bind is an editing key; the engine still acts on five Mod chords and the modified Enter chords', () => {
    const { log } = mountTiptap();
    const inner = log.editors[0]!.inner;
    const chords = new Set<string>();
    for (const extension of inner.extensionManager.extensions) {
      const shortcuts = core.getExtensionField<(() => Record<string, unknown>) | undefined>(
        extension,
        'addKeyboardShortcuts',
        {
          name: extension.name,
          options: extension.options,
          storage: extension.storage,
          editor: inner,
          type: core.getSchemaTypeByName(extension.name, inner.schema),
        },
      );
      for (const key of Object.keys(shortcuts?.() ?? {})) chords.add(key.replaceAll('-', '+'));
    }
    const editing = new Set([
      'Enter',
      'Shift+Enter',
      'Backspace',
      'Mod+Backspace',
      'Shift+Backspace',
      'Delete',
      'Mod+Delete',
      'Mod+a',
      'Tab',
      'Shift+Tab',
      'ArrowUp',
      'ArrowDown',
      // Consumed over a block selection with no block beyond it (uwg-te-req-engine-9).
      'ArrowLeft',
      'ArrowRight',
      // A cell range by Shift with an arrow key in a table (uwg-te-req-tables-5).
      'Shift+ArrowUp',
      'Shift+ArrowDown',
      'Shift+ArrowLeft',
      'Shift+ArrowRight',
      // The platform's text editing keys on Apple systems.
      'Ctrl+h',
      'Alt+Backspace',
      'Ctrl+d',
      'Ctrl+Alt+Backspace',
      'Alt+Delete',
      'Alt+d',
      'Ctrl+a',
      'Ctrl+e',
    ]);
    const bound = [...chords].filter((chord) => !editing.has(chord));
    expect(bound).toEqual([]);
    // No mark, heading, list, alignment or history chord, and no Mod+Enter exit of the engine.
    for (const chord of ['Mod+b', 'Mod+i', 'Mod+z', 'Mod+Shift+z', 'Mod+y', 'Mod+Enter'])
      expect(chords.has(chord)).toBe(false);
    // The view still prevents the bare Mod chords of B, I, Y and Z, the history plugin runs the
    // native redo of Mod+Shift+Z, and the view prevents every Enter chord with Ctrl, Meta or Alt.
    expect(TIPTAP_RESERVED_KEYS).toEqual([
      'Mod+b',
      'Mod+i',
      'Mod+y',
      'Mod+z',
      'Mod+Shift+z',
      ...MODIFIED_ENTER_CHORDS,
    ]);
    for (const chord of ['Mod+a', 'Escape']) expect(TIPTAP_RESERVED_KEYS).not.toContain(chord);
    expect(createTiptapEngine(TIPTAP_MODULES).reservedKeys).toBe(TIPTAP_RESERVED_KEYS);
    expect(Object.isFrozen(TIPTAP_RESERVED_KEYS)).toBe(true);
  });

  it('V-055: the engine keymap is left out; the adapter keymap binds the editing keys', () => {
    const { log } = mountTiptap();
    const names = log.editors[0]!.inner.extensionManager.extensions.map((ext) => ext.name);
    expect(names).not.toContain('keymap');
    expect(names).toContain('tpKeymap');
    const bindings = editingBindings(headlessTiptap().env, {
      view: log.editors[0]!.view as never,
      commands: {} as never,
    });
    expect(Object.keys(bindings)).toEqual(
      expect.arrayContaining(['Enter', 'Shift-Enter', 'Backspace', 'Delete', 'Mod-a', 'Tab']),
    );
  });
});

describe('Tiptap Escape neutralizer (uwg-te-req-engine-11, uwg-te-req-key-4)', () => {
  /** The plugins that handle DOM events, in the order the engine runs them. */
  const domHandlers = (plugins: readonly TiptapPluginLike[]) =>
    plugins.filter(
      (plugin) => (plugin.spec as { props?: { handleDOMEvents?: unknown } }).props?.handleDOMEvents,
    );

  it('V-057: the neutralizer is the first plugin to see a key event', () => {
    const { editor } = mountTiptap();
    const plugins = editor.view.state.plugins;
    // The engine gives every extension a keymap plugin ahead of its own plugins: the
    // neutralizer's binds no key and handles no DOM event, so the neutralizer comes right after it.
    const own = plugins[0]!.spec as {
      props: {
        handleKeyDown: (view: unknown, event: unknown) => boolean;
        handleDOMEvents?: unknown;
      };
    };
    expect(own.props.handleDOMEvents).toBeUndefined();
    expect(
      own.props.handleKeyDown(editor.view, { key: 'Escape', keyCode: 27, type: 'keydown' }),
    ).toBe(false);
    expect(pluginName(plugins[1]!)).toBe('tpEscape');
    expect(domHandlers(plugins)[0]).toBe(plugins[1]);
  });

  it('V-057: it claims Escape, never while composing, and neither prevents nor stops it', () => {
    const { editor } = mountTiptap();
    const plugin = editor.view.state.plugins[1]!;
    const keydown = (
      plugin.spec as {
        props: { handleDOMEvents: { keydown: (view: unknown, event: unknown) => boolean } };
      }
    ).props.handleDOMEvents.keydown;
    const calls: string[] = [];
    const event = (key: string, isComposing = false) => ({
      key,
      isComposing,
      preventDefault: () => calls.push('preventDefault'),
      stopPropagation: () => calls.push('stopPropagation'),
      stopImmediatePropagation: () => calls.push('stopImmediatePropagation'),
    });
    expect(keydown({ composing: false }, event('Escape'))).toBe(true);
    expect(keydown({ composing: true }, event('Escape'))).toBe(false);
    expect(keydown({ composing: false }, event('Escape', true))).toBe(false);
    expect(keydown({ composing: false }, event('Enter'))).toBe(false);
    expect(calls).toEqual([]);
  });

  it('V-266: the Escape plugin is registered before all others and returns false while composing', () => {
    const { editor, log } = mountTiptap();
    // Before it only its extension's empty keymap, which handles no event.
    expect(log.plugins[0]!.indexOf('tpEscape')).toBe(1);
    expect(pluginName(editor.view.state.plugins[1]!)).toBe('tpEscape');
    const view = { composing: true };
    expect(neutralizesEscape(view, { key: 'Escape', isComposing: false } as KeyboardEvent)).toBe(
      false,
    );
    expect(
      neutralizesEscape({ composing: false }, {
        key: 'Escape',
        isComposing: false,
      } as KeyboardEvent),
    ).toBe(true);
  });
});

describe('Tiptap mount and root (uwg-te-tab-engine r1, r12, r13; uwg-te-req-engine-7)', () => {
  it('V-004 unit part: a fresh div root is the container only child, removed by an idempotent destroy', () => {
    const { container, instance, context, editor } = mountTiptap({
      content: html('<p data-id="p1">quay</p>'),
    });
    const root = container.children[0]!;
    expect(root.tagName).toBe('DIV');
    expect(editor.view.dom).toBe(root);
    expect(context.adopted).toHaveLength(1);
    instance.destroy();
    instance.destroy();
    expect(container.children).toEqual([]);
    expect(context.released).toEqual(context.adopted);
    expect(editor.isDestroyed).toBe(true);
  });

  it('uwg-te-req-engine-8: a root moved into another document returns to its mount document before the engine is destroyed', () => {
    const { container, instance, editor } = mountTiptap({
      content: html('<p data-id="p1">quay</p>'),
    });
    const root = container.children[0]!;
    const adopted: { readonly node: unknown; readonly destroyed: boolean }[] = [];
    Object.assign(container.ownerDocument, {
      adoptNode: (node: FakeElement) => {
        adopted.push({ node, destroyed: editor.isDestroyed });
        node.remove();
        return node;
      },
    });
    Object.defineProperty(root, 'ownerDocument', { value: new FakeDocument(), configurable: true });
    instance.destroy();
    expect(adopted).toEqual([{ node: root, destroyed: false }]);
    expect([editor.isDestroyed, container.children]).toEqual([true, []]);

    // A root still in its mount document is destroyed in place.
    const unmoved = mountTiptap();
    const calls: unknown[] = [];
    Object.assign(unmoved.container.ownerDocument, {
      adoptNode: (node: unknown) => calls.push(node),
    });
    unmoved.instance.destroy();
    expect(calls).toEqual([]);
    expect(unmoved.container.children).toEqual([]);
  });

  it('V-006 unit part: ready follows the constructor once, with no history, content or state call', () => {
    const { context, instance } = mountTiptap({ content: html('<p data-id="p1">harbor</p>') });
    expect(context.calls).toEqual(['ready']);
    expect(instance.getState().history).toEqual({ undo: false, redo: false });
    expect(instance.getState().contentVersion).toBe(1);
  });

  it('V-060 unit part: root attributes go through the engine attributes, null removing one', () => {
    const { instance, view } = mountTiptap();
    // The adapter owns the root attributes: the engine's own role is not merged in.
    expect(view.attributes()).toEqual({ translate: 'no' });
    instance.setRootAttributes({
      role: 'textbox',
      'aria-label': 'Survey notes',
      'aria-multiline': 'true',
      tabindex: '0',
      spellcheck: 'true',
    });
    expect(view.attributes()).toEqual({
      role: 'textbox',
      translate: 'no',
      'aria-label': 'Survey notes',
      'aria-multiline': 'true',
      tabindex: '0',
      spellcheck: 'true',
    });
    instance.setRootAttributes({ tabindex: null, 'aria-disabled': 'true' });
    expect(view.attributes()).not.toHaveProperty('tabindex');
    expect(view.attributes()['aria-disabled']).toBe('true');
  });

  it('setEditable passes no update event and notifies state only', () => {
    const { instance, context, log } = mountTiptap();
    const before = instance.getState().version;
    instance.setEditable(false);
    expect(log.setEditable).toEqual([[false, false]]);
    expect(context.calls).toEqual(['ready', 'state']);
    expect(instance.getState()).toMatchObject({ editable: false, version: before + 1 });
    expect(instance.can({ type: 'text.insert', text: 'x' })).toBe(false);
  });

  it('focus places the selection and focuses the root; blur removes focus', async () => {
    const { instance, view } = mountTiptap({ content: html('<p data-id="p1">tide</p>') });
    await instance.focus('end');
    expect(view.hasFocus()).toBe(true);
    expect(instance.getState()).toMatchObject({
      focused: true,
      selection: { kind: 'text', anchor: { block: 'p1', offset: 4 } },
    });
    instance.blur();
    expect(view.dom.focused).toBe(false);
  });
});

describe('Tiptap base CSS (uwg-te-req-pres-2, uwg-te-tab-engine r2)', () => {
  it('V-066: the base CSS names no literal color and holds only editing mechanics', () => {
    expect(TIPTAP_BASE_CSS).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(|color-mix\(/iu);
    expect(TIPTAP_BASE_CSS).not.toMatch(/(?<![-\w])(?:color|background-color)\s*:/iu);
    // The only values that paint are transparent, which hide the native selection and caret.
    for (const [, value] of TIPTAP_BASE_CSS.matchAll(/(?:background|caret-color):\s*([^;]+);/gu))
      expect(value).toBe('transparent');
    for (const mechanic of [
      'white-space: pre-wrap',
      'overflow-wrap: break-word',
      'font-variant-ligatures: none',
      'tab-size: 2',
      'user-select: none',
      '.tp-te-cell-selected *::selection',
      '.tp-te-table-selection *::selection',
      '.ProseMirror-hideselection *::selection',
    ])
      expect(TIPTAP_BASE_CSS).toContain(mechanic);
    // No engine UI and no appearance: outlines, borders of selected nodes, fonts, spacing.
    expect(TIPTAP_BASE_CSS).not.toMatch(/outline|font-family|padding|ProseMirror-selectednode/u);
  });

  it('uwg-te-req-pres-2: lists inside list items are laid out in the editing root’s direction, never in the one an item’s dir="auto" resolves', () => {
    const rules = cssRules(TIPTAP_BASE_CSS);
    // The root records the direction it inherits from the widget, which lists take from it.
    const property = rules.get('.ProseMirror:dir(ltr)')?.get('--tp-te-direction');
    expect(property).toBe('ltr');
    expect(rules.get('.ProseMirror:dir(rtl)')?.get('--tp-te-direction')).toBe('rtl');
    expect(rules.get('.ProseMirror .tp-te-list .tp-te-list')?.get('direction')).toBe(
      'var(--tp-te-direction)',
    );
    // Items and the blocks in them keep resolving their own direction from their text.
    for (const [selector, declarations] of rules)
      if (/tp-te-(?:task-)?item|tp-te-paragraph/u.test(selector))
        expect(declarations.has('direction'), selector).toBe(false);
  });

  it('options.css replaces the base with a string or extends it with a function', () => {
    const replaced = mountTiptap({ engineOptions: { css: '.x{}' } });
    expect(replaced.context.adopted).toEqual(['.x{}']);
    const extended = mountTiptap({ engineOptions: { css: (base) => `${base}\n.y{}` } });
    expect(extended.context.adopted).toEqual([`${TIPTAP_BASE_CSS}\n.y{}`]);
    expect(mountTiptap().context.adopted).toEqual([TIPTAP_BASE_CSS]);
  });
});

describe('Tiptap notifications (uwg-te-req-engine-6, uwg-te-tab-engine r3, uwg-te-tab-reasons r1, r2)', () => {
  const caretAtEnd = {
    type: 'selection.set',
    selection: { kind: 'caret', block: 'p1', position: 'end' },
  } as const;
  const quiet = { reason: 'imperative-action', focus: false } as const;

  it('reports typing as input, engine history as history with reason engine, composition and cut', () => {
    const { view, context, instance } = mountTiptap({ content: html('<p data-id="p1">tide</p>') });
    instance.execute([caretAtEnd], quiet);
    view.dispatch(view.state.tr.insertText('s'));
    expect(context.changes.at(-1)).toEqual({ cause: 'input', reason: 'input' });
    // An undo that no widget key started, such as a beforeinput historyUndo of the Edit menu.
    TIPTAP_MODULES.history.undo(view.state, (tr) => view.dispatch(tr));
    expect(context.changes.at(-1)).toEqual({ cause: 'history', reason: 'engine' });
    // A widget undo is the request's action.
    view.dispatch(view.state.tr.insertText('s'));
    expect(instance.execute([{ type: 'history.undo' }], { reason: 'hotkey', focus: false })).toBe(
      true,
    );
    expect(context.changes.at(-1)).toMatchObject({
      cause: 'action',
      reason: 'hotkey',
      action: 'history.undo',
    });
    view.composing = true;
    view.dispatch(view.state.tr.insertText('x'));
    expect(context.changes.at(-1)).toEqual({ cause: 'composition', reason: 'input' });
    view.composing = false;
    view.dispatch(view.state.tr.insertText('y').setMeta('composition', 7));
    expect(context.changes.at(-1)).toEqual({ cause: 'composition', reason: 'input' });
    const end = view.state.selection.from;
    view.dispatch(view.state.tr.delete(end - 2, end).setMeta('uiEvent', 'cut'));
    expect(context.changes.at(-1)).toEqual({ cause: 'cut', reason: 'input' });
    // A change of the selection or the editability only notifies state.
    const calls = context.calls.length;
    instance.execute(
      [{ type: 'selection.set', selection: { kind: 'caret', block: 'p1', position: 'start' } }],
      quiet,
    );
    instance.setEditable(false);
    expect(context.calls.slice(calls)).toEqual(['state', 'state']);
  });

  it('notifies nothing once the mount signal aborted', () => {
    const { view, context, instance } = mountTiptap({ content: html('<p data-id="p1">tide</p>') });
    instance.execute([caretAtEnd], quiet);
    context.controller.abort();
    const calls = [...context.calls];
    view.dispatch(view.state.tr.insertText('s'));
    instance.setContent('<p>calm</p><table><tr><td>x</td></tr></table>', 'html');
    instance.execute([{ type: 'text.insert', text: '!' }], quiet);
    instance.setEditable(false);
    expect(context.calls).toEqual(calls);
  });

  it('reports the diagnostics of an applied action, never those of can', () => {
    const { modules } = stubTiptapModules({ tables: false });
    const engine = createTiptapEngine(modules);
    const context = stubContext({ content: html('<p data-id="p1">tide</p>') });
    const instance = engine.mount(
      fakeContainer() as unknown as HTMLElement,
      context,
    ) as TextEditorEngineInstance;
    const action = {
      type: 'content.insert',
      at: { kind: 'caret', block: 'p1', position: 'end' },
      content: {
        kind: 'blocks',
        blocks: [
          {
            type: 'table',
            headerRow: false,
            headerColumn: false,
            rows: [{ cells: [{ paragraphs: [{ content: [{ type: 'text', text: 'x' }] }] }] }],
          },
        ],
      },
    } as const;
    expect(instance.can(action)).toBe(true);
    expect(context.diagnostics).toEqual([]);
    expect(instance.execute([action], quiet)).toBe(true);
    expect(context.diagnostics.map((entry) => entry.code)).toEqual([
      'text-editor-content-converted',
    ]);
  });
});

describe('Tiptap drag, read-only guard and CSP (uwg-te-req-content-6, uwg-te-req-engine-5, uwg-te-req-pres-2)', () => {
  it('a dragstart from inside the root is cancelled and no drop cursor exists', () => {
    const { view, log } = mountTiptap();
    let prevented = false;
    const handlers = view.props.handleDOMEvents as Record<
      string,
      (view: unknown, event: unknown) => boolean
    >;
    expect(handlers.dragstart!(view, { preventDefault: () => (prevented = true) })).toBe(true);
    expect(prevented).toBe(true);
    expect(log.plugins[0]!.some((name) => /dropcursor|gapcursor/iu.test(name))).toBe(false);
  });

  it('while not editable every mutating action but content.set is refused', () => {
    const { instance, context } = mountTiptap({ content: html('<p data-id="p1">tide</p>') });
    instance.setEditable(false);
    const quiet = { reason: 'imperative-action', focus: false } as const;
    expect(instance.execute([{ type: 'text.insert', text: 'x' }], quiet)).toBe(false);
    expect(instance.execute([{ type: 'mark.toggle', mark: 'bold' }], quiet)).toBe(false);
    expect(instance.can({ type: 'blocks.delete', ids: ['p1'] })).toBe(false);
    expect(
      instance.execute(
        [{ type: 'selection.set', selection: { kind: 'caret', block: 'p1', position: 'end' } }],
        quiet,
      ),
    ).toBe(true);
    expect(
      instance.execute(
        [{ type: 'content.set', content: 'calm', format: 'text', history: 'push' }],
        quiet,
      ),
    ).toBe(true);
    expect(instance.getContent('text')).toBe('calm');
    expect(context.changes.at(-1)).toMatchObject({ cause: 'content' });
  });

  it('no element the engine renders without a view carries a style attribute', () => {
    const { view } = mountTiptap();
    const { schema } = view.state;
    const hasStyle = (spec: unknown): boolean =>
      Array.isArray(spec) &&
      spec.some((part) =>
        Array.isArray(part)
          ? hasStyle(part)
          : typeof part === 'object' && part !== null && Object.hasOwn(part, 'style'),
      );
    // The table renders through its view, whose sizes are CSSOM writes.
    const viewed = new Set(['table']);
    for (const [name, type] of Object.entries(schema.nodes)) {
      if (viewed.has(name) || name === 'doc' || name === 'text') continue;
      const node = type.createAndFill();
      const toDOM = (type.spec as { toDOM?: (node: unknown) => unknown }).toDOM;
      if (node && toDOM) expect(hasStyle(toDOM(node)), name).toBe(false);
    }
    for (const [name, type] of Object.entries(schema.marks)) {
      const toDOM = (type.spec as { toDOM?: (mark: unknown, inline: boolean) => unknown }).toDOM;
      if (toDOM)
        expect(
          hasStyle(toDOM(type.create({ color: 'blue', href: 'https://a.example/' }), true)),
          name,
        ).toBe(false);
    }
  });
});

describe('uwg-te-req-engine-5, uwg-te-lis-up-i2: the undo steps of a mount', () => {
  it('a code exit and its new paragraph are one undo step', () => {
    const cases: [string, TextEditorSelectionInput, string][] = [
      [
        '<pre data-id="k1"><code>ab\n\n</code></pre>',
        { kind: 'caret', block: 'k1', position: 'end' },
        'Enter',
      ],
      [
        '<p data-id="p1">a</p><pre data-id="k1"><code>let x</code></pre>',
        { kind: 'caret', block: 'k1', position: 'end' },
        'ArrowDown',
      ],
      [
        '<pre data-id="k1"><code>let x</code></pre><p data-id="p1">a</p>',
        { kind: 'caret', block: 'k1', position: 'start' },
        'ArrowUp',
      ],
    ];
    for (const [source, caret, key] of cases) {
      const { instance, keys } = keyedTiptap(source);
      selectIn(instance, caret);
      const before = htmlOf(instance);
      expect(keys.press(key), key).toBe(true);
      expect(htmlOf(instance), key).not.toBe(before);
      expect(undoOnce(instance), key).toBe(true);
      expect(htmlOf(instance), key).toBe(before);
    }
  });

  it('a list merge appended to an action belongs to its undo step', () => {
    const { instance } = keyedTiptap(
      '<ul><li data-id="b1"><p>bullet one</p></li></ul><ol><li data-id="o1"><p>ordered one</p></li></ol><ul><li data-id="b2"><p>bullet two</p></li></ul>',
    );
    const before = htmlOf(instance);
    selectIn(instance, {
      kind: 'text',
      anchor: { block: 'b1', offset: 6 },
      head: { block: 'o1', offset: 7 },
    });
    expect(runActions(instance, { type: 'text.insert', text: 'xy' })).toBe(true);
    expect(htmlOf(instance).match(/<ul>/gu)).toHaveLength(1);
    expect(undoOnce(instance)).toBe(true);
    expect(htmlOf(instance)).toBe(before);
  });

  it('a pushed setContent is an undo step of its own', () => {
    const { instance, view } = mountTiptap({ content: html('<p data-id="p1">old</p>') });
    instance.setContent('<p data-id="p2">new</p>', 'html', {
      history: 'push',
      reason: 'imperative-action',
    });
    // Typed within 500 ms, as the engine dispatches it.
    view.dispatch(view.state.tr.insertText('x', 1));
    expect(htmlOf(instance)).toBe('<p data-id="p2">xnew</p>');
    expect(undoOnce(instance)).toBe(true);
    expect(htmlOf(instance)).toBe('<p data-id="p2">new</p>');
    expect(undoOnce(instance)).toBe(true);
    expect(htmlOf(instance)).toBe('<p data-id="p1">old</p>');
  });

  it('typing, Enter and Shift+Enter group within 500 ms; typing over a selection is one step', () => {
    const { instance, keys } = keyedTiptap('<p data-id="p1">x</p>');
    selectIn(instance, { kind: 'caret', block: 'p1', position: 'end' });
    keys.type('abc');
    expect(keys.press('Enter')).toBe(true);
    keys.type('def');
    expect(keys.press('Shift-Enter')).toBe(true);
    keys.type('g');
    expect(undoOnce(instance)).toBe(true);
    expect(htmlOf(instance)).toBe('<p data-id="p1">x</p>');
    // Short of the document's first text point: the whole-document selection is
    // `selection.test.ts`'s.
    const over = keyedTiptap('<p data-id="p1">abcd</p>');
    selectIn(over.instance, {
      kind: 'text',
      anchor: { block: 'p1', offset: 1 },
      head: { block: 'p1', offset: 4 },
    });
    over.keys.type('xy');
    expect(htmlOf(over.instance)).toBe('<p data-id="p1">axy</p>');
    expect(undoOnce(over.instance)).toBe(true);
    expect(htmlOf(over.instance)).toBe('<p data-id="p1">abcd</p>');
  });
});

describe('uwg-te-req-engine-5: Enters at the start of a block group under the 500 ms rule', () => {
  const BLOCKS: [string, string][] = [
    ['heading', '<h2 data-id="b1">Title</h2>'],
    ['quote', '<blockquote data-id="b1">Quoted</blockquote>'],
    ['callout', '<aside data-type="callout" data-id="b1" data-tone="note">Tip</aside>'],
    ['list item', '<ul><li data-id="b1"><p>Item</p></li></ul>'],
    [
      'task item',
      '<ul data-type="task"><li data-id="b1" data-checked="true"><p>Task</p></li></ul>',
    ],
    ['paragraph', '<p data-id="b1">Plain</p>'],
  ];

  /** The undo steps back to the content before the keys, or -1 if undo never reaches it. */
  function undoSteps(instance: TextEditorEngineInstance, before: string): number {
    for (let steps = 1; steps <= 5; steps += 1) {
      if (!undoOnce(instance)) return -1;
      if (htmlOf(instance) === before) return steps;
    }
    return -1;
  }

  it('two quick Enters at the start of a heading, quote, callout or list item undo in one step, with the typing after them', () => {
    // The two Enters leave two empty blocks before the block, which keeps its identifier.
    const twice: Record<string, string> = {
      heading: '<p data-id="NEW"></p>\n<p data-id="NEW"></p>\n<h2 data-id="b1">Title</h2>',
      quote:
        '<p data-id="NEW"></p>\n<p data-id="NEW"></p>\n<blockquote data-id="b1"><p>Quoted</p></blockquote>',
      callout:
        '<p data-id="NEW"></p>\n<p data-id="NEW"></p>\n<aside data-id="b1" data-type="callout" data-tone="note">Tip</aside>',
      'list item':
        '<ul><li data-id="NEW"><p></p></li><li data-id="NEW"><p></p></li><li data-id="b1"><p>Item</p></li></ul>',
      'task item':
        '<ul data-type="task"><li data-id="NEW" data-checked="false"><p></p></li><li data-id="NEW" data-checked="false"><p></p></li><li data-id="b1" data-checked="true"><p>Task</p></li></ul>',
      paragraph: '<p data-id="NEW"></p>\n<p data-id="NEW"></p>\n<p data-id="b1">Plain</p>',
    };
    const outcomes: Record<string, unknown> = {};
    for (const [label, source] of BLOCKS)
      for (const typed of ['', 'x']) {
        const { instance, keys } = keyedTiptap(source, { nodes: corpusNodes });
        selectIn(instance, { kind: 'caret', block: 'b1', position: 'start' });
        const before = htmlOf(instance);
        const pressed = [keys.press('Enter'), keys.press('Enter')];
        const shape = shapeOf(instance);
        keys.type(typed);
        outcomes[`${label} ${typed ? 'and typing' : 'only'}`] = {
          pressed,
          shape,
          steps: undoSteps(instance, before),
        };
      }
    expect(outcomes).toEqual(
      Object.fromEntries(
        BLOCKS.flatMap(([label]) =>
          ['only', 'and typing'].map((typed) => [
            `${label} ${typed}`,
            { pressed: [true, true], shape: twice[label], steps: 1 },
          ]),
        ),
      ),
    );
  });
});

describe('uwg-te-req-engine-4, uwg-te-req-pres-4: a selection the API sets while read-only', () => {
  /**
   * A read-only mount whose view gives each position a DOM point named after it, and whose
   * document records the points written into its selection, anchor first.
   */
  function readOnlyMount() {
    const mounted = mountTiptap({
      editable: false,
      content: html('<p data-id="a">ab</p><p data-id="b">cd</p><hr data-id="d">'),
    });
    const writes: unknown[][] = [];
    const view = mounted.view as unknown as Record<string, unknown>;
    view.domAtPos = (pos: number, side = 0) => ({ node: `@${pos}`, offset: side });
    Object.assign(mounted.view.dom.ownerDocument, {
      getSelection: () => ({
        rangeCount: 0,
        setBaseAndExtent: (...args: unknown[]) => void writes.push(args),
      }),
    });
    const set = (selection: TextEditorSelectionInput, focus = true) =>
      mounted.instance.execute([{ type: 'selection.set', selection }], {
        reason: 'imperative-action',
        focus,
      });
    return { ...mounted, writes, set };
  }

  const RANGE: TextEditorSelectionInput = {
    kind: 'text',
    anchor: { block: 'a', offset: 1 },
    head: { block: 'b', offset: 1 },
  };

  it('is written into the DOM selection of the focused root, anchor first, so that the native paint and a copy follow it', () => {
    const { instance, view, writes, set } = readOnlyMount();
    view.dom.focus();
    expect(instance.getState()).toMatchObject({ editable: false, focused: true });
    // Positions 2 and 6: offset 1 of "ab" and of "cd", each leaning on the text before.
    expect(set(RANGE)).toBe(true);
    expect(writes).toEqual([['@2', -1, '@6', -1]]);
    // A backward range keeps its direction.
    expect(
      set({ kind: 'text', anchor: { block: 'b', offset: 1 }, head: { block: 'a', offset: 0 } }),
    ).toBe(true);
    expect(writes[1]).toEqual(['@6', -1, '@1', -1]);
    // The request that leaves focus alone writes it too while the root holds focus.
    expect(set(caretAt('a', 2), false)).toBe(true);
    expect(writes[2]).toEqual(['@3', -1, '@3', -1]);
  });

  it('is written when the root takes focus with it, and never into an unfocused root, for a block selection or while editable', async () => {
    const { instance, view, writes, set } = readOnlyMount();
    expect(set(RANGE, false)).toBe(true);
    expect(writes).toEqual([]);
    await instance.focus();
    expect(view.hasFocus()).toBe(true);
    expect(instance.getState().selection).toMatchObject({
      kind: 'text',
      anchor: { block: 'a', offset: 1 },
    });
    expect(writes).toEqual([['@2', -1, '@6', -1]]);
    expect(set({ kind: 'blocks', ids: ['d'] })).toBe(true);
    expect(writes).toHaveLength(1);
    instance.setEditable(true);
    expect(set(RANGE)).toBe(true);
    expect(writes).toHaveLength(1);
  });
});

describe('uwg-te-req-engine-6, uwg-te-req-engine-4: notifications without a content change', () => {
  it('a list that changes nothing adds no undo step, notifies state only and keeps contentVersion', () => {
    const { instance, context } = mountTiptap({ content: html('<p data-id="p1">calm sea</p>') });
    selectIn(instance, {
      kind: 'text',
      anchor: { block: 'p1', offset: 0 },
      head: { block: 'p1', offset: 8 },
    });
    const { contentVersion } = instance.getState();
    context.calls.length = 0;
    expect(runActions(instance, { type: 'mark.clear' })).toBe(true);
    expect(context.calls).toEqual(['state']);
    expect(instance.getState().contentVersion).toBe(contentVersion);
    expect(instance.getState().history.undo).toBe(false);
  });

  it('composition start and end notify state once the engine flipped its flag', async () => {
    const { instance, view, context, log } = mountTiptap({
      content: html('<p data-id="p1">a</p>'),
    });
    const props = log.editorOptions[0]!.editorProps as {
      readonly handleDOMEvents: Readonly<
        Record<string, (view: unknown, event: unknown) => boolean>
      >;
    };
    context.calls.length = 0;
    // The engine flips its flag in its own handler, which runs after the adapter's.
    expect(props.handleDOMEvents.compositionstart?.(view, {})).toBe(false);
    view.composing = true;
    await Promise.resolve();
    expect(context.calls).toEqual(['state']);
    expect(instance.getState().composing).toBe(true);
    expect(props.handleDOMEvents.compositionend?.(view, {})).toBe(false);
    view.composing = false;
    await Promise.resolve();
    expect(context.calls).toEqual(['state', 'state']);
    expect(instance.getState().composing).toBe(false);
  });
});

describe('a cleared selection and Tab (uwg-te-tab-keymap-host)', () => {
  it('V-270: leaves Tab to the browser while the selection is cleared, so no engine key acts at the resting point', () => {
    const { instance, view, log } = mountTiptap({
      content: html('<ul><li><p data-id="a">one</p></li><li><p data-id="b">two</p></li></ul>'),
    });
    const keydown = (
      log.editorOptions[0]!.editorProps as {
        readonly handleDOMEvents: Readonly<
          Record<string, (view: unknown, event: unknown) => boolean>
        >;
      }
    ).handleDOMEvents.keydown!;
    const key = (name: string, shiftKey = false) => ({ key: name, shiftKey, isComposing: false });
    selectIn(instance, caretAt('b', 1));
    // A placed caret: Tab is the engine's (nests the list item).
    expect(keydown(view, key('Tab'))).toBe(false);
    expect(runActions(instance, { type: 'selection.set', selection: { kind: 'none' } })).toBe(true);
    expect(instance.getState().selection).toEqual({ kind: 'none' });
    // Cleared: Tab and Shift+Tab are claimed before the engine's keymaps and stay cleared.
    expect(keydown(view, key('Tab'))).toBe(true);
    expect(keydown(view, key('Tab', true))).toBe(true);
    expect(instance.getState().selection).toEqual({ kind: 'none' });
    // An editing key places the resting caret and is the engine's again, Tab with it.
    expect(keydown(view, key('a'))).toBe(false);
    expect(instance.getState().selection).toMatchObject({ kind: 'text' });
    expect(keydown(view, key('Tab'))).toBe(false);
  });
});

describe('uwg-te-tab-engine r12, r13: the editing root and its first selection', () => {
  it('the root role is the widget’s, and null removes it', () => {
    const { instance, view } = mountTiptap();
    expect(view.attributes()).not.toHaveProperty('role');
    instance.setRootAttributes({ role: 'textbox', 'aria-multiline': 'true' });
    expect(view.attributes()).toMatchObject({ role: 'textbox', 'aria-multiline': 'true' });
    instance.setRootAttributes({ role: null });
    expect(view.attributes()).not.toHaveProperty('role');
  });

  it('after mount and setContent no selection is placed; an insertion without a place goes to the end', () => {
    const source = '<p data-id="p1">first</p><p data-id="p2">second</p>';
    const { instance } = mountTiptap({ content: html(source) });
    expect(instance.getState().selection).toEqual({ kind: 'none' });
    expect(instance.getState().block).toBeNull();
    expect(runActions(instance, { type: 'blocks.insert', kind: 'divider' })).toBe(true);
    expect(shapeOf(instance)).toBe(
      '<p data-id="p1">first</p>\n<p data-id="p2">second</p>\n<hr data-id="NEW">',
    );
    selectIn(instance, caretAt('p1', 2));
    instance.setContent('<hr data-id="d1"><p data-id="p3">x</p>', 'html');
    expect(instance.getState().selection).toEqual({ kind: 'none' });
    instance.setContent('<p data-id="p4">y</p>', 'html', { history: 'push' });
    expect(instance.getState().selection).toEqual({ kind: 'none' });
  });

  it('focus() without an earlier selection puts the caret at the first text point, never on an atom', async () => {
    const { instance } = mountTiptap({
      content: html(
        '<hr data-id="d1"><p data-id="p1">a</p><hr data-id="d2"><p data-id="p2">bc</p>',
      ),
    });
    await instance.focus();
    expect(instance.getState().selection).toMatchObject({
      kind: 'text',
      head: { block: 'p1', offset: 0 },
    });
    await instance.focus('end');
    expect(instance.getState().selection).toMatchObject({
      kind: 'text',
      head: { block: 'p2', offset: 2 },
    });
    await instance.focus('start');
    expect(instance.getState().selection).toMatchObject({
      kind: 'text',
      head: { block: 'p1', offset: 0 },
    });
    const table = mountTiptap({
      content: html(
        '<table data-id="t1"><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr></tbody></table><p data-id="p1">z</p>',
      ),
    });
    await table.instance.focus();
    expect(table.instance.getState().selection).toMatchObject({
      kind: 'text',
      head: { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 },
    });
  });

  it('uwg-te-req-engine-10: with no selection placed the caret and selection geometry is empty; a placed caret measures', async () => {
    const { instance, view } = mountTiptap({ content: html('<p data-id="p1">first</p>') });
    // A view whose DOM positions are text positions and whose collapsed ranges measure, so that
    // only the placement of the selection decides what the instance answers.
    const text = { nodeType: 3 };
    const measuring = view as unknown as Record<string, unknown>;
    measuring.domAtPos = () => ({ node: text, offset: 1 });
    measuring.nodeDOM = () => ({ nodeType: 1 });
    (view.dom.ownerDocument as unknown as Record<string, unknown>).createRange = () => {
      const rect = { left: 10, right: 10, top: 0, bottom: 20, width: 0, height: 20, x: 10, y: 0 };
      return {
        setStart: () => undefined,
        setEnd: () => undefined,
        getClientRects: () => [{ ...rect, toJSON: () => rect }],
      };
    };
    expect(instance.getState().selection).toEqual({ kind: 'none' });
    expect(instance.caretRect()).toBeNull();
    expect(instance.selectionRects()).toEqual([]);
    await instance.focus();
    expect(instance.getState().selection).toMatchObject({ kind: 'text', empty: true });
    expect(instance.caretRect()?.height).toBe(20);
    instance.setContent('<p data-id="p2">second</p>', 'html');
    expect(instance.caretRect()).toBeNull();
  });
});
