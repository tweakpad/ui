import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { nothing } from 'lit';
import type * as Toolbar from '../../../foundation/toolbar.js';
import type { KeyShortcut } from '../../../foundation/key-bindings.js';
import { textEditorStrings } from '../../../foundation/text-editor/strings.js';
import { templateMarkup } from '../../../template-markup.test.js';
import type { TextEditorToolbarItem, TextEditorToolbarView } from '../tools/resolve.js';

/** Every call the view makes on its toolbar controllers, in order. */
const log = vi.hoisted((): string[] => []);
/** The id of the next recording controller. */
const counter = vi.hoisted(() => ({ next: 0 }));

vi.mock('../../../foundation/toolbar.js', async (importOriginal) => {
  const original = await importOriginal<typeof Toolbar>();
  const name = (element: {
    localName: string;
    dataset?: Record<string, string>;
    className?: string;
  }) =>
    element.dataset?.['tool'] ??
    `${element.localName}${element.className ? `.${element.className}` : ''}`;
  class RecordingToolbar {
    readonly id = ++counter.next;
    constructor(
      readonly host: unknown,
      options: Toolbar.ToolbarOptions,
    ) {
      log.push(`new ${this.id} ${JSON.stringify(options)}`);
    }
    disabled = false;
    update(options: Partial<Toolbar.ToolbarOptions>): void {
      if (options.disabled !== undefined) this.disabled = options.disabled;
      log.push(`update ${this.id} ${JSON.stringify(options)}`);
    }
    refresh(): void {
      log.push(`refresh ${this.id}`);
    }
    dispose(): void {
      log.push(`dispose ${this.id}`);
    }
    #registration(label: string) {
      return {
        update: (options: unknown) => log.push(`${label} update ${JSON.stringify(options)}`),
        dispose: () => log.push(`${label} dispose`),
      };
    }
    registerItem(element: never, options: Toolbar.ToolbarItemOptions) {
      const label = `item ${name(element)}`;
      log.push(`${label} ${JSON.stringify(options)}`);
      return this.#registration(label);
    }
    registerGroup(element: never) {
      log.push(`group ${name(element)}`);
      return this.#registration(`group ${name(element)}`);
    }
    registerSeparator(element: never) {
      log.push(`separator ${name(element)}`);
      return this.#registration(`separator ${name(element)}`);
    }
  }
  return {
    ...original,
    ToolbarController: RecordingToolbar,
    setToolbarDisabledMode: (toolbar: RecordingToolbar, mode: string) =>
      log.push(`mode ${toolbar.id} ${mode}`),
  };
});

const { TextEditorToolbar, TextEditorToolbarControls, toolbarTooltipContent } =
  await import('./toolbar.js');

// A light DOM stub: tags, classes and attributes, matched by simple selector lists.

interface Stub {
  readonly localName: string;
  readonly className: string;
  readonly dataset: Record<string, string>;
  readonly attributes: Record<string, string>;
  readonly children: Stub[];
  parentElement: Stub | null;
  isConnected: boolean;
  shadowRoot: { querySelector(selector: string): unknown } | null;
  updateComplete?: Promise<boolean>;
  [extra: string]: unknown;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  querySelectorAll(selectors: string): Stub[];
  querySelector(selectors: string): Stub | null;
  closest(selectors: string): Stub | null;
}

function matchesOne(element: Stub, selector: string): boolean {
  const pattern = /^([\w-]*)((?:\.[\w-]+)*)((?:\[[^\]]+\])*)$/.exec(selector.trim());
  if (!pattern) throw new Error(`Unsupported selector ${selector}`);
  const [, tag, classes, attributes] = pattern;
  if (tag && element.localName !== tag) return false;
  const own = element.className.split(' ');
  if (
    !classes!
      .split('.')
      .filter(Boolean)
      .every((name) => own.includes(name))
  )
    return false;
  for (const [, attribute, operator, value] of attributes!.matchAll(
    /\[([\w-]+)(~?=)?"?([^"\]]*)"?\]/g,
  )) {
    const actual = element.getAttribute(attribute!);
    if (actual === null) return false;
    if (operator === '=' && actual !== value) return false;
    if (operator === '~=' && !actual.split(' ').includes(value!)) return false;
  }
  return true;
}
const matches = (element: Stub, selectors: string) =>
  selectors.split(',').some((selector) => matchesOne(element, selector));

