import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import documentation from '../../docs/timeline.md?raw';
import { timelineDefaultSource, timelineExamples } from './timeline.examples.js';

interface Args {
  orientation: 'vertical' | 'horizontal' | 'responsive';
  align: 'start' | 'end' | 'alternate' | 'alternate-reverse';
  value: string;
}

const values = ['', 'placed', 'confirmed', 'shipped', 'transit', 'delivered'];

const meta = {
  title: 'Components/Timeline',
  component: 'tp-timeline',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      examples: timelineExamples,
      source: { code: timelineDefaultSource },
    },
  },
  args: { orientation: 'vertical', align: 'end', value: 'shipped' },
  argTypes: {
    orientation: {
      control: 'inline-radio',
      options: ['vertical', 'horizontal', 'responsive'],
      description: 'Axis direction; `responsive` is vertical below a 40rem inline size.',
      table: { defaultValue: { summary: 'vertical' } },
    },
    align: {
      control: 'inline-radio',
      options: ['start', 'end', 'alternate', 'alternate-reverse'],
      description: 'Side of the axis holding item content.',
      table: { defaultValue: { summary: 'end' } },
    },
    value: {
      control: 'select',
      options: values,
      description:
        'Value of the current item: earlier items are complete, later ones upcoming. Empty derives no status.',
      table: { defaultValue: { summary: 'null' } },
    },
  },
  render: (args) => {
    // The default source is the composition; controls set the timeline's own properties.
    const markup = timelineDefaultSource
      .replace(
        'value="shipped"',
        `${args.value ? `value="${args.value}"` : ''} orientation="${args.orientation}" align="${args.align}"`,
      )
      .replace(
        'max-inline-size: 24rem',
        args.orientation === 'vertical' && !args.align.startsWith('alternate')
          ? 'max-inline-size: 24rem'
          : 'max-inline-size: 44rem',
      );
    return html`${unsafeHTML(markup)}`;
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** An order tracked through five steps; the value marks the current step. */
export const Default: Story = {};
