import { type PropertyDeclarations, type PropertyValues } from 'lit';
import { defaultTrue } from '../../foundation/converters.js';
import { formatDuration } from '../../foundation/duration-format.js';
import {
  timeRangeAvailability,
  type MediaAvailability,
} from '../../foundation/media/availability.js';
import { normalizeChapters, type MediaChapterRange } from '../../foundation/media/chapters.js';
import type { MediaMessagesResolver } from '../../foundation/media/messages.js';
import {
  seekableStart,
  timeRangeEnd,
  type MediaCue,
  type MediaState,
} from '../../foundation/media/state.js';
import type { MediaTimeRange } from '../../foundation/media/target.js';
import { sliderBufferEnd, sliderRatio } from '../../foundation/slider.js';
import type { ChangeReason } from '../../foundation/types.js';
import type { SliderBufferedRange, SliderSegment } from '../slider/types.js';
import { MediaSliderElement, type MediaSliderConfig } from './slider-base.js';

// ---------------------------------------------------------------------------------------------
// Pure time-slider policy (Library mp-l-time-slider)

/** Time-range bounds: the seekable start for live streams (else 0) to the time-range end. */
export interface MediaTimeBounds {
  readonly min: number;
  readonly max: number;
}

export function timeSliderBounds(
  state: Pick<MediaState, 'duration' | 'seekable' | 'streamType'>,
): MediaTimeBounds {
  const max = timeRangeEnd(state);
  const min = state.streamType === 'live' ? Math.min(seekableStart(state.seekable), max) : 0;
  return { min, max };
}

/**
 * `aria-valuetext`: `timePosition({current, duration})` with long duration phrases, only the
 * current phrase when the duration is infinite, and `timeUnknown` before metadata.
 */
export function timeSliderValueText(
  value: number,
  state: Pick<MediaState, 'duration' | 'seekable' | 'streamType'>,
  messages: Pick<MediaMessagesResolver, 'get'>,
  locale?: string | string[],
): string {
  const { min, max } = timeSliderBounds(state);
  if (!(max > min)) return messages.get('timeUnknown');
  const current = formatDuration(value, { style: 'long', locale });
  if (!Number.isFinite(state.duration)) return current;
  return messages.get('timePosition', {
    current,
    duration: formatDuration(max, { style: 'long', locale }),
  });
}

/**
 * The buffered range drawn by default: from the time-range start to the end of the buffered
 * range that contains `value`, else of the last range (Library mp-l-time-slider). Drawing every
 * range is a `partContracts` customization of the composed Slider.
 */
export function timeSliderBuffered(
  buffered: readonly MediaTimeRange[],
  value: number,
  bounds: MediaTimeBounds,
): { readonly ranges: readonly SliderBufferedRange[]; readonly end: number | null } {
  const finite = buffered.filter(
    ([start, end]) => Number.isFinite(start) && Number.isFinite(end) && end > start,
  );
  const end = sliderBufferEnd(finite, value);
  if (end === null || !(bounds.max > bounds.min)) return { ranges: [], end: null };
  const clamped = Math.min(bounds.max, Math.max(bounds.min, end));
  return { ranges: clamped > bounds.min ? [[bounds.min, clamped]] : [], end: clamped };
}

/** Normalized chapter ranges of the time range (`mp-f-chapters`); empty without cues. */
export function timeSliderChapters(
  cues: readonly MediaCue[],
  bounds: MediaTimeBounds,
): MediaChapterRange[] {
  if (!cues.length) return [];
  return normalizeChapters(cues, bounds.max, bounds.min);
}

/** Chapter ranges as Slider segments (the cue text is the segment label). */
export function chapterSegments(chapters: readonly MediaChapterRange[]): SliderSegment[] {
  return chapters.map((chapter) => ({
    start: chapter.start,
    end: chapter.end,
    ...(chapter.cue?.text ? { label: chapter.cue.text } : {}),
  }));
}

/**
 * Leading and trailing throttle (live seeking, `change-throttle`). The first call runs at once;
 * calls inside the window keep only the latest value, which runs when the window ends.
 */
