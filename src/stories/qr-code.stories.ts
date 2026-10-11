import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import qrCodeDocumentation from '../../docs/qr-code.md?raw';
import { qrCodeExamples } from './qr-code.examples.js';

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
  parameters: {
    docs: {
      examples: qrCodeExamples,
      description: { component: qrCodeDocumentation.replace(/^# QR code\n/u, '') },
    },
  },
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
    value: { control: 'text', description: 'Text to encode.' },
    label: {
      control: 'text',
      description: 'Accessible name and export title; the QR code message when empty.',
    },
    errorCorrection: {
      control: 'radio',
      options: ['L', 'M', 'Q', 'H'],
      description: 'Error correction level.',
      table: { defaultValue: { summary: 'M' } },
    },
    quietZone: {
      control: { type: 'number', min: 0, step: 1 },
      description: 'Light border around the modules, in modules.',
      table: { defaultValue: { summary: '4' } },
    },
    size: {
      control: 'radio',
      options: ['sm', 'default', 'lg'],
      table: { category: 'Appearance', defaultValue: { summary: 'default' } },
    },
    copyable: {
      control: 'boolean',
      description: 'Shows the Copy button.',
      table: { defaultValue: { summary: 'false' } },
    },
    downloadable: {
      control: 'boolean',
      description: 'Shows the Download menu.',
      table: { defaultValue: { summary: 'false' } },
    },
    exportSize: {
      control: { type: 'number', min: 21, max: 4096, step: 1 },
      description: 'Side of exports and of the copied image, in pixels.',
      table: { defaultValue: { summary: '1024' } },
    },
    filename: {
      control: 'text',
      description: 'Download file name without its extension.',
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
