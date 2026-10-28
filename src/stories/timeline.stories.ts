import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { libraryDocs } from './library-docs.js';

const date = (value: string) =>
  `<tp-time datetime="${value}" mode="absolute" pattern="MMM d"></tp-time>`;
const muted = 'color: var(--tp-muted-foreground)';

const timelineDefaultSource = `<tp-timeline value="shipped" aria-label="Order status" style="max-inline-size: 24rem">
  <tp-timeline-item value="placed">
    <strong>Placed</strong>
    <div style="${muted}">${date('2026-03-18')}</div>
  </tp-timeline-item>
  <tp-timeline-item value="confirmed">
    <strong>Confirmed</strong>
    <div style="${muted}">${date('2026-03-18')}</div>
  </tp-timeline-item>
  <tp-timeline-item value="shipped">
    <strong>Shipped</strong>
    <div style="${muted}">${date('2026-03-19')}</div>
  </tp-timeline-item>
  <tp-timeline-item value="transit">
    <strong>In transit</strong>
    <div style="${muted}">${date('2026-03-20')}</div>
  </tp-timeline-item>
  <tp-timeline-item value="delivered">
    <strong>Delivered</strong>
    <div style="${muted}">${date('2026-03-21')}</div>
  </tp-timeline-item>
</tp-timeline>`;

interface Args {
  orientation: 'vertical' | 'horizontal' | 'responsive';
  align: 'start' | 'end' | 'alternate' | 'alternate-reverse';
  value: string;
}

const values = ['', 'placed', 'confirmed', 'shipped', 'transit', 'delivered'];

const meta = {
  title: 'Components/Timeline',
  component: 'tp-timeline',
  parameters: { docs: libraryDocs('components/timeline') },
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
