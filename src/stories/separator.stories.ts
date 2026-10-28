import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { renderComponentExample } from './examples.js';
import { libraryDocs } from './library-docs.js';

const meta = {
  title: 'Components/Separator',
  component: 'tp-separator',
  parameters: { docs: libraryDocs('components/separator') },
  render: () => renderComponentExample('tp-separator'),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
