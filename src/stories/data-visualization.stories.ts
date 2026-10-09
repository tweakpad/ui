import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { dataVisualizationExample } from './data-visualization.examples.js';
import documentation from '../../docs/data-visualization.md?raw';
import source from './data-visualization.examples.ts?raw';
interface Args {
  interaction: 'none' | 'focus' | 'pointer' | 'both';
  indicator: 'dot' | 'line' | 'dashed';
  hideLabel: boolean;
  hideIndicator: boolean;
  hideIcon: boolean;
  legendPlacement: 'top' | 'bottom';
}
const meta = {
  title: 'Components/Data visualization',
  component: 'tp-data-visualization',
  parameters: {
    docs: { description: { component: documentation }, source: { code: source } },
  },
  args: {
    interaction: 'both',
    indicator: 'dot',
    hideLabel: false,
    hideIndicator: false,
    hideIcon: false,
    legendPlacement: 'bottom',
  },
  argTypes: {
    interaction: { control: 'select', options: ['none', 'focus', 'pointer', 'both'] },
    indicator: { control: 'select', options: ['dot', 'line', 'dashed'] },
    hideLabel: { control: 'boolean' },
    hideIndicator: { control: 'boolean' },
    hideIcon: { control: 'boolean' },
    legendPlacement: { control: 'select', options: ['top', 'bottom'] },
  },
  render: (args) =>
    html`<div style="max-inline-size:calc(var(--tp-spacing) * 200);margin-inline:auto">
      ${dataVisualizationExample(args.interaction, { indicator: args.indicator, hideLabel: args.hideLabel, hideIndicator: args.hideIndicator }, { hideIcon: args.hideIcon, placement: args.legendPlacement })}
    </div>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
