/**
 * Pure feedback-indicator logic (Library mp-l-feedback; Video.js `core/ui/indicator`,
 * `status-indicator`, `seek-indicator`, `volume-indicator`). Every function reads the media state
 * snapshot taken *before* the key-binding or gesture request executes and predicts its outcome.
 */
import { captionsAvailability } from '../../foundation/media/availability.js';
import { formatDuration } from '../../foundation/duration-format.js';
import { formatMediaPercent, type MediaMessagesResolver } from '../../foundation/media/messages.js';
import { UNMUTE_VOLUME, type MediaRequestAction } from '../../foundation/media/requests.js';
import {
  timeRangeEnd,
  volumeLevel,
  type MediaState,
  type MediaVolumeLevel,
} from '../../foundation/media/state.js';

/** Default indicator close delay in milliseconds. */
export const MEDIA_INDICATOR_CLOSE_DELAY = 800;
/** How long `data-min`/`data-max` stay after a step at a volume limit. */
export const MEDIA_VOLUME_BOUNDARY_DELAY = 300;

/** A key-binding or gesture request the indicators react to. */
export interface MediaInputAction {
  readonly action: MediaRequestAction;
  readonly value: unknown;
  readonly reason: 'hotkey' | 'gesture';
  /** A held key auto-repeat (`KeyboardEvent.repeat`). */
  readonly repeat: boolean;
}

