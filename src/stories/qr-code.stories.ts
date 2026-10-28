import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';

interface QrCodeStoryArgs {
  value: string;
  label: string;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  quietZone: number;
  size: 'sm' | 'default' | 'lg';
  copyable: boolean;
  downloadable: boolean;
  exportSize: number;
  filename: string;
}

const meta: Meta<QrCodeStoryArgs> = {
  title: 'Components/QR code',
  component: 'tp-qr-code',
  parameters: { docs: libraryDocs('components/qr-code') },
  args: {
    value: 'https://ledger.app/connect/jd-4829',
    label: 'Scan to connect your mobile device',
    errorCorrection: 'M',
    quietZone: 4,
    size: 'default',
    copyable: true,
    downloadable: true,
    exportSize: 1024,
    filename: 'qr-code',
  },
  argTypes: {
    value: { control: 'text' },
    label: {
      control: 'text',
    },
    errorCorrection: {
      control: 'radio',
      options: ['L', 'M', 'Q', 'H'],
      table: { defaultValue: { summary: 'M' } },
    },
    quietZone: {
      control: { type: 'number', min: 0, step: 1 },
      table: { defaultValue: { summary: '4' } },
    },
    size: {
      control: 'radio',
      options: ['sm', 'default', 'lg'],
      table: { category: 'Appearance', defaultValue: { summary: 'default' } },
    },
    copyable: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    downloadable: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    exportSize: {
      control: { type: 'number', min: 21, max: 4096, step: 1 },
      table: { defaultValue: { summary: '1024' } },
    },
    filename: {
      control: 'text',
      table: { defaultValue: { summary: 'qr-code' } },
    },
  },
  render: (args) => html`
    <tp-qr-code
      value=${args.value}
      label=${args.label}
      error-correction=${args.errorCorrection}
      .quietZone=${args.quietZone}
      size=${args.size}
      .copyable=${args.copyable}
      .downloadable=${args.downloadable}
      .exportSize=${args.exportSize}
      filename=${args.filename}
    ></tp-qr-code>
  `,
};

export default meta;
type Story = StoryObj<QrCodeStoryArgs>;

export const Default: Story = {};
