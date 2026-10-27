import { describe, expect, it, vi } from 'vitest';
import { flush } from '../../../foundation/text-editor/text-editor-fakes.test.js';
import {
  cyclesContextualControls,
  endsTableControls,
  TABLE_CONTROLS_ORDER,
  TextEditorTableControls,
  type TableControlsChrome,
} from './table-controls.js';

function key(name: string, init: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return Object.assign(new Event('keydown', { cancelable: true }), {
    key: name,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...init,
  }) as unknown as KeyboardEvent;
}

function setup(applicable = true) {
  const start = { focus: vi.fn() } as unknown as HTMLElement;
  const inside = {} as Node;
  let active: unknown = null;
  const chrome: TableControlsChrome = {
    session: false,
    sessionStart: () => start,
    reveal: vi.fn(),
    contains: (node) => node === inside || node === start,
    keyHandler: null,
    focusOutHandler: null,
  };
  const document = {};
  Object.defineProperty(document, 'activeElement', { get: () => active });
  const host = {
    element: { ownerDocument: document } as unknown as HTMLElement,
    chrome,
    applicable: () => applicable,
    focusEditing: vi.fn(),
    cycle: vi.fn(),
    rendered: () => Promise.resolve(),
  };
  const controls = new TextEditorTableControls(host);
  return {
    controls,
    chrome,
    host,
    start,
    inside,
    focus: (node: unknown) => {
      active = node;
    },
  };
}

describe('table-controls keys', () => {
  it('tells Escape and Alt+F10 apart from other keys', () => {
    expect(endsTableControls(key('Escape'))).toBe(true);
    expect(endsTableControls(key('Escape', { ctrlKey: true }))).toBe(false);
    expect(cyclesContextualControls(key('F10', { altKey: true }))).toBe(true);
    expect(cyclesContextualControls(key('F10'))).toBe(false);
  });
});

describe('TextEditorTableControls', () => {
  it('comes after the selection toolbar and before the gutter in the Alt+F10 cycle', () => {
    expect(setup().controls.order).toBe(TABLE_CONTROLS_ORDER);
  });

  it('starts the session, gives the controls tab stops and focuses the start control once rendered, with its focus indicator', async () => {
    const { controls, chrome, start } = setup();
    expect(controls.enter()).toBe(true);
    expect(chrome.session).toBe(true);
    await flush();
    expect(chrome.reveal).toHaveBeenCalledWith(start);
    // Alt+F10 after a pointer press: the browser does not count the chord as keyboard input.
    expect(start.focus).toHaveBeenCalledWith({ preventScroll: true, focusVisible: true });
  });

  it('does not start where it does not apply', () => {
    const { controls, chrome } = setup(false);
    expect(controls.enter()).toBe(false);
    expect(chrome.session).toBe(false);
  });

  it('Escape returns to the editing root with its selection and ends the session', () => {
    const { controls, chrome, host } = setup();
    controls.enter();
    const escape = key('Escape');
    chrome.keyHandler!(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(host.focusEditing).toHaveBeenCalled();
    expect(chrome.session).toBe(false);
  });

  it('Alt+F10 on a control moves on to the next contextual controls', () => {
    const { controls, chrome, host } = setup();
    controls.enter();
    chrome.keyHandler!(key('F10', { altKey: true }));
    expect(host.cycle).toHaveBeenCalled();
  });

  it('ends when focus leaves the chrome, with no trap, and holds focus only inside it', () => {
    const { controls, chrome, inside, focus } = setup();
    controls.enter();
    focus(inside);
    expect(controls.holdsFocus()).toBe(true);
    chrome.focusOutHandler!({ relatedTarget: inside } as unknown as FocusEvent);
    expect(controls.active).toBe(true);
    chrome.focusOutHandler!({ relatedTarget: null } as unknown as FocusEvent);
    expect(controls.active).toBe(false);
    expect(chrome.session).toBe(false);
    expect(controls.holdsFocus()).toBe(false);
  });

  it('a session ended before rendering takes no focus', async () => {
    const { controls, start } = setup();
    controls.enter();
    controls.leave();
    await flush();
    expect(start.focus).not.toHaveBeenCalled();
  });
});
