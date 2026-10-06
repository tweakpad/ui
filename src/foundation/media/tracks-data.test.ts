import { describe, expect, it } from 'vitest';
import { captionTracks, findLocaleTrack, localeKey, textTrackLabel } from './captions.js';
import { clampCuesToDuration, findChapter, normalizeChapters } from './chapters.js';
import { createMediaMessages } from './messages.js';
import {
  corsMode,
  findThumbnail,
  parseMediaFragment,
  resolveThumbnailCrossOrigin,
  resolveThumbnails,
  ThumbnailSourceMemory,
} from './thumbnails.js';

describe('chapters (V-37)', () => {
  it('filters non-finite cues, sorts, clamps, trims overlaps and fills gaps', () => {
    const chapters = normalizeChapters(
      [
        { startTime: 30, endTime: 50, text: 'Middle' },
        { startTime: 5, endTime: 20, text: 'Intro' },
        { startTime: Number.NaN, endTime: 10, text: 'Broken' },
        { startTime: 15, endTime: 25, text: 'Overlap' },
        { startTime: 55, endTime: 500, text: 'End' },
      ],
      100,
    );
    expect(chapters.map(({ start, end, cue }) => [start, end, cue?.text ?? null])).toEqual([
      [0, 5, null],
      [5, 20, 'Intro'],
      [20, 25, 'Overlap'],
      [25, 30, null],
      [30, 50, 'Middle'],
      [50, 55, null],
      [55, 100, 'End'],
    ]);
    expect(chapters[1]!.key).toBe('cue-5-Intro');
    expect(chapters[0]!.key).toBe('gap-start-cue-5-Intro');
    // Keys are stable across recomputation and disambiguate duplicates.
    const twice = normalizeChapters(
      [
        { id: 'a', startTime: 0, endTime: 5, text: 'Same' },
        { startTime: 5, endTime: 10, text: 'Dup' },
        { startTime: 5, endTime: 10, text: 'Dup' },
      ],
      10,
    );
    expect(twice.map((chapter) => chapter.key)).toEqual(['cue-a-0-Same', 'cue-5-Dup']);
  });

  it('handles empty and invalid ranges and finds chapters', () => {
    expect(normalizeChapters([], 0)).toEqual([]);
    expect(normalizeChapters([], 10)).toEqual([
      { key: 'gap-start-end', start: 0, end: 10, cue: null },
    ]);
    const chapters = normalizeChapters(
      [
        { startTime: 0, endTime: 5, text: 'A' },
        { startTime: 5, endTime: 10, text: 'B' },
      ],
      10,
    );
    expect(findChapter(chapters, 5)?.cue?.text).toBe('B');
    expect(findChapter(chapters, 10)?.cue?.text).toBe('B');
    expect(findChapter(chapters, Number.NaN)).toBeUndefined();
  });

  it('clamps open-ended cue ends to a finite duration only', () => {
    const cues = [{ startTime: 0, endTime: 1e9, text: 'Open' }];
    expect(clampCuesToDuration(cues, 60)[0]!.endTime).toBe(60);
    expect(clampCuesToDuration(cues, Number.POSITIVE_INFINITY)[0]!.endTime).toBe(1e9);
    expect(clampCuesToDuration(null, 60)).toEqual([]);
  });
});

describe('thumbnails (V-38)', () => {
  it('parses xywh media fragments and resolves URLs against the track source', () => {
    expect(
      parseMediaFragment('sprite.jpg#xywh=160,90,160,90', 'https://cdn.test/a/thumbs.vtt'),
    ).toEqual({
      url: 'https://cdn.test/a/sprite.jpg',
      width: 160,
      height: 90,
      coords: { x: 160, y: 90 },
    });
    expect(parseMediaFragment('s.jpg#xywh=pixel:0,0,10,10').coords).toEqual({ x: 0, y: 0 });
    expect(parseMediaFragment(' plain.jpg ')).toEqual({ url: 'plain.jpg' });
    expect(parseMediaFragment('s.jpg#xywh=1,2,3')).toEqual({ url: 's.jpg' });
    expect(parseMediaFragment('s.jpg#xywh=a,b,c,d')).toEqual({ url: 's.jpg' });
    expect(parseMediaFragment('s.jpg#t=10')).toEqual({ url: 's.jpg' });
  });

  it('selects the last cue starting at or before the time and remembers failures', () => {
    const images = resolveThumbnails({
      src: 'https://cdn.test/thumbs.vtt',
      cues: [
        { startTime: 0, endTime: 5, text: 'a.jpg' },
        { startTime: 5, endTime: 10, text: 'b.jpg#xywh=0,0,10,10' },
        { startTime: 10, endTime: 15, text: 'c.jpg' },
      ],
    });
    expect(findThumbnail(images, 7)?.url).toBe('https://cdn.test/b.jpg');
    expect(findThumbnail(images, 10)?.url).toBe('https://cdn.test/c.jpg');
    expect(findThumbnail(images, -1)).toBeUndefined();
    const memory = new ThumbnailSourceMemory();
    memory.markFailed('https://cdn.test/b.jpg');
    expect(memory.usable(findThumbnail(images, 7))).toBeUndefined();
    expect(memory.usable(findThumbnail(images, 2))?.url).toBe('https://cdn.test/a.jpg');
    expect(resolveThumbnails(null)).toEqual([]);
  });

  it('inherits the media CORS mode unless set explicitly', () => {
    expect(corsMode(null)).toBeNull();
    expect(corsMode('')).toBe('anonymous');
    expect(corsMode('USE-CREDENTIALS')).toBe('use-credentials');
    expect(resolveThumbnailCrossOrigin(undefined, 'anonymous')).toBe('anonymous');
    expect(resolveThumbnailCrossOrigin(null, 'anonymous')).toBeNull();
    expect(resolveThumbnailCrossOrigin('', null)).toBe('');
  });
});

describe('caption helpers', () => {
  const tracks = [
    { kind: 'subtitles', label: '', language: 'fr' },
    { kind: 'chapters', label: 'C', language: 'en' },
    { kind: 'captions', label: 'English', language: 'en-US' },
  ];

  it('orders captions before subtitles and matches locales', () => {
    expect(captionTracks(tracks).map((track) => track.kind)).toEqual(['captions', 'subtitles']);
    expect(findLocaleTrack(captionTracks(tracks), 'en')?.language).toBe('en-US');
    expect(findLocaleTrack(tracks, 'fr-CA')?.language).toBe('fr');
    expect(findLocaleTrack(tracks, 'de')).toBeUndefined();
    expect(localeKey('en_US-u-nu-latn')).toBe('en-us');
  });

  it('falls back from label to the language name to the kind message', () => {
    const messages = createMediaMessages();
    expect(textTrackLabel(tracks[2]!, messages, 'en')).toBe('English');
    expect(textTrackLabel(tracks[0]!, messages, 'en')).toBe('French');
    expect(textTrackLabel({ kind: 'subtitles', label: ' ', language: '' }, messages)).toBe(
      'Subtitles',
    );
    expect(textTrackLabel({ kind: 'captions', label: '', language: '' }, messages)).toBe(
      'Captions',
    );
  });
});
