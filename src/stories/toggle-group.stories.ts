import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import type { ToggleSize } from '../components/toggle/toggle.js';
import type { TpToggleGroup } from '../components/toggle-group/index.js';
import { useArgs } from 'storybook/preview-api';
import type { TpValueChangeEvent } from '../foundation/events.js';
import { libraryDocs } from './library-docs.js';
interface Args {
  value: readonly string[];
  multiple: boolean;
  orientation: 'horizontal' | 'vertical';
  variant: 'ghost' | 'outline';
  size: ToggleSize;
  spacing: number;
  disabled: boolean;
  readOnly: boolean;
  loopFocus: boolean;
  label: string;
}
function renderGroup(args: Args) {
  const [, updateArgs] = useArgs<Args>();
  const group = createRef<TpToggleGroup>();
  const items = [
    { value: 'start', label: 'Start' },
    { value: 'center', label: 'Center' },
    { value: 'end', label: 'End' },
  ];
  return html`<tp-toggle-group
    ${ref(group)}
    .value=${args.value}
    .multiple=${args.multiple}
    .orientation=${args.orientation}
    .variant=${args.variant}
    .size=${args.size}
    .spacing=${args.spacing}
    .disabled=${args.disabled}
    .readOnly=${args.readOnly}
    .loopFocus=${args.loopFocus}
    .label=${args.label}
    .onValueChange=${(event: TpValueChangeEvent<readonly string[]>) => {
      const owner = group.value;
      if (!owner || event.defaultPrevented || event.detail.cancelled) return;
      owner.value = event.detail.value;
      queueMicrotask(() => {
        if (!owner.isConnected || event.defaultPrevented || event.detail.cancelled) return;
        updateArgs({ value: owner.value });
      });
    }}
    >${items.map((item) => html`<tp-toggle .value=${item.value}>${item.label}</tp-toggle>`)}</tp-toggle-group
  >`;
}
const meta: Meta<Args> = {
  title: 'Components/Toggle group',
  component: 'tp-toggle-group',
  parameters: {
    layout: 'centered',
    docs: libraryDocs('components/toggle-group'),
  },
  args: {
    value: [],
    multiple: false,
    orientation: 'horizontal',
    variant: 'ghost',
    size: 'default',
    spacing: 2,
    disabled: false,
    readOnly: false,
    loopFocus: true,
    label: 'Text alignment',
  },
  argTypes: {
    value: { control: 'object' },
    multiple: { control: 'boolean' },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    variant: { control: 'select', options: ['ghost', 'outline'] },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'default', 'lg', 'icon-xs', 'icon-sm', 'icon', 'icon-lg'],
    },
    spacing: { control: { type: 'number', min: 0 } },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    loopFocus: { control: 'boolean' },
    label: { control: 'text' },
  },
  render: (args) => renderGroup(args),
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
