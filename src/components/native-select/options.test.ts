import { describe, expect, it } from 'vitest';
import {
  nativeAttributes,
  nativeItems,
  nativeDefaultValue,
  normalizeNativeValue,
  sameNativeValue,
} from './options.js';
const option = (value: string, disabled = false, selected = false) =>
  ({
    localName: 'option',
    value,
    text: value,
    label: value,
    disabled,
    defaultSelected: selected,
  }) as unknown as HTMLOptionElement;
describe('native picker source policy', () => {
  it('keeps neutral option attributes while native owned fields are projected separately', () => {
    const source = Object.assign(option('a'), {
      attributes: [
        { name: 'title', value: 'Helpful' },
        { name: 'class', value: 'authored' },
        { name: 'value', value: 'wrong' },
        { name: 'slot', value: 'wrong' },
        { name: 'part', value: 'wrong' },
      ],
    });
    expect(nativeAttributes(source)).toEqual({ title: 'Helpful', class: 'authored' });
  });
  it('retains every native group and skips disabled group/option for implicit single default', () => {
    const groups = [
      { localName: 'optgroup', label: 'Blocked', disabled: true, children: [option('a')] },
      {
        localName: 'optgroup',
        label: 'Available',
        disabled: false,
        children: [option('b', true), option('c')],
      },
    ];
    const items = nativeItems({ children: groups } as unknown as HTMLElement);
    expect(items).toHaveLength(2);
    expect(nativeDefaultValue(items, false)).toBe('c');
  });
  it('keeps authored disabled selections, last single default and multiple source order', () => {
    const items = nativeItems({
      children: [option('a', true, true), option('b', false, true)],
    } as unknown as HTMLElement);
    expect(nativeDefaultValue(items, false)).toBe('b');
    expect(nativeDefaultValue(items, true)).toEqual(['a', 'b']);
    expect(
      nativeDefaultValue(
        nativeItems({ children: [option('a')] } as unknown as HTMLElement),
        false,
        'Choose',
      ),
    ).toBe('');
  });
  it('normalizes without mutating caller arrays and compares ordered committed sets', () => {
    const input = Object.freeze(['b', 'a', 'b']);
    expect(normalizeNativeValue(input, true)).toEqual(['b', 'a']);
    expect(input).toEqual(['b', 'a', 'b']);
    expect(normalizeNativeValue(input, false)).toBe('b');
    expect(sameNativeValue(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(sameNativeValue(['a', 'b'], ['a', 'b'])).toBe(true);
  });
});
