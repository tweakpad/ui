/**
 * Cached `Intl` objects shared by the locale services, formatting helpers and components: one
 * instance per locale and option set, bounded so unusual option sets do not accumulate.
 */
export type LocaleInput = string | readonly string[] | undefined;

const LIMIT = 64;

/**
 * Wraps a factory keyed by locale and options in a bounded cache: the JSON of both arguments is
 * the key, and the oldest entry leaves when the cache is full. A factory that throws caches
 * nothing, so an invalid locale raises on every call as the bare constructor would.
 */
export function cachedIntl<Options, Value>(
  create: (locale: string | string[] | undefined, options: Options | undefined) => Value,
): (locale?: LocaleInput, options?: Options) => Value {
  const cache = new Map<string, Value>();
  return (locale, options) => {
    const key = JSON.stringify([locale, options]);
    let value = cache.get(key);
    if (value === undefined) {
      value = create(locale as string | string[] | undefined, options);
      if (cache.size >= LIMIT) cache.delete(cache.keys().next().value!);
      cache.set(key, value);
    }
    return value;
  };
}

export const numberFormatter = cachedIntl(
  (locale, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, options),
);

export const collator = cachedIntl(
  (locale, options?: Intl.CollatorOptions) => new Intl.Collator(locale, options),
);

const displayNameFormatters = cachedIntl(
  (locale, options: Intl.DisplayNamesOptions | undefined) =>
    new Intl.DisplayNames(locale, options ?? { type: 'language' }),
);
export function displayNames(
  locale: LocaleInput,
  options: Intl.DisplayNamesOptions,
): Intl.DisplayNames {
  return displayNameFormatters(locale, options);
}
