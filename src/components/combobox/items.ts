export type ComboboxPrimitive = string | number | bigint | boolean;
export interface ComboboxItemGroup<T> {
  items: readonly (T | null | undefined)[];
  label?: unknown;
}
type DeclaredKeys<T> = {
  [
    K in keyof T as string extends K
      ? never
      : number extends K
        ? never
        : symbol extends K
          ? never
          : K
  ]: T[K];
};
type HasGroupLeaf<T> = T extends object
  ? 'items' extends keyof DeclaredKeys<T>
    ? Extract<NonNullable<T['items']>, readonly unknown[]> extends never
      ? never
      : true
    : never
  : never;
type RejectGroupLeaf<T> =
  true extends HasGroupLeaf<T>
    ? 'Combobox leaf items cannot declare an items array; it marks a group.'
    : unknown;
export type ComboboxItemsData<T> =
  | (Extract<T, { items: readonly unknown[] }> extends never
      ? readonly (T | null | undefined)[]
      : never)
  | readonly ComboboxItemGroup<T>[];
const itemCollection = Symbol('Combobox item collection');
const negativeZeroIdentity = Symbol('Combobox negative zero identifier');
export interface ComboboxItemCollection<T, V extends ComboboxPrimitive = ComboboxPrimitive> {
  readonly [itemCollection]: true;
  readonly data: ComboboxItemsData<T> | undefined;
  value(item: T): V;
  itemLabel(item: T): string;
  hasValue(value: V, equal?: (a: V, b: V) => boolean): boolean;
  label(value: V, equal?: (a: V, b: V) => boolean, fallback?: (value: V) => string): string;
}
export function isComboboxItemCollection(value: unknown): value is ComboboxItemCollection<unknown> {
  return !!value && typeof value === 'object' && itemCollection in value;
}
export function comboboxLeaves<T>(data: ComboboxItemsData<T> | undefined): T[] {
  return (data ?? []).flatMap((entry): T[] => {
    if (entry == null) return [];
    if (typeof entry === 'object' && 'items' in entry && Array.isArray(entry.items)) {
      return (entry.items as readonly (T | null | undefined)[]).flatMap((item) => {
        if (item == null) return [];
        if (typeof item === 'object' && 'items' in item && Array.isArray(item.items))
          throw new TypeError('Combobox leaf items cannot declare an items array.');
        return [item];
      });
    }
    return [entry as T];
  });
}

/** Lazy source-owned lookup. Data holes and duplicate values never become selectable records. */
export interface CreateComboboxItemsOptions<T, V extends ComboboxPrimitive> {
  getValue(item: T): V;
  getLabel(item: T): string;
  diagnostic?: (message: string) => void;
}
export function createComboboxItems<T, V extends ComboboxPrimitive>(
  data: (readonly ComboboxItemGroup<T>[] & RejectGroupLeaf<T>) | undefined,
  options: CreateComboboxItemsOptions<T, V>,
): ComboboxItemCollection<T, V>;
export function createComboboxItems<T, V extends ComboboxPrimitive>(
  data: (readonly (T | null | undefined)[] & RejectGroupLeaf<T>) | undefined,
  options: CreateComboboxItemsOptions<T, V>,
): ComboboxItemCollection<T, V>;
export function createComboboxItems<T, V extends ComboboxPrimitive>(
  data: ComboboxItemsData<T> | undefined,
  options: CreateComboboxItemsOptions<T, V>,
): ComboboxItemCollection<T, V> {
  let lookup: Map<unknown, { value: V; item: T }> | undefined;
  const project = (item: T): V => {
    const value = options.getValue(item);
    if (!['string', 'number', 'bigint', 'boolean'].includes(typeof value))
      throw new TypeError('Combobox item values must be non-null primitive identifiers.');
    return value;
  };
  const index = () => {
    if (!lookup) {
      lookup = new Map();
      for (const item of comboboxLeaves<T>(data)) {
        const value = project(item);
        const key = Object.is(value, -0) ? negativeZeroIdentity : value;
        if (!lookup.has(key)) lookup.set(key, { value, item });
        else
          options.diagnostic?.(
            `Duplicate Combobox value ${String(value)}; the first item is retained.`,
          );
      }
    }
    return lookup;
  };
  const find = (value: V, equal: (a: V, b: V) => boolean) => {
    for (const entry of index().values()) if (equal(entry.value, value)) return entry.item;
    return undefined;
  };
  return {
    [itemCollection]: true,
    data,
    value: project,
    itemLabel: options.getLabel,
    hasValue: (value, equal = Object.is) => find(value, equal) !== undefined,
    label: (value, equal = Object.is, fallback) => {
      const item = find(value, equal);
      return item === undefined
        ? fallback
          ? fallback(value)
          : String(value)
        : options.getLabel(item);
    },
  };
}
