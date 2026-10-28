import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { skeletonProfile } from './skeleton.examples.js';
import { libraryDocs } from './library-docs.js';
interface Args {
  motion: 'pulse' | 'sweep' | 'none';
  animated: boolean;
  motionPolicy: 'inherit' | 'normal' | 'reduce';
}
const meta = {
  title: 'Components/Skeleton',
  component: 'tp-skeleton',
  parameters: { docs: libraryDocs('components/skeleton') },
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
