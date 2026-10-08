import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { html } from 'lit';
import documentation from '../../docs/scroll-trigger.md?raw';
import { scrollTriggerDefaultSource, scrollTriggerExamples } from './scroll-trigger.examples.js';

interface Args {
  stagger: number;
  staggerFrom: 'first' | 'last' | 'center';
  revealRepeat: boolean;
  revealHold: boolean;
}

const meta = {
  title: 'Components/Scroll trigger',
  component: 'tp-scroll-trigger',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      examples: scrollTriggerExamples,
      source: { code: scrollTriggerDefaultSource },
    },
  },
  args: { stagger: 200, staggerFrom: 'first', revealRepeat: false, revealHold: false },
  argTypes: {
    stagger: {
      control: { type: 'range', min: 0, max: 600, step: 20 },
      description: 'Milliseconds between consecutive members.',
      table: { defaultValue: { summary: '0' } },
    },
    staggerFrom: {
      control: 'inline-radio',
      options: ['first', 'last', 'center'],
      description: '`stagger-from`: the member the stagger starts from.',
      table: { defaultValue: { summary: 'first' } },
    },
    revealRepeat: {
      control: 'boolean',
      description: '`reveal-repeat`: reset every member once out of view and replay on entry.',
      table: { defaultValue: { summary: 'false' } },
    },
    revealHold: {
      control: 'boolean',
      description: '`reveal-hold`: hold every member in its start state until cleared.',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  render: (args) => {
    // The default source is the composition; story controls set the trigger's own properties.
    const markup = scrollTriggerDefaultSource
      .replace('stagger="200"', `stagger="${args.stagger}" stagger-from="${args.staggerFrom}"`)
      .replace(
        '<tp-scroll-trigger',
        `<tp-scroll-trigger${args.revealRepeat ? ' reveal-repeat' : ''}${args.revealHold ? ' reveal-hold' : ''}`,
      );
    return html`<div style="max-inline-size: 48rem">${unsafeHTML(markup)}</div>`;
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** A heading, an image group and a caption revealed in order once the images have loaded. */
export const Default: Story = {};
