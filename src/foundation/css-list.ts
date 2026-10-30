/**
 * Splits a computed CSS list (`rgb(1, 2, 3), oklch(…)`, `0.3s, 1s`) at its top-level commas,
 * leaving commas inside functions alone. Empty items are dropped.
 */
export function splitCssList(value: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      items.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  items.push(value.slice(start).trim());
  return items.filter(Boolean);
}
