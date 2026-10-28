import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type { TpSelect, SelectEntry } from '../components/select/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import type { TpSurfaceOpenChangeEvent } from '../foundation/surface-state.js';
import { libraryDocs } from './library-docs.js';

interface Args {
  value: unknown;
  searchable: boolean;
  inputValue: string;
  showClear: boolean;
  open: boolean;
  placeholder: string;
  label: string;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  multiple: boolean;
  modal: boolean;
  highlightItemOnHover: boolean;
  keepMounted: boolean;
  alignItemWithTrigger: boolean;
  placement: string;
  sideOffset: number | undefined;
  alignOffset: number;
  scrollUpKeepMounted: boolean;
  scrollDownKeepMounted: boolean;
  showArrow: boolean;
}
const fruits = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'grape', label: 'Grape' },
];
function control(args: Args, items: readonly SelectEntry[] = fruits) {
  const [, updateArgs] = useArgs<Args>();
  const owner = createRef<TpSelect>();
  const publish = (): void => {
    queueMicrotask(() => {
      if (owner.value) updateArgs({ value: owner.value.value, open: owner.value.open });
    });
  };
  return html`<tp-select
    ${ref(owner)}
    .items=${items}
    .searchable=${args.searchable}
    .inputValue=${args.inputValue}
    .showClear=${args.showClear}
    .onInputValueChange=${(event: TpValueChangeEvent<string>) => {
      if (!event.defaultPrevented && !event.detail.cancelled && owner.value) {
        owner.value.inputValue = event.detail.value;
        queueMicrotask(() => updateArgs({ inputValue: owner.value!.inputValue }));
      }
    }}
    .value=${args.value}
    .open=${args.open}
    .placeholder=${args.placeholder}
    .label=${args.label}
    .disabled=${args.disabled}
    .readOnly=${args.readOnly}
    .required=${args.required}
    .multiple=${args.multiple}
    .modal=${args.modal}
    .highlightItemOnHover=${args.highlightItemOnHover}
    .keepMounted=${args.keepMounted}
    .alignItemWithTrigger=${args.alignItemWithTrigger}
    .placement=${args.placement}
    .sideOffset=${args.sideOffset}
    .alignOffset=${args.alignOffset}
    .scrollUpKeepMounted=${args.scrollUpKeepMounted}
    .scrollDownKeepMounted=${args.scrollDownKeepMounted}
    .showArrow=${args.showArrow}
    .onValueChange=${(event: TpValueChangeEvent<unknown>) => {
      if (!event.defaultPrevented && !event.detail.cancelled && owner.value)
        owner.value.value = event.detail.value;
      publish();
    }}
    .onOpenChange=${(event: TpSurfaceOpenChangeEvent) => {
      if (!event.defaultPrevented && !event.detail.cancelled && owner.value)
        owner.value.open = event.detail.value;
      publish();
    }}
  ></tp-select>`;
}
const meta: Meta<Args> = {
  title: 'Components/Select',
  component: 'tp-select',
  parameters: { layout: 'centered', docs: libraryDocs('components/select') },
  args: {
    searchable: false,
    inputValue: '',
    showClear: false,
    value: null,
    open: false,
    placeholder: 'Choose a fruit',
    label: 'Fruit',
    disabled: false,
    readOnly: false,
    required: false,
    multiple: false,
    modal: true,
    highlightItemOnHover: true,
    keepMounted: false,
    alignItemWithTrigger: true,
    placement: 'block-end start',
    sideOffset: undefined,
    alignOffset: 0,
    scrollUpKeepMounted: false,
    scrollDownKeepMounted: false,
    showArrow: false,
  },
  argTypes: {
    searchable: { control: 'boolean' },
    inputValue: { control: 'text' },
    showClear: { control: 'boolean' },
    value: { control: 'object' },
    open: { control: 'boolean' },
    placeholder: { control: 'text' },
    label: { control: 'text' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    multiple: { control: 'boolean' },
    modal: { control: 'boolean' },
    highlightItemOnHover: { control: 'boolean' },
    keepMounted: { control: 'boolean' },
    alignItemWithTrigger: { control: 'boolean' },
    placement: {
      control: 'select',
      options: [
        'block-end start',
        'block-end center',
        'block-end end',
        'block-start start',
        'inline-start start',
        'inline-end start',
      ],
    },
    sideOffset: { control: 'number' },
    alignOffset: { control: 'number' },
    scrollUpKeepMounted: { control: 'boolean' },
    scrollDownKeepMounted: { control: 'boolean' },
    showArrow: { control: 'boolean' },
  },
  render: (args) => control(args),
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
