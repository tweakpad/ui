import { describe, expect, it } from 'vitest';
import { CollectionRegistry, arrowKeys, navigationKeyPreempted, stepIndex } from './collection.js';
import { preventComponentHandling } from './part.js';

describe('index stepping', () => {
  it('wraps past either end when looping', () => {
    expect(stepIndex(2, 1, 3, true)).toBe(0);
    expect(stepIndex(0, -1, 3, true)).toBe(2);
    expect(stepIndex(1, 1, 3, true)).toBe(2);
    expect(stepIndex(0, -5, 3, true)).toBe(1);
  });

  it('holds at the ends otherwise', () => {
    expect(stepIndex(2, 1, 3, false)).toBe(2);
    expect(stepIndex(0, -1, 3, false)).toBe(0);
    expect(stepIndex(1, 1, 3, false)).toBe(2);
    expect(stepIndex(0, 7, 3, false)).toBe(2);
  });

  it('has no index in an empty list', () => {
    expect(stepIndex(0, 1, 0, true)).toBe(-1);
    expect(stepIndex(0, 1, 0, false)).toBe(-1);
  });
});

describe('arrow keys', () => {
  it('maps the inline axis by writing direction and the block axis to up and down', () => {
    expect(arrowKeys('horizontal', 'ltr')).toEqual({ previous: 'ArrowLeft', next: 'ArrowRight' });
    expect(arrowKeys('horizontal', 'rtl')).toEqual({ previous: 'ArrowRight', next: 'ArrowLeft' });
    expect(arrowKeys('vertical', 'ltr')).toEqual({ previous: 'ArrowUp', next: 'ArrowDown' });
    expect(arrowKeys('vertical', 'rtl')).toEqual({ previous: 'ArrowUp', next: 'ArrowDown' });
  });
});

interface FakeElement extends HTMLElement {
  focused: number;
  order: number;
}

function element(order: number, disabled = false): FakeElement {
  const fake = {
    focused: 0,
    order,
    hasAttribute: (name: string) => name === 'disabled' && disabled,
    matches: (selector: string) => selector === ':disabled' && disabled,
    focus() {
      fake.focused++;
    },
  };
  return fake as unknown as FakeElement;
}

function key(name: string, init: Partial<KeyboardEvent> = {}): KeyboardEvent {
  let prevented = false;
  return {
    key: name,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    isComposing: false,
    ...init,
    get defaultPrevented() {
      return prevented || init.defaultPrevented === true;
    },
    preventDefault() {
      prevented = true;
    },
  } as unknown as KeyboardEvent;
}

describe('navigation key preemption', () => {
  it('leaves consumed, composing and modified keys alone', () => {
    expect(navigationKeyPreempted(key('ArrowRight'))).toBe(false);
    expect(navigationKeyPreempted(key('ArrowRight', { shiftKey: true }))).toBe(false);
    expect(navigationKeyPreempted(key('ArrowRight', { defaultPrevented: true }))).toBe(true);
    expect(navigationKeyPreempted(key('ArrowRight', { isComposing: true }))).toBe(true);
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey'] as const)
      expect(navigationKeyPreempted(key('ArrowRight', { [modifier]: true }))).toBe(true);
    const handled = key('ArrowRight');
    preventComponentHandling(handled);
    expect(navigationKeyPreempted(handled)).toBe(true);
  });
});

describe('collection arrow keys', () => {
  function registry(): { registry: CollectionRegistry; items: FakeElement[] } {
    const items = [element(1), element(2, true), element(3)];
    const collection = new CollectionRegistry();
    for (const item of items) {
      collection.register({ element: item, order: () => item.order });
    }
    return { registry: collection, items };
  }

  it('moves focus along the orientation, skipping disabled items, and consumes the key', () => {
    const { registry: collection, items } = registry();
    const event = key('ArrowRight');
    expect(collection.handleArrowKey(event, items[0]!, 'horizontal', 'ltr')).toBe(items[2]);
    expect(items[2]!.focused).toBe(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('mirrors the inline axis in right-to-left writing', () => {
    const { registry: collection, items } = registry();
    expect(collection.handleArrowKey(key('ArrowLeft'), items[0]!, 'horizontal', 'rtl')).toBe(
      items[2],
    );
    expect(collection.handleArrowKey(key('ArrowRight'), items[2]!, 'horizontal', 'rtl')).toBe(
      items[0],
    );
  });

  it('ignores keys the browser or a consumer already owns', () => {
    const { registry: collection, items } = registry();
    for (const event of [
      key('ArrowRight', { altKey: true }),
      key('ArrowRight', { ctrlKey: true }),
      key('ArrowRight', { metaKey: true }),
      key('ArrowRight', { defaultPrevented: true }),
      key('Home', { ctrlKey: true }),
    ]) {
      expect(collection.handleArrowKey(event, items[0]!, 'horizontal', 'ltr')).toBe(null);
      expect(items[2]!.focused).toBe(0);
    }
  });
});
