import { html } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { TpMessageScroller } from '../components/message-scroller/index.js';
import './message-scroller-streaming.js';
import { libraryDocs } from './library-docs.js';

interface Args {
  label: string;
  initialPosition: TpMessageScroller['initialPosition'];
  follow: boolean;
  defaultPinned: boolean;
  threshold: number;
  readingLine: number;
  previousItemPeek: number;
  returnControlPeek: number;
  preserveOnPrepend: boolean;
  returnDirection: 'start' | 'end';
}
const meta = {
  title: 'Components/Message scroller',
  component: 'tp-message-scroller',
  parameters: { docs: libraryDocs('components/message-scroller') },
  args: {
    label: 'Conversation',
    initialPosition: 'end',
    follow: false,
    defaultPinned: true,
    threshold: 8,
    readingLine: 0,
    previousItemPeek: 64,
    returnControlPeek: 0,
    preserveOnPrepend: true,
    returnDirection: 'end',
  },
  argTypes: {
    label: { control: 'text' },
    initialPosition: {
      control: 'select',
      options: ['start', 'end', 'last-anchor', 'preserve'],
    },
    follow: { control: 'boolean' },
    defaultPinned: { control: 'boolean' },
    threshold: { control: { type: 'number', min: 0 } },
    readingLine: { control: { type: 'number', min: 0 } },
    previousItemPeek: { control: { type: 'number', min: 0 } },
    returnControlPeek: { control: { type: 'number', min: 0 } },
    preserveOnPrepend: { control: 'boolean' },
    returnDirection: {
      control: 'select',
      options: ['start', 'end'],
    },
  },
  render: (args) =>
    html`${keyed(
      `${args.initialPosition}/${args.defaultPinned}`,
      html`<message-scroller-demo .scrollerOptions=${args}></message-scroller-demo>`,
    )}`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
