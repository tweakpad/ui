import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type {
  ColorFormat,
  ColorPickerPicker,
  ColorPickerShape,
  ColorPickerSize,
  ColorPickerView,
  HarmonyRule,
  TpColorPicker,
} from '../../widgets/color-picker/index.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import { libraryDocs } from '../library-docs.js';

interface Args {
  value: string;
  format: ColorFormat;
  alpha: boolean;
  picker: ColorPickerPicker;
  views: ColorPickerView[];
  view: ColorPickerView;
  fields: boolean;
  formatSelect: boolean;
  preview: boolean;
  eyedropper: boolean;
  size: ColorPickerSize;
  shape: ColorPickerShape;
  harmony: HarmonyRule;
  swatches: string[];
  recent: string[];
  allowWheelScrub: boolean;
  label: string;
  locale: string;
  disabled: boolean;
  readOnly: boolean;
}
const meta: Meta<Args> = {
  title: 'Widgets/Color picker',
  component: 'tp-color-picker',
  parameters: { docs: libraryDocs('widgets/color-picker') },
  args: {
    value: '#6d5dfc',
    format: 'hex',
    alpha: true,
    picker: 'inline',
    views: ['area'],
    view: 'area',
    fields: true,
    formatSelect: true,
    preview: true,
    eyedropper: true,
    size: 'default',
    shape: 'square',
    harmony: 'none',
    swatches: [],
    recent: [],
    allowWheelScrub: false,
    label: 'Accent',
    locale: '',
    disabled: false,
    readOnly: false,
  },
  argTypes: {
    value: { control: 'text' },
    format: {
      control: 'select',
      options: ['hex', 'rgb', 'hsl', 'hwb', 'hsv', 'lab', 'oklab', 'oklch', 'cmyk'],
    },
    alpha: { control: 'boolean' },
    picker: { control: 'select', options: ['inline', 'popup'] },
    views: { control: 'object' },
    view: {
      control: 'select',
      options: ['area', 'sliders', 'wheel', 'triangle', 'swatches', 'schemes'],
    },
    fields: { control: 'boolean' },
    formatSelect: { control: 'boolean' },
    preview: { control: 'boolean' },
    eyedropper: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'default', 'lg'] },
    shape: { control: 'select', options: ['square', 'round'] },
    harmony: {
      control: 'select',
      options: ['none', 'complementary', 'analogous', 'triad', 'compound', 'custom'],
    },
    swatches: { control: 'object' },
    recent: { control: 'object' },
    allowWheelScrub: { control: 'boolean' },
    label: { control: 'text' },
    locale: { control: 'text' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const picker = createRef<TpColorPicker>();
    return html`<tp-color-picker
      ${ref(picker)}
      .value=${args.value}
      .format=${args.format}
      .alpha=${args.alpha}
      .picker=${args.picker}
      .views=${args.views}
      .view=${args.view}
      .fields=${args.fields}
      .formatSelect=${args.formatSelect}
      .preview=${args.preview}
      .eyedropper=${args.eyedropper}
      .size=${args.size}
      .shape=${args.shape}
      .harmony=${args.harmony}
      .swatches=${args.swatches}
      .recent=${args.recent}
      .allowWheelScrub=${args.allowWheelScrub}
      .label=${args.label}
      .locale=${args.locale}
      .disabled=${args.disabled}
      .readOnly=${args.readOnly}
      .onValueChange=${(event: TpValueChangeEvent<string>) => {
        if (event.defaultPrevented || event.detail.cancelled) return;
        if (picker.value) picker.value.value = event.detail.value;
        queueMicrotask(() => {
          if (picker.value) updateArgs({ value: picker.value.value });
        });
      }}
      @tp-format-change=${(event: TpValueChangeEvent<ColorFormat>) => {
        queueMicrotask(() => updateArgs({ format: event.detail.value }));
      }}
      @tp-view-change=${(event: TpValueChangeEvent<ColorPickerView>) => {
        queueMicrotask(() => updateArgs({ view: event.detail.value }));
      }}
      @tp-harmony-change=${(event: TpValueChangeEvent<HarmonyRule>) => {
        queueMicrotask(() => updateArgs({ harmony: event.detail.value }));
      }}
    ></tp-color-picker>`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
