import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import type { PartRenderContext } from '../foundation/part.js';
import type { TpBadge } from '../components/badge/badge.js';

interface Args {
  variant: TpBadge['variant'];
  interactive: boolean;
}

const meta = {
  title: 'Components/Badge',
  component: 'tp-badge',
  parameters: { docs: libraryDocs('components/badge') },
  args: { variant: 'default', interactive: false },
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'secondary',
        'destructive',
        'success',
        'warning',
        'outline',
        'ghost',
        'link',
      ],
      table: { defaultValue: { summary: 'default' } },
    },
    interactive: { control: 'boolean' },
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
