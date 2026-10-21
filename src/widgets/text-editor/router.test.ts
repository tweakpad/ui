import { describe, expect, it, vi } from 'vitest';
import { keyEvent, type KeyEventInit } from '../../foundation/fakes.test.js';
import { KeyBindingOwner } from '../../foundation/key-bindings.js';
import { BASE_CAPABILITIES } from '../../foundation/text-editor/capabilities.js';
import type { TextEditorAccess } from '../../foundation/text-editor/controller.js';
import type { TextEditorSelection } from '../../foundation/text-editor/model.js';
import {
  FakeContainer,
  fakeTools,
  flush,
  readyEditor,
  selectText,
} from '../../foundation/text-editor/text-editor-fakes.test.js';
import {
  dropProposal,
  imageFiles,
  pasteProposal,
  transferContent,
  TextEditorRouter,
  type TextEditorRouterHost,
  textEditorKeyZone,
  type TextEditorRouterConfig,
} from './router.js';

const EDITABLE: TextEditorAccess = { readOnly: false, disabled: false };
const READ_ONLY: TextEditorAccess = { readOnly: true, disabled: false };
const DISABLED: TextEditorAccess = { readOnly: false, disabled: true };
const EMPTY: readonly string[] = Object.freeze([]);

interface Zones {
  readonly root: ShadowRoot;
  readonly content: EventTarget;
  readonly toolbar: EventTarget;
  readonly popup: EventTarget;
  readonly other: EventTarget;
}

function zones(): Zones {
  const root = Object.assign(new EventTarget(), {
    ownerDocument: new FakeContainer().ownerDocument,
  }) as unknown as ShadowRoot;
  const popup = Object.assign(new EventTarget(), {
    hasAttribute: (name: string) => name === 'popover',
  });
  return {
    root,
    content: new EventTarget(),
    toolbar: new EventTarget(),
    popup,
    other: new EventTarget(),
  };
}

function paths(z: Zones) {
  return {
    editing: [new EventTarget(), z.content, z.root],
    toolbar: [new EventTarget(), z.toolbar, z.root],
    popup: [new EventTarget(), z.popup, z.toolbar, z.root],
    other: [z.other, z.root],
  };
}

type Zone = keyof ReturnType<typeof paths>;

/** A router on a ready fake editor whose pipeline is real, attached to a fake shadow root. */
async function setup(
  options: {
    platform?: 'mac' | 'windows';
    access?: TextEditorAccess;
    reservedKeys?: readonly string[];
    gutter?: boolean;
    host?: Partial<TextEditorRouterHost>;
  } = {},
) {
  const editor = await readyEditor({
    content: { content: '<p>Hello world</p><p>Second</p>', format: 'html' },
    ...(options.access ? { access: options.access } : {}),
  });
  const z = zones();
  const selectRootContent = vi.fn();
  const tools = fakeTools(editor.engine);
  let config: TextEditorRouterConfig = {
    registry: tools.registry,
    layout: { ...tools.layout, gutter: options.gutter ?? true },
    reservedKeys: options.reservedKeys ?? EMPTY,
    access: options.access ?? EDITABLE,
    nodes: [],
  };
  const router = new TextEditorRouter(
    {
      parts: () => ({ content: z.content as Element, toolbar: z.toolbar as Element }),
      selection: () => editor.instance.getState().selection,
      direction: () => 'ltr',
      request: (proposal) => editor.controller.request(proposal),
      selectRootContent,
      ...options.host,
    },
    { platform: options.platform ?? 'windows' },
  );
  router.sync(config);
  router.attach(z.root);
  const at = paths(z);
  const blocks = editor.instance.getBlocks().roots;
  const press = (init: KeyEventInit, zone: Zone = 'editing') => {
    const event = keyEvent(init, { path: at[zone] });
    z.root.dispatchEvent(event);
    return {
      event,
      consumed: event.defaultPrevented,
      stopped: event.cancelBubble,
    };
  };
  const setAccess = (access: TextEditorAccess) => {
    editor.controller.setAccess(access);
    config = { ...config, access };
    router.sync(config);
  };
  const resync = (patch: Partial<TextEditorRouterConfig>) => {
    config = { ...config, ...patch };
    router.sync(config);
  };
  return { ...editor, z, at, router, press, setAccess, resync, selectRootContent, blocks };
}

const mod = (key: string, more: Partial<KeyEventInit> = {}): KeyEventInit => ({
  key,
  ctrlKey: true,
  ...more,
});

function pasteEvent(path: EventTarget[], data: Record<string, string> | null) {
  const event = Object.assign(new Event('paste', { cancelable: true }), {
    clipboardData: data ? { getData: (type: string) => data[type] ?? '' } : null,
  });
  Object.defineProperty(event, 'composedPath', { value: () => path });
  return event;
}

