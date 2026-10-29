import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type { CheckboxVariant } from '../components/checkbox/index.js';
import type { TpSwitch } from '../components/switch/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import { libraryDocs } from './library-docs.js';

interface Args {
  checked: boolean;
  label: string;
  size: 'sm' | 'default';
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  nativeAction: boolean;
  variant: CheckboxVariant;
}
const meta: Meta<Args> = {
  title: 'Components/Switch',
  component: 'tp-switch',
  parameters: { docs: libraryDocs('components/switch') },
  args: {
    checked: false,
    label: 'Notifications',
    size: 'default',
    disabled: false,
    readOnly: false,
    required: false,
    nativeAction: false,
    variant: 'default',
  },
  argTypes: {
    checked: { control: 'boolean' },
    label: { control: 'text' },
    size: { control: 'select', options: ['sm', 'default'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    nativeAction: { control: 'boolean' },
    variant: { control: 'select', options: ['default', 'inline'] },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const setting = createRef<TpSwitch>();
    return html`<tp-field orientation="horizontal" .label=${args.label}>
      <tp-switch
        ${ref(setting)}
        name="notifications"
        .checked=${args.checked}
        .size=${args.size}
        .variant=${args.variant}
        .disabled=${args.disabled}
        .readOnly=${args.readOnly}
        .required=${args.required}
        .nativeAction=${args.nativeAction}
        .onCheckedChange=${(event: TpValueChangeEvent<boolean>) => {
          if (event.defaultPrevented || event.detail.cancelled || !setting.value) return;
          const owner = setting.value;
          owner.checked = event.detail.value;
          queueMicrotask(() => {
            if (!event.defaultPrevented && !event.detail.cancelled && owner.isConnected)
              updateArgs({ checked: owner.checked });
          });
        }}
      ></tp-switch>
    </tp-field>`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
