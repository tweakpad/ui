import { unwatchFile, watchFile } from 'node:fs';
import { resolve } from 'node:path';
import type { StorybookConfig } from '@storybook/web-components-vite';
import type { Plugin } from 'vite';
import remarkGfm from 'remark-gfm';
import { literalCode } from '../src/docs/vite.js';
import viteConfig from '../vite.config.js';

const cssTarget = viteConfig.build?.cssTarget;

/**
 * The Docs pages read their Properties tables and API sections from `dist/custom-elements.json`,
 * and their type cards from `dist/api-types.json`, which `npm run cem` rewrites while Storybook
 * runs: reload the pages with the new data.
 */
const manifestReload = (): Plugin => ({
  name: 'tweakpad-manifest-reload',
  configureServer(server) {
    const files = ['custom-elements.json', 'api-types.json'].map((name) =>
      resolve(import.meta.dirname, '../dist', name),
    );
    // Polled, not Vite's watcher: that one never reports `dist/`, and `npm run build` deletes and
    // recreates it.
    // The loaders glob the files: while a build has deleted them, the glob resolves to nothing, so
    // they are invalidated too, not only the data modules.
    const loaders = ['manifest.ts', 'types.ts'].map((name) => resolve(import.meta.dirname, name));
    const reload = (file: string) => {
      for (const path of [file, ...loaders])
        for (const module of server.moduleGraph.getModulesByFile(path) ?? [])
          server.moduleGraph.invalidateModule(module);
      server.ws.send({ type: 'full-reload' });
    };
    for (const file of files)
      watchFile(file, { interval: 500 }, (now, before) => {
        if (now.mtimeMs !== before.mtimeMs) reload(file);
      });
    server.httpServer?.once('close', () => {
      for (const file of files) unwatchFile(file);
    });
  },
});

const config: StorybookConfig = {
  // Stories anywhere under src; the Widgets section also has an MDX overview page.
  stories: [
    '../src/**/*.stories.ts',
    '../src/stories/widgets/*.mdx',
    '../src/stories/patterns/*.mdx',
  ],
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
  // Before any script loads, the preview takes the Theme toolbar's scheme (the `theme` global in
  // its URL, else the device), so the page and Storybook's loading screens, which are white by
  // default, do not flash light in the dark scheme. The colors are Storybook's dark docs theme
  // (content and app backgrounds, border), which the docs page renders a moment later; every
  // light color of the loading skeleton (preview block, controls table, spinner) is restated.
  previewHead: (head) => `${head}
    <script>
      (() => {
        const theme = /(?:^|;)theme:(\\w+)/.exec(new URLSearchParams(location.search).get('globals') ?? '')?.[1];
        const dark = theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
        document.documentElement.dataset.sbScheme = dark ? 'dark' : 'light';
      })();
    </script>
    <style>
      html[data-sb-scheme='dark'] :is(.sb-preparing-docs, .sb-preparing-story) {
        background-color: #222325;
      }
      html[data-sb-scheme='dark'] .sb-loader {
        border-color: rgb(255 255 255 / 15%);
        border-top-color: rgb(255 255 255 / 50%);
      }
      html[data-sb-scheme='dark'] :is(.sb-previewBlock, .sb-argstableBlock-body td) {
        background: #1b1c1d;
        border-color: rgb(255 255 255 / 10%);
      }
      html[data-sb-scheme='dark'] .sb-previewBlock_header {
        box-shadow: rgb(255 255 255 / 10%) 0 -1px 0 0 inset;
      }
      html[data-sb-scheme='dark'] .sb-argstableBlock-body {
        box-shadow: rgb(255 255 255 / 10%) 0 0 0 1px;
      }
      html[data-sb-scheme='dark'] .sb-argstableBlock-body tr:not(:first-child) {
        border-top-color: rgb(255 255 255 / 10%);
      }
      html[data-sb-scheme='dark']
        :is(.sb-previewBlock_icon, .sb-argstableBlock span, .sb-argstableBlock-body button) {
        background: rgb(255 255 255 / 10%);
      }
    </style>`,
  // Storybook keeps only `build.target` from the project config. The static build needs the
  // package's CSS target too, or light-dark() is lowered and scoped color schemes stop working.
  // The documentation pages' example code keeps its indentation through MDX when the literal
  // plugin runs before Storybook's MDX plugin; both run early, so it goes first in the list.
  viteFinal: (config) => ({
    ...config,
    plugins: [literalCode({ frontmatter: 'strip' }), manifestReload(), ...(config.plugins ?? [])],
    build: { ...config.build, ...(cssTarget === undefined ? {} : { cssTarget }) },
  }),
};

export default config;
