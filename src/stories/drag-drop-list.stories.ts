import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The page's main use case.
const items = Object.freeze([
  { id: 'brief', label: 'Write the launch brief' },
  { id: 'pricing', label: 'Finalize pricing page' },
  { id: 'email', label: 'Schedule announcement email' },
  { id: 'changelog', label: 'Publish changelog' },
]);
const meta = {
  title: 'Components/Drag Drop List',
  component: 'tp-drag-drop-list',
  parameters: {
    layout: 'centered',
    docs: libraryDocs('components/drag-drop-list'),
  },
  args: {
    orientation: 'vertical',
    variant: 'outline',
    size: 'default',
    activation: 'handle',
    dropIndicator: 'displace',
    disabled: false,
    readOnly: false,
    feedback: 'default',
  },
  argTypes: {
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
    variant: { control: 'select', options: ['ghost', 'outline', 'subdued'] },
    size: { control: 'select', options: ['xs', 'sm', 'default'] },
    activation: { control: 'select', options: ['handle', 'item'] },
    dropIndicator: { control: 'select', options: ['displace', 'line'] },
    feedback: { control: 'select', options: ['default', 'clone', 'move', 'none'] },
  },
  render: (args) =>
    html`<tp-drag-drop-list
      label="Launch checklist"
      .defaultValue=${items}
      .orientation=${args.orientation}
      .variant=${args.variant}
      .size=${args.size}
      .activation=${args.activation}
      .dropIndicator=${args.dropIndicator}
      .disabled=${args.disabled}
      .readOnly=${args.readOnly}
      .feedback=${args.feedback}
    ></tp-drag-drop-list>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {};
