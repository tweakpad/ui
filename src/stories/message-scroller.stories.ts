import { html } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { TpMessageScroller } from '../components/message-scroller/index.js';
import './message-scroller.examples.js';
import { messageScrollerExamples } from './message-scroller.examples.js';
import documentation from '../../docs/message-scroller.md?raw';

const baseRows = [
  'Welcome to the project. I have shared the launch checklist.',
  'Thanks! The design review is complete.',
  'The remaining work is keyboard navigation and the first-run experience.',
  'Let’s test those together before the pilot.',
  'I will collect the findings in the checklist.',
  'Good plan. Keep the first release focused on one successful journey.',
  'We can review the results tomorrow.',
  'Everything is ready for the next review.',
];
const baseMessages = baseRows
  .map(
    (text, i) =>
      `<tp-message-scroller-item message-id="message-${i}"><tp-message author="${i % 2 ? 'You' : 'Alex'}" align="${i % 2 ? 'end' : 'start'}"><tp-bubble variant="${i % 2 ? 'secondary' : 'ghost'}" align="${i % 2 ? 'end' : 'start'}">${text}</tp-bubble></tp-message></tp-message-scroller-item>`,
  )
  .join('\n');
const baseSource = `<tp-message-scroller label="Project conversation" style="max-inline-size:40rem">
  <tp-message-scroller-viewport><tp-message-scroller-content>
    ${baseMessages}
  </tp-message-scroller-content></tp-message-scroller-viewport>
  <tp-message-scroller-return-control></tp-message-scroller-return-control>
</tp-message-scroller>`;

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
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      examples: messageScrollerExamples,
      source: { code: baseSource },
    },
  },
  args: {
    label: 'Project conversation',
    initialPosition: 'end',
    follow: true,
    defaultPinned: true,
    threshold: 8,
    readingLine: 0,
    previousItemPeek: 0,
    returnControlPeek: 0,
    preserveOnPrepend: true,
    returnDirection: 'end',
  },
  argTypes: {
    label: { control: 'text' },
    initialPosition: {
      control: 'select',
      options: ['start', 'end', 'last-anchor', 'preserve'],
      description: 'Applied once. This story remounts when opening controls change.',
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
      description:
        'Root configures the implicit control. This explicit example binds the same value to its Return control.',
    },
  },
  render: (args) =>
    html`${keyed(
      `${args.initialPosition}/${args.defaultPinned}`,
      html` <tp-message-scroller
        style="max-inline-size:40rem"
        .label=${args.label}
        .initialPosition=${args.initialPosition}
        .follow=${args.follow}
        .defaultPinned=${args.defaultPinned}
        .threshold=${args.threshold}
        .readingLine=${args.readingLine}
        .previousItemPeek=${args.previousItemPeek}
        .returnControlPeek=${args.returnControlPeek}
        .preserveOnPrepend=${args.preserveOnPrepend}
        .returnDirection=${args.returnDirection}
      >
        <tp-message-scroller-viewport
          ><tp-message-scroller-content>
            ${unsafeHTML(baseMessages)}
          </tp-message-scroller-content></tp-message-scroller-viewport
        >
        <tp-message-scroller-return-control
          .returnDirection=${args.returnDirection}
        ></tp-message-scroller-return-control>
      </tp-message-scroller>`,
    )}`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
