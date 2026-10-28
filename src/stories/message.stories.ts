import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { libraryDocs } from './library-docs.js';

interface Args {
  align: 'start' | 'end';
  author: string;
  timestamp: string;
  pending: boolean;
  failed: boolean;
}

const meta = {
  title: 'Components/Message',
  component: 'tp-message',
  parameters: { docs: libraryDocs('components/message') },
  args: { align: 'start', author: 'Sam Rivera', timestamp: '', pending: false, failed: false },
  argTypes: {
    align: { control: 'select', options: ['start', 'end'] },
    author: { control: 'text' },
    timestamp: { control: 'text' },
    pending: { control: 'boolean' },
    failed: { control: 'boolean' },
  },
  render: (args) =>
    html`<tp-message
      .align=${args.align}
      .author=${args.author}
      .timestamp=${args.timestamp}
      .pending=${args.pending}
      .failed=${args.failed}
    >
      <tp-avatar slot="avatar" fallback="SR" alt="Sam Rivera"></tp-avatar>
      <tp-bubble .align=${args.align}>Have you included the keyboard review?</tp-bubble>
    </tp-message>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
