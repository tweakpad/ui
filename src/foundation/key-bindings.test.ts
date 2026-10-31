import { keyEvent, type KeyEventInit } from './fakes.test.js';
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
import type { ResolvedKbdPlatform } from './key-notation.js';
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
/** Whether the first chord of `pattern`, parsed for `platform`, matches `event` there. */
function matches(pattern: string, platform: ResolvedKbdPlatform, event: KeyboardEvent) {
  return matchesKeyChord(parseKeyPattern(pattern, platform)[0]!, event, platform);
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
    expect(matchesKeyChord(ctrlF!, keyEvent({ key: 'F', ctrlKey: true }), 'linux')).toBe(true);
    expect(matchesKeyChord(ctrlF!, keyEvent({ key: 'f' }), 'linux')).toBe(false);
    expect(
      matchesKeyChord(ctrlF!, keyEvent({ key: 'f', ctrlKey: true, shiftKey: true }), 'linux'),
    ).toBe(false);
    expect(
      matchesKeyChord(ctrlF!, keyEvent({ key: 'f', ctrlKey: true, metaKey: true }), 'linux'),
    ).toBe(false);
  });
  it('implies Shift and Alt for caseless symbols but not for letters', () => {
    const [greater] = parseKeyPattern('>', 'linux');
    expect(matchesKeyChord(greater!, keyEvent({ key: '>', shiftKey: true }), 'linux')).toBe(true);
    expect(
      matchesKeyChord(greater!, keyEvent({ key: '>', shiftKey: true, altKey: true }), 'linux'),
    ).toBe(true);
    expect(matchesKeyChord(greater!, keyEvent({ key: '>', ctrlKey: true }), 'linux')).toBe(false);
    const [question] = parseKeyPattern('Shift+?', 'linux');
    expect(matchesKeyChord(question!, keyEvent({ key: '?' }), 'linux')).toBe(false);
    expect(matchesKeyChord(question!, keyEvent({ key: '?', shiftKey: true }), 'linux')).toBe(true);
    const [k] = parseKeyPattern('k', 'linux');
    expect(matchesKeyChord(k!, keyEvent({ key: 'K', shiftKey: true }), 'linux')).toBe(false);
    const [space] = parseKeyPattern('Space', 'linux');
    expect(matchesKeyChord(space!, keyEvent({ key: ' ', shiftKey: true }), 'linux')).toBe(false);
  });
  it('matches a Shift chord on a digit by the physical key, whatever character it types', () => {
    const [shiftOne] = parseKeyPattern('Shift+1', 'linux');
    expect(
      matchesKeyChord(shiftOne!, keyEvent({ key: '!', code: 'Digit1', shiftKey: true }), 'linux'),
    ).toBe(true);
    expect(
      matchesKeyChord(shiftOne!, keyEvent({ key: '1', code: 'Digit1', shiftKey: true }), 'linux'),
    ).toBe(true);
    expect(matchesKeyChord(shiftOne!, keyEvent({ key: '1', code: 'Digit1' }), 'linux')).toBe(false);
    expect(
      matchesKeyChord(shiftOne!, keyEvent({ key: '!', code: 'Digit2', shiftKey: true }), 'linux'),
    ).toBe(false);
    const [one] = parseKeyPattern('1', 'linux');
    expect(
      matchesKeyChord(one!, keyEvent({ key: '!', code: 'Digit1', shiftKey: true }), 'linux'),
    ).toBe(false);
  });
  it('never matches Unidentified (IME) keys', () => {
    const [unidentified] = parseKeyPattern('Unidentified', 'linux');
    expect(matchesKeyChord(unidentified!, keyEvent('Unidentified'), 'linux')).toBe(false);
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

describe('Key chord matching across keyboard layouts', () => {
  const option = { metaKey: true, altKey: true };
  const controlAlt = { ctrlKey: true, altKey: true };

  it('matches an Alt chord by its physical letter or digit key on Apple platforms (mp-kb-pattern)', () => {
    expect(matches('Mod+Alt+0', 'mac', keyEvent({ key: 'º', code: 'Digit0', ...option }))).toBe(
      true,
    );
    expect(matches('Mod+Alt+1', 'mac', keyEvent({ key: '¡', code: 'Digit1', ...option }))).toBe(
      true,
    );
    expect(matches('Mod+Alt+C', 'mac', keyEvent({ key: 'ç', code: 'KeyC', ...option }))).toBe(true);
    expect(
      matches(
        'Mod+Alt+Shift+C',
        'mac',
        keyEvent({ key: 'Ç', code: 'KeyC', shiftKey: true, ...option }),
      ),
    ).toBe(true);
    expect(matches('Alt+k', 'mac', keyEvent({ key: '˚', code: 'KeyK', altKey: true }))).toBe(true);
    expect(matches('Mod+Alt+E', 'mac', keyEvent({ key: 'Dead', code: 'KeyE', ...option }))).toBe(
      true,
    );
  });

  it('keeps the physical Alt match to Apple platforms and to Alt chords (mp-kb-pattern)', () => {
    for (const platform of ['windows', 'linux'] as const) {
      const cases: [string, KeyEventInit][] = [
        ['Mod+Alt+0', { key: 'º', code: 'Digit0', ...controlAlt }],
        ['Mod+Alt+1', { key: '¡', code: 'Digit1', ...controlAlt }],
        ['Mod+Alt+C', { key: 'ç', code: 'KeyC', ...controlAlt }],
        ['Mod+Alt+Shift+C', { key: 'Ç', code: 'KeyC', shiftKey: true, ...controlAlt }],
        ['Alt+k', { key: '˚', code: 'KeyK', altKey: true }],
        ['Mod+Alt+E', { key: 'Dead', code: 'KeyE', ...controlAlt }],
      ];
      for (const [pattern, init] of cases)
        expect(matches(pattern, platform, keyEvent(init)), `${pattern} on ${platform}`).toBe(false);
    }
    // A chord without Alt, another digit key, or a key with no letter or digit position.
    expect(matches('Mod+k', 'mac', keyEvent({ key: '˚', code: 'KeyK', ...option }))).toBe(false);
    expect(matches('Mod+Alt+1', 'mac', keyEvent({ key: '¡', code: 'Digit2', ...option }))).toBe(
      false,
    );
    expect(matches('Mod+Alt+[', 'mac', keyEvent({ key: '“', ...option }))).toBe(false);
    // A physical match compares every modifier exactly: Shift is not implied.
    expect(
      matches(
        'Mod+Alt+1',
        'mac',
        keyEvent({ key: '⁄', code: 'Digit1', shiftKey: true, ...option }),
      ),
    ).toBe(false);
    expect(matches('Mod+Alt+C', 'mac', keyEvent({ key: 'ç', code: 'KeyC', ...option }))).toBe(true);
  });

  it('matches no Mod chord without Alt while AltGraph is active (mp-kb-pattern, uwg-te-req-key-2)', () => {
    const cases: [string, ResolvedKbdPlatform, KeyEventInit][] = [
      ['Mod+]', 'windows', { key: ']', code: 'Digit9', ...controlAlt }],
      ['Mod+[', 'windows', { key: '[', code: 'Digit8', ...controlAlt }],
      ['Mod+\\', 'windows', { key: '\\', code: 'Minus', ...controlAlt }],
      ['Mod+Shift+8', 'windows', { key: '*', code: 'Digit8', shiftKey: true, ...controlAlt }],
      ['Mod+]', 'linux', { key: ']', code: 'Digit9', ctrlKey: true }],
    ];
    for (const [pattern, platform, init] of cases) {
      const label = `${pattern} on ${platform}`;
      expect(matches(pattern, platform, keyEvent(init, { altGraph: true })), label).toBe(false);
      expect(matches(pattern, platform, keyEvent(init, { altGraph: false })), label).toBe(true);
      expect(matches(pattern, platform, keyEvent(init)), label).toBe(true);
    }
  });

  it('still matches Mod+Alt chords while AltGraph is active (mp-kb-pattern, uwg-te-req-key-2)', () => {
    for (const active of [true, false]) {
      // Option, reported as AltGraph on Apple platforms.
      const digit = keyEvent({ key: '¡', code: 'Digit1', ...option }, { altGraph: active });
      expect(matches('Mod+Alt+1', 'mac', digit)).toBe(true);
      const letter = keyEvent({ key: 'ç', code: 'KeyC', ...option }, { altGraph: active });
      expect(matches('Mod+Alt+C', 'mac', letter)).toBe(true);
      // Control+Alt, reported as AltGraph on Windows.
      const typed = keyEvent({ key: '1', code: 'Digit1', ...controlAlt }, { altGraph: active });
      expect(matches('Mod+Alt+1', 'windows', typed)).toBe(true);
      // An AltGr bracket has no physical digit match off Apple platforms.
      const bracket = keyEvent({ key: '[', code: 'Digit8', ...controlAlt }, { altGraph: active });
      expect(matches('Mod+Alt+8', 'windows', bracket)).toBe(false);
    }
  });

  it('the owner matches with its resolved platform (mp-kb-pattern)', () => {
    const apple = owner(element(), { platform: 'mac' });
    const { handler: heading } = bind(apple, { keys: 'Mod+Alt+1' });
    const optionDigit = keyEvent({ key: '¡', code: 'Digit1', ...option });
    expect(apple.handleKeyDown(optionDigit)).toBe(true);
    expect(heading).toHaveBeenCalledTimes(1);
    expect(optionDigit.defaultPrevented).toBe(true);

    const windows = owner();
    const { handler: indent } = bind(windows, { keys: 'Mod+]' });
    const bracket = { key: ']', code: 'Digit9', ...controlAlt };
    const typed = keyEvent(bracket, { altGraph: true });
    expect(windows.hasMatchingBinding(typed, 'owner')).toBe(false);
    expect(windows.handleKeyDown(typed)).toBe(false);
    expect(indent).not.toHaveBeenCalled();
    expect(typed.defaultPrevented).toBe(false);
    expect(windows.handleKeyDown(keyEvent(bracket, { altGraph: false }))).toBe(true);
    expect(indent).toHaveBeenCalledTimes(1);

    const doc = documentFor('Win32');
    const routed = new KeyBindingOwner(element('div', {}, doc));
    expect(routed.platform).toBe('windows');
    const { handler: outdent } = bind(routed, { keys: 'Mod+]', scope: 'document' });
    const typedInDocument = keyEvent(bracket, { altGraph: true, path: [doc] });
    doc.dispatchEvent(typedInDocument);
    expect(outdent).not.toHaveBeenCalled();
    expect(typedInDocument.defaultPrevented).toBe(false);
    doc.dispatchEvent(keyEvent(bracket, { altGraph: false, path: [doc] }));
    expect(outdent).toHaveBeenCalledTimes(1);
    routed.dispose();
  });

  it('prefers the chord with more modifiers for a slash typed with Shift+7 (mp-kb-pattern)', () => {
    const target = owner();
    const calls: string[] = [];
    target.register({ keys: 'Mod+/', handler: () => void calls.push('slash') });
    target.register({ keys: 'Mod+Shift+7', handler: () => void calls.push('digit') });
    const slash = keyEvent({ key: '/', code: 'Digit7', shiftKey: true, ctrlKey: true });
    expect(matches('Mod+/', 'windows', slash)).toBe(true);
    expect(matches('Mod+Shift+7', 'windows', slash)).toBe(true);
    expect(target.handleKeyDown(slash)).toBe(true);
    expect(calls).toEqual(['digit']);
  });

  it('matches nothing on a bare modifier keydown (mp-kb-pattern)', () => {
    const modifiers: KeyEventInit[] = [
      { key: 'Meta', code: 'MetaLeft', metaKey: true },
      { key: 'Shift', code: 'ShiftLeft', shiftKey: true },
      { key: 'Alt', code: 'AltLeft', altKey: true },
      { key: 'Control', code: 'ControlLeft', ctrlKey: true },
      { key: 'AltGraph', code: 'AltRight', ...controlAlt },
    ];
    for (const platform of ['mac', 'windows'] as const) {
      const target = owner(element(), { platform });
      const handler = vi.fn();
      for (const keys of ['Mod+Alt+1', 'Alt+k', 'Shift+1', 'Mod+]', '>'])
        target.register({ keys, handler });
      for (const init of modifiers)
        for (const active of [true, false]) {
          const event = keyEvent(init, { altGraph: active });
          expect(target.handleKeyDown(event), `${init.key} on ${platform}`).toBe(false);
          expect(event.defaultPrevented).toBe(false);
        }
      expect(handler).not.toHaveBeenCalled();
    }
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
  it('uses macOS Kbd notation for display and Meta for Mod', () => {
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
  it('publishes Windows display and ARIA forms (mp-kb-publish)', () => {
    const target = owner();
    bind(target, { keys: 'Mod+b', action: 'bold' });
    bind(target, { keys: 'Mod+Alt+1', action: 'heading' });
    bind(target, { keys: 'Mod+Shift+8', action: 'list' });
    bind(target, { keys: 'Mod+Shift+z, Mod+y', action: 'redo' });
    expect(target.shortcut('bold')?.display).toBe('Ctrl+B');
    expect(target.shortcut('heading')?.display).toBe('Ctrl+Alt+1');
    expect(target.shortcut('list')?.display).toBe('Ctrl+Shift+8');
    expect(target.shortcut('redo')).toEqual({
      aria: 'Control+Shift+z Control+y',
      display: 'Ctrl+Shift+Z',
      keys: ['Control', 'Shift', 'Z'],
    });
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
    expect(matchesKeyChord(esc!, keyEvent('Escape'), 'linux')).toBe(true);
    expect(
      matchesKeyChord(parseKeyPattern('Return', 'linux')[0]!, keyEvent('Enter'), 'linux'),
    ).toBe(true);
    expect(
      matchesKeyChord(
        parseKeyPattern('Mod+⌫', 'windows')[0]!,
        keyEvent({ key: 'Backspace', ctrlKey: true }),
        'windows',
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

describe('Platform-scoped patterns', () => {
  const redo = ['Mod+Shift+Z', { pattern: 'Ctrl+Y', platforms: ['windows', 'linux'] }] as const;

  it('binds a scoped pattern on its platforms only, by the owner platform', () => {
    for (const platform of ['windows', 'linux'] as const) {
      const target = owner(element(), { platform });
      target.register({ keys: redo, action: 'redo', handler: () => true });
      expect(target.list()[0]!.chords.map((chord) => chord.pattern)).toEqual([
        'Mod+Shift+Z',
        'Ctrl+Y',
      ]);
      expect(target.shortcut('redo')?.aria).toBe('Control+Shift+Z Control+Y');
    }
    const mac = owner(element(), { platform: 'mac' });
    mac.register({ keys: redo, action: 'redo', handler: () => true });
    expect(mac.list()[0]!.chords.map((chord) => chord.pattern)).toEqual(['Mod+Shift+Z']);
    expect(mac.shortcut('redo')?.aria).toBe('Shift+Meta+Z');
  });

  it('publishes no shortcut for a binding whose patterns all belong elsewhere', () => {
    const target = owner(element(), { platform: 'mac' });
    target.register({
      keys: { pattern: 'Ctrl+Y', platforms: ['windows'] },
      action: 'redo',
      handler: () => true,
    });
    expect(target.list()[0]!.chords).toEqual([]);
    expect(target.shortcut('redo')).toBeUndefined();
  });
});
