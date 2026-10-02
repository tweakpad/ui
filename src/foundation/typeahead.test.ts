import { afterEach, describe, expect, it, vi } from 'vitest';
import { TypeaheadController } from './typeahead.js';
afterEach(() => vi.useRealTimers());
describe('shared typeahead locale and lifecycle', () => {
  it('cycles repeated exact keys only when no non-null label starts with doubled characters', () => {
    vi.useFakeTimers();
    const owner = new TypeaheadController();
    const items = [
      { value: 'a', label: 'Apple' },
      { value: 'b', label: 'Apricot', disabled: true },
      { value: 'c', label: 'Avocado' },
      { value: 'n', label: null },
    ];
    expect(owner.search(items, 'a')).toBe(0);
    expect(owner.search(items, 'a', 0)).toBe(2);
    owner.reset();
    expect(vi.getTimerCount()).toBe(0);
    const doubled = [
      { value: 'a', label: 'Apple' },
      { value: 'b', label: 'Aaron' },
    ];
    expect(owner.search(doubled, 'a')).toBe(0);
    expect(owner.search(doubled, 'a', 0)).toBe(1);
    expect(owner.search(doubled, 'r', 1)).toBe(1);
  });
  it('uses locale lower-case prefix without erasing accents and reads current locale', () => {
    vi.useFakeTimers();
    let locale = 'fr';
    const owner = new TypeaheadController(undefined, () => locale);
    expect(owner.search([{ value: 'e', label: 'Éclair' }], 'e')).toBe(-1);
    expect(owner.search([{ value: 'e', label: 'Éclair' }], 'é')).toBe(0);
    owner.reset();
    locale = 'tr';
    const items = [
      { value: 'i', label: 'İzmir' },
      { value: 'ı', label: 'Isparta' },
    ];
    expect(owner.search(items, 'i')).toBe(0);
    owner.reset();
    expect(owner.search(items, 'ı')).toBe(1);
  });
  it('clears unmatched non-space input immediately and expires at exactly 750 ms', () => {
    vi.useFakeTimers();
    const owner = new TypeaheadController(undefined, () => 'bad_locale');
    const items = [
      { value: 'a', label: 'Apple' },
      { value: 'b', label: 'Berry' },
    ];
    expect(owner.search(items, 'a')).toBe(0);
    expect(owner.search(items, 'b')).toBe(-1);
    expect(owner.typing).toBe(false);
    expect(owner.search(items, 'b')).toBe(1);
    vi.advanceTimersByTime(749);
    expect(owner.typing).toBe(true);
    vi.advanceTimersByTime(1);
    expect(owner.typing).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('appends exact keys including spaces and keeps the starting cursor while refining', () => {
    vi.useFakeTimers();
    const owner = new TypeaheadController();
    const items = [
      { value: 'a', label: 'New York' },
      { value: 'b', label: 'New Jersey' },
    ];
    expect(owner.search(items, 'N')).toBe(0);
    expect(owner.search(items, 'e', 0)).toBe(0);
    expect(owner.search(items, 'w', 0)).toBe(0);
    expect(owner.search(items, ' ', 0)).toBe(0);
    expect(owner.search(items, 'J', 0)).toBe(1);
    owner.reset();
    expect(owner.search(items, 'J')).toBe(-1);
  });
});
