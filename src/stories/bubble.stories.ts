import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { bubbleExamples } from './bubble.examples.js';
import documentation from '../../docs/bubble.md?raw';
import {
  renderBubbleExample,
  bubbleDefaults,
  type BubbleArgs,
} from './presentation-primitives.examples.js';
const meta = {
  title: 'Components/Bubble',
  component: 'tp-bubble',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: { description: { component: documentation }, examples: bubbleExamples },
  },
  args: bubbleDefaults,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'subdued', 'tinted', 'outline', 'ghost', 'destructive'],
    },
    align: { control: 'select', options: ['start', 'end'] },
    reactionSide: { control: 'select', options: ['block-start', 'block-end'] },
    reactionsAlign: { control: 'select', options: ['start', 'end'] },
    label: { control: 'text' },
  },
  render: renderBubbleExample,
} satisfies Meta<BubbleArgs>;
export default meta;
type Story = StoryObj<BubbleArgs>;
export const Default: Story = {};
