import { describe, expect, it, vi } from 'vitest';
import type { TextEditorAccess } from '../../foundation/text-editor/controller.js';
import type { TextEditorEngineInstance } from '../../foundation/text-editor/engine.js';
import type { TextEditorSelection } from '../../foundation/text-editor/model.js';
import {
  activationMovesFocus,
  escapeStep,
  nextContextualSurface,
  TextEditorFocus,
  type TextEditorEscapeContext,
} from './focus.js';
import { selectionToolbarOrder } from './views/popups.js';
import { TABLE_CONTROLS_ORDER } from './views/table-controls.js';

/** A node of a fake tree: `parentNode` links and a connected flag. */
function node(parent: object | null = null, connected = true) {
  return Object.assign(new EventTarget(), {
    nodeType: 1,
    parentNode: parent,
    isConnected: connected,
  }) as unknown as HTMLElement;
}

function setup(options: { ready?: boolean } = {}) {
  const document = {
    activeElement: null as Element | null,
    body: null as unknown as Element,
    focused: true,
    hasFocus() {
      return this.focused;
    },
  };
  const element = Object.assign(node(), { ownerDocument: document }) as HTMLElement;
  document.body = node();
  const root = Object.assign(new EventTarget(), {
    nodeType: 11,
    host: element,
  }) as unknown as ShadowRoot;
  const content = node(root);
  const editingRoot = node(content);
  const bold = node(root);
  const trigger = node(root);
  const outside = node();
  let selection: TextEditorSelection = {
    kind: 'text',
    anchor: { block: 'a', offset: 1 },
    head: { block: 'a', offset: 3 },
    empty: false,
  };
  const calls: string[] = [];
  let can = true;
  const instance = {
    getState: () => ({ selection }),
    can: () => can,
    execute: (actions: unknown, options: unknown) => {
      calls.push(`execute:${JSON.stringify(actions)}:${JSON.stringify(options)}`);
      return true;
    },
    focus: (position: string) => {
      calls.push(`focus:${position}`);
      return Promise.resolve();
    },
    blur: () => calls.push('blur'),
  } as unknown as TextEditorEngineInstance;
  let ready = options.ready ?? true;
  let access: TextEditorAccess = { readOnly: false, disabled: false };
  const host = {
    element,
    contentElement: () => content,
    readyInstance: () => (ready ? instance : null),
    access: () => access,
    focusChanged: vi.fn(),
    commitPending: vi.fn(() => true),
  };
  const focus = new TextEditorFocus(host);
  focus.attach(root);
  return {
    focus,
    host,
    root,
    document,
    calls,
    nodes: { content, editingRoot, bold, trigger, outside },
    setReady: (value: boolean) => (ready = value),
    setAccess: (value: TextEditorAccess) => (access = value),
    setCan: (value: boolean) => (can = value),
    setSelection: (value: TextEditorSelection) => (selection = value),
    activate: (target: Element | null) => (document.activeElement = target),
    focusEvent: (type: 'focusin' | 'focusout', relatedTarget: object | null = null) =>
      root.dispatchEvent(Object.assign(new Event(type), { relatedTarget })),
  };
}

