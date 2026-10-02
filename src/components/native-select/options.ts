import type { NativeSelectValue } from './types.js';
export interface NativeOption {
  kind: 'option';
  source: HTMLOptionElement;
  value: string;
  text: string;
  label: string;
  disabled: boolean;
  groupDisabled: boolean;
  defaultSelected: boolean;
}
export interface NativeGroup {
  kind: 'group';
  source: HTMLOptGroupElement;
  label: string;
  disabled: boolean;
  children: NativeOption[];
}
export type NativeItem = NativeOption | NativeGroup;
/** Neutral authored option/group attributes remain native on their projected host. */
export function nativeAttributes(
  source: HTMLOptionElement | HTMLOptGroupElement,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const attribute of source.attributes ?? []) {
    if (
      ['value', 'label', 'disabled', 'selected', 'part', 'slot', 'style'].includes(attribute.name)
    )
      continue;
    properties[attribute.name] = attribute.value;
  }
  if (source.style?.length)
    properties.style = Object.fromEntries(
      [...source.style].map((property) => [property, source.style.getPropertyValue(property)]),
    );
  return properties;
}
export function nativeItems(host: HTMLElement): NativeItem[] {
  const option = (source: HTMLOptionElement, groupDisabled = false): NativeOption => ({
    kind: 'option',
    source,
    value: source.value,
    text: source.text,
    label: source.label,
    disabled: source.disabled,
    groupDisabled,
    defaultSelected: source.defaultSelected,
  });
  return [...host.children].flatMap<NativeItem>((child) => {
    if (child.localName === 'option') return [option(child as HTMLOptionElement)];
    if (child.localName !== 'optgroup') return [];
    const source = child as HTMLOptGroupElement;
    return [
      {
        kind: 'group',
        source,
        label: source.label,
        disabled: source.disabled,
        children: [...source.children]
          .filter((node) => node.localName === 'option')
          .map((node) => option(node as HTMLOptionElement, source.disabled)),
      },
    ];
  });
}
export const flattenNativeOptions = (items: readonly NativeItem[]): NativeOption[] =>
  items.flatMap((item) => (item.kind === 'group' ? item.children : [item]));
export function normalizeNativeValue(
  value: NativeSelectValue,
  multiple: boolean,
): NativeSelectValue {
  if (multiple) return [...new Set((Array.isArray(value) ? value : [value]).map(String))];
  return String(Array.isArray(value) ? (value[0] ?? '') : value);
}
export function nativeDefaultValue(
  items: readonly NativeItem[],
  multiple: boolean,
  placeholder = '',
): NativeSelectValue {
  const options = flattenNativeOptions(items);
  const selected = options.filter((option) => option.defaultSelected);
  if (multiple) return selected.map((option) => option.value);
  return (
    selected.at(-1)?.value ??
    (placeholder
      ? ''
      : (options.find((option) => !option.disabled && !option.groupDisabled)?.value ?? ''))
  );
}
export function sameNativeValue(a: NativeSelectValue, b: NativeSelectValue): boolean {
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
