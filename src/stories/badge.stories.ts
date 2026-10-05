import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import documentation from '../../docs/badge.md?raw';
import { badgeExamples } from './badge.examples.js';
import type { PartRenderContext } from '../foundation/part.js';
import type { TpBadge } from '../components/badge/index.js';

interface Args {
  variant: TpBadge['variant'];
  interactive: boolean;
}

const meta = {
  title: 'Components/Badge',
  component: 'tp-badge',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      examples: badgeExamples,
      source: { code: '<tp-badge>New</tp-badge>' },
    },
  },
  args: { variant: 'default', interactive: false },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
      table: { defaultValue: { summary: 'default' } },
    },
    interactive: {
      control: 'boolean',
      description:
        'Declares an adopted action/link. This fixture supplies a native button when enabled.',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  render: ({ variant, interactive }) =>
    html`<tp-badge
      .variant=${variant}
      .interactive=${interactive}
      .partContracts=${
        interactive
          ? {
              badge: {
                renderDelegate: ({ bind, content }: PartRenderContext) =>
                  html`<button type="button" ${bind}>${content}</button>`,
              },
            }
          : {}
      }
      >New</tp-badge
    >`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
