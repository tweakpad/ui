import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';

const markdownSample = `# Release 2.4

Shared workspaces are here. Invite up to **50 teammates**, assign roles, and keep billing in one
place. See the [migration notes](#migration) before you upgrade.

## Migration

- [x] Workspace roles and permissions
- [x] Consolidated invoices
- [ ] Audit log export

\`\`\`js
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
\`\`\`

| Plan | Seats | Price |
| :--- | ---: | ---: |
| Starter | 5 | $0 |
| Team | 50 | $12 / seat |`;

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
      table: { defaultValue: { summary: 'default' } },
    },
    headingOffset: {
      control: { type: 'number', min: 0, max: 5, step: 1 },
      table: { defaultValue: { summary: '0' } },
    },
    idPrefix: {
      control: 'text',
      table: { defaultValue: { summary: "''" } },
    },
    streaming: {
      control: 'boolean',
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
