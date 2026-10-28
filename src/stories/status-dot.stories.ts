import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import type { StatusDotMotion, StatusDotVariant } from '../index.js';

interface Args {
  variant: StatusDotVariant;
  label: string;
  showLabel: boolean;
  tooltip: boolean;
  motion: StatusDotMotion;
}

const meta = {
  title: 'Components/Status dot',
  component: 'tp-status-dot',
  parameters: { docs: libraryDocs('components/status-dot') },
  args: {
    variant: 'success',
    label: 'Running',
    showLabel: true,
    tooltip: true,
    motion: 'none',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'success', 'warning', 'destructive'],
      table: { defaultValue: { summary: 'default' } },
    },
    label: {
      control: 'text',
      table: { defaultValue: { summary: "''" } },
    },
    showLabel: {
      name: 'show-label',
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    tooltip: {
      control: 'boolean',
      table: { defaultValue: { summary: 'true' } },
    },
    motion: {
      control: 'inline-radio',
      options: ['none', 'pulse', 'ping'],
      table: { defaultValue: { summary: 'none' } },
    },
  },
  render: ({ variant, label, showLabel, tooltip, motion }) =>
    html`<tp-status-dot
      .variant=${variant}
      .label=${label}
      .showLabel=${showLabel}
      .tooltip=${tooltip}
      .motion=${motion}
    ></tp-status-dot>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
