import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { libraryDocs } from './library-docs.js';
interface Args {
  orientation: 'horizontal' | 'vertical';
  disabled: boolean;
  withHandle: boolean;
  keyboardStep: number;
  disableDoubleClickReset: boolean;
}
const meta = {
  title: 'Components/Resizable panel group',
  component: 'tp-resizable-panel-group',
  parameters: { docs: libraryDocs('components/resizable-panel-group') },
  args: {
    orientation: 'horizontal',
    disabled: false,
    withHandle: true,
    keyboardStep: 1,
    disableDoubleClickReset: false,
  },
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    disabled: { control: 'boolean' },
    withHandle: { control: 'boolean' },
    keyboardStep: { control: { type: 'number', min: 0.1 } },
    disableDoubleClickReset: { control: 'boolean' },
  },
  render: (args) =>
    html`<tp-resizable-panel-group
      .orientation=${args.orientation}
      .disabled=${args.disabled}
      .keyboardStep=${args.keyboardStep}
      .disableDoubleClickReset=${args.disableDoubleClickReset}
      style="height:18rem;width:40rem;max-width:100%"
      ><tp-resizable-panel id="sidebar" default-size="25%" min-size="15%" collapsible
        ><div style="padding:var(--tp-space-6)">Sidebar</div></tp-resizable-panel
      ><tp-resizable-handle
        label="Resize sidebar"
        .withHandle=${args.withHandle}
      ></tp-resizable-handle
      ><tp-resizable-panel id="content" min-size="30%"
        ><div style="padding:var(--tp-space-6)">Content</div></tp-resizable-panel
      ></tp-resizable-panel-group
    >`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
