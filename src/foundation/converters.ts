/** Attribute converters and numeric clamps shared by component property declarations. */

/** A number attribute that may be absent or blank; non-finite text reads as `null`. */
export const numberOrNull = {
  fromAttribute(value: string | null): number | null {
    if (value === null || value.trim() === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  },
  toAttribute(value: number | null): string | null {
    return value === null ? null : String(value);
  },
};

/** A boolean that defaults to `true`; only the literal text `false` turns it off. */
export const defaultTrue = {
  fromAttribute: (value: string | null): boolean => value !== 'false',
  toAttribute: (value: boolean): string | null => (value ? null : 'false'),
};

/** A tri-state boolean: absent means "not set"; `false` is the literal text. */
export const optionalBoolean = {
  fromAttribute: (value: string | null): boolean | undefined =>
    value === null ? undefined : value !== 'false',
  toAttribute: (value: boolean | undefined): string | null =>
    value === undefined ? null : String(value),
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const clamp01 = (value: number): number => clamp(value, 0, 1);
