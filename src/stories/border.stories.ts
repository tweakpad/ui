import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';

interface Args {
  effect: '' | 'glow' | 'dash';
  trigger: '' | 'none' | 'always' | 'hover' | 'focus' | 'pointer';
  motion: string;
  lights: number;
  rotation: 'cw' | 'ccw';
  trackReach: number;
}

const meta = {
  title: 'Motion/Surface/Border',
  component: 'tp-mo-border',
  parameters: { docs: libraryDocs('motion/surface/border') },
  args: {
    effect: '',
    trigger: '',
    motion: '',
    lights: 2,
    rotation: 'cw',
    trackReach: 160,
  },
  argTypes: {
    effect: {
      control: 'inline-radio',
      options: ['', 'glow', 'dash'],
      description: 'The effect drawn on the border; unset, it follows `motion`.',
      table: { defaultValue: { summary: '' } },
    },
    trigger: {
      control: 'select',
      options: ['', 'none', 'always', 'hover', 'focus', 'pointer'],
      description:
        'When the effect shows and moves; unset, `always` for dashes and named glow motions, `pointer` otherwise.',
      table: { defaultValue: { summary: '' } },
    },
    motion: {
      control: 'select',
      options: [
        '',
        'comets',
        'sweep',
        'pulse',
        'glint',
        'sweep pulse',
        'march',
        'breathe',
        'draw',
        'march breathe',
      ],
      description:
        'Glow motions (comets, sweep, pulse, glint) or dash motions (march, breathe, draw).',
      table: { defaultValue: { summary: '' } },
    },
    lights: {
      control: { type: 'range', min: 1, max: 5, step: 1 },
      description: 'Number of comets.',
      table: { defaultValue: { summary: '2' } },
    },
    rotation: {
      control: 'inline-radio',
      options: ['cw', 'ccw'],
      description: 'Which way comets, the sweep, the glint and marching dashes go.',
      table: { defaultValue: { summary: 'cw' } },
    },
    trackReach: {
      control: { type: 'range', min: 40, max: 400, step: 10 },
      description: '`track-reach`: distance in pixels at which the tracked light fades out.',
      table: { defaultValue: { summary: '160' } },
    },
  },
  render: (args) =>
    html`<tp-mo-border
      style="inline-size:min(100%, 26rem)"
      effect=${args.effect}
      trigger=${args.trigger}
      motion=${args.motion}
      .lights=${args.lights}
      rotation=${args.rotation}
      .trackReach=${args.trackReach}
    >
      <tp-card>
        <h3 slot="header">Tide station 7</h3>
        <span slot="description">Readings every ten minutes from the north pier.</span>
        <p style="margin:0">Water level 2.4 m and rising. Move the pointer toward the edge.</p>
      </tp-card>
    </tp-mo-border>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** A card whose border glows in color where the pointer comes near it. */
export const Default: Story = {};
