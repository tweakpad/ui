import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';

interface Args {
  split: string;
  stagger: number;
  staggerFrom: 'first' | 'last' | 'center';
  revealRepeat: boolean;
  revealHold: boolean;
}

const meta = {
  title: 'Motion/Text/Text stroke',
  component: 'tp-mo-text-stroke',
  parameters: { docs: libraryDocs('motion/text/text-stroke') },
  args: {
    split: 'chars',
    stagger: 45,
    staggerFrom: 'first',
    revealRepeat: true,
    revealHold: false,
  },
  argTypes: {
    split: {
      control: 'select',
      options: ['words', 'chars', 'words lines', 'chars lines'],
      description: 'Units to create; the finest unit draws.',
      table: { defaultValue: { summary: 'words' } },
    },
    stagger: {
      control: { type: 'range', min: 0, max: 200, step: 5 },
      description: 'Milliseconds between consecutive pieces.',
      table: { defaultValue: { summary: '30' } },
    },
    staggerFrom: {
      control: 'inline-radio',
      options: ['first', 'last', 'center'],
      description: '`stagger-from`: the piece the stagger starts from.',
      table: { defaultValue: { summary: 'first' } },
    },
    revealRepeat: {
      control: 'boolean',
      description: '`reveal-repeat`: reveal again on every viewport entry.',
      table: { defaultValue: { summary: 'false' } },
    },
    revealHold: {
      control: 'boolean',
      description: '`reveal-hold`: a ready reveal waits; set on a revealed text, it hides it.',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  render: (args) =>
    html`<p
      style="margin:0;text-align:center;font-size:3.5rem;line-height:1.1;font-weight:600;letter-spacing:-0.02em"
    >
      <tp-mo-text-stroke
        split=${args.split}
        .stagger=${args.stagger}
        stagger-from=${args.staggerFrom}
        .revealRepeat=${args.revealRepeat}
        .revealHold=${args.revealHold}
        >Northern lights</tp-mo-text-stroke
      >
    </p>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** A heading whose glyph outlines draw, then fill, as it enters the viewport. */
export const Default: Story = {};
