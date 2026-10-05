import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import documentation from '../../docs/carousel.md?raw';
import { carouselExamples } from './carousel.examples.js';

const meta = {
  title: 'Components/Carousel',
  component: 'tp-carousel',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      examples: carouselExamples,
      source: {
        code: `<tp-carousel label="Project stages">
  <tp-card><h3>Research</h3><p>Understand the problem.</p></tp-card>
  <tp-card><h3>Design</h3><p>Explore the interaction.</p></tp-card>
  <tp-card><h3>Review</h3><p>Test the complete experience.</p></tp-card>
</tp-carousel>`,
      },
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
    indicators: 'fraction',
    navigation: true,
    previous: true,
    next: true,
    placement: 'footer',
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
      style=${args.orientation === 'vertical' ? 'height:360px;max-width:36rem' : 'max-width:48rem'}
    >
      <tp-carousel
        label="Project stages"
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
        <tp-card
          ><h3>Research</h3>
          <p>Understand the people using the product.</p>
          <tp-button type="button" variant="outline">Read research</tp-button></tp-card
        >
        <tp-card
          ><h3>Design</h3>
          <p>Explore and refine the interaction.</p>
          <tp-button type="button" variant="outline">Open designs</tp-button></tp-card
        >
        <tp-card
          ><h3>Review</h3>
          <p>Test the complete experience.</p>
          <tp-button type="button" variant="outline">Start review</tp-button></tp-card
        >
      </tp-carousel>
    </div>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
