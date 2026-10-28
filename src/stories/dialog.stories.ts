import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import { useArgs } from 'storybook/preview-api';
import type { TpDialog } from '../components/dialog/index.js';
import type { TpSurfaceOpenChangeEvent } from '../foundation/surface-state.js';

interface Args {
  open: boolean;
  label: string;
  description: string;
  modality: 'modal' | 'non-modal' | 'trap-focus-only';
  showCloseControl: boolean;
  showHeader: boolean;
  showFooter: boolean;
  portal: boolean;
  closeOnOutsideInteraction: boolean;
  closeOnEscape: boolean;
  keepMounted: boolean;
}
const meta: Meta<Args> = {
  title: 'Components/Dialog',
  component: 'tp-dialog',
  parameters: { docs: libraryDocs('components/dialog') },
  args: {
    open: false,
    label: 'Edit profile',
    description: 'Make changes to your profile. Close when you are done.',
    modality: 'modal',
    showCloseControl: true,
    showHeader: true,
    showFooter: true,
    portal: false,
    closeOnOutsideInteraction: true,
    closeOnEscape: true,
    keepMounted: false,
  },
  argTypes: {
    open: {
      control: 'boolean',
    },
    label: { control: 'text' },
    description: { control: 'text' },
    modality: { control: 'select', options: ['modal', 'non-modal', 'trap-focus-only'] },
    showCloseControl: {
      control: 'boolean',
    },
    closeOnOutsideInteraction: {
      control: 'boolean',
    },
    closeOnEscape: { control: 'boolean' },
    showHeader: { control: 'boolean' },
    showFooter: { control: 'boolean' },
    portal: { control: 'boolean' },
    keepMounted: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    return html`<tp-dialog
      .open=${args.open}
      .label=${args.label}
      .description=${args.description}
      .modality=${args.modality}
      .showCloseControl=${args.showCloseControl}
      .showHeader=${args.showHeader}
      .showFooter=${args.showFooter}
      .portal=${args.portal}
      .closeOnOutsideInteraction=${args.closeOnOutsideInteraction}
      .closeOnEscape=${args.closeOnEscape}
      .keepMounted=${args.keepMounted}
      @tp-open-change=${(event: TpSurfaceOpenChangeEvent) => {
        if (event.defaultPrevented || event.detail.cancelled) return;
        (event.currentTarget as TpDialog).open = event.detail.value;
        updateArgs({ open: event.detail.value });
      }}
    >
      <tp-button slot="trigger" variant="outline">Edit profile</tp-button>
      <tp-button slot="close" variant="outline">Close editor</tp-button>
    </tp-dialog>`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
