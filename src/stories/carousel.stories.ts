import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import documentation from '../../docs/carousel.md?raw';
import { carouselExamples, carouselDemoSource } from './carousel.examples.js';
import { carouselEffectExamples } from './carousel-effects.examples.js';
import './carousel.stories.css';

interface CarouselStoryArgs {
  orientation: 'horizontal' | 'vertical';
  loop: boolean;
  itemsPerMovement: number;
  autoplay: number;
  disabled: boolean;
  readOnly: boolean;
  itemsPerView: number;
  gap: number;
  transport: 'transform' | 'scroll';
  indicators: 'fraction' | 'bullets' | 'progress' | 'off';
  navigation: boolean;
  previous: boolean;
  next: boolean;
  placement: 'footer' | 'inside' | 'outside';
  scrollbar: boolean;
}

const meta: Meta<CarouselStoryArgs> = {
  title: 'Components/Carousel',
  component: 'tp-carousel',
  parameters: {
    docs: {
      description: { component: documentation },
      examples: carouselExamples,
      source: { code: carouselDemoSource() },
    },
  },
  args: {
    orientation: 'horizontal',
    loop: false,
    itemsPerMovement: 1,
    autoplay: 0,
    disabled: false,
    readOnly: false,
    itemsPerView: 1,
    gap: 16,
    transport: 'transform',
    indicators: 'off',
    navigation: true,
    previous: true,
    next: true,
    placement: 'outside',
    scrollbar: false,
  },
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    transport: {
      control: 'select',
      options: ['transform', 'scroll'],
      table: { category: 'options' },
    },
    indicators: {
      control: 'select',
      options: ['fraction', 'bullets', 'progress', 'off'],
      table: { category: 'options.indicators' },
    },
    itemsPerView: {
      control: { type: 'number', min: 0.25, step: 0.25 },
      table: { category: 'options.layout' },
    },
    gap: { control: { type: 'number', min: 0 }, table: { category: 'options.layout' } },
    itemsPerMovement: { control: { type: 'number', min: 1, step: 1 } },
    autoplay: { control: { type: 'number', min: 0 } },
    navigation: { table: { category: 'options.navigation' } },
    previous: { table: { category: 'options.navigation' } },
    next: { table: { category: 'options.navigation' } },
    placement: {
      control: 'select',
      options: ['footer', 'inside', 'outside'],
      table: { category: 'options.navigation' },
    },
    scrollbar: { table: { category: 'options.scrollbar' } },
  },
  render: (args) =>
    html`<div
      class=${`carousel-demo${args.orientation === 'vertical' ? ' carousel-demo--vertical' : ''}`}
    >
      <tp-carousel
        label="Numbered slides"
        .orientation=${args.orientation}
        .loop=${args.loop}
        .itemsPerMovement=${args.itemsPerMovement}
        .autoplay=${args.autoplay}
        .disabled=${args.disabled}
        .readOnly=${args.readOnly}
        .options=${{
          layout: { itemsPerView: args.itemsPerView, gap: args.gap },
          transport: args.transport,
          indicators: args.indicators === 'off' ? false : { type: args.indicators },
          navigation: {
            enabled: args.navigation,
            previous: args.previous,
            next: args.next,
            placement: args.placement,
          },
          scrollbar: args.scrollbar ? { draggable: true } : false,
        }}
      >
        ${Array.from(
          { length: 5 },
          (_, index) => html`
            <tp-card class="carousel-demo-card" section-colors="off"
              ><span>${index + 1}</span></tp-card
            >
          `,
        )}
      </tp-carousel>
    </div>`,
};
export default meta;
type Story = StoryObj<CarouselStoryArgs>;
export const Default: Story = { name: 'Horizontal' };

export const Vertical: Story = {
  args: { orientation: 'vertical', itemsPerView: 2 },
  parameters: {
    docs: {
      description: { story: 'Two numbered Cards at a time in a vertical track.' },
      source: { code: carouselDemoSource(true) },
    },
  },
};

/** Effect demos are stories so each gets the canvas toolbar and an isolated view. */
const effectStory = (index: number): Story => {
  const example = carouselEffectExamples[index]!;
  return {
    name: example.title,
    render: example.render,
    parameters: {
      controls: { disable: true },
      docs: {
        description: { story: example.description },
        source: { code: example.code, language: 'html' },
      },
    },
  };
};
export const ShaderTransition = effectStory(0);
export const Crossfade = effectStory(1);
export const Layered = effectStory(2);
export const Parallax = effectStory(3);
export const Focus = effectStory(4);
