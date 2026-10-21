/**
 * Tests of the engine configuration of the Tiptap adapter: the chords it reserves, and the
 * elements its node views and render specs write.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { MODIFIED_ENTER_CHORDS } from '../shared/reserved-keys.js';
import { createTiptapEngine } from './index.js';
import { editingBindings } from './keymap.js';
import {
  createContentStops,
  linkMarkView,
  stoppedTableView,
  taskItemView,
  TIPTAP_RESERVED_KEYS,
  writeContentStops,
  type NodeViewProps,
  type TiptapContentStops,
} from './schema.js';
import { TIPTAP_MODULES, headlessTiptap } from './tiptap-stubs.test.js';
import { type TiptapNodeLike } from './modules.js';

describe('uwg-te-req-engine-11, uwg-te-tab-engine r11: the chords the Tiptap engine reserves', () => {
  it('reservedKeys are the chords the engine still prevents or acts on, read from its sources', () => {
    const require = createRequire(import.meta.url);
    const view = readFileSync(require.resolve('prosemirror-view'), 'utf8');
    const capture = /function captureKeyDown\(view, event\) \{([\s\S]*?)\n\}/u.exec(view)?.[1];
    expect(capture).toBeDefined();
    // The view prevents the bare Mod chords: `mods == (mac ? "m" : "c") && (code == 66 || …)`.
    const branch = /mods == \(mac \? "m" : "c"\) &&\s*\(([^)]*)\)/u.exec(capture!)?.[1];
    const codes = [...(branch ?? '').matchAll(/code == (\d+)/gu)].map((match) => Number(match[1]));
    const prevented = codes.map((code) => `Mod+${String.fromCharCode(code).toLowerCase()}`);
    expect(prevented).toEqual(['Mod+b', 'Mod+i', 'Mod+y', 'Mod+z']);
    // Mod+Shift+Z passes the view, and the browser's native redo reaches the history plugin.
    const history = readFileSync(require.resolve('prosemirror-history'), 'utf8');
    expect(history).toMatch(/inputType == "historyRedo" \? redo/u);
    // The view prevents Enter whatever its modifiers once every key handler declined it: the
    // branch `else if (code == 13 || code == 27) return true` checks no modifier. Escape (27) is
    // claimed earlier by the adapter's neutralizer, so it is never reserved.
    expect(capture).toMatch(/else if \(code == 13 \|\| code == 27\) \{[^}]*?return true;\s*\}/u);
    // On iOS only a plain Enter leaves that path; on Chrome for Android the view skips Enter, and
    // the block the browser inserts is replayed as a plain Enter, so the engine acts on the chord.
    expect(view).toMatch(
      /ios && event\.keyCode == 13 && !event\.ctrlKey && !event\.altKey && !event\.metaKey/u,
    );
    expect(view).toMatch(/if \(android && chrome && event\.keyCode == 13\)\s*return;/u);
    // The adapter keymap binds Enter and Shift+Enter only, and a keymap matches a binding by its
    // exact modifiers, so every other Enter chord reaches the view's branch.
    const bindings = editingBindings(headlessTiptap().env, {
      view: {} as never,
      commands: {} as never,
    });
    const enterBindings = Object.keys(bindings).filter((name) => /(?:^|-)Enter$/u.test(name));
    expect(enterBindings).toEqual(['Enter', 'Shift-Enter']);
    const bound = new Set(
      enterBindings.map((name) => name.split('-').slice(0, -1).sort().join('+')),
    );
    const modifierSets = ['Ctrl', 'Meta', 'Alt', 'Shift'].reduce<string[][]>(
      (sets, modifier) => [...sets, ...sets.map((set) => [...set, modifier])],
      [[]],
    );
    const enterChords = modifierSets
      .filter((set) => !bound.has([...set].sort().join('+')))
      .map((set) => [...set, 'Enter'].join('+'));
    expect(enterChords.sort()).toEqual([...MODIFIED_ENTER_CHORDS].sort());
    expect([...TIPTAP_RESERVED_KEYS]).toEqual([
      ...prevented,
      'Mod+Shift+z',
      ...MODIFIED_ENTER_CHORDS,
    ]);
    for (const chord of ['Mod+a', 'Escape', 'Enter', 'Shift+Enter'])
      expect(TIPTAP_RESERVED_KEYS).not.toContain(chord);
    expect(createTiptapEngine(TIPTAP_MODULES).reservedKeys).toBe(TIPTAP_RESERVED_KEYS);
    expect(Object.isFrozen(TIPTAP_RESERVED_KEYS)).toBe(true);
  });
});

describe('uwg-te-lis-up-i2, uwg-te-tab-vocabulary: what node views and render specs write', () => {
  afterEach(() => vi.unstubAllGlobals());

  /** A minimal element for node views and the table view, in Node. */
  class FakeElement {
    readonly children: FakeElement[] = [];
    readonly attributes = new Map<string, string>();
    readonly style: Record<string, unknown> = {
      textAlign: '',
      width: '',
      minWidth: '',
      cssText: '',
      setProperty(name: string, value: string) {
        this[name.replace(/-(\w)/gu, (_, letter: string) => letter.toUpperCase())] = value;
      },
      removeProperty(name: string) {
        this[name.replace(/-(\w)/gu, (_, letter: string) => letter.toUpperCase())] = '';
      },
    };
    className = '';
    dir = '';
    contentEditable = 'inherit';
    draggable = true;
    parentNode: FakeElement | null = null;
    constructor(readonly tagName: string) {}
    readonly classList = {
      toggle: (name: string, on: boolean) => {
        const names = new Set(this.className.split(' ').filter(Boolean));
        if (on) names.add(name);
        else names.delete(name);
        this.className = [...names].join(' ');
      },
      contains: (name: string) => this.className.split(' ').includes(name),
    };
    get firstChild(): FakeElement | null {
      return this.children[0] ?? null;
    }
    get nextSibling(): FakeElement | null {
      const siblings = this.parentNode?.children ?? [];
      return siblings[siblings.indexOf(this) + 1] ?? null;
    }
    appendChild(child: FakeElement): FakeElement {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }
    setAttribute(name: string, value: string): void {
      this.attributes.set(name, value);
    }
    removeAttribute(name: string): void {
      this.attributes.delete(name);
    }
  }

  const fakeDocument = { createElement: (tag: string) => new FakeElement(tag) };

  it('a list item resolves its direction from its text; other paragraphs keep dir="auto"', () => {
    const { editor, state } = headlessTiptap({
      blocks: [
        { type: 'paragraph', id: 'p0', content: [{ type: 'text', text: 'calm' }] },
        { type: 'list-bullet', id: 'a', content: [{ type: 'text', text: 'one' }] },
        { type: 'list-task', id: 't', checked: false, content: [{ type: 'text', text: 'two' }] },
        {
          type: 'table',
          id: 't1',
          rows: [{ cells: [{ blocks: [{ type: 'paragraph', content: [] }] }] }],
        },
      ],
    });
    const { nodeViews } = editor.extensionManager as unknown as {
      readonly nodeViews: Readonly<Record<string, (...args: unknown[]) => NodeViewLike>>;
    };
    const view = { dom: { ownerDocument: fakeDocument }, state };
    const dirs: [string, string][] = [];
    state.doc.descendants((node: TiptapNodeLike, pos: number) => {
      if (node.type.name !== 'paragraph') return true;
      const rendered = nodeViews.paragraph!(node, view, () => pos, [], undefined);
      dirs.push([state.doc.resolve(pos).parent.type.name, (rendered.dom as FakeElement).dir]);
      return false;
    });
    expect(dirs).toEqual([
      ['doc', 'auto'],
      ['listItem', ''],
      ['taskItem', ''],
      ['tableCell', 'auto'],
      ['doc', 'auto'],
    ]);
    const item = state.doc.child(1).child(0);
    expect(state.schema.nodes.listItem!.spec).toBeDefined();
    const spec = (state.schema.nodes.listItem!.spec as { toDOM: (node: unknown) => unknown }).toDOM(
      item,
    );
    expect(spec).toEqual(['li', expect.objectContaining({ dir: 'auto' }), 0]);
  });

  it('dividers and image hosts carry dir="auto"; lists and the table wrapper none', () => {
    const { editor, state } = headlessTiptap({
      blocks: [
        { type: 'divider', id: 'd1' },
        { type: 'image', id: 'i1', src: 'https://example.com/a.png', alt: 'a' },
        { type: 'list-bullet', id: 'a', content: [] },
      ],
    });
    const divider = (
      state.schema.nodes.horizontalRule!.spec as { toDOM: (node: unknown) => unknown }
    ).toDOM(state.doc.child(0));
    expect(divider).toEqual(['hr', expect.objectContaining({ dir: 'auto' })]);
    const { nodeViews } = editor.extensionManager as unknown as {
      readonly nodeViews: Readonly<Record<string, (...args: unknown[]) => NodeViewLike>>;
    };
    const image = nodeViews.image!(
      state.doc.child(1),
      { dom: { ownerDocument: fakeDocument }, state },
      () => 0,
      [],
      undefined,
    );
    expect((image.dom as FakeElement).dir).toBe('auto');
    const list = (
      state.schema.nodes.bulletList!.spec as { toDOM: (node: unknown) => unknown[] }
    ).toDOM(state.doc.child(2));
    expect(list[1]).not.toHaveProperty('dir');
  });

  it('a table view built while its table holds a cell range paints the table selection', () => {
    vi.stubGlobal('document', fakeDocument);
    const { editor, state } = headlessTiptap({
      blocks: [
        {
          type: 'table',
          id: 't1',
          rows: [
            {
              cells: [
                { blocks: [{ type: 'paragraph', content: [] }] },
                { blocks: [{ type: 'paragraph', content: [] }] },
              ],
            },
          ],
        },
        {
          type: 'table',
          id: 't2',
          rows: [{ cells: [{ blocks: [{ type: 'paragraph', content: [] }] }] }],
        },
      ],
    });
    const { tables } = TIPTAP_MODULES;
    const table = state.doc.child(0);
    const other = state.doc.child(1);
    const first = 1;
    const last = 1 + table.child(0).child(0).nodeSize;
    const selected = state.apply(
      state.tr.setSelection(tables!.CellSelection.create(state.doc, first + 1, last + 1)),
    );
    const { nodeViews } = editor.extensionManager as unknown as {
      readonly nodeViews: Readonly<Record<string, (...args: unknown[]) => NodeViewLike>>;
    };
    const build = (node: TiptapNodeLike, on: unknown, pos: number) =>
      nodeViews.table!(
        node,
        { dom: { ownerDocument: fakeDocument }, state: on },
        () => pos,
        [],
        undefined,
      ) as unknown as {
        readonly table: FakeElement;
      };
    expect(build(table, selected, 0).table.classList.contains('tp-te-table-selection')).toBe(true);
    expect(
      build(other, selected, table.nodeSize).table.classList.contains('tp-te-table-selection'),
    ).toBe(false);
    const caret = build(table, state, 0);
    expect(caret.table.classList.contains('tp-te-table-selection')).toBe(false);
  });

  it('a table without widths sizes automatically; committed widths keep the 48-pixel floor', () => {
    vi.stubGlobal('document', fakeDocument);
    const cell = { blocks: [{ type: 'paragraph' as const, content: [] }] };
    const { editor, state } = headlessTiptap({
      blocks: [
        { type: 'table', id: 't1', rows: [{ cells: [cell, cell, cell] }] },
        { type: 'table', id: 't2', widths: [48, 120], rows: [{ cells: [cell, cell] }] },
      ],
    });
    const { nodeViews } = editor.extensionManager as unknown as {
      readonly nodeViews: Readonly<Record<string, (...args: unknown[]) => NodeViewLike>>;
    };
    const build = (node: TiptapNodeLike) =>
      nodeViews.table!(
        node,
        { dom: { ownerDocument: fakeDocument }, state },
        () => 0,
        [],
        undefined,
      ) as unknown as {
        readonly table: FakeElement;
        readonly colgroup: FakeElement;
      };
    const automatic = build(state.doc.child(0));
    expect(automatic.table.style.minWidth).toBe('');
    expect(automatic.colgroup.children.map((col) => col.style.minWidth)).toEqual(['', '', '']);
    const fixed = build(state.doc.child(1));
    expect(fixed.colgroup.children.map((col) => col.style.width)).toEqual(['48px', '120px']);
    expect(fixed.table.style.width).toBe('168px');
  });
});

