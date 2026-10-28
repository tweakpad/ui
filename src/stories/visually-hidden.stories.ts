import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { renderComponentExample } from './examples.js';
import { libraryDocs } from './library-docs.js';

const meta = {
  title: 'Components/Visually hidden',
  component: 'tp-visually-hidden',
  parameters: { docs: libraryDocs('components/visually-hidden') },
  render: () => renderComponentExample('tp-visually-hidden'),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
