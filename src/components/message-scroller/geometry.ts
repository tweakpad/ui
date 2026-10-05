/** Native CSS-pixel geometry adapted from the local @shadcn/react MessageScroller source. */
export interface RowGeometry {
  top: number;
  height: number;
}
export function scrollTarget(
  row: RowGeometry,
  top: number,
  height: number,
  start: number,
  end: number,
  align: 'start' | 'center' | 'end' | 'nearest' = 'start',
  margin = 0,
): number {
  if (align === 'center')
    return row.top - start - (Math.max(0, height - start - end) - row.height) / 2 - margin;
  if (align === 'end') return row.top + row.height - height + end + margin;
  if (align === 'nearest') {
    if (row.top >= top + start && row.top + row.height <= top + height - end) return top;
    if (row.top >= top + start) return row.top + row.height - height + end + margin;
  }
  return row.top - start - margin;
}
export function scrollEdges(
  top: number,
  contentBottom: number,
  height: number,
  threshold: number,
  following = false,
) {
  const tolerance = Math.max(0, Number.isFinite(threshold) ? threshold : 0);
  return { start: top > tolerance, end: !following && contentBottom - top - height > tolerance };
}
export function nonnegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** Observer and layout fallback share ordering, peek boundaries and current-turn policy. */
export function readingVisibility<T extends { id: string; anchor: boolean; addressable?: boolean }>(
  rows: readonly T[],
  measure: (row: T) => RowGeometry,
  line: number,
  end: number,
  observed?: (row: T) => boolean,
) {
  const visibleMessageIds: string[] = [];
  let currentAnchorId: string | null = null;
  for (const row of rows) {
    if (row.addressable === false) continue;
    const geometry = row.anchor || !observed ? measure(row) : undefined;
    if (observed ? observed(row) : geometry!.top + geometry!.height > line && geometry!.top < end)
      visibleMessageIds.push(row.id);
    if (row.anchor && geometry!.top <= line + 0.5) currentAnchorId = row.id;
  }
  return { visibleMessageIds, currentAnchorId };
}
