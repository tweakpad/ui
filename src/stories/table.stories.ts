import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import type { TpTable } from '../components/table/index.js';

interface Args {
  label: string;
  layout: TpTable['layout'];
  selectionPresentation: TpTable['selectionPresentation'];
  stickyHeader: boolean;
  stickyFooter: boolean;
  stickyStartColumns: number;
  stickyEndColumns: number;
}

const invoices = [
  ['INV-1042', 'Paid', 'Visa •••• 4242', '$250.00'],
  ['INV-1043', 'Pending', 'PayPal', '$150.00'],
  ['INV-1044', 'Unpaid', 'Bank transfer', '$350.00'],
] as const;

const meta = {
  title: 'Components/Table',
  component: 'tp-table',
  parameters: { docs: libraryDocs('components/table') },
  args: {
    label: 'Recent invoices',
    layout: 'automatic',
    selectionPresentation: 'none',
    stickyHeader: false,
    stickyFooter: false,
    stickyStartColumns: 0,
    stickyEndColumns: 0,
  },
  argTypes: {
    layout: { control: 'select', options: ['automatic', 'fixed'] },
    selectionPresentation: { control: 'select', options: ['none', 'row'] },
    stickyHeader: { control: 'boolean' },
    stickyFooter: { control: 'boolean' },
    stickyStartColumns: { control: { type: 'number', min: 0 } },
    stickyEndColumns: { control: { type: 'number', min: 0 } },
  },
  render: (args) =>
    html`<tp-table
      .label=${args.label}
      .layout=${args.layout}
      .selectionPresentation=${args.selectionPresentation}
      .stickyHeader=${args.stickyHeader}
      .stickyFooter=${args.stickyFooter}
      .stickyStartColumns=${args.stickyStartColumns}
      .stickyEndColumns=${args.stickyEndColumns}
    >
      <tp-table-caption>Invoices issued in October</tp-table-caption>
      <tp-table-header>
        <tp-table-row>
          <tp-table-head>Invoice</tp-table-head>
          <tp-table-head>Status</tp-table-head>
          <tp-table-head>Method</tp-table-head>
          <tp-table-head>Amount</tp-table-head>
        </tp-table-row>
      </tp-table-header>
      <tp-table-body>
        ${invoices.map(
          ([invoice, status, method, amount], index) =>
            html`<tp-table-row ?selected=${index === 0}>
              <tp-table-head scope="row">${invoice}</tp-table-head>
              <tp-table-cell>${status}</tp-table-cell>
              <tp-table-cell>${method}</tp-table-cell>
              <tp-table-cell>${amount}</tp-table-cell>
            </tp-table-row>`,
        )}
      </tp-table-body>
      <tp-table-footer>
        <tp-table-row>
          <tp-table-head scope="row" colspan="3">Total</tp-table-head>
          <tp-table-cell>$750.00</tp-table-cell>
        </tp-table-row>
      </tp-table-footer>
    </tp-table>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