function el(spec: string, attributes: Record<string, string> = {}, children: Stub[] = []): Stub {
  const [localName = '', ...classes] = spec.split('.');
  const all = (element: Stub): Stub[] =>
    element.children.flatMap((child) => [child, ...all(child)]);
  const element: Stub = {
    localName,
    className: classes.join(' '),
    attributes: { ...(classes.length ? { class: classes.join(' ') } : {}), ...attributes },
    dataset: attributes['data-tool'] ? { tool: attributes['data-tool'] } : {},
    children,
    parentElement: null,
    isConnected: true,
    shadowRoot: null,
    getAttribute: (name) => element.attributes[name] ?? null,
    hasAttribute: (name) => name in element.attributes,
    querySelectorAll: (selectors) => all(element).filter((child) => matches(child, selectors)),
    querySelector: (selectors) => element.querySelectorAll(selectors)[0] ?? null,
    closest: (selectors) => {
      for (let node: Stub | null = element; node; node = node.parentElement)
        if (matches(node, selectors)) return node;
      return null;
    },
  };
  for (const child of children) child.parentElement = element;
  return element;
}

/** A Button group whose inner part registers once the group has rendered. */
function buttonGroup(children: Stub[]): Stub {
  const group = el('tp-button-group.toolbar-buttons', {}, children);
  const part = {
    localName: 'div',
    className: '',
    dataset: { tool: `part:${children[0]?.dataset['tool'] ?? ''}` },
  };
  group.shadowRoot = {
    querySelector: (selector) => (selector === '[part~="button-group"]' ? part : null),
  };
  group.updateComplete = Promise.resolve(true);
  return group;
}

interface MenuStub extends Stub {
  open: boolean;
  triggerElement: Stub | null;
  setOpen: ReturnType<typeof vi.fn>;
}

function menu(spec: string, trigger: Stub | null, content: Stub[] = []): MenuStub {
  const element = el(spec, {}, [...(trigger ? [trigger] : []), ...content]) as MenuStub;
  element.open = false;
  element.triggerElement = trigger;
  element.setOpen = vi.fn();
  return element;
}

function tooltipStub() {
  const tooltip = el('tp-tooltip.toolbar-tooltip');
  const registered: string[] = [];
  tooltip['registerTrigger'] = (
    element: Stub,
    options: {
      identifier: string;
      payload: { label: string; shortcut?: KeyShortcut };
      disabled: boolean;
    },
  ) => {
    const entry = `${options.identifier} ${options.payload.label} ${options.payload.shortcut?.display ?? '-'} ${String(options.disabled)}`;
    registered.push(`+ ${entry}`);
    return () => registered.push(`- ${entry}`);
  };
  return { tooltip, registered };
}

const SHORTCUT: KeyShortcut = { aria: 'Control+B', display: 'Ctrl+B', keys: ['Control', 'B'] };

function toolItem(patch: Partial<TextEditorToolbarItem> = {}): TextEditorToolbarItem {
  return {
    id: 'bold',
    kind: 'toggle',
    control: 'toggle',
    pair: false,
    label: 'Bold',
    text: 'Bold',
    icon: undefined,
    display: 'icon',
    active: false,
    value: null,
    disabled: false,
    focusableWhenDisabled: true,
    popup: null,
    expanded: false,
    shortcut: SHORTCUT,
    items: [],
    render: undefined,
    ...patch,
  };
}

function toolbarView(disabled = false, focused = true): TextEditorToolbarView {
  const flags = { disabled, focusableWhenDisabled: !disabled };
  return {
    label: textEditorStrings.toolbar,
    moreTools: textEditorStrings.moreTools,
    disabled,
    focused,
    groups: [
      {
        key: '0',
        items: [
          toolItem({
            id: 'undo',
            kind: 'button',
            control: 'button',
            label: 'Undo',
            shortcut: undefined,
            ...flags,
          }),
        ],
      },
      {
        key: '1',
        items: [
          toolItem({
            id: 'block-type',
            kind: 'radio-menu',
            control: 'menu',
            label: 'Block type',
            items: [toolItem({ id: 'paragraph' })],
            ...flags,
          }),
          toolItem({ id: 'bold', ...flags }),
          toolItem({
            id: 'superscript',
            control: 'toggle-group',
            pair: true,
            items: [
              toolItem({ id: 'superscript', label: 'Superscript' }),
              toolItem({ id: 'subscript', label: 'Subscript' }),
            ],
            ...flags,
          }),
        ],
      },
    ],
  };
}

