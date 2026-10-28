import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';

const typescriptSample = `import { LitElement, html } from 'lit';

/** Counts presses and announces the total. */
export class TpCounter extends LitElement {
  static properties = { count: { type: Number } };
  count = 0;

  render() {
    return html\`<button @click=\${() => this.count++}>Pressed \${this.count} times</button>\`;
  }
}

customElements.define('tp-counter', TpCounter);`;

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
  parameters: { docs: libraryDocs('components/code-block') },
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
      table: { defaultValue: { summary: 'plaintext' } },
    },
    label: {
      control: 'text',
      table: { defaultValue: { summary: "''" } },
    },
    lineNumbers: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    highlightLines: {
      control: 'text',
      table: { defaultValue: { summary: "''" } },
    },
    collapsible: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    collapsedLines: {
      control: { type: 'number', min: 1, max: 40, step: 1 },
      table: { defaultValue: { summary: '12' } },
    },
    copyable: {
      control: 'boolean',
      table: { defaultValue: { summary: 'true' } },
    },
    wrap: {
      control: 'boolean',
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
