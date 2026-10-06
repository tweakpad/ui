import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnnounceOptions } from '../announcer.js';
import {
  createMediaLiveAnnouncer,
  deriveMediaAnnouncements,
  MEDIA_ANNOUNCEMENT_CLEAR_DELAY,
  MEDIA_ANNOUNCEMENT_DEBOUNCE,
  MediaAnnouncementPolicy,
} from './announcements.js';
import {
  FakeContainer,
  FakeDocument,
  FakeMedia,
  FakeTextTrack,
  flush,
} from './media-fakes.test.js';
import { createMediaMessages } from './messages.js';
import {
  DEFAULT_MEDIA_CONFIG,
  DEFAULT_MEDIA_SOURCE,
  deriveMediaState,
  type MediaState,
  type MediaStateChange,
  type MediaStateKey,
} from './state.js';
import { MediaStore } from './store.js';

afterEach(() => vi.useRealTimers());

const base = deriveMediaState(DEFAULT_MEDIA_SOURCE, DEFAULT_MEDIA_CONFIG);

function change(
  next: Partial<MediaState>,
  reason: MediaStateChange['reason'] = 'keyboard',
  previous: Partial<MediaState> = {},
): MediaStateChange {
  const previousState = { ...base, ...previous };
  const state = { ...previousState, ...next };
  const changed = (Object.keys(next) as MediaStateKey[]).filter(
    (key) => !Object.is(previousState[key], state[key]),
  );
  const reasons = Object.fromEntries(changed.map((key) => [key, reason]));
  return { changed, state, previousState, reason, reasons };
}

describe('deriveMediaAnnouncements (V-40)', () => {
  it('announces immediate status changes and ignores media-originated ones', () => {
    expect(deriveMediaAnnouncements(change({ paused: false })).map((a) => a.key)).toEqual([
      'statusPlaying',
    ]);
    expect(deriveMediaAnnouncements(change({ paused: false }, 'media'))).toEqual([]);
    const many = deriveMediaAnnouncements(
      change({ fullscreen: true, pictureInPicture: true, playbackRate: 1.5 }),
      { locale: 'en' },
    );
    expect(many.map((a) => [a.key, a.params, a.debounced])).toEqual([
      ['statusFullscreen', undefined, false],
      ['statusPictureInPicture', undefined, false],
      ['statusPlaybackRate', { rate: '1.5×' }, false],
    ]);
  });

  it('announces captions only when captions are available', () => {
    const tracks = [{ id: 'a', kind: 'captions', label: 'A', language: 'en', mode: 'showing' }];
    expect(deriveMediaAnnouncements(change({ captionsShowing: true }))).toEqual([]);
    expect(
      deriveMediaAnnouncements(change({ captionsShowing: true, textTracks: tracks })).map(
        (a) => a.key,
      ),
    ).toEqual(['statusCaptionsOn']);
  });

  it('debounces volume/mute and completed seeks', () => {
    expect(deriveMediaAnnouncements(change({ volume: 0.5 }), { locale: 'en' })).toEqual([
      { slot: 'volume', key: 'statusVolume', params: { percent: '50%' }, debounced: true },
    ]);
    expect(deriveMediaAnnouncements(change({ muted: true }))[0]!.key).toBe('statusMuted');
    const seek = change({ seeking: false, currentTime: 65 }, 'keyboard', { seeking: true });
    expect(deriveMediaAnnouncements(seek, { locale: 'en' }, 10)).toEqual([
      {
        slot: 'seek',
        key: 'statusSeekedTo',
        params: { time: '1 minute, 5 seconds' },
        debounced: true,
      },
    ]);
    expect(deriveMediaAnnouncements(seek, { locale: 'en' }, 65)).toEqual([]);
  });
});