/** The DOM that `render()` produces for `toolbarView()`, as stubs. */
function renderedDom() {
  const undo = el('tp-button', { 'data-tool': 'undo' });
  const blockTrigger = el('tp-button', { 'data-tool': 'block-type', slot: 'trigger' });
  const blockMenu = menu('tp-menu', blockTrigger, [
    el('tp-menu-radio-group', {}, [el('tp-menu-radio-item', { 'data-tool': 'paragraph' })]),
  ]);
  const bold = el('tp-button', { 'data-tool': 'bold' });
  const superscript = el('tp-toggle', { 'data-tool': 'superscript' });
  const subscript = el('tp-toggle', { 'data-tool': 'subscript' });
  const pair = el('tp-toggle-group', { 'data-tool': 'superscript' }, [superscript, subscript]);
  const custom = el('span.toolbar-custom', { 'data-tool': 'stamp' }, [
    el('tp-button', { id: 'stamp-button' }),
    el('input', { id: 'stamp-input' }),
    el('tp-input', { id: 'stamp-field' }),
    el('a', { href: '#x', id: 'stamp-link' }),
    el('tp-button', { href: '#y', id: 'stamp-button-link' }),
    el('tp-toggle-group', {}, [el('tp-toggle', { id: 'stamp-member' })]),
    el('div', { popover: '' }, [el('button', { id: 'stamp-popup-button' })]),
    menu('tp-menu', el('tp-button', { slot: 'trigger', id: 'stamp-menu-trigger' }), [
      el('tp-input', { id: 'stamp-menu-input' }),
    ]),
  ]);
  const moreTrigger = el('tp-button.toolbar-more-trigger', { slot: 'trigger' });
  const moreMenu = menu('tp-menu.toolbar-more-menu', moreTrigger, [
    menu('tp-menu', el('tp-button', { slot: 'trigger', 'data-tool': 'align' })),
  ]);
  const { tooltip, registered } = tooltipStub();
  const root = el('div', { part: 'text-editor-toolbar' }, [
    el('tp-overflow-list.toolbar-row', {}, [
      el('span.toolbar-group', { 'data-group': '0' }, [buttonGroup([undo])]),
      el('span.toolbar-group', { 'data-group': '1' }, [
        el('tp-separator.toolbar-separator'),
        buttonGroup([blockMenu, bold, pair, custom]),
      ]),
      el('span.toolbar-more', { slot: 'count' }, [moreMenu]),
    ]),
    tooltip,
  ]);
  const renderRoot = el('shadow-root', {}, [root]);
  return { renderRoot, root, undo, bold, blockMenu, moreMenu, moreTrigger, registered };
}

function setup(options: { view?: TextEditorToolbarView | null } = {}) {
  log.length = 0;
  counter.next = 0;
  const calls: string[] = [];
  let current = options.view === undefined ? toolbarView() : options.view;
  const dom = renderedDom();
  const host = {
    renderRoot: dom.renderRoot as unknown as ShadowRoot,
    toolbarView: () => current,
    requestUpdate: vi.fn(),
    handlers: {
      activate: (activation: { tool: string; reason: string }) =>
        calls.push(`activate ${activation.tool} ${activation.reason}`),
      menuOpened: (
        trigger: { dataset?: Record<string, string>; className?: string },
        modality: string,
      ) =>
        calls.push(
          `menuOpened ${trigger.dataset?.['tool'] ?? trigger.className ?? ''} ${modality}`,
        ),
      menuClosed: (changed: boolean) => calls.push(`menuClosed ${String(changed)}`),
      finalFocus: (interaction: string) => {
        calls.push(`finalFocus ${interaction}`);
        return true;
      },
    },
  };
  const toolbar = new TextEditorToolbar(host as never);
  const update = (view: TextEditorToolbarView | null = current) => {
    current = view;
    const template = toolbar.render();
    toolbar.updated();
    return template;
  };
  return { toolbar, host, dom, calls, update };
}

/** The bound value named `name` in a template tree, in document order. */
function bound(value: unknown, name: string): unknown[] {
  const out: unknown[] = [];
  const visit = (part: unknown) => {
    if (Array.isArray(part)) return part.forEach(visit);
    if (!part || typeof part !== 'object' || !('values' in part)) return;
    if (!('strings' in part)) {
      // A `repeat` directive: its items through its template function.
      const [items, , template] = (part as { values: unknown[] }).values as [
        unknown[],
        unknown,
        (item: unknown, index: number) => unknown,
      ];
      return items.map((item, index) => template(item, index)).forEach(visit);
    }
    const { strings, values } = part as { strings: readonly string[]; values: unknown[] };
    values.forEach((entry, index) => {
      if (strings[index]!.trimEnd().endsWith(`${name}=`)) out.push(entry);
      visit(entry);
    });
  };
  visit(value);
  return out;
}

const openChange = (
  value: boolean,
  reason = 'trigger-press',
  sourceEvent: object = { type: 'click', detail: 1 },
) => ({ detail: { value, reason, sourceEvent } }) as never;

/** The open-change handler that the view gives its tool controls. */
function menuHandler(template: unknown) {
  const onOpenChange = bound(template, '@tp-open-change')[0] as (event: unknown) => void;
  return (target: MenuStub, event: { detail: unknown }) =>
    onOpenChange({ ...event, target, currentTarget: target });
}

