import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import type { TpRadioGroup } from '../components/radio-group/index.js';
import { useArgs } from 'storybook/preview-api';
import type { TpValueChangeEvent } from '../foundation/events.js';
import { libraryDocs } from './library-docs.js';
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
    docs: libraryDocs('components/radio-group'),
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
