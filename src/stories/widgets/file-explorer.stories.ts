import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createMemorySource } from '../../foundation/file-explorer/memory-source.js';
import type { FileExplorerView } from '../../widgets/file-explorer/types.js';
import { libraryDocs } from '../library-docs.js';
import { observatoryArchive } from './file-explorer.examples.js';

interface Args {
  view: FileExplorerView;
  sidebar: boolean;
  search: boolean;
  details: boolean;
  statusBar: boolean;
  readonly: boolean;
  showHidden: boolean;
  selectionMode: 'none' | 'single' | 'multiple';
}

const meta: Meta<Args> = {
  title: 'Widgets/File explorer',
  component: 'tp-file-explorer',
  parameters: { docs: libraryDocs('widgets/file-explorer') },
  args: {
    view: 'details',
    sidebar: true,
    search: true,
    details: false,
    statusBar: true,
    readonly: false,
    showHidden: false,
    selectionMode: 'multiple',
  },
  argTypes: {
    view: {
      control: 'inline-radio',
      options: ['details', 'compact', 'icons', 'gallery', 'columns'],
    },
    selectionMode: { control: 'inline-radio', options: ['none', 'single', 'multiple'] },
  },
  render: (args) =>
    html`<tp-file-explorer
      label="Ridgeline archive"
      default-folder="plates"
      .defaultView=${args.view}
      .sidebar=${args.sidebar}
      .search=${args.search}
      .statusBar=${args.statusBar}
      ?details=${args.details}
      ?readonly=${args.readonly}
      ?show-hidden=${args.showHidden}
      selection-mode=${args.selectionMode}
      .source=${createMemorySource(observatoryArchive())}
    ></tp-file-explorer>`,
};

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

/** A single folder, read only, as a compact list: a picker. */
export const Picker: Story = {
  tags: ['!autodocs'],
  render: () =>
    html`<tp-file-explorer
      label="Pick a spectrum"
      root="spectra"
      views="compact"
      selection-mode="single"
      readonly
      .sidebar=${false}
      .search=${false}
      .source=${createMemorySource(observatoryArchive())}
    ></tp-file-explorer>`,
};

/** About two thousand plate scans in the gallery, with the details pane. */
export const Gallery: Story = {
  tags: ['!autodocs'],
  render: () =>
    html`<tp-file-explorer
      label="Plate scans"
      default-folder="plates"
      default-view="gallery"
      details
      .source=${createMemorySource(observatoryArchive({ extraPlates: 2000 }))}
    ></tp-file-explorer>`,
};
