import { html } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { TpMessageScroller } from '../components/message-scroller/index.js';
import './message-scroller.examples.js';
import { messageScrollerExamples } from './message-scroller.examples.js';
import documentation from '../../docs/message-scroller.md?raw';

import demoSource from './message-scroller-streaming.ts?raw';

const baseSource = `import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
${demoSource.replace('../components/message-scroller/index.js', '@tweakpad/ui').replaceAll(/'\.\.\/icons\/([^']+)\.js'/g, "'@tweakpad/ui/icons/$1'")}
// Mount <message-scroller-demo></message-scroller-demo>`;

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
  parameters: {
    docs: {
      description: { component: documentation },
      examples: messageScrollerExamples,
      source: { code: baseSource },
    },
  },
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
        'Direction of the explicit Return control. Press Send to populate the conversation.',
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
