import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMediaMessages } from '../../foundation/media/messages.js';
import { ThumbnailSourceMemory, resolveThumbnails } from '../../foundation/media/thumbnails.js';
import type { MediaCue, MediaState } from '../../foundation/media/state.js';
import { computeSurfacePosition, rect } from '../../foundation/positioning.js';
import { DEFAULT_MEDIA_STATE } from './context.js';
import { chapterTitleAt } from './chapter-title.js';
import { previewAnchorRect, previewPositioning } from './preview.js';
import { parseThumbnailConstraints, selectThumbnail, thumbnailLayout } from './thumbnail.js';
import {
  LeadingTrailingThrottle,
  chapterSegments,
  timeSliderBounds,
  timeSliderBuffered,
  timeSliderChapters,
  timeSliderValueText,
} from './time-slider.js';
import {
  volumeEffectivelyMuted,
  volumeSliderValue,
  volumeSliderValueText,
  wheelSteppedValue,
} from './volume-slider.js';
import { volumePopupUsable } from './volume-popover.js';

const messages = createMediaMessages();
const state = (patch: Partial<MediaState>): MediaState => ({ ...DEFAULT_MEDIA_STATE, ...patch });

describe('time slider range (Library mp-l-time-slider; V-54, V-39)', () => {
  it('spans 0..duration on demand and is empty before metadata', () => {
    expect(timeSliderBounds(state({ duration: 120 }))).toEqual({ min: 0, max: 120 });
    expect(timeSliderBounds(state({}))).toEqual({ min: 0, max: 0 });
  });

  it('spans the seekable window for live DVR', () => {
    const live = state({
      duration: Number.POSITIVE_INFINITY,
      seekable: [[3600, 5400]],
      streamType: 'live',
    });
    expect(timeSliderBounds(live)).toEqual({ min: 3600, max: 5400 });
  });
});

describe('time slider value text (no live region; long phrases)', () => {
  it('says current of duration, current only when infinite, unknown before metadata', () => {
    expect(timeSliderValueText(65, state({ duration: 600 }), messages, 'en')).toBe(
      '1 minute, 5 seconds of 10 minutes',
    );
    const live = state({
      duration: Number.POSITIVE_INFINITY,
      seekable: [[0, 300]],
      streamType: 'live',
    });
    expect(timeSliderValueText(90, live, messages, 'en')).toBe('1 minute, 30 seconds');
    expect(timeSliderValueText(0, state({}), messages, 'en')).toBe(
      'Media not loaded, unknown time.',
    );
  });
});

describe('time slider buffer and chapters', () => {
  const bounds = { min: 0, max: 100 };

  it('draws one range to the end of the range containing the time, else the last', () => {
    expect(
      timeSliderBuffered(
        [
          [0, 10],
          [20, 40],
        ],
        25,
        bounds,
      ),
    ).toEqual({
      ranges: [[0, 40]],
      end: 40,
    });
    expect(
      timeSliderBuffered(
        [
          [0, 10],
          [20, 40],
        ],
        15,
        bounds,
      ),
    ).toEqual({
      ranges: [[0, 40]],
      end: 40,
    });
    expect(
      timeSliderBuffered(
        [
          [0, 10],
          [20, 40],
        ],
        5,
        bounds,
      ),
    ).toEqual({
      ranges: [[0, 10]],
      end: 10,
    });
    expect(timeSliderBuffered([], 5, bounds)).toEqual({ ranges: [], end: null });
    expect(timeSliderBuffered([[0, 10]], 5, { min: 0, max: 0 })).toEqual({ ranges: [], end: null });
  });

  const cues: MediaCue[] = [
    { startTime: 10, endTime: 40, text: 'Middle' },
    { startTime: 0, endTime: 15, text: 'Intro' },
    { startTime: 80, endTime: 1e9, text: 'End' },
  ];

  it('normalizes chapters into contiguous segments labelled by cue text', () => {
    const chapters = timeSliderChapters(cues, bounds);
    expect(chapterSegments(chapters)).toEqual([
      { start: 0, end: 15, label: 'Intro' },
      { start: 15, end: 40, label: 'Middle' },
      { start: 40, end: 80 },
      { start: 80, end: 100, label: 'End' },
    ]);
    expect(timeSliderChapters([], bounds)).toEqual([]);
  });

  it('resolves the chapter title at a time (untitled gaps are empty)', () => {
    const media = state({ duration: 100, chapters: cues });
    expect(chapterTitleAt(cues, media, 12)).toBe('Intro');
    expect(chapterTitleAt(cues, media, 15)).toBe('Middle');
    expect(chapterTitleAt(cues, media, 50)).toBe('');
    expect(chapterTitleAt(cues, media, 100)).toBe('End');
    expect(chapterTitleAt(cues, media, null)).toBe('');
  });
});

describe('live-seek throttle (change-throttle, leading and trailing)', () => {
  afterEach(() => vi.useRealTimers());

  it('runs the first call, then only the latest at the end of the window', () => {
    vi.useFakeTimers();
    const runs: number[] = [];
    const throttle = new LeadingTrailingThrottle<number>(
      (value) => runs.push(value),
      () => 100,
      () => Date.now(),
    );
    throttle.call(1);
    throttle.call(2);
    throttle.call(3);
    expect(runs).toEqual([1]);
    vi.advanceTimersByTime(100);
    expect(runs).toEqual([1, 3]);
    throttle.call(4);
    throttle.cancel();
    vi.advanceTimersByTime(200);
    expect(runs).toEqual([1, 3]);
  });
});

