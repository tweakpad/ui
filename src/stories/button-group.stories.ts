import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import buttonGroupDocumentation from '../../docs/button-group.md?raw';
import { navigationIcons } from '../icons/navigation.js';
import { buttonGroupExamples } from './button-group.examples.js';

interface ButtonGroupStoryArgs {
  orientation: 'horizontal' | 'vertical';
  joined: boolean;
  label: string;
}

const meta: Meta<ButtonGroupStoryArgs> = {
  title: 'Components/Button group',
  component: 'tp-button-group',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      examples: buttonGroupExamples,
      description: { component: buttonGroupDocumentation.replace(/^# Button group\n/u, '') },
    },
  },
  args: {
    orientation: 'horizontal',
    joined: true,
    label: 'Actions',
  },
  argTypes: {
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
      description: 'Layout and joined-seam axis; member order and semantics stay unchanged.',
      table: { category: 'Layout', defaultValue: { summary: 'horizontal' } },
    },
    joined: {
      control: 'boolean',
      description: 'Merges adjacent Button boundaries without overlapping hit targets.',
      table: { category: 'Layout', defaultValue: { summary: 'true' } },
    },
    label: {
      control: 'text',
      description: 'Accessible name for the group.',
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
