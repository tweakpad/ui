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
import { libraryDocs } from './library-docs.js';

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
  variant: TpSlider['variant'];
  disabled: boolean;
  readOnly: boolean;
  label: string;
  locale: string;
  buffered: SliderBufferedRange[];
  segments: SliderSegment[];
  indeterminateText: string;
  formAssociatedValue: boolean;
}
const meta: Meta<Args> = {
  title: 'Components/Slider',
  component: 'tp-slider',
  parameters: { docs: libraryDocs('components/slider') },
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
    variant: 'default',
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
    value: { control: 'object' },
    minimum: { control: 'number' },
    maximum: { control: 'number' },
    step: { control: 'number' },
    largeStep: { control: 'number' },
    minStepsBetweenValues: { control: 'number' },
    thumbCollisionBehavior: { control: 'select', options: ['push', 'swap', 'none'] },
    thumbAlignment: { control: 'select', options: ['center', 'edge', 'delayed-edge'] },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    variant: { control: 'select', options: ['default', 'bar'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    label: { control: 'text' },
    locale: { control: 'text' },
    buffered: { control: 'object' },
    segments: { control: 'object' },
    indeterminateText: { control: 'text' },
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
      .variant=${args.variant}
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
