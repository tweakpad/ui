import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import type { TpCheckbox } from '../components/checkbox/index.js';
import { useArgs } from 'storybook/preview-api';
import type { TpValueChangeEvent } from '../foundation/events.js';
import documentation from '../../docs/checkbox.md?raw';
interface Args {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  keepMounted: boolean;
  nativeAction: boolean;
}
const meta: Meta<Args> = {
  title: 'Components/Checkbox',
  component: 'tp-checkbox',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      source: { code: '<tp-checkbox>Accept terms and conditions</tp-checkbox>' },
      description: { component: documentation },
    },
  },
  args: {
    checked: false,
    indeterminate: false,
    disabled: false,
    readOnly: false,
    required: false,
    keepMounted: false,
    nativeAction: false,
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
