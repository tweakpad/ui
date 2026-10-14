import type { StorybookConfig } from '@storybook/web-components-vite';
import viteConfig from '../vite.config.js';

const cssTarget = viteConfig.build?.cssTarget;

const config: StorybookConfig = {
  // Stories anywhere under src; the Widgets section also has an MDX overview page.
  stories: ['../src/**/*.stories.ts', '../src/stories/widgets/*.mdx'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  // Original sample portraits for avatar examples, served at `avatars/`.
  staticDirs: [{ from: '../src/stories/assets/avatars', to: '/avatars' }],
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
  // Storybook keeps only `build.target` from the project config. The static build needs the
  // package's CSS target too, or light-dark() is lowered and scoped color schemes stop working.
  viteFinal: (config) => ({
    ...config,
    build: { ...config.build, ...(cssTarget === undefined ? {} : { cssTarget }) },
  }),
};

export default config;
