/** Values for `fillTemplate`: any record, interfaces included, of text, numbers or `undefined`. */
export type TemplateValues<V> = { readonly [K in keyof V]?: string | number | undefined };

/**
 * Fills the `{name}` placeholders of a string template. A placeholder whose name `values` holds as
 * its own property with a defined value becomes `String(value)`, every occurrence of it; any other
 * placeholder stays as written. Values are inserted as they are, without `$` patterns.
 */
export function fillTemplate<V extends TemplateValues<V>>(template: string, values: V): string {
  const lookup = values as Readonly<Record<string, string | number | undefined>>;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = Object.hasOwn(lookup, name) ? lookup[name] : undefined;
    return value === undefined ? placeholder : String(value);
  });
}
