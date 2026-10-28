import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import documentation from '../../docs/media-player.md?raw';
import {
  sampleCaptionsEn,
  sampleCaptionsEs,
  sampleChapters,
  samplePoster,
  sampleThumbnails,
  sampleVideo,
} from './media.js';
import {
  audioLayoutExample,
  headlessExample,
  liveExample,
  mediaPlayerDemoSource,
  tracksExample,
} from './media-player.examples.js';

interface Args {
  contentTitle: string;
  streamType: 'auto' | 'on-demand' | 'live';
  playbackRates: string;
  seekStep: number;
  volumeStep: number;
  idleDelay: number;
  hideOverControls: boolean;
  hotkeys: 'default' | 'none';
  hotkeyScope: 'player' | 'document';
  gestures: 'default' | 'none';
  orientationLock: string;
  announcements: 'polite' | 'off';
  locale: string;
  disabled: boolean;
  hide: string;
  seekButtons: boolean;
}

const meta = {
  title: 'Components/Media player',
  component: 'tp-media-player',
  parameters: {
    docs: {
      description: { component: documentation },
      source: { code: mediaPlayerDemoSource() },
    },
  },
  args: {
    contentTitle: 'Sample clip',
    streamType: 'auto',
    playbackRates: '0.2 0.5 0.7 1 1.2 1.5 1.7 2',
    seekStep: 10,
    volumeStep: 0.05,
    idleDelay: 2000,
    hideOverControls: false,
    hotkeys: 'default',
    hotkeyScope: 'player',
    gestures: 'default',
    orientationLock: 'none',
    announcements: 'polite',
    locale: '',
    disabled: false,
    hide: '',
    seekButtons: false,
  },
  argTypes: {
    contentTitle: {
      control: 'text',
      description: 'Title; falls back to media content data. An empty string stops the fallback.',
      table: { defaultValue: { summary: 'null' } },
    },
    streamType: {
      control: 'select',
      options: ['auto', 'on-demand', 'live'],
      description: 'Stream type detection, or an override.',
      table: { defaultValue: { summary: 'auto' } },
    },
    playbackRates: {
      control: 'text',
      description: 'Sorted positive rates (`playback-rates`); invalid input uses the default.',
      table: { defaultValue: { summary: '0.2 0.5 0.7 1 1.2 1.5 1.7 2' } },
    },
    seekStep: {
      control: 'number',
      description: 'Seconds for seek buttons, key bindings and gestures.',
      table: { defaultValue: { summary: '10' } },
    },
    volumeStep: {
      control: 'number',
      description: 'Volume step (0–1) for key bindings and indicators.',
      table: { defaultValue: { summary: '0.05' } },
    },
    idleDelay: {
      control: 'number',
      description: 'Controls autohide delay in ms; zero or less disables autohide.',
      table: { defaultValue: { summary: '2000' } },
    },
    hideOverControls: {
      control: 'boolean',
      description: 'Allow hiding while the pointer is over the controls.',
      table: { defaultValue: { summary: 'false' } },
    },
    hotkeys: {
      control: 'select',
      options: ['default', 'none'],
      description: 'Default key map, or authored `tp-media-hotkey` bindings only.',
      table: { defaultValue: { summary: 'default' } },
    },
    hotkeyScope: {
      control: 'select',
      options: ['player', 'document'],
      description: 'Key bindings on the container, or routed from the document.',
      table: { defaultValue: { summary: 'player' } },
    },
    gestures: {
      control: 'select',
      options: ['default', 'none'],
      description:
        'Default tap gestures. The root defaults to `none`; the video layout enables `default` unless the attribute is authored.',
      table: { defaultValue: { summary: 'none' } },
    },
    orientationLock: {
      control: 'select',
      options: ['none', 'any', 'natural', 'landscape', 'portrait'],
      description: 'Screen orientation lock while fullscreen.',
      table: { defaultValue: { summary: 'none' } },
    },
    announcements: {
      control: 'select',
      options: ['polite', 'off'],
      description: 'Status announcements through the polite live region.',
      table: { defaultValue: { summary: 'polite' } },
    },
    locale: {
      control: 'text',
      description: 'Formatting locale for times and numbers (never selects translations).',
      table: { defaultValue: { summary: 'resolved' } },
    },
    disabled: {
      control: 'boolean',
      description:
        'Controls `aria-disabled`, key bindings and gestures inactive; playback continues.',
      table: { defaultValue: { summary: 'false' } },
    },
    hide: {
      control: 'text',
      description:
        'Video layout `hide` token list: play, seek, volume, current-time, time-slider, remaining-time, captions, settings, live, remote, pip, fullscreen.',
      table: { category: 'tp-media-video-layout', defaultValue: { summary: "''" } },
    },
    seekButtons: {
      control: 'boolean',
      description: 'Video layout `seek-buttons`: add seek backward/forward buttons.',
      table: { category: 'tp-media-video-layout', defaultValue: { summary: 'false' } },
    },
  },
  render: (args) => html`
    <tp-media-player
      style="max-inline-size: 48rem"
      content-title=${args.contentTitle}
      poster=${samplePoster}
      stream-type=${args.streamType}
      playback-rates=${args.playbackRates}
      seek-step=${args.seekStep}
      volume-step=${args.volumeStep}
      idle-delay=${args.idleDelay}
      ?hide-over-controls=${args.hideOverControls}
      hotkeys=${args.hotkeys}
      hotkey-scope=${args.hotkeyScope}
      gestures=${args.gestures}
      orientation-lock=${args.orientationLock}
      announcements=${args.announcements}
      locale=${args.locale}
      ?disabled=${args.disabled}
    >
      <video
        src=${sampleVideo}
        width="1280"
        height="720"
        preload="metadata"
        playsinline
        crossorigin="anonymous"
      >
        <track kind="captions" srclang="en" label="English" src=${sampleCaptionsEn} />
        <track kind="captions" srclang="es" label="Español" src=${sampleCaptionsEs} />
        <track kind="chapters" srclang="en" src=${sampleChapters} />
        <track kind="metadata" label="thumbnails" src=${sampleThumbnails} />
      </video>
      <tp-media-video-layout
        hide=${args.hide}
        ?seek-buttons=${args.seekButtons}
      ></tp-media-video-layout>
    </tp-media-player>
  `,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

const exampleStory = (example: {
  render: () => unknown;
  code: string;
  description?: string | undefined;
}): Story => ({
  render: () => html`<div style="max-inline-size: 48rem">${example.render()}</div>`,
  parameters: {
    controls: { disable: true },
    docs: {
      description: { story: example.description ?? '' },
      source: { code: example.code },
    },
  },
});

export const AudioLayout: Story = { name: 'Audio layout', ...exampleStory(audioLayoutExample) };
export const Headless: Story = {
  name: 'Headless composition',
  ...exampleStory(headlessExample),
};
export const LiveDvr: Story = { name: 'Live with DVR (simulated)', ...exampleStory(liveExample) };
export const TracksAdapter: Story = { name: 'Tracks adapter', ...exampleStory(tracksExample) };
