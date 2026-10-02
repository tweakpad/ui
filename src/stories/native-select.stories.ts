import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type { TpNativeSelect, NativeSelectValue } from '../components/native-select/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import documentation from '../../docs/native-select.md?raw';
interface Args {
  value: NativeSelectValue;
  label: string;
  size: 'sm' | 'default';
  multiple: boolean;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
}
const meta: Meta<Args> = {
  title: 'Components/Native select',
  component: 'tp-native-select',
  tags: ['autodocs'],
  parameters: { layout: 'padded', docs: { description: { component: documentation } } },
  args: {
    value: 'apple',
    label: 'Favorite food',
    size: 'default',
    multiple: false,
    disabled: false,
    readOnly: false,
    required: false,
  },
  argTypes: {
    value: { control: 'object', description: 'Controlled option value or array for multiple.' },
    label: { control: 'text' },
    size: { control: 'select', options: ['sm', 'default'] },
    multiple: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const control = createRef<TpNativeSelect>();
    return html`<tp-native-select
      ${ref(control)}
      .multiple=${args.multiple}
      .value=${args.value}
      .label=${args.label}
      .size=${args.size}
      .disabled=${args.disabled}
      .readOnly=${args.readOnly}
      .required=${args.required}
      .onValueChange=${(event: TpValueChangeEvent<NativeSelectValue>) => {
        if (event.defaultPrevented || event.detail.cancelled || !control.value) return;
        const owner = control.value;
        owner.value = event.detail.value;
        queueMicrotask(() => {
          if (!event.defaultPrevented && !event.detail.cancelled && owner.isConnected)
            updateArgs({ value: owner.value });
        });
      }}
      ><optgroup label="Fruit">
        <option value="apple">Apple</option>
        <option value="banana">Banana</option>
        <option value="orange">Orange</option>
      </optgroup>
      <optgroup label="Vegetables">
        <option value="carrot">Carrot</option>
        <option value="spinach">Spinach</option>
      </optgroup></tp-native-select
    >`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
