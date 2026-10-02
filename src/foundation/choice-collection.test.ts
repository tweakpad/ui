import { describe, expect, it, vi } from 'vitest';
import { ChoiceCollectionController } from './choice-collection.js';

describe('shared finite choice collection', () => {
  it('preserves highlighted identity across source reorder/removal and excludes duplicates', () => {
    const diagnostic = vi.fn();
    const owner = new ChoiceCollectionController<string>({ diagnostic });
    owner.setSource([
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
      { value: 'a', label: 'Duplicate' },
    ]);
    owner.openAt(['b']);
    owner.setSource([
      { value: 'b', label: 'New beta' },
      { value: 'a', label: 'Alpha' },
    ]);
    expect(owner.activeIndex).toBe(0);
    expect(owner.highlighted?.label).toBe('New beta');
    owner.setSource([{ value: 'a', label: 'Alpha' }]);
    expect(owner.highlighted?.value).toBe('a');
    expect(diagnostic).toHaveBeenCalledOnce();
  });
  it('shares filtering, disabled traversal and typeahead without mutating the source', () => {
    const owner = new ChoiceCollectionController<string>();
    owner.setSource([
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta', disabled: true },
      { value: 'c', label: 'Cherry' },
    ]);
    owner.openAt([]);
    expect(owner.move(1)?.value).toBe('c');
    expect(owner.move(1, false)?.value).toBe('c');
    expect(owner.search('a')?.value).toBe('a');
    owner.setFilter((item) => item.value !== 'a');
    expect(owner.source).toHaveLength(3);
    expect(owner.visible).toHaveLength(2);
    expect(owner.highlighted?.value).toBe('c');
    owner.disconnect();
  });
  it('clears the shared typing session on every surface opening', () => {
    const owner = new ChoiceCollectionController<string>();
    owner.setSource([
      { value: 'a', label: 'Apple' },
      { value: 'b', label: 'Banana' },
    ]);
    expect(owner.search('a')?.value).toBe('a');
    expect(owner.typeahead.typing).toBe(true);
    owner.openAt([]);
    expect(owner.typeahead.typing).toBe(false);
    expect(owner.search('b')?.value).toBe('b');
    owner.disconnect();
  });
  it('uses consumer identity for labels and ordered unique multiple selection', () => {
    const owner = new ChoiceCollectionController<{ id: number }>({
      equals: (a, b) => a.id === b.id,
    });
    owner.setSource([{ value: { id: 1 }, label: 'One' }]);
    expect(owner.selected({ id: 1 })?.label).toBe('One');
    expect(owner.normalize([{ id: 1 }, { id: 1 }, { id: 2 }])).toEqual([{ id: 1 }, { id: 2 }]);
    expect(owner.toggle([{ id: 2 }, { id: 1 }], { id: 2 })).toEqual([{ id: 1 }]);
  });
});
