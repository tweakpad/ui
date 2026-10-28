import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { libraryDocs } from './library-docs.js';

const photo = (width: number) =>
  `https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=${width}&q=75&auto=format&fit=crop`;
const imageDefaults = {
  src: photo(1200),
  srcset: [480, 800, 1200, 1600].map((width) => `${photo(width)} ${width}w`).join(', '),
  alt: 'A bright open-plan office',
};

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
  parameters: { docs: libraryDocs('components/image') },
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
      table: { defaultValue: { summary: 'unset' } },
    },
    fit: {
      control: 'select',
      options: ['cover', 'contain', 'fill', 'none', 'scale-down'],
      table: { defaultValue: { summary: 'cover' } },
    },
    placeholder: {
      control: 'inline-radio',
      options: ['skeleton', 'spinner', 'none'],
      table: { defaultValue: { summary: 'skeleton' } },
    },
    loading: {
      control: 'inline-radio',
      options: ['lazy', 'eager'],
      table: { defaultValue: { summary: 'lazy' } },
    },
    sizes: {
      control: 'text',
      table: { defaultValue: { summary: 'derived' } },
    },
    fetchPriority: {
      control: 'select',
      options: ['', 'high', 'low', 'auto'],
      table: { defaultValue: { summary: "''" } },
    },
    zoom: {
      control: 'inline-radio',
      options: ['none', 'in', 'out'],
      table: { defaultValue: { summary: 'none' } },
    },
    zoomed: {
      control: 'boolean',
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
      table: { defaultValue: { summary: 'none' } },
    },
    parallaxDepth: {
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      table: { defaultValue: { summary: '0.3' } },
    },
    parallaxSmoothing: {
      control: { type: 'range', min: 0, max: 0.95, step: 0.05 },
      table: { defaultValue: { summary: '0' } },
    },
    reveal: {
      control: 'text',
      table: { defaultValue: { summary: "''" } },
    },
    revealRepeat: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    revealHold: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    alt: {
      control: 'text',
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
