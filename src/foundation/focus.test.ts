import { describe, expect, it } from 'vitest';
import {
  composedContains,
  composedParent,
  composedScopeContains,
  focusAfterRemoval,
  focusableElements,
  focusableFrom,
  isAvailable,
  tabbableElements,
  trapTabKey,
} from './focus.js';

describe('composed ancestry', () => {
  it('follows slotted foreign-realm elements without relying on ambient constructors', () => {
    const slot = { nodeType: 1, parentNode: null } as unknown as HTMLSlotElement;
    const element = { nodeType: 1, assignedSlot: slot, parentNode: null } as unknown as Element;
    expect(composedParent(element)).toBe(slot);
    expect(composedContains(slot, element)).toBe(true);
  });

  it('crosses a shadow root while preserving ordinary document fragments', () => {
    const host = { nodeType: 1, parentNode: null } as unknown as Element;
    const shadow = { nodeType: 11, host } as unknown as ShadowRoot;
    const child = { nodeType: 1, parentNode: shadow } as unknown as Element;
    expect(composedParent(child)).toBe(host);
    expect(composedContains(host, child)).toBe(true);
    const fragment = { nodeType: 11, parentNode: null } as unknown as DocumentFragment;
    expect(composedParent({ nodeType: 3, parentNode: fragment } as unknown as Text)).toBe(fragment);
    expect(composedParent(fragment)).toBeNull();
  });
  it('scopes containment to an element or a shadow root without containing its host', () => {
    const host = { nodeType: 1, parentNode: null } as unknown as Element;
    const shadow = { nodeType: 11, host, parentNode: null } as unknown as ShadowRoot;
    const slot = { nodeType: 1, parentNode: shadow } as unknown as HTMLSlotElement;
    const internal = { nodeType: 1, parentNode: shadow } as unknown as Element;
    const slotted = { nodeType: 1, assignedSlot: slot, parentNode: host } as unknown as Element;
    const outside = { nodeType: 1, parentNode: null } as unknown as Element;
    expect(composedScopeContains(shadow, internal)).toBe(true);
    expect(composedScopeContains(shadow, slotted)).toBe(true);
    expect(composedScopeContains(shadow, shadow)).toBe(true);
    expect(composedScopeContains(shadow, host)).toBe(false);
    expect(composedScopeContains(shadow, outside)).toBe(false);
    expect(composedScopeContains(host, slotted)).toBe(true);
    expect(composedScopeContains(host, null)).toBe(false);
  });
});

