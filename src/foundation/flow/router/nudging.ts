import type { FlowPoint } from '../types.js';
import { simplifyOrthogonal } from './astar.js';
import type { ObstacleIndex } from './obstacles.js';
import { routeHash } from './orthogonal-router.js';
import type { FlowRoute, FlowRouteContext } from './types.js';

/**
 * Nudging spreads colinear overlapping segments of different edges. Per axis, segments that
 * share a coordinate and overlap are grouped into channels; a channel orders its segments by
 * the midpoint of their connecting legs (fewest crossings), spreads them by `edgeSpacing`
 * inside the corridor between the neighbouring obstacles and keeps port stubs fixed. A run
 * that continues straight out of a stub moves with a jog at the exit. When the corridor or a
 * leg cannot take the full spread the spacing shrinks, never the order.
 */
export interface NudgeContext {
  obstacles: ObstacleIndex;
  edgeSpacing: number;
  nodePadding: number;
  order(edgeId: string): number;
}

export interface NudgeItem {
  edgeId: string;
  /** Mutable polyline with explicit exit points; nudging rewrites it per axis pass. */
  points: FlowPoint[];
  /** Fallback and self-loop routes are never moved. */
  movable: boolean;
  /** Stub length the exits were split at. */
  stub: number;
  /** Leading segments that never move: the stub plus the trunk shared with sibling edges. */
  fixedPrefix: number;
  /** Trailing segments that never move. */
  fixedSuffix: number;
}

/**
 * Edges leaving (or entering) the same port share a trunk: the segments along their common
 * prefix (suffix) stay put and may overlap each other, like a bus fanning out. Each item's
 * fixed prefix/suffix is the longest such run; a lone edge keeps just its stubs fixed.
 */
export function markTrunks(items: readonly NudgeItem[]): void {
  const bySource = new Map<string, number[]>();
  const byTarget = new Map<string, number[]>();
  items.forEach((item, index) => {
    item.fixedPrefix = 1;
    item.fixedSuffix = 1;
    if (!item.movable || item.points.length < 2) return;
    const first = item.points[0]!;
    const last = item.points[item.points.length - 1]!;
    const sourceKey = `${first.x},${first.y}`;
    const targetKey = `${last.x},${last.y}`;
    bySource.set(sourceKey, [...(bySource.get(sourceKey) ?? []), index]);
    byTarget.set(targetKey, [...(byTarget.get(targetKey) ?? []), index]);
  });
  for (const group of bySource.values())
    for (let a = 0; a < group.length; a += 1)
      for (let b = a + 1; b < group.length; b += 1) {
        const itemA = items[group[a]!]!;
        const itemB = items[group[b]!]!;
        const shared = trunkSegments(itemA.points, itemB.points, false);
        itemA.fixedPrefix = Math.max(itemA.fixedPrefix, Math.min(shared, itemA.points.length - 1));
        itemB.fixedPrefix = Math.max(itemB.fixedPrefix, Math.min(shared, itemB.points.length - 1));
      }
  for (const group of byTarget.values())
    for (let a = 0; a < group.length; a += 1)
      for (let b = a + 1; b < group.length; b += 1) {
        const itemA = items[group[a]!]!;
        const itemB = items[group[b]!]!;
        const shared = trunkSegments(itemA.points, itemB.points, true);
        itemA.fixedSuffix = Math.max(itemA.fixedSuffix, Math.min(shared, itemA.points.length - 1));
        itemB.fixedSuffix = Math.max(itemB.fixedSuffix, Math.min(shared, itemB.points.length - 1));
      }
}

/**
 * Segments two polylines share from one end: the identical ones plus the diverging segment
 * when both continue in the same direction (a fan), which is the run that may overlap.
 */
function trunkSegments(a: readonly FlowPoint[], b: readonly FlowPoint[], fromEnd: boolean): number {
  const shared = commonRun(a, b, fromEnd);
  if (shared === 0) return 0;
  const identical = shared - 1;
  const at = (points: readonly FlowPoint[], index: number): FlowPoint | undefined =>
    fromEnd ? points[points.length - 1 - index] : points[index];
  const lastA = at(a, identical);
  const nextA = at(a, identical + 1);
  const nextB = at(b, identical + 1);
  if (!lastA || !nextA || !nextB) return identical;
  const colinear =
    (Math.abs(nextA.x - lastA.x) <= EPSILON &&
      Math.abs(nextB.x - lastA.x) <= EPSILON &&
      Math.sign(nextA.y - lastA.y) === Math.sign(nextB.y - lastA.y)) ||
    (Math.abs(nextA.y - lastA.y) <= EPSILON &&
      Math.abs(nextB.y - lastA.y) <= EPSILON &&
      Math.sign(nextA.x - lastA.x) === Math.sign(nextB.x - lastA.x));
  return colinear ? identical + 1 : identical;
}

