import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import type { TimeMode, TimePreset, TimeStyle } from '../components/time/index.js';

interface Args {
  secondsAgo: number;
  mode: TimeMode;
  preset: TimePreset;
  relativeStyle: TimeStyle;
  tooltip: boolean;
}
const meta = {
  title: 'Components/Time',
  component: 'tp-time',
  parameters: { docs: libraryDocs('components/time') },
  args: { secondsAgo: 300, mode: 'auto', preset: 'datetime', relativeStyle: 'long', tooltip: true },
  argTypes: {
    secondsAgo: {
      description: 'Fixture: datetime is set this many seconds before the story renders.',
      control: 'number',
    },
    mode: {
      control: 'select',
      options: ['auto', 'relative', 'calendar', 'absolute', 'duration'],
      table: { defaultValue: { summary: 'auto' } },
    },
    preset: {
      control: 'select',
      options: [
        'time',
        'time-seconds',
        'date',
        'date-medium',
        'date-long',
        'datetime',
        'datetime-long',
        'full',
        'iso',
      ],
      table: { defaultValue: { summary: 'datetime' } },
    },
    relativeStyle: {
      control: 'select',
      options: ['long', 'short', 'narrow'],
      table: { defaultValue: { summary: 'long' } },
    },
    tooltip: { control: 'boolean', table: { defaultValue: { summary: 'true' } } },
  },
  render: ({ secondsAgo, mode, preset, relativeStyle, tooltip }) =>
    html`<tp-time
      .datetime=${new Date(Date.now() - secondsAgo * 1000)}
      .mode=${mode}
      .preset=${preset}
      .relativeStyle=${relativeStyle}
      .tooltip=${tooltip}
    ></tp-time>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
