import { keyEvent } from './fakes.test.js';
import { describe, expect, it, vi } from 'vitest';
import {
  KeyBindingOwner,
  TpShortcutChangeEvent,
  editableOwnsNavigationKey,
  keyEventPreempted,
  matchesKeyChord,
  parseKeyPattern,
  type KeyBindingOptions,
} from './key-bindings.js';
import { preventComponentHandling } from './part.js';
import { CleanupScope } from './services.js';

/** Minimal selector matcher for the simple selectors used by interactive-target.ts. */
function matchesSimple(element: FakeElement, selector: string): boolean {
  const parsed = /^([a-z-]*)((?:\[[^\]]+\])*)(?::not\(\[([^=\]]+)(?:="([^"]*)")?\]\))?$/.exec(
    selector.trim(),
  );
  if (!parsed) return false;
  const [, tag, attributes, notName, notValue] = parsed;
  if (tag && tag !== element.localName) return false;
  for (const [, name, value] of attributes!.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)) {
    const actual = element.getAttribute(name!);
    if (actual === null || (value !== undefined && actual !== value)) return false;
  }
  if (notName) {
    const actual = element.getAttribute(notName);
    if (actual !== null && (notValue === undefined || actual === notValue)) return false;
  }
  return true;
}

type FakeElement = EventTarget & {
  nodeType: 1;
  localName: string;
  isContentEditable: boolean;
  ownerDocument: FakeDocument;
  getAttribute(name: string): string | null;
  matches(selector: string): boolean;
};
type FakeDocument = EventTarget & { defaultView: { navigator: { platform: string } } };

function documentFor(platform = 'Win32'): FakeDocument {
  return Object.assign(new EventTarget(), {
    defaultView: { navigator: { platform, userAgent: '' } },
  }) as FakeDocument;
}
const defaultDocument = documentFor();

function element(
  localName = 'div',
  attributes: Record<string, string> = {},
  ownerDocument = defaultDocument,
): FakeElement {
  const node = Object.assign(new EventTarget(), {
    nodeType: 1 as const,
    localName,
    isContentEditable: 'contenteditable' in attributes && attributes.contenteditable !== 'false',
    ownerDocument,
    getAttribute: (name: string) => (name in attributes ? attributes[name]! : null),
    matches: (selector: string): boolean =>
      selector.split(',').some((part) => matchesSimple(node, part)),
  });
  return node;
}

function owner(host = element(), options: ConstructorParameters<typeof KeyBindingOwner>[1] = {}) {
  return new KeyBindingOwner(host, { platform: 'windows', ...options });
}
function bind(target: KeyBindingOwner, options: Partial<KeyBindingOptions> & { keys: string }) {
  const handler = vi.fn<KeyBindingOptions['handler']>(() => undefined);
  const release = target.register({ handler, ...options });
  return { handler, release };
}
const flush = () => Promise.resolve();

