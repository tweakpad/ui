import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { codeExamples } from './one-time-code.examples.js';
import { html } from 'lit';
import { useArgs } from 'storybook/preview-api';
import type { TpOtpField, CodeValidation } from '../components/one-time-code/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import documentation from '../../docs/one-time-code.md?raw';
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
  autoComplete: string;
  autoSubmit: boolean;
}
const source = `<script type="module">
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/styles.css';
</script>
<tp-field label="Verification code" description="Enter the six-character code.">
  <tp-otp-field length="6" name="code" group-lengths="[3,3]"></tp-otp-field>
</tp-field>`;
const meta = {
  title: 'Components/One-time code field',
  component: 'tp-otp-field',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      source: { code: source },
      examples: codeExamples,
    },
  },
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
    autoComplete: 'one-time-code',
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
    autoComplete: { control: 'text' },
    autoSubmit: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    return html`<tp-field label="Verification code" description="Enter the six-character code."
      ><tp-otp-field
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
        .autoComplete=${args.autoComplete}
        .autoSubmit=${args.autoSubmit}
        name="code"
        @tp-value-change=${(event: TpValueChangeEvent<string>) => {
          if (!event.defaultPrevented && !event.detail.cancelled) {
            (event.currentTarget as TpOtpField).value = event.detail.value;
            updateArgs({ value: event.detail.value });
          }
        }}
      ></tp-otp-field
    ></tp-field>`;
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
