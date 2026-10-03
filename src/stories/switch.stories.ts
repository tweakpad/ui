import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type { TpSwitch } from '../components/switch/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import documentation from '../../docs/switch.md?raw';

interface Args {
  checked: boolean;
  label: string;
  size: 'sm' | 'default';
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  nativeAction: boolean;
}
const meta: Meta<Args> = {
  title: 'Components/Switch',
  component: 'tp-switch',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      source: {
        transform: (_source: string, { args }: { args: Args }) => `import '@tweakpad/ui/styles.css';
import '@tweakpad/ui/register';
import { TpField, TpSwitch } from '@tweakpad/ui';

const field = new TpField();
field.orientation = 'horizontal';
field.label = ${JSON.stringify(args.label)};
const setting = new TpSwitch();
setting.name = 'notifications';
setting.size = ${JSON.stringify(args.size)};
setting.checked = ${args.checked};
setting.disabled = ${args.disabled};
setting.readOnly = ${args.readOnly};
setting.required = ${args.required};
setting.nativeAction = ${args.nativeAction};
setting.onCheckedChange = (event) => {
  if (!event.defaultPrevented && !event.detail.cancelled) setting.checked = event.detail.value;
};
field.append(setting);
document.body.append(field);`,
      },
    },
  },
  args: {
    checked: false,
    label: 'Notifications',
    size: 'default',
    disabled: false,
    readOnly: false,
    required: false,
    nativeAction: false,
  },
  argTypes: {
    checked: { control: 'boolean' },
    label: { control: 'text' },
    size: { control: 'select', options: ['sm', 'default'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    nativeAction: { control: 'boolean' },
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
