/**
 * Pure time-display logic (Library mp-l-time, Foundation mp-f-locale; Video.js
 * `core/ui/time/core.ts`). Clock text is digital with the duration as the layout guide; spoken text
 * uses long unit phrases; `datetime` is an ISO 8601 duration of the absolute value.
 */
import { formatDuration, secondsToIsoDuration } from '../../foundation/duration-format.js';
import type { MediaMessagesResolver } from '../../foundation/media/messages.js';
import { timeRangeEnd, type MediaState } from '../../foundation/media/state.js';

export type MediaTimeType = 'current' | 'duration' | 'remaining' | 'pointer';
/** The type a toggle currently shows. */
export type MediaTimeShown = 'current' | 'duration' | 'remaining';

export const MEDIA_TIME_TYPES: readonly MediaTimeType[] = [
  'current',
  'duration',
  'remaining',
  'pointer',
];

export function normalizeMediaTimeType(value: unknown): MediaTimeType {
  return MEDIA_TIME_TYPES.includes(value as MediaTimeType) ? (value as MediaTimeType) : 'current';
}

export interface MediaTimeInput {
  readonly type: MediaTimeType | MediaTimeShown;
  /** Time-range end (duration, else seekable end, else 0). */
  readonly duration: number;
  readonly currentTime: number;
  /**
   * A position that replaces `currentTime` (current, remaining) or supplies the pointer time
   * (`pointer`); `null` means none.
   */
  readonly value?: number | null | undefined;
  readonly locale?: string | undefined;
}

export interface MediaTimeView {
  /** Signed seconds shown (negative for remaining time before the end). */
  readonly seconds: number;
  /** Remaining time before the end: the sign is rendered (`aria-hidden`). */
  readonly negative: boolean;
  /** Digital clock text of the absolute value (`1:05`, `01:05`, `1:01:05`). */
  readonly text: string;
  /** Long spoken phrase of the absolute value ("1 minute, 5 seconds"). */
  readonly phrase: string;
  /** ISO 8601 duration of the absolute value (`PT1M5S`). */
  readonly datetime: string;
  /** No time range (or no pointer value): the value is unknown. */
  readonly unavailable: boolean;
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** The time-range end of a media state (`timeRangeEnd`). */
export function mediaTimeDuration(state: Pick<MediaState, 'duration' | 'seekable'>): number {
  return timeRangeEnd(state);
}

/** Seconds, text, phrase and `datetime` for one time type. */
export function mediaTimeView(input: MediaTimeInput): MediaTimeView {
  const duration = Number.isFinite(input.duration) && input.duration > 0 ? input.duration : 0;
  const override = finiteOrNull(input.value);
  const position = override ?? (Number.isFinite(input.currentTime) ? input.currentTime : 0);
  let seconds: number;
  let unavailable = duration <= 0;
  switch (input.type) {
    case 'duration':
      seconds = duration;
      break;
    case 'remaining':
      seconds = Math.min(0, position - duration);
      break;
    case 'pointer':
      seconds = override ?? 0;
      unavailable ||= override === null;
      break;
    default:
      seconds = position;
  }
  const absolute = Math.abs(seconds);
  return {
    seconds,
    negative: input.type === 'remaining' && seconds < 0,
    text: formatDuration(absolute, { guide: duration }, input.locale),
    phrase: formatDuration(absolute, { style: 'long' }, input.locale),
    datetime: secondsToIsoDuration(absolute),
    unavailable,
  };
}

/**
 * The type a toggle shows next (Video.js `TimeCore#getToggleType`): current ↔ remaining for
 * `type="current"`; duration ↔ remaining for `type="duration"` and `type="remaining"` (which
 * starts on remaining).
 */
export function nextMediaTimeShown(type: MediaTimeType, shown: MediaTimeShown): MediaTimeShown {
  if (type === 'current' || type === 'pointer')
    return shown === 'remaining' ? 'current' : 'remaining';
  return shown === 'duration' ? 'remaining' : 'duration';
}

/** The type shown initially by a toggle (or a plain display). */
export function initialMediaTimeShown(type: MediaTimeType): MediaTimeShown {
  return type === 'duration' || type === 'remaining' ? type : 'current';
}

/** Accessible name of a plain (non-toggle) time display. */
export function mediaTimeLabel(
  type: MediaTimeType,
  view: Pick<MediaTimeView, 'unavailable'>,
  messages: MediaMessagesResolver,
): string {
  if (view.unavailable) return messages.get('timeUnknown');
  switch (type) {
    case 'duration':
      return messages.get('duration');
    case 'remaining':
      return messages.get('remainingTime');
    default:
      return messages.get('currentTime');
  }
}

export interface MediaTimeToggleText {
  readonly label: string;
  readonly description: string | null;
}

/**
 * Name and description of the toggle button (Video.js `TimeCore#getLabel`/`getDescription`). The
 * name says what activation shows and describes the value shown now with a suffix:
 * current → "Show remaining time, 1 minute elapsed."; remaining (type `current`) → "Show elapsed
 * time, 4 minutes remaining."; remaining (type `duration`/`remaining`) → "Show duration,
 * 4 minutes remaining."; duration → "Show remaining time, 5 minutes duration.". The description
 * is `toggleTimeDescription` for `type="current"`, else `toggleDurationDescription`.
 * Unavailable: `timeUnknown` and no description.
 */
export function mediaTimeToggleText(
  type: MediaTimeType,
  shown: MediaTimeShown,
  view: Pick<MediaTimeView, 'unavailable' | 'phrase'>,
  messages: MediaMessagesResolver,
): MediaTimeToggleText {
  if (view.unavailable) return { label: messages.get('timeUnknown'), description: null };
  const description = messages.get(
    type === 'current' || type === 'pointer'
      ? 'toggleTimeDescription'
      : 'toggleDurationDescription',
  );
  const next = nextMediaTimeShown(type, shown);
  const duration = view.phrase;
  const value =
    shown === 'current'
      ? messages.get('elapsedSuffix', { duration })
      : shown === 'remaining'
        ? messages.get('remainingSuffix', { duration })
        : messages.get('durationSuffix', { duration });
  const key =
    next === 'remaining' ? 'showRemaining' : next === 'current' ? 'showElapsed' : 'showDuration';
  return { label: messages.get(key, { duration: value }), description };
}
