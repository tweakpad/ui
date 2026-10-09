import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type { TpInput } from '../components/input/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import documentation from '../../docs/input.md?raw';

interface Args {
  value: string;
  type: string;
  label: string;
  placeholder: string;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
}
const meta: Meta<Args> = {
  title: 'Components/Input',
  component: 'tp-input',
  parameters: { docs: { description: { component: documentation } } },
  args: {
    value: '',
    type: 'text',
    label: 'Project name',
    placeholder: 'Name your project',
    disabled: false,
    readOnly: false,
    required: false,
  },
  argTypes: {
    value: { control: 'text', description: 'Controlled value; this example accepts proposals.' },
    type: {
      control: 'select',
      options: [
        'text',
        'email',
        'password',
        'search',
        'tel',
        'url',
        'number',
        'date',
        'time',
        'color',
        'file',
      ],
    },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const control = createRef<TpInput>();
    return html`<tp-input
      ${ref(control)}
      .value=${args.value}
      .type=${args.type}
      .label=${args.label}
      .placeholder=${args.placeholder}
      .disabled=${args.disabled}
      .readOnly=${args.readOnly}
      .required=${args.required}
      .onValueChange=${(event: TpValueChangeEvent<string>) => {
        if (!event.defaultPrevented && !event.detail.cancelled && control.value) {
          const owner = control.value;
          owner.value = event.detail.value;
          queueMicrotask(() => {
            if (!event.defaultPrevented && !event.detail.cancelled && owner.isConnected) {
              updateArgs({ value: owner.value });
            }
          });
        }
      }}
    ></tp-input>`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
