import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';

interface Args {
  stagger: number;
  staggerFrom: 'first' | 'last' | 'center';
  revealRepeat: boolean;
  revealHold: boolean;
}

const meta = {
  title: 'Motion/Text/Text mirror',
  component: 'tp-mo-text-mirror',
  parameters: { docs: libraryDocs('motion/text/text-mirror') },
  args: {
    stagger: 90,
    staggerFrom: 'first',
    revealRepeat: true,
    revealHold: false,
  },
  argTypes: {
    stagger: {
      control: { type: 'range', min: 0, max: 300, step: 10 },
      description: 'Milliseconds between consecutive lines.',
      table: { defaultValue: { summary: '30' } },
    },
    staggerFrom: {
      control: 'inline-radio',
      options: ['first', 'last', 'center'],
      description: '`stagger-from`: the line the stagger starts from.',
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
      style="margin:0;inline-size:32rem;max-inline-size:100%;font-size:2.75rem;line-height:1.05;font-weight:600;letter-spacing:-0.02em;text-align:center"
    >
      <tp-mo-text-mirror
        .stagger=${args.stagger}
        stagger-from=${args.staggerFrom}
        .revealRepeat=${args.revealRepeat}
        .revealHold=${args.revealHold}
        >Every review, every comment, in one shared timeline</tp-mo-text-mirror
      >
    </p>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** A heading whose lines open from the middle of their text as it enters the viewport. */
export const Default: Story = {};
