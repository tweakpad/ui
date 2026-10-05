import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { TpMessage } from '../components/message/index.js';
import type { TpBubble } from '../components/bubble/index.js';
import { messageExamples } from './message.examples.js';
import documentation from '../../docs/message.md?raw';

const conversation = messageExamples[0]!;
const meta = {
  title: 'Components/Message',
  component: 'tp-message',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      examples: messageExamples.slice(1),
      description: { component: documentation },
      source: { code: conversation.code, language: 'html' },
    },
  },
  args: { align: 'end', author: '', timestamp: '' },
  argTypes: {
    align: {
      control: 'select',
      options: ['start', 'end'],
      description: 'Alignment of the third conversation row.',
    },
    author: { control: 'text', description: 'Optional sender header on the third row.' },
    timestamp: { control: 'text', description: 'Optional timestamp on the third row.' },
  },
  render: (args) =>
    html`<div
      ${ref((node) => {
        if (!node) return;
        queueMicrotask(() => {
          const row = node.querySelectorAll<TpMessage>('tp-message')[2];
          if (!row) return;
          row.align = args.align as 'start' | 'end';
          row.author = args.author;
          row.timestamp = args.timestamp;
          const bubble = row.querySelector<TpBubble>('tp-bubble');
          if (bubble) bubble.align = row.align;
        });
      })}
    >
      ${conversation.render()}
    </div>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
