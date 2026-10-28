import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing } from 'lit';
import { libraryDocs } from './library-docs.js';
import type { TpCitation } from '../components/citation/citation.js';

interface Args {
  label: string;
  index: number | null;
  href: string;
  src: boolean;
  sourceTitle: string;
  description: string;
  superscript: boolean;
  variant: TpCitation['variant'];
}

/** A small site mark as an inline image, so the story never fetches a remote icon. */
const mark = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="4" fill="#2563eb"/><text x="8" y="11.5" font-family="system-ui,sans-serif" font-size="10" font-weight="700" text-anchor="middle" fill="white">T</text></svg>',
)}`;

const meta = {
  title: 'Components/Citation',
  component: 'tp-citation',
  parameters: { docs: libraryDocs('components/citation') },
  args: {
    label: 'tides.example',
    index: null,
    href: 'https://tides.example/turbines',
    src: true,
    sourceTitle: '',
    description: '',
    superscript: false,
    variant: 'outline',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'outline',
        'secondary',
        'default',
        'ghost',
        'link',
        'success',
        'warning',
        'destructive',
      ],
      table: { defaultValue: { summary: 'outline' } },
    },
    index: { control: 'number' },
    src: { control: 'boolean', description: 'Shows a site icon through `src`.' },
  },
  render: ({ label, index, href, src, sourceTitle, description, superscript, variant }) =>
    html`<p>
      Turbine blades now last about twenty years
      underwater${superscript ? nothing : ' '}<tp-citation
        href=${href || nothing}
        index=${index ?? nothing}
        src=${src ? mark : nothing}
        source-title=${sourceTitle || nothing}
        description=${description || nothing}
        ?superscript=${superscript}
        variant=${variant}
        >${label}</tp-citation
      >.
    </p>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