function dragEvent(type: string, path: EventTarget[], data: Record<string, string> = {}) {
  const dataTransfer = {
    types: Object.keys(data),
    getData: (key: string) => data[key] ?? '',
    dropEffect: 'copy',
  };
  const event = Object.assign(new Event(type, { cancelable: true }), { dataTransfer });
  Object.defineProperty(event, 'composedPath', { value: () => path });
  return event;
}

const requests = (of: (type: 'request' | 'request-failed') => unknown[]) => ({
  request: of('request').length,
  failed: of('request-failed').length,
});

describe('text editor router', () => {
  it('classifies the editing root, the fixed toolbar, popups and the rest (uwg-te-req-key-1)', () => {
    const z = zones();
    const parts = { content: z.content as Element, toolbar: z.toolbar as Element };
    const at = paths(z);
    expect(
      (['editing', 'toolbar', 'popup', 'other'] as const).map((zone) =>
        textEditorKeyZone(at[zone], parts),
      ),
    ).toEqual(['editing', 'toolbar', 'popup', 'other']);
    expect(textEditorKeyZone([z.content], { content: null, toolbar: null })).toBe('other');
  });

  it('consumes a tool chord in the editing root as one hotkey request and stops it (uwg-te-req-key-1, uwg-te-kb-req-capture)', async () => {
    const r = await setup({ reservedKeys: ['Mod+b'] });
    await selectText(r.controller, r.blocks[0]!, 0, 5);
    const records = r.of('request').length;
    const pressed = r.press(mod('b'));
    expect([pressed.consumed, pressed.stopped]).toEqual([true, true]);
    const detail = r.of<Record<string, unknown>>('request').slice(records);
    expect(detail).toHaveLength(1);
    expect(detail[0]).toMatchObject({
      tool: 'bold',
      surface: 'keyboard',
      reason: 'hotkey',
      sourceEvent: pressed.event,
      trigger: null,
    });
  });

  it('leaves unbound and editing keys unprevented (uwg-te-req-key-3, uwg-te-req-engine-11)', async () => {
    const r = await setup();
    const keys: KeyEventInit[] = [
      { key: 'Enter' },
      { key: 'Enter', shiftKey: true },
      { key: 'Backspace' },
      { key: 'Delete' },
      { key: 'ArrowLeft' },
      { key: 'Home' },
      { key: 'End' },
      { key: 'PageDown' },
      { key: 'Tab' },
      mod('a'),
      mod('c'),
      mod('x'),
      mod('v'),
      mod('4', { altKey: true }),
      mod('X', { shiftKey: true }),
    ];
    for (const init of keys) {
      const pressed = r.press(init);
      expect([init.key, pressed.consumed, pressed.stopped]).toEqual([init.key, false, false]);
    }
    expect(r.press(mod('i')).consumed).toBe(true);
  });

  it('acts on keymap rows 1 to 10 in the fixed toolbar and on rows 11 to 15 only in the editing root (uwg-te-tab-keymap)', async () => {
    const r = await setup();
    const before = r.of('request').length;
    expect(r.press(mod('b'), 'toolbar').consumed).toBe(true);
    expect(
      r
        .of<{ tool: string }>('request')
        .slice(before)
        .map((d) => d.tool),
    ).toEqual(['bold']);
    const editingOnly = [
      mod('d'),
      mod('ArrowUp', { shiftKey: true }),
      mod('ArrowDown', { shiftKey: true }),
      mod(']'),
      mod('['),
      mod('/'),
      mod('Enter'),
    ];
    for (const init of editingOnly) {
      const pressed = r.press(init, 'toolbar');
      expect([init.key, pressed.consumed, pressed.stopped]).toEqual([init.key, false, false]);
    }
    for (const init of editingOnly)
      expect([init.key, r.press(init).consumed]).toEqual([init.key, true]);
  });

  it('asks the focus policy per zone: a hotkey moves focus only from the editing root (uwg-te-req-a11y-2)', async () => {
    const r = await setup();
    const request = vi.spyOn(r.controller, 'request');
    r.press(mod('i'), 'toolbar');
    r.press(mod('i'));
    expect(request.mock.calls.map(([proposal]) => proposal.focus)).toEqual([false, true]);
  });

  it('keeps every tool chord away from popups and other parts of the widget (uwg-te-req-key-1)', async () => {
    const r = await setup();
    expect(r.press(mod('b'), 'popup').consumed).toBe(false);
    expect(r.press(mod('b'), 'other').consumed).toBe(false);
    expect(r.press(mod('b')).consumed).toBe(true);
  });

  it('publishes the shortcut of each tool from its binding (uwg-te-req-key-2, mp-kb-publish)', async () => {
    const windows = await setup();
    expect(windows.router.shortcut('bold')).toMatchObject({ aria: 'Control+B', display: 'Ctrl+B' });
    const mac = await setup({ platform: 'mac' });
    expect(mac.router.shortcut('bold')).toMatchObject({ aria: 'Meta+B' });
    expect(windows.router.shortcut('table')).toBeUndefined();
    // A tool placed nowhere still binds its chord.
    expect(windows.router.shortcut('duplicate-block')?.aria).toBe('Control+D');
    const tools = fakeTools(windows.engine, [{ id: 'bold', kind: 'toggle', label: 'Bold' }]);
    windows.resync({ registry: tools.registry });
    expect(windows.router.shortcut('bold')).toBeUndefined();
    expect(windows.press(mod('b')).consumed).toBe(false);
  });

  it('consumes the chord of a tool that is not enabled and lets the pipeline settle it (uwg-te-req-key-1)', async () => {
    const r = await setup();
    const before = requests(r.of);
    // An empty history: undo is not enabled.
    expect(r.press(mod('z')).consumed).toBe(true);
    await flush();
    expect(requests(r.of)).toEqual(before);
  });

  it('rejects a value-changing chord while read-only (uwg-te-req-evt-1, uwg-te-req-prop-3)', async () => {
    const r = await setup();
    await selectText(r.controller, r.blocks[0]!, 0, 5);
    r.setAccess(READ_ONLY);
    const before = requests(r.of);
    expect(r.press(mod('b')).consumed).toBe(true);
    await flush();
    const after = requests(r.of);
    expect(after.request).toBe(before.request);
    expect(after.failed).toBe(before.failed + 1);
    expect(
      (r.of<{ error: DOMException }>('request-failed').at(-1)!.error as DOMException).name,
    ).toBe('NotSupportedError');
  });

  it("consumes the engine's reserved chords in the editing root only (uwg-te-req-engine-11)", async () => {
    const r = await setup({ reservedKeys: ['Mod+Shift+K', 'Mod+i'] });
    const before = r.of('request').length;
    expect(r.press(mod('K', { shiftKey: true })).consumed).toBe(true);
    expect(r.of('request')).toHaveLength(before);
    expect(r.press(mod('K', { shiftKey: true }), 'toolbar').consumed).toBe(false);
    // A tool chord equal to a reserved one runs the tool.
    r.press(mod('i'));
    expect(
      r
        .of<{ tool: string }>('request')
        .slice(before)
        .map((d) => d.tool),
    ).toEqual(['italic']);
  });

  it("selects the editing root's content on Mod+A only while read-only (uwg-te-tab-keymap-host-r13, uwg-te-kb-req-host)", async () => {
    const r = await setup();
    expect(r.press(mod('a')).consumed).toBe(false);
    r.setAccess(READ_ONLY);
    const pressed = r.press(mod('a'));
    expect(pressed.consumed).toBe(true);
    expect(r.selectRootContent.mock.calls).toEqual([[pressed.event]]);
    expect(r.press(mod('a'), 'toolbar').consumed).toBe(false);
    r.setAccess(DISABLED);
    expect(r.press(mod('a')).consumed).toBe(false);
    expect(r.selectRootContent).toHaveBeenCalledTimes(1);
  });

  it('consumes Alt+F10 in the editing root with no effect and leaves Escape unconsumed (uwg-te-req-key-5, uwg-te-req-key-4)', async () => {
    const r = await setup();
    const before = requests(r.of);
    expect(r.press({ key: 'F10', altKey: true }).consumed).toBe(true);
    expect(r.press({ key: 'F10', altKey: true }, 'toolbar').consumed).toBe(false);
    for (const zone of ['editing', 'toolbar'] as const) {
      const escape = r.press({ key: 'Escape' }, zone);
      expect([escape.consumed, escape.stopped]).toEqual([false, false]);
    }
    expect(requests(r.of)).toEqual(before);
    expect(r.press(mod('b')).consumed).toBe(true);
  });

  it('matches nothing during composition (uwg-te-kb-req-capture, uwg-te-kb-req-host)', async () => {
    const r = await setup();
    expect(r.press(mod('b', { isComposing: true })).consumed).toBe(false);
    const legacy = keyEvent(mod('b'), { path: r.at.editing });
    Object.defineProperty(legacy, 'keyCode', { value: 229 });
    r.z.root.dispatchEvent(legacy);
    expect(legacy.defaultPrevented).toBe(false);
    r.z.root.dispatchEvent(new Event('compositionstart'));
    expect(r.press(mod('b')).consumed).toBe(false);
    r.z.root.dispatchEvent(new Event('compositionend'));
    expect(r.press(mod('b')).consumed).toBe(true);
  });

  it('ignores prevented events, a disabled owner and a nested owner (mp-kb-guards)', async () => {
    const r = await setup();
    const prevented = keyEvent(mod('b'), { path: r.at.editing });
    prevented.preventDefault();
    r.z.root.dispatchEvent(prevented);
    expect(prevented.cancelBubble).toBe(false);
    const nested = new EventTarget();
    const inner = new KeyBindingOwner(nested, { platform: 'windows' });
    const claimed = vi.fn(() => true);
    inner.register({ keys: 'Mod+B', handler: claimed });
    const event = keyEvent(mod('b'), { path: [nested, r.z.content, r.z.root] });
    r.z.root.dispatchEvent(event);
    expect([event.defaultPrevented, claimed.mock.calls.length]).toEqual([false, 0]);
    inner.dispose();
    r.setAccess(DISABLED);
    expect(r.press(mod('b')).consumed).toBe(false);
    r.setAccess(EDITABLE);
    expect(r.press(mod('b')).consumed).toBe(true);
  });

  it('prefers Mod+Shift+Z over Mod+Z and repeats undo and redo, never a toggle (mp-kb-priority, uwg-te-req-key-1)', async () => {
    const r = await setup();
    const request = vi.spyOn(r.controller, 'request');
    r.press(mod('Z', { shiftKey: true }));
    r.press(mod('z', { repeat: true }));
    r.press(mod('Z', { shiftKey: true, repeat: true }));
    expect(r.press(mod('b', { repeat: true })).consumed).toBe(true);
    expect(request.mock.calls.map(([proposal]) => proposal.target)).toEqual([
      'redo',
      'undo',
      'redo',
    ]);
  });

  it('redoes on Ctrl+Y outside Apple platforms only (uwg-te-tab-keymap-r1)', async () => {
    const r = await setup();
    const request = vi.spyOn(r.controller, 'request');
    r.press(mod('y'));
    const mac = await setup({ platform: 'mac' });
    expect(mac.press(mod('y')).consumed).toBe(false);
    // The built-in redo lists Ctrl+Y only where the machine is not an Apple platform.
    expect(request.mock.calls.map(([proposal]) => proposal.target)).toEqual(
      typeof r.router.shortcut('redo')?.aria === 'string' &&
        r.router.shortcut('redo')!.aria.includes('Control+Y')
        ? ['redo']
        : [],
    );
  });

  it('lets AltGraph characters reach the engine (uwg-te-req-key-2, mp-kb-pattern)', async () => {
    const r = await setup();
    const brace = r.press({
      key: '}',
      code: 'Digit0',
      ctrlKey: true,
      altKey: true,
      altGraph: true,
    });
    expect(brace.consumed).toBe(false);
    const bracket = { key: '[', code: 'Digit8', ctrlKey: true, altKey: true };
    expect(r.press({ ...bracket, altGraph: true }).consumed).toBe(false);
    expect(r.press({ key: '[', ctrlKey: true, altGraph: false }).consumed).toBe(true);
  });

  it('re-registers on a new registry and drops unavailable tools (uwg-te-req-key-1)', async () => {
    const r = await setup();
    const capabilities = new Set([...BASE_CAPABILITIES].filter((c) => c !== 'history'));
    const reduced = fakeTools({ capabilities, supportsNode: () => true });
    r.resync({ registry: reduced.registry });
    expect(r.press(mod('z')).consumed).toBe(false);
    r.resync({ registry: fakeTools(r.engine).registry });
    expect(r.press(mod('z')).consumed).toBe(true);
  });

  it('re-registers nothing when a sync repeats the registry and the reserved keys (uwg-te-req-key-1)', async () => {
    const r = await setup();
    await flush();
    const owner = KeyBindingOwner.for(r.z.root)!;
    const notified = vi.fn();
    owner.subscribe(notified);
    const list = owner.list();
    r.resync({ access: DISABLED, layout: { ...fakeTools(r.engine).layout }, nodes: [] });
    await flush();
    expect([notified.mock.calls.length, owner.list()]).toEqual([0, list]);
    expect(r.press(mod('b')).consumed).toBe(false);
    r.resync({ reservedKeys: [] });
    await flush();
    expect(notified).toHaveBeenCalledTimes(1);
  });

  it('detaches its listeners and owner and attaches again (uwg-te-kb-req-capture)', async () => {
    const r = await setup();
    r.router.detach();
    expect(r.press(mod('b')).consumed).toBe(false);
    const drop = dragEvent('drop', r.at.editing, { 'text/plain': 'x' });
    r.z.root.dispatchEvent(drop);
    expect(drop.defaultPrevented).toBe(false);
    r.router.attach(r.z.root);
    expect(r.press(mod('b')).consumed).toBe(true);
    const again = dragEvent('drop', r.at.editing, { 'text/plain': 'x' });
    r.z.root.dispatchEvent(again);
    expect(again.defaultPrevented).toBe(true);
  });
});

