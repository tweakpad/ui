import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { formExamples } from './form-use-cases.examples.js';
import documentation from '../../docs/form.md?raw';
import { renderFormExample, formDefaults, type FormArgs } from './form.examples.js';
const meta = {
  title: 'Components/Form',
  component: 'tp-form',
  parameters: {
    docs: { description: { component: documentation }, examples: formExamples },
  },
  args: formDefaults,
  argTypes: {
    validationTiming: { control: 'select', options: ['on-submit', 'on-blur', 'on-change'] },
    nativeValidation: { control: 'select', options: ['enabled', 'suppressed'] },
    submissionPolicy: {
      control: 'select',
      options: ['always-enabled', 'disable-while-invalid', 'disable-while-pending'],
    },
  },
  render: renderFormExample,
} satisfies Meta<FormArgs>;
export default meta;
type Story = StoryObj<FormArgs>;
export const Default: Story = {};
