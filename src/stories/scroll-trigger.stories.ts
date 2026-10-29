import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';

const photo = (id: string, width: number) =>
  `https://images.unsplash.com/${id}?w=${width}&q=75&auto=format&fit=crop`;
const widths = (id: string) =>
  [480, 800, 1200].map((width) => `${photo(id, width)} ${width}w`).join(', ');
const rooms = [
  'photo-1497366754035-f200968a6e72',
  'photo-1497215728101-856f4ea42174',
  'photo-1548516173-3cabfa4607e9',
];

const scrollTriggerDefaultSource = `<tp-scroll-trigger stagger="200">
  <h3 style="margin: 0 0 var(--tp-space-3); font-size: 2rem; line-height: 1.1">
    <tp-mo-text-split split="words lines" mask="lines" reveal="up">Quiet spaces, open light</tp-mo-text-split>
  </h3>
  <tp-image-group reveal="fade up" stagger="120">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--tp-space-3)">
${rooms
  .map(
    (id) =>
      `      <tp-image ratio="1" src="${photo(id, 800)}" srcset="${widths(id)}" sizes="(min-width: 48rem) 15rem, 33vw" alt=""></tp-image>`,
  )
  .join('\n')}
    </div>
  </tp-image-group>
  <p style="margin: var(--tp-space-3) 0 0; color: var(--tp-muted-foreground)">
    <tp-mo-text-split reveal="fade">Three rooms designed for focused work.</tp-mo-text-split>
  </p>
</tp-scroll-trigger>`;

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
      description: 'Milliseconds between consecutive members.',
      table: { defaultValue: { summary: '0' } },
    },
    staggerFrom: {
      control: 'inline-radio',
      options: ['first', 'last', 'center'],
      description: '`stagger-from`: the member the stagger starts from.',
      table: { defaultValue: { summary: 'first' } },
    },
    revealRepeat: {
      control: 'boolean',
      description: '`reveal-repeat`: reset every member once out of view and replay on entry.',
      table: { defaultValue: { summary: 'false' } },
    },
    revealHold: {
      control: 'boolean',
      description: '`reveal-hold`: hold every member in its start state until cleared.',
      table: { defaultValue: { summary: 'false' } },
    },
    scrub: {
      control: 'boolean',
      description: 'Follow the scroll position instead of time, in both directions.',
      table: { defaultValue: { summary: 'false' } },
    },
    scrubRange: {
      control: 'text',
      description:
        '`scrub-range`: the scroll range mapped to progress: `contain`, `cover`, `entry`, `exit`, or start and end offsets such as `entry 25% contain 40%`.',
      table: { defaultValue: { summary: 'contain' } },
    },
    scrubSmoothing: {
      control: { type: 'range', min: 0, max: 0.95, step: 0.05 },
      description: '`scrub-smoothing`: how far progress trails the scroll; 0 is locked to it.',
      table: { defaultValue: { summary: '0' } },
    },
    scrubOnce: {
      control: 'boolean',
      description:
        '`scrub-once`: scrubbed progress only moves forward; scrolling back leaves members at rest.',
      table: { defaultValue: { summary: 'false' } },
    },
    pin: {
      control: 'boolean',
      description:
        'Pin the content in a sticky stage for `--tp-scroll-trigger-pin-length` (twice the visible extent).',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  render: (args) => {
    // The default source is the composition; story controls set the trigger's own properties.
    const markup = scrollTriggerDefaultSource
      .replace('stagger="200"', `stagger="${args.stagger}" stagger-from="${args.staggerFrom}"`)
      .replace(
        '<tp-scroll-trigger',
        `<tp-scroll-trigger${args.revealRepeat ? ' reveal-repeat' : ''}${args.revealHold ? ' reveal-hold' : ''}${args.scrub ? ` scrub scrub-range="${args.scrubRange}" scrub-smoothing="${args.scrubSmoothing}"${args.scrubOnce ? ' scrub-once' : ''}` : ''}${args.pin ? ' pin' : ''}`,
      );
    return html`<div style="max-inline-size: 48rem">${unsafeHTML(markup)}</div>`;
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** A heading, an image group and a caption revealed in order once the images have loaded. */
export const Default: Story = {};
