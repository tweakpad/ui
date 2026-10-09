import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import type { TpToast, ToastPosition, ToastSwipeDirection } from '../components/toast/index.js';
import documentation from '../../docs/toast.md?raw';
import { formatTime, resolveTime } from '../foundation/time/index.js';

interface Args {
  timeout: number;
  limit: number;
  priority: 'polite' | 'assertive';
  position: ToastPosition;
  swipeDirections: ToastSwipeDirection[];
  dismissible: boolean;
  showIcon: boolean;
  label: string;
}
const meta: Meta<Args> = {
  title: 'Components/Toast',
  component: 'tp-toast',
  parameters: {
    docs: {
      description: { component: documentation },
      source: {
        language: 'html',
        code: `<tp-button id="show-notification" variant="outline">Show notification</tp-button>
<tp-toast id="notifications" timeout="5000" limit="3"></tp-toast>

<script type="module">
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
import { formatTime, resolveTime } from '@tweakpad/ui';

const notifications = document.querySelector('tp-toast#notifications');
document.querySelector('tp-button#show-notification').addEventListener('click', () => {
  notifications.add({
    title: 'Event created',
    description: formatTime(resolveTime('2023-12-03T09:00'), Date.now(), {
      mode: 'absolute',
      preset: 'full',
    }).text,
    type: 'success',
  });
});
</script>`,
      },
    },
  },
  args: {
    timeout: 5000,
    limit: 3,
    priority: 'polite',
    position: 'block-end inline-end',
    swipeDirections: ['down', 'right'],
    dismissible: true,
    showIcon: true,
    label: 'Notifications',
  },
  argTypes: {
    timeout: {
      control: { type: 'number', min: 0 },
      description: 'Provider lifetime in milliseconds; zero is persistent.',
    },
    limit: {
      control: { type: 'number', min: 0, step: 1 },
      description:
        'Maximum visible active notifications; oldest excess items remain limited/inert.',
    },
    priority: {
      control: 'select',
      options: ['polite', 'assertive'],
      description: 'Library alias; the example maps it to the new ToastObject low/high priority.',
    },
    position: {
      control: 'select',
      options: [
        'block-start inline-start',
        'block-start center',
        'block-start inline-end',
        'block-end inline-start',
        'block-end center',
        'block-end inline-end',
      ],
    },
    swipeDirections: {
      control: 'object',
      description:
        'Physical directions permitted for gesture dismissal; empty array disables swiping.',
    },
    dismissible: { control: 'boolean', description: 'Independently shows the Close control.' },
    showIcon: {
      control: 'boolean',
      description: 'Independently shows status icon/loading decoration.',
    },
    label: { control: 'text', description: 'Notification landmark accessible name.' },
  },
  render: (args) =>
    html`<div>
      <tp-button
        variant="outline"
        @click=${(event: Event) => {
          const host = (event.currentTarget as HTMLElement).parentElement!.querySelector<TpToast>(
            'tp-toast',
          )!;
          host.add({
            title: 'Event created',
            description: formatTime(resolveTime('2023-12-03T09:00')!, Date.now(), {
              mode: 'absolute',
              preset: 'full',
            }).text,
            type: 'success',
            priority: args.priority === 'assertive' ? 'high' : 'low',
          });
        }}
        >Show notification</tp-button
      >
      <tp-toast
        .timeout=${args.timeout}
        .limit=${args.limit}
        .priority=${args.priority}
        .position=${args.position}
        .swipeDirections=${args.swipeDirections}
        .dismissible=${args.dismissible}
        .showIcon=${args.showIcon}
        .label=${args.label}
      ></tp-toast>
    </div>`,
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
