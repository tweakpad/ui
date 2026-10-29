import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import type { CheckboxVariant, TpCheckbox } from '../components/checkbox/index.js';
import { useArgs } from 'storybook/preview-api';
import type { TpValueChangeEvent } from '../foundation/events.js';
import { libraryDocs } from './library-docs.js';
interface Args {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  keepMounted: boolean;
  nativeAction: boolean;
  variant: CheckboxVariant;
}
const meta: Meta<Args> = {
  title: 'Components/Checkbox',
  component: 'tp-checkbox',
  parameters: {
    layout: 'centered',
    docs: libraryDocs('components/checkbox'),
  },
  args: {
    checked: false,
    indeterminate: false,
    disabled: false,
    readOnly: false,
    required: false,
    keepMounted: false,
    nativeAction: false,
    variant: 'default',
  },
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'Controlled checked state; this example accepts proposals.',
    },
    indeterminate: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    keepMounted: { control: 'boolean' },
    nativeAction: { control: 'boolean' },
    variant: { control: 'select', options: ['default', 'inline'] },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const checkbox = createRef<TpCheckbox>();
    return html`<tp-checkbox
      ${ref(checkbox)}
      .checked=${args.checked}
      .indeterminate=${args.indeterminate}
      .disabled=${args.disabled}
      .readOnly=${args.readOnly}
      .required=${args.required}
      .keepMounted=${args.keepMounted}
      .nativeAction=${args.nativeAction}
      .variant=${args.variant}
      .onCheckedChange=${(event: TpValueChangeEvent<boolean>) => {
        if (event.defaultPrevented || event.detail.cancelled) return;
        if (checkbox.value) checkbox.value.checked = event.detail.value;
        queueMicrotask(() => {
          if (checkbox.value) updateArgs({ checked: checkbox.value.checked });
        });
      }}
      >Accept terms and conditions</tp-checkbox
    >`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
