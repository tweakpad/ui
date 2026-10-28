import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
interface Args {
  src: string;
  alt: string;
  fallback: string;
  size: 'sm' | 'default' | 'lg';
  fallbackDelay: number;
  keepMounted: boolean;
  loading: 'eager' | 'lazy';
}
const meta = {
  title: 'Components/Avatar',
  component: 'tp-avatar',
  parameters: { docs: libraryDocs('components/avatar') },
  args: {
    src: '',
    alt: 'Alex Morgan',
    fallback: 'AM',
    size: 'default',
    fallbackDelay: 0,
    keepMounted: false,
    loading: 'eager',
  },
  argTypes: {
    src: { control: 'text' },
    alt: { control: 'text' },
    fallback: { control: 'text' },
    size: { control: 'select', options: ['sm', 'default', 'lg'] },
    fallbackDelay: { control: { type: 'number', min: 0 } },
    keepMounted: { control: 'boolean' },
    loading: { control: 'select', options: ['eager', 'lazy'] },
  },
  render: (args) =>
    html`<tp-avatar
      .src=${args.src}
      .alt=${args.alt}
      .fallback=${args.fallback}
      .size=${args.size}
      .fallbackDelay=${args.fallbackDelay}
      .keepMounted=${args.keepMounted}
      .loading=${args.loading}
    ></tp-avatar>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
