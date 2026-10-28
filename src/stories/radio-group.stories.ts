import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import type { TpRadioGroup } from '../components/radio-group/index.js';
import { useArgs } from 'storybook/preview-api';
import type { TpValueChangeEvent } from '../foundation/events.js';
import documentation from '../../docs/radio-group.md?raw';
interface Args {
  value: string;
  orientation: 'horizontal' | 'vertical';
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  label: string;
}
const meta: Meta<Args> = {
  title: 'Components/Radio group',
  component: 'tp-radio-group',
  parameters: {
    layout: 'centered',
    docs: {
      source: {
        code: '<tp-radio-group label="Delivery method">\n  <tp-radio-group-item value="standard">Standard</tp-radio-group-item>\n  <tp-radio-group-item value="express">Express</tp-radio-group-item>\n  <tp-radio-group-item value="priority">Priority</tp-radio-group-item>\n</tp-radio-group>',
      },
      description: { component: documentation },
    },
  },
  args: {
    value: '',
    orientation: 'vertical',
    disabled: false,
    readOnly: false,
    required: false,
    label: 'Delivery method',
  },
  argTypes: {
    value: {
      control: 'select',
      options: ['', 'standard', 'express', 'priority'],
      description: 'Controlled value; empty starts unmatched. The example accepts proposals.',
    },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    label: { control: 'text' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const group = createRef<TpRadioGroup>();
    return html`<tp-radio-group
      ${ref(group)}
      .value=${args.value}
      .orientation=${args.orientation}
      .disabled=${args.disabled}
      .readOnly=${args.readOnly}
      .required=${args.required}
      .label=${args.label}
      .onValueChange=${(event: TpValueChangeEvent<string>) => {
        if (event.defaultPrevented || event.detail.cancelled) return;
        if (group.value) group.value.value = event.detail.value;
        queueMicrotask(() => {
          if (group.value) {
            const committed = group.value.value;
            updateArgs({ value: typeof committed === 'string' ? committed : '' });
          }
        });
      }}
      ><tp-radio-group-item value="standard">Standard</tp-radio-group-item
      ><tp-radio-group-item value="express">Express</tp-radio-group-item
      ><tp-radio-group-item value="priority">Priority</tp-radio-group-item></tp-radio-group
    >`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
