import { keyEvent } from './fakes.test.js';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ToolbarController,
  setToolbarDisabledMode,
  toolbarInputOwnsKey,
  type ToolbarItemOptions,
  type ToolbarOptions,
} from './toolbar.js';
import {
  itemOwners,
  roots,
  toolbarFor,
  toolbarItemOwner,
  whenToolbar,
} from './toolbar-membership.js';
import { CollectionRegistry } from './collection.js';
import { ContextualToolbarController } from './contextual-toolbar.js';
import { CompositeControlController } from './composite-control.js';

const editor = (start: number | null, end = start, direction = 'ltr', type = 'input') =>
  ({
    localName: type,
    value: 'Notes',
    selectionStart: start,
    selectionEnd: end,
    readOnly: false,
    disabled: false,
    ownerDocument: { defaultView: { getComputedStyle: () => ({ direction }) } },
  }) as unknown as HTMLElement;

describe('Toolbar native editing boundary', () => {
  it('keeps horizontal arrows in the editor until a collapsed caret reaches the matching edge', () => {
    expect(toolbarInputOwnsKey(keyEvent('ArrowLeft'), editor(2))).toBe(true);
    expect(toolbarInputOwnsKey(keyEvent('ArrowRight'), editor(2))).toBe(true);
    expect(toolbarInputOwnsKey(keyEvent('ArrowLeft'), editor(0))).toBe(false);
    expect(toolbarInputOwnsKey(keyEvent('ArrowRight'), editor(5))).toBe(false);
    expect(toolbarInputOwnsKey(keyEvent('ArrowRight'), editor(0, 5))).toBe(true);
  });
  it('preserves selection, editing commands, composition and native numeric arrows', () => {
    for (const flags of [
      { shiftKey: true },
      { ctrlKey: true },
      { altKey: true },
      { metaKey: true },
      { isComposing: true },
    ])
      expect(toolbarInputOwnsKey(keyEvent('ArrowRight', flags), editor(5))).toBe(true);
    for (const name of ['Home', 'End'])
      expect(toolbarInputOwnsKey(keyEvent(name), editor(2))).toBe(true);
    expect(toolbarInputOwnsKey(keyEvent('ArrowUp'), editor(null))).toBe(true);
    expect(toolbarInputOwnsKey(keyEvent('ArrowDown'), editor(2))).toBe(false);
  });
  it('respects RTL and textarea vertical boundaries', () => {
    expect(toolbarInputOwnsKey(keyEvent('ArrowLeft'), editor(0, 0, 'rtl'))).toBe(true);
    expect(toolbarInputOwnsKey(keyEvent('ArrowRight'), editor(0, 0, 'rtl'))).toBe(false);
    expect(toolbarInputOwnsKey(keyEvent('ArrowUp'), editor(2, 2, 'ltr', 'textarea'))).toBe(true);
    expect(toolbarInputOwnsKey(keyEvent('ArrowUp'), editor(0, 0, 'ltr', 'textarea'))).toBe(false);
  });
});

describe('Collection explicit eligibility', () => {
  it('allows an opted-in disabled entry while preserving the existing default filter', () => {
    const element = { hasAttribute: () => true } as unknown as HTMLElement;
    const ordinary = new CollectionRegistry();
    ordinary.register({ element });
    expect(ordinary.enabled()).toEqual([]);
    const composite = new CollectionRegistry();
    let eligible = true;
    composite.register({ element, eligible: () => eligible });
    expect(composite.enabled()).toHaveLength(1);
    eligible = false;
    expect(composite.enabled()).toEqual([]);
  });
});

const XHTML = 'http://www.w3.org/1999/xhtml';
const FILTER = ['disabled', 'hidden', 'inert', 'style', 'class', 'dir', 'href'];
const TREE = { childList: true, subtree: true, attributes: true, attributeFilter: FILTER };
const OWN = { attributes: true, attributeFilter: FILTER };

class RecordingObserver {
  static last: RecordingObserver | undefined;
  readonly observed: { target: unknown; options: MutationObserverInit }[] = [];
  constructor(readonly callback: () => void) {
    RecordingObserver.last = this;
  }
  observe(target: unknown, options: MutationObserverInit): void {
    this.observed.push({ target, options });
  }
  disconnect(): void {}
}

type ParentStub = ElementStub | ShadowStub | DocumentStub;
abstract class ContainerStub extends EventTarget {
  abstract nodeType: number;
  parentNode: ParentStub | null = null;
  readonly childNodes: ElementStub[] = [];
  append(...children: ElementStub[]): void {
    for (const child of children) {
      child.parentNode = this as unknown as ParentStub;
      this.childNodes.push(child);
    }
  }
}
class DocumentStub extends ContainerStub {
  nodeType = 9;
  activeElement: ElementStub | null = null;
  readonly defaultView = {
    MutationObserver: RecordingObserver,
    getComputedStyle: () => ({ direction: 'ltr', display: 'block', visibility: 'visible' }),
  };
  readonly body: ElementStub;
  constructor() {
    super();
    this.body = new ElementStub(this, 'body');
    this.append(this.body);
  }
}
class ShadowStub extends ContainerStub {
  nodeType = 11;
  activeElement: ElementStub | null = null;
  constructor(readonly host: ElementStub) {
    super();
  }
}
class ElementStub extends ContainerStub {
  nodeType = 1;
  namespaceURI = XHTML;
  assignedSlot: ElementStub | null = null;
  shadowRoot: ShadowStub | null = null;
  readonly assigned: ElementStub[] = [];
  readonly #attributes = new Map<string, string>();
  constructor(
    readonly ownerDocument: DocumentStub,
    readonly localName = 'div',
  ) {
    super();
  }
  getAttribute(name: string): string | null {
    return this.#attributes.get(name) ?? null;
  }
  setAttribute(name: string, value: string): void {
    this.#attributes.set(name, value);
  }
  removeAttribute(name: string): void {
    this.#attributes.delete(name);
  }
  hasAttribute(name: string): boolean {
    return this.#attributes.has(name);
  }
  matches(selector: string): boolean {
    return selector
      .split(',')
      .map((part) => part.trim())
      .some((part) =>
        part === ':disabled'
          ? this.hasAttribute('disabled')
          : part === '[aria-disabled="true"]'
            ? this.getAttribute('aria-disabled') === 'true'
            : this.hasAttribute(part.slice(1, -1)),
      );
  }
  getClientRects(): object[] {
    return [{}];
  }
  focus(): void {
    this.ownerDocument.activeElement = this;
  }
  getRootNode(): ParentStub {
    let node = this.parentNode ?? this;
    while (node.parentNode) node = node.parentNode;
    return node;
  }
  /** Connected through shadow hosts to the document, as the platform reports it. */
  get isConnected(): boolean {
    let root = this.getRootNode();
    while (root.nodeType === 11) root = (root as ShadowStub).host.getRootNode();
    return root === this.ownerDocument;
  }
  remove(): void {
    const siblings = this.parentNode?.childNodes;
    siblings?.splice(siblings.indexOf(this), 1);
    this.parentNode = null;
  }
  assignedNodes(): ElementStub[] {
    return this.assigned;
  }
  attachShadow(): ShadowStub {
    return (this.shadowRoot = new ShadowStub(this));
  }
  /** Slots `elements` (light children of this slot's host) into this slot. */
  assign(...elements: ElementStub[]): void {
    for (const element of elements) {
      element.assignedSlot = this;
      this.assigned.push(element);
    }
  }
}

