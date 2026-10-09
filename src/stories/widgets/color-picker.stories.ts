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
import { colorPickerExamples } from './color-picker.examples.js';
import documentation from '../../../docs/widgets/color-picker.md?raw';

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
  recentLimit: number;
  allowWheelScrub: boolean;
  label: string;
  locale: string;
  disabled: boolean;
  readOnly: boolean;
}
const sourceFor = (markup: string) =>
  `<script type="module">\n  import '@tweakpad/ui/styles.css';\n  import '@tweakpad/ui/register';\n  import '@tweakpad/ui/register/widgets';\n</script>\n${markup}`;
const source = sourceFor(
  '<tp-color-picker label="Accent" name="accent" default-value="#6d5dfc"></tp-color-picker>',
);
const meta: Meta<Args> = {
  title: 'Widgets/Color picker',
  component: 'tp-color-picker',
  parameters: {
    docs: {
      examples: colorPickerExamples,
      description: { component: documentation },
      source: { code: source, language: 'html' },
    },
  },
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
    recentLimit: 8,
    allowWheelScrub: false,
    label: 'Accent',
    locale: '',
    disabled: false,
    readOnly: false,
  },
  argTypes: {
    value: { control: 'text', description: 'Controlled CSS color; the example accepts proposals.' },
    format: {
      control: 'select',
      options: ['hex', 'rgb', 'hsl', 'hwb', 'hsv', 'lab', 'oklab', 'oklch', 'cmyk'],
    },
    alpha: { control: 'boolean' },
    picker: { control: 'select', options: ['inline', 'popup'] },
    views: {
      control: 'object',
      description: 'Ordered views: area, sliders, wheel, triangle, swatches, schemes.',
    },
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
    swatches: { control: 'object', description: 'Saved colors or labeled groups.' },
    recentLimit: { control: 'number' },
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
      .recentLimit=${args.recentLimit}
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
export const Popup: Story = {
  args: { picker: 'popup' },
  parameters: {
    docs: {
      source: {
        code: sourceFor(
          '<tp-color-picker label="Accent" picker="popup" default-value="#6d5dfc"></tp-color-picker>',
        ),
      },
    },
  },
};
export const ChannelSliders: Story = {
  args: {
    views: ['sliders'],
    view: 'sliders',
    format: 'oklch',
    value: 'oklch(0.586 0.227 281.3)',
    label: 'Surface',
  },
  parameters: {
    docs: {
      source: {
        code: sourceFor(
          '<tp-color-picker label="Surface" views="sliders" default-format="oklch" default-value="oklch(0.586 0.227 281.3)"></tp-color-picker>',
        ),
      },
    },
  },
};
export const HarmonyWheel: Story = {
  args: { views: ['wheel'], view: 'wheel', harmony: 'triad', value: '#e53935', label: 'Palette' },
  parameters: {
    docs: {
      source: {
        code: sourceFor(
          '<tp-color-picker label="Palette" views="wheel" default-harmony="triad" default-value="#e53935"></tp-color-picker>',
        ),
      },
    },
  },
};
export const HueTriangle: Story = {
  args: { views: ['triangle'], view: 'triangle', value: '#43a047', label: 'Tint' },
  parameters: {
    docs: {
      source: {
        code: sourceFor(
          '<tp-color-picker label="Tint" views="triangle" default-value="#43a047"></tp-color-picker>',
        ),
      },
    },
  },
};
export const Schemes: Story = {
  args: {
    views: ['area', 'swatches', 'schemes'],
    view: 'schemes',
    value: '#fb8c00',
    label: 'Scheme',
    swatches: ['#fb8c00', '#e53935', '#8e24aa', '#3949ab', '#039be5'],
  },
  parameters: {
    docs: {
      source: {
        code: sourceFor(
          '<tp-color-picker label="Scheme" views="area swatches schemes" default-view="schemes" default-value="#fb8c00"></tp-color-picker>',
        ),
      },
    },
  },
};
