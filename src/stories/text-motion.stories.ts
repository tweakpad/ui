import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import documentation from '../../docs/text-motion.md?raw';
import {
  textMotionDefaults,
  textMotionDefaultSource,
  textMotionExamples,
} from './text-motion.examples.js';

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
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      examples: textMotionExamples,
      source: { code: textMotionDefaultSource },
    },
  },
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
      description: 'Units to create; the finest unit animates.',
      table: { defaultValue: { summary: 'words' } },
    },
    mask: {
      control: 'inline-radio',
      options: ['none', 'lines', 'words', 'chars'],
      description: 'The unit clipped so pieces emerge from behind it (must be a split unit).',
      table: { defaultValue: { summary: 'none' } },
    },
    reveal: {
      control: 'text',
      description:
        'Effect tokens: any of `fade up down left right zoom-in zoom-out blur`; empty disables.',
      table: { defaultValue: { summary: 'coordinator default, or fade up' } },
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
      description: '`reveal-hold`: a ready reveal waits until this is cleared.',
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
        >${textMotionDefaults.text}</tp-text-motion
      >
    </h2>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** A heading whose lines rise from behind their masks as it enters the viewport. */
export const Default: Story = {};
