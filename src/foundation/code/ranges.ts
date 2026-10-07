/**
 * Parses a 1-based line range list such as `"1,3-5"` into a set of line numbers. Invalid parts
 * (non-numbers, zero, reversed or open ranges) are ignored rather than rejecting the whole value.
 */
export function parseLineRanges(value: string | null | undefined): ReadonlySet<number> {
  const lines = new Set<number>();
  if (!value) return lines;
  for (const part of value.split(',')) {
    const match = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(part);
    if (!match) continue;
    const start = Number(match[1]);
    const end = match[2] === undefined ? start : Number(match[2]);
    if (start < 1 || end < start) continue;
    for (let line = start; line <= end; line++) lines.add(line);
  }
  return lines;
}
