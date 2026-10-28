import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import documentation from '../../docs/key-hint.md?raw';
import { keyHintExamples } from './key-hint.examples.js';
import type { KeyHintPlatform, KeyHintSeparator } from '../components/key-hint/index.js';

interface Args {
  platform: KeyHintPlatform;
  separator: KeyHintSeparator;
}
const meta = {
  title: 'Components/Key hint',
  component: 'tp-key-hint',
  parameters: {
    docs: {
      description: { component: documentation },
      examples: keyHintExamples,
      source: {
        code: '<tp-key-hint-group separator="none"><tp-key-hint key="control"></tp-key-hint><tp-key-hint key="alt"></tp-key-hint><tp-key-hint key="shift"></tp-key-hint><tp-key-hint key="command"></tp-key-hint></tp-key-hint-group>',
      },
    },
  },
  args: { platform: 'auto', separator: 'none' },
  argTypes: {
    platform: {
      description: 'Platform on the parent Key Hint Group.',
      control: 'select',
      options: ['auto', 'mac', 'windows', 'linux'],
    },
    separator: {
      description: 'Separator on the parent Key Hint Group.',
      control: 'select',
      options: ['plus', 'then', 'none'],
      table: { defaultValue: { summary: 'plus' } },
    },
  },
  render: ({ platform, separator }) =>
    html`<tp-key-hint-group .platform=${platform} .separator=${separator}
      ><tp-key-hint key="control"></tp-key-hint><tp-key-hint key="alt"></tp-key-hint
      ><tp-key-hint key="shift"></tp-key-hint><tp-key-hint key="command"></tp-key-hint
    ></tp-key-hint-group>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
