import type { FieldError } from './types.js';

export function fieldErrors(values: readonly FieldError[]): string[] {
  return [
    ...new Set(
      values
        .map((value) => (typeof value === 'string' ? value.trim() : (value?.message?.trim() ?? '')))
        .filter(Boolean),
    ),
  ];
}
export function sameFieldValue(a: unknown, b: unknown): boolean {
  return (
    Object.is(a, b) ||
    (Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, index) => Object.is(value, b[index])))
  );
}
/** Duplicate Field names retain ordered abstract values, including nested lists. */
export function fieldValues(
  fields: readonly { name: string; value: unknown }[],
): Record<string, unknown> {
  const values: Record<string, unknown> = Object.create(null);
  const duplicates = new Set<string>();
  for (const { name, value } of fields) {
    if (!name) continue;
    if (Object.hasOwn(values, name)) {
      if (!duplicates.has(name)) {
        values[name] = [values[name]];
        duplicates.add(name);
      }
      (values[name] as unknown[]).push(value);
    } else values[name] = value;
  }
  return values;
}
export function errorMatches(
  match: unknown,
  validity: ValidityStateFlags & { valid: boolean | null },
): boolean {
  if (match === false || match === 'false') return false;
  if (match === true || match === '' || match === 'true') return true;
  return typeof match === 'string'
    ? Boolean(validity[match as keyof typeof validity])
    : validity.valid === false;
}
