import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { navigationIcons } from '../icons/navigation.js';
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
    docs: { description: { component: documentation }, source: { code: source } },
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
export const Collapsed: Story = {
  parameters: {
    docs: {
      source: {
        code: `${imports.replace('</script>', "  import { navigationIcons } from '@tweakpad/ui/icons/navigation';\n  document.querySelector('#ancestors').icon = navigationIcons.more;\n</script>")}
<tp-breadcrumb>
  <a href="#home">Home</a>
  <tp-menu label="Ancestor pages">
    <tp-button id="ancestors" slot="trigger" variant="ghost" size="icon-sm" aria-label="Show omitted ancestors"></tp-button>
    <a href="#documentation">Documentation</a>
    <a href="#themes">Themes</a>
  </tp-menu>
  <a href="#components">Components</a>
  <span>Breadcrumb</span>
</tp-breadcrumb>`,
      },
    },
  },
  render: (args) =>
    html`<tp-breadcrumb .label=${args.label} .separator=${args.separator}>
      <a href="#home">Home</a>
      <tp-menu label="Ancestor pages">
        <tp-button
          slot="trigger"
          variant="ghost"
          size="icon-sm"
          aria-label="Show omitted ancestors"
          .icon=${navigationIcons.more}
        ></tp-button>
        <a href="#documentation">Documentation</a><a href="#themes">Themes</a>
      </tp-menu>
      <a href="#components">Components</a><span>Breadcrumb</span>
    </tp-breadcrumb>`,
};