describe('MediaAnnouncementPolicy', () => {
  function setup(options: { sliderFocused?: boolean; enabled?: boolean } = {}) {
    const announced: Array<[string, AnnounceOptions | undefined]> = [];
    const policy = new MediaAnnouncementPolicy({
      announcer: { announce: (message, opts) => void announced.push([message, opts]) },
      messages: () => createMediaMessages({ statusPaused: 'Pausiert' }),
      locale: () => 'en',
      enabled: () => options.enabled ?? true,
      sliderFocused: () => options.sliderFocused ?? false,
    });
    return { policy, announced };
  }

  it('resolves messages through the dictionary with immediate and debounced options', () => {
    const { policy, announced } = setup();
    policy.process(change({ paused: true }, 'pointer', { paused: false }));
    policy.process(change({ volume: 0.2 }));
    expect(announced).toEqual([
      ['Pausiert', { key: 'media-paused' }],
      ['Volume 20%', { key: 'media-volume', debounce: MEDIA_ANNOUNCEMENT_DEBOUNCE }],
    ]);
  });

  it('suppresses debounced messages while a slider has focus and honors the off switch', () => {
    const focused = setup({ sliderFocused: true });
    focused.policy.process(change({ volume: 0.2, paused: false }));
    expect(focused.announced.map(([message]) => message)).toEqual(['Playing']);
    const off = setup({ enabled: false });
    off.policy.process(change({ paused: false }));
    expect(off.announced).toEqual([]);
  });

  it('tracks the seek start across batches through a store', async () => {
    const announced: string[] = [];
    const document = new FakeDocument();
    const media = new FakeMedia({ document });
    const store = new MediaStore({ probeVolume: () => 'available' });
    const policy = new MediaAnnouncementPolicy({
      announcer: { announce: (message) => void announced.push(message) },
      locale: () => 'en',
    });
    policy.connect(store);
    const track = new FakeTextTrack('captions', 'English', 'en', 'en');
    media.textTracks.set([track]);
    store.attach({
      media: media.asTarget(),
      container: new FakeContainer(document) as unknown as HTMLElement,
    });
    media.loadMetadata(120, 4);
    await flush();
    expect(announced).toEqual([]); // attach and metadata are media-originated
    const seek = store.request('seek', 90, { reason: 'keyboard' });
    await flush();
    media.completeSeek();
    await seek;
    await flush();
    await store.request('toggle-captions', undefined, { reason: 'hotkey' });
    media.textTracks.fire('change');
    await flush();
    expect(announced).toEqual(['Seeked to 1 minute, 30 seconds', 'Captions on']);
    // Autoplay starting (media-originated) is not announced.
    media.paused = false;
    media.fire('play');
    await flush();
    expect(announced).toHaveLength(2);
    policy.dispose();
  });
});

describe('createMediaLiveAnnouncer', () => {
  it('joins simultaneous messages, debounces, suppresses on slider focus and clears after 800 ms', async () => {
    vi.useFakeTimers();
    let focused = false;
    const regions: Array<{ textContent: string }> = [];
    const element = () => {
      const node = {
        nodeType: 1,
        textContent: '',
        parentNode: null as unknown,
        ownerDocument: undefined as unknown,
        style: { setProperty: () => undefined },
        setAttribute: () => undefined,
        remove: () => undefined,
      };
      regions.push(node);
      return node;
    };
    const body = { append: (child: { parentNode: unknown }) => (child.parentNode = body) };
    const document = {
      nodeType: 9,
      body,
      defaultView: {
        setTimeout: (callback: () => void, delay: number) => globalThis.setTimeout(callback, delay),
        clearTimeout: (id: number) => globalThis.clearTimeout(id),
      },
      createElement: () => {
        const node = element();
        node.ownerDocument = document;
        return node;
      },
    };
    const announcer = createMediaLiveAnnouncer({
      document: () => document as unknown as Document,
      sliderFocused: () => focused,
    });
    announcer.prepare('polite');
    const region = regions[0]!;
    announcer.announce('Playing', { key: 'a' });
    announcer.announce('Fullscreen', { key: 'b' });
    await flush();
    expect(region.textContent).toBe('Playing. Fullscreen');
    vi.advanceTimersByTime(MEDIA_ANNOUNCEMENT_CLEAR_DELAY);
    expect(region.textContent).toBe('');
    announcer.announce('Volume 50%', { key: 'v', debounce: MEDIA_ANNOUNCEMENT_DEBOUNCE });
    focused = true; // the slider took focus before the message became due
    vi.advanceTimersByTime(MEDIA_ANNOUNCEMENT_DEBOUNCE);
    await flush();
    expect(region.textContent).toBe('');
    announcer.dispose();
  });
});
