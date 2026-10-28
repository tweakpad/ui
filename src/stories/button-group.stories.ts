import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { navigationIcons } from '../icons/navigation.js';
import { libraryDocs } from './library-docs.js';

interface ButtonGroupStoryArgs {
  orientation: 'horizontal' | 'vertical';
  joined: boolean;
  label: string;
}

const meta: Meta<ButtonGroupStoryArgs> = {
  title: 'Components/Button group',
  component: 'tp-button-group',
  parameters: { docs: libraryDocs('components/button-group') },
  args: {
    orientation: 'horizontal',
    joined: true,
    label: 'Actions',
  },
  argTypes: {
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
      table: { category: 'Layout', defaultValue: { summary: 'horizontal' } },
    },
    joined: {
      control: 'boolean',
      table: { category: 'Layout', defaultValue: { summary: 'true' } },
    },
    label: {
      control: 'text',
      table: { category: 'Accessibility', defaultValue: { summary: 'Actions' } },
    },
  },
  render: (args) => html`
    <tp-button-group orientation=${args.orientation} .joined=${args.joined} label=${args.label}>
      <tp-button variant="outline">Archive</tp-button>
      <tp-button variant="outline">Report</tp-button>
      <tp-button
        variant="outline"
        .icon=${navigationIcons.more}
        size="icon"
        aria-label="More actions"
      >
      </tp-button>
    </tp-button-group>
  `,
};

export default meta;
type Story = StoryObj<ButtonGroupStoryArgs>;

export const Default: Story = {};
