import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { useArgs } from 'storybook/preview-api';
import type {
  TpOneTimeCodeField,
  CodeValidation,
} from '../components/one-time-code-field/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import { libraryDocs } from './library-docs.js';
interface Args {
  length: number;
  value: string;
  validationType: CodeValidation;
  groupLengths: number[];
  mask: boolean;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  invalid: boolean;
  placeholder: string;
  autocomplete: string;
  autoSubmit: boolean;
}
const meta = {
  title: 'Components/One-time code field',
  component: 'tp-one-time-code-field',
  parameters: { docs: libraryDocs('components/one-time-code-field') },
  args: {
    length: 6,
    value: '',
    validationType: 'alphanumeric',
    groupLengths: [3, 3],
    mask: false,
    disabled: false,
    readOnly: false,
    required: false,
    invalid: false,
    placeholder: '',
    autocomplete: 'one-time-code',
    autoSubmit: false,
  },
  argTypes: {
    length: { control: { type: 'number', min: 1 } },
    value: { control: 'text' },
    validationType: { control: 'select', options: ['numeric', 'alphabetic', 'alphanumeric'] },
    groupLengths: { control: 'object' },
    mask: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    invalid: { control: 'boolean' },
    placeholder: { control: 'text' },
    autocomplete: { control: 'text' },
    autoSubmit: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    return html`<tp-field label="Verification code" description="Enter the six-character code."
      ><tp-one-time-code-field
        .length=${args.length}
        .value=${args.value}
        .validationType=${args.validationType}
        .groupLengths=${args.groupLengths}
        .mask=${args.mask}
        .disabled=${args.disabled}
        .readOnly=${args.readOnly}
        .required=${args.required}
        .invalid=${args.invalid}
        .placeholder=${args.placeholder}
        .autocomplete=${args.autocomplete}
        .autoSubmit=${args.autoSubmit}
        name="code"
        @tp-value-change=${(event: TpValueChangeEvent<string>) => {
          if (!event.defaultPrevented && !event.detail.cancelled) {
            (event.currentTarget as TpOneTimeCodeField).value = event.detail.value;
            updateArgs({ value: event.detail.value });
          }
        }}
      ></tp-one-time-code-field
    ></tp-field>`;
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
