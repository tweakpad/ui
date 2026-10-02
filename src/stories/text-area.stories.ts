import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type { TpTextArea } from '../components/text-area/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import documentation from '../../docs/text-area.md?raw';
interface Args {
  value: string;
  label: string;
  placeholder: string;
  rows: number;
  resize: 'none' | 'block' | 'inline' | 'both';
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
}
const meta: Meta<Args> = {
  title: 'Components/Text area',
  component: 'tp-text-area',
  tags: ['autodocs'],
  parameters: { layout: 'padded', docs: { description: { component: documentation } } },
  args: {
    value: '',
    label: 'Message',
    placeholder: 'Write a message',
    rows: 2,
    resize: 'block',
    disabled: false,
    readOnly: false,
    required: false,
  },
  argTypes: {
    value: { control: 'text', description: 'Controlled text; this example accepts proposals.' },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    rows: { control: { type: 'number', min: 1 } },
    resize: { control: 'select', options: ['none', 'block', 'inline', 'both'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const control = createRef<TpTextArea>();
    return html`<tp-text-area
      ${ref(control)}
      .value=${args.value}
      .label=${args.label}
      .placeholder=${args.placeholder}
      .rows=${args.rows}
      .resize=${args.resize}
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
    ></tp-text-area>`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
