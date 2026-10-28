import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import type { TpToast, ToastPosition, ToastSwipeDirection } from '../components/toast/index.js';
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
    docs: libraryDocs('components/toast'),
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
    },
    limit: {
      control: { type: 'number', min: 0, step: 1 },
    },
    priority: {
      control: 'select',
      options: ['polite', 'assertive'],
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
    },
    dismissible: { control: 'boolean' },
    showIcon: {
      control: 'boolean',
    },
    label: { control: 'text' },
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