export class LeadingTrailingThrottle<T> {
  #last = Number.NEGATIVE_INFINITY;
  #pending: { value: T } | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly run: (value: T) => void,
    private readonly interval: () => number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  call(value: T): void {
    const wait = Math.max(0, this.interval());
    const elapsed = this.now() - this.#last;
    if (wait === 0 || (elapsed >= wait && this.#timer === undefined)) {
      this.#last = this.now();
      this.run(value);
      return;
    }
    this.#pending = { value };
    this.#timer ??= setTimeout(() => this.#flush(), Math.max(0, wait - elapsed));
  }

  /** Drops a pending trailing call (a commit supersedes it). */
  cancel(): void {
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#pending = undefined;
  }

  #flush(): void {
    this.#timer = undefined;
    const pending = this.#pending;
    this.#pending = undefined;
    if (!pending) return;
    this.#last = this.now();
    this.run(pending.value);
  }
}

// ---------------------------------------------------------------------------------------------
// Preview source contract (shared with tp-media-time-slider-preview and pointer consumers)

/** Brand of elements that publish a preview time (`tp-media-time-slider` and its preview). */
export const mediaPreviewSourceBrand: unique symbol = Symbol.for('tweakpad.media-preview-source');

/** Event dispatched (not bubbling) on a preview source whenever its preview state changes. */
export const MEDIA_PREVIEW_CHANGE_EVENT = 'tp-media-preview-change';

export interface MediaPreviewDetail {
  /** Time under the pointer or drag, retained after leaving; `null` before any. */
  readonly time: number | null;
  /** The pointer is over the track, or a drag is in progress. */
  readonly previewing: boolean;
}

/** What a preview source exposes (see `MediaPreviewController` in `preview.ts`). */
export interface MediaPreviewSource extends HTMLElement {
  readonly [mediaPreviewSourceBrand]: true;
  /** Time under the pointer or drag (retained after leaving), or `null` before any. */
  readonly previewTime: number | null;
  /** 0–1 position of `previewTime` along the time range, or `null`. */
  readonly previewRatio: number | null;
  /** The pointer is over the track, or a drag is in progress. */
  readonly previewing: boolean;
  /** The slider has keyboard focus without pointing or dragging. */
  readonly keyboardInteraction: boolean;
  /** The displayed slider value (media time, or the drag value). */
  readonly sliderValue: number;
  /** The time-slider host that owns this preview source. */
  readonly timeSlider: TpMediaTimeSlider | null;
}

// ---------------------------------------------------------------------------------------------
// Element

/**
 * `tp-media-time-slider`: the seek timeline (Library mp-l-sliders, mp-l-time-slider) composing
 * `tp-slider`.
 *
 * - Range: `min` is the seekable start for live streams (0 otherwise), `max` the duration or
 *   seekable end. Before metadata the range is indeterminate (disabled, value text
 *   `timeUnknown`, no diagnostic). Live without DVR hides it; DVR bounds update silently.
 * - Steps: `step` 1 s, `large-step` 10 s. Seeks on commit (key press, release); `live-seek`
 *   also seeks during a drag, throttled by `change-throttle` (100 ms, leading and trailing).
 *   `pause-on-drag` pauses at drag start and resumes at the end if playback was running.
 * - Label `seek`; value text "current of duration" in long phrases (current only for infinite
 *   duration); value changes are never announced through a live region.
 * - The timeline stays chronological left-to-right in RTL documents (`dir="ltr"` on the
 *   composed Slider only); the host layout still follows the document direction.
 * - One buffered range (start to the end of the range containing the current time) and, with
 *   `show-chapters` and a chapters track, one aria-hidden `slider-chapter` per chapter.
 * - Publishes `--tp-media-slider-fill`, `--tp-media-slider-pointer`, `--tp-media-slider-buffer`
 *   and `data-dragging`, `data-pointing`, `data-interactive`, `data-seeking`, `data-disabled`,
 *   `data-availability`; it is a preview source for `tp-media-time-slider-preview`.
 *
 * @fires tp-value-change - Re-emitted cancelable Slider proposal (`detail.value` in seconds).
 * @fires tp-value-commit - Re-emitted Slider commit.
 * @fires tp-media-preview-change - Preview time/state changed (not bubbling).
 * @csspart slider - Forwarded Slider root; also `slider-track`, `slider-range`, `slider-buffer`,
 *   `slider-chapter` and `slider-thumb`.
 * @slot - A `tp-media-time-slider-preview`.
 */
