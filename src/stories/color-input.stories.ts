import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type { TpColorInput } from '../components/color-input/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import { COLOR_FORMATS } from '../foundation/color/types.js';
import type { ColorFormat } from '../foundation/color/types.js';
import { libraryDocs } from './library-docs.js';
interface Args {
  value: string;
  label: string;
  variant: 'default' | 'inline';
  format: ColorFormat;
  alpha: boolean;
  showSwatch: boolean;
  showValue: boolean;
  size: 'sm' | 'default';
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
}
const meta: Meta<Args> = {
  title: 'Components/Color input',
  component: 'tp-color-input',
  parameters: { docs: libraryDocs('components/color-input') },
  args: {
    value: '#6d5dfc',
    label: 'Accent color',
    variant: 'default',
    format: 'hex',
    alpha: false,
    showSwatch: true,
    showValue: true,
    size: 'default',
    disabled: false,
    readOnly: false,
    required: false,
  },
  argTypes: {
    value: { control: 'text', description: 'Controlled color in any CSS notation.' },
    label: { control: 'text' },
    variant: { control: 'select', options: ['default', 'inline'] },
    format: { control: 'select', options: [...COLOR_FORMATS] },
    alpha: { control: 'boolean' },
    showSwatch: { control: 'boolean' },
    showValue: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'default'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const control = createRef<TpColorInput>();
    return html`<tp-color-input
      ${ref(control)}
      style=${args.variant === 'inline' ? 'inline-size: 18rem' : ''}
      .value=${args.value}
      .label=${args.label}
      .variant=${args.variant}
      .format=${args.format}
      .alpha=${args.alpha}
      .showSwatch=${args.showSwatch}
      .showValue=${args.showValue}
      .size=${args.size}
      .disabled=${args.disabled}
      .readOnly=${args.readOnly}
      .required=${args.required}
      .onValueChange=${(event: TpValueChangeEvent<string>) => {
        if (event.defaultPrevented || event.detail.cancelled || !control.value) return;
        const owner = control.value;
        owner.value = event.detail.value;
        queueMicrotask(() => {
          if (!event.defaultPrevented && !event.detail.cancelled && owner.isConnected)
            updateArgs({ value: owner.value });
        });
      }}
    ></tp-color-input>`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
