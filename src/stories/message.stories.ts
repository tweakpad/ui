import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import documentation from '../../docs/message.md?raw';
const source = `<tp-message author="Sam Rivera" timestamp="09:12">
  <tp-avatar slot="avatar" fallback="SR" alt="Sam Rivera" size="sm"></tp-avatar>
  <tp-bubble variant="secondary">The updated design is ready for review.</tp-bubble>
</tp-message>
<tp-message align="end" author="Alex Morgan" timestamp="09:18">
  <tp-avatar slot="avatar" fallback="AM" alt="Alex Morgan" size="sm"></tp-avatar>
  <tp-bubble align="end">Thanks. I’ll review it this afternoon.</tp-bubble>
  <span slot="footer">Delivered</span>
</tp-message>`;
const meta = {
  title: 'Components/Message',
  component: 'tp-message',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: { description: { component: documentation }, source: { code: source } },
  },
  args: { align: 'end', author: 'Alex Morgan', timestamp: '09:18' },
  argTypes: {
    align: { control: 'select', options: ['start', 'end'] },
    author: { control: 'text' },
    timestamp: { control: 'text' },
  },
  render: (args) =>
    html`<div
      style="display:grid;gap:var(--tp-space-6);max-inline-size:calc(var(--tp-spacing) * 220)"
    >
      <tp-message author="Sam Rivera" timestamp="09:12"
        ><tp-avatar slot="avatar" fallback="SR" alt="Sam Rivera" size="sm"></tp-avatar
        ><tp-bubble variant="secondary"
          >The updated design is ready for review.</tp-bubble
        ></tp-message
      >
      <tp-message .align=${args.align} .author=${args.author} .timestamp=${args.timestamp}
        ><tp-avatar slot="avatar" fallback="AM" alt="Alex Morgan" size="sm"></tp-avatar
        ><tp-bubble .align=${args.align}>Thanks. I’ll review it this afternoon.</tp-bubble
        ><span slot="footer">Delivered</span></tp-message
      >
    </div>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
