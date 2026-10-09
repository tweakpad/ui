import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import documentation from '../../docs/spinner.md?raw';
import { spinnerExamples } from './spinner.examples.js';
interface Args {
  size: 'sm' | 'default' | 'lg';
  label: string;
  motionPolicy: 'inherit' | 'normal' | 'reduce';
}
const meta = {
  title: 'Components/Spinner',
  component: 'tp-spinner',
  parameters: {
    docs: {
      description: { component: documentation },
      examples: spinnerExamples,
      source: { code: '<tp-spinner label="Loading projects"></tp-spinner>' },
    },
  },
  args: { size: 'default', label: 'Loading projects', motionPolicy: 'inherit' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'default', 'lg'] },
    label: { control: 'text' },
    motionPolicy: { control: 'select', options: ['inherit', 'normal', 'reduce'] },
  },
  render: (args) =>
    html`<tp-spinner
      .size=${args.size}
      .label=${args.label}
      .motionPolicy=${args.motionPolicy}
    ></tp-spinner>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
