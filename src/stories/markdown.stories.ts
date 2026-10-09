import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import documentation from '../../docs/markdown.md?raw';
import { markdownDefaultSource, markdownExamples, markdownSample } from './markdown.examples.js';

interface Args {
  size: 'default' | 'sm';
  headingOffset: number;
  idPrefix: string;
  streaming: boolean;
}

const meta = {
  title: 'Components/Markdown',
  component: 'tp-markdown',
  parameters: {
    docs: {
      description: { component: documentation },
      examples: markdownExamples,
      source: { code: markdownDefaultSource },
    },
  },
  args: {
    size: 'default',
    headingOffset: 0,
    idPrefix: '',
    streaming: false,
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['default', 'sm'],
      description: 'Typography and flow scale; `sm` fits chat bubbles and dense panels.',
      table: { defaultValue: { summary: 'default' } },
    },
    headingOffset: {
      control: { type: 'number', min: 0, max: 5, step: 1 },
      description: '`heading-offset`: levels added to every heading, capped at 6.',
      table: { defaultValue: { summary: '0' } },
    },
    idPrefix: {
      control: 'text',
      description: '`id-prefix`: prefix for heading and footnote identifiers.',
      table: { defaultValue: { summary: "''" } },
    },
    streaming: {
      control: 'boolean',
      description: 'Completes unfinished syntax in the last block while the source grows.',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  render: (args) =>
    html`<tp-markdown
      .source=${markdownSample}
      .size=${args.size}
      .headingOffset=${args.headingOffset}
      .idPrefix=${args.idPrefix}
      .streaming=${args.streaming}
    ></tp-markdown>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** Built-in parser and default element mapping, no setup. */
export const Default: Story = {};