describe('text editor paste', () => {
  const caret: TextEditorSelection = {
    kind: 'text',
    anchor: { block: 'a', offset: 1 },
    head: { block: 'a', offset: 1 },
    empty: true,
  };
  const input = (data: Record<string, string> | null, selection: TextEditorSelection = caret) => ({
    data: data ? { getData: (type: string) => data[type] ?? '' } : null,
    selection,
    nodes: [],
    direction: 'ltr' as const,
    parserWindow: new FakeContainer().ownerDocument.defaultView,
    sourceEvent: new Event('paste'),
  });

  it('reads a paste as one content.insert at the selection (uwg-te-req-content-6, uwg-te-tab-reasons-r8)', () => {
    const html = pasteProposal(input({ 'text/html': '<p>One <b>two</b></p>', 'text/plain': 'x' }));
    expect(html).toMatchObject({ surface: 'paste', reason: 'input-paste', trigger: null });
    const [action] = html!.target as readonly {
      type: string;
      content: { kind: string; blocks: unknown[] };
      at: unknown;
    }[];
    expect([action!.type, action!.content.kind, action!.content.blocks.length]).toEqual([
      'content.insert',
      'range',
      1,
    ]);
    expect(action!.at).toEqual({ kind: 'text', anchor: caret.anchor, head: caret.head });
    const text = pasteProposal({ ...input({ 'text/plain': 'a\n\nb\nc' }), parserWindow: null });
    const [plain] = text!.target as readonly {
      content: { blocks: { content: { type: string }[] }[] };
    }[];
    expect(plain!.content.blocks).toHaveLength(2);
    expect(plain!.content.blocks[1]!.content.map((inline) => inline.type)).toEqual([
      'text',
      'hard-break',
      'text',
    ]);
    // Without a parser (no window and no global one) the text flavour is read.
    expect(
      pasteProposal({
        ...input({ 'text/html': '<p>x</p>', 'text/plain': 'y' }),
        parserWindow: null,
      }),
    ).not.toBeNull();
    const blocks = pasteProposal(input({ 'text/plain': 'x' }, { kind: 'blocks', ids: ['a', 'b'] }));
    expect((blocks!.target as readonly { at: unknown }[])[0]!.at).toEqual({
      kind: 'blocks',
      ids: ['a', 'b'],
    });
    expect(pasteProposal(input({ Files: 'x' }))).toBeNull();
    expect(pasteProposal(input(null))).toBeNull();
    expect(pasteProposal(input({ 'text/plain': 'x' }, { kind: 'none' }))).toBeNull();
  });

  it('intercepts every paste into the editing root and requests it (uwg-te-req-content-6, uwg-te-req-engine-6)', async () => {
    const r = await setup();
    await selectText(r.controller, r.blocks[0]!, 5);
    const before = r.of('request').length;
    const paste = pasteEvent(r.at.editing, { 'text/plain': ' there' });
    r.z.root.dispatchEvent(paste);
    expect([paste.defaultPrevented, paste.cancelBubble]).toEqual([true, true]);
    await flush();
    const detail = r.of<Record<string, unknown>>('request').slice(before);
    expect(detail).toHaveLength(1);
    expect(detail[0]).toMatchObject({
      tool: null,
      surface: 'paste',
      reason: 'input-paste',
      sourceEvent: paste,
      actions: [{ type: 'content.insert', at: { kind: 'text' } }],
    });
    // A cancelling listener leaves the document as it was.
    const request = vi.spyOn(r.controller, 'request');
    r.host.cancel = true;
    r.z.root.dispatchEvent(pasteEvent(r.at.editing, { 'text/plain': '!' }));
    await expect(request.mock.results[0]!.value).resolves.toBe('cancelled');
    const files = pasteEvent(r.at.editing, { Files: '' });
    r.z.root.dispatchEvent(files);
    expect(files.defaultPrevented).toBe(true);
    for (const zone of ['toolbar', 'popup'] as const) {
      const outside = pasteEvent(r.at[zone], { 'text/plain': 'x' });
      r.z.root.dispatchEvent(outside);
      expect(outside.defaultPrevented).toBe(false);
    }
    expect(r.of('request')).toHaveLength(before + 2);
  });

  it('rejects a paste while read-only through the pipeline (uwg-te-req-content-6)', async () => {
    const r = await setup({ access: READ_ONLY });
    const content = r.instance.getContent('html');
    const before = requests(r.of);
    for (const data of [{ 'text/html': '<p>x</p>' }, { 'text/plain': 'x' }]) {
      const paste = pasteEvent(r.at.editing, data);
      r.z.root.dispatchEvent(paste);
      expect(paste.defaultPrevented).toBe(true);
    }
    await flush();
    const failed = r.of<{ error: DOMException }>('request-failed').slice(before.failed);
    expect(requests(r.of).request).toBe(before.request);
    expect(failed.map((detail) => detail.error.name)).toEqual([
      'NotSupportedError',
      'NotSupportedError',
    ]);
    expect(r.instance.getContent('html')).toBe(content);
  });

  it('takes every drop from outside the document from the engine, accepting it only while editable (uwg-te-req-content-6, uwg-te-req-engine-6)', async () => {
    const r = await setup();
    const data = { 'text/html': '<p>x</p>', 'text/plain': 'x' };
    for (const access of [EDITABLE, READ_ONLY, DISABLED]) {
      r.setAccess(access);
      const before = requests(r.of);
      const over = dragEvent('dragover', r.at.editing, data);
      r.z.root.dispatchEvent(over);
      expect([over.dataTransfer.dropEffect, over.defaultPrevented, over.cancelBubble]).toEqual([
        access === EDITABLE ? 'copy' : 'none',
        true,
        true,
      ]);
      const drop = dragEvent('drop', r.at.editing, data);
      r.z.root.dispatchEvent(drop);
      expect([drop.defaultPrevented, drop.cancelBubble]).toEqual([true, true]);
      await flush();
      expect(requests(r.of)).toEqual(before);
    }
    r.setAccess(EDITABLE);
    // A drag start that a listener cancelled, as the engines do, leaves every drop refused.
    const cancelled = dragEvent('dragstart', r.at.editing);
    cancelled.preventDefault();
    r.z.root.dispatchEvent(cancelled);
    const refused = dragEvent('drop', r.at.editing, data);
    r.z.root.dispatchEvent(refused);
    expect(refused.defaultPrevented).toBe(true);
    // A drag inside the document stays with the engine until it ends.
    r.z.root.dispatchEvent(dragEvent('dragstart', r.at.editing));
    const inside = dragEvent('dragover', r.at.editing, data);
    r.z.root.dispatchEvent(inside);
    expect([inside.defaultPrevented, inside.cancelBubble]).toEqual([false, false]);
    r.z.root.dispatchEvent(dragEvent('dragend', r.at.editing));
    const after = dragEvent('drop', r.at.editing, data);
    r.z.root.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(true);
    for (const zone of ['toolbar', 'popup'] as const) {
      const outside = dragEvent('drop', r.at[zone], data);
      r.z.root.dispatchEvent(outside);
      expect(outside.defaultPrevented).toBe(false);
    }
  });
});