export class TpMediaTimeSlider extends MediaSliderElement implements MediaPreviewSource {
  static tagName = 'tp-media-time-slider';

  static override properties: PropertyDeclarations = {
    ...MediaSliderElement.properties,
    step: { type: Number },
    largeStep: { type: Number, attribute: 'large-step' },
    liveSeek: { type: Boolean, attribute: 'live-seek' },
    changeThrottle: { type: Number, attribute: 'change-throttle' },
    pauseOnDrag: { type: Boolean, attribute: 'pause-on-drag' },
    showChapters: {
      type: Boolean,
      attribute: 'show-chapters',
      converter: defaultTrue,
    },
  };

  readonly [mediaPreviewSourceBrand] = true as const;

  /** Arrow-key step in seconds. */
  step = 1;
  /** Page Up/Down and Shift+Arrow step in seconds. */
  largeStep = 10;
  /** Also seek during a drag (throttled by `changeThrottle`). */
  liveSeek = false;
  /** Leading and trailing live-seek throttle in milliseconds. */
  changeThrottle = 100;
  /** Pause while dragging and resume afterwards if playback was running. */
  pauseOnDrag = false;
  /** Render chapter segments when a chapters track exists (`show-chapters="false"` hides). */
  showChapters = true;

  readonly #time = this.select((state) => ({
    currentTime: state.currentTime,
    duration: state.duration,
    seekable: state.seekable,
    streamType: state.streamType,
    dvr: state.dvr,
    seeking: state.seeking,
    buffered: state.buffered,
    chapters: state.chapters,
    paused: state.paused,
  }));
  /** The value while a press is in progress. */
  #interaction: number | undefined;
  /** A committed seek target shown until the seek settles (no snap-back). */
  #committed: number | undefined;
  #resumeAfterDrag = false;
  #dragStarted = false;
  #preview: MediaPreviewDetail & { ratio: number | null; keyboard: boolean; value: number } = {
    time: null,
    ratio: null,
    previewing: false,
    keyboard: false,
    value: 0,
  };
  readonly #throttle = new LeadingTrailingThrottle<{ value: number; reason: ChangeReason }>(
    ({ value, reason }) => void this.#seek(value, reason, undefined, false),
    () => (Number.isFinite(this.changeThrottle) ? this.changeThrottle : 100),
  );

  get timeSlider(): TpMediaTimeSlider {
    return this;
  }

  get previewTime(): number | null {
    return this.#preview.time;
  }

  get previewRatio(): number | null {
    return this.#preview.ratio;
  }

  get previewing(): boolean {
    return this.#preview.previewing;
  }

  get keyboardInteraction(): boolean {
    return this.#preview.keyboard;
  }

  get sliderValue(): number {
    return this.#displayValue(timeSliderBounds(this.#time.value));
  }

  /** The current time-range bounds. */
  get bounds(): MediaTimeBounds {
    return timeSliderBounds(this.#time.value);
  }

  override disconnectedCallback(): void {
    this.#throttle.cancel();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    const state = this.#time.value;
    const seek = this.player?.requestAvailability('seek');
    const feature: MediaAvailability =
      seek === 'unsupported' ? 'unsupported' : timeRangeAvailability(state);
    this.controlAvailability(feature);
  }

  protected sliderConfig(): MediaSliderConfig {
    const state = this.#time.value;
    const bounds = timeSliderBounds(state);
    const value = this.#displayValue(bounds);
    const buffer = timeSliderBuffered(state.buffered, state.currentTime, bounds);
    const chapters = this.showChapters ? timeSliderChapters(state.chapters, bounds) : [];
    const messages = this.mediaMessages;
    const locale = this.mediaLocale;
    return {
      minimum: bounds.min,
      maximum: bounds.max,
      step: Number.isFinite(this.step) && this.step > 0 ? this.step : 1,
      largeStep: Number.isFinite(this.largeStep) && this.largeStep > 0 ? this.largeStep : 10,
      value,
      label: messages.get('seek'),
      valueText: (current) => timeSliderValueText(current, state, messages, locale),
      indeterminateText: messages.get('timeUnknown'),
      buffered: buffer.ranges,
      segments: chapterSegments(chapters),
      orientation: 'horizontal',
      direction: 'ltr',
      disabled: this.availability?.disabled ?? true,
      fill: sliderRatio(value, bounds.min, bounds.max) * 100,
      buffer: buffer.end === null ? 0 : sliderRatio(buffer.end, bounds.min, bounds.max) * 100,
    };
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.toggleAttribute('data-seeking', this.#time.value.seeking);
    this.#publishPreview();
  }

  protected override valueChanged(value: number, reason: ChangeReason): void {
    if (!this.pressed) return;
    this.#interaction = value;
    if (reason === 'drag' && !this.#dragStarted) this.#dragStart();
    if (this.liveSeek) this.#throttle.call({ value, reason });
  }

  protected override valueCommitted(value: number, reason: ChangeReason, source: Event): void {
    this.#throttle.cancel();
    this.#interaction = undefined;
    void this.#seek(value, reason, source, true);
  }

  protected override pressEnded(): void {
    this.#interaction = undefined;
    this.#dragStarted = false;
    if (this.#resumeAfterDrag) {
      this.#resumeAfterDrag = false;
      this.request('play', undefined, { reason: 'drag' }).catch(() => undefined);
    }
  }

  #dragStart(): void {
    this.#dragStarted = true;
    this.#resumeAfterDrag = false;
    if (this.pauseOnDrag && !this.#time.value.paused) {
      this.#resumeAfterDrag = true;
      this.request('pause', undefined, { reason: 'drag' }).catch(() => undefined);
    }
  }

  #displayValue(bounds: MediaTimeBounds): number {
    const value = this.#interaction ?? this.#committed ?? this.#time.value.currentTime;
    if (!(bounds.max > bounds.min)) return bounds.min;
    return Math.min(bounds.max, Math.max(bounds.min, Number.isFinite(value) ? value : bounds.min));
  }

  async #seek(
    value: number,
    reason: ChangeReason,
    source: Event | undefined,
    commit: boolean,
  ): Promise<void> {
    if (commit) this.#committed = value;
    try {
      await this.request('seek', value, { reason, ...(source ? { sourceEvent: source } : {}) });
    } catch {
      // The failure is published as `tp-media-request-failed`.
    } finally {
      if (commit && Object.is(this.#committed, value)) {
        this.#committed = undefined;
        if (this.isConnected) this.requestUpdate();
      }
    }
  }

  /** Recomputes preview state and notifies preview consumers when it changed. */
  #publishPreview(): void {
    const bounds = timeSliderBounds(this.#time.value);
    const dragging = this.dragging;
    const pointing = this.pointing;
    const previous = this.#preview;
    let time = previous.time;
    if (dragging && this.#interaction !== undefined) time = this.#interaction;
    else if (pointing && this.pointerValue !== null) time = this.pointerValue;
    const ratio = time === null ? null : sliderRatio(time, bounds.min, bounds.max);
    const keyboard =
      this.hasAttribute('data-interactive') && !pointing && !dragging && !this.pressed;
    const next = {
      time,
      ratio,
      previewing: dragging || pointing,
      keyboard,
      value: this.#displayValue(bounds),
    };
    if (
      Object.is(next.time, previous.time) &&
      Object.is(next.ratio, previous.ratio) &&
      next.previewing === previous.previewing &&
      next.keyboard === previous.keyboard &&
      Object.is(next.value, previous.value)
    )
      return;
    this.#preview = next;
    this.dispatchEvent(
      new CustomEvent<MediaPreviewDetail>(MEDIA_PREVIEW_CHANGE_EVENT, {
        detail: { time: next.time, previewing: next.previewing },
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-media-time-slider': TpMediaTimeSlider;
  }
}
