import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import type {
  DataViewNavigation,
  DataViewSelectionMode,
  DataViewSize,
  DataViewSorting,
} from '../components/data-view/index.js';
import { fieldStations, stationColumns, statusColumn } from './data-view.examples.js';
import { libraryDocs } from './library-docs.js';

interface Args {
  label: string;
  size: DataViewSize;
  navigation: DataViewNavigation;
  selectionMode: DataViewSelectionMode;
  sorting: DataViewSorting;
  loading: boolean;
  rows: number;
}

const meta: Meta<Args> = {
  title: 'Components/Data view',
  component: 'tp-data-view',
  parameters: { docs: libraryDocs('components/data-view') },
  args: {
    label: 'Field stations',
    size: 'default',
    navigation: 'cell',
    selectionMode: 'single',
    sorting: 'local',
    loading: false,
    rows: 200,
  },
  argTypes: {
    label: { control: 'text' },
    size: { control: 'inline-radio', options: ['sm', 'default', 'lg'] },
    navigation: { control: 'inline-radio', options: ['cell', 'row'] },
    selectionMode: { control: 'inline-radio', options: ['none', 'single'] },
    sorting: { control: 'inline-radio', options: ['local', 'manual'] },
    loading: { control: 'boolean' },
    rows: { control: { type: 'number', min: 0, max: 20000, step: 100 } },
  },
  render: (args) =>
    html`<tp-data-view
      label=${args.label}
      size=${args.size}
      navigation=${args.navigation}
      selection-mode=${args.selectionMode}
      sorting=${args.sorting}
      ?loading=${args.loading}
      default-sort="name"
      style="block-size: calc(var(--tp-spacing) * 90)"
      .columns=${[...stationColumns, statusColumn]}
      .rows=${fieldStations(args.rows)}
    ></tp-data-view>`,
};

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const RowNavigation: Story = {
  tags: ['!autodocs'],
  args: { navigation: 'row', size: 'sm', rows: 10000 },
};

export const States: Story = {
  tags: ['!autodocs'],
  render: () =>
    html`<div style="display: grid; gap: var(--tp-space-4)">
      <tp-data-view
        label="Loading"
        loading
        style="block-size: calc(var(--tp-spacing) * 44)"
        .columns=${stationColumns}
      ></tp-data-view>
      <tp-data-view
        label="Empty"
        style="block-size: calc(var(--tp-spacing) * 52)"
        .columns=${stationColumns}
      ></tp-data-view>
      <tp-data-view
        label="Error"
        error="The station service did not answer."
        style="block-size: calc(var(--tp-spacing) * 52)"
        .columns=${stationColumns}
      ></tp-data-view>
    </div>`,
};
