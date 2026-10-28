import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import documentation from '../../docs/marker.md?raw';
import { markerExamples } from './marker.examples.js';

const meta = {
  title: 'Components/Marker',
  component: 'tp-marker',
  parameters: {
    docs: { description: { component: documentation }, examples: markerExamples },
  },
  args: { variant: 'default', shimmer: false, label: 'Conversation compacted', tone: 'neutral' },
  argTypes: {
    variant: { control: 'select', options: ['default', 'separator', 'border'] },
    shimmer: { control: 'boolean' },
    label: { control: 'text' },
    tone: { control: 'select', options: ['neutral', 'accent', 'danger', 'success'] },
  },
  render: (args) =>
    html`<tp-marker
      .variant=${args.variant}
      .shimmer=${args.shimmer}
      .label=${args.label}
      .tone=${args.tone}
    ></tp-marker>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
