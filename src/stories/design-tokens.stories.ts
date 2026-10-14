import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import './design-tokens/design-tokens.js';

/**
 * Every role of the default token set with a preview, the value it resolves to in the page and
 * what it is for. The page has its own theme switcher; values are read from the rendered page, so
 * the chosen theme and the Density toolbar show up in them.
 */
const meta = {
  title: 'Tweakpad UI/Design tokens',
  tags: ['!autodocs'],
  parameters: {
    // The view paints its own themed surface edge to edge.
    layout: 'fullscreen',
    controls: { disable: true },
    // Pair and syntax specimens draw token colors as they are, including pairs under the minimum
    // contrast; the page reports each pair's ratio itself. Every other text is still checked.
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', selector: '*:not(.design-tokens-pair-text)' }],
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
  render: () => html`<design-tokens-view></design-tokens-view>`,
};
