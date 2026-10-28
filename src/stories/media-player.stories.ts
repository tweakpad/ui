import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import {
  sampleCaptionsEn,
  sampleCaptionsEs,
  sampleChapters,
  samplePoster,
  sampleThumbnails,
  sampleVideo,
} from './media.js';

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
  parameters: { docs: libraryDocs('components/media-player') },
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
      table: { defaultValue: { summary: 'null' } },
    },
    streamType: {
      control: 'select',
      options: ['auto', 'on-demand', 'live'],
      table: { defaultValue: { summary: 'auto' } },
    },
    playbackRates: {
      control: 'text',
      table: { defaultValue: { summary: '0.2 0.5 0.7 1 1.2 1.5 1.7 2' } },
    },
    seekStep: {
      control: 'number',
      table: { defaultValue: { summary: '10' } },
    },
    volumeStep: {
      control: 'number',
      table: { defaultValue: { summary: '0.05' } },
    },
    idleDelay: {
      control: 'number',
      table: { defaultValue: { summary: '2000' } },
    },
    hideOverControls: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    hotkeys: {
      control: 'select',
      options: ['default', 'none'],
      table: { defaultValue: { summary: 'default' } },
    },
    hotkeyScope: {
      control: 'select',
      options: ['player', 'document'],
      table: { defaultValue: { summary: 'player' } },
    },
    gestures: {
      control: 'select',
      options: ['default', 'none'],
      table: { defaultValue: { summary: 'none' } },
    },
    orientationLock: {
      control: 'select',
      options: ['none', 'any', 'natural', 'landscape', 'portrait'],
      table: { defaultValue: { summary: 'none' } },
    },
    announcements: {
      control: 'select',
      options: ['polite', 'off'],
      table: { defaultValue: { summary: 'polite' } },
    },
    locale: {
      control: 'text',
      table: { defaultValue: { summary: 'resolved' } },
    },
    disabled: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    hide: {
      control: 'text',
      table: { category: 'tp-media-video-layout', defaultValue: { summary: "''" } },
    },
    seekButtons: {
      control: 'boolean',
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
