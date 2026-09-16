import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import iconDocumentation from '../../docs/icon.md?raw';
import { chevronRightIcon } from '../icons/chevron-right.js';
import { plusIcon } from '../icons/plus.js';
import type { IconDefinition } from '../icons/types.js';

interface IconStoryArgs {
  icon: IconDefinition;
  label: string;
  size: string;
}

const meta: Meta<IconStoryArgs> = {
  title: 'Components/Icon',
  component: 'tp-icon',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: iconDocumentation.replace(/^# Icon\n/u, '') } },
  },
  args: { icon: plusIcon, label: 'Add', size: '2rem' },
  argTypes: {
    icon: {
      control: 'object',
      description:
        'Property-only artwork definition. Import one definition module or supply your own.',
      table: { type: { summary: 'IconDefinition' }, defaultValue: { summary: 'undefined' } },
    },
    label: {
      control: 'text',
      description: 'Accessible name; leave empty for a decorative icon.',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    size: {
      control: 'text',
      description: 'Preferred square CSS extent. Explicit host width and height can override it.',
      table: { type: { summary: 'CSS length' }, defaultValue: { summary: '1em' } },
    },
  },
  render: (args) => html`
    <main class="story">
      <h1>Icon</h1>
      <tp-icon .icon=${args.icon} label=${args.label} size=${args.size}></tp-icon>
    </main>
  `,
};

export default meta;
type Story = StoryObj<IconStoryArgs>;

export const Default: Story = {};
export const Decorative: Story = { args: { label: '', icon: chevronRightIcon } };