/** Number of equal leading (or trailing) points of two polylines. */
export function commonRun(
  a: readonly FlowPoint[],
  b: readonly FlowPoint[],
  fromEnd: boolean,
): number {
  const limit = Math.min(a.length, b.length);
  let count = 0;
  while (count < limit) {
    const pa = fromEnd ? a[a.length - 1 - count]! : a[count]!;
    const pb = fromEnd ? b[b.length - 1 - count]! : b[count]!;
    if (Math.abs(pa.x - pb.x) > EPSILON || Math.abs(pa.y - pb.y) > EPSILON) break;
    count += 1;
  }
  return count;
}

const EPSILON = 1e-6;

/** Maximum displacement of a nudged segment, in edge spacings. */
export const NUDGE_REACH = 6;
/** Maximum displacement of a lone run stepping clear of a neighbour, in edge spacings. */
const LONE_REACH = 2;

interface Member {
  item: number;
  segment: number;
  coord: number;
  lo: number;
  hi: number;
  fixed: boolean;
  key: number;
  minShift: number;
  maxShift: number;
  /**
   * Bounds that let the member into the neighbouring nodes' padding, down to half of it: the
   * fallback for a corridor too narrow to separate its lanes at the full clearance.
   */
  relaxedMin: number;
  relaxedMax: number;
  lane: number;
  position: number;
  /** Final position known: lone members, fixed members and processed channels. */
  placed: boolean;
}

/**
 * Moves the segments perpendicular to `axis` (vertical runs for `x`) and returns the moved
 * items. Same-coordinate channels get lane offsets and are placed in coordinate order, each
 * keeping `edgeSpacing` away from already placed neighbours whose spans overlap.
 */
