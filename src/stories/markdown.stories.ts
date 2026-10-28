import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';

const markdownSample = `# A Small Markdown Specimen

*An editorial sample for quickly testing typography and basic Markdown rendering.*

Good Markdown should feel like a document first and a syntax demonstration second. A renderer needs to handle **emphasis**, *italics*, [links](https://commonmark.org/), \`inline code\`, and ordinary prose without disturbing the reading rhythm.

## Structure and Rhythm

Headings should establish hierarchy without overwhelming the page. Paragraphs should remain comfortable to read, with enough spacing to make sections distinct.

> Typography gives structure to information before decoration ever enters the picture.

A short list is often enough to expose spacing and alignment:

- Clear hierarchy
- Consistent vertical rhythm
- Comfortable line length
- Distinct links and emphasis

### Code

\`\`\`js
const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));
\`\`\`

Tables introduce another layout constraint:

| Element | Purpose |
|---|---|
| Heading | Hierarchy |
| Paragraph | Reading |
| Quote | Emphasis |
| Code | Literal content |

The important test is whether all of these elements still feel like parts of the same document.`;

interface Args {
  size: 'default' | 'sm';
  headingOffset: number;
  idPrefix: string;
  streaming: boolean;
}

const meta = {
  title: 'Components/Markdown',
  component: 'tp-markdown',
  parameters: { docs: libraryDocs('components/markdown') },
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
