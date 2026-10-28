import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import documentation from '../../docs/image.md?raw';
import { imageDefaults, imageDefaultSource, imageExamples } from './image.examples.js';

interface Args {
  ratio: number;
  fit: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  placeholder: 'skeleton' | 'spinner' | 'none';
  loading: 'lazy' | 'eager';
  sizes: string;
  fetchPriority: '' | 'high' | 'low' | 'auto';
  zoom: 'none' | 'in' | 'out';
  zoomed: boolean;
  parallax: string;
  parallaxDepth: number;
  parallaxSmoothing: number;
  reveal: string;
  revealRepeat: boolean;
  revealHold: boolean;
  alt: string;
}

const meta = {
  title: 'Components/Image',
  component: 'tp-image',
  parameters: {
    docs: {
      description: { component: documentation },
      examples: imageExamples,
      source: { code: imageDefaultSource },
    },
  },
  args: {
    ratio: 16 / 9,
    fit: 'cover',
    placeholder: 'skeleton',
    loading: 'lazy',
    sizes: '',
    fetchPriority: '',
    zoom: 'none',
    zoomed: false,
    parallax: 'none',
    parallaxDepth: 0.3,
    parallaxSmoothing: 0,
    reveal: '',
    revealRepeat: false,
    revealHold: false,
    alt: imageDefaults.alt,
  },
  argTypes: {
    ratio: {
      control: { type: 'number', min: 0.25, max: 4, step: 0.05 },
      description:
        'Width ÷ height of the frame (Aspect-ratio box). Unset keeps the image’s own proportions.',
      table: { defaultValue: { summary: 'unset' } },
    },
    fit: {
      control: 'select',
      options: ['cover', 'contain', 'fill', 'none', 'scale-down'],
      description: 'How the image fills the frame (`object-fit`).',
      table: { defaultValue: { summary: 'cover' } },
    },
    placeholder: {
      control: 'inline-radio',
      options: ['skeleton', 'spinner', 'none'],
      description: 'Loading surface: pulsing Skeleton, Skeleton with Spinner, or none.',
      table: { defaultValue: { summary: 'skeleton' } },
    },
    loading: {
      control: 'inline-radio',
      options: ['lazy', 'eager'],
      description: 'Native loading strategy.',
      table: { defaultValue: { summary: 'lazy' } },
    },
    sizes: {
      control: 'text',
      description: 'Slot widths for `w` candidates. Lazy width sets default to `auto, 100vw`.',
      table: { defaultValue: { summary: 'derived' } },
    },
    fetchPriority: {
      control: 'select',
      options: ['', 'high', 'low', 'auto'],
      description: '`fetchpriority` request hint.',
      table: { defaultValue: { summary: "''" } },
    },
    zoom: {
      control: 'inline-radio',
      options: ['none', 'in', 'out'],
      description: 'Hover zoom direction.',
      table: { defaultValue: { summary: 'none' } },
    },
    zoomed: {
      control: 'boolean',
      description: 'Applies the zoom state without hover, e.g. from a hovered card.',
      table: { defaultValue: { summary: 'false' } },
    },
    parallax: {
      control: 'select',
      options: [
        'none',
        'up',
        'down',
        'left',
        'right',
        'zoom-in',
        'zoom-out',
        'up zoom-in',
        'down zoom-out',
      ],
      description:
        'Scroll-linked effects: one direction (`up`, `down`, `left`, `right`) and/or a scroll zoom (`zoom-in`, `zoom-out`).',
      table: { defaultValue: { summary: 'none' } },
    },
    parallaxDepth: {
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: '`parallax-depth`: enlargement and travel of the parallax image.',
      table: { defaultValue: { summary: '0.3' } },
    },
    parallaxSmoothing: {
      control: { type: 'range', min: 0, max: 0.95, step: 0.05 },
      description:
        '`parallax-smoothing`: how far parallax and scroll zoom trail the scroll; 0 is locked to it.',
      table: { defaultValue: { summary: '0' } },
    },
    reveal: {
      control: 'text',
      description:
        'Viewport-entry effect, run once: any of `fade up down left right zoom-in zoom-out`.',
      table: { defaultValue: { summary: "''" } },
    },
    revealRepeat: {
      control: 'boolean',
      description:
        '`reveal-repeat`: reveal again on every viewport entry instead of only the first.',
      table: { defaultValue: { summary: 'false' } },
    },
    revealHold: {
      control: 'boolean',
      description: '`reveal-hold`: a ready reveal waits in its start state until this is cleared.',
      table: { defaultValue: { summary: 'false' } },
    },
    alt: {
      control: 'text',
      description: 'Accessible name; empty marks the image decorative.',
      table: { defaultValue: { summary: "''" } },
    },
  },
  render: (args) =>
    html`<tp-image
      style="max-inline-size: 40rem"
      .ratio=${args.ratio}
      .fit=${args.fit}
      .placeholder=${args.placeholder}
      .loading=${args.loading}
      sizes=${ifDefined(args.sizes || undefined)}
      .fetchPriority=${args.fetchPriority}
      .zoom=${args.zoom}
      .zoomed=${args.zoomed}
      .parallax=${args.parallax}
      .parallaxDepth=${args.parallaxDepth}
      .parallaxSmoothing=${args.parallaxSmoothing}
      .reveal=${args.reveal}
      .revealRepeat=${args.revealRepeat}
      .revealHold=${args.revealHold}
      src=${imageDefaults.src}
      srcset=${imageDefaults.srcset}
      alt=${args.alt}
    ></tp-image>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** A responsive 16:9 image with the default skeleton placeholder. */
export const Default: Story = {};
