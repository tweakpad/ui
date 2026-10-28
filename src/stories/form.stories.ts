import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { libraryDocs } from './library-docs.js';
import { renderFormExample, formDefaults, type FormArgs } from './form.examples.js';
const meta = {
  title: 'Components/Form',
  component: 'tp-form',
  parameters: { docs: libraryDocs('components/form') },
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