export function nudgeAxis(
  items: readonly NudgeItem[],
  axis: 'x' | 'y',
  context: NudgeContext,
): Set<number> {
  const cross = axis === 'x' ? 'y' : 'x';
  const spacing = context.edgeSpacing;
  markTrunks(items);
  const members: Member[] = [];
  items.forEach((item, index) => {
    if (!item.movable) return;
    const points = item.points;
    const n = points.length;
    for (let i = 0; i < n - 1; i += 1) {
      const p = points[i]!;
      const q = points[i + 1]!;
      if (p[axis] !== q[axis] || p[cross] === q[cross]) continue;
      const fixed = i < item.fixedPrefix || i >= n - 1 - item.fixedSuffix;
      const coord = p[axis];
      let key = 0;
      let weight = 0;
      let minShift = -Infinity;
      let maxShift = Infinity;
      if (i > 0) {
        const before = points[i - 1]!;
        const length = coord - before[axis];
        key -= length;
        weight += 1;
        // A perpendicular leg keeps its direction; the stub keeps at least the padding.
        const minimum = i === 1 ? context.nodePadding : 0;
        if (length > 0) minShift = Math.max(minShift, minimum - length);
        else if (length < 0) maxShift = Math.min(maxShift, -length - minimum);
      }
      if (i + 2 < n) {
        const after = points[i + 2]!;
        const length = after[axis] - coord;
        key += length;
        weight += 1;
        const minimum = i === n - 3 ? context.nodePadding : 0;
        if (length > 0) maxShift = Math.min(maxShift, length - minimum);
        else if (length < 0) minShift = Math.max(minShift, minimum + length);
      }
      members.push({
        item: index,
        segment: i,
        coord,
        lo: Math.min(p[cross], q[cross]),
        hi: Math.max(p[cross], q[cross]),
        fixed,
        key: weight ? key / weight : 0,
        minShift: fixed ? 0 : minShift,
        maxShift: fixed ? 0 : maxShift,
        relaxedMin: fixed ? 0 : minShift,
        relaxedMax: fixed ? 0 : maxShift,
        lane: 0,
        position: coord,
        placed: true,
      });
    }
  });
  if (members.length < 2) return new Set();

  // Corridor bounds: the neighbouring obstacles along each member's span. No member moves
  // further than `reach`, which is also how far the corridor and neighbour queries look.
  const reach = NUDGE_REACH * spacing;
  const yielded = context.nodePadding / 2;
  for (const member of members) {
    if (member.fixed) continue;
    member.minShift = Math.max(member.minShift, -reach);
    member.maxShift = Math.min(member.maxShift, reach);
    member.relaxedMin = Math.max(member.relaxedMin, -reach);
    member.relaxedMax = Math.min(member.relaxedMax, reach);
    const corridor =
      axis === 'x'
        ? { x: member.coord - reach, y: member.lo, width: reach * 2, height: member.hi - member.lo }
        : {
            x: member.lo,
            y: member.coord - reach,
            width: member.hi - member.lo,
            height: reach * 2,
          };
    for (const [, rect] of context.obstacles.rectsIn(corridor)) {
      const spanLo = axis === 'x' ? rect.y : rect.x;
      const spanHi = axis === 'x' ? rect.y + rect.height : rect.x + rect.width;
      if (spanLo >= member.hi - EPSILON || spanHi <= member.lo + EPSILON) continue;
      const near = axis === 'x' ? rect.x : rect.y;
      const far = axis === 'x' ? rect.x + rect.width : rect.y + rect.height;
      if (far <= member.coord + EPSILON) {
        member.minShift = Math.max(member.minShift, far - member.coord);
        member.relaxedMin = Math.max(member.relaxedMin, far - yielded - member.coord);
      } else if (near >= member.coord - EPSILON) {
        member.maxShift = Math.min(member.maxShift, near - member.coord);
        member.relaxedMax = Math.min(member.relaxedMax, near + yielded - member.coord);
      } else if (member.coord - near <= far - member.coord) {
        // Already inside the padding (a relaxed lane from an earlier round, an exit clamped in a
        // narrow gap): never deeper than the relaxed wall on that side.
        member.maxShift = Math.min(member.maxShift, 0);
        member.relaxedMax = Math.min(member.relaxedMax, near + yielded - member.coord);
      } else {
        member.minShift = Math.max(member.minShift, 0);
        member.relaxedMin = Math.max(member.relaxedMin, far - yielded - member.coord);
      }
    }
    if (member.minShift > 0) member.minShift = 0;
    if (member.maxShift < 0) member.maxShift = 0;
    member.relaxedMin = Math.min(member.relaxedMin, member.minShift);
    member.relaxedMax = Math.max(member.relaxedMax, member.maxShift);
  }

  // Same-coordinate channels (shared coordinate, overlapping spans) get lane offsets.
  members.sort(
    (a, b) => a.coord - b.coord || a.lo - b.lo || a.item - b.item || a.segment - b.segment,
  );
  const channels: Member[][] = [];
  let channel: Member[] = [];
  let channelCoord = 0;
  let channelEnd = -Infinity;
  const flush = (): void => {
    if (channel.length > 1 && new Set(channel.map((member) => member.item)).size > 1)
      channels.push(channel);
    channel = [];
  };
  for (const member of members) {
    if (
      channel.length > 0 &&
      Math.abs(member.coord - channelCoord) <= EPSILON &&
      member.lo < channelEnd - EPSILON
    ) {
      channel.push(member);
      channelEnd = Math.max(channelEnd, member.hi);
      continue;
    }
    flush();
    channel.push(member);
    channelCoord = member.coord;
    channelEnd = member.hi;
  }
  flush();
  for (const group of channels) for (const member of group) member.placed = false;

  // Place channels in coordinate order; each keeps clear of every placed neighbour.
  const coords = members.map((member) => member.coord);
  for (const group of channels) {
    assignLanes(items, group, context);
    const movable = group.filter((member) => !member.fixed);
    const fixedPresent = movable.length < group.length;
    const centre = group[0]!.coord;
    const from = lowerBoundNumber(coords, centre - reach * 2);
    const to = upperBoundNumber(coords, centre + reach * 2);
    const blocked: Member[] = [];
    for (let at = from; at < to; at += 1) {
      const other = members[at]!;
      if (other.placed && !group.includes(other)) blocked.push(other);
    }
    let placement = placeEitherOrder(movable, fixedPresent, blocked, spacing, READABLE_STEPS);
    if (!placement) {
      // A corridor too narrow for readable lanes at full clearance: lanes may use half the
      // padding of the nodes beside them rather than sit on (or a pixel from) one line.
      for (const member of movable) {
        member.minShift = member.relaxedMin;
        member.maxShift = member.relaxedMax;
      }
      placement = placeEitherOrder(movable, fixedPresent, blocked, spacing, SPACING_STEPS);
    }
    if (placement) {
      for (const member of movable)
        member.position = member.coord + member.lane * placement.spacing + placement.shift;
    }
    for (const member of group) member.placed = true;
  }

  // Lone runs a pixel or two from a neighbour (coordinates from different sources: a midline,
  // a moved node's padded boundary, a port exit) are no channel but read as one line; each
  // steps aside, at most two lanes, to a readable distance under the same corridor and leg
  // bounds. Runs that find no such spot stay: a closer one would still read as one line.
  const grouped = new Set(channels.flat());
  const readable = spacing * READABLE_STEPS[READABLE_STEPS.length - 1]!;
  const aside = spacing * LONE_REACH;
  let across: AcrossRuns | undefined;
  for (const member of members) {
    if (member.fixed || grouped.has(member)) continue;
    const from = lowerBoundNumber(coords, member.coord - reach - aside - spacing);
    const to = upperBoundNumber(coords, member.coord + reach + aside + spacing);
    const blocked: Member[] = [];
    let crowded = false;
    for (let at = from; at < to; at += 1) {
      const other = members[at]!;
      if (other === member) continue;
      if (Math.min(member.hi, other.hi) - Math.max(member.lo, other.lo) <= EPSILON) continue;
      if (Math.abs(other.position - member.coord) > aside + spacing) continue;
      blocked.push(other);
      if (
        other.item !== member.item &&
        Math.abs(other.position - member.position) < readable - EPSILON
      )
        crowded = true;
    }
    if (!crowded) continue;
    across ??= acrossRuns(items, axis);
    const runs = across;
    const accept = (shift: number): boolean =>
      stretchClear(items, member, shift, axis, runs, readable);
    member.minShift = Math.max(member.minShift, -aside);
    member.maxShift = Math.min(member.maxShift, aside);
    let shift = placeLone(member, blocked, spacing, READABLE_STEPS, accept);
    if (shift === undefined) {
      member.minShift = Math.max(member.relaxedMin, -aside);
      member.maxShift = Math.min(member.relaxedMax, aside);
      shift = placeLone(member, blocked, spacing, READABLE_STEPS, accept);
    }
    if (shift !== undefined) member.position = member.coord + shift;
  }

  const deltas = new Map<number, Map<number, number>>();
  for (const member of members) {
    const delta = member.position - member.coord;
    if (Math.abs(delta) <= EPSILON) continue;
    let shifts = deltas.get(member.item);
    if (!shifts) deltas.set(member.item, (shifts = new Map()));
    shifts.set(member.segment, delta);
  }
  const moved = new Set<number>();
  for (const [index, shifts] of deltas) {
    const item = items[index]!;
    item.points = splitStubs(applyShifts(item.points, shifts, axis, cross), item.stub);
    moved.add(index);
  }
  return moved;
}