describe('time-slider preview positioning (Library mp-l-preview; V-56)', () => {
  const track = rect(100, 500, 400, 20);
  const viewport = rect(0, 0, 1000, 800);
  const surface = rect(0, 0, 120, 60);
  const place = (ratio: number, overflow: 'clamp' | 'visible') => {
    const policy = previewPositioning(track, overflow);
    const clipping =
      typeof policy.boundary === 'object' && 'x' in policy.boundary
        ? rect(
            Math.max(viewport.x, policy.boundary.x),
            viewport.y,
            Math.min(viewport.right, policy.boundary.right) -
              Math.max(viewport.x, policy.boundary.x),
            viewport.height,
          )
        : viewport;
    return computeSurfacePosition(previewAnchorRect(track, ratio), surface, clipping, {
      placement: 'top',
      offset: 8,
      ...policy,
    });
  };

  it('anchors a zero-width slice of the track at the pointer ratio', () => {
    expect(previewAnchorRect(track, 0.25)).toMatchObject({ x: 200, y: 500, width: 0, height: 20 });
    expect(previewAnchorRect(track, 2).x).toBe(500);
  });

  it('centers above the pointer and clamps inside the track by default', () => {
    expect(place(0.5, 'clamp')).toMatchObject({ x: 240, y: 432 });
    expect(place(0, 'clamp')!.x).toBe(100);
    expect(place(1, 'clamp')!.x).toBe(380);
  });

  it('overflows the track with overflow="visible"', () => {
    expect(place(0, 'visible')!.x).toBe(40);
    expect(place(1, 'visible')!.x).toBe(440);
  });
});

describe('thumbnail selection and sprite layout (mp-f-thumbnails; V-38)', () => {
  const thumbnails = resolveThumbnails({
    src: 'https://cdn.test/media/thumbs.vtt',
    cues: [
      { startTime: 0, endTime: 5, text: 'sprite.jpg#xywh=0,0,160,90' },
      { startTime: 5, endTime: 10, text: 'sprite.jpg#xywh=160,0,160,90' },
      { startTime: 10, endTime: 15, text: 'other.jpg' },
    ],
  });

  it('selects the last cue at or before the time and never retries failed sources', () => {
    expect(selectThumbnail(thumbnails, 7)?.coords).toEqual({ x: 160, y: 0 });
    expect(selectThumbnail(thumbnails, 12)?.url).toBe('https://cdn.test/media/other.jpg');
    expect(selectThumbnail(thumbnails, null)).toBeUndefined();
    const memory = new ThumbnailSourceMemory();
    memory.markFailed('https://cdn.test/media/other.jpg');
    expect(selectThumbnail(thumbnails, 12, memory)).toBeUndefined();
    expect(selectThumbnail(thumbnails, 2, memory)?.url).toBe('https://cdn.test/media/sprite.jpg');
  });

  it('scales the cell to the CSS max size and offsets the sprite', () => {
    const constraints = parseThumbnailConstraints({
      minWidth: '0px',
      maxWidth: '80px',
      minHeight: 'auto',
      maxHeight: 'none',
    });
    expect(thumbnailLayout(thumbnails[1]!, 480, 90, constraints)).toEqual({
      scale: 0.5,
      containerWidth: 78,
      containerHeight: 43,
      imageWidth: 240,
      imageHeight: 45,
      offsetX: 81,
      offsetY: 1,
    });
    const unconstrained = parseThumbnailConstraints({
      minWidth: '',
      maxWidth: 'none',
      minHeight: '',
      maxHeight: 'none',
    });
    expect(thumbnailLayout(thumbnails[0]!, 480, 90, unconstrained)).toMatchObject({
      scale: 1,
      containerWidth: 160,
      containerHeight: 90,
      offsetX: 0,
    });
    expect(thumbnailLayout({}, 0, 0, unconstrained)).toBeUndefined();
  });
});

describe('volume slider (Library mp-l-volume-slider; V-57)', () => {
  it('maps volume to 0–100 and treats zero volume as muted', () => {
    expect(volumeSliderValue(0.42)).toBe(42);
    expect(volumeSliderValue(2)).toBe(100);
    expect(volumeEffectivelyMuted({ volume: 0, muted: false })).toBe(true);
    expect(volumeEffectivelyMuted({ volume: 0.5, muted: false })).toBe(false);
  });

  it('says the percent, or percent muted', () => {
    expect(volumeSliderValueText(50, false, messages, 'en')).toBe('50%');
    expect(volumeSliderValueText(50, true, messages, 'en')).toBe('50%, muted');
  });

  it('steps by the wheel step in the scroll direction, clamped', () => {
    expect(wheelSteppedValue(50, -1, 5)).toBe(55);
    expect(wheelSteppedValue(50, 3, 5)).toBe(45);
    expect(wheelSteppedValue(98, -1, 5)).toBe(100);
    expect(wheelSteppedValue(50, 0, 5)).toBe(50);
  });

  it('opens the volume popup only while volume can be set', () => {
    expect(volumePopupUsable(true, 'available')).toBe(true);
    expect(volumePopupUsable(true, 'unsupported')).toBe(false);
    expect(volumePopupUsable(false, 'available')).toBe(false);
  });
});