describe('text editor fixed toolbar', () => {
  it('keeps one controller per toolbar root, set to the fully disabled mode, and recreates it for a new root (node-009984, uwg-te-tb-req-press, node-010070)', () => {
    const t = setup();
    t.update();
    t.update();
    expect(log.filter((entry) => /^(new|mode|dispose) /.test(entry))).toEqual([
      'new 1 {"loopFocus":true,"preserveFocusOnPress":true}',
      'mode 1 fully',
    ]);
    const next = renderedDom();
    (t.host as { renderRoot: unknown }).renderRoot = next.renderRoot;
    t.update();
    expect(log.filter((entry) => /^(new|mode|dispose) /.test(entry))).toEqual([
      'new 1 {"loopFocus":true,"preserveFocusOnPress":true}',
      'mode 1 fully',
      'dispose 1',
      'new 2 {"loopFocus":true,"preserveFocusOnPress":true}',
      'mode 2 fully',
    ]);
  });

  it('registers controls, menu triggers, the More trigger and custom controls by kind, never Toggle group members (uwg-te-toggle-group-req-toolbar, uwg-te-req-a11y-2, node-009984)', () => {
    const t = setup();
    t.update();
    const items = log.filter((entry) => entry.startsWith('item ') && !entry.includes(' update'));
    const options = '{"kind":"button","focusableWhenDisabled":true}';
    expect(items).toEqual([
      `item undo ${options}`,
      `item block-type ${options}`,
      `item bold ${options}`,
      `item tp-button.toolbar-more-trigger ${options}`,
      `item tp-button ${options}`,
      'item input {"kind":"input","focusableWhenDisabled":true}',
      'item tp-input {"kind":"input","focusableWhenDisabled":true}',
      'item a {"kind":"link","focusableWhenDisabled":true}',
      'item tp-button {"kind":"link","focusableWhenDisabled":true}',
      `item tp-button ${options}`,
    ]);
  });

  it('registers each Button group part as a group and each separator as a separator (node-009977)', async () => {
    const t = setup();
    t.update();
    await Promise.resolve();
    await Promise.resolve();
    expect(log.filter((entry) => /^(group|separator) /.test(entry))).toEqual([
      'separator tp-separator.toolbar-separator',
      'group part:undo',
      'group part:',
    ]);
  });

  it('disposes a registration whose element leaves (node-010076)', () => {
    const t = setup();
    t.update();
    const group = t.dom.undo.parentElement!;
    group.children.splice(group.children.indexOf(t.dom.undo), 1);
    t.update();
    expect(log).toContain('item undo dispose');
  });

  /** The toolbar of `setup()` over stubs that take focus: `focus()` makes an element active. */
  function focusSetup() {
    const t = setup();
    const document = { body: el('body'), activeElement: null as unknown };
    const renderRoot = t.dom.renderRoot as Stub & { activeElement: Stub | null };
    const tree = (node: Stub): Stub[] => [node, ...node.children.flatMap(tree)];
    for (const node of tree(t.dom.renderRoot))
      Object.assign(node, {
        ownerDocument: document,
        classList: { contains: (name: string) => node.className.split(' ').includes(name) },
        contains: (other: Stub) => tree(node).includes(other),
        focus: vi.fn(() => {
          renderRoot.activeElement = node;
        }),
      });
    t.update();
    /** One render with `focused` active before it; `after` runs between render and update. */
    const pass = (focused: Stub, after: () => void) => {
      renderRoot.activeElement = focused;
      document.activeElement = null;
      t.toolbar.render();
      after();
      t.toolbar.updated();
    };
    /** The render moved or removed the focused element: DOM focus fell to the body. */
    const lost = () => {
      renderRoot.activeElement = null;
      document.activeElement = document.body;
    };
    return { t, document, renderRoot, pass, lost };
  }

  it('gives focus back to the control of its tool when the render moved it, and leaves a gone tool to the controller (node-010076)', () => {
    const { t, pass, lost } = focusSetup();
    const [superscript] = t.dom.root
      .querySelectorAll('tp-toggle[data-tool]')
      .filter((element) => element.dataset['tool'] === 'superscript');
    pass(t.dom.bold, lost);
    expect(t.dom.bold['focus']).toHaveBeenCalledWith({ preventScroll: true });
    expect(t.dom.bold['focus']).toHaveBeenCalledTimes(1);
    // A Toggle group member is restored as itself.
    pass(superscript!, lost);
    expect(superscript!['focus']).toHaveBeenCalledTimes(1);
    // Focus that stayed on an element is left alone.
    pass(t.dom.bold, () => undefined);
    expect(t.dom.bold['focus']).toHaveBeenCalledTimes(1);
    // A menu item is no row control: nothing to restore.
    const item = t.dom.blockMenu.querySelector('tp-menu-radio-item')!;
    pass(item, lost);
    expect(item['focus']).not.toHaveBeenCalled();
    // The tool is gone: the Toolbar controller moves focus to the nearest stop.
    pass(t.dom.bold, () => {
      lost();
      const group = t.dom.bold.parentElement!;
      group.children.splice(group.children.indexOf(t.dom.bold), 1);
    });
    expect(t.dom.bold['focus']).toHaveBeenCalledTimes(1);
    expect(t.dom.undo['focus']).not.toHaveBeenCalled();
    // A tool that hid keeps its control, inert: for focus it is gone as well (uwg-te-req-pres-5).
    pass(superscript!, () => {
      lost();
      superscript!.parentElement!.attributes['inert'] = '';
    });
    expect(superscript!['focus']).toHaveBeenCalledTimes(1);
  });

  it('focuses a control that cannot take focus yet once the controller and its render made it focusable, unless focus left the toolbar (node-010076)', async () => {
    const { t, document, renderRoot, pass, lost } = focusSetup();
    const settle = async () => {
      for (let index = 0; index < 4; index++) await Promise.resolve();
    };
    // Bold moved to another group: its new element is still natively disabled at the update.
    const created = (outside: boolean) => {
      let calls = 0;
      t.dom.bold['focus'] = vi.fn(() => {
        if (calls++) renderRoot.activeElement = t.dom.bold;
      });
      t.dom.bold['updateComplete'] = Promise.resolve(true);
      pass(t.dom.bold, lost);
      expect(t.dom.bold['focus']).toHaveBeenCalledTimes(1);
      // Meanwhile the Toolbar controller repairs focus to a neighbour, or focus leaves the widget.
      if (outside) document.activeElement = el('button');
      else renderRoot.activeElement = t.dom.undo;
    };
    created(false);
    await settle();
    expect(t.dom.bold['focus']).toHaveBeenCalledTimes(2);
    expect(renderRoot.activeElement).toBe(t.dom.bold);
    created(true);
    await settle();
    expect(t.dom.bold['focus']).toHaveBeenCalledTimes(1);
  });

  it('answers whether focus that a render took from a tool stays nowhere for now, for the selection toolbar to return it to the editing root', () => {
    const { t, renderRoot, lost } = focusSetup();
    const controls = new TextEditorToolbarControls();
    const root = t.dom.root as unknown as HTMLElement;
    const shadow = renderRoot as unknown as ShadowRoot;
    const after = (focused: Stub, change: () => void) => {
      renderRoot.activeElement = focused;
      controls.noteFocus(shadow, root);
      change();
      return controls.restoreFocus(shadow, root);
    };
    // Restored at once, or never lost: false.
    expect(after(t.dom.bold, lost)).toBe(false);
    expect(after(t.dom.bold, () => undefined)).toBe(false);
    // The tool is gone: true.
    expect(
      after(t.dom.bold, () => {
        lost();
        const group = t.dom.bold.parentElement!;
        group.children.splice(group.children.indexOf(t.dom.bold), 1);
      }),
    ).toBe(true);
    // Its new control cannot take focus yet: true.
    t.dom.undo['focus'] = vi.fn();
    expect(after(t.dom.undo, lost)).toBe(true);
    // A render before the first connection has no render root: nothing noted.
    expect(() => controls.noteFocus(undefined, root)).not.toThrow();
    expect(controls.restoreFocus(shadow, root)).toBe(false);
  });

  it('registers every item as not focusable when disabled and disables the root while the widget is disabled (uwg-te-req-prop-3, node-010070)', () => {
    const t = setup({ view: toolbarView(true) });
    t.update();
    expect(log).toContain('update 1 {"disabled":true}');
    const items = log.filter((entry) => entry.startsWith('item '));
    expect(items.length).toBeGreaterThan(5);
    for (const entry of items) expect(entry).toContain('"focusableWhenDisabled":false');
    t.update(toolbarView(false));
    expect(log).toContain('item undo update {"focusableWhenDisabled":true}');
  });

  it('V-588: a render with the same access refreshes no roving item (each typed character renders the element)', () => {
    const t = setup({ view: toolbarView(true) });
    t.update();
    t.update(toolbarView(false));
    const settled = log.length;
    t.update(toolbarView(false));
    t.update(toolbarView(false));
    expect(
      log.slice(settled).filter((entry) => / update /.test(entry) || /^update /.test(entry)),
    ).toEqual([]);
    t.update(toolbarView(true));
    expect(log.slice(settled)).toContain('update 1 {"disabled":true}');
    expect(log.slice(settled)).toContain('item undo update {"focusableWhenDisabled":false}');
  });

  it('renders no part while no available tool is placed, and the part with its row for a view with no groups (uwg-te-tab-anatomy-r2)', () => {
    const t = setup();
    t.update();
    const none = setup({ view: null });
    expect(none.toolbar.render()).toBe(nothingValue());
    t.update(null);
    expect(log).toContain('dispose 1');
    const empty = templateMarkup(
      setup({ view: { ...toolbarView(), groups: [] } }).toolbar.render(),
    );
    expect(empty).toContain('<div part="text-editor-toolbar"');
    expect(empty).toContain('<tp-overflow-list class="toolbar-row" max-rows="1"');
    expect(empty).not.toContain('toolbar-group');
  });

  it('states the omitted count on the More trigger, mirrors the omitted groups and binds the host final focus (ovl-count, ovl-outputs, uwg-te-req-a11y-6)', () => {
    const t = setup();
    const first = t.update();
    const overflow = bound(first, '@tp-overflow-change')[0] as (event: unknown) => void;
    const list = {
      hiddenCount: 2,
      hiddenItems: [{ getAttribute: () => '1' }, { getAttribute: () => '0' }],
    };
    overflow({ target: list, currentTarget: list });
    expect(log).toContain('refresh 1');
    expect(t.host.requestUpdate).toHaveBeenCalledTimes(1);
    const template = t.toolbar.render();
    const markup = templateMarkup(template);
    expect(markup).toContain('>More tools, hidden groups: 2</tp-button');
    expect(markup).toContain('label=More tools, hidden groups: 2');
    expect(markup).toMatch(/<tp-menu-item value=undo /);
    expect(markup).toMatch(/<tp-menu-checkbox-item value=bold /);
    expect(bound(template, '.finalFocus')).toEqual([
      t.host.handlers.finalFocus,
      t.host.handlers.finalFocus,
    ]);
  });

  it('keeps a hidden group in place unseen, and leaves hidden tools out of the More menu, disabling it when nothing shows (uwg-te-req-tools-5, uwg-te-req-pres-5)', () => {
    const base = toolbarView();
    const hide = (item: TextEditorToolbarItem): TextEditorToolbarItem => ({
      ...item,
      hidden: true,
      items: item.pair ? item.items.map(hide) : item.items,
    });
    // Group 1 hides whole (its tools leave a table-free context), group 0 shows.
    const view: TextEditorToolbarView = {
      ...base,
      groups: [
        base.groups[0]!,
        { ...base.groups[1]!, hidden: true, items: base.groups[1]!.items.map(hide) },
      ],
    };
    const t = setup({ view });
    const first = t.update();
    // Every group keeps its element; the hidden one is marked for the widget's styles.
    expect(bound(first, '?data-hidden')).toEqual([false, true]);
    const overflow = bound(first, '@tp-overflow-change')[0] as (event: unknown) => void;
    const omit = (keys: string[]) => {
      const list = {
        hiddenCount: keys.length,
        hiddenItems: keys.map((key) => ({ getAttribute: () => key })),
      };
      overflow({ target: list, currentTarget: list });
      return t.toolbar.render();
    };
    // Only the hidden group omitted: an empty More menu would open, so its trigger is disabled.
    const moreDisabled = (template: unknown) =>
      /class="?toolbar-more-trigger"?[^>]*\.disabled="?(true|false)/.exec(
        templateMarkup(template),
      )?.[1];
    const hiddenOnly = omit(['1']);
    expect(moreDisabled(hiddenOnly)).toBe('true');
    expect(templateMarkup(hiddenOnly)).not.toMatch(/<tp-menu-(checkbox-)?item value=/);
    // With a shown group omitted as well, the menu holds the shown tools only.
    const both = omit(['0', '1']);
    expect(moreDisabled(both)).toBe('false');
    const markup = templateMarkup(both);
    expect(markup).toMatch(/<tp-menu-item value=undo /);
    expect(markup).not.toMatch(/value=(bold|superscript|subscript|paragraph) /);
    // A pair with one hidden member keeps the other in the menu.
    const partial: TextEditorToolbarView = {
      ...base,
      groups: [
        base.groups[0]!,
        {
          ...base.groups[1]!,
          items: base.groups[1]!.items.map((item) =>
            item.pair ? { ...item, items: [hide(item.items[0]!), item.items[1]!] } : hide(item),
          ),
        },
      ],
    };
    t.update(partial);
    const pairMarkup = templateMarkup(omit(['1']));
    expect(pairMarkup).toMatch(/<tp-menu-checkbox-item value=subscript /);
    expect(pairMarkup).not.toMatch(/value=(superscript|bold|block-type) /);
  });

  it('disables the More trigger while focus is outside the widget, so that its menu cannot take focus in (uwg-te-req-tools-2)', () => {
    const moreDisabled = (template: unknown) =>
      /class="?toolbar-more-trigger"?[^>]*\.disabled="?(true|false)/.exec(
        templateMarkup(template),
      )?.[1];
    const t = setup({ view: toolbarView(false, false) });
    expect(moreDisabled(t.update())).toBe('true');
    expect(moreDisabled(t.update(toolbarView()))).toBe('false');
  });

  it('closes the open toolbar menu before another opens, recording its close first (uwg-te-req-surfaces-6, uwg-te-req-a11y-6)', () => {
    const t = setup();
    const template = t.update();
    const handle = menuHandler(template);
    const more = bound(template, '@tp-open-change')[1] as (event: unknown) => void;
    handle(t.dom.blockMenu, openChange(true, 'trigger-press', { type: 'keydown' }));
    t.dom.moreMenu.setOpen = vi.fn();
    t.dom.blockMenu.setOpen.mockImplementation(() => handle(t.dom.blockMenu, openChange(false)));
    more({
      ...(openChange(true) as object),
      target: t.dom.moreMenu,
      currentTarget: t.dom.moreMenu,
    });
    expect(t.dom.blockMenu.setOpen).toHaveBeenCalledWith(false, 'trigger-press', {
      type: 'click',
      detail: 1,
    });
    expect(t.calls).toEqual([
      'menuOpened block-type keyboard',
      'menuClosed false',
      'menuOpened toolbar-more-trigger pointer',
    ]);
  });

  it('skips the opening record while the Menu has no trigger element (uwg-te-req-a11y-6)', () => {
    const t = setup();
    const handle = menuHandler(t.update());
    t.dom.blockMenu.triggerElement = null;
    expect(() => handle(t.dom.blockMenu, openChange(true))).not.toThrow();
    handle(t.dom.blockMenu, openChange(false));
    expect(t.calls).toEqual(['menuClosed false']);
  });

  it('records a pointer opening from the trigger of the proposal, which the Menu takes only once it accepts it (uwg-te-req-a11y-6)', () => {
    const t = setup();
    const handle = menuHandler(t.update());
    const trigger = t.dom.blockMenu.triggerElement!;
    t.dom.blockMenu.triggerElement = null;
    handle(t.dom.blockMenu, {
      detail: {
        value: true,
        reason: 'trigger-press',
        sourceEvent: { type: 'click', detail: 1 },
        trigger,
      },
    });
    handle(t.dom.blockMenu, openChange(false, 'escape-key', { type: 'keydown' }));
    expect(t.calls).toEqual(['menuOpened block-type pointer', 'menuClosed false']);
  });

  it('records the close, changed by an item press, before the Menu resolves its final focus (uwg-te-req-a11y-6)', () => {
    const t = setup();
    const template = t.update();
    const handle = menuHandler(template);
    const finalFocus = bound(template, '.finalFocus')[0] as (interaction: string) => unknown;
    handle(t.dom.blockMenu, openChange(true));
    const onValueChange = bound(template, '.onValueChange')[0] as (
      this: unknown,
      event: unknown,
    ) => void;
    onValueChange.call(
      {},
      { detail: { value: 'paragraph', sourceEvent: { type: 'click' } }, preventDefault: () => {} },
    );
    handle(t.dom.blockMenu, openChange(false));
    finalFocus('keyboard');
    handle(t.dom.blockMenu, openChange(true));
    handle(t.dom.blockMenu, openChange(false));
    finalFocus('keyboard');
    expect(t.calls).toEqual([
      'menuOpened block-type pointer',
      'activate block-type item-press',
      'menuClosed true',
      'finalFocus keyboard',
      'menuOpened block-type pointer',
      'menuClosed false',
      'finalFocus keyboard',
    ]);
  });

  it('registers one visual-only tooltip trigger per control with its label and key hint, again when they change (uwg-te-tab-anatomy-r2, uwg-te-req-a11y-2)', () => {
    const t = setup();
    const markup = templateMarkup(t.update());
    expect(markup).toContain('<tp-tooltip class="toolbar-tooltip" describes="none"');
    expect(t.dom.registered).toEqual([
      '+ undo Undo - false',
      '+ block-type Block type Ctrl+B false',
      '+ bold Bold Ctrl+B false',
      '+ superscript Superscript Ctrl+B false',
      '+ subscript Subscript Ctrl+B false',
      '+ more More tools, hidden groups: 0 - false',
    ]);
    t.dom.registered.length = 0;
    const base = toolbarView();
    const [first, second] = base.groups;
    const renamed = {
      ...base,
      groups: [{ ...first!, items: [{ ...first!.items[0]!, label: 'Revert' }] }, second!],
    };
    t.update(renamed);
    expect(t.dom.registered).toEqual(['- undo Undo - false', '+ undo Revert - false']);
  });

  it('closes the open toolbar menu and turns tooltips off while the widget is disabled (uwg-te-req-prop-3)', () => {
    const t = setup();
    const handle = menuHandler(t.update());
    t.update(toolbarView(true));
    expect(t.dom.blockMenu.setOpen).not.toHaveBeenCalled();
    t.update(toolbarView(false));
    handle(t.dom.blockMenu, openChange(true));
    t.dom.blockMenu.open = true;
    t.dom.registered.length = 0;
    t.update(toolbarView(true));
    expect(t.dom.blockMenu.setOpen).toHaveBeenCalledWith(false, 'disabled');
    expect(t.dom.registered.filter((entry) => entry.startsWith('+'))).toEqual([
      '+ undo Undo - true',
      '+ block-type Block type Ctrl+B true',
      '+ bold Bold Ctrl+B true',
      '+ superscript Superscript Ctrl+B true',
      '+ subscript Subscript Ctrl+B true',
      '+ more More tools, hidden groups: 0 - true',
    ]);
    t.dom.registered.length = 0;
    t.update(toolbarView(false));
    expect(
      t.dom.registered
        .filter((entry) => entry.startsWith('+'))
        .every((entry) => entry.endsWith(' false')),
    ).toBe(true);
  });

  it('disposes the controller and the tooltip triggers on disconnection (node-010076)', () => {
    const t = setup();
    t.update();
    t.toolbar.disconnected();
    expect(log).toContain('dispose 1');
    expect(t.dom.registered.filter((entry) => entry.startsWith('-'))).toHaveLength(6);
    t.toolbar.connected();
    t.update();
    expect(log).toContain('new 2 {"loopFocus":true,"preserveFocusOnPress":true}');
  });
});