/** Parses an `actions` filter (space- or comma-separated request action names). */
export function parseIndicatorActions(value: string | null | undefined): readonly string[] | null {
  const list = (value ?? '')
    .split(/[\s,]+/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return list.length ? list : null;
}

/** Whether `action` passes the optional filter. */
export function indicatorActionIncluded(
  action: string,
  filter: readonly string[] | null | undefined,
): boolean {
  return !filter || filter.includes(action);
}

// ---------------------------------------------------------------------------------------------
// Volume prediction

const VOLUME_ACTIONS = new Set<MediaRequestAction>([
  'toggle-muted',
  'set-muted',
  'step-volume',
  'set-volume',
]);

export function isVolumeIndicatorAction(action: MediaRequestAction): boolean {
  return VOLUME_ACTIONS.has(action);
}

export interface MediaVolumePrediction {
  readonly previousVolume: number;
  readonly volume: number;
  readonly muted: boolean;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * The volume and muted state a volume request leaves behind, mirroring the request pipeline:
 * a positive volume unmutes; unmuting at zero restores `UNMUTE_VOLUME`; `toggle-muted` treats
 * zero volume as muted.
 */
export function predictVolume(
  input: Pick<MediaInputAction, 'action' | 'value'>,
  snapshot: Pick<MediaState, 'volume' | 'muted'>,
): MediaVolumePrediction | null {
  const previousVolume = clamp01(finiteNumber(snapshot.volume) ?? 0);
  const muted = snapshot.muted === true;
  const unmute = (volume: number): MediaVolumePrediction => ({
    previousVolume,
    volume: volume <= 0 ? UNMUTE_VOLUME : volume,
    muted: false,
  });
  switch (input.action) {
    case 'toggle-muted':
      return muted || previousVolume <= 0
        ? unmute(previousVolume)
        : { previousVolume, volume: previousVolume, muted: true };
    case 'set-muted':
      return input.value
        ? { previousVolume, volume: previousVolume, muted: true }
        : unmute(previousVolume);
    case 'step-volume':
    case 'set-volume': {
      const amount = finiteNumber(input.value);
      if (amount === null) return null;
      const volume = clamp01(input.action === 'step-volume' ? previousVolume + amount : amount);
      return { previousVolume, volume, muted: muted && volume <= 0 };
    }
    default:
      return null;
  }
}

export interface MediaVolumeIndicatorDetails {
  /** The four-level volume vocabulary shared with the mute button. */
  readonly level: MediaVolumeLevel;
  /** Fill ratio 0–1 (0 while muted). */
  readonly fill: number;
  /** Percent text, `0%` while muted. */
  readonly value: string;
  /** A step that could not move past a limit. */
  readonly boundary: 'min' | 'max' | null;
}

export function volumeIndicatorDetails(
  input: Pick<MediaInputAction, 'action' | 'value'>,
  snapshot: Pick<MediaState, 'volume' | 'muted'>,
  locale?: string,
): MediaVolumeIndicatorDetails | null {
  const prediction = predictVolume(input, snapshot);
  if (!prediction) return null;
  const fill = prediction.muted ? 0 : prediction.volume;
  const step = input.action === 'step-volume' ? finiteNumber(input.value) : null;
  const boundary =
    step && prediction.volume === prediction.previousVolume ? (step < 0 ? 'min' : 'max') : null;
  return {
    level: volumeLevel(prediction.volume, prediction.muted),
    fill,
    value: formatMediaPercent(fill, locale),
    boundary,
  };
}

// ---------------------------------------------------------------------------------------------
// Status

export type MediaIndicatorStatus =
  | 'play'
  | 'pause'
  | 'volume-off'
  | 'volume-low'
  | 'volume-high'
  | 'captions-on'
  | 'captions-off'
  | 'fullscreen'
  | 'exit-fullscreen'
  | 'pip'
  | 'exit-pip';

export interface MediaStatusDetails {
  readonly status: MediaIndicatorStatus;
  /** Spoken-style label (`statusPaused`, `statusMuted`, …). */
  readonly label: string;
  /** A value shown instead of the label (volume percent), else `null`. */
  readonly value: string | null;
}

function nextToggle(
  action: MediaRequestAction,
  value: unknown,
  current: boolean,
  request: MediaRequestAction,
  exit: MediaRequestAction,
): boolean {
  if (action === request) return true;
  if (action === exit) return false;
  return typeof value === 'boolean' ? value : !current;
}

/** Status shown for a request, from the pre-action snapshot; `null` when it has no status. */
export function statusIndicatorDetails(
  input: Pick<MediaInputAction, 'action' | 'value'>,
  snapshot: MediaState,
  messages: MediaMessagesResolver,
  locale?: string,
): MediaStatusDetails | null {
  switch (input.action) {
    case 'play':
    case 'pause':
    case 'toggle-paused': {
      const playing =
        input.action === 'play' ||
        (input.action === 'toggle-paused' && (snapshot.paused || snapshot.ended));
      return playing
        ? { status: 'play', label: messages.get('statusPlaying'), value: null }
        : { status: 'pause', label: messages.get('statusPaused'), value: null };
    }
    case 'toggle-muted':
    case 'set-muted':
    case 'step-volume':
    case 'set-volume': {
      const volume = volumeIndicatorDetails(input, snapshot, locale);
      if (!volume) return null;
      const status: MediaIndicatorStatus =
        volume.level === 'off'
          ? 'volume-off'
          : volume.level === 'low'
            ? 'volume-low'
            : 'volume-high';
      return {
        status,
        label:
          volume.level === 'off'
            ? messages.get('statusMuted')
            : messages.get('statusVolume', { percent: volume.value }),
        value: volume.value,
      };
    }
    case 'toggle-captions': {
      if (captionsAvailability(snapshot) !== 'available') return null;
      const on = typeof input.value === 'boolean' ? input.value : !snapshot.captionsShowing;
      return on
        ? { status: 'captions-on', label: messages.get('statusCaptionsOn'), value: null }
        : { status: 'captions-off', label: messages.get('statusCaptionsOff'), value: null };
    }
    case 'request-fullscreen':
    case 'exit-fullscreen':
    case 'toggle-fullscreen': {
      const on = nextToggle(
        input.action,
        input.value,
        snapshot.fullscreen,
        'request-fullscreen',
        'exit-fullscreen',
      );
      return on
        ? { status: 'fullscreen', label: messages.get('statusFullscreen'), value: null }
        : { status: 'exit-fullscreen', label: messages.get('statusExitFullscreen'), value: null };
    }
    case 'request-picture-in-picture':
    case 'exit-picture-in-picture':
    case 'toggle-picture-in-picture': {
      const on = nextToggle(
        input.action,
        input.value,
        snapshot.pictureInPicture,
        'request-picture-in-picture',
        'exit-picture-in-picture',
      );
      return on
        ? { status: 'pip', label: messages.get('statusPictureInPicture'), value: null }
        : { status: 'exit-pip', label: messages.get('statusExitPictureInPicture'), value: null };
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Seek

export type MediaIndicatorDirection = 'forward' | 'backward';

export function isSeekIndicatorAction(action: MediaRequestAction): boolean {
  return action === 'seek-by' || action === 'seek-to-percent';
}

/** Accumulated seek feedback. */
export interface MediaSeekIndicatorState {
  readonly direction: MediaIndicatorDirection | null;
  /** Steps accumulated in this burst. */
  readonly count: number;
  /** Absolute seconds accumulated (`seek-by`), clamped so origin ± total stays in `[0, duration]`. */
  readonly total: number;
  /** Position when the burst started. */
  readonly origin: number;
  /** The text shown: accumulated seconds (`+10 s`-style unit text) or the target clock time. */
  readonly value: string;
}

/**
 * The next seek feedback. A `seek-by` in the same direction while the indicator is open adds to
 * the burst; the total never exceeds the room between the burst origin and `0` or the duration.
 * `seek-to-percent` shows the target time. Returns `null` when the request has no direction.
 */
export function nextSeekIndicatorState(
  current: MediaSeekIndicatorState | null,
  open: boolean,
  input: Pick<MediaInputAction, 'action' | 'value'>,
  snapshot: Pick<MediaState, 'currentTime' | 'duration' | 'seekable'>,
  locale?: string,
): MediaSeekIndicatorState | null {
  const duration = timeRangeEnd(snapshot);
  const position = Number.isFinite(snapshot.currentTime) ? snapshot.currentTime : 0;
  const amount = finiteNumber(input.value);
  if (amount === null) return null;
  if (input.action === 'seek-to-percent') {
    if (duration <= 0) return null;
    const target = (Math.min(100, Math.max(0, amount)) / 100) * duration;
    if (target === position) return null;
    return {
      direction: target > position ? 'forward' : 'backward',
      count: 1,
      total: Math.abs(target - position),
      origin: position,
      value: formatDuration(target, { guide: duration }, locale),
    };
  }
  if (input.action !== 'seek-by' || amount === 0) return null;
  const direction: MediaIndicatorDirection = amount > 0 ? 'forward' : 'backward';
  const burst = open && current?.direction === direction && current.count > 0;
  const origin = burst ? current.origin : position;
  const previous = burst ? current.total : 0;
  const room =
    direction === 'backward'
      ? Math.max(0, origin)
      : duration > 0
        ? Math.max(0, duration - origin)
        : Number.POSITIVE_INFINITY;
  const total = Math.min(previous + Math.abs(amount), room);
  return {
    direction,
    count: burst ? current.count + 1 : 1,
    total,
    origin,
    value: new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'second',
      unitDisplay: 'narrow',
      useGrouping: false,
      maximumFractionDigits: 1,
    }).format(total),
  };
}

// ---------------------------------------------------------------------------------------------
// One visible indicator per player

export interface MediaIndicatorHandle {
  close(): void;
}

const coordinators = new WeakMap<object, Set<MediaIndicatorHandle>>();

/** Registers an indicator with its player's coordinator; returns the unregistration. */
export function registerMediaIndicator(owner: object, handle: MediaIndicatorHandle): () => void {
  let handles = coordinators.get(owner);
  if (!handles) coordinators.set(owner, (handles = new Set()));
  handles.add(handle);
  return () => handles.delete(handle);
}

/** Closes every other indicator of `owner` so only `handle` is visible. */
export function showMediaIndicator(owner: object, handle: MediaIndicatorHandle): void {
  for (const other of coordinators.get(owner) ?? []) if (other !== handle) other.close();
}
