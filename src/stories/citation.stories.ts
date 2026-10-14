import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing } from 'lit';
import documentation from '../../docs/citation.md?raw';
import { citationExamples, siteMark } from './citation.examples.js';
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

const mark = siteMark('#2563eb', 'T');

const meta = {
  title: 'Components/Citation',
  component: 'tp-citation',
  parameters: {
    docs: {
      description: { component: documentation },
      examples: citationExamples,
      source: {
        code: '<tp-citation href="https://tides.example/turbines">tides.example</tp-citation>',
      },
    },
  },
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
