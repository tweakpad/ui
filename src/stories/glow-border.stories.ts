import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';

interface Args {
  trigger: '' | 'none' | 'always' | 'hover' | 'focus' | 'pointer';
  motion: string;
  lights: number;
  rotation: 'cw' | 'ccw';
  trackReach: number;
}

const meta = {
  title: 'Motion/Surface/Glow border',
  component: 'tp-mo-glow-border',
  parameters: { docs: libraryDocs('motion/surface/glow-border') },
  args: {
    trigger: '',
    motion: '',
    lights: 2,
    rotation: 'cw',
    trackReach: 160,
  },
  argTypes: {
    trigger: {
      control: 'select',
      options: ['', 'none', 'always', 'hover', 'focus', 'pointer'],
      description: 'When the glow lights; unset, `always` for a named motion, `pointer` otherwise.',
      table: { defaultValue: { summary: '' } },
    },
    motion: {
      control: 'select',
      options: ['', 'comets', 'sweep', 'pulse', 'glint', 'sweep pulse'],
      description: 'Motions of the glow: comets, sweep, pulse and glint, which combine.',
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
      description: 'Which way comets, the sweep and the glint go.',
      table: { defaultValue: { summary: 'cw' } },
    },
    trackReach: {
      control: { type: 'range', min: 40, max: 400, step: 10 },
      description: '`track-reach`: distance in pixels at which the tracked light fades out.',
      table: { defaultValue: { summary: '160' } },
    },
  },
  render: (args) =>
    html`<tp-mo-glow-border
      style="inline-size:min(100%, 26rem)"
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
    </tp-mo-glow-border>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** A card whose border glows in color where the pointer comes near it. */
export const Default: Story = {};