/** A fresh document and an element factory appending to `parent`. */
function world() {
  const document = new DocumentStub();
  const element = (parent: ParentStub = document.body, localName = 'div') => {
    const created = new ElementStub(document, localName);
    parent.append(created);
    return created;
  };
  return { document, element };
}
const html = (element: ElementStub) => element as unknown as HTMLElement;
/** The last observer's `observe` calls, each target named through `names` ('other' if absent). */
const observedTargets = (names: Map<unknown, string>) =>
  RecordingObserver.last!.observed.map(({ target, options }) => [
    names.get(target) ?? 'other',
    options,
  ]);
const settle = () => new Promise((resolve) => setTimeout(resolve));
/** A primary-button (or `button`) `pointerdown` whose composed path is `path`. */
function pointerEvent(button: number, path: EventTarget[], cancelable = true): PointerEvent {
  const event = Object.assign(new Event('pointerdown', { cancelable }), {
    button,
    pointerType: 'mouse',
  });
  Object.defineProperty(event, 'composedPath', { value: () => path });
  return event as unknown as PointerEvent;
}

describe('Toolbar observation scope', () => {
  it('observes items of a shared or outer tree as elements and a tree inside the toolbar whole (`node-010076`, `uwg-te-req-perf-1`)', () => {
    const { element } = world();
    const canvas = element().attachShadow();
    element(canvas);
    const bar = element(canvas);
    const barShadow = bar.attachShadow();
    const slot = element(barShadow, 'slot');
    const a = element(bar, 'button');
    slot.assign(a);
    const b = element(barShadow, 'button');
    const nested = element(barShadow).attachShadow();
    const c = element(nested, 'button');
    const toolbar = new ToolbarController(html(bar));
    for (const item of [a, b, c]) toolbar.registerItem(html(item), { kind: 'button' });
    const names = new Map<unknown, string>([
      [canvas, 'canvas'],
      [bar, 'bar'],
      [barShadow, 'barShadow'],
      [a, 'a'],
      [b, 'b'],
      [c, 'c'],
      [nested, 'nested'],
    ]);
    expect(observedTargets(names)).toEqual([
      ['bar', TREE],
      ['barShadow', TREE],
      ['a', OWN],
      ['nested', TREE],
    ]);
    toolbar.dispose();
  });

  it('watches an item slotted from the document by its own attributes (`node-010070`, `node-010076`)', async () => {
    const { document, element } = world();
    const panel = element();
    const bar = element(panel.attachShadow());
    const slot = element(bar, 'slot');
    const p = element(panel, 'button');
    slot.assign(p);
    const q = element(bar, 'button');
    const toolbar = new ToolbarController(html(bar));
    toolbar.registerItem(html(p), { kind: 'button' });
    toolbar.registerItem(html(q), { kind: 'button' });
    const observer = RecordingObserver.last!;
    const names = new Map<unknown, string>([
      [document, 'document'],
      [bar, 'bar'],
      [p, 'p'],
      [q, 'q'],
    ]);
    expect(observedTargets(names)).toContainEqual(['p', OWN]);
    expect(observedTargets(names).map(([name]) => name)).not.toContain('document');
    await settle();
    expect([p.getAttribute('tabindex'), q.getAttribute('tabindex')]).toEqual(['0', '-1']);
    p.setAttribute('hidden', '');
    observer.callback();
    await settle();
    expect([p.getAttribute('tabindex'), q.getAttribute('tabindex')]).toEqual(['-1', '0']);
    toolbar.dispose();
  });
});

describe('Toolbar keys on a disabled item', () => {
  it('lets Escape and Tab through a disabled focusable item and blocks Enter, Space and character keys (`uwg-te-req-key-4`, `node-010070`)', async () => {
    const { document, element } = world();
    const bar = element();
    const x = element(bar, 'button');
    const y = element(bar, 'button');
    const toolbar = new ToolbarController(html(bar));
    toolbar.registerItem(html(x), { kind: 'button', disabled: true });
    toolbar.registerItem(html(y), { kind: 'button' });
    await settle();
    const press = (key: string) => {
      const event = keyEvent(key, { path: [x, bar, document.body, document] });
      const stop = vi.spyOn(event, 'stopPropagation');
      const stopImmediate = vi.spyOn(event, 'stopImmediatePropagation');
      bar.dispatchEvent(event);
      return {
        prevented: event.defaultPrevented,
        stopped: stop.mock.calls.length + stopImmediate.mock.calls.length > 0,
      };
    };
    for (const key of ['Escape', 'Tab'])
      expect(press(key), key).toEqual({ prevented: false, stopped: false });
    for (const key of ['Enter', ' ', 'a'])
      expect(press(key), key).toEqual({ prevented: true, stopped: false });
    expect(press('ArrowRight')).toEqual({ prevented: true, stopped: true });
    expect(document.activeElement).toBe(y);
    await settle();
    expect([x.getAttribute('tabindex'), y.getAttribute('tabindex')]).toEqual(['-1', '0']);
    toolbar.dispose();
  });
});

