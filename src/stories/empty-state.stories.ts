import type { Meta, StoryObj } from '@storybook/web-components-vite';
import documentation from '../../docs/empty-state.md?raw';
import { emptyStateExamples } from './empty-state.examples.js';
import {
  renderEmptyStateExample,
  emptyStateDefaults,
  type EmptyStateArgs,
} from './presentation-primitives.examples.js';
const meta = {
  title: 'Components/Empty state',
  component: 'tp-empty-state',
  parameters: {
    docs: {
      description: { component: documentation },
      examples: emptyStateExamples,
      source: {
        code: '<tp-empty-state title="No results" description="Try a different query."><tp-button slot="actions">Clear filters</tp-button></tp-empty-state>',
      },
    },
  },
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
