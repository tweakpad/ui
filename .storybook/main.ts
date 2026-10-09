import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  // Stories anywhere under src; the Widgets section also has an MDX overview page.
  stories: ['../src/**/*.stories.ts', '../src/stories/widgets/*.mdx'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
};

export default config;
