import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { renderComponentExample } from './examples.js';

const meta = {
  title: 'Components/Label',
  component: 'tp-label',
  render: () => renderComponentExample('tp-label'),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
