import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';

interface CopyButtonStoryArgs {
  value: string;
  label: string;
  copiedLabel: string;
  showLabel: boolean;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
  size: 'xs' | 'sm' | 'default' | 'lg';
  duration: number;
  disabled: boolean;
}

const meta: Meta<CopyButtonStoryArgs> = {
  title: 'Components/Copy button',
  component: 'tp-copy-button',
  parameters: { docs: libraryDocs('components/copy-button') },
  args: {
    value: 'npm install @tweakpad/ui',
    label: 'Copy install command',
    copiedLabel: 'Copied',
    showLabel: false,
    variant: 'ghost',
    size: 'sm',
    duration: 2000,
    disabled: false,
  },
  argTypes: {
    value: { control: 'text' },
    label: {
      control: 'text',
      table: { defaultValue: { summary: 'Copy' } },
    },
    copiedLabel: {
      control: 'text',
      table: { defaultValue: { summary: 'Copied' } },
    },
    showLabel: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
      table: { category: 'Appearance', defaultValue: { summary: 'ghost' } },
    },
    size: {
      control: 'radio',
      options: ['xs', 'sm', 'default', 'lg'],
      table: { category: 'Appearance', defaultValue: { summary: 'sm' } },
    },
    duration: {
      control: 'number',
      table: { defaultValue: { summary: '2000' } },
    },
    disabled: { control: 'boolean' },
  },
  render: (args) => html`
    <tp-copy-button
      value=${args.value}
      label=${args.label}
      copied-label=${args.copiedLabel}
      .showLabel=${args.showLabel}
      variant=${args.variant}
      size=${args.size}
      .duration=${args.duration}
      .disabled=${args.disabled}
    ></tp-copy-button>
  `,
};

export default meta;
type Story = StoryObj<CopyButtonStoryArgs>;

export const Default: Story = {};
