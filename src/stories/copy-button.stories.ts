import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import copyButtonDocumentation from '../../docs/copy-button.md?raw';
import { copyButtonExamples } from './copy-button.examples.js';

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
  parameters: {
    docs: {
      examples: copyButtonExamples,
      description: { component: copyButtonDocumentation.replace(/^# Copy button\n/u, '') },
    },
  },
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
    value: { control: 'text', description: 'Text written to the clipboard.' },
    label: {
      control: 'text',
      description: 'Accessible name at rest; visible with show-label.',
      table: { defaultValue: { summary: 'Copy' } },
    },
    copiedLabel: {
      control: 'text',
      description: 'Name, text and announcement after a successful copy.',
      table: { defaultValue: { summary: 'Copied' } },
    },
    showLabel: {
      control: 'boolean',
      description: 'Renders the label beside the icon.',
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
      description: 'Milliseconds the copied state lasts.',
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