describe('Key pattern parsing', () => {
  it('parses combinations, named keys and Space', () => {
    expect(parseKeyPattern('Ctrl+Shift+f', 'windows')).toEqual([
      expect.objectContaining({ key: 'f', label: 'f', ctrlKey: true, shiftKey: true }),
    ]);
    expect(parseKeyPattern('Space', 'linux')[0]).toMatchObject({ key: ' ', label: 'Space' });
    expect(parseKeyPattern('alt+ArrowLeft', 'linux')[0]).toMatchObject({
      key: 'arrowleft',
      label: 'ArrowLeft',
      altKey: true,
    });
    expect(parseKeyPattern('Option+Command+k', 'mac')[0]).toMatchObject({
      altKey: true,
      metaKey: true,
    });
  });
  it('maps Mod to Meta on macOS and Control elsewhere', () => {
    expect(parseKeyPattern('Mod+k', 'mac')[0]).toMatchObject({ metaKey: true, ctrlKey: false });
    expect(parseKeyPattern('Mod+k', 'windows')[0]).toMatchObject({ metaKey: false, ctrlKey: true });
    expect(parseKeyPattern('mod+k', 'linux')[0]).toMatchObject({ ctrlKey: true });
  });
  it('expands 0-9 into ten bindings and keeps modifiers', () => {
    const digits = parseKeyPattern('0-9', 'linux');
    expect(digits.map((chord) => chord.key)).toEqual(
      Array.from({ length: 10 }, (_, digit) => String(digit)),
    );
    expect(digits.every((chord) => chord.pattern === '0-9')).toBe(true);
    expect(parseKeyPattern('Shift+0-9', 'linux')).toHaveLength(10);
    expect(parseKeyPattern('Shift+0-9', 'linux')[3]).toMatchObject({ key: '3', shiftKey: true });
  });
  it('splits comma-separated patterns while allowing comma and plus as keys', () => {
    expect(parseKeyPattern('k, Space', 'linux').map((chord) => chord.key)).toEqual(['k', ' ']);
    expect(parseKeyPattern('Ctrl+,', 'linux')[0]).toMatchObject({ key: ',', ctrlKey: true });
    expect(parseKeyPattern(',', 'linux')[0]).toMatchObject({ key: ',' });
    expect(parseKeyPattern('a,,', 'linux').map((chord) => chord.key)).toEqual(['a', ',']);
    expect(parseKeyPattern('+', 'linux')[0]).toMatchObject({ key: '+' });
    expect(parseKeyPattern('Shift++', 'linux')[0]).toMatchObject({ key: '+', shiftKey: true });
  });
  it('rejects unknown modifiers and missing keys', () => {
    expect(() => parseKeyPattern('Hyper+k', 'linux')).toThrow(/unknown/);
    expect(() => parseKeyPattern('Ctrl+', 'linux')).toThrow(/missing key/);
  });
});

describe('Key chord matching', () => {
  const [ctrlF] = parseKeyPattern('Ctrl+f', 'linux');
  it('compares keys case-insensitively and modifiers exactly', () => {
    expect(matchesKeyChord(ctrlF!, keyEvent({ key: 'F', ctrlKey: true }))).toBe(true);
    expect(matchesKeyChord(ctrlF!, keyEvent({ key: 'f' }))).toBe(false);
    expect(matchesKeyChord(ctrlF!, keyEvent({ key: 'f', ctrlKey: true, shiftKey: true }))).toBe(
      false,
    );
    expect(matchesKeyChord(ctrlF!, keyEvent({ key: 'f', ctrlKey: true, metaKey: true }))).toBe(
      false,
    );
  });
  it('implies Shift and Alt for caseless symbols but not for letters', () => {
    const [greater] = parseKeyPattern('>', 'linux');
    expect(matchesKeyChord(greater!, keyEvent({ key: '>', shiftKey: true }))).toBe(true);
    expect(matchesKeyChord(greater!, keyEvent({ key: '>', shiftKey: true, altKey: true }))).toBe(
      true,
    );
    expect(matchesKeyChord(greater!, keyEvent({ key: '>', ctrlKey: true }))).toBe(false);
    const [question] = parseKeyPattern('Shift+?', 'linux');
    expect(matchesKeyChord(question!, keyEvent({ key: '?' }))).toBe(false);
    expect(matchesKeyChord(question!, keyEvent({ key: '?', shiftKey: true }))).toBe(true);
    const [k] = parseKeyPattern('k', 'linux');
    expect(matchesKeyChord(k!, keyEvent({ key: 'K', shiftKey: true }))).toBe(false);
    const [space] = parseKeyPattern('Space', 'linux');
    expect(matchesKeyChord(space!, keyEvent({ key: ' ', shiftKey: true }))).toBe(false);
  });
  it('never matches Unidentified (IME) keys', () => {
    const [unidentified] = parseKeyPattern('Unidentified', 'linux');
    expect(matchesKeyChord(unidentified!, keyEvent('Unidentified'))).toBe(false);
  });
  it('treats explicit chord objects as exact, without implied modifiers', () => {
    const target = owner();
    const handler = vi.fn();
    target.register({ keys: { key: '?' }, handler });
    target.handleKeyDown(keyEvent({ key: '?', shiftKey: true }));
    expect(handler).not.toHaveBeenCalled();
    target.handleKeyDown(keyEvent('?'));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(() => target.register({ keys: {} as never, handler })).toThrow(/missing key/);
    target.register({ keys: { key: '' }, handler: () => true });
  });
});

