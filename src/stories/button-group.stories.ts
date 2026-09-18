import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import buttonGroupDocumentation from '../../docs/button-group.md?raw';
import type { IconDefinition } from '../icons/types.js';
import { plusIcon } from '../icons/plus.js';

interface ButtonGroupStoryArgs {
  orientation: 'horizontal' | 'vertical';
  joined: boolean;
  label: string;
}

const minusIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M5 12h14', strokeWidth: 2 }],
};

const arrowLeftIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M19 12H5M12 19l-7-7 7-7', strokeWidth: 2 }],
};

const moreIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M5 12h.01M12 12h.01M19 12h.01', strokeWidth: 3 }],
};

const meta: Meta<ButtonGroupStoryArgs> = {
  title: 'Components/Button group',
  component: 'tp-button-group',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
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
      <tp-button variant="outline" .icon=${moreIcon} size="icon" aria-label="More actions">
      </tp-button>
    </tp-button-group>
  `,
};

export default meta;
type Story = StoryObj<ButtonGroupStoryArgs>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => html`
    <p>
      <tp-button-group label="Small actions">
        <tp-button variant="outline" size="sm">Small</tp-button>
        <tp-button variant="outline" size="sm">Button</tp-button>
        <tp-button variant="outline" size="sm">Group</tp-button>
        <tp-button variant="outline" size="icon-sm" .icon=${plusIcon} aria-label="Add"></tp-button>
      </tp-button-group>
    </p>
    <p>
      <tp-button-group label="Default actions">
        <tp-button variant="outline">Default</tp-button>
        <tp-button variant="outline">Button</tp-button>
        <tp-button variant="outline">Group</tp-button>
        <tp-button variant="outline" size="icon" .icon=${plusIcon} aria-label="Add"></tp-button>
      </tp-button-group>
    </p>
    <p>
      <tp-button-group label="Large actions">
        <tp-button variant="outline" size="lg">Large</tp-button>
        <tp-button variant="outline" size="lg">Button</tp-button>
        <tp-button variant="outline" size="lg">Group</tp-button>
        <tp-button variant="outline" size="icon-lg" .icon=${plusIcon} aria-label="Add"></tp-button>
      </tp-button-group>
    </p>
  `,
};

export const Vertical: Story = {
  render: () => html`
    <tp-button-group orientation="vertical" label="Value controls">
      <tp-button variant="outline" size="icon" .icon=${plusIcon} aria-label="Increase"></tp-button>
      <tp-button variant="outline" size="icon" .icon=${minusIcon} aria-label="Decrease"></tp-button>
    </tp-button-group>
  `,
};

export const MultipleGroups: Story = {
  render: () => html`
    <tp-button-group label="Back">
      <tp-button variant="outline" size="icon" .icon=${arrowLeftIcon} aria-label="Back"></tp-button>
    </tp-button-group>
    &nbsp;
    <tp-button-group label="Document actions">
      <tp-button variant="outline">Archive</tp-button>
      <tp-button variant="outline">Report</tp-button>
    </tp-button-group>
    &nbsp;
    <tp-button-group label="Reminder actions">
      <tp-button variant="outline">Snooze</tp-button>
      <tp-button variant="outline" size="icon" .icon=${moreIcon} aria-label="More actions">
      </tp-button>
    </tp-button-group>
  `,
};

export const Unjoined: Story = { args: { joined: false } };