describe('text editor paste and drop routing (M7)', () => {
  const file = (name: string, type: string) => ({ name, type }) as File;

  function transferEvent(
    type: string,
    path: EventTarget[],
    data: Record<string, string>,
    files: File[] = [],
    point = { clientX: 0, clientY: 0 },
  ) {
    const transfer = {
      types: Object.keys(data),
      files,
      getData: (key: string) => data[key] ?? '',
      dropEffect: 'copy',
    };
    const event = Object.assign(new Event(type, { cancelable: true }), {
      clipboardData: transfer,
      dataTransfer: transfer,
      ...point,
    });
    Object.defineProperty(event, 'composedPath', { value: () => path });
    return event;
  }

  it('reads HTML, else labelled Markdown, else text, and keeps image files only', () => {
    const options = { nodes: [], direction: 'ltr' as const, parserWindow: null };
    const data = (flavours: Record<string, string>) => ({
      getData: (type: string) => flavours[type] ?? '',
    });
    const markdown = transferContent(
      data({ 'text/markdown': '# Title\n\nBody', 'text/plain': 'x' }),
      options,
    )!;
    expect(markdown.kind).toBe('range');
    expect(markdown.blocks.map((block) => block.type)).toEqual(['heading', 'paragraph']);
    const text = transferContent(data({ 'text/plain': '# Title' }), options)!;
    expect(text.blocks.map((block) => block.type)).toEqual(['paragraph']);
    expect(transferContent(data({}), options)).toBeNull();
    expect(
      imageFiles({
        files: [file('a.png', 'image/png'), file('a.txt', 'text/plain')] as unknown as FileList,
      }).map((f) => f.name),
    ).toEqual(['a.png']);
    expect(imageFiles(null)).toEqual([]);
  });

  it('links a non-empty text selection when a single allowed URL is pasted over it (uwg-te-req-content-6)', () => {
    const anchor = { block: 'a', offset: 0 };
    const head = { block: 'a', offset: 4 };
    const base = {
      nodes: [],
      direction: 'ltr' as const,
      parserWindow: null,
      sourceEvent: new Event('paste'),
    };
    const over = (text: string, empty = false) =>
      pasteProposal({
        ...base,
        data: { getData: (type: string) => (type === 'text/plain' ? text : '') },
        selection: { kind: 'text', anchor, head: empty ? anchor : head, empty },
      });
    expect(over('https://example.test')).toMatchObject({
      target: [{ type: 'link.set', href: 'https://example.test' }],
      surface: 'paste',
      reason: 'input-paste',
    });
    // A URL that fails the link policy, or one pasted at a caret, is pasted as content.
    expect((over('javascript:alert(1)')!.target as { type: string }[])[0]!.type).toBe(
      'content.insert',
    );
    expect((over('https://example.test', true)!.target as { type: string }[])[0]!.type).toBe(
      'content.insert',
    );
  });

  it('proposes a drop as one content.insert at the text point, reason drag', () => {
    const at = { kind: 'text' as const, anchor: { block: 'b', offset: 2 } };
    const proposal = dropProposal({
      data: { getData: (type: string) => (type === 'text/plain' ? 'dropped' : '') },
      at,
      nodes: [],
      direction: 'ltr',
      parserWindow: null,
      sourceEvent: new Event('drop'),
    });
    expect(proposal).toMatchObject({ surface: 'drag', reason: 'drag', target: [{ at }] });
    expect(
      dropProposal({
        data: { getData: () => '' },
        at,
        nodes: [],
        direction: 'ltr',
        parserWindow: null,
        sourceEvent: new Event('drop'),
      }),
    ).toBeNull();
  });

  it('inserts a drop at the point under the pointer and uploads its image files while editable', async () => {
    const pointAt = vi.fn(() => ({ block: 'p', offset: 1 }));
    const uploadImages = vi.fn(() => true);
    const r = await setup({ host: { pointAt, uploadImages } });
    const before = r.of('request').length;
    const image = file('photo.png', 'image/png');
    const drop = transferEvent('drop', r.at.editing, { 'text/plain': 'x' }, [image], {
      clientX: 12,
      clientY: 34,
    });
    r.z.root.dispatchEvent(drop);
    expect(drop.defaultPrevented).toBe(true);
    expect(pointAt).toHaveBeenCalledWith(12, 34);
    expect(uploadImages).toHaveBeenCalledWith(
      [image],
      { kind: 'text', anchor: { block: 'p', offset: 1 } },
      'drag',
      drop,
    );
    await flush();
    expect(r.of<Record<string, unknown>>('request').slice(before)).toMatchObject([
      { surface: 'drag', reason: 'drag', actions: [{ type: 'content.insert' }] },
    ]);
    r.setAccess(READ_ONLY);
    r.z.root.dispatchEvent(transferEvent('drop', r.at.editing, { 'text/plain': 'x' }, [image]));
    expect(uploadImages).toHaveBeenCalledTimes(1);
  });

  it('uploads pasted image files at the selection and still pastes the rest, never while read-only', async () => {
    const uploadImages = vi.fn<NonNullable<TextEditorRouterHost['uploadImages']>>(() => true);
    const r = await setup({ host: { uploadImages } });
    await selectText(r.controller, r.blocks[0]!, 2);
    const image = file('shot.png', 'image/png');
    const paste = transferEvent('paste', r.at.editing, { 'text/plain': 'x' }, [
      image,
      file('notes.txt', 'text/plain'),
    ]);
    r.z.root.dispatchEvent(paste);
    expect(uploadImages).toHaveBeenCalledTimes(1);
    expect(uploadImages.mock.calls[0]![0]).toEqual([image]);
    expect(uploadImages.mock.calls[0]![2]).toBe('input-paste');
    r.setAccess(READ_ONLY);
    r.z.root.dispatchEvent(transferEvent('paste', r.at.editing, {}, [image]));
    expect(uploadImages).toHaveBeenCalledTimes(1);
  });

  it('forwards keys to a shown suggestion list before every other key handling (uwg-te-req-inline-2)', async () => {
    const suggestionKey = vi.fn((event: KeyboardEvent) => event.key === 'ArrowDown');
    const editingKey = vi.fn(() => false);
    const r = await setup({ host: { suggestionKey, editingKey } });
    const down = r.press({ key: 'ArrowDown' });
    expect([down.consumed, down.stopped]).toEqual([true, true]);
    expect(editingKey).not.toHaveBeenCalled();
    const other = r.press({ key: 'a' });
    expect(other.consumed).toBe(false);
    expect(editingKey).toHaveBeenCalledTimes(1);
    r.press({ key: 'ArrowDown' }, 'toolbar');
    expect(suggestionKey).toHaveBeenCalledTimes(2);
  });
});

