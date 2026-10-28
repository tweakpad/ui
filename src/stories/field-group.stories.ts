import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import fieldGroupDocumentation from '../../docs/field-group.md?raw';
import { fieldGroupExamples } from './field-group.examples.js';

interface FieldGroupStoryArgs {
  orientation: 'horizontal' | 'vertical';
  joined: boolean;
  label: string;
}

const meta: Meta<FieldGroupStoryArgs> = {
  title: 'Components/Field group',
  component: 'tp-field-group',
  parameters: {
    docs: {
      examples: fieldGroupExamples,
      description: { component: fieldGroupDocumentation.replace(/^# Field group\n/u, '') },
    },
  },
  args: {
    orientation: 'horizontal',
    joined: true,
    label: 'Size',
  },
  argTypes: {
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
      description: 'Layout and joined-seam axis; editor order and behavior stay unchanged.',
      table: { category: 'Layout', defaultValue: { summary: 'horizontal' } },
    },
    joined: {
      control: 'boolean',
      description: 'Merges adjacent editor boundaries without overlapping hit targets.',
      table: { category: 'Layout', defaultValue: { summary: 'true' } },
    },
    label: {
      control: 'text',
      description: 'Accessible name for the group of editors.',
      table: { category: 'Accessibility', defaultValue: { summary: 'Values' } },
    },
  },
  render: (args) => html`
    <tp-field-group
      orientation=${args.orientation}
      .joined=${args.joined}
      label=${args.label}
      style="max-inline-size: calc(var(--tp-spacing) * 80)"
    >
      <tp-input-group>
        <span slot="prefix">W</span>
        <tp-input label="Width" name="width" default-value="1280" inputmode="numeric"></tp-input>
        <span slot="suffix">px</span>
      </tp-input-group>
      <tp-input-group>
        <span slot="prefix">H</span>
        <tp-input label="Height" name="height" default-value="720" inputmode="numeric"></tp-input>
        <span slot="suffix">px</span>
      </tp-input-group>
    </tp-field-group>
  `,
};

export default meta;
type Story = StoryObj<FieldGroupStoryArgs>;

export const Default: Story = {};