describe('Toolbar removal repair', () => {
  it('moves focus from a removed item to the nearest remaining navigation stop, a disabled but focusable one included, without activation (`node-010076`, `node-010070`)', async () => {
    const { document, element } = world();
    const bar = element();
    const names = ['save', 'undo', 'redo', 'paste', 'help'] as const;
    const [save, undo, redo, paste, help] = names.map(() => element(bar, 'button')) as [
      ElementStub,
      ElementStub,
      ElementStub,
      ElementStub,
      ElementStub,
    ];
    const named = new Map<unknown, string>(
      [save, undo, redo, paste, help].map((item, index) => [item, names[index]!]),
    );
    const activated: string[] = [];
    bar.addEventListener('click', (event) => activated.push(named.get(event.composedPath()[0])!));
    const toolbar = new ToolbarController(html(bar));
    toolbar.registerItem(html(save), { kind: 'button' });
    toolbar.registerItem(html(undo), { kind: 'button' });
    toolbar.registerItem(html(redo), { kind: 'button', disabled: true });
    toolbar.registerItem(html(paste), {
      kind: 'button',
      disabled: true,
      focusableWhenDisabled: false,
    });
    toolbar.registerItem(html(help), { kind: 'button' });
    await settle();
    /** Focuses `item`, removes it and reports where focus and the tab stop went. */
    const removeFocused = async (item: ElementStub) => {
      item.focus();
      const event = new Event('focusin');
      Object.defineProperty(event, 'composedPath', {
        value: () => [item, bar, document.body, document],
      });
      bar.dispatchEvent(event);
      await settle();
      item.remove();
      toolbar.refresh();
      await settle();
      return {
        focus: named.get(document.activeElement),
        stop: [...named]
          .filter(([node]) => (node as ElementStub).getAttribute('tabindex') === '0')
          .map(([, name]) => name),
      };
    };
    expect(await removeFocused(undo)).toEqual({ focus: 'redo', stop: ['redo'] });
    expect(redo.getAttribute('aria-disabled')).toBe('true');
    expect(await removeFocused(redo)).toEqual({ focus: 'help', stop: ['help'] });
    expect(await removeFocused(help)).toEqual({ focus: 'save', stop: ['save'] });
    expect(activated).toEqual([]);
    toolbar.dispose();
  });

  it('moves only the tab stop when the focused item leaves the root still connected and focused, as an atomic move does (`node-010076`)', async () => {
    /**
     * Moves the focused Rotate from its toolbar to the end of another toolbar's root. The move
     * keeps it connected and, like an atomic move, focused; `blur` drops focus to the body as a
     * plain move does. With `rehome` its registration moves to the other toolbar, as a Toggle
     * group's members do; otherwise it stays with its old toolbar, as an authored item does.
     */
    const moveFocused = async ({ rehome = false, blur = false } = {}) => {
      const { document, element } = world();
      const bar = element();
      const otherBar = element();
      const [crop, rotate] = [element(bar, 'button'), element(bar, 'button')];
      const [save, help] = [element(otherBar, 'button'), element(otherBar, 'button')];
      const named = new Map<unknown, string>([
        [crop, 'crop'],
        [rotate, 'rotate'],
        [save, 'save'],
        [help, 'help'],
      ]);
      const activated: string[] = [];
      for (const root of [bar, otherBar])
        root.addEventListener('click', (event) =>
          activated.push(named.get(event.composedPath()[0])!),
        );
      const toolbar = new ToolbarController(html(bar));
      const other = new ToolbarController(html(otherBar));
      toolbar.registerItem(html(crop), { kind: 'button' });
      const registration = toolbar.registerItem(html(rotate), { kind: 'button' });
      for (const item of [save, help]) other.registerItem(html(item), { kind: 'button' });
      await settle();
      rotate.focus();
      const focusIn = new Event('focusin');
      Object.defineProperty(focusIn, 'composedPath', {
        value: () => [rotate, bar, document.body, document],
      });
      bar.dispatchEvent(focusIn);
      await settle();
      rotate.remove();
      otherBar.append(rotate);
      if (blur) document.activeElement = document.body;
      if (rehome) {
        registration.dispose();
        other.registerItem(html(rotate), { kind: 'button' });
      }
      toolbar.refresh();
      other.refresh();
      await settle();
      const result = {
        connected: rotate.isConnected,
        focus: named.get(document.activeElement) ?? 'body',
        stops: [...named]
          .filter(([node]) => (node as ElementStub).getAttribute('tabindex') === '0')
          .map(([, name]) => name),
        rotateTabindex: rotate.getAttribute('tabindex'),
        activated,
      };
      other.dispose();
      toolbar.dispose();
      return result;
    };
    expect(await moveFocused()).toEqual({
      connected: true,
      focus: 'rotate',
      stops: ['crop', 'save'],
      rotateTabindex: null,
      activated: [],
    });
    expect(await moveFocused({ rehome: true })).toEqual({
      connected: true,
      focus: 'rotate',
      stops: ['crop', 'save'],
      rotateTabindex: '-1',
      activated: [],
    });
    // Focus that actually left the moved item is still repaired to the old toolbar's stop.
    expect(await moveFocused({ blur: true })).toEqual({
      connected: true,
      focus: 'crop',
      stops: ['crop', 'save'],
      rotateTabindex: null,
      activated: [],
    });
  });

  it('measures nearness from where the focused item was when items before it leave in the same pass (`node-010076`, `node-010070`)', async () => {
    /**
     * A toolbar of Save, then Undo and Redo in an `edit` element, then Single page, Two pages and
     * Continuous in a `view` element, then Ruler, Grid (disabled but focusable), Find and Help.
     * Focuses `focused` and then, in one pass, takes the whole element `leaving` out of the root.
     * `move` keeps it connected and focused, as an atomic move does, and releases its items'
     * registrations, as a Toggle group's Toggles leave; otherwise it is removed and its items stay
     * registered, as authored items do.
     */
    const leaveTogether = async (
      leaving: 'edit' | 'view',
      focused: string,
      { move = false } = {},
    ) => {
      const { document, element } = world();
      const bar = element();
      const save = element(bar, 'button');
      const edit = element(bar);
      const [undo, redo] = [element(edit, 'button'), element(edit, 'button')];
      const view = element(bar);
      const [single, two, scroll] = [
        element(view, 'button'),
        element(view, 'button'),
        element(view, 'button'),
      ];
      const [ruler, grid, find, help] = [
        element(bar, 'button'),
        element(bar, 'button'),
        element(bar, 'button'),
        element(bar, 'button'),
      ];
      const items = { save, undo, redo, single, two, scroll, ruler, grid, find, help };
      const named = new Map<unknown, string>(
        Object.entries(items).map(([name, item]) => [item, name]),
      );
      const activated: string[] = [];
      bar.addEventListener('click', (event) => activated.push(named.get(event.composedPath()[0])!));
      const toolbar = new ToolbarController(html(bar));
      const registrations = new Map(
        Object.values(items).map((item) => [
          item,
          toolbar.registerItem(html(item), { kind: 'button', disabled: item === grid }),
        ]),
      );
      await settle();
      const target = items[focused as keyof typeof items];
      target.focus();
      const focusIn = new Event('focusin');
      Object.defineProperty(focusIn, 'composedPath', {
        value: () => [target, ...(target.parentNode === bar ? [] : [target.parentNode]), bar],
      });
      bar.dispatchEvent(focusIn);
      await settle();
      const group = leaving === 'edit' ? edit : view;
      group.remove();
      if (move) {
        document.body.append(group);
        for (const item of group.childNodes) registrations.get(item)!.dispose();
      }
      toolbar.refresh();
      await settle();
      const result = {
        focus: named.get(document.activeElement) ?? 'body',
        stop: [...named]
          .filter(([node]) => (node as ElementStub).getAttribute('tabindex') === '0')
          .map(([, name]) => name),
        activated,
      };
      toolbar.dispose();
      return result;
    };
    // The three page-view items move out together while Continuous keeps focus: the stop goes to
    // Ruler, which followed them, not to the item that now has Continuous's old index.
    expect(await leaveTogether('view', 'scroll', { move: true })).toEqual({
      focus: 'scroll',
      stop: ['ruler'],
      activated: [],
    });
    // Removed together with Undo, the focused Redo hands focus to Single page, which followed it.
    expect(await leaveTogether('edit', 'redo')).toEqual({
      focus: 'single',
      stop: ['single'],
      activated: [],
    });
    // Removed with the other page-view items, the focused Two pages hands focus to Ruler, not to
    // Grid, which comes after it.
    expect(await leaveTogether('view', 'two')).toEqual({
      focus: 'ruler',
      stop: ['ruler'],
      activated: [],
    });
  });
});

/**
 * A toolbar of `before`, a menu trigger and `after`. The trigger's own key handler runs before the
 * toolbar's and consumes ArrowDown and ArrowUp, its open keys, unless it is disabled.
 */
function triggerWorld(orientation: 'horizontal' | 'vertical') {
  const { document, element } = world();
  const bar = element();
  const [before, trigger, after] = [
    element(bar, 'button'),
    element(bar, 'button'),
    element(bar, 'button'),
  ];
  const names = new Map<unknown, string>([
    [before, 'before'],
    [trigger, 'trigger'],
    [after, 'after'],
  ]);
  const opened: string[] = [];
  let triggerDisabled = false;
  bar.addEventListener('keydown', (event) => {
    const { key } = event as KeyboardEvent;
    if (triggerDisabled || !event.composedPath().includes(trigger)) return;
    if (key !== 'ArrowDown' && key !== 'ArrowUp') return;
    event.preventDefault();
    opened.push(key);
  });
  const toolbar = new ToolbarController(html(bar), { orientation });
  const registrations = [before, trigger, after].map((item) =>
    toolbar.registerItem(html(item), { kind: 'button' }),
  );
  const press = (from: ElementStub, key: string) => {
    from.focus();
    const event = keyEvent(key, { path: [from, bar, document.body, document] });
    const stop = vi.spyOn(event, 'stopPropagation');
    bar.dispatchEvent(event);
    return {
      prevented: event.defaultPrevented,
      stopped: stop.mock.calls.length > 0,
      focus: names.get(document.activeElement),
    };
  };
  const disableTrigger = () => {
    triggerDisabled = true;
    registrations[1]!.update({ disabled: true });
  };
  const stop = () =>
    names.get(
      [...names.keys()].find((item) => (item as ElementStub).getAttribute('tabindex') === '0'),
    );
  return { toolbar, before, trigger, after, opened, press, disableTrigger, stop };
}

