import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { skeletonProfile, skeletonExamples, skeletonSource } from './skeleton.examples.js';
import documentation from '../../docs/skeleton.md?raw';
interface Args {
  motion: 'pulse' | 'sweep' | 'none';
  animated: boolean;
  motionPolicy: 'inherit' | 'normal' | 'reduce';
}
const meta = {
  title: 'Components/Skeleton',
  component: 'tp-skeleton',
  parameters: {
    docs: {
      description: { component: documentation },
      source: { code: skeletonSource },
      examples: skeletonExamples,
    },
  },
  args: { motion: 'pulse', animated: true, motionPolicy: 'inherit' },
  argTypes: {
    motion: { control: 'select', options: ['pulse', 'sweep', 'none'] },
    animated: { control: 'boolean' },
    motionPolicy: { control: 'select', options: ['inherit', 'normal', 'reduce'] },
  },
  render: skeletonProfile,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
