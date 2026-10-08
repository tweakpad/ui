export type TimelineStatus = 'complete' | 'current' | 'upcoming' | 'none';
export type TimelineAlign = 'start' | 'end' | 'alternate' | 'alternate-reverse';
export type TimelineSide = 'start' | 'end';

export interface TimelineItemInput {
  value: string;
  /** Own status; anything other than complete, current or upcoming derives. */
  status: string;
  /** Own side; anything other than start or end follows the root. */
  align: string;
}

export interface TimelineItemState {
  readonly index: number;
  readonly first: boolean;
  readonly last: boolean;
  readonly status: TimelineStatus;
  /** Only the first current item carries aria-current. */
  readonly current: boolean;
  readonly side: TimelineSide;
  /** Segment shared with the previous item; none on the first item. */
  readonly before: TimelineStatus;
  /** Segment shared with the next item; none on the last item. */
  readonly after: TimelineStatus;
}

export interface TimelineState {
  readonly items: readonly TimelineItemState[];
  readonly duplicates: readonly string[];
}

const statuses = new Set(['complete', 'current', 'upcoming']);

function derivedStatus(index: number, currentIndex: number): TimelineStatus {
  if (currentIndex < 0) return 'none';
  if (index < currentIndex) return 'complete';
  return index === currentIndex ? 'current' : 'upcoming';
}

function resolvedSide(index: number, own: string, align: TimelineAlign): TimelineSide {
  if (own === 'start' || own === 'end') return own;
  if (align === 'start' || align === 'end') return align;
  const even = index % 2 === 0;
  return (align === 'alternate') === even ? 'end' : 'start';
}

/** Segment between an item and the next (Foundation §18.20 connector segments). */
export function segmentStatus(earlier: TimelineStatus, later: TimelineStatus): TimelineStatus {
  if (earlier === 'complete') return 'complete';
  return earlier === 'none' && later === 'none' ? 'none' : 'upcoming';
}

export function timelineState(
  items: readonly TimelineItemInput[],
  value: string | null,
  align: TimelineAlign,
): TimelineState {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const item of items) {
    if (!item.value) continue;
    if (seen.has(item.value)) duplicates.add(item.value);
    seen.add(item.value);
  }
  const currentIndex = value ? items.findIndex((item) => item.value === value) : -1;
  const resolved = items.map((item, index) =>
    statuses.has(item.status)
      ? (item.status as TimelineStatus)
      : derivedStatus(index, currentIndex),
  );
  const firstCurrent = resolved.indexOf('current');
  const segments = resolved.slice(1).map((later, index) => segmentStatus(resolved[index]!, later));
  return {
    items: items.map((item, index) => ({
      index,
      first: index === 0,
      last: index === items.length - 1,
      status: resolved[index]!,
      current: index === firstCurrent,
      side: resolvedSide(index, item.align, align),
      before: index === 0 ? 'none' : segments[index - 1]!,
      after: index === items.length - 1 ? 'none' : segments[index]!,
    })),
    duplicates: [...duplicates],
  };
}