/**
 * The smallest shift (at the widest spacing among `steps`) that keeps one member inside its
 * bounds, at least the spacing from every blocked member and passes `accept`. The free shifts
 * are the gaps between the merged keep-out intervals around the blocked positions.
 */
function placeLone(
  member: Member,
  blocked: readonly Member[],
  edgeSpacing: number,
  steps: readonly number[],
  accept: (shift: number) => boolean,
): number | undefined {
  for (const step of steps) {
    const spacing = edgeSpacing * step;
    const low = member.minShift;
    const high = member.maxShift;
    const keepOut: Array<[number, number]> = [];
    for (const other of blocked) {
      const start = other.position - member.coord - spacing;
      const end = other.position - member.coord + spacing;
      if (end > low + EPSILON && start < high - EPSILON) keepOut.push([start, end]);
    }
    keepOut.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [];
    for (const interval of keepOut) {
      const last = merged[merged.length - 1];
      // Touching intervals stay apart: the point between them is exactly a spacing from both.
      if (last && interval[0] < last[1] - EPSILON) last[1] = Math.max(last[1], interval[1]);
      else merged.push([interval[0], interval[1]]);
    }
    const candidates = [Math.min(Math.max(0, low), high)];
    for (const [start, end] of merged) candidates.push(start, end);
    candidates.sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
    for (const shift of candidates) {
      if (shift < low - EPSILON || shift > high + EPSILON) continue;
      if (merged.some(([start, end]) => shift > start + EPSILON && shift < end - EPSILON)) continue;
      if (accept(shift)) return shift;
    }
  }
  return undefined;
}

