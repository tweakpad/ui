import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import documentation from '../../docs/input-group.md?raw';
import { inputGroupExamples } from './input-group.examples.js';
interface Args {
  addonPosition: 'inline-start' | 'inline-end' | 'block-start' | 'block-end';
  actionSize: 'xs' | 'sm' | 'icon-xs' | 'icon-sm';
  actionVariant: 'ghost' | 'default' | 'secondary' | 'destructive' | 'outline' | 'link';
  invalid: boolean;
}
const imports = `<script type="module">
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/styles.css';
</script>`;
const markup = `<tp-field label="Website">
  <tp-input-group>
    <span slot="prefix">https://</span>
    <tp-input name="website" placeholder="example.com"></tp-input>
    <tp-key-hint slot="suffix">⌘K</tp-key-hint>
  </tp-input-group>
</tp-field>`;
const meta = {
  title: 'Components/Input group',
  component: 'tp-input-group',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      source: { code: `${imports}\n${markup}` },
      examples: inputGroupExamples,
    },
  },
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
        ><tp-key-hint slot="suffix">⌘K</tp-key-hint></tp-input-group
      ></tp-field
    >`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
