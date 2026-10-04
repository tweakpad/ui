import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { attachmentExamples } from './attachment.examples.js';
import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import documentation from '../../docs/attachment.md?raw';
import { navigationIcons } from '../icons/navigation.js';
import type { AttachmentStatus } from '../components/attachment/index.js';
import type { TpDialog } from '../components/dialog/index.js';
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
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      source: { code: source, language: 'javascript' },
      examples: [
        ...attachmentExamples,
        {
          title: 'Preview trigger',
          render: () => Preview.render(),
          get code() {
            return Preview.parameters.docs.source.code;
          },
          language: 'javascript',
        },
      ],
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
      ><tp-icon
        slot="media"
        .icon=${navigationIcons.folder}
        size="var(--tp-icon-size-sm)"
        aria-hidden="true"
      ></tp-icon
    ></tp-attachment>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
const Preview = {
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `const attachment = document.createElement('tp-attachment');
attachment.filename = 'research-summary.pdf';
attachment.description = 'Open preview';
attachment.status = 'complete';
const trigger = document.createElement('tp-button');
trigger.slot = 'trigger';
trigger.ariaLabel = 'Preview research summary';
attachment.append(trigger);
const dialog = document.createElement('tp-dialog');
dialog.label = 'Research summary';
dialog.description = 'Attachment preview';
dialog.textContent = 'The document is ready for review.';
document.body.append(attachment, dialog);
const release = dialog.registerTrigger(trigger);
// Call release() when removing this composition.`,
      },
    },
  },
  render: () => {
    let trigger: HTMLElement | undefined,
      dialog: TpDialog | undefined,
      release: (() => void) | undefined;
    const bind = () => {
      release?.();
      release = trigger && dialog ? dialog.registerTrigger(trigger) : undefined;
    };
    return html`<tp-attachment
        filename="research-summary.pdf"
        description="Open preview"
        status="complete"
        removable
        ><tp-icon slot="media" .icon=${navigationIcons.folder} aria-hidden="true"></tp-icon
        ><tp-button
          slot="trigger"
          aria-label="Preview research summary"
          ${ref((element) => {
            trigger = element as HTMLElement | undefined;
            bind();
          })}
        ></tp-button></tp-attachment
      ><tp-dialog
        label="Research summary"
        description="Attachment preview"
        ${ref((element) => {
          dialog = element as TpDialog | undefined;
          bind();
        })}
        >The document is ready for review.</tp-dialog
      >`;
  },
};
