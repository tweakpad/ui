import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import type { AlertAnnouncement, AlertSeverity } from '../components/alert/index.js';
import { plusIcon } from '../icons/plus.js';
import documentation from '../../docs/alert.md?raw';

interface Args {
  severity: AlertSeverity;
  announcement: AlertAnnouncement;
  title: string;
}

const meta: Meta<Args> = {
  title: 'Components/Alert',
  component: 'tp-alert',
  tags: ['autodocs'],
  parameters: { layout: 'padded', docs: { description: { component: documentation } } },
  args: { severity: 'informational', announcement: 'off', title: 'Update available' },
  argTypes: {
    severity: {
      control: 'select',
      options: ['informational', 'success', 'warning', 'danger'],
      description: 'Visual emphasis. The message text must also communicate the condition.',
    },
    announcement: {
      control: 'select',
      options: ['off', 'polite', 'assertive'],
      description: 'Live announcement policy. Reserve assertive for urgent conditions.',
    },
    title: {
      control: 'text',
      description: 'Optional text fallback; the title slot takes precedence.',
    },
  },
  render: (args) =>
    html`<tp-alert
      .severity=${args.severity}
      .announcement=${args.announcement}
      .title=${args.title}
    >
      <tp-icon slot="icon" .icon=${plusIcon} size="1rem"></tp-icon>
      A new version is ready. Review the changes before updating.
      <tp-button slot="actions" variant="outline" size="sm" href="#release-notes"
        >Release notes</tp-button
      >
    </tp-alert>`,
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