/** The toolbar moved focus to `focus` and handled the key. */
const moved = (focus: string) => ({ prevented: true, stopped: true, focus });
/** Focus stayed on the trigger; `prevented` tells whether the trigger consumed the key. */
const stayed = (prevented: boolean) => ({ prevented, stopped: false, focus: 'trigger' });

describe('Toolbar keys a menu trigger owns', () => {
  it('leaves ArrowDown and ArrowUp that a menu trigger consumed to it in a vertical toolbar, and moves on Home, End and a disabled trigger (`mp-kb-guards`, `node-010070`, `node-011941`)', async () => {
    const { toolbar, before, trigger, after, opened, press, disableTrigger, stop } =
      triggerWorld('vertical');
    await settle();
    expect(press(before, 'ArrowDown')).toEqual(moved('trigger'));
    for (const key of ['ArrowDown', 'ArrowUp'])
      expect(press(trigger, key), key).toEqual(stayed(true));
    expect(opened).toEqual(['ArrowDown', 'ArrowUp']);
    await settle();
    expect(stop()).toBe('trigger');
    for (const key of ['ArrowLeft', 'ArrowRight'])
      expect(press(trigger, key), key).toEqual(stayed(false));
    expect(press(trigger, 'End')).toEqual(moved('after'));
    expect(press(after, 'Home')).toEqual(moved('before'));
    expect(press(after, 'ArrowUp')).toEqual(moved('trigger'));
    disableTrigger();
    await settle();
    expect(press(trigger, 'ArrowDown')).toEqual(moved('after'));
    expect(press(trigger, 'ArrowUp')).toEqual(moved('before'));
    expect(opened).toEqual(['ArrowDown', 'ArrowUp']);
    toolbar.dispose();
  });

  it('moves past a menu trigger on the arrows of a horizontal toolbar and leaves it ArrowDown and ArrowUp (`mp-kb-guards`, `node-010070`, `node-011941`)', async () => {
    const { toolbar, trigger, opened, press, stop } = triggerWorld('horizontal');
    await settle();
    for (const key of ['ArrowDown', 'ArrowUp'])
      expect(press(trigger, key), key).toEqual(stayed(true));
    expect(opened).toEqual(['ArrowDown', 'ArrowUp']);
    expect(press(trigger, 'ArrowRight')).toEqual(moved('after'));
    expect(press(trigger, 'ArrowLeft')).toEqual(moved('before'));
    await settle();
    expect(stop()).toBe('before');
    toolbar.dispose();
  });
});

describe('Toolbar lookup', () => {
  it('finds the nearest controller across shadow roots and slots (`uwg-te-toggle-group-req-toolbar`, `node-009977`)', () => {
    const { element } = world();
    const bar = element();
    const barShadow = bar.attachShadow();
    const deep = element(element(barShadow).attachShadow());
    const slot = element(barShadow, 'slot');
    const slotted = element(bar);
    slot.assign(slotted);
    const innerBar = element(barShadow);
    const innerItem = element(innerBar);
    const outside = element();
    const toolbar = new ToolbarController(html(bar));
    const inner = new ToolbarController(html(innerBar));
    expect(toolbarFor(html(deep))).toBe(toolbar);
    expect(toolbarFor(html(slotted))).toBe(toolbar);
    expect(toolbarFor(html(bar))).toBe(toolbar);
    expect(toolbarFor(html(outside))).toBeUndefined();
    expect(toolbarFor(html(innerItem))).toBe(inner);
    expect(toolbarFor(html(innerBar))).toBe(inner);
    inner.dispose();
    toolbar.dispose();
  });

  it('keeps elements of a popup or dialog inside a toolbar out of it (`uwg-te-toggle-group-req-toolbar`)', () => {
    const { element } = world();
    const bar = element();
    const popup = element(bar);
    popup.setAttribute('popover', 'manual');
    const inPopup = element(popup);
    const dialog = element(bar.attachShadow(), 'dialog');
    const inDialog = element(dialog);
    const popupBar = element();
    popupBar.setAttribute('popover', '');
    const inPopupBar = element(popupBar);
    const toolbar = new ToolbarController(html(bar));
    const popupToolbar = new ToolbarController(html(popupBar));
    expect(toolbarFor(html(inPopupBar))).toBe(popupToolbar);
    expect(toolbarFor(html(popup))).toBeUndefined();
    expect(toolbarFor(html(inPopup))).toBeUndefined();
    expect(toolbarFor(html(inDialog))).toBeUndefined();
    popupToolbar.dispose();
    toolbar.dispose();
  });

  it('forgets a disposed controller (`node-010076`)', () => {
    const { element } = world();
    const bar = element();
    const item = element(bar, 'button');
    const toolbar = new ToolbarController(html(bar));
    toolbar.registerItem(html(item), { kind: 'button' });
    expect([toolbarFor(html(item)), toolbarItemOwner(html(item))]).toEqual([toolbar, toolbar]);
    toolbar.dispose();
    expect([toolbarFor(html(item)), toolbarItemOwner(html(item))]).toEqual([undefined, undefined]);
  });

  it('reports the controller an element is registered with (`node-010076`)', () => {
    const { element } = world();
    const bar = element();
    const item = element(bar, 'button');
    const toolbar = new ToolbarController(html(bar));
    expect(toolbarItemOwner(html(item))).toBeUndefined();
    const registration = toolbar.registerItem(html(item), { kind: 'button' });
    expect(toolbarItemOwner(html(item))).toBe(toolbar);
    registration.dispose();
    expect(toolbarItemOwner(html(item))).toBeUndefined();
    toolbar.dispose();
  });

  it('keeps one membership registry that the controller writes and the membership lookups read (`node-009977`, `uwg-te-toggle-group-req-toolbar`)', () => {
    const { element } = world();
    const bar = element();
    const item = element(bar, 'button');
    const member = element(bar);
    const connect = vi.fn();
    const cancel = whenToolbar(html(member), connect);
    const toolbar = new ToolbarController(html(bar));
    toolbar.registerItem(html(item), { kind: 'button' });
    expect([roots.get(html(bar)), itemOwners.get(html(item))]).toEqual([toolbar, toolbar]);
    expect([toolbarFor(html(member)), toolbarItemOwner(html(item))]).toEqual([toolbar, toolbar]);
    expect(connect.mock.calls).toEqual([[toolbar]]);
    toolbar.dispose();
    expect([roots.has(html(bar)), itemOwners.has(html(item))]).toEqual([false, false]);
    cancel();
  });
});

