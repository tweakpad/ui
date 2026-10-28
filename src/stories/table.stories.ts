import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { libraryDocs } from './library-docs.js';
import { renderTable, tableDefaults, type TableArgs } from './table.examples.js';
const meta = {
  title: 'Components/Table',
  component: 'tp-table',
  parameters: { docs: libraryDocs('components/table') },
  args: tableDefaults,
  argTypes: {
    layout: { control: 'select', options: ['automatic', 'fixed'] },
    selectionPresentation: { control: 'select', options: ['none', 'row'] },
    stickyHeader: { control: 'boolean' },
    stickyFooter: { control: 'boolean' },
    stickyStartColumns: { control: { type: 'number', min: 0 } },
    stickyEndColumns: { control: { type: 'number', min: 0 } },
  },
  render: (args) => renderTable(args),
} satisfies Meta<TableArgs>;
export default meta;
type Story = StoryObj<TableArgs>;
export const Default: Story = {};