/** Runs across `axis` (the legs a moved run stretches), sorted by their coordinate. */
interface AcrossRuns {
  at: Float64Array;
  item: Int32Array;
  lo: Float64Array;
  hi: Float64Array;
}

function acrossRuns(items: readonly NudgeItem[], axis: 'x' | 'y'): AcrossRuns {
  const cross = axis === 'x' ? 'y' : 'x';
  const runs: Array<{ item: number; at: number; lo: number; hi: number }> = [];
  items.forEach((item, index) => {
    const points = item.points;
    for (let i = 0; i < points.length - 1; i += 1) {
      const p = points[i]!;
      const q = points[i + 1]!;
      if (p[cross] !== q[cross] || p[axis] === q[axis]) continue;
      runs.push({
        item: index,
        at: p[cross],
        lo: Math.min(p[axis], q[axis]),
        hi: Math.max(p[axis], q[axis]),
      });
    }
  });
  runs.sort((a, b) => a.at - b.at);
  return {
    at: Float64Array.from(runs, (run) => run.at),
    item: Int32Array.from(runs, (run) => run.item),
    lo: Float64Array.from(runs, (run) => run.lo),
    hi: Float64Array.from(runs, (run) => run.hi),
  };
}

/**
 * Whether moving `member` by `shift` keeps the legs it stretches off other edges' runs: a
 * stretched leg must not lie within `readable` of a parallel run (a port stub in front of a
 * neighbouring node, say). A leg stretches when the run moves away from the leg's other end.
 */
function stretchClear(
  items: readonly NudgeItem[],
  member: Member,
  shift: number,
  axis: 'x' | 'y',
  runs: AcrossRuns,
  readable: number,
): boolean {
  if (Math.abs(shift) <= EPSILON) return true;
  const cross = axis === 'x' ? 'y' : 'x';
  const points = items[member.item]!.points;
  const lo = Math.min(member.coord, member.coord + shift);
  const hi = Math.max(member.coord, member.coord + shift);
  const ends: Array<[FlowPoint, FlowPoint | undefined]> = [
    [points[member.segment]!, points[member.segment - 1]],
    [points[member.segment + 1]!, points[member.segment + 2]],
  ];
  for (const [end, other] of ends) {
    if (!other || Math.sign(shift) !== Math.sign(member.coord - other[axis])) continue;
    const at = end[cross];
    for (let index = lowerBoundNumber(runs.at, at - readable); index < runs.at.length; index += 1) {
      if (runs.at[index]! >= at + readable - EPSILON) break;
      if (Math.abs(runs.at[index]! - at) >= readable - EPSILON) continue;
      if (runs.item[index] === member.item) continue;
      if (Math.min(runs.hi[index]!, hi) - Math.max(runs.lo[index]!, lo) > EPSILON) return false;
    }
  }
  return true;
}

/** Lane order of a channel from the connecting legs; the stubs stay at lane 0. */
function assignLanes(items: readonly NudgeItem[], channel: Member[], context: NudgeContext): void {
  const ordered = [...channel].sort(
    (a, b) =>
      a.key - b.key ||
      context.order(items[a.item]!.edgeId) - context.order(items[b.item]!.edgeId) ||
      a.item - b.item ||
      a.segment - b.segment,
  );
  const fixed = ordered.filter((member) => member.fixed);
  const movable = ordered.filter((member) => !member.fixed);
  if (fixed.length > 0) {
    const fixedKey = fixed.reduce((sum, member) => sum + member.key, 0) / fixed.length;
    const below = movable.filter((member) => member.key < fixedKey);
    const above = movable.filter((member) => member.key >= fixedKey);
    // Nearest the fixed lane first, so the order away from it follows the keys.
    stackLanes([...below].reverse(), 1).forEach((level, index) => {
      below[below.length - 1 - index]!.lane = -level;
    });
    stackLanes(above, 1).forEach((level, index) => (above[index]!.lane = level));
  } else {
    const levels = stackLanes(movable, 0);
    const centre = Math.max(0, ...levels) / 2;
    levels.forEach((level, index) => (movable[index]!.lane = level - centre));
  }
}

