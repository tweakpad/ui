import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { attachmentExamples } from './attachment.examples.js';
import { html } from 'lit';
import documentation from '../../docs/attachment.md?raw';
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
const source = `import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
import { navigationIcons } from '@tweakpad/ui/icons/navigation';
const attachment = document.createElement('tp-attachment');
attachment.filename = 'annual-report.pdf';
attachment.description = 'PDF · 2.4 MB';
attachment.status = 'complete';
attachment.removable = true;
const icon = document.createElement('tp-icon');
icon.slot = 'media';
icon.icon = navigationIcons.folder;
icon.setAttribute('aria-hidden', 'true');
attachment.append(icon);
document.body.append(attachment);`;
const meta = {
  title: 'Components/Attachment',
  component: 'tp-attachment',
  parameters: {
    docs: {
      description: { component: documentation },
      source: { code: source, language: 'javascript' },
      examples: attachmentExamples,
    },
  },
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
