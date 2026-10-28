import { describe, expect, it } from 'vitest';
import {
  contentStopsActive,
  writeContentTabStop,
  writeTaskCheckboxDisabled,
} from './content-stops.js';

/** An element that records its attribute writes. */
function recorded() {
  const attributes = new Map<string, string>();
  const writes: string[] = [];
  const element = {
    hasAttribute: (name: string) => attributes.has(name),
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => {
      writes.push(`set ${name}=${value}`);
      attributes.set(name, value);
    },
    removeAttribute: (name: string) => {
      writes.push(`remove ${name}`);
      attributes.delete(name);
    },
  };
  return { element: element as unknown as Element, attributes, writes };
}

describe('uwg-te-req-prop-3, node-001228: content stops follow the root’s tab index', () => {
  it('a tab index makes them active, null inactive, and a record without one keeps the answer', () => {
    expect(contentStopsActive({ tabindex: '0' }, false)).toBe(true);
    expect(contentStopsActive({ tabindex: '-1' }, false)).toBe(true);
    expect(contentStopsActive({ tabindex: null }, true)).toBe(false);
    expect(contentStopsActive({ tabIndex: null }, true)).toBe(false);
    expect(contentStopsActive({ TABINDEX: '0' }, false)).toBe(true);
    expect(contentStopsActive({ role: 'textbox' }, true)).toBe(true);
    expect(contentStopsActive({ role: 'textbox' }, false)).toBe(false);
    expect(contentStopsActive({}, false)).toBe(false);
  });

  it('a stop leaves the sequential order with -1 and returns by losing the attribute, written only on a change', () => {
    const { element, attributes, writes } = recorded();
    writeContentTabStop(element, true);
    expect(writes).toEqual([]);
    writeContentTabStop(element, false);
    writeContentTabStop(element, false);
    expect(attributes.get('tabindex')).toBe('-1');
    writeContentTabStop(element, true);
    writeContentTabStop(element, true);
    expect(writes).toEqual(['set tabindex=-1', 'remove tabindex']);
  });

  it('a task checkbox is disabled natively, written only on a change', () => {
    let writes = 0;
    let disabled = false;
    const input = {
      get disabled() {
        return disabled;
      },
      set disabled(value: boolean) {
        writes += 1;
        disabled = value;
      },
    } as unknown as HTMLInputElement;
    writeTaskCheckboxDisabled(input, false);
    writeTaskCheckboxDisabled(input, true);
    writeTaskCheckboxDisabled(input, true);
    expect([input.disabled, writes]).toEqual([true, 1]);
    writeTaskCheckboxDisabled(input, false);
    expect([input.disabled, writes]).toEqual([false, 2]);
  });
});
