import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { libraryDocs } from './library-docs.js';
import {
  renderEmptyStateExample,
  emptyStateDefaults,
  type EmptyStateArgs,
} from './presentation-primitives.examples.js';
const meta = {
  title: 'Components/Empty state',
  component: 'tp-empty-state',
  parameters: { docs: libraryDocs('components/empty-state') },
  args: emptyStateDefaults,
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    mediaTreatment: { control: 'select', options: ['plain', 'icon'] },
  },
  render: renderEmptyStateExample,
} satisfies Meta<EmptyStateArgs>;
export default meta;
type Story = StoryObj<EmptyStateArgs>;
export const Default: Story = {};
