import { describe, expect, it } from 'vitest';
import { composedContains, composedParent, focusableElements, isAvailable } from './focus.js';

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
    Object.assign(child, { parentNode: { nodeType: 11, host } });
    expect(isAvailable(child)).toBe(true);
    host.inert = true;
    expect(isAvailable(child)).toBe(false);
    host.inert = false;
    host.hidden = true;
    expect(isAvailable(child)).toBe(false);
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
});
