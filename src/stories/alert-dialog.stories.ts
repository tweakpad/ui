import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { useArgs } from 'storybook/preview-api';
import documentation from '../../docs/alert-dialog.md?raw';
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
  parameters: { docs: { description: { component: documentation } } },
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
      description:
        'Controlled open state. This example accepts change proposals through Storybook args.',
    },
    label: { control: 'text', description: 'Visible title fallback when the title slot is empty.' },
    description: {
      control: 'text',
      description: 'Consequence text fallback when the description slot is empty.',
    },
    initialFocus: {
      control: 'select',
      options: ['cancel', 'confirm', 'popup'],
      description: 'Default: cancel, falling back to the first available decision control.',
    },
    closeOnEscape: {
      control: 'boolean',
      description: 'Allows the topmost surface to propose an Escape close. Default: true.',
    },
    keepMounted: {
      control: 'boolean',
      description: 'Retains semantically hidden content after exit. Default: false.',
    },
    motionPolicy: {
      control: 'radio',
      options: ['inherit', 'normal', 'reduce'],
      description: 'Inherited Foundation motion policy. Default: inherit.',
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
