/**
 * Minimal DOM-free media fakes for the node test environment: an EventTarget-based media element
 * with TimeRanges/TextTrackList shapes, a document/window pair with fullscreen, picture-in-picture
 * and orientation members, and a container element. Exported for the media unit tests.
 */
import { describe, expect, it } from 'vitest';
import type { MediaTarget } from './target.js';

export class FakeTimeRanges {
  constructor(public ranges: Array<[number, number]> = []) {}
  get length(): number {
    return this.ranges.length;
  }
  start(index: number): number {
    return this.ranges[index]![0];
  }
  end(index: number): number {
    return this.ranges[index]![1];
  }
}

/** Array-like event-target list (TextTrackList, AudioTrackList, rendition lists). */
export class FakeList<T> extends EventTarget {
  [index: number]: T | undefined;
  length = 0;
  selectedIndex = -1;
  constructor(items: T[] = []) {
    super();
    this.set(items);
  }
  set(items: T[]): void {
    for (let index = 0; index < this.length; index++) delete this[index];
    items.forEach((item, index) => (this[index] = item));
    this.length = items.length;
  }
  items(): T[] {
    return Array.from({ length: this.length }, (_, index) => this[index]!);
  }
  fire(type: string): void {
    this.dispatchEvent(new Event(type));
  }
}

export interface FakeCue {
  id?: string;
  startTime: number;
  endTime: number;
  text: string;
}

export class FakeTextTrack {
  mode = 'disabled';
  cues: FakeCue[] | null;
  constructor(
    public kind: string,
    public label = '',
    public language = '',
    public id = '',
    cues: FakeCue[] | null = [],
  ) {
    this.cues = cues;
  }
}

export class FakeAudioTrack {
  constructor(
    public id: string,
    public label: string,
    public language: string,
    public enabled = false,
    public kind = 'main',
  ) {}
}

export class FakeRemote extends EventTarget {
  state = 'disconnected';
  prompts = 0;
  availability: ((available: boolean) => void) | undefined;
  cancelled = 0;
  watchResult: 'resolve' | 'reject' = 'resolve';
  prompt(): Promise<void> {
    this.prompts++;
    return Promise.resolve();
  }
  watchAvailability(callback: (available: boolean) => void): Promise<number> {
    this.availability = callback;
    return this.watchResult === 'resolve'
      ? Promise.resolve(1)
      : Promise.reject(new DOMException('no', 'NotSupportedError'));
  }
  cancelWatchAvailability(): Promise<void> {
    this.cancelled++;
    return Promise.resolve();
  }
}

/** A fake owner window with orientation, user agent and animation frames. */
export class FakeWindow extends EventTarget {
  orientationCalls: Array<string> = [];
  lockImpl: (type: string) => Promise<void> = () => Promise.resolve();
  navigator = { userAgent: 'Mozilla/5.0 Chrome/130', language: 'en-US' };
  standalone = false;
  readonly screen = {
    orientation: {
      lock: (type: string) => {
        this.orientationCalls.push(`lock:${type}`);
        return this.lockImpl(type);
      },
      unlock: () => {
        this.orientationCalls.push('unlock');
      },
    },
  };
  matchMedia = (query: string) => ({ matches: query.includes('standalone') && this.standalone });
  setTimeout = (callback: () => void, delay: number) => globalThis.setTimeout(callback, delay);
  clearTimeout = (id: number) => globalThis.clearTimeout(id);
  setInterval = (callback: () => void, delay: number) => globalThis.setInterval(callback, delay);
  clearInterval = (id: number) => globalThis.clearInterval(id);
  requestAnimationFrame = (callback: (time: number) => void) =>
    globalThis.setTimeout(() => callback(Date.now()), 16) as unknown as number;
  cancelAnimationFrame = (id: number) => globalThis.clearTimeout(id);
  performance = { now: () => Date.now() };
}

export class FakeDocument extends EventTarget {
  readonly nodeType = 9;
  fullscreenEnabled = true;
  fullscreenElement: unknown = null;
  pictureInPictureEnabled = true;
  pictureInPictureElement: unknown = null;
  exits: string[] = [];
  volumeSticks = true;
  readonly defaultView: FakeWindow;
  constructor(view = new FakeWindow()) {
    super();
    this.defaultView = view;
  }
  exitFullscreen(): Promise<void> {
    this.exits.push('fullscreen');
    this.fullscreenElement = null;
    this.dispatchEvent(new Event('fullscreenchange'));
    return Promise.resolve();
  }
  exitPictureInPicture(): Promise<void> {
    this.exits.push('pip');
    const media = this.pictureInPictureElement as FakeMedia | null;
    this.pictureInPictureElement = null;
    media?.fire('leavepictureinpicture');
    return Promise.resolve();
  }
  createElement(): { volume: number } {
    const sticks = this.volumeSticks;
    let volume = 1;
    return {
      get volume() {
        return volume;
      },
      set volume(value: number) {
        if (sticks) volume = value;
      },
    };
  }
}