/** A node view, as the engine's node view factories return it. */
interface NodeViewLike {
  readonly dom: unknown;
}

describe('uwg-te-req-prop-3, node-001228: content stops while the root is no tab stop', () => {
  /** An element with attributes, as the views write them. */
  class StopElement {
    readonly attributes = new Map<string, string>();
    className = '';
    tabIndex = 0;
    type = '';
    checked = false;
    disabled = false;
    dir = '';
    readonly children: StopElement[] = [];
    readonly classList = { toggle: () => true };
    readonly ownerDocument = { createElement: (tag: string) => new StopElement(tag) };
    constructor(readonly tagName: string) {}
    appendChild(child: StopElement): StopElement {
      this.children.push(child);
      return child;
    }
    setAttribute(name: string, value: string): void {
      this.attributes.set(name, value);
    }
    getAttribute(name: string): string | null {
      return this.attributes.get(name) ?? null;
    }
    hasAttribute(name: string): boolean {
      return this.attributes.has(name);
    }
    removeAttribute(name: string): void {
      this.attributes.delete(name);
    }
    addEventListener(): void {}
    removeEventListener(): void {}
    contains(node: unknown): boolean {
      return node === this || this.children.some((child) => child.contains(node));
    }
  }
  const root = new StopElement('div');
  const link = (stops: TiptapContentStops) =>
    linkMarkView(stops)({
      view: { dom: root as unknown as HTMLElement },
      HTMLAttributes: { href: 'https://example.com/tides' },
    });

  it('a link renders as the link mark does and registers while it lives', () => {
    const stops = createContentStops();
    const view = link(stops);
    const dom = view.dom as unknown as StopElement;
    expect([dom.tagName, dom.className, [...dom.attributes]]).toEqual([
      'a',
      'tp-te-link',
      [['href', 'https://example.com/tides']],
    ]);
    expect(view.contentDOM).toBe(view.dom);
    expect(stops.links.has(view.dom)).toBe(true);
    expect(view.ignoreMutation({ type: 'attributes', target: view.dom })).toBe(true);
    expect(view.ignoreMutation({ type: 'childList', target: view.dom })).toBe(false);
    view.destroy();
    expect(stops.links.size).toBe(0);
  });

  it('links, task checkboxes and table wrappers follow the registry, created before or after a change', () => {
    const stops = createContentStops();
    const before = link(stops).dom as unknown as StopElement;
    const { state } = headlessTiptap({
      blocks: [
        {
          type: 'list-task',
          id: 't1',
          checked: false,
          content: [{ type: 'text', text: 'done' }],
          children: [],
        },
      ],
    });
    const task = taskItemView(
      { taskCheckbox: 'Done' },
      stops,
    )({
      node: state.doc.child(0).child(0),
      view: { dom: root as unknown as HTMLElement },
      HTMLAttributes: {},
    } as unknown as NodeViewProps);
    const checkbox = (task.dom as unknown as StopElement).children[0]!.children[0]!;
    class Base {
      readonly dom = new StopElement('div') as unknown as HTMLElement;
      readonly table = new StopElement('table') as unknown as HTMLTableElement;
      readonly colgroup = new StopElement('colgroup') as unknown as HTMLTableColElement;
      readonly contentDOM = this.dom;
      ignoreMutation(mutation: { readonly type: string; readonly target: Node }): boolean {
        return mutation.target === (this.table as unknown as Node);
      }
    }
    const Wrapped = stoppedTableView(Base as never, stops);
    const table = new Wrapped() as unknown as {
      readonly dom: HTMLElement;
      readonly table: HTMLTableElement;
      ignoreMutation(mutation: { readonly type: string; readonly target: Node }): boolean;
      destroy(): void;
    };
    expect(table.ignoreMutation({ type: 'attributes', target: table.dom })).toBe(true);
    expect(table.ignoreMutation({ type: 'attributes', target: table.table })).toBe(true);
    expect(table.ignoreMutation({ type: 'childList', target: table.dom })).toBe(false);
    const wrapper = table.dom as unknown as StopElement;
    expect([before.hasAttribute('tabindex'), wrapper.hasAttribute('tabindex')]).toEqual([
      false,
      false,
    ]);
    expect(checkbox.disabled).toBe(false);
    stops.active = false;
    writeContentStops(stops);
    expect([before.getAttribute('tabindex'), wrapper.getAttribute('tabindex')]).toEqual([
      '-1',
      '-1',
    ]);
    expect(checkbox.disabled).toBe(true);
    // A link rendered while disabled starts without a stop.
    expect((link(stops).dom as unknown as StopElement).getAttribute('tabindex')).toBe('-1');
    stops.active = true;
    writeContentStops(stops);
    expect([before.hasAttribute('tabindex'), wrapper.hasAttribute('tabindex')]).toEqual([
      false,
      false,
    ]);
    expect(checkbox.disabled).toBe(false);
    task.destroy!();
    table.destroy();
    expect([stops.checkboxes.size, stops.scrollers.size]).toEqual([0, 0]);
  });
});
