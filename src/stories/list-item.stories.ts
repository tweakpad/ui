import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import documentation from '../../docs/list-item.md?raw';
import { listItemExamples } from './list-item.examples.js';
const meta = {
  title: 'Components/List item',
  component: 'tp-list-item',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: { description: { component: documentation }, examples: listItemExamples },
  },
  args: {
    variant: 'ghost',
    size: 'default',
    mediaTreatment: 'plain',
    description: 'Secondary text',
    selected: false,
    value: '',
  },
  argTypes: {
    variant: { control: 'select', options: ['ghost', 'outline', 'subdued'] },
    size: { control: 'select', options: ['xs', 'sm', 'default'] },
    mediaTreatment: { control: 'select', options: ['plain', 'icon', 'image'] },
    description: { control: 'text' },
    selected: { control: 'boolean' },
    value: { control: 'text' },
  },
  render: (args) =>
    html`<tp-list-item
      .variant=${args.variant}
      .size=${args.size}
      .mediaTreatment=${args.mediaTreatment}
      .description=${args.description}
      .selected=${args.selected}
      .value=${args.value}
      >Primary text</tp-list-item
    >`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
