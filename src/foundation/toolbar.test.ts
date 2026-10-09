import { keyEvent } from './fakes.test.js';
import { describe, expect, it } from 'vitest';
import { toolbarInputOwnsKey } from './toolbar.js';
import { CollectionRegistry } from './collection.js';

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
