import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type { TpCombobox } from '../components/combobox/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import type { TpSurfaceOpenChangeEvent } from '../foundation/surface-state.js';
import documentation from '../../docs/combobox.md?raw';

interface Args {
  value: string | string[] | null;
  inputValue: string;
  open: boolean;
  multiple: boolean;
  disabled: boolean;
  readOnly: boolean;
  showClear: boolean;
  showTrigger: boolean;
  autoHighlight: boolean | 'always';
  completionMode: 'list' | 'both' | 'inline' | 'none';
  clearBehavior: 'query' | 'selection' | 'both' | 'contextual';
  limit: number;
}
const selection = (args: Args) =>
  args.multiple
    ? Array.isArray(args.value)
      ? args.value
      : args.value == null
        ? []
        : [args.value]
    : Array.isArray(args.value)
      ? (args.value[0] ?? null)
      : args.value;
const meta: Meta<Args> = {
  title: 'Components/Combobox',
  component: 'tp-combobox',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      source: {
        transform: (_source: string, { args }: { args: Args }) => `import '@tweakpad/ui/styles.css';
import '@tweakpad/ui/register';
import { TpCombobox, TpField } from '@tweakpad/ui';

const field = new TpField();
field.label = 'Fruit';
const fruit = new TpCombobox();
fruit.name = 'fruit';
fruit.placeholder = 'Choose fruit';
fruit.items = ['Apple', 'Banana', 'Cherry', 'Grape'];
fruit.multiple = ${args.multiple};
fruit.value = ${JSON.stringify(selection(args))};
fruit.inputValue = ${JSON.stringify(args.inputValue)};
fruit.open = ${args.open};
fruit.disabled = ${args.disabled};
fruit.readOnly = ${args.readOnly};
fruit.showClear = ${args.showClear};
fruit.showTrigger = ${args.showTrigger};
fruit.autoHighlight = ${JSON.stringify(args.autoHighlight)};
fruit.completionMode = ${JSON.stringify(args.completionMode)};
fruit.clearBehavior = ${JSON.stringify(args.clearBehavior)};
fruit.limit = ${args.limit};
fruit.onValueChange = event => { if (!event.defaultPrevented) fruit.value = event.detail.value; };
fruit.onInputValueChange = event => { if (!event.defaultPrevented) fruit.inputValue = event.detail.value; };
fruit.onOpenChange = event => { if (!event.defaultPrevented) fruit.open = event.detail.value; };
field.append(fruit);
document.body.append(field);`,
      },
    },
  },
  args: {
    value: null,
    inputValue: '',
    open: false,
    multiple: false,
    disabled: false,
    readOnly: false,
    showClear: false,
    showTrigger: true,
    autoHighlight: false,
    completionMode: 'list',
    clearBehavior: 'contextual',
    limit: -1,
  },
  argTypes: {
    value: { control: 'object' },
    inputValue: { control: 'text' },
    open: { control: 'boolean' },
    multiple: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    showClear: { control: 'boolean' },
    showTrigger: { control: 'boolean' },
    autoHighlight: { control: 'select', options: [false, true, 'always'] },
    completionMode: { control: 'select', options: ['list', 'both', 'inline', 'none'] },
    clearBehavior: { control: 'select', options: ['query', 'selection', 'both', 'contextual'] },
    limit: { control: 'number' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const owner = createRef<TpCombobox>();
    const accept = (
      key: 'value' | 'inputValue' | 'open',
      event: TpValueChangeEvent<unknown> | TpSurfaceOpenChangeEvent,
    ) => {
      const host = owner.value;
      if (!host || event.defaultPrevented || event.detail.cancelled) return;
      if (key === 'value') host.value = event.detail.value;
      else if (key === 'inputValue') host.inputValue = event.detail.value as string;
      else host.open = event.detail.value as boolean;
      queueMicrotask(() => {
        if (!event.defaultPrevented && !event.detail.cancelled && host.isConnected)
          updateArgs({ [key]: host[key] });
      });
    };
    return html`<tp-field label="Fruit"
      ><tp-combobox
        ${ref(owner)}
        name="fruit"
        placeholder="Choose fruit"
        .items=${['Apple', 'Banana', 'Cherry', 'Grape']}
        .multiple=${args.multiple}
        .value=${selection(args)}
        .inputValue=${args.inputValue}
        .open=${args.open}
        .disabled=${args.disabled}
        .readOnly=${args.readOnly}
        .showClear=${args.showClear}
        .showTrigger=${args.showTrigger}
        .autoHighlight=${args.autoHighlight}
        .completionMode=${args.completionMode}
        .clearBehavior=${args.clearBehavior}
        .limit=${args.limit}
        .onValueChange=${(event: TpValueChangeEvent<unknown>) => accept('value', event)}
        .onInputValueChange=${(event: TpValueChangeEvent<string>) => accept('inputValue', event)}
        .onOpenChange=${(event: TpSurfaceOpenChangeEvent) => accept('open', event)}
      ></tp-combobox
    ></tp-field>`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