/**
 * Interval colouring in key order: a member takes the level after the highest level of the
 * already stacked members it overlaps, else `base`. Members that do not overlap share a level,
 * so a long segment grouped with a row of short ones needs two lanes, not one per member, and
 * overlapping members keep their key order.
 */
function stackLanes(sequence: readonly Member[], base: number): number[] {
  const levels: number[] = [];
  sequence.forEach((member, index) => {
    let level = base;
    for (let at = 0; at < index; at += 1) {
      const other = sequence[at]!;
      if (Math.min(member.hi, other.hi) - Math.max(member.lo, other.lo) > EPSILON)
        level = Math.max(level, levels[at]! + 1);
    }
    levels.push(level);
  });
  return levels;
}

const SPACING_STEPS = [1, 0.75, 0.5, 0.25, 0.125];
/** Spacings that still read as separate lines; closer lanes first try the relaxed corridor. */
const READABLE_STEPS = [1, 0.75, 0.5];

/** `placeChannel` in the lanes' leg order, then mirrored: the order may pin a member to a wall. */
function placeEitherOrder(
  movable: Member[],
  fixedPresent: boolean,
  blocked: readonly Member[],
  edgeSpacing: number,
  steps: readonly number[],
): { spacing: number; shift: number } | undefined {
  const placement = placeChannel(movable, fixedPresent, blocked, edgeSpacing, steps);
  if (placement || movable.length < 2) return placement;
  for (const member of movable) member.lane = -member.lane;
  const mirrored = placeChannel(movable, fixedPresent, blocked, edgeSpacing, steps);
  if (!mirrored) for (const member of movable) member.lane = -member.lane;
  return mirrored;
}

/**
 * The widest spacing among `steps` and the smallest shift that keep every movable member
 * inside its bounds and at least that spacing away from every placed neighbour whose span
 * overlaps. A fixed member pins the shift to 0.
 */
function placeChannel(
  movable: Member[],
  fixedPresent: boolean,
  blocked: readonly Member[],
  edgeSpacing: number,
  steps: readonly number[],
  accept?: (shift: number) => boolean,
): { spacing: number; shift: number } | undefined {
  if (movable.length === 0) return undefined;
  const overlapping = (a: Member, b: Member): boolean =>
    Math.min(a.hi, b.hi) - Math.max(a.lo, b.lo) > EPSILON;
  for (const step of steps) {
    const spacing = edgeSpacing * step;
    let lowT = fixedPresent ? 0 : -Infinity;
    let highT = fixedPresent ? 0 : Infinity;
    for (const member of movable) {
      lowT = Math.max(lowT, member.minShift - member.lane * spacing);
      highT = Math.min(highT, member.maxShift - member.lane * spacing);
    }
    if (lowT > highT + EPSILON) continue;
    const candidates = [Math.min(Math.max(0, lowT), highT)];
    if (!fixedPresent)
      for (const member of movable)
        for (const other of blocked) {
          if (!overlapping(member, other)) continue;
          const base = other.position - member.coord - member.lane * spacing;
          candidates.push(base + spacing, base - spacing);
        }
    candidates.sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
    for (const shift of candidates) {
      if (shift < lowT - EPSILON || shift > highT + EPSILON) continue;
      let clear = true;
      for (const member of movable) {
        const position = member.coord + member.lane * spacing + shift;
        for (const other of blocked) {
          if (!overlapping(member, other)) continue;
          if (Math.abs(position - other.position) < spacing - EPSILON) {
            clear = false;
            break;
          }
        }
        if (!clear) break;
      }
      if (clear && (!accept || accept(shift))) return { spacing, shift };
    }
  }
  return undefined;
}

function lowerBoundNumber(values: ArrayLike<number>, value: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (values[mid]! < value) low = mid + 1;
    else high = mid;
  }
  return low;
}

function upperBoundNumber(values: readonly number[], value: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (values[mid]! <= value) low = mid + 1;
    else high = mid;
  }
  return low;
}

/**
 * Rebuilds a polyline after its segments along `axis` moved. A vertex between two moved runs
 * with different deltas (a stub and its straight continuation) becomes a jog.
 */
