import { html } from 'lit';
import documentation from '../../docs/drag-drop.md?raw';
import { dragDropListExamples } from './drag-drop-list.examples.js';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
const items = Object.freeze([
  { id: 'research', label: 'Research' },
  { id: 'design', label: 'Design' },
  { id: 'review', label: 'Review' },
]);
const meta = {
  title: 'Components/Drag Drop List',
  component: 'tp-drag-drop-list',
  parameters: {
    layout: 'centered',
    docs: {
      description: { component: documentation },
      examples: dragDropListExamples,
      source: {
        code: `import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
const list = document.createElement('tp-drag-drop-list');
list.defaultValue = ['Research', 'Design', 'Review'];
document.body.append(list);`,
      },
    },
  },
  args: {
    orientation: 'vertical',
    variant: 'outline',
    size: 'default',
    activation: 'handle',
    reorderMode: 'move',
    disabled: false,
    readOnly: false,
    feedback: 'default',
  },
  argTypes: {
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
    variant: { control: 'select', options: ['ghost', 'outline', 'subdued'] },
    size: { control: 'select', options: ['xs', 'sm', 'default'] },
    activation: { control: 'select', options: ['handle', 'item'] },
    reorderMode: { control: 'select', options: ['move', 'swap'] },
    feedback: { control: 'select', options: ['default', 'clone', 'move', 'none'] },
  },
  render: (args) =>
    html`<tp-drag-drop-list
      label="Project stages"
      .defaultValue=${items}
      .orientation=${args.orientation}
      .variant=${args.variant}
      .size=${args.size}
      .activation=${args.activation}
      .reorderMode=${args.reorderMode}
      .disabled=${args.disabled}
      .readOnly=${args.readOnly}
      .feedback=${args.feedback}
    ></tp-drag-drop-list>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {};
