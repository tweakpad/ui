import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { renderComponentExample } from './examples.js';
import { libraryDocs } from './library-docs.js';

const meta = {
  title: 'Components/Label',
  component: 'tp-label',
  parameters: { docs: libraryDocs('components/label') },
  render: () => renderComponentExample('tp-label'),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
