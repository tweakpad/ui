import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import type { KbdPlatform, KbdSeparator } from '../components/kbd/index.js';
import { libraryDocs } from './library-docs.js';

interface Args {
  platform: KbdPlatform;
  separator: KbdSeparator;
}
const meta = {
  title: 'Components/Kbd',
  component: 'tp-kbd',
  parameters: { docs: libraryDocs('components/kbd') },
  args: { platform: 'auto', separator: 'none' },
  argTypes: {
    platform: {
      description: 'Platform on the parent Kbd group.',
      control: 'select',
      options: ['auto', 'mac', 'windows', 'linux'],
    },
    separator: {
      description: 'Separator on the parent Kbd group.',
      control: 'select',
      options: ['plus', 'then', 'none'],
      table: { defaultValue: { summary: 'plus' } },
    },
  },
  render: ({ platform, separator }) =>
    html`<tp-kbd-group .platform=${platform} .separator=${separator}
      ><tp-kbd value="control"></tp-kbd><tp-kbd value="alt"></tp-kbd><tp-kbd value="shift"></tp-kbd
      ><tp-kbd value="command"></tp-kbd
    ></tp-kbd-group>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
