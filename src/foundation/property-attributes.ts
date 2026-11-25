/**
 * The attribute form of a library element's properties, for markup written without the element:
 * framework bindings rendering on the server, where only attributes reach the HTML.
 */

/** Reactive property declarations of a library element class, once it has finalized. */
interface ReactiveElementClass {
  finalize?(): void;
  readonly elementProperties?: ReadonlyMap<
    PropertyKey,
    { readonly attribute?: boolean | string; readonly state?: boolean }
  >;
}

const attributesOf = new WeakMap<object, ReadonlyMap<string, string | null>>();

/**
 * Each reactive property of an element class → the attribute it reads, or `null` for a property
 * without one (`attribute: false`). Internal state is left out. Computed once per class.
 */
export function propertyAttributes(
  element: CustomElementConstructor,
): ReadonlyMap<string, string | null> {
  const known = attributesOf.get(element);
  if (known) return known;
  const reactive = element as unknown as ReactiveElementClass;
  reactive.finalize?.();
  const attributes = new Map<string, string | null>();
  for (const [key, options] of reactive.elementProperties ?? [])
    if (typeof key === 'string' && !options.state)
      attributes.set(
        key,
        typeof options.attribute === 'string'
          ? options.attribute
          : options.attribute === false
            ? null
            : key.toLowerCase(),
      );
  attributesOf.set(element, attributes);
  return attributes;
}

/**
 * A value's attribute form: a string or number as text, `true` as a present boolean attribute
 * (`''`). `false`, nullish values, objects and functions have none (`undefined`): they reach the
 * element as properties on the client.
 */
export function attributeValue(value: unknown): string | undefined {
  if (value === true) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}
