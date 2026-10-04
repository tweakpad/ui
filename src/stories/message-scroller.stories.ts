import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import './message-scroller.examples.js';
import source from './message-scroller.examples.ts?raw';
import documentation from '../../docs/message-scroller.md?raw';
const meta = {
  title: 'Components/Message scroller',
  component: 'tp-message-scroller',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      source: {
        code:
          "import '@tweakpad/ui/register';\nimport '@tweakpad/ui/styles.css';\n" +
          source.replace('../components/message-scroller/index.js', '@tweakpad/ui') +
          '\n// Mount <message-scroller-demo></message-scroller-demo>',
        language: 'typescript',
      },
    },
  },
  args: { initialPosition: 'end', follow: true },
  argTypes: {
    initialPosition: { control: 'select', options: ['start', 'end', 'last-anchor', 'preserve'] },
    follow: { control: 'boolean' },
  },
  render: (args) =>
    html`<message-scroller-demo
      .initialPosition=${args.initialPosition}
      .follow=${args.follow}
    ></message-scroller-demo>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
