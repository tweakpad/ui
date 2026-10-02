import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import documentation from '../../docs/progress.md?raw';

interface Args {
  value: number | null;
  minimum: number;
  maximum: number;
  label: string;
  valueText: string;
  locale: string;
  motionPolicy: 'inherit' | 'normal' | 'reduce';
}
const meta: Meta<Args> = {
  title: 'Components/Progress',
  component: 'tp-progress',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      source: {
        code: `import { html, render } from 'lit';
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';

const example = document.createElement('div');
document.body.append(example);
render(html\`<tp-progress
  .value=\${56}
  label="Upload progress"
  .partContracts=\${{
    'progress-value-output': { content: (state) => state.formattedValue },
  }}
  ><span slot="label">Upload progress</span></tp-progress
>\`, example);`,
        language: 'ts',
      },
    },
  },
  args: {
    value: 56,
    minimum: 0,
    maximum: 100,
    label: 'Upload progress',
    valueText: '',
    locale: 'en-US',
    motionPolicy: 'inherit',
  },
  argTypes: {
    value: {
      control: 'number',
      description: 'External completion; null/nonfinite means indeterminate.',
    },
    minimum: { control: 'number' },
    maximum: { control: 'number' },
    label: { control: 'text' },
    valueText: { control: 'text' },
    locale: { control: 'text' },
    motionPolicy: { control: 'select', options: ['inherit', 'normal', 'reduce'] },
  },
  render: (args) =>
    html`<tp-progress
      .value=${args.value}
      .minimum=${args.minimum}
      .maximum=${args.maximum}
      .label=${args.label}
      .valueText=${args.valueText || undefined}
      .locale=${args.locale || undefined}
      .motionPolicy=${args.motionPolicy}
      .partContracts=${{ 'progress-value-output': { content: (state: Readonly<Record<string, unknown>>) => state.formattedValue } }}
      ><span slot="label">${args.label}</span></tp-progress
    >`,
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
