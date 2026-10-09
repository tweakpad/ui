import type { Meta, StoryObj } from '@storybook/web-components-vite';
import documentation from '../../docs/table.md?raw';
import { renderTable, tableDefaults, tableSource, type TableArgs } from './table.examples.js';
const tableExamples = (
  [
    ['footer', 'Totals footer'],
    ['simple', 'Without a caption'],
    ['badges', 'Status badges'],
    ['actions', 'Row actions'],
    ['select', 'Assigning records'],
    ['input', 'Editable quantities'],
    ['sticky', 'Sticky header, columns and totals'],
  ] as const
).map(([kind, title]) => ({
  title,
  code: tableSource(kind),
  render: () =>
    renderTable(
      kind === 'sticky'
        ? {
            ...tableDefaults,
            label: title,
            stickyHeader: true,
            stickyFooter: true,
            stickyStartColumns: 1,
            stickyEndColumns: 1,
          }
        : { ...tableDefaults, label: title },
      kind,
    ),
}));
const meta = {
  title: 'Components/Table',
  component: 'tp-table',
  parameters: {
    docs: {
      description: { component: documentation },
      source: { code: tableSource('basic'), language: 'html' },
      examples: tableExamples,
    },
  },
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
