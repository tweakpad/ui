import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { libraryDocs } from './library-docs.js';
import {
  renderAspectRatioExample,
  aspectRatioDefaults,
  type AspectRatioArgs,
} from './presentation-primitives.examples.js';
const meta = {
  title: 'Components/Aspect-ratio box',
  component: 'tp-aspect-ratio',
  parameters: { docs: libraryDocs('components/aspect-ratio') },
  args: aspectRatioDefaults,
  argTypes: {
    ratio: { control: { type: 'number', min: 0.1, step: 0.1 } },
    fit: { control: 'select', options: ['fill', 'contain', 'cover', 'none', 'scale-down'] },
  },
  render: renderAspectRatioExample,
} satisfies Meta<AspectRatioArgs>;
export default meta;
type Story = StoryObj<AspectRatioArgs>;
export const Default: Story = {};
