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
    striped: { control: 'boolean' },
    borders: { control: 'inline-radio', options: ['rows', 'grid', 'none'] },
    variant: { control: 'inline-radio', options: ['default', 'outline'] },
  },
  render: (args) => renderTable(args),
} satisfies Meta<TableArgs>;
export default meta;
type Story = StoryObj<TableArgs>;
export const Default: Story = {};
