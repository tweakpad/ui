import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import documentation from '../../docs/field.md?raw';
interface Args {
  label: string;
  description: string;
  error: string;
  orientation: 'vertical' | 'horizontal' | 'responsive';
  disabled: boolean;
  nativeLabel: boolean;
  validationMode: 'on-submit' | 'on-blur' | 'on-change';
  validationDebounce: number;
}
const meta: Meta<Args> = {
  title: 'Components/Field',
  component: 'tp-field',
  parameters: { docs: { description: { component: documentation } } },
  args: {
    label: 'Email',
    description: 'Used for receipts and project updates.',
    error: '',
    orientation: 'vertical',
    disabled: false,
    nativeLabel: true,
    validationMode: 'on-submit',
    validationDebounce: 0,
  },
  argTypes: {
    label: { control: 'text' },
    description: { control: 'text' },
    error: { control: 'text' },
    orientation: { control: 'select', options: ['vertical', 'horizontal', 'responsive'] },
    disabled: { control: 'boolean' },
    nativeLabel: { control: 'boolean' },
    validationMode: { control: 'select', options: ['on-submit', 'on-blur', 'on-change'] },
    validationDebounce: { control: { type: 'number', min: 0 } },
  },
  render: (args) =>
    html`<tp-field
      .label=${args.label}
      .description=${args.description}
      .error=${args.error}
      .orientation=${args.orientation}
      .disabled=${args.disabled}
      .nativeLabel=${args.nativeLabel}
      .validationMode=${args.validationMode}
      .validationDebounce=${args.validationDebounce}
      ><tp-input name="email" type="email" placeholder="you@example.com" required></tp-input
    ></tp-field>`,
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