describe('Key binding owner dispatch', () => {
  it('listens on the owner, calls the handler and prevents default on a match', () => {
    const host = element();
    const target = owner(host);
    const { handler } = bind(target, { keys: 'k', action: 'toggle-paused', value: 1 });
    const event = keyEvent('k', { path: [host] });
    host.dispatchEvent(event);
    expect(handler).toHaveBeenCalledWith(event, {
      chord: expect.objectContaining({ key: 'k' }),
      action: 'toggle-paused',
      value: 1,
      scope: 'owner',
    });
    expect(event.defaultPrevented).toBe(true);
    const other = keyEvent('j', { path: [host] });
    host.dispatchEvent(other);
    expect(other.defaultPrevented).toBe(false);
  });
  it('lets a handler decline so lower-priority bindings run and default is kept', () => {
    const target = owner();
    const first = vi.fn(() => false as const);
    const second = vi.fn(() => false as const);
    target.register({ keys: 'k', handler: first });
    target.register({ keys: 'k', handler: second });
    const event = keyEvent('k');
    expect(target.handleKeyDown(event)).toBe(false);
    expect(first).toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
  it('prefers more modifiers, then registration order', () => {
    const target = owner();
    const calls: string[] = [];
    target.register({ keys: '>', handler: () => void calls.push('implicit') });
    target.register({ keys: 'Shift+>', handler: () => void calls.push('explicit') });
    target.handleKeyDown(keyEvent({ key: '>', shiftKey: true }));
    expect(calls).toEqual(['explicit']);
    target.register({ keys: 'm', handler: () => void calls.push('first') });
    target.register({ keys: 'm', handler: () => void calls.push('second') });
    target.handleKeyDown(keyEvent('m'));
    expect(calls).toEqual(['explicit', 'first']);
  });
  it('does not repeat while held unless the binding opts in', () => {
    const target = owner();
    const { handler: toggle } = bind(target, { keys: 'f' });
    const { handler: step } = bind(target, { keys: 'ArrowRight', repeat: true });
    const held = keyEvent({ key: 'f', repeat: true });
    target.handleKeyDown(held);
    expect(toggle).not.toHaveBeenCalled();
    expect(held.defaultPrevented).toBe(false);
    target.handleKeyDown(keyEvent({ key: 'ArrowRight', repeat: true }));
    expect(step).toHaveBeenCalledTimes(1);
  });
  it('honors static and dynamic binding disablement', () => {
    const target = owner();
    let disabled = true;
    const { handler } = bind(target, { keys: 'c', disabled: () => disabled });
    const { handler: never } = bind(target, { keys: 'x', disabled: true });
    target.handleKeyDown(keyEvent('c'));
    target.handleKeyDown(keyEvent('x'));
    disabled = false;
    target.handleKeyDown(keyEvent('c'));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(never).not.toHaveBeenCalled();
  });
  it('unregisters bindings idempotently', () => {
    const target = owner();
    const { handler, release } = bind(target, { keys: 'k' });
    release();
    release();
    target.handleKeyDown(keyEvent('k'));
    expect(handler).not.toHaveBeenCalled();
    expect(target.list()).toEqual([]);
  });
});

describe('Key binding guards', () => {
  it('ignores consumed and composing events', () => {
    const target = owner();
    const { handler } = bind(target, { keys: 'k' });
    const prevented = keyEvent('k');
    prevented.preventDefault();
    target.handleKeyDown(prevented);
    const component = keyEvent('k');
    preventComponentHandling(component);
    target.handleKeyDown(component);
    target.handleKeyDown(keyEvent({ key: 'k', isComposing: true }));
    expect(handler).not.toHaveBeenCalled();
    expect(keyEventPreempted(component)).toBe(true);
    expect(keyEventPreempted(keyEvent('Unidentified'))).toBe(true);
    expect(keyEventPreempted(keyEvent('k'))).toBe(false);
    const { handler: legacy } = bind(target, { keys: 'j', guards: { composition: false } });
    target.handleKeyDown(keyEvent({ key: 'j', isComposing: true }));
    expect(legacy).toHaveBeenCalledTimes(1);
  });
  it('leaves Space and Enter to activatable targets inside the owner', () => {
    const host = element();
    const target = owner(host);
    const { handler } = bind(target, { keys: 'Space, Enter' });
    const button = element('button');
    target.handleKeyDown(keyEvent(' ', { path: [button, host] }));
    target.handleKeyDown(keyEvent('Enter', { path: [element('div', { role: 'slider' }), host] }));
    target.handleKeyDown(keyEvent(' ', { path: [element('tp-menu-item'), host] }));
    expect(handler).not.toHaveBeenCalled();
    target.handleKeyDown(keyEvent(' ', { path: [element('div'), host] }));
    // Interactive elements outside the owner boundary do not count.
    target.handleKeyDown(keyEvent(' ', { path: [host, element('button')] }));
    expect(handler).toHaveBeenCalledTimes(2);
    const { handler: other } = bind(target, { keys: 'k' });
    target.handleKeyDown(keyEvent('k', { path: [button, host] }));
    expect(other).toHaveBeenCalledTimes(1);
  });
  it('ignores unmodified single keys in editable targets but allows modified shortcuts', () => {
    const host = element();
    const target = owner(host);
    const { handler: single } = bind(target, { keys: 'k' });
    const { handler: modified } = bind(target, { keys: 'Mod+k' });
    const { handler: symbol } = bind(target, { keys: '?' });
    for (const editor of [
      element('input'),
      element('textarea'),
      element('select'),
      element('div', { contenteditable: '' }),
    ]) {
      target.handleKeyDown(keyEvent('k', { path: [editor, host] }));
      target.handleKeyDown(keyEvent({ key: '?', shiftKey: true }, { path: [editor, host] }));
    }
    expect(single).not.toHaveBeenCalled();
    expect(symbol).not.toHaveBeenCalled();
    target.handleKeyDown(keyEvent({ key: 'k', ctrlKey: true }, { path: [element('input'), host] }));
    expect(modified).toHaveBeenCalledTimes(1);
    target.handleKeyDown(
      keyEvent('k', { path: [element('div', { contenteditable: 'false' }), host] }),
    );
    expect(single).toHaveBeenCalledTimes(1);
  });
  it('supports the all/none editable policies', () => {
    const target = owner();
    const { handler: blocked } = bind(target, { keys: 'Ctrl+b', guards: { editable: 'all' } });
    const { handler: allowed } = bind(target, { keys: 'b', guards: { editable: 'none' } });
    const input = element('input');
    target.handleKeyDown(keyEvent({ key: 'b', ctrlKey: true }, { path: [input] }));
    expect(blocked).not.toHaveBeenCalled();
    target.handleKeyDown(keyEvent('b', { path: [input] }));
    expect(allowed).toHaveBeenCalledTimes(1);
  });
  it('leaves navigation and typeahead keys to nested composite owners', () => {
    const host = element();
    const target = owner(host);
    const { handler: seek } = bind(target, { keys: 'ArrowRight' });
    const { handler: letter } = bind(target, { keys: 'k' });
    const { handler: modified } = bind(target, { keys: 'Ctrl+ArrowRight' });
    const slider = element('div', { role: 'slider' });
    target.handleKeyDown(keyEvent('ArrowRight', { path: [slider, host] }));
    target.handleKeyDown(keyEvent('ArrowRight', { path: [element('tp-slider-thumb'), host] }));
    target.handleKeyDown(
      keyEvent('ArrowRight', {
        path: [element('button'), element('div', { role: 'toolbar' }), host],
      }),
    );
    expect(seek).not.toHaveBeenCalled();
    target.handleKeyDown(keyEvent('k', { path: [slider, host] }));
    expect(letter).toHaveBeenCalledTimes(1);
    target.handleKeyDown(keyEvent('k', { path: [element('div', { role: 'menuitem' }), host] }));
    expect(letter).toHaveBeenCalledTimes(1);
    target.handleKeyDown(keyEvent({ key: 'ArrowRight', ctrlKey: true }, { path: [slider, host] }));
    expect(modified).toHaveBeenCalledTimes(1);
    target.handleKeyDown(keyEvent('ArrowRight', { path: [element('button'), host] }));
    expect(seek).toHaveBeenCalledTimes(1);
    const { handler: opted } = bind(target, {
      keys: 'ArrowLeft',
      guards: { composites: false },
    });
    target.handleKeyDown(keyEvent('ArrowLeft', { path: [slider, host] }));
    expect(opted).toHaveBeenCalledTimes(1);
  });
  it('honors explicit data-tp-owns-keys markers', () => {
    const host = element();
    const target = owner(host);
    const { handler } = bind(target, { keys: 'k, Space, Ctrl+j' });
    target.handleKeyDown(
      keyEvent('k', { path: [element('div', { 'data-tp-owns-keys': 'k Space' }), host] }),
    );
    target.handleKeyDown(
      keyEvent(' ', { path: [element('div', { 'data-tp-owns-keys': 'k Space' }), host] }),
    );
    target.handleKeyDown(
      keyEvent(
        { key: 'j', ctrlKey: true },
        { path: [element('div', { 'data-tp-owns-keys': '' }), host] },
      ),
    );
    expect(handler).not.toHaveBeenCalled();
    target.handleKeyDown(
      keyEvent('k', { path: [element('div', { 'data-tp-owns-keys': 'j' }), host] }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('applies the consumer ownership hook, disabled predicate and interaction locks', () => {
    let owns = true;
    let disabled = false;
    const target = owner(element(), { ownsKey: () => owns, disabled: () => disabled });
    const { handler } = bind(target, { keys: 'k' });
    target.handleKeyDown(keyEvent('k'));
    owns = false;
    disabled = true;
    target.handleKeyDown(keyEvent('k'));
    disabled = false;
    const release = target.lock();
    target.handleKeyDown(keyEvent('k'));
    expect(target.inert).toBe(true);
    release();
    release();
    expect(target.inert).toBe(false);
    target.handleKeyDown(keyEvent('k'));
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('lets a nested owner with a matching binding claim the key', () => {
    const outerHost = element();
    const innerHost = element();
    const outer = owner(outerHost);
    const inner = owner(innerHost);
    const { handler: outerArrow } = bind(outer, { keys: 'ArrowRight, k' });
    const innerArrow = vi.fn(() => false as const);
    inner.register({ keys: 'ArrowRight', handler: innerArrow });
    const path = [element('span'), innerHost, outerHost];
    // The inner owner declined (e.g. at a boundary) but still owns the key.
    innerHost.dispatchEvent(keyEvent('ArrowRight', { path }));
    outer.handleKeyDown(keyEvent('ArrowRight', { path }));
    expect(innerArrow).toHaveBeenCalledTimes(1);
    expect(outerArrow).not.toHaveBeenCalled();
    outer.handleKeyDown(keyEvent('k', { path }));
    expect(outerArrow).toHaveBeenCalledTimes(1);
    const release = inner.lock();
    outer.handleKeyDown(keyEvent('ArrowRight', { path }));
    expect(outerArrow).toHaveBeenCalledTimes(2);
    release();
    inner.dispose();
    outer.handleKeyDown(keyEvent('ArrowRight', { path }));
    expect(outerArrow).toHaveBeenCalledTimes(3);
  });
});

describe('Document-scope routing', () => {
  function activate(host: FakeElement, type = 'pointerdown') {
    host.dispatchEvent(new Event(type));
  }
  it('routes a document keydown only to the most recently active owner', () => {
    const doc = documentFor();
    const firstHost = element('div', {}, doc);
    const secondHost = element('div', {}, doc);
    const first = owner(firstHost);
    const second = owner(secondHost);
    const { handler: a } = bind(first, { keys: 'k', scope: 'document' });
    const { handler: b } = bind(second, { keys: 'k', scope: 'document' });
    // Before any activity the first registered owner handles.
    doc.dispatchEvent(keyEvent('k', { path: [doc] }));
    expect([a.mock.calls.length, b.mock.calls.length]).toEqual([1, 0]);
    activate(secondHost, 'focusin');
    const event = keyEvent('k', { path: [doc] });
    doc.dispatchEvent(event);
    expect([a.mock.calls.length, b.mock.calls.length]).toEqual([1, 1]);
    expect(event.defaultPrevented).toBe(true);
    activate(firstHost, 'keydown');
    doc.dispatchEvent(keyEvent('k', { path: [doc] }));
    expect([a.mock.calls.length, b.mock.calls.length]).toEqual([2, 1]);
    expect(b.mock.calls[0]![1].scope).toBe('document');
  });
  it('considers only owners with a matching document binding', () => {
    const doc = documentFor();
    const firstHost = element('div', {}, doc);
    const secondHost = element('div', {}, doc);
    const first = owner(firstHost);
    const second = owner(secondHost);
    const { handler: a } = bind(first, { keys: 'k', scope: 'document' });
    bind(second, { keys: 'j', scope: 'document' });
    const { handler: local } = bind(second, { keys: 'k' });
    activate(secondHost);
    doc.dispatchEvent(keyEvent('k', { path: [doc] }));
    expect(a).toHaveBeenCalledTimes(1);
    expect(local).not.toHaveBeenCalled();
  });
  it('does not fall back to an older owner while the most recent owner is inert', () => {
    const doc = documentFor();
    const firstHost = element('div', {}, doc);
    const secondHost = element('div', {}, doc);
    const first = owner(firstHost);
    const second = owner(secondHost);
    const { handler: a } = bind(first, { keys: 'k', scope: 'document' });
    const { handler: b } = bind(second, { keys: 'k', scope: 'document' });
    activate(secondHost);
    const release = second.lock();
    doc.dispatchEvent(keyEvent('k', { path: [doc] }));
    expect([a.mock.calls.length, b.mock.calls.length]).toEqual([0, 0]);
    release();
  });
  it('ignores consumed events and stops listening when no document binding remains', () => {
    const doc = documentFor();
    const add = vi.spyOn(doc, 'addEventListener');
    const remove = vi.spyOn(doc, 'removeEventListener');
    const target = owner(element('div', {}, doc));
    const first = bind(target, { keys: 'k', scope: 'document' });
    const second = bind(target, { keys: 'j', scope: 'document' });
    expect(add).toHaveBeenCalledTimes(1);
    const prevented = keyEvent('k', { path: [doc] });
    prevented.preventDefault();
    doc.dispatchEvent(prevented);
    expect(first.handler).not.toHaveBeenCalled();
    first.release();
    expect(remove).not.toHaveBeenCalled();
    second.release();
    expect(remove).toHaveBeenCalledTimes(1);
    doc.dispatchEvent(keyEvent('j', { path: [doc] }));
    expect(second.handler).not.toHaveBeenCalled();
  });
  it('does not deliver owner-scope events to document bindings', () => {
    const host = element();
    const target = owner(host);
    const { handler } = bind(target, { keys: 'k', scope: 'document' });
    host.dispatchEvent(keyEvent('k', { path: [host] }));
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('Shortcut publication', () => {
  it('publishes ARIA and display forms for an action', () => {
    const target = owner();
    bind(target, { keys: 'Mod+Shift+f', action: 'toggle-fullscreen' });
    expect(target.shortcut('toggle-fullscreen')).toEqual({
      aria: 'Control+Shift+f',
      display: 'Ctrl+Shift+F',
      keys: ['Control', 'Shift', 'F'],
    });
    expect(target.shortcut('missing')).toBeUndefined();
  });
  it('uses macOS Key Hint notation for display and Meta for Mod', () => {
    const target = owner(element(), { platform: 'mac' });
    bind(target, { keys: 'Mod+Shift+f', action: 'toggle-fullscreen' });
    bind(target, { keys: 'Alt+ArrowLeft', action: 'seek' });
    expect(target.shortcut('toggle-fullscreen')).toEqual({
      aria: 'Shift+Meta+f',
      display: '⇧⌘F',
      keys: ['Shift', 'Meta', 'F'],
    });
    expect(target.shortcut('seek')?.display).toBe('⌥←');
  });
  it('detects the platform from the owner window when automatic', () => {
    const target = new KeyBindingOwner(element('div', {}, documentFor('MacIntel')));
    expect(target.platform).toBe('mac');
    bind(target, { keys: 'Mod+k', action: 'search' });
    expect(target.shortcut('search')?.aria).toBe('Meta+k');
  });
  it('lists every enabled binding in ARIA and prefers the latest for display', () => {
    const target = owner();
    bind(target, { keys: 'Space, k', action: 'toggle-paused' });
    bind(target, { keys: 'p', action: 'toggle-paused', disabled: true });
    expect(target.shortcut('toggle-paused')).toEqual({
      aria: 'Space k',
      display: 'Space',
      keys: ['Space'],
    });
    bind(target, { keys: 'ArrowRight', action: 'seek-by', value: 10 });
    bind(target, { keys: 'ArrowLeft', action: 'seek-by', value: -10 });
    expect(target.shortcut('seek-by', -10)?.aria).toBe('ArrowLeft');
    expect(target.shortcut('seek-by')?.aria).toBe('ArrowRight ArrowLeft');
    expect(target.shortcut('seek-by', 10)?.display).toBe('Right arrow');
    bind(target, { keys: '0-9', action: 'seek-to-percent' });
    expect(target.shortcut('seek-to-percent')).toEqual({
      aria: '0 1 2 3 4 5 6 7 8 9',
      display: '0-9',
      keys: ['0-9'],
    });
  });
  it('notifies subscribers and dispatches tp-shortcut-change once per change batch', async () => {
    const host = element();
    const target = owner(host);
    const listener = vi.fn();
    const events: Event[] = [];
    host.addEventListener(TpShortcutChangeEvent.eventName, (event) => events.push(event));
    const unsubscribe = target.subscribe(listener);
    const first = bind(target, { keys: 'k', action: 'a' });
    bind(target, { keys: 'j', action: 'b' });
    await flush();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(target);
    expect(events).toHaveLength(1);
    expect((events[0] as TpShortcutChangeEvent).detail.owner).toBe(target);
    first.release();
    await flush();
    expect(listener).toHaveBeenCalledTimes(2);
    target.refresh();
    unsubscribe();
    await flush();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(events).toHaveLength(3);
  });
  it('can publish to subscribers only', async () => {
    const host = element();
    const target = owner(host, { dispatch: false });
    const dispatch = vi.spyOn(host, 'dispatchEvent');
    const listener = vi.fn();
    target.subscribe(listener);
    bind(target, { keys: 'k' });
    await flush();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();
  });
  it('lists bindings with scope, action and chords', () => {
    const target = owner();
    bind(target, { keys: 'k', action: 'toggle-paused', scope: 'document', value: 'x' });
    expect(target.list()).toEqual([
      {
        action: 'toggle-paused',
        value: 'x',
        scope: 'document',
        chords: [expect.objectContaining({ key: 'k' })],
      },
    ]);
  });
});

describe('Key binding owner lifecycle', () => {
  it('allows one live owner per element and releases everything on dispose', async () => {
    const host = element();
    const remove = vi.spyOn(host, 'removeEventListener');
    const target = owner(host);
    expect(KeyBindingOwner.for(host)).toBe(target);
    expect(() => owner(host)).toThrow(/already has/);
    const listener = vi.fn();
    target.subscribe(listener);
    const { handler } = bind(target, { keys: 'k' });
    target.dispose();
    target.dispose();
    await flush();
    expect(listener).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledTimes(4);
    host.dispatchEvent(keyEvent('k', { path: [host] }));
    expect(handler).not.toHaveBeenCalled();
    expect(target.handleKeyDown(keyEvent('k'))).toBe(false);
    expect(target.register({ keys: 'k', handler })()).toBeUndefined();
    expect(KeyBindingOwner.for(host)).toBeUndefined();
    expect(owner(host)).toBeInstanceOf(KeyBindingOwner);
  });
  it('disposes with an enclosing cleanup scope', () => {
    const host = element();
    const scope = new CleanupScope();
    const target = owner(host, { scope });
    scope.dispose();
    expect(target.disposed).toBe(true);
  });
  it('accepts externally delivered events when not listening', () => {
    const host = element();
    const add = vi.spyOn(host, 'addEventListener');
    const target = owner(host, { listen: false });
    const { handler } = bind(target, { keys: 'k' });
    expect(add.mock.calls.filter(([type, , options]) => type === 'keydown' && !options)).toEqual(
      [],
    );
    host.dispatchEvent(keyEvent('k', { path: [host] }));
    expect(handler).not.toHaveBeenCalled();
    expect(target.handleKeyDown(keyEvent('k'))).toBe(true);
  });
});

describe('Editable navigation ownership', () => {
  it('is the Toolbar caret-edge rule', () => {
    const input = {
      localName: 'input',
      value: 'abc',
      selectionStart: 3,
      selectionEnd: 3,
      readOnly: false,
      disabled: false,
      ownerDocument: { defaultView: { getComputedStyle: () => ({ direction: 'ltr' }) } },
    } as unknown as HTMLElement;
    expect(editableOwnsNavigationKey(keyEvent('ArrowRight'), input)).toBe(false);
    expect(editableOwnsNavigationKey(keyEvent('ArrowLeft'), input)).toBe(true);
    expect(editableOwnsNavigationKey(keyEvent('ArrowLeft'), element('button') as never)).toBe(
      false,
    );
  });
});

describe('Key name aliases', () => {
  it('matches Esc, Return and symbol patterns against the canonical event keys', () => {
    const [esc] = parseKeyPattern('Esc', 'linux');
    expect(esc).toMatchObject({ key: 'escape', label: 'Esc' });
    expect(matchesKeyChord(esc!, keyEvent('Escape'))).toBe(true);
    expect(matchesKeyChord(parseKeyPattern('Return', 'linux')[0]!, keyEvent('Enter'))).toBe(true);
    expect(
      matchesKeyChord(
        parseKeyPattern('Mod+⌫', 'windows')[0]!,
        keyEvent({ key: 'Backspace', ctrlKey: true }),
      ),
    ).toBe(true);
    expect(parseKeyPattern('space', 'linux')[0]).toMatchObject({ key: ' ', label: 'Space' });
  });

  it('fires an owner binding written with an alias', () => {
    const host = element();
    const target = owner(host);
    const { handler } = bind(target, { keys: 'Esc' });
    host.dispatchEvent(keyEvent('Escape', { path: [host] }));
    expect(handler).toHaveBeenCalledOnce();
  });
});