describe('text editor focus', () => {
  it('acts on the first Escape state that applies (uwg-te-req-key-4, uwg-te-req-surfaces-6)', () => {
    const none: TextEditorEscapeContext = {
      gesture: false,
      composing: false,
      surfaceOpen: false,
      suggestionOpen: false,
      selection: 'none',
      blockMode: false,
    };
    const cases: [Partial<TextEditorEscapeContext>, string][] = [
      [{ gesture: true, composing: true, surfaceOpen: true }, 'cancel-gesture'],
      [{ composing: true, surfaceOpen: true }, 'ignore'],
      [{ surfaceOpen: true, suggestionOpen: true }, 'yield'],
      [{ suggestionOpen: true, selection: 'cells' }, 'close-suggestion'],
      [{ selection: 'cells', blockMode: true }, 'collapse-cells'],
      [{ selection: 'text' }, 'enter-block-mode'],
      [{ selection: 'blocks', blockMode: true }, 'end-block-mode'],
      [{ blockMode: true }, 'end-block-mode'],
      [{ selection: 'blocks' }, 'pass'],
      [{}, 'pass'],
    ];
    for (const [patch, action] of cases)
      expect([patch, escapeStep({ ...none, ...patch })]).toEqual([patch, action]);
  });

  it('moves focus to the editing root only for item presses and editing-root hotkeys (uwg-te-req-a11y-2, uwg-te-req-a11y-6, uwg-te-req-key-8)', () => {
    expect([
      activationMovesFocus({ reason: 'trigger-press', modality: 'keyboard' }),
      activationMovesFocus({ reason: 'trigger-press', modality: 'pointer' }),
      activationMovesFocus({ reason: 'item-press' }),
      activationMovesFocus({ reason: 'hotkey', zone: 'editing' }),
      activationMovesFocus({ reason: 'hotkey', zone: 'toolbar' }),
    ]).toEqual([false, false, true, true, false]);
  });

  it('returns focus after a toolbar menu as it was opened (uwg-te-req-a11y-6, uwg-te-req-prop-3)', () => {
    const t = setup();
    const { focus, nodes, calls } = t;
    focus.menuOpened(nodes.trigger, 'keyboard');
    expect(focus.menuFinalFocus('keyboard')).toBe(nodes.trigger);
    // The record is cleared by the final focus.
    expect(focus.menuFinalFocus('keyboard')).toBe(true);
    t.activate(nodes.bold);
    focus.menuOpened(nodes.trigger, 'pointer');
    expect(focus.menuFinalFocus('mouse')).toBe(nodes.bold);
    // A press that moved focus onto its trigger: the element focused when the press began.
    t.root.dispatchEvent(new Event('pointerdown'));
    t.activate(nodes.trigger);
    focus.menuOpened(nodes.trigger, 'pointer');
    expect(focus.menuFinalFocus('mouse')).toBe(nodes.bold);
    // The press record serves one opening only.
    focus.menuOpened(nodes.trigger, 'pointer');
    expect(focus.menuFinalFocus('mouse')).toBe(nodes.trigger);
    t.activate(nodes.editingRoot);
    focus.menuOpened(nodes.trigger, 'pointer');
    expect([focus.menuFinalFocus('mouse'), calls]).toEqual([false, ['focus:restore']]);
    // An item that changed the document, recorded by the close proposal before the final focus.
    t.activate(nodes.bold);
    focus.menuOpened(nodes.trigger, 'keyboard');
    focus.menuClosed(true);
    expect([focus.menuFinalFocus('keyboard'), calls.length]).toEqual([false, 2]);
    // Not ready: the trigger.
    t.setReady(false);
    focus.menuOpened(nodes.trigger, 'keyboard');
    focus.menuClosed(true);
    expect(focus.menuFinalFocus('keyboard')).toBe(nodes.trigger);
    t.setReady(true);
    // A disconnected previous element: the trigger.
    t.activate(node(null, false));
    focus.menuOpened(nodes.trigger, 'pointer');
    expect(focus.menuFinalFocus('mouse')).toBe(nodes.trigger);
    // A later opening replaces an earlier record.
    focus.menuOpened(nodes.bold, 'pointer');
    focus.menuOpened(nodes.trigger, 'keyboard');
    expect(focus.menuFinalFocus('keyboard')).toBe(nodes.trigger);
    // No opening record: `changed` alone decides.
    focus.menuClosed(true);
    expect([focus.menuFinalFocus('keyboard'), calls.length]).toEqual([false, 3]);
    focus.menuClosed(false);
    expect(focus.menuFinalFocus('keyboard')).toBe(true);
    // Disabled: no target and no focus call, the record cleared.
    t.setAccess({ readOnly: false, disabled: true });
    focus.menuOpened(nodes.trigger, 'pointer');
    focus.menuClosed(true);
    expect([focus.menuFinalFocus('mouse'), calls.length]).toEqual([false, 3]);
    t.setAccess({ readOnly: false, disabled: false });
    expect(focus.menuFinalFocus('mouse')).toBe(true);
  });

  it('commits on blur only when focus leaves the widget (uwg-te-req-evt-4)', () => {
    const t = setup();
    const { host, nodes } = t;
    t.focusEvent('focusin');
    t.focusEvent('focusin');
    expect(host.focusChanged.mock.calls).toEqual([[true]]);
    expect(t.focus.focused).toBe(true);
    t.focusEvent('focusout', nodes.bold);
    expect(host.commitPending).not.toHaveBeenCalled();
    // The window lost focus.
    t.document.focused = false;
    t.focusEvent('focusout', null);
    expect(host.commitPending).not.toHaveBeenCalled();
    t.document.focused = true;
    t.focusEvent('focusout', nodes.outside);
    expect(host.focusChanged.mock.calls).toEqual([[true], [false]]);
    expect(host.commitPending).toHaveBeenCalledTimes(1);
    expect(t.focus.focused).toBe(false);
    // Focus dropped to the document, as when the widget becomes disabled.
    t.focusEvent('focusin');
    t.focusEvent('focusout', null);
    expect(host.commitPending).toHaveBeenCalledTimes(2);
    t.focus.detach();
    t.focusEvent('focusin');
    expect(host.focusChanged).toHaveBeenCalledTimes(4);
  });

  it('stays focused while focus moves into a popup of the widget, whose top layer hides it from `:focus-within` outside (uwg-te-req-pres-1)', () => {
    const t = setup();
    const { host, nodes, root } = t;
    // A toolbar menu: its positioner and content inside the widget's shadow tree.
    const menu = Object.assign(new EventTarget(), {
      nodeType: 11,
      host: Object.assign(node(root), {}),
    }) as unknown as ShadowRoot;
    const content = node(node(menu));
    t.focusEvent('focusin');
    t.focusEvent('focusout', content);
    t.focusEvent('focusin');
    expect(t.focus.focused).toBe(true);
    expect(host.focusChanged.mock.calls).toEqual([[true]]);
    // From the popup back to the editing root, then out of the widget.
    t.focusEvent('focusout', nodes.editingRoot);
    expect(t.focus.focused).toBe(true);
    t.focusEvent('focusout', nodes.outside);
    expect(t.focus.focused).toBe(false);
    expect(host.focusChanged.mock.calls).toEqual([[true], [false]]);
  });

  it('focuses through the adapter, deferred before ready (uwg-te-req-prop-2)', async () => {
    const ready = setup();
    const settled = ready.focus.focusEditing();
    expect(ready.calls).toEqual(['focus:restore']);
    await settled;
    void ready.focus.focusEditing('end');
    expect(ready.calls).toEqual(['focus:restore', 'focus:end']);
    ready.setAccess({ readOnly: false, disabled: true });
    await ready.focus.focusEditing('start');
    expect(ready.calls).toHaveLength(2);

    const pending = setup({ ready: false });
    const first = pending.focus.focusEditing('start');
    const second = pending.focus.focusEditing('end');
    pending.setReady(true);
    pending.focus.ready();
    await Promise.all([first, second]);
    expect(pending.calls).toEqual(['focus:end']);

    const blurred = setup({ ready: false });
    const dropped = blurred.focus.focusEditing();
    blurred.focus.blur();
    blurred.setReady(true);
    blurred.focus.ready();
    await dropped;
    expect(blurred.calls).toEqual([]);

    const moved = setup({ ready: false });
    const away = moved.focus.focusEditing();
    moved.activate(moved.nodes.outside);
    moved.setReady(true);
    moved.focus.ready();
    await away;
    expect(moved.calls).toEqual([]);

    const disabled = setup({ ready: false });
    const off = disabled.focus.focusEditing();
    disabled.setAccess({ readOnly: false, disabled: true });
    disabled.setReady(true);
    disabled.focus.ready();
    await off;
    expect(disabled.calls).toEqual([]);
  });

  it('refocuses the new editing root after a remount (uwg-te-req-engine-8)', () => {
    const t = setup();
    t.activate(t.nodes.editingRoot);
    t.focus.beforeRemount();
    t.focus.ready();
    expect(t.calls).toEqual([
      'execute:[{"type":"selection.set","selection":{"kind":"text","anchor":{"block":"a","offset":1},"head":{"block":"a","offset":3}}}]:{"reason":"programmatic","focus":true}',
    ]);
    const gone = setup();
    gone.activate(gone.nodes.editingRoot);
    gone.focus.beforeRemount();
    gone.setCan(false);
    gone.focus.ready();
    expect(gone.calls).toEqual(['focus:start']);
    const outside = setup();
    outside.activate(outside.nodes.bold);
    outside.focus.beforeRemount();
    outside.focus.ready();
    // A reconnection calls no beforeRemount.
    outside.activate(outside.nodes.editingRoot);
    outside.focus.ready();
    expect(outside.calls).toEqual([]);
  });

  it('V-833: a remount closes the open transient surface, and the focus it returns to the editing root restores the remembered selection once ready', async () => {
    const t = setup();
    const closed: (string | undefined)[] = [];
    t.focus.transientOpened({}, (reason) => closed.push(reason), 'hotkey');
    t.activate(t.nodes.bold);
    t.focus.beforeRemount();
    expect(closed).toEqual(['programmatic']);
    expect(t.focus.transientOwner).toBeNull();
    // The popover's final focus runs while the new instance mounts.
    t.setReady(false);
    await t.focus.focusEditing();
    t.setReady(true);
    t.focus.ready();
    expect(t.calls).toEqual([
      'execute:[{"type":"selection.set","selection":{"kind":"text","anchor":{"block":"a","offset":1},"head":{"block":"a","offset":3}}}]:{"reason":"programmatic","focus":true}',
    ]);
    // Once ready, a focus request outside a remount waits as before.
    t.setReady(false);
    const later = t.focus.focusEditing('end');
    t.setReady(true);
    t.focus.ready();
    await later;
    expect(t.calls.at(-1)).toBe('focus:end');
    // A surface whose focus return comes after ready restores the remembered selection too.
    const late = setup();
    late.focus.transientOpened({}, () => undefined);
    late.activate(late.nodes.bold);
    late.focus.beforeRemount();
    late.focus.ready();
    expect(late.calls).toEqual([]);
    await late.focus.focusEditing();
    expect(late.calls).toEqual([
      'execute:[{"type":"selection.set","selection":{"kind":"text","anchor":{"block":"a","offset":1},"head":{"block":"a","offset":3}}}]:{"reason":"programmatic","focus":true}',
    ]);
    await late.focus.focusEditing();
    expect(late.calls.at(-1)).toBe('focus:restore');
  });
});

