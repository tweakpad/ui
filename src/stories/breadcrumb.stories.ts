import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { breadcrumbExamples } from './breadcrumb.examples.js';
import documentation from '../../docs/breadcrumb.md?raw';
interface Args {
  label: string;
  separator: string;
}
const imports = `<script type="module">
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/styles.css';
</script>`;
const source = `${imports}
<tp-breadcrumb>
  <a href="#home">Home</a>
  <a href="#components">Components</a>
  <span>Breadcrumb</span>
</tp-breadcrumb>`;
const meta = {
  title: 'Components/Breadcrumb',
  component: 'tp-breadcrumb',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      source: { code: source },
      examples: breadcrumbExamples,
    },
  },
  args: { label: 'Breadcrumb', separator: '' },
  argTypes: { label: { control: 'text' }, separator: { control: 'text' } },
  render: (args) =>
    html`<tp-breadcrumb .label=${args.label} .separator=${args.separator}>
      <a href="#home">Home</a><a href="#components">Components</a><span>Breadcrumb</span>
    </tp-breadcrumb>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
