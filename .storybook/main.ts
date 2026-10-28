import type { StorybookConfig } from '@storybook/web-components-vite';
import remarkGfm from 'remark-gfm';
import { literalCode } from '../src/docs/vite.js';
import viteConfig from '../vite.config.js';

const cssTarget = viteConfig.build?.cssTarget;

const config: StorybookConfig = {
  // Stories anywhere under src; the Widgets section also has an MDX overview page.
  stories: ['../src/**/*.stories.ts', '../src/stories/widgets/*.mdx'],
  addons: [
    '@storybook/addon-a11y',
    {
      name: '@storybook/addon-docs',
      // The documentation pages write their Keyboard tables in Markdown.
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
  ],
  // Original sample portraits for avatar examples, served at `avatars/`.
  staticDirs: [
    { from: '../src/stories/assets/avatars', to: '/avatars' },
    // Sample pages the examples embed (the text editor's tide table).
    { from: '../src/stories/assets/pages', to: '/pages' },
  ],
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
  // Storybook keeps only `build.target` from the project config. The static build needs the
  // package's CSS target too, or light-dark() is lowered and scoped color schemes stop working.
  // The documentation pages' example code keeps its indentation through MDX when the literal
  // plugin runs before Storybook's MDX plugin; both run early, so it goes first in the list.
  viteFinal: (config) => ({
    ...config,
    plugins: [literalCode({ frontmatter: 'strip' }), ...(config.plugins ?? [])],
    build: { ...config.build, ...(cssTarget === undefined ? {} : { cssTarget }) },
  }),
};

export default config;
