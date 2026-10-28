import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';

interface Args {
  orientation: 'vertical' | 'horizontal' | 'responsive';
  align: 'start' | 'end' | 'alternate' | 'alternate-reverse';
  value: string;
}

const steps = [
  ['placed', 'Placed', '2026-03-18'],
  ['confirmed', 'Confirmed', '2026-03-18'],
  ['shipped', 'Shipped', '2026-03-19'],
  ['transit', 'In transit', '2026-03-20'],
  ['delivered', 'Delivered', '2026-03-21'],
] as const;
const values = ['', ...steps.map(([step]) => step)];

const meta = {
  title: 'Components/Timeline',
  component: 'tp-timeline',
  parameters: { docs: libraryDocs('components/timeline') },
  args: { orientation: 'vertical', align: 'end', value: 'shipped' },
  argTypes: {
    orientation: {
      control: 'inline-radio',
      options: ['vertical', 'horizontal', 'responsive'],
      table: { defaultValue: { summary: 'vertical' } },
    },
    align: {
      control: 'inline-radio',
      options: ['start', 'end', 'alternate', 'alternate-reverse'],
      table: { defaultValue: { summary: 'end' } },
    },
    value: {
      control: 'select',
      options: values,
      table: { defaultValue: { summary: 'null' } },
    },
  },
  render: ({ orientation, align, value }) =>
    html`<tp-timeline
      .value=${value || null}
      .orientation=${orientation}
      .align=${align}
      aria-label="Order status"
      style=${
        orientation === 'vertical' && !align.startsWith('alternate')
          ? 'max-inline-size: 24rem'
          : 'max-inline-size: 44rem'
      }
    >
      ${steps.map(
        ([step, title, datetime]) =>
          html`<tp-timeline-item value=${step}>
            <strong>${title}</strong>
            <div style="color: var(--tp-muted-foreground)">
              <tp-time datetime=${datetime} mode="absolute" pattern="MMM d"></tp-time>
            </div>
          </tp-timeline-item>`,
      )}
    </tp-timeline>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** An order tracked through five steps; the value marks the current step. */
export const Default: Story = {};