describe('Toolbar late connection', () => {
  it('connects an element that exists before its toolbar, and again to the next toolbar after disposal (`uwg-te-toggle-group-req-toolbar`)', () => {
    const { element } = world();
    const bar = element();
    const member = element(bar);
    const other = element();
    const seen: (ToolbarController | undefined)[] = [];
    const cleanup = vi.fn();
    const connect = vi.fn((toolbar: ToolbarController) => {
      seen.push(toolbarFor(html(member)));
      expect(toolbar.host).toBe(bar);
      return cleanup;
    });
    const cancel = whenToolbar(html(member), connect);
    expect(connect).not.toHaveBeenCalled();
    const first = new ToolbarController(html(bar));
    expect(connect.mock.calls).toEqual([[first]]);
    expect(seen).toEqual([first]);
    const unrelated = new ToolbarController(html(other));
    expect(connect).toHaveBeenCalledTimes(1);
    first.dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(1);
    const second = new ToolbarController(html(bar));
    expect(connect.mock.calls).toEqual([[first], [second]]);
    cancel();
    expect(cleanup).toHaveBeenCalledTimes(2);
    second.dispose();
    const third = new ToolbarController(html(bar));
    expect(connect).toHaveBeenCalledTimes(2);
    expect(cleanup).toHaveBeenCalledTimes(2);
    for (const toolbar of [unrelated, third]) toolbar.dispose();
  });

  it('connects at once to an existing toolbar and cancels idempotently (`uwg-te-toggle-group-req-toolbar`)', () => {
    const { element } = world();
    const bar = element();
    const member = element(bar);
    const toolbar = new ToolbarController(html(bar));
    const cleanup = vi.fn();
    const connect = vi.fn(() => cleanup);
    const cancel = whenToolbar(html(member), connect);
    expect(connect.mock.calls).toEqual([[toolbar]]);
    cancel();
    cancel();
    expect(cleanup).toHaveBeenCalledTimes(1);
    toolbar.dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('moves a connection to a nearer toolbar created around the element and back after its disposal (`node-009977`)', () => {
    const { element } = world();
    const bar = element();
    const innerHost = element(bar);
    const member = element(innerHost);
    const outer = new ToolbarController(html(bar));
    const log: string[] = [];
    const name = (toolbar: ToolbarController) => (toolbar === outer ? 'outer' : 'inner');
    const cancel = whenToolbar(html(member), (toolbar) => {
      log.push(`connect ${name(toolbar)}`);
      return () => log.push(`cleanup ${name(toolbar)}`);
    });
    const inner = new ToolbarController(html(innerHost));
    inner.dispose();
    expect(log).toEqual([
      'connect outer',
      'cleanup outer',
      'connect inner',
      'cleanup inner',
      'connect outer',
    ]);
    cancel();
    outer.dispose();
    expect(log.at(-1)).toBe('cleanup outer');
  });

  it('keeps a toolbar working when a connection throws (`node-010076`)', () => {
    const { element } = world();
    const bar = element();
    const failing = element(bar);
    const working = element(bar);
    const error = new Error('connect failed');
    const queued: (() => void)[] = [];
    vi.stubGlobal('queueMicrotask', (callback: () => void) => queued.push(callback));
    try {
      const cancelFailing = whenToolbar(html(failing), () => {
        throw error;
      });
      const connected = vi.fn();
      const cancelWorking = whenToolbar(html(working), connected);
      const toolbar = new ToolbarController(html(bar));
      expect(connected.mock.calls).toEqual([[toolbar]]);
      const thrown: unknown[] = [];
      for (const callback of queued.splice(0))
        try {
          callback();
        } catch (caught) {
          thrown.push(caught);
        }
      expect(thrown).toEqual([error]);
      for (const cancel of [cancelFailing, cancelWorking]) cancel();
      toolbar.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('Toolbar focus-preserving press', () => {
  /** A toolbar of `items` (each a Button but the `input`), with an item-level listener after it. */
  function pressWorld(options: ToolbarOptions, ...kinds: ToolbarItemOptions['kind'][]) {
    const { document, element } = world();
    const bar = element();
    const toolbar = new ToolbarController(html(bar), options);
    const items = kinds.map((kind) => element(bar, kind === 'input' ? 'input' : 'button'));
    const registrations = items.map((item, index) =>
      toolbar.registerItem(html(item), { kind: kinds[index]! }),
    );
    const seen: boolean[] = [];
    bar.addEventListener('pointerdown', (event) => seen.push(event.defaultPrevented));
    const press = (item: ElementStub, button = 0) => {
      const event = pointerEvent(button, [item, bar, document.body, document]);
      const stopImmediate = vi.spyOn(event, 'stopImmediatePropagation');
      seen.length = 0;
      bar.dispatchEvent(event);
      return {
        prevented: event.defaultPrevented,
        stopped: stopImmediate.mock.calls.length > 0,
        itemSaw: [...seen],
      };
    };
    return { document, bar, toolbar, items, registrations, press };
  }

  it('holds focus for a primary press on an item without stopping it, and still blocks a disabled item first (`uwg-te-tb-req-press`, `uwg-te-req-key-8`, `node-010070`)', () => {
    const { toolbar, items, registrations, press } = pressWorld(
      { preserveFocusOnPress: true },
      'button',
      'button',
    );
    registrations[1]!.update({ disabled: true });
    expect(press(items[0]!)).toEqual({ prevented: true, stopped: false, itemSaw: [true] });
    expect(press(items[1]!)).toEqual({ prevented: true, stopped: true, itemSaw: [] });
    toolbar.dispose();
  });

  it('follows the root option and the item’s own value at press time (`uwg-te-tb-req-press`)', () => {
    const { toolbar, items, registrations, press } = pressWorld(
      { preserveFocusOnPress: true },
      'button',
    );
    const item = items[0]!;
    expect(press(item).prevented).toBe(true);
    registrations[0]!.update({ preserveFocusOnPress: false });
    expect(press(item).prevented).toBe(false);
    registrations[0]!.update({ preserveFocusOnPress: undefined });
    expect(press(item).prevented).toBe(true);
    toolbar.update({ preserveFocusOnPress: false });
    expect(press(item).prevented).toBe(false);
    registrations[0]!.update({ preserveFocusOnPress: true });
    expect(press(item).prevented).toBe(true);
    toolbar.dispose();
  });

  it('leaves inputs, secondary presses and presses made while focus is in the toolbar to the browser (`uwg-te-tb-req-press`)', () => {
    const { document, toolbar, items, registrations, press } = pressWorld(
      { preserveFocusOnPress: true },
      'button',
      'input',
    );
    const [button, input] = items as [ElementStub, ElementStub];
    expect(press(button).prevented).toBe(true);
    registrations[1]!.update({ preserveFocusOnPress: true });
    expect(press(input).prevented).toBe(false);
    expect(press(button, 2).prevented).toBe(false);
    document.activeElement = input;
    expect(press(button).prevented).toBe(false);
    toolbar.dispose();
  });

  it('exposes the press option as a read-only accessor, default false (`uwg-te-tb-req-press`)', () => {
    const { element } = world();
    const plain = new ToolbarController(html(element()));
    expect(plain.preserveFocusOnPress).toBe(false);
    plain.update({ preserveFocusOnPress: true });
    expect(plain.preserveFocusOnPress).toBe(true);
    plain.update({ preserveFocusOnPress: undefined });
    expect(plain.preserveFocusOnPress).toBe(false);
    const held = new ToolbarController(html(element()), { preserveFocusOnPress: true });
    expect(held.preserveFocusOnPress).toBe(true);
    for (const toolbar of [plain, held]) toolbar.dispose();
  });
});

/** The composed path from `target` to the document, across shadow roots. */
function pathOf(target: ElementStub): EventTarget[] {
  const path: EventTarget[] = [];
  for (
    let node: ContainerStub | null = target;
    node;
    node = node.nodeType === 11 ? (node as ShadowStub).host : node.parentNode
  )
    path.push(node);
  return path;
}

describe('Toolbar press on its own surface', () => {
  /**
   * A root with a Button, an input item, a separator, a group holding a Button, a plain wrapper
   * holding a Button, popup and dialog content, a select and an element with a tab index that are
   * not registered, and a nested root with its own controller. Each press reports whether it was
   * prevented or stopped, and what a later listener on the root saw.
   */
  function surfaceWorld(options: ToolbarOptions) {
    const { document, element } = world();
    const editor = element();
    const bar = element();
    const toolbar = new ToolbarController(html(bar), options);
    const bold = element(bar, 'button');
    const find = element(bar, 'input');
    const separator = element(bar);
    const group = element(bar);
    const grouped = element(group, 'button');
    const wrapper = element(bar, 'span');
    const wrapped = element(wrapper, 'button');
    const popup = element(bar);
    popup.setAttribute('popover', 'manual');
    const inPopup = element(popup);
    const inDialog = element(element(bar, 'dialog'));
    const select = Object.assign(element(bar, 'select'), { tabIndex: 0 });
    const focusable = element(bar);
    focusable.setAttribute('tabindex', '-1');
    const nestedBar = element(bar);
    const nestedSurface = element(nestedBar);
    const nested = new ToolbarController(html(nestedBar));
    const registrations = [bold, grouped, wrapped].map((button) =>
      toolbar.registerItem(html(button), { kind: 'button' }),
    );
    toolbar.registerItem(html(find), { kind: 'input' });
    toolbar.registerSeparator(html(separator));
    toolbar.registerGroup(html(group));
    const seen: boolean[] = [];
    bar.addEventListener('pointerdown', (event) => seen.push(event.defaultPrevented));
    document.activeElement = editor;
    const press = (target: ElementStub, button = 0) => {
      const event = pointerEvent(button, pathOf(target));
      const stopImmediate = vi.spyOn(event, 'stopImmediatePropagation');
      seen.length = 0;
      bar.dispatchEvent(event);
      return {
        prevented: event.defaultPrevented,
        stopped: stopImmediate.mock.calls.length > 0,
        rootSaw: [...seen],
      };
    };
    const targets = {
      ...{ bar, bold, find, separator, group, wrapper, inPopup, inDialog, select, focusable },
      ...{ nestedBar, nestedSurface },
    };
    const dispose = () => {
      nested.dispose();
      toolbar.dispose();
    };
    return { document, editor, toolbar, registrations, targets, press, dispose };
  }
  const held = { prevented: true, stopped: false, rootSaw: [true] };

  it('holds focus for a primary press on the root, a separator, a group element or a wrapper of an opted-in toolbar, and lets it propagate (`uwg-te-tb-req-press`, `node-009977`)', async () => {
    const { document, editor, targets, press, dispose } = surfaceWorld({
      preserveFocusOnPress: true,
    });
    await settle();
    for (const name of ['bar', 'separator', 'group', 'wrapper'] as const)
      expect(press(targets[name]), name).toEqual(held);
    await settle();
    expect(document.activeElement).toBe(editor);
    expect(targets.bold.getAttribute('tabindex')).toBe('0');
    dispose();
  });

  it('leaves surface presses to the browser unless the root opts in, and secondary presses always (`uwg-te-tb-req-press`)', () => {
    const { toolbar, registrations, targets, press, dispose } = surfaceWorld({});
    expect(press(targets.bar)).toEqual({ prevented: false, stopped: false, rootSaw: [false] });
    toolbar.update({ preserveFocusOnPress: true });
    expect(press(targets.bar)).toEqual(held);
    expect(press(targets.bar, 2).prevented).toBe(false);
    registrations[0]!.update({ preserveFocusOnPress: false });
    expect(press(targets.bold).prevented).toBe(false);
    expect(press(targets.separator).prevented).toBe(true);
    toolbar.update({ preserveFocusOnPress: false });
    expect(press(targets.separator).prevented).toBe(false);
    dispose();
  });

  it('leaves presses inside popup or dialog content, on an input item, on a control that is not registered and while focus is inside the toolbar to the browser (`uwg-te-tb-req-press`, `uwg-te-req-key-8`)', () => {
    const { document, editor, targets, press, dispose } = surfaceWorld({
      preserveFocusOnPress: true,
    });
    for (const name of ['inPopup', 'inDialog', 'find', 'select', 'focusable'] as const)
      expect(press(targets[name]).prevented, name).toBe(false);
    document.activeElement = targets.bold;
    expect(press(targets.bar).prevented).toBe(false);
    document.activeElement = editor;
    expect(press(targets.bar)).toEqual(held);
    dispose();
  });

  it('leaves the surface of a nested toolbar to its own controller (`node-009977`)', () => {
    const { targets, press, dispose } = surfaceWorld({ preserveFocusOnPress: true });
    for (const name of ['nestedBar', 'nestedSurface'] as const)
      expect(press(targets[name]).prevented, name).toBe(false);
    expect(press(targets.bar)).toEqual(held);
    dispose();
  });
});

/** A library control host with `addController` and `requestUpdate`. */
class CompositeHostStub extends ElementStub {
  addController(): void {}
  requestUpdate(): void {}
}
type CompositeHost = ConstructorParameters<typeof CompositeControlController>[0];

describe('Toolbar fully disabled mode', () => {
  /** A library control host appended to `parent`, whose inner `localName` sits in its shadow root. */
  function composite(document: DocumentStub, parent: ParentStub, localName: string) {
    const host = new CompositeHostStub(document, `tp-${localName}`);
    parent.append(host);
    const inner = new ElementStub(document, localName);
    host.attachShadow().append(inner);
    const control = new CompositeControlController(
      host as unknown as CompositeHost,
      () => html(inner),
      () => false,
    );
    return { host, control };
  }
  /** A cancelable mouse event of `type` with `button` whose composed path is `path`. */
  function mouseEvent(type: string, button: number, path: EventTarget[]): MouseEvent {
    const event = Object.assign(new Event(type, { cancelable: true }), { button });
    Object.defineProperty(event, 'composedPath', { value: () => path });
    return event as unknown as MouseEvent;
  }
  /** The names of `items` holding the tab stop. */
  const stops = (items: Record<string, ElementStub>) =>
    Object.entries(items)
      .filter(([, item]) => item.getAttribute('tabindex') === '0')
      .map(([name]) => name);
  /** Native state of `item`: `disabled`, `tabindex`, `aria-disabled` and `data-disabled`. */
  const nativeState = (item: ElementStub) =>
    ['disabled', 'tabindex', 'aria-disabled', 'data-disabled'].map((name) =>
      item.getAttribute(name),
    );
  /** A `bar` with native Save and Undo Buttons, a Find input and a Help link, unregistered. */
  function nativeWorld() {
    const { document, element } = world();
    const bar = element();
    const save = element(bar, 'button');
    const undo = element(bar, 'button');
    const find = element(bar, 'input');
    const help = element(bar, 'a');
    help.setAttribute('href', '#help');
    const reached: string[] = [];
    const listen = () => {
      for (const type of ['pointerdown', 'click', 'auxclick'])
        bar.addEventListener(type, () => reached.push(type));
    };
    /** Dispatches a key on `from` at the root and reports whether it was prevented. */
    const key = (from: ElementStub, name: string) => {
      const event = keyEvent(name, { path: pathOf(from) });
      bar.dispatchEvent(event);
      return event.defaultPrevented;
    };
    /** Dispatches a press or click on `on` and reports prevention and the listeners it reached. */
    const mouse = (on: ElementStub, type: string, button = 0) => {
      reached.length = 0;
      const event =
        type === 'pointerdown'
          ? pointerEvent(button, pathOf(on))
          : mouseEvent(type, button, pathOf(on));
      bar.dispatchEvent(event);
      return { prevented: event.defaultPrevented, reached: [...reached] };
    };
    return { document, bar, save, undo, find, help, listen, key, mouse };
  }

  it('keeps every control of a disabled root a disabled but focusable stop by default, a registration that permits it explicitly included, and links independent (`node-010070`, `node-009984`)', async () => {
    const { document, bar, save, undo, help, listen, key, mouse } = nativeWorld();
    help.setAttribute('aria-disabled', 'false');
    const toolbar = new ToolbarController(html(bar), { disabled: true });
    listen();
    toolbar.registerItem(html(save), { kind: 'button' });
    toolbar.registerItem(html(undo), { kind: 'button', focusableWhenDisabled: true });
    toolbar.registerItem(html(help), { kind: 'link' });
    await settle();
    expect(nativeState(save)).toEqual([null, '0', 'true', '']);
    expect(nativeState(undo)).toEqual([null, '-1', 'true', '']);
    expect(nativeState(help)).toEqual([null, '-1', 'false', null]);
    expect(stops({ save, undo, help })).toEqual(['save']);
    expect(key(save, 'ArrowRight')).toBe(true);
    expect(document.activeElement).toBe(undo);
    expect(key(undo, 'ArrowRight')).toBe(true);
    expect(document.activeElement).toBe(help);
    expect(key(save, 'Escape')).toBe(false);
    for (const type of ['click', 'auxclick'])
      expect(mouse(help, type, type === 'auxclick' ? 1 : 0), type).toEqual({
        prevented: false,
        reached: [type],
      });
    toolbar.dispose();
  });

  it('skips every control of a disabled root in the fully disabled mode, links and inputs included, whatever its registration permits (`node-010070`, `node-001228`, `uwg-te-req-prop-3`)', async () => {
    const { bar, save, undo, find, help } = nativeWorld();
    const toolbar = new ToolbarController(html(bar), { disabled: true });
    toolbar.registerItem(html(save), { kind: 'button' });
    toolbar.registerItem(html(undo), { kind: 'button', focusableWhenDisabled: true });
    toolbar.registerItem(html(find), { kind: 'input' });
    toolbar.registerItem(html(help), { kind: 'link' });
    await settle();
    setToolbarDisabledMode(toolbar, 'fully');
    await settle();
    for (const [name, item] of Object.entries({ save, undo, find }))
      expect(nativeState(item), name).toEqual(['', '-1', 'true', '']);
    expect(nativeState(help)).toEqual([null, '-1', 'true', '']);
    expect(help.getAttribute('href')).toBe('#help');
    expect(stops({ save, undo, find, help })).toEqual([]);
    toolbar.update({ disabled: false });
    await settle();
    for (const [name, item] of Object.entries({ save, undo, find, help }))
      expect(nativeState(item), name).toEqual([null, name === 'save' ? '0' : '-1', null, null]);
    expect(help.getAttribute('href')).toBe('#help');
    toolbar.dispose();
  });

  it('keeps disabled controls of an enabled root focusable stops, and links independent, in the fully disabled mode (`uwg-te-req-a11y-2`, `node-010070`)', async () => {
    const { document, element } = world();
    const bar = element();
    const save = element(bar, 'button');
    const group = element(bar);
    const single = element(group, 'button');
    const spread = element(group, 'button');
    const help = element(bar, 'a');
    help.setAttribute('href', '#help');
    const toolbar = new ToolbarController(html(bar));
    setToolbarDisabledMode(toolbar, 'fully');
    toolbar.registerItem(html(save), { kind: 'button', disabled: true });
    toolbar.registerGroup(html(group), { disabled: true });
    for (const item of [single, spread]) toolbar.registerItem(html(item), { kind: 'button' });
    toolbar.registerItem(html(help), { kind: 'link' });
    await settle();
    for (const [name, item] of Object.entries({ save, single, spread }))
      expect(
        nativeState(item).filter((_, index) => index !== 1),
        name,
      ).toEqual([null, 'true', '']);
    expect(nativeState(help)).toEqual([null, '-1', null, null]);
    expect(stops({ save, single, spread, help })).toEqual(['save']);
    for (const [from, to] of [
      [save, single],
      [single, spread],
      [spread, help],
    ] as const) {
      const event = keyEvent('ArrowRight', { path: pathOf(from) });
      bar.dispatchEvent(event);
      expect(document.activeElement).toBe(to);
    }
    toolbar.dispose();
  });

  it('applies the fully disabled state to composite controls of every kind and restores it (`node-010070`, `node-001228`)', async () => {
    const { document, element } = world();
    const bar = element();
    const kinds = { button: 'button', input: 'input', link: 'a' } as const;
    const controls = Object.entries(kinds).map(([kind, localName]) => {
      const { host, control } = composite(document, bar, localName);
      return { kind: kind as keyof typeof kinds, host, control };
    });
    const toolbar = new ToolbarController(html(bar));
    setToolbarDisabledMode(toolbar, 'fully');
    for (const { kind, host } of controls) toolbar.registerItem(html(host), { kind });
    const states = () => controls.map(({ control }) => control.state);
    toolbar.update({ disabled: true });
    await settle();
    expect(states()).toEqual(
      controls.map(() => ({ disabled: true, focusableWhenDisabled: false, tabIndex: -1 })),
    );
    toolbar.update({ disabled: false });
    await settle();
    expect(states()).toEqual(
      [0, -1, -1].map((tabIndex) => ({ disabled: false, focusableWhenDisabled: true, tabIndex })),
    );
    setToolbarDisabledMode(toolbar, 'focusable');
    toolbar.update({ disabled: true });
    await settle();
    expect(states()).toEqual(
      [true, true, false].map((disabled, index) => ({
        disabled,
        focusableWhenDisabled: true,
        tabIndex: index === 0 ? 0 : -1,
      })),
    );
    toolbar.dispose();
  });

  it('leaves no stop and moves no focus when the focused control’s root becomes fully disabled (`node-010076`, `node-010070`)', async () => {
    const { document, bar, save, help } = nativeWorld();
    const toolbar = new ToolbarController(html(bar));
    setToolbarDisabledMode(toolbar, 'fully');
    toolbar.registerItem(html(save), { kind: 'button' });
    toolbar.registerItem(html(help), { kind: 'link' });
    await settle();
    save.focus();
    const focusIn = new Event('focusin');
    Object.defineProperty(focusIn, 'composedPath', { value: () => pathOf(save) });
    bar.dispatchEvent(focusIn);
    await settle();
    const focusCalls = [vi.spyOn(save, 'focus'), vi.spyOn(help, 'focus')];
    toolbar.update({ disabled: true });
    await settle();
    expect(stops({ save, help })).toEqual([]);
    expect(document.activeElement).toBe(save);
    toolbar.update({ disabled: false });
    await settle();
    expect(stops({ save, help })).toEqual(['save']);
    expect(focusCalls.map((spy) => spy.mock.calls.length)).toEqual([0, 0]);
    toolbar.dispose();
  });

  it('applies the mode to its own controller only (`node-010070`)', async () => {
    const worlds = [nativeWorld(), nativeWorld()];
    const toolbars = worlds.map(({ bar, save, help }) => {
      const toolbar = new ToolbarController(html(bar), { disabled: true });
      toolbar.registerItem(html(save), { kind: 'button' });
      toolbar.registerItem(html(help), { kind: 'link' });
      return toolbar;
    });
    setToolbarDisabledMode(toolbars[0]!, 'fully');
    await settle();
    const { save, help } = worlds[1]!;
    expect(nativeState(save)).toEqual([null, '0', 'true', '']);
    expect(nativeState(help)).toEqual([null, '-1', null, null]);
    for (const toolbar of toolbars) toolbar.dispose();
  });

  it('rejects presses and activation on a link only in the fully disabled state (`node-001228`, `uwg-te-req-prop-3`, `node-010070`)', async () => {
    const { bar, save, help, listen, key, mouse } = nativeWorld();
    const toolbar = new ToolbarController(html(bar), { disabled: true });
    listen();
    toolbar.registerItem(html(save), { kind: 'button' });
    toolbar.registerItem(html(help), { kind: 'link' });
    setToolbarDisabledMode(toolbar, 'fully');
    await settle();
    const blocked = { prevented: true, reached: [] };
    expect(mouse(help, 'pointerdown')).toEqual(blocked);
    expect(mouse(help, 'click')).toEqual(blocked);
    expect(mouse(help, 'auxclick', 1)).toEqual(blocked);
    expect(key(help, 'Enter')).toBe(true);
    setToolbarDisabledMode(toolbar, 'focusable');
    await settle();
    for (const type of ['pointerdown', 'click', 'auxclick'])
      expect(mouse(help, type, type === 'auxclick' ? 1 : 0), type).toEqual({
        prevented: false,
        reached: [type],
      });
    expect(mouse(save, 'auxclick', 1)).toEqual({ prevented: false, reached: ['auxclick'] });
    toolbar.dispose();
  });

  it('keeps the disabled mode out of every package entry (`node-009984`)', () => {
    const source = new URL('../', import.meta.url);
    for (const file of [
      'index.ts',
      'foundation/index.ts',
      'widgets/index.ts',
      'foundation/text-editor/index.ts',
    ]) {
      const text = readFileSync(new URL(file, source), 'utf8');
      expect(text, file).not.toMatch(/ToolbarDisabledMode|setToolbarDisabledMode/);
      expect(text, file).not.toMatch(/export \*[^;]*\/toolbar\.js['"]/);
    }
  });
});

describe('Toolbar roving stop', () => {
  it('keeps the first eligible item the stop until focus or navigation chooses one, also when items before it become eligible later', async () => {
    const { document, element } = world();
    const bar = element();
    const [x, y, more] = [element(bar, 'button'), element(bar, 'button'), element(bar, 'button')];
    const stops = () => [x, y, more].map((item) => item.getAttribute('tabindex'));
    // A row whose items show only once it has measured them: the trailing control shows first.
    x.setAttribute('hidden', '');
    y.setAttribute('hidden', '');
    const toolbar = new ToolbarController(html(bar));
    for (const item of [x, y, more]) toolbar.registerItem(html(item), { kind: 'button' });
    await settle();
    expect(stops()).toEqual(['-1', '-1', '0']);
    x.removeAttribute('hidden');
    y.removeAttribute('hidden');
    toolbar.refresh();
    await settle();
    expect(stops()).toEqual(['0', '-1', '-1']);
    // A focused item becomes the stop and stays it when an item before it shows again.
    bar.dispatchEvent(
      Object.assign(new Event('focusin'), { composedPath: () => [y, bar, document.body] }),
    );
    x.setAttribute('hidden', '');
    toolbar.refresh();
    await settle();
    x.removeAttribute('hidden');
    toolbar.refresh();
    await settle();
    expect(stops()).toEqual(['-1', '0', '-1']);
    toolbar.dispose();
  });
});

describe('Toolbar out of the sequential focus order', () => {
  it('keeps every item out of the Tab sequence until focus enters, and focuses the first enabled item', async () => {
    const { document, element } = world();
    const bar = element();
    const [x, y, z] = [element(bar, 'button'), element(bar, 'button'), element(bar, 'button')];
    const toolbar = new ToolbarController(html(bar), { sequentialFocus: false });
    toolbar.registerItem(html(x), { kind: 'button', disabled: true, focusableWhenDisabled: true });
    toolbar.registerItem(html(y), { kind: 'button' });
    toolbar.registerItem(html(z), { kind: 'button' });
    await settle();
    expect([x, y, z].map((item) => item.getAttribute('tabindex'))).toEqual(['-1', '-1', '-1']);
    expect(toolbar.focusFirst()).toBe(true);
    expect(document.activeElement).toBe(y);
    bar.dispatchEvent(
      Object.assign(new Event('focusin'), { composedPath: () => [y, bar, document.body] }),
    );
    await settle();
    expect(y.getAttribute('tabindex')).toBe('0');
    const out = Object.assign(new Event('focusout'), { relatedTarget: document.body });
    bar.dispatchEvent(out);
    await settle();
    expect(y.getAttribute('tabindex')).toBe('-1');
    toolbar.dispose();
  });

  it('keeps the roving stop in the sequence by default', async () => {
    const { element } = world();
    const bar = element();
    const x = element(bar, 'button');
    const toolbar = new ToolbarController(html(bar));
    toolbar.registerItem(html(x), { kind: 'button' });
    await settle();
    expect(x.getAttribute('tabindex')).toBe('0');
    toolbar.dispose();
  });
});

describe('Contextual toolbar focus model (`uwg-te-tb-req-context`)', () => {
  function contextual(finalFocus?: (interaction: string) => HTMLElement | boolean) {
    const { document, element } = world();
    const target = element(document.body, 'div');
    const surface = element();
    const [x, y] = [element(surface, 'button'), element(surface, 'button')];
    const controller = new ContextualToolbarController(html(surface), {
      sequentialFocus: false,
      ...(finalFocus ? { finalFocus } : {}),
    });
    controller.toolbar.registerItem(html(x), { kind: 'button' });
    controller.toolbar.registerItem(html(y), { kind: 'button' });
    const press = (key: string, shiftKey = false) => {
      const event = keyEvent(key, { shiftKey, path: [x, surface, document.body, document] });
      surface.dispatchEvent(event);
      return event.defaultPrevented;
    };
    return { document, target, surface, x, y, controller, press };
  }

  it('passes focusVisible to the first enabled control on request, and nothing more by default', async () => {
    const { x, controller } = contextual();
    const focus = vi.spyOn(x, 'focus');
    controller.show();
    await settle();
    expect(controller.focus({ focusVisible: true })).toBe(true);
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true, focusVisible: true });
    expect(controller.toolbar.focusFirst()).toBe(true);
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    controller.dispose();
  });

  it('shows without moving focus and focuses its first enabled control on request', async () => {
    const { document, target, surface, x, controller } = contextual();
    target.focus();
    expect(controller.focus()).toBe(false);
    controller.show();
    expect(controller.shown).toBe(true);
    expect(surface.hasAttribute('data-open')).toBe(true);
    expect(document.activeElement).toBe(target);
    await settle();
    expect(controller.focus()).toBe(true);
    expect(document.activeElement).toBe(x);
    controller.dispose();
    expect(surface.hasAttribute('data-open')).toBe(false);
  });

  it('returns focus to the editing target on Escape and on Tab out of the sequence', async () => {
    const finalFocus = vi.fn(() => false);
    const { press, controller } = contextual(finalFocus);
    controller.show();
    await settle();
    expect(press('Escape')).toBe(true);
    expect(press('Tab')).toBe(true);
    expect(press('Tab', true)).toBe(true);
    expect(press('a')).toBe(false);
    expect(finalFocus).toHaveBeenCalledTimes(3);
    controller.dispose();
  });

  it('leaves Escape alone without a final focus or inside a popup a control opened', async () => {
    const plain = contextual();
    plain.controller.show();
    expect(plain.press('Escape')).toBe(false);
    plain.controller.dispose();
    const finalFocus = vi.fn(() => false);
    const { document, surface, controller } = contextual(finalFocus);
    controller.show();
    const popup = Object.assign(new EventTarget(), {
      nodeType: 1,
      localName: 'div',
      hasAttribute: (name: string) => name === 'popover',
    });
    const event = keyEvent('Escape', { path: [popup, surface, document.body, document] });
    surface.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(finalFocus).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('returns focus when it hides while focus is inside, and only then', async () => {
    const finalFocus = vi.fn(() => false);
    const { target, x, controller } = contextual(finalFocus);
    target.focus();
    controller.show();
    controller.hide();
    expect(finalFocus).not.toHaveBeenCalled();
    controller.show();
    x.focus();
    controller.hide();
    expect(finalFocus).toHaveBeenCalledTimes(1);
    expect(controller.shown).toBe(false);
    controller.dispose();
  });
});