describe('text editor router: contextual controls and table Tab (M9)', () => {
  async function tableRouter(access: TextEditorAccess = EDITABLE) {
    const editor = await readyEditor({
      content: { content: '<p>Hello</p>', format: 'html' },
    });
    const z = zones();
    const at = paths(z);
    const contextualControls = vi.fn();
    const tableTab = vi.fn((_event: KeyboardEvent, backward: boolean) => !backward);
    const router = new TextEditorRouter(
      {
        parts: () => ({ content: z.content as Element, toolbar: z.toolbar as Element }),
        selection: () => editor.instance.getState().selection,
        direction: () => 'ltr',
        request: (proposal) => editor.controller.request(proposal),
        selectRootContent: vi.fn(),
        contextualControls,
        tableTab,
      },
      { platform: 'windows' },
    );
    const tools = fakeTools(editor.engine);
    router.sync({
      registry: tools.registry,
      layout: tools.layout,
      reservedKeys: EMPTY,
      access,
      nodes: [],
    });
    router.attach(z.root);
    const press = (init: KeyEventInit, zone: Zone = 'editing') => {
      const event = keyEvent(init, { path: at[zone] });
      z.root.dispatchEvent(event);
      return event.defaultPrevented;
    };
    return { press, contextualControls, tableTab };
  }

  it('Alt+F10 in the editing root moves to the contextual controls (uwg-te-tab-keymap-host-r2)', async () => {
    const r = await tableRouter();
    expect(r.press({ key: 'F10', altKey: true })).toBe(true);
    expect(r.contextualControls).toHaveBeenCalledTimes(1);
    expect(r.press({ key: 'F10', altKey: true, repeat: true })).toBe(true);
    expect(r.contextualControls).toHaveBeenCalledTimes(1);
    expect(r.press({ key: 'F10', altKey: true }, 'toolbar')).toBe(false);
  });

  it('Tab and Shift+Tab go to the table view in the editing root, consumed as it answers (uwg-te-req-tables-7)', async () => {
    const r = await tableRouter();
    expect(r.press({ key: 'Tab' })).toBe(true);
    expect(r.press({ key: 'Tab', shiftKey: true })).toBe(false);
    expect(r.tableTab.mock.calls.map(([, backward]) => backward)).toEqual([false, true]);
    expect(r.press({ key: 'Tab' }, 'toolbar')).toBe(false);
    expect(r.tableTab).toHaveBeenCalledTimes(2);
  });

  it('leaves Tab alone while read-only (uwg-te-req-tables-7)', async () => {
    const r = await tableRouter(READ_ONLY);
    expect(r.press({ key: 'Tab' })).toBe(false);
    expect(r.tableTab).not.toHaveBeenCalled();
  });
});

