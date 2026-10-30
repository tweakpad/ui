import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';

interface Args {
  trigger: '' | 'none' | 'always' | 'hover' | 'focus';
}

const meta = {
  title: 'Motion/Surface/Segment border',
  component: 'tp-mo-segment-border',
  parameters: { docs: libraryDocs('motion/surface/segment-border') },
  args: { trigger: '' },
  argTypes: {
    trigger: {
      control: 'select',
      options: ['', 'none', 'always', 'hover', 'focus'],
      description: 'When the segments play; unset, `hover`.',
      table: { defaultValue: { summary: '' } },
    },
  },
  render: (args) =>
    html`<tp-mo-segment-border trigger=${args.trigger}>
      <tp-button variant="outline">Reserve a mooring</tp-button>
      <tp-mo-border-segment
        draw="0% 0%, 0% 50%"
        duration="420"
        easing="ease-out"
      ></tp-mo-border-segment>
      <tp-mo-border-segment
        draw="100% 100%, 50% 100%"
        duration="420"
        delay="60"
        easing="ease-out"
      ></tp-mo-border-segment>
    </tp-mo-segment-border>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** A button whose border draws in from two corners that meet while it is hovered. */
export const Default: Story = {};
