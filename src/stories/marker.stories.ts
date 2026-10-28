import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { libraryDocs } from './library-docs.js';

const meta = {
  title: 'Components/Marker',
  component: 'tp-marker',
  parameters: { docs: libraryDocs('components/marker') },
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
