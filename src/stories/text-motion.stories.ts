import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { libraryDocs } from './library-docs.js';

const text = 'Quiet spaces, open light, and rooms that breathe';

interface Args {
  split: string;
  mask: 'none' | 'lines' | 'words' | 'chars';
  reveal: string;
  stagger: number;
  staggerFrom: 'first' | 'last' | 'center';
  revealRepeat: boolean;
  revealHold: boolean;
}

const meta = {
  title: 'Components/Text motion',
  component: 'tp-text-motion',
  parameters: { docs: libraryDocs('components/text-motion') },
  args: {
    split: 'words lines',
    mask: 'lines',
    reveal: 'up',
    stagger: 30,
    staggerFrom: 'first',
    revealRepeat: false,
    revealHold: false,
  },
  argTypes: {
    split: {
      control: 'select',
      options: ['words', 'chars', 'lines', 'words lines', 'chars lines'],
      table: { defaultValue: { summary: 'words' } },
    },
    mask: {
      control: 'inline-radio',
      options: ['none', 'lines', 'words', 'chars'],
      table: { defaultValue: { summary: 'none' } },
    },
    reveal: {
      control: 'text',
      table: { defaultValue: { summary: 'coordinator default, or fade up' } },
    },
    stagger: {
      control: { type: 'range', min: 0, max: 200, step: 5 },
      table: { defaultValue: { summary: '30' } },
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
  },
  render: (args) =>
    html`<h2 style="margin: 0; max-inline-size: 36rem; font-size: 2.5rem; line-height: 1.1">
      <tp-text-motion
        split=${args.split}
        mask=${args.mask}
        reveal=${ifDefined(args.reveal)}
        .stagger=${args.stagger}
        stagger-from=${args.staggerFrom}
        .revealRepeat=${args.revealRepeat}
        .revealHold=${args.revealHold}
        >${text}</tp-text-motion
      >
    </h2>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** A heading whose lines rise from behind their masks as it enters the viewport. */
export const Default: Story = {};