export class FakeContainer extends EventTarget {
  readonly nodeType = 1;
  readonly localName = 'tp-media-player';
  fullscreenRequests = 0;
  rejectFullscreen: Error | undefined;
  rect = { left: 0, top: 0, right: 400, bottom: 200, width: 400, height: 200 };
  constructor(public ownerDocument: FakeDocument) {
    super();
  }
  matches(): boolean {
    return false;
  }
  getRootNode(): unknown {
    return this.ownerDocument;
  }
  getBoundingClientRect() {
    return this.rect;
  }
  requestFullscreen(): Promise<void> {
    this.fullscreenRequests++;
    if (this.rejectFullscreen) return Promise.reject(this.rejectFullscreen);
    this.ownerDocument.fullscreenElement = this;
    this.ownerDocument.dispatchEvent(new Event('fullscreenchange'));
    return Promise.resolve();
  }
}

export interface FakeMediaOptions {
  document?: FakeDocument;
}

/**
 * HTMLMediaElement-like fake. Writes never dispatch events by themselves; tests call `fire()`
 * (or the helpers) to emulate the browser's queued events, so ordering is explicit.
 */
export class FakeMedia extends EventTarget {
  readonly nodeType = 1;
  readonly localName = 'video';
  ownerDocument: FakeDocument;
  paused = true;
  ended = false;
  seeking = false;
  loop = false;
  duration = Number.NaN;
  #currentTime = 0;
  src = '';
  currentSrc = '';
  readyState = 0;
  networkState = 0;
  preload = 'auto';
  crossOrigin: string | null = null;
  buffered = new FakeTimeRanges();
  seekable = new FakeTimeRanges();
  volume = 1;
  muted = false;
  playbackRate = 1;
  error: { code: number; message: string } | null = null;
  textTracks = new FakeList<FakeTextTrack>();
  poster = '';
  videoWidth = 0;
  videoHeight = 0;
  disablePictureInPicture = false;
  playResult: () => Promise<void> = () => Promise.resolve();
  playSync = true;
  plays = 0;
  pauses = 0;
  seeks: number[] = [];
  trackElements: Array<{ track: unknown; src: string } & EventTarget> = [];

  constructor(options: FakeMediaOptions = {}) {
    super();
    this.ownerDocument = options.document ?? new FakeDocument();
  }

  get currentTime(): number {
    return this.#currentTime;
  }
  set currentTime(value: number) {
    this.seeks.push(value);
    this.#currentTime = value;
    this.seeking = true;
  }
  /** Moves the playhead without a seek (playback progress). */
  advance(time: number): void {
    this.#currentTime = time;
  }
  play(): Promise<void> {
    this.plays++;
    if (this.playSync) {
      this.paused = false;
      this.ended = false;
    }
    return this.playResult();
  }
  pause(): void {
    this.pauses++;
    this.paused = true;
  }
  load(): void {}
  requestPictureInPicture(): Promise<unknown> {
    this.ownerDocument.pictureInPictureElement = this;
    this.fire('enterpictureinpicture');
    return Promise.resolve({});
  }
  querySelectorAll(): ArrayLike<Element> {
    return this.trackElements as unknown as ArrayLike<Element>;
  }
  fire(type: string, init: Record<string, unknown> = {}): void {
    this.dispatchEvent(Object.assign(new Event(type), init));
  }
  /** Completes the pending seek: `seeking` false, then `seeked`. */
  completeSeek(): void {
    this.seeking = false;
    this.fire('seeked');
  }
  /** Loads metadata with the given duration. */
  loadMetadata(duration: number, readyState = 1): void {
    this.duration = duration;
    this.readyState = readyState;
    this.fire('durationchange');
    this.fire('loadedmetadata');
  }
  asTarget(): MediaTarget {
    return this as unknown as MediaTarget;
  }
}

/** A media fake reduced to the given members (for partial-capability tests). */
export function partialMedia(members: Record<string, unknown>): MediaTarget {
  return Object.assign(new EventTarget(), members) as unknown as MediaTarget;
}

/** Waits for queued microtasks (store publication) to settle. */
export async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) await Promise.resolve();
}

/** A pointer-like event; node has no PointerEvent. */
export function pointer(
  type: string,
  init: Partial<{
    pointerType: string;
    pointerId: number;
    button: number;
    clientX: number;
    clientY: number;
    isPrimary: boolean;
    path: unknown[];
  }> = {},
): PointerEvent {
  const event = Object.assign(new Event(type, { bubbles: true }), {
    pointerType: 'mouse',
    pointerId: 1,
    button: 0,
    clientX: 10,
    clientY: 10,
    isPrimary: true,
    ...init,
  });
  if (init.path) Object.defineProperty(event, 'composedPath', { value: () => init.path });
  return event as unknown as PointerEvent;
}

describe('media fakes', () => {
  it('expose TimeRanges and list shapes', () => {
    const ranges = new FakeTimeRanges([[0, 5]]);
    expect([ranges.length, ranges.start(0), ranges.end(0)]).toEqual([1, 0, 5]);
    const list = new FakeList([new FakeTextTrack('captions', 'English', 'en')]);
    expect(list.length).toBe(1);
    expect(list[0]?.kind).toBe('captions');
    list.set([]);
    expect([list.length, list[0]]).toEqual([0, undefined]);
  });

  it('record seeks and play/pause', async () => {
    const media = new FakeMedia();
    media.currentTime = 3;
    expect([media.seeking, media.seeks]).toEqual([true, [3]]);
    await media.play();
    expect(media.paused).toBe(false);
    media.pause();
    expect(media.paused).toBe(true);
  });
});
