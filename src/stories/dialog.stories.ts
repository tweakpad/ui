import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { useArgs } from 'storybook/preview-api';
import documentation from '../../docs/dialog.md?raw';
import type { TpSurfaceOpenChangeEvent } from '../foundation/surface-state.js';

interface Args {
  open: boolean;
  label: string;
  description: string;
  modality: 'modal' | 'non-modal' | 'trap-focus-only';
  showCloseControl: boolean;
  closeOnOutsideInteraction: boolean;
  closeOnEscape: boolean;
  keepMounted: boolean;
}
const meta: Meta<Args> = {
  title: 'Components/Dialog',
  component: 'tp-dialog',
  tags: ['autodocs'],
  parameters: { layout: 'padded', docs: { description: { component: documentation } } },
  args: {
    open: false,
    label: 'Edit profile',
    description: 'Make changes to your profile. Close when you are done.',
    modality: 'modal',
    showCloseControl: true,
    closeOnOutsideInteraction: true,
    closeOnEscape: true,
    keepMounted: false,
  },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Controlled state; this story accepts change proposals.',
    },
    label: { control: 'text', description: 'Visible title fallback.' },
    description: { control: 'text', description: 'Description fallback.' },
    modality: { control: 'select', options: ['modal', 'non-modal', 'trap-focus-only'] },
    showCloseControl: {
      control: 'boolean',
      description: 'Corner Close; hiding requires another reachable named close action.',
    },
    closeOnOutsideInteraction: {
      control: 'boolean',
      description: 'Outside pointer dismissal; also focus outside in non-modal mode.',
    },
    closeOnEscape: { control: 'boolean' },
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
      .closeOnOutsideInteraction=${args.closeOnOutsideInteraction}
      .closeOnEscape=${args.closeOnEscape}
      .keepMounted=${args.keepMounted}
      @tp-open-change=${(event: TpSurfaceOpenChangeEvent) => updateArgs({ open: event.detail.value })}
    >
      <tp-button slot="trigger" variant="outline">Edit profile</tp-button>
      <tp-button slot="close" variant="outline">Close editor</tp-button>
    </tp-dialog>`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