describe('V-833: focus on a control that a remount removes (uwg-te-req-engine-8)', () => {
  it('goes to the new editing root with the remembered selection; a control that stays keeps it', () => {
    const removed = setup();
    removed.activate(removed.nodes.trigger);
    removed.focus.beforeRemount();
    // The tool's control goes with the registry of the new engine before it is ready.
    Object.assign(removed.nodes.trigger, { isConnected: false });
    removed.focus.ready();
    expect(removed.calls).toEqual([
      'execute:[{"type":"selection.set","selection":{"kind":"text","anchor":{"block":"a","offset":1},"head":{"block":"a","offset":3}}}]:{"reason":"programmatic","focus":true}',
    ]);
    const kept = setup();
    kept.activate(kept.nodes.bold);
    kept.focus.beforeRemount();
    kept.focus.ready();
    expect(kept.calls).toEqual([]);
  });
});

describe('Alt+F10 contextual controls (uwg-te-tab-keymap-host-r2)', () => {
  const surface = (order: number, applicable: boolean, holds = false) => ({
    order,
    applicable: () => applicable,
    holdsFocus: () => holds,
    enter: vi.fn(() => true),
    leave: vi.fn(),
  });

  it('enters the first applicable surface from the editing root and cycles after the focused one', () => {
    const toolbar = surface(0, false);
    const table = surface(1, true);
    const gutter = surface(2, true);
    expect(nextContextualSurface([gutter, table, toolbar])).toBe(table);
    const focusedTable = surface(1, true, true);
    expect(nextContextualSurface([toolbar, focusedTable, gutter])).toBe(gutter);
    const focusedGutter = surface(2, true, true);
    expect(nextContextualSurface([toolbar, table, focusedGutter])).toBe(table);
    expect(nextContextualSurface([surface(1, true, true)])).toBeNull();
    expect(nextContextualSurface([])).toBeNull();
  });

  it('puts the table controls before the selection toolbar for a cell range (uwg-te-req-key-5)', () => {
    const table = surface(TABLE_CONTROLS_ORDER, true);
    const range = surface(selectionToolbarOrder({ kind: 'cells' }), true);
    expect(nextContextualSurface([range, table])).toBe(table);
    const focusedTable = surface(TABLE_CONTROLS_ORDER, true, true);
    expect(nextContextualSurface([range, focusedTable])).toBe(range);
    const text = surface(selectionToolbarOrder({ kind: 'text' }), true);
    expect(nextContextualSurface([table, text])).toBe(text);
  });

  it('leaves the focused surface and enters the next one, never while disabled', () => {
    const { focus, setAccess } = setup();
    const table = surface(1, true, true);
    const gutter = surface(2, true);
    const releaseTable = focus.registerContextual(table);
    focus.registerContextual(gutter);
    const event = new Event('keydown');
    expect(focus.cycleContextual(event)).toBe(true);
    expect(table.leave).toHaveBeenCalled();
    expect(gutter.enter).toHaveBeenCalledWith(event);
    releaseTable();
    setAccess({ readOnly: false, disabled: true });
    expect(focus.cycleContextual(event)).toBe(false);
    expect(gutter.enter).toHaveBeenCalledTimes(1);
  });
});

