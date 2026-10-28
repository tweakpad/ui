import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import type { ToggleSize, TpToggle } from '../components/toggle/toggle.js';
import { useArgs } from 'storybook/preview-api';
import type { TpValueChangeEvent } from '../foundation/events.js';
import { libraryDocs } from './library-docs.js';

interface Args {
  pressed: boolean;
  variant: 'ghost' | 'outline';
  size: ToggleSize;
  disabled: boolean;
  readOnly: boolean;
  nativeAction: boolean;
  ariaLabel: string;
  value: string;
}
function renderToggle(args: Args) {
  const [, updateArgs] = useArgs<Args>();
  const toggle = createRef<TpToggle>();
  return html`<tp-toggle
    ${ref(toggle)}
    .pressed=${args.pressed}
    .variant=${args.variant}
    .size=${args.size}
    .disabled=${args.disabled}
    .readOnly=${args.readOnly}
    .nativeAction=${args.nativeAction}
    .ariaLabel=${args.ariaLabel}
    .value=${args.value}
    .onPressedChange=${(event: TpValueChangeEvent<boolean>) => {
      const owner = toggle.value;
      if (!owner || event.defaultPrevented || event.detail.cancelled) return;
      owner.pressed = event.detail.value;
      queueMicrotask(() => {
        if (!owner.isConnected || event.defaultPrevented || event.detail.cancelled) return;
        updateArgs({ pressed: owner.pressed });
      });
    }}
    >Bold</tp-toggle
  >`;
}
const meta: Meta<Args> = {
  title: 'Components/Toggle',
  component: 'tp-toggle',
  parameters: {
    layout: 'centered',
    docs: libraryDocs('components/toggle'),
  },
  args: {
    pressed: false,
    variant: 'ghost',
    size: 'default',
    disabled: false,
    readOnly: false,
    nativeAction: true,
    ariaLabel: '',
    value: '',
  },
  argTypes: {
    pressed: { control: 'boolean' },
    variant: { control: 'select', options: ['ghost', 'outline'] },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'default', 'lg', 'icon-xs', 'icon-sm', 'icon', 'icon-lg'],
    },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    nativeAction: { control: 'boolean' },
    ariaLabel: { control: 'text' },
    value: { control: 'text' },
  },
  render: (args) => renderToggle(args),
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
