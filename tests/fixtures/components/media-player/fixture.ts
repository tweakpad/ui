import type {
  TpMediaPlayer,
  TpMediaVideoLayout,
} from '../../../../src/components/media-player/index.js';
import type { MediaTarget } from '../../../../src/foundation/media/target.js';
import {
  createMockTracksAdapter,
  simulateLiveWindow,
} from '../../../../src/stories/media-player-example.js';

const built = new URLSearchParams(location.search).has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel="stylesheet"]')!.href = '/dist/styles.css';
const media = (await import(
  /* @vite-ignore */ built ? '/dist/media.js' : '/src/foundation/media/index.ts'
)) as typeof import('../../../../src/foundation/media/index.js');

/**
 * Custom media (`mp-f-discovery`): the element keeps its `<video>` in a shadow root, where the
 * player's light-DOM discovery cannot see it, and registers that video as its media target.
 */
class FixtureShadowMedia extends HTMLElement {
  readonly video = document.createElement('video');
  #release: (() => void) | undefined;
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>:host{display:block}video{display:block;inline-size:100%}</style>';
    this.video.preload = 'metadata';
    this.video.playsInline = true;
    this.video.width = 1280;
    this.video.height = 720;
    root.append(this.video);
  }
  connectedCallback() {
    this.video.src = this.getAttribute('src') ?? '';
    this.#release = media.requestMediaRegistration(this.video as EventTarget & MediaTarget);
  }
  disconnectedCallback() {
    this.#release?.();
    this.#release = undefined;
  }
}

await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
// Defined after the player, which acknowledges the registration when the element connects.
customElements.define('fixture-shadow-media', FixtureShadowMedia);

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const players = [...document.querySelectorAll<TpMediaPlayer>('tp-media-player')];
const layout = byId<TpMediaVideoLayout>('video-layout');

// Live with a simulated DVR window: the video gains the live members before the player sees it.
const live = byId<TpMediaPlayer>('live');
let liveVideo: HTMLVideoElement | undefined;
let restoreLive: (() => void) | undefined;
const mountLive = (window: number) => {
  liveVideo?.remove();
  restoreLive?.();
  liveVideo = document.createElement('video');
  liveVideo.src = '/src/stories/assets/media/sample-video.mp4';
  liveVideo.loop = true;
  liveVideo.playsInline = true;
  liveVideo.preload = 'auto';
  liveVideo.width = 1280;
  liveVideo.height = 720;
  restoreLive = simulateLiveWindow(liveVideo, window);
  live.prepend(liveVideo);
};
mountLive(20);
let dvr = true;
byId('live-no-dvr').addEventListener('click', () => {
  dvr = !dvr;
  mountLive(dvr ? 20 : 0);
});

// Tracks adapter mock.
byId<TpMediaPlayer>('tracks').mediaAdapter = createMockTracksAdapter();

// Error trigger: a missing source yields MEDIA_ERR_SRC_NOT_SUPPORTED (code 4).
const errorVideo = byId<HTMLVideoElement>('error-video');
const errorSource = errorVideo.src;
byId('trigger-error').addEventListener('click', () => {
  errorVideo.src = '/src/stories/assets/media/missing.mp4';
});
byId('restore-source').addEventListener('click', () => {
  errorVideo.src = errorSource;
});

// Layout options on the default player.
byId('hide-pip').addEventListener('click', () => {
  layout.hide = layout.hide ? '' : 'pip remote';
});
byId('seek-buttons').addEventListener('click', () => {
  layout.seekButtons = !layout.seekButtons;
});
byId('narrow').addEventListener('click', () => {
  const section = byId('default-section');
  section.classList.toggle('narrow');
});
byId('disable').addEventListener('click', () => {
  const player = byId<TpMediaPlayer>('video');
  player.disabled = !player.disabled;
});

const events: Array<{
  type: string;
  player: string | null;
  action?: unknown;
  value?: unknown;
  reason?: unknown;
  code?: unknown;
}> = [];
for (const type of [
  'tp-media-request',
  'tp-media-request-failed',
  'tp-media-error',
  'tp-media-attach',
  'tp-media-detach',
  'tp-diagnostic',
])
  document.addEventListener(type, (event) => {
    const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {};
    const target = event.target as Element | null;
    events.push({
      type,
      player:
        target?.closest?.('tp-media-player')?.id ?? (target as HTMLElement | null)?.id ?? null,
      action: detail['action'],
      value: detail['value'],
      reason: detail['reason'],
      code: detail['code'],
    });
  });

Object.assign(window, {
  mediaFixture: {
    players: Object.fromEntries(players.map((player) => [player.id, player])),
    layout,
    events,
    mountLive,
  },
});