/** Lit's `nothing`, read through a render with no view. */
function nothingValue() {
  return setup({ view: null }).toolbar.render();
}

// Source guards over the widget's files (uwg-te-tb-req-press, uwg-te-req-surfaces-6, uwg-te-req-prop-3).

const WIDGET = join(import.meta.dirname, '..');
const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return name.endsWith('.ts') && !name.endsWith('.test.ts') ? [path] : [];
  });

/** G1: no press listener of its own in the tools or the toolbar view. */
export const pressListeners = (files: readonly string[]) =>
  files.filter((file) =>
    /@pointerdown|@mousedown|'pointerdown'|'mousedown'/.test(readFileSync(file, 'utf8')),
  );
/** G2: no import of the Toolbar membership internals. */
export const membershipImports = (files: readonly string[]) =>
  files.filter((file) => /foundation\/toolbar-membership/.test(readFileSync(file, 'utf8')));
/** G3: one tool-to-control mapping renders Toggles and Menu entries. */
export const controlRenderers = (files: readonly string[]) =>
  files.filter(
    (file) =>
      !/(tools\/(controls|menu-items)|views\/color-menu)\.ts$/.test(file) &&
      /<tp-(toggle|toggle-group|menu-item|menu-checkbox-item|menu-radio-group|menu-radio-item)[\s>]/.test(
        readFileSync(file, 'utf8'),
      ),
  );