describe('focus across owner realms', () => {
  function element(tabIndex = 0): HTMLElement {
    return {
      nodeType: 1,
      namespaceURI: 'http://www.w3.org/1999/xhtml',
      localName: 'button',
      isConnected: true,
      tabIndex,
      childNodes: [],
      parentNode: null,
      matches: () => false,
      getClientRects: () => [{}],
      ownerDocument: {
        defaultView: {
          getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
        },
      },
    } as unknown as HTMLElement;
  }

  it('detects hidden and inert composed ancestors without ambient constructors', () => {
    const host = element();
    const child = element();
    Object.assign(host, { matches: () => host.inert || host.hidden === true });
    Object.assign(child, { parentNode: { nodeType: 11, host } });
    expect(isAvailable(child)).toBe(true);
    host.inert = true;
    expect(isAvailable(child)).toBe(false);
    host.inert = false;
    host.hidden = true;
    expect(isAvailable(child)).toBe(false);
  });

  it('accepts inertness a caller attributes to a layer above, and judges attributes only without layout', () => {
    const host = element();
    const child = element();
    Object.assign(host, { matches: (selector: string) => selector === '[inert]' });
    Object.assign(child, { parentNode: { nodeType: 11, host } });
    expect(isAvailable(child)).toBe(false);
    expect(isAvailable(child, false, { ignoreInert: (node) => node === host })).toBe(true);
    Object.assign(host, { matches: () => false });
    Object.assign(child, { getClientRects: () => [] });
    expect(isAvailable(child)).toBe(false);
    expect(isAvailable(child, false, { layout: false })).toBe(true);
  });

  it('does not interpret native form named controls as hidden or inert state', () => {
    const form = element();
    const input = element();
    // HTMLFormElement exposes controls by name ahead of HTMLElement properties.
    Object.assign(form, { hidden: input, inert: input });
    Object.assign(input, { parentNode: form });
    expect(isAvailable(input)).toBe(true);
  });

  it('moves on from the place in the tree of a reference outside the sequence, never from the start', () => {
    // A page control, an editing root, a roving grip (tab index -1) after it, a later control and
    // one of positive tab index, which the sequence visits first.
    const before = element(),
      editing = element(),
      grip = element(-1),
      after = element(),
      positive = element(1);
    const root = { childNodes: [before, editing, grip, after, positive] } as unknown as ParentNode;
    expect(focusableFrom(root, grip, 1)).toEqual([after]);
    expect(focusableFrom(root, grip, -1)).toEqual([editing, before, positive]);
    // A reference in the sequence counts by its own place.
    expect(focusableFrom(root, editing, 1)).toEqual([after]);
    expect(focusableFrom(root, editing, -1)).toEqual([before, positive]);
    // Without a reference, the sequence from its start.
    expect(focusableFrom(root, null, 1)).toEqual([positive, before, editing, after]);
    // The last control in the tree has nothing after it.
    const last = element(-1);
    const tail = { childNodes: [before, last] } as unknown as ParentNode;
    expect(focusableFrom(tail, last, 1)).toEqual([]);
  });

  it('visits distributed children and sorts positive tab order before zero', () => {
    const regular = element(),
      positive = element(2),
      disabled = element();
    Object.assign(disabled, { matches: () => true });
    const slot = element(-1);
    Object.assign(slot, {
      localName: 'slot',
      assignedNodes: () => [regular, positive, disabled],
    });
    const root = { childNodes: [slot] } as unknown as ParentNode;
    expect(focusableElements(root)).toEqual([positive, regular]);
  });

  it('keeps a control focusable while disabled in the Tab sequence that a trap wraps, as the browser does, and leaves a natively disabled one out', () => {
    const first = element(),
      focusableDisabled = element(),
      nativeDisabled = element();
    // `aria-disabled="true"`: unavailable to activation, still reached by Tab.
    Object.assign(focusableDisabled, {
      matches: (selector: string) => selector === '[disabled], [aria-disabled="true"]',
    });
    Object.assign(nativeDisabled, {
      matches: (selector: string) =>
        selector === '[disabled], [aria-disabled="true"]' || selector.includes(':disabled'),
    });
    const document = { activeElement: first as Element | null };
    const root = {
      childNodes: [first, focusableDisabled, nativeDisabled],
      ownerDocument: document,
    } as unknown as ParentNode;
    expect(tabbableElements(root)).toEqual([first, focusableDisabled]);
    expect(focusableElements(root)).toEqual([first]);
    const tab = (shiftKey: boolean) => {
      const event = {
        key: 'Tab',
        shiftKey,
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
      };
      trapTabKey(event as unknown as KeyboardEvent, root);
      return event.defaultPrevented;
    };
    // Tab from the first stop goes on natively to the control focusable while disabled.
    expect(tab(false)).toBe(false);
    // Shift+Tab from the first stop wraps to the last one, that control.
    let focused: unknown = null;
    Object.assign(focusableDisabled, { focus: () => (focused = focusableDisabled) });
    expect(tab(true)).toBe(true);
    expect(focused).toBe(focusableDisabled);
  });
});

describe('focus after removal', () => {
  function target(): HTMLElement & { focused: FocusOptions[] } {
    const element = { focused: [] as FocusOptions[] } as HTMLElement & { focused: FocusOptions[] };
    element.focus = (options?: FocusOptions) => {
      element.focused.push(options ?? {});
    };
    return element;
  }

  it('focuses the entry that took the removed index', () => {
    const [a, b, c] = [target(), target(), target()];
    const fallback = target();
    focusAfterRemoval([a, b, c], 1, fallback);
    expect(b.focused).toEqual([{ preventScroll: true }]);
    expect([a, c, fallback].flatMap((entry) => entry.focused)).toEqual([]);
  });

  it('falls back to the last entry when the removed one was last', () => {
    const [a, b] = [target(), target()];
    focusAfterRemoval([a, b], 2, target());
    expect(b.focused).toHaveLength(1);
    expect(a.focused).toHaveLength(0);
  });

  it('focuses the owner once nothing remains, and tolerates a missing owner', () => {
    const fallback = target();
    focusAfterRemoval([], 0, fallback, { preventScroll: false });
    expect(fallback.focused).toEqual([{ preventScroll: false }]);
    expect(() => focusAfterRemoval([], 3, null)).not.toThrow();
  });
});
