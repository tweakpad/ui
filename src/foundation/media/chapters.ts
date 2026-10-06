import type { MediaCue } from './state.js';
import type { TextCueListLike } from './target.js';

/** One contiguous chapter range of the time range (`mp-f-chapters`). */
export interface MediaChapterRange {
  /** Stable key: `cue-<id>-<start>-<text>` for cues, `gap-…` for untitled gaps. */
  readonly key: string;
  readonly start: number;
  readonly end: number;
  /** The chapter cue, or `null` for an untitled gap. */
  readonly cue: MediaCue | null;
}

/**
 * Plain cue data from a cue list with every end clamped to a finite positive duration. An
 * open-ended last chapter (engines encode it as a huge end) then ends with the media.
 */
export function clampCuesToDuration(
  cues: TextCueListLike | readonly MediaCue[] | null | undefined,
  duration: number,
): MediaCue[] {
  if (!cues) return [];
  const max = Number.isFinite(duration) && duration > 0 ? duration : Number.POSITIVE_INFINITY;
  const result: MediaCue[] = [];
  for (let index = 0; index < cues.length; index++) {
    const cue = (cues as ArrayLike<MediaCue | undefined>)[index];
    if (!cue) continue;
    result.push({
      ...(cue.id ? { id: cue.id } : {}),
      startTime: cue.startTime,
      endTime: Math.min(cue.endTime, max),
      text: cue.text ?? '',
    });
  }
  return result;
}

function cueKey(cue: MediaCue, seen: Map<string, number>): string {
  const base = `cue-${cue.id ? `${cue.id}-` : ''}${cue.startTime}-${cue.text}`;
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count ? `${base}-${count}` : base;
}

/**
 * Normalizes chapter cues into an ordered, non-overlapping, contiguous partition of
 * `[min, max]`: non-finite cues are removed, cues are sorted by start (stable), clamped to the
 * range, overlaps are trimmed and untitled gaps fill the holes. Each range has a stable key.
 * An empty or invalid range yields `[]`; no usable cue yields one untitled gap.
 */
export function normalizeChapters(
  cues: readonly MediaCue[],
  max: number,
  min = 0,
): MediaChapterRange[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [];
  const seen = new Map<string, number>();
  const sorted = cues
    .map((cue, index) => ({ cue, index, key: cueKey(cue, seen) }))
    .filter(({ cue }) => Number.isFinite(cue.startTime) && Number.isFinite(cue.endTime))
    .sort((a, b) => a.cue.startTime - b.cue.startTime || a.index - b.index);
  const chapters: MediaChapterRange[] = [];
  let end = min;
  let previousKey = 'start';
  for (const { cue, key } of sorted) {
    const start = Math.max(min, cue.startTime);
    const cueEnd = Math.min(max, cue.endTime);
    if (cueEnd <= start) continue;
    if (start > end)
      chapters.push({ key: `gap-${previousKey}-${key}`, start: end, end: start, cue: null });
    const segmentStart = Math.max(start, end);
    if (cueEnd <= segmentStart) continue;
    chapters.push({ key, start: segmentStart, end: cueEnd, cue });
    end = cueEnd;
    previousKey = key;
  }
  if (!chapters.length) return [{ key: 'gap-start-end', start: min, end: max, cue: null }];
  if (end < max) chapters.push({ key: `gap-${previousKey}-end`, start: end, end: max, cue: null });
  return chapters;
}

/** The chapter containing `time` (a range's end belongs to the next range, except the last). */
export function findChapter(
  chapters: readonly MediaChapterRange[],
  time: number,
): MediaChapterRange | undefined {
  if (!Number.isFinite(time)) return undefined;
  const last = chapters.at(-1);
  if (last && time === last.end) return last;
  return chapters.find((chapter) => time >= chapter.start && time < chapter.end);
}
