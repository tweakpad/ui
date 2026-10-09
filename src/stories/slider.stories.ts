import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type {
  TpSlider,
  SliderBufferedRange,
  SliderSegment,
  SliderValue,
  SliderThumbCollisionBehavior,
  SliderThumbAlignment,
} from '../components/slider/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import { sliderExamples } from './slider.examples.js';
import documentation from '../../docs/slider.md?raw';

interface Args {
  value: SliderValue;
  minimum: number;
  maximum: number;
  step: number;
  largeStep: number;
  minStepsBetweenValues: number;
  thumbCollisionBehavior: SliderThumbCollisionBehavior;
  thumbAlignment: SliderThumbAlignment;
  orientation: 'horizontal' | 'vertical';
  disabled: boolean;
  readOnly: boolean;
  label: string;
  locale: string;
  buffered: SliderBufferedRange[];
  segments: SliderSegment[];
  indeterminateText: string;
  formAssociatedValue: boolean;
}
const source = `<script type="module">\n  import '@tweakpad/ui/styles.css';\n  import '@tweakpad/ui/register';\n</script>\n<tp-slider label="Volume" name="volume" default-value="40"\n  minimum="0" maximum="100" step="1" thumb-alignment="edge">\n</tp-slider>`;
const meta: Meta<Args> = {
  title: 'Components/Slider',
  component: 'tp-slider',
  parameters: {
    docs: {
      examples: sliderExamples,
      description: { component: documentation },
      source: { code: source, language: 'html' },
    },
  },
  args: {
    value: 40,
    minimum: 0,
    maximum: 100,
    step: 1,
    largeStep: 10,
    minStepsBetweenValues: 0,
    thumbCollisionBehavior: 'push',
    thumbAlignment: 'edge',
    orientation: 'horizontal',
    disabled: false,
    readOnly: false,
    label: 'Volume',
    locale: '',
    buffered: [],
    segments: [],
    indeterminateText: '',
    formAssociatedValue: true,
  },
  argTypes: {
    value: {
      control: 'object',
      description: 'Controlled number or ordered number list; the example accepts proposals.',
    },
    minimum: { control: 'number' },
    maximum: { control: 'number' },
    step: { control: 'number' },
    largeStep: { control: 'number' },
    minStepsBetweenValues: { control: 'number' },
    thumbCollisionBehavior: { control: 'select', options: ['push', 'swap', 'none'] },
    thumbAlignment: { control: 'select', options: ['center', 'edge', 'delayed-edge'] },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    label: { control: 'text' },
    locale: { control: 'text' },
    buffered: {
      control: 'object',
      description: 'Non-semantic [start, end] ranges in value units, e.g. [[0, 60]].',
    },
    segments: {
      control: 'object',
      description:
        'Non-semantic chapter segments, e.g. [{"start": 0, "end": 50, "label": "Intro"}].',
    },
    indeterminateText: {
      control: 'text',
      description: 'aria-valuetext while minimum/maximum form an empty or non-finite domain.',
    },
    formAssociatedValue: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const slider = createRef<TpSlider>();
    return html`<tp-slider
      ${ref(slider)}
      .value=${args.value}
      .minimum=${args.minimum}
      .maximum=${args.maximum}
      .step=${args.step}
      .largeStep=${args.largeStep}
      .minStepsBetweenValues=${args.minStepsBetweenValues}
      .thumbCollisionBehavior=${args.thumbCollisionBehavior}
      .thumbAlignment=${args.thumbAlignment}
      .orientation=${args.orientation}
      .disabled=${args.disabled}
      .readOnly=${args.readOnly}
      .label=${args.label}
      .locale=${args.locale}
      .buffered=${args.buffered}
      .segments=${args.segments}
      .indeterminateText=${args.indeterminateText}
      .formAssociatedValue=${args.formAssociatedValue}
      .onValueChange=${(event: TpValueChangeEvent<SliderValue | undefined>) => {
        if (event.defaultPrevented || event.detail.cancelled || event.detail.value === undefined)
          return;
        if (slider.value) slider.value.value = event.detail.value;
        queueMicrotask(() => {
          if (slider.value?.value !== undefined) updateArgs({ value: slider.value.value });
        });
      }}
    ></tp-slider>`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
