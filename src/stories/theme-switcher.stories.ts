import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { TpThemeSwitcher, ThemeSwitcherVariant } from '../components/theme-switcher/index.js';
import { libraryDocs } from './library-docs.js';

interface Args {
  variant: ThemeSwitcherVariant;
  size: 'sm' | 'default';
  disabled: boolean;
}

/** Each story themes its own preview surface, so the documentation page keeps its scheme. */
const scopeTo = (surface: Element | undefined) => {
  if (!surface) return;
  for (const switcher of surface.querySelectorAll<TpThemeSwitcher>('tp-theme-switcher'))
    switcher.target = surface as HTMLElement;
};

const meta: Meta<Args> = {
  title: 'Components/Theme switcher',
  component: 'tp-theme-switcher',
  parameters: { docs: libraryDocs('components/theme-switcher') },
  args: { variant: 'switch', size: 'default', disabled: false },
  argTypes: {
    variant: { control: 'inline-radio', options: ['switch', 'button', 'group'] },
    size: { control: 'inline-radio', options: ['sm', 'default'] },
    disabled: { control: 'boolean' },
  },
  render: (args) =>
    html`<tp-card class="theme-switcher-preview" ${ref(scopeTo)}>
      <h2 slot="header">Appearance</h2>
      <p slot="description">The preview below follows the selected scheme.</p>
      <tp-theme-switcher
        storage-key="tp-theme-story"
        .variant=${args.variant}
        .size=${args.size}
        .disabled=${args.disabled}
      ></tp-theme-switcher>
    </tp-card>`,
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
