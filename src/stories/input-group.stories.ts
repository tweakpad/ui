import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
interface Args {
  addonPosition: 'inline-start' | 'inline-end' | 'block-start' | 'block-end';
  actionSize: 'xs' | 'sm' | 'icon-xs' | 'icon-sm';
  actionVariant: 'ghost' | 'default' | 'secondary' | 'destructive' | 'outline' | 'link';
  invalid: boolean;
}
const meta = {
  title: 'Components/Input group',
  component: 'tp-input-group',
  parameters: { docs: libraryDocs('components/input-group') },
  args: { addonPosition: 'inline-start', actionSize: 'xs', actionVariant: 'ghost', invalid: false },
  argTypes: {
    addonPosition: {
      control: 'select',
      options: ['inline-start', 'inline-end', 'block-start', 'block-end'],
    },
    actionSize: { control: 'select', options: ['xs', 'sm', 'icon-xs', 'icon-sm'] },
    actionVariant: {
      control: 'select',
      options: ['ghost', 'default', 'secondary', 'destructive', 'outline', 'link'],
    },
    invalid: { control: 'boolean' },
  },
  render: (args) =>
    html`<tp-field label="Website"
      ><tp-input-group
        .addonPosition=${args.addonPosition}
        .actionSize=${args.actionSize}
        .actionVariant=${args.actionVariant}
        .invalid=${args.invalid}
        ><span slot="prefix">https://</span
        ><tp-input name="website" placeholder="example.com"></tp-input
        ><tp-key-hint-group slot="suffix" separator="none" platform="mac"
          ><tp-key-hint key="command"></tp-key-hint
          ><tp-key-hint key="K"></tp-key-hint></tp-key-hint-group></tp-input-group
    ></tp-field>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