describe('text editor router: block hooks (M8)', () => {
  it('lets the block view consume editing-root keys before the keymap, and only there', async () => {
    const editingKey = vi.fn((event: KeyboardEvent) => event.key === 'Escape');
    const r = await setup({ host: { editingKey } });
    const escape = r.press({ key: 'Escape' });
    expect([escape.consumed, escape.stopped]).toEqual([true, true]);
    expect(r.press({ key: 'x' }).consumed).toBe(false);
    expect(r.press({ key: 'Escape' }, 'toolbar').consumed).toBe(false);
    expect(editingKey).toHaveBeenCalledTimes(2);
  });

  it('hands block tool chords to the block view, which then makes no tool request', async () => {
    const blockTool = vi.fn((id: string) => id === 'duplicate-block');
    const r = await setup({ host: { blockTool } });
    const request = vi.spyOn(r.controller, 'request');
    const duplicate = r.press(mod('d'));
    expect(duplicate.consumed).toBe(true);
    expect(blockTool).toHaveBeenCalledWith('duplicate-block', duplicate.event);
    expect(request).not.toHaveBeenCalled();
    // Another block tool that the view leaves is a tool request as before.
    r.press(mod('ArrowUp', { shiftKey: true }));
    expect(blockTool).toHaveBeenLastCalledWith('move-block-up', expect.anything());
    expect(request).toHaveBeenCalledTimes(1);
    // Block tools never act from the fixed toolbar.
    blockTool.mockClear();
    r.press(mod('d'), 'toolbar');
    expect(blockTool).not.toHaveBeenCalled();
  });
});
