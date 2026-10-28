import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import documentation from '../../docs/code-block.md?raw';
import {
  codeBlockDefaultSource,
  codeBlockExamples,
  typescriptSample,
} from './code-block.examples.js';

interface Args {
  language: string;
  label: string;
  lineNumbers: boolean;
  highlightLines: string;
  collapsible: boolean;
  collapsedLines: number;
  copyable: boolean;
  wrap: boolean;
}

const meta = {
  title: 'Components/Code block',
  component: 'tp-code-block',
  parameters: {
    docs: {
      description: { component: documentation },
      examples: codeBlockExamples,
      source: { code: codeBlockDefaultSource },
    },
  },
  args: {
    language: 'typescript',
    label: '',
    lineNumbers: false,
    highlightLines: '',
    collapsible: false,
    collapsedLines: 12,
    copyable: true,
    wrap: false,
  },
  argTypes: {
    language: {
      control: 'select',
      options: ['typescript', 'javascript', 'html', 'css', 'json', 'bash', 'diff', 'plaintext'],
      description: 'Language passed to the highlighter; unknown languages render as plain text.',
      table: { defaultValue: { summary: 'plaintext' } },
    },
    label: {
      control: 'text',
      description: 'Title in the header (the `title` slot replaces it). Empty hides the header.',
      table: { defaultValue: { summary: "''" } },
    },
    lineNumbers: {
      control: 'boolean',
      description: '`line-numbers`: sticky line number gutter.',
      table: { defaultValue: { summary: 'false' } },
    },
    highlightLines: {
      control: 'text',
      description: '`highlight-lines`: lines and ranges, such as `1,3-5`.',
      table: { defaultValue: { summary: "''" } },
    },
    collapsible: {
      control: 'boolean',
      description: 'Clips to `collapsed-lines` with an Expand control.',
      table: { defaultValue: { summary: 'false' } },
    },
    collapsedLines: {
      control: { type: 'number', min: 1, max: 40, step: 1 },
      description: '`collapsed-lines`: visible lines while collapsed.',
      table: { defaultValue: { summary: '12' } },
    },
    copyable: {
      control: 'boolean',
      description: 'Shows the copy action; `copyable="false"` removes it.',
      table: { defaultValue: { summary: 'true' } },
    },
    wrap: {
      control: 'boolean',
      description: 'Wraps long lines instead of scrolling horizontally.',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  render: (args) =>
    html`<tp-code-block
      .code=${typescriptSample}
      .language=${args.language}
      .label=${args.label}
      .lineNumbers=${args.lineNumbers}
      .highlightLines=${args.highlightLines}
      .collapsible=${args.collapsible}
      .collapsedLines=${args.collapsedLines}
      .copyable=${args.copyable}
      .wrap=${args.wrap}
    ></tp-code-block>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** Built-in tokenizer, no setup. */
export const Default: Story = {};