function applyShifts(
  points: readonly FlowPoint[],
  shifts: ReadonlyMap<number, number>,
  axis: 'x' | 'y',
  cross: 'x' | 'y',
): FlowPoint[] {
  const n = points.length;
  const runs = (segment: number): boolean => {
    if (segment < 0 || segment >= n - 1) return false;
    const p = points[segment]!;
    const q = points[segment + 1]!;
    return p[axis] === q[axis] && p[cross] !== q[cross];
  };
  const shifted = (point: FlowPoint, delta: number): FlowPoint =>
    axis === 'x' ? { x: point.x + delta, y: point.y } : { x: point.x, y: point.y + delta };
  const result: FlowPoint[] = [];
  for (let k = 0; k < n; k += 1) {
    const point = points[k]!;
    const before = runs(k - 1) ? (shifts.get(k - 1) ?? 0) : undefined;
    const after = runs(k) ? (shifts.get(k) ?? 0) : undefined;
    if (before !== undefined && after !== undefined && before !== after) {
      result.push(shifted(point, before), shifted(point, after));
      continue;
    }
    result.push(shifted(point, before ?? after ?? 0));
  }
  return simplifyOrthogonal(result);
}

/** Inserts the exit points so the stubs become their own (fixed) segments. */
export function splitStubs(points: readonly FlowPoint[], stub: number): FlowPoint[] {
  const copy = points.map((point) => ({ x: point.x, y: point.y }));
  if (stub <= 0 || copy.length < 2) return copy;
  const first = copy[0]!;
  const second = copy[1]!;
  const firstLength = Math.abs(second.x - first.x) + Math.abs(second.y - first.y);
  if (firstLength > stub + EPSILON) {
    const dx = Math.sign(second.x - first.x);
    const dy = Math.sign(second.y - first.y);
    copy.splice(1, 0, { x: first.x + dx * stub, y: first.y + dy * stub });
  }
  const last = copy[copy.length - 1]!;
  const beforeLast = copy[copy.length - 2]!;
  const lastLength = Math.abs(last.x - beforeLast.x) + Math.abs(last.y - beforeLast.y);
  if (lastLength > stub + EPSILON) {
    const dx = Math.sign(beforeLast.x - last.x);
    const dy = Math.sign(beforeLast.y - last.y);
    copy.splice(copy.length - 1, 0, { x: last.x + dx * stub, y: last.y + dy * stub });
  }
  return copy;
}

/** Builds the mutable nudge items for a set of routes (points copied, stubs split off). */
export function nudgeItems(routes: readonly FlowRoute[]): NudgeItem[] {
  return routes.map((route) => {
    const movable = !route.fallback && !route.selfLoop && route.points.length >= 2;
    return {
      edgeId: route.edgeId,
      points: movable ? splitStubs(route.points, route.stub) : route.points.slice(),
      movable,
      stub: route.stub,
      fixedPrefix: 1,
      fixedSuffix: 1,
    };
  });
}

/** Re-renders the moved items; untouched routes keep their identity. */
export function renderNudged(
  routes: readonly FlowRoute[],
  items: readonly NudgeItem[],
  moved: ReadonlySet<number>,
  context: Pick<FlowRouteContext, 'render'>,
): FlowRoute[] {
  return routes.map((route, index) => {
    if (!moved.has(index)) return route;
    const points = simplifyOrthogonal(items[index]!.points);
    const path = context.render(points, route.borderRadius);
    const hash = routeHash(path.kind, path.points, route.fallback, route.selfLoop);
    if (hash === route.hash) return route;
    return { ...route, ...path, hash };
  });
}

/** Passes alternate x (vertical runs) and y (horizontal runs) until nothing moves. */
export const NUDGE_ROUNDS = 3;

/** Nudges both axes, repeating while a pass introduced jogs the other axis must separate. */
export function nudgeRoutes(routes: readonly FlowRoute[], context: FlowRouteContext): FlowRoute[] {
  const items = nudgeItems(routes);
  const moved = new Set<number>();
  for (let round = 0; round < NUDGE_ROUNDS; round += 1) {
    const movedX = nudgeAxis(items, 'x', context);
    const movedY = nudgeAxis(items, 'y', context);
    for (const index of movedX) moved.add(index);
    for (const index of movedY) moved.add(index);
    if (movedX.size === 0 && movedY.size === 0) break;
  }
  return renderNudged(routes, items, moved, context);
}
