import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { renderComponentExample } from './examples.js';

const meta = {
  title: 'Components/Separator',
  component: 'tp-separator',
  render: () => renderComponentExample('tp-separator'),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