/** G4: every Menu stays in the widget's shadow root and is non-modal. */
export const portaledMenus = (files: readonly string[]) =>
  files.flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/<tp-menu(?![-\w])[^>]*>/g)]
      .map(([tag]) => tag)
      .filter((tag) => !tag.includes('.portal=${false}') || !tag.includes('.modal=${false}'))
      .map((tag) => `${file}: ${tag}`),
  );
/** G5: every item registration states whether it stays focusable while disabled. */
export const unstatedRegistrations = (files: readonly string[]) =>
  files.flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/registerItem\(([^)]*)\)/g)]
      .map(([call]) => call)
      .filter((call) => !call.includes('focusableWhenDisabled'))
      .map((call) => `${file}: ${call}`),
  );

describe('text editor toolbar source guards', () => {
  const widget = sources(WIDGET);
  const toolbarFiles = widget.filter((file) => /tools\/|views\/toolbar\.ts$/.test(file));

  it('adds no press listener of its own (uwg-te-tb-req-press)', () => {
    expect(toolbarFiles.length).toBeGreaterThan(3);
    expect(pressListeners(toolbarFiles)).toEqual([]);
  });

  it('reaches Toolbar behavior only through its controller (uwg-te-toggle-group-req-toolbar)', () => {
    expect(membershipImports(widget)).toEqual([]);
  });

  it('maps tools to controls in one place (uwg-te-par-tools-1)', () => {
    expect(controlRenderers(widget)).toEqual([]);
  });

  it('keeps every Menu unportaled and non-modal (uwg-te-req-surfaces-6)', () => {
    expect(portaledMenus(widget)).toEqual([]);
  });

  it('states focusability while disabled on every item registration (uwg-te-req-prop-3)', () => {
    expect(unstatedRegistrations(widget)).toEqual([]);
  });
});

describe('toolbar tooltip content', () => {
  it('renders nothing before a control is active, then the label and the shortcut', () => {
    // The Tooltip renders its content before any trigger gives it a payload.
    for (const payload of [undefined, null, 'bold'])
      expect(toolbarTooltipContent(payload), String(payload)).toBe(nothing);
    const shortcut: KeyShortcut = { aria: 'Control+B', display: 'Ctrl+B', keys: ['Control', 'B'] };
    const content = toolbarTooltipContent({ label: 'Bold', shortcut });
    expect(content).not.toBe(nothing);
    expect((content as { values: unknown[] }).values[0]).toBe('Bold');
  });
});
