import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
interface Args {
  label: string;
  separator: string;
}
const meta = {
  title: 'Components/Breadcrumb',
  component: 'tp-breadcrumb',
  parameters: { docs: libraryDocs('components/breadcrumb') },
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