describe('one transient surface at a time (uwg-te-req-surfaces-6)', () => {
  it('opening a surface closes the one open before it, never itself', () => {
    const { focus } = setup();
    const menu = { name: 'menu' };
    const picker = { name: 'picker' };
    const closeMenu = vi.fn();
    const closePicker = vi.fn();
    focus.transientOpened(menu, closeMenu);
    // The same owner opening again (a menu that reopens) closes nothing.
    focus.transientOpened(menu, closeMenu);
    expect(closeMenu).not.toHaveBeenCalled();
    focus.transientOpened(picker, closePicker, 'hotkey');
    expect(closeMenu).toHaveBeenCalledTimes(1);
    // The surface that closes records the reason that opens the next one (uwg-te-tab-reasons r13).
    expect(closeMenu).toHaveBeenCalledWith('hotkey');
    expect(focus.transientOwner).toBe(picker);
    // A surface that closed by itself is forgotten: the next opening closes nothing.
    focus.transientClosed(picker);
    expect(focus.transientOwner).toBeNull();
    focus.transientOpened(menu, closeMenu);
    expect(closePicker).not.toHaveBeenCalled();
    // Closing a surface that is not the open one keeps the open one.
    focus.transientClosed(picker);
    expect(focus.transientOwner).toBe(menu);
  });
});
