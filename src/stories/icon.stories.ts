import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
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
  parameters: { docs: libraryDocs('components/icon') },
  args: { icon: plusIcon, label: 'Add', size: '' },
  argTypes: {
    icon: {
      control: 'object',
      table: { type: { summary: 'IconDefinition' }, defaultValue: { summary: 'undefined' } },
    },
    label: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    size: {
      control: 'text',
      table: { type: { summary: 'CSS length' }, defaultValue: { summary: "''" } },
    },
  },
  render: (args) =>
    html`<tp-icon .icon=${args.icon} label=${args.label} size=${args.size}></tp-icon>`,
};

export default meta;
type Story = StoryObj<IconStoryArgs>;

export const Default: Story = {};
