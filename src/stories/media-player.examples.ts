import { interactiveMarkupExample, markupExample } from './documentation-examples.js';
import {
  sampleAudio,
  sampleCaptionsEn,
  sampleCaptionsEs,
  sampleChapters,
  samplePoster,
  sampleThumbnails,
  sampleVideo,
} from './media.js';
import { setupMediaPlayerExample } from './media-player-example.js';
import setupSource from './media-player-example.js?raw';

/** The text tracks of the sample clip: two caption languages, chapters and thumbnails. */
const sampleTracks = `<track kind="captions" srclang="en" label="English" src="${sampleCaptionsEn}" />
    <track kind="captions" srclang="es" label="Español" src="${sampleCaptionsEs}" />
    <track kind="chapters" srclang="en" src="${sampleChapters}" />
    <track kind="metadata" label="thumbnails" src="${sampleThumbnails}" />`;

const sampleVideoElement = `<video
    src="${sampleVideo}"
    width="1280"
    height="720"
    preload="metadata"
    playsinline
    crossorigin="anonymous"
  >
    ${sampleTracks}
  </video>`;

/** Copyable source of the canonical base example (`tp-media-player` + video + video layout). */
export const mediaPlayerDemoSource = (layout = '<tp-media-video-layout></tp-media-video-layout>') =>
  `<tp-media-player content-title="Sample clip" poster="${samplePoster}">
  ${sampleVideoElement}
  ${layout}
</tp-media-player>
<script type="module">
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
</script>`;

/** The audio layout around the sample sweep. */
export const audioLayoutExample = markupExample(
  'Audio layout',
  `<tp-media-player content-title="Sample sweep">
  <audio src="${sampleAudio}" preload="metadata" crossorigin="anonymous"></audio>
  <tp-media-audio-layout></tp-media-audio-layout>
</tp-media-player>`,
  'Always-visible controls in the page color scheme: play with buffering, seek ±10 s from the large breakpoint, the timeline, speed and volume.',
);

/** A custom bar composed from constituents, without a layout. */
export const headlessExample = markupExample(
  'Headless composition',
  `<tp-media-player content-title="Custom bar" poster="${samplePoster}">
  ${sampleVideoElement}
  <tp-media-poster></tp-media-poster>
  <tp-media-buffering-indicator></tp-media-buffering-indicator>
  <tp-media-controls>
    <tp-media-controls-group label="Playback">
      <tp-media-play-button></tp-media-play-button>
      <tp-media-seek-button seconds="-5"></tp-media-seek-button>
      <tp-media-seek-button seconds="5" repeat></tp-media-seek-button>
      <tp-media-time type="current"></tp-media-time>
      <tp-media-time-slider>
        <tp-media-time-slider-preview>
          <tp-media-thumbnail></tp-media-thumbnail>
          <tp-media-time type="pointer"></tp-media-time>
        </tp-media-time-slider-preview>
      </tp-media-time-slider>
      <tp-media-time type="duration"></tp-media-time>
      <tp-media-mute-button></tp-media-mute-button>
      <tp-media-volume-slider style="inline-size: 6rem"></tp-media-volume-slider>
      <tp-media-playback-rate-button></tp-media-playback-rate-button>
      <tp-media-captions-button></tp-media-captions-button>
      <tp-media-fullscreen-button></tp-media-fullscreen-button>
    </tp-media-controls-group>
  </tp-media-controls>
  <tp-media-status-indicator></tp-media-status-indicator>
  <tp-media-hotkey keys="s" action="seek-by" value="30"></tp-media-hotkey>
</tp-media-player>`,
  'Constituents without a layout: one labelled controls group, a five-second seek pair (forward repeats while held), a horizontal volume slider, and an extra S key binding that skips 30 seconds.',
);

/** A live stream with a DVR window, simulated on the sample clip (labelled as such). */
export const liveExample = interactiveMarkupExample(
  'Live with DVR (simulated)',
  `<section data-example="live" data-src="${sampleVideo}">
  <p><tp-badge variant="outline">Simulated</tp-badge> A looping on-demand clip reports a live stream with a 20-second DVR window.</p>
  <tp-media-player content-title="Live sample">
    <tp-media-video-layout></tp-media-video-layout>
  </tp-media-player>
</section>`,
  setupMediaPlayerExample,
  `${setupSource}\nconst cleanup = setupMediaPlayerExample(document.querySelector('[data-example="live"]'));\n// Call cleanup() when removing the example.`,
  'The video layout switches to its live variant: play, the live button (Playing live at the edge, Seek to live edge behind it), the DVR timeline, volume, a captions menu and the presentation buttons.',
);

/** Engine renditions and audio tracks through a `mediaAdapter` mock. */
export const tracksExample = interactiveMarkupExample(
  'Tracks adapter',
  `<section data-example="tracks">
  <p><tp-badge variant="outline">Mock</tp-badge> The adapter lists three renditions and two audio tracks; selections are recorded but do not change the sample video.</p>
  <tp-media-player content-title="Adaptive sample" poster="${samplePoster}">
    ${sampleVideoElement}
    <tp-media-video-layout></tp-media-video-layout>
  </tp-media-player>
</section>`,
  setupMediaPlayerExample,
  `${setupSource}\nconst cleanup = setupMediaPlayerExample(document.querySelector('[data-example="tracks"]'));\n// Call cleanup() when removing the example.`,
  'The settings menu gains Quality (Auto with the active rendition, then 1080p, 720p, 360p) and Audio submenus from `mediaAdapter`.',
);
