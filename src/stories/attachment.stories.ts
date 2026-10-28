import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import { navigationIcons } from '../icons/navigation.js';
import type { AttachmentStatus } from '../components/attachment/index.js';
interface Args {
  filename: string;
  description: string;
  status: AttachmentStatus;
  size: 'xs' | 'sm' | 'default';
  orientation: 'horizontal' | 'vertical';
  removable: boolean;
  disabled: boolean;
}
const meta = {
  title: 'Components/Attachment',
  component: 'tp-attachment',
  parameters: { docs: libraryDocs('components/attachment') },
  args: {
    filename: 'annual-report.pdf',
    description: 'PDF · 2.4 MB',
    status: 'complete',
    size: 'default',
    orientation: 'horizontal',
    removable: true,
    disabled: false,
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['idle', 'uploading', 'processing', 'error', 'complete'],
    },
    size: { control: 'select', options: ['xs', 'sm', 'default'] },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    removable: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  render: (args) =>
    html`<tp-attachment
      .filename=${args.filename}
      .description=${args.description}
      .status=${args.status}
      .size=${args.size}
      .orientation=${args.orientation}
      .removable=${args.removable}
      .disabled=${args.disabled}
      ><tp-icon slot="media" .icon=${navigationIcons.folder} aria-hidden="true"></tp-icon
    ></tp-attachment>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
