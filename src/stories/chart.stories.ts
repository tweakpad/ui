import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import type { ChartInteraction, ChartLegendOptions } from '../components/chart/index.js';
import { libraryDocs } from './library-docs.js';
interface Args {
  type: 'bar' | 'line' | 'lollipop';
  stacked: boolean;
  interaction: ChartInteraction;
  loading: boolean;
  legendPlacement: NonNullable<ChartLegendOptions['placement']>;
  legendValue: 'none' | 'latest' | 'sum';
}

const start = Date.UTC(2026, 10, 25);
const hour = 3_600_000;
const series = {
  '2xx': { label: '2xx' },
  '3xx': { label: '3xx' },
  '4xx': { label: '4xx' },
  '5xx': { label: '5xx' },
};
const data = Array.from({ length: 24 }, (_, i) => ({
  time: start + i * hour,
  '2xx': Math.round(20 + 120 * Math.max(0, Math.sin((i - 6) / 4))),
  '3xx': Math.round(10 + 30 * Math.abs(Math.sin(i / 3))),
  '4xx': Math.round(i < 8 ? 60 + 10 * (i % 3) : 15 + 5 * (i % 4)),
  '5xx': i % 7 === 3 ? 3 : 0,
}));

const meta = {
  title: 'Components/Chart',
  component: 'tp-chart',
  parameters: { docs: libraryDocs('components/chart') },
  args: {
    type: 'bar',
    stacked: true,
    interaction: 'both',
    loading: false,
    legendPlacement: 'top',
    legendValue: 'sum',
  },
  argTypes: {
    type: { control: 'select', options: ['bar', 'line', 'lollipop'] },
    stacked: { control: 'boolean' },
    interaction: { control: 'select', options: ['none', 'focus', 'pointer', 'both'] },
    loading: { control: 'boolean' },
    legendPlacement: {
      control: 'select',
      options: ['top', 'bottom', 'start', 'end', 'inline'],
    },
    legendValue: { control: 'select', options: ['none', 'latest', 'sum'] },
  },
  render: (args) =>
    html`<tp-card>
      <h3 slot="header">Requests by status code</h3>
      <tp-chart
        type=${args.type}
        ?stacked=${args.stacked}
        ?loading=${args.loading}
        label="Requests by status code"
        description="Requests peak in the early afternoon, mostly 2xx; 4xx responses lead in the early morning."
        interaction=${args.interaction}
        x-axis='{"type":"time","key":"time"}'
        .series=${series}
        .data=${data}
        .legendOptions=${{
          placement: args.legendPlacement,
          ...(args.legendValue === 'none' ? {} : { value: args.legendValue }),
        }}
      ></tp-chart>
    </tp-card>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
