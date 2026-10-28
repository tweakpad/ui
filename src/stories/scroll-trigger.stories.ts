import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';

const photo = (id: string, width: number) =>
  `https://images.unsplash.com/${id}?w=${width}&q=75&auto=format&fit=crop`;
const rooms = [
  'photo-1497366754035-f200968a6e72',
  'photo-1497215728101-856f4ea42174',
  'photo-1548516173-3cabfa4607e9',
];

interface Args {
  stagger: number;
  staggerFrom: 'first' | 'last' | 'center';
  revealRepeat: boolean;
  revealHold: boolean;
  scrub: boolean;
  scrubRange: string;
  scrubSmoothing: number;
  scrubOnce: boolean;
  pin: boolean;
}

const meta = {
  title: 'Components/Scroll trigger',
  component: 'tp-scroll-trigger',
  parameters: { docs: libraryDocs('components/scroll-trigger') },
  args: {
    stagger: 200,
    staggerFrom: 'first',
    revealRepeat: false,
    revealHold: false,
    scrub: false,
    scrubRange: 'contain',
    scrubSmoothing: 0,
    scrubOnce: false,
    pin: false,
  },
  argTypes: {
    stagger: {
      control: { type: 'range', min: 0, max: 600, step: 20 },
      table: { defaultValue: { summary: '0' } },
    },
    staggerFrom: {
      control: 'inline-radio',
      options: ['first', 'last', 'center'],
      table: { defaultValue: { summary: 'first' } },
    },
    revealRepeat: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    revealHold: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    scrub: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    scrubRange: {
      control: 'text',
      table: { defaultValue: { summary: 'contain' } },
    },
    scrubSmoothing: {
      control: { type: 'range', min: 0, max: 0.95, step: 0.05 },
      table: { defaultValue: { summary: '0' } },
    },
    scrubOnce: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    pin: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  render: (args) =>
    html`<div style="max-inline-size: 48rem">
      <tp-scroll-trigger
        .stagger=${args.stagger}
        stagger-from=${args.staggerFrom}
        ?reveal-repeat=${args.revealRepeat}
        ?reveal-hold=${args.revealHold}
        ?scrub=${args.scrub}
        scrub-range=${args.scrubRange}
        .scrubSmoothing=${args.scrubSmoothing}
        ?scrub-once=${args.scrubOnce}
        ?pin=${args.pin}
      >
        <h3 style="margin: 0 0 var(--tp-space-3); font-size: 2rem; line-height: 1.1">
          <tp-text-motion split="words lines" mask="lines" reveal="up"
            >Quiet spaces, open light</tp-text-motion
          >
        </h3>
        <tp-image-group reveal="fade up" stagger="120">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--tp-space-3)">
            ${rooms.map(
              (id) =>
                html`<tp-image
                  ratio="1"
                  src=${photo(id, 800)}
                  srcset=${[480, 800, 1200].map((width) => `${photo(id, width)} ${width}w`).join(', ')}
                  sizes="(min-width: 48rem) 15rem, 33vw"
                  alt=""
                ></tp-image>`,
            )}
          </div>
        </tp-image-group>
        <p style="margin: var(--tp-space-3) 0 0; color: var(--tp-muted-foreground)">
          <tp-text-motion reveal="fade">Three rooms designed for focused work.</tp-text-motion>
        </p>
      </tp-scroll-trigger>
    </div>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** A heading, an image group and a caption revealed in order once the images have loaded. */
export const Default: Story = {};
