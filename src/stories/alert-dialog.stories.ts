import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import { useArgs } from 'storybook/preview-api';
import type { TpAlertDialog, TpSurfaceOpenChangeEvent } from '../components/alert-dialog/index.js';

interface Args {
  open: boolean;
  label: string;
  description: string;
  initialFocus: string;
  closeOnEscape: boolean;
  keepMounted: boolean;
  motionPolicy: 'inherit' | 'normal' | 'reduce';
}
const meta: Meta<Args> = {
  title: 'Components/Alert dialog',
  component: 'tp-alert-dialog',
  parameters: { docs: libraryDocs('components/alert-dialog') },
  args: {
    open: false,
    label: 'Delete project?',
    description:
      'This permanently deletes the project and its files. This action cannot be undone.',
    initialFocus: 'cancel',
    closeOnEscape: true,
    keepMounted: false,
    motionPolicy: 'inherit',
  },
  argTypes: {
    open: {
      control: 'boolean',
    },
    label: { control: 'text' },
    description: {
      control: 'text',
    },
    initialFocus: {
      control: 'select',
      options: ['cancel', 'confirm', 'popup'],
    },
    closeOnEscape: {
      control: 'boolean',
    },
    keepMounted: {
      control: 'boolean',
    },
    motionPolicy: {
      control: 'radio',
      options: ['inherit', 'normal', 'reduce'],
    },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    return html` <tp-alert-dialog
      .open=${args.open}
      .label=${args.label}
      .description=${args.description}
      .initialFocus=${args.initialFocus}
      .closeOnEscape=${args.closeOnEscape}
      .keepMounted=${args.keepMounted}
      .motionPolicy=${args.motionPolicy}
      @tp-open-change=${(event: TpSurfaceOpenChangeEvent) => updateArgs({ open: event.detail.value })}
    >
      <tp-button slot="trigger" variant="outline">Delete project</tp-button>
      <tp-button slot="cancel" variant="outline">Cancel</tp-button>
      <tp-button
        slot="confirm"
        variant="destructive"
        @click=${(event: Event) => {
          const dialog = (event.currentTarget as HTMLElement).closest(
            'tp-alert-dialog',
          ) as TpAlertDialog;
          dialog.setOpen(false, 'close-action', event);
        }}
        >Delete project</tp-button
      >
    </tp-alert-dialog>`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
