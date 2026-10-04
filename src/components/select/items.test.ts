import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { createSelectItems } from './items.js';
import { createSelectFilter } from './filter.js';

describe('Select source and filter policies', () => {
  it('indexes lazily, ignores holes, retains first duplicate and owned identity', () => {
    const first = { id: 1, title: 'First' },
      duplicate = { id: 1, title: 'Duplicate' };
    const getValue = vi.fn((item: typeof first) => item.id);
    const getLabel = vi.fn((item: typeof first) => item.title);
    const diagnostic = vi.fn();
    const collection = createSelectItems(
      [{ label: 'Group', items: [null, first, undefined, duplicate] }],
      { getValue, getLabel, diagnostic },
    );
    expect(getValue).not.toHaveBeenCalled();
    expect(getLabel).not.toHaveBeenCalled();
    expect(collection.label(1)).toBe('First');
    expect(getValue).toHaveBeenCalledTimes(2);
    expect(getLabel).toHaveBeenCalledWith(first);
    expect(collection.label(2, Object.is, (value) => `Unknown ${value}`)).toBe('Unknown 2');
    expect(getValue).toHaveBeenCalledTimes(2);
    expect(diagnostic).toHaveBeenCalledOnce();
  });
  it('preserves absent loading data and rejects ambiguous nested leaf groups and invalid values', () => {
    const empty = createSelectItems(undefined, {
      getValue: (item: number) => item,
      getLabel: String,
    });
    expect(empty.data).toBeUndefined();
    expect(empty.hasValue(2)).toBe(false);
    const ambiguous = createSelectItems([{ items: [{ items: ['ambiguous'] }] }] as never, {
      getValue: String,
      getLabel: String,
    });
    expect(() => ambiguous.label('anything')).toThrow('leaf items');
    const invalid = createSelectItems([1], {
      getValue: () => null as unknown as number,
      getLabel: String,
    });
    expect(() => invalid.hasValue(1)).toThrow('primitive');
  });
  it('keeps numeric identifiers under Object.is, including distinct zero signs', () => {
    const collection = createSelectItems(
      [
        { id: 0, label: 'Positive zero' },
        { id: -0, label: 'Negative zero' },
        { id: NaN, label: 'Not a number' },
      ],
      { getValue: (item) => item.id, getLabel: (item) => item.label },
    );
    expect(collection.label(0)).toBe('Positive zero');
    expect(collection.label(-0)).toBe('Negative zero');
    expect(collection.hasValue(-0)).toBe(true);
    expect(collection.label(NaN)).toBe('Not a number');
  });
  it('uses locale-aware matches including punctuation and variable-length collation', () => {
    const filter = createSelectFilter({ locale: 'de' });
    expect(filter.contains('Crème brûlée', 'creme')).toBe(true);
    expect(filter.contains('co-operate', 'cooperate')).toBe(true);
    expect(filter.startsWith('Straße', 'strasse')).toBe(true);
    expect(filter.endsWith('die Straße', 'strasse')).toBe(true);
    expect(filter.contains('anything', '')).toBe(true);
    expect(createSelectFilter({ locale: 'de' })).toBe(filter);
    expect(createSelectFilter({ locale: 'tr' }).contains('Istanbul', 'ıstan')).toBe(true);
    expect(
      createSelectFilter({ locale: 'en', sensitivity: 'variant' }).contains('Résumé', 'resume'),
    ).toBe(false);
  });
});

// These overload checks protect consumer inference without executing invalid inputs.
export function selectFactoryTypes(): void {
  const flat = createSelectItems([{ id: 1, title: 'One' }], {
    getValue: (item) => item.id,
    getLabel: (item) => item.title,
  });
  expectTypeOf(flat.value({ id: 1, title: 'One' })).toEqualTypeOf<number>();
  const grouped = createSelectItems([{ label: 'Group', items: [{ id: 1, title: 'One' }] }], {
    getValue: (item) => item.id,
    getLabel: (item) => item.title,
  });
  expectTypeOf(grouped.value({ id: 1, title: 'One' })).toEqualTypeOf<number>();
  type RequiredLeaf = { id: number; items: string[] };
  type OptionalLeaf = { id: number; items?: string[] };
  type UnionLeaf = { id: number; items: string | string[] };
  const options = { getValue: (item: { id: number }) => item.id, getLabel: () => 'Leaf' };
  // @ts-expect-error An items array is reserved for grouping, including declared leaf arrays.
  createSelectItems<RequiredLeaf, number>([{ id: 1, items: [] }], options);
  // @ts-expect-error Optional declared arrays retain the same unambiguous grouping boundary.
  createSelectItems<OptionalLeaf, number>([{ id: 1 }], options);
  // @ts-expect-error A declared union containing an array cannot be a leaf.
  createSelectItems<UnionLeaf, number>([{ id: 1, items: 'Leaf' }], options);
}
