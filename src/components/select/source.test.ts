import { describe, expect, it } from 'vitest';
import { SelectSource } from './source.js';
import { createSelectItems } from './items.js';

describe('Select application source identity', () => {
  it('keeps application records as values and projection wrappers stable across label changes', () => {
    const source = new SelectSource(),
      item = { value: 3, label: 'Three' };
    const first = source.normalize([item], [])[0]!;
    expect(first).toMatchObject({ value: item, label: 'Three' });
    item.label = 'Updated';
    expect(source.normalize([item], [])[0]).toBe(first);
    expect(first).toMatchObject({ value: item, label: 'Updated' });
  });
  it('does not retain removed option contracts or accumulate authored click callbacks across renders', () => {
    const source = new SelectSource();
    let calls = 0;
    const item = {
      label: 'Action',
      onClick: () => {
        calls++;
      },
      disabled: true,
      partContract: { classHook: 'custom' },
    };
    const first = source.normalize([item], [])[0] as {
      partContract?: { hostProperties?: Record<string, unknown> };
      disabled?: boolean;
    };
    source.normalize([item], []);
    (first.partContract!.hostProperties!['@click'] as () => void)();
    expect(calls).toBe(1);
    const next = { label: 'Action' };
    Object.keys(item).forEach((key) => {
      if (!(key in next)) delete (item as Record<string, unknown>)[key];
    });
    source.normalize([item], []);
    expect(first.partContract).toBeUndefined();
    expect(first.disabled).toBeUndefined();
  });
  it('does not reinterpret application type and items metadata as rendered separators', () => {
    const source = new SelectSource();
    const item = { id: 1, type: 'separator', items: 5, label: 'Application record' };
    const option = source.normalize([item], [])[0]!;
    expect(option).toMatchObject({ value: item, label: 'Application record' });
    expect(option).not.toHaveProperty('type');
  });
  it('preserves source group identity and separates factory projection from registered values', () => {
    const source = new SelectSource(),
      item = { id: 1, title: 'One' },
      group = { label: 'Numbers', items: [null, item] };
    const collection = createSelectItems([group], {
      getValue: (value) => value.id,
      getLabel: (value) => value.title,
    });
    const first = source.normalize(collection, [])[0]!;
    expect(first).toMatchObject({ type: 'group', items: [{ value: 1, label: 'One' }] });
    expect(source.normalize(collection, [])[0]).toBe(first);
    source.normalize([], []);
    expect(source.sources.size).toBe(0);
  });
});
