import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { fileTextIcon } from '../icons/file-text.js';
import { libraryDocs } from './library-docs.js';

const files = [
  ['Project notes', 'Updated today'],
  ['Launch checklist', 'Updated yesterday'],
  ['Budget review', 'Updated last week'],
];

const meta = {
  title: 'Components/List',
  component: 'tp-list',
  parameters: { docs: libraryDocs('components/list') },
  args: {
    label: 'Documents',
    variant: 'ghost',
    size: 'default',
    mediaTreatment: 'icon',
    selected: false,
  },
  argTypes: {
    label: { control: 'text' },
    variant: {
      control: 'select',
      options: ['ghost', 'outline', 'subdued'],
      description: 'List item treatment, set on every row.',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'default'],
      description: 'List item density, set on every row.',
    },
    mediaTreatment: {
      control: 'select',
      options: ['plain', 'icon', 'image'],
      description: 'List item media geometry, set on every row.',
    },
    selected: { control: 'boolean', description: 'Marks the first row as the current item.' },
  },
  render: (args) =>
    html`<tp-list aria-label=${args.label}>
      ${files.map(
        ([title, description], index) =>
          html`<tp-list-item
            .variant=${args.variant}
            .size=${args.size}
            .mediaTreatment=${args.mediaTreatment}
            .description=${description}
            .selected=${args.selected && index === 0}
            ><tp-icon slot="media" .icon=${fileTextIcon}></tp-icon>${title}</tp-list-item
          >`,
      )}
    </tp-list>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
