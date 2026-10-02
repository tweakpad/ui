/** Accept JSON array attributes and a legacy scalar identifier without splitting spaces. */
export function normalizeToggleValues(input: unknown): string[] {
  let value = input;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      value = value ? [value] : [];
    }
  }
  if (!Array.isArray(value)) value = typeof value === 'string' ? [value] : [];
  return [
    ...new Set(
      (value as unknown[]).filter(
        (item): item is string => typeof item === 'string' && item.length > 0,
      ),
    ),
  ];
}
export function toggleSelection(
  current: readonly string[],
  value: string,
  multiple: boolean,
  registered: readonly string[],
): string[] {
  if (!multiple) return current[0] === value ? [] : [value];
  const selected = new Set(current);
  if (selected.has(value)) selected.delete(value);
  else selected.add(value);
  return [
    ...current.filter((item) => !registered.includes(item) && selected.has(item)),
    ...registered.filter((item) => selected.has(item)),
  ];
}
